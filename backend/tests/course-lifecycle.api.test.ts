import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"
import { enrollUserInCourse } from "../src/services/enrollment.service.js"
import { markLessonCompleted } from "../src/services/progress.service.js"
import { submitQuiz } from "../src/services/quiz.service.js"

describe("Draft access and course publication", () => {
  const userIds: number[] = []
  let studentId: number
  let adminId: number
  let studentToken: string
  let adminToken: string
  let courseId: number
  let manualLessonId: number
  let quizLessonId: number
  let quizId: number
  let questionId: number
  let correctOptionId: number
  const publish = (body: { status: string; title?: string } = { status: "PUBLISHED" }) => request(app).patch(`/api/courses/${courseId}`)
    .set("Authorization", `Bearer ${adminToken}`).send(body)

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret"
    for (const role of ["STUDENT", "ADMIN"] as const) {
      const user = await prisma.user.create({ data: {
        name: "Course Lifecycle", email: `lifecycle-${crypto.randomUUID()}@example.com`,
        password: "unused-test-password", role,
      } })
      userIds.push(user.id)
      const token = jwt.sign({ userId: user.id, role }, process.env.JWT_SECRET)
      if (role === "STUDENT") { studentId = user.id; studentToken = token }
      else { adminId = user.id; adminToken = token }
    }
  })

  beforeEach(async () => {
    const course = await prisma.course.create({ data: {
      title: "Lifecycle Draft", status: "DRAFT",
      lessons: { create: [
        { title: "Manual", content: "Private manual content", position: 1 },
        { title: "Quiz", content: "Private quiz content", position: 2 },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" } } } })
    courseId = course.id
    manualLessonId = course.lessons[0]!.id
    quizLessonId = course.lessons[1]!.id
    const quiz = await prisma.quiz.create({ data: {
      title: "Lifecycle quiz", lessonId: quizLessonId,
      questions: { create: [{ text: "Question", position: 1, options: { create: [
        { text: "Correct", isCorrect: true }, { text: "Wrong", isCorrect: false },
      ] } }] },
    }, include: { questions: { include: { options: true } } } })
    quizId = quiz.id
    questionId = quiz.questions[0]!.id
    correctOptionId = quiz.questions[0]!.options.find((option) => option.isCorrect)!.id
  })
  afterEach(async () => {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } })
  })
  afterAll(async () => {
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("rejects draft enrollment for both roles, including direct service calls", async () => {
    for (const token of [studentToken, adminToken]) {
      expect((await request(app).post(`/api/enrollments/courses/${courseId}`)
        .set("Authorization", `Bearer ${token}`)).status).toBe(404)
    }
    await expect(enrollUserInCourse(studentId, courseId)).rejects.toThrow("COURSE_NOT_AVAILABLE")
    expect(await prisma.enrollment.count({ where: { courseId } })).toBe(0)
  })

  it("hides draft learning content and personal history even with legacy enrollment", async () => {
    await prisma.enrollment.create({ data: { userId: studentId, courseId } })
    await prisma.lessonProgress.create({ data: { userId: studentId, lessonId: manualLessonId, completed: true } })
    await prisma.quizAttempt.create({ data: { userId: studentId, quizId, score: 0 } })
    for (const path of [
      `/api/courses/${courseId}`, `/api/courses/${courseId}/curriculum`,
      `/api/lessons/course/${courseId}`, `/api/lessons/${manualLessonId}`,
      `/api/quizzes/${quizId}`, `/api/quizzes/lesson/${quizLessonId}`,
      `/api/progress/courses/${courseId}`,
    ]) {
      const result = await request(app).get(path).set("Authorization", `Bearer ${studentToken}`)
      expect(result.status, path).toBe(404)
      expect(JSON.stringify(result.body)).not.toContain("Private")
    }
    for (const [path, field] of [
      ["/api/enrollments/me", "enrollments"], ["/api/progress/me", "progress"],
      ["/api/quizzes/attempts/me", "attempts"],
    ]) {
      const result = await request(app).get(path!).set("Authorization", `Bearer ${studentToken}`)
      expect(result.status).toBe(200)
      expect(result.body[field!]).toEqual([])
    }
  })

  it("preserves admin draft preview while forbidding personal progress writes for every role", async () => {
    for (const path of [`/api/courses/${courseId}`, `/api/lessons/course/${courseId}`, `/api/lessons/${quizLessonId}`,
      `/api/quizzes/${quizId}`, `/api/quizzes/${quizId}/admin`, `/api/quizzes/lesson/${quizLessonId}`]) {
      expect((await request(app).get(path).set("Authorization", `Bearer ${adminToken}`)).status, path).toBe(200)
    }
    for (const [userId, token] of [[studentId, studentToken], [adminId, adminToken]] as const) {
      await prisma.enrollment.create({ data: { userId, courseId } })
      expect((await request(app).post(`/api/progress/lessons/${manualLessonId}/complete`)
        .set("Authorization", `Bearer ${token}`)).status).toBe(404)
      expect((await request(app).post(`/api/quizzes/${quizId}/submit`).set("Authorization", `Bearer ${token}`)
        .send({ answers: [{ questionId, answerOptionId: correctOptionId }] })).status).toBe(404)
      await expect(markLessonCompleted(userId, manualLessonId)).rejects.toThrow("LESSON_NOT_FOUND")
      await expect(submitQuiz(quizId, userId, [{ questionId, answerOptionId: correctOptionId }]))
        .rejects.toThrow("QUIZ_NOT_FOUND")
    }
    expect(await prisma.lessonProgress.count({ where: { lessonId: manualLessonId } })).toBe(0)
    expect(await prisma.quizAttempt.count({ where: { quizId } })).toBe(0)
  })

  it.each(["no lessons", "blank lesson", "empty quiz", "no options", "no correct option", "multiple correct options"])(
    "rejects publication with %s and keeps metadata unchanged", async (problem) => {
      if (problem === "no lessons") await prisma.lesson.deleteMany({ where: { courseId } })
      if (problem === "blank lesson") await prisma.lesson.update({ where: { id: manualLessonId }, data: { content: " " } })
      if (problem === "empty quiz") await prisma.question.deleteMany({ where: { quizId } })
      if (problem === "no options") await prisma.answerOption.deleteMany({ where: { questionId } })
      if (problem === "no correct option") await prisma.answerOption.updateMany({ where: { questionId }, data: { isCorrect: false } })
      if (problem === "multiple correct options") await prisma.answerOption.updateMany({ where: { questionId }, data: { isCorrect: true } })
      const result = await publish({ status: "PUBLISHED", title: "Must not be saved" })
      expect(result.status).toBe(409)
      expect(result.body.message).toContain("cannot be published")
      expect(result.body.issues.length).toBeGreaterThan(0)
      expect(await prisma.course.findUnique({ where: { id: courseId } })).toMatchObject({ title: "Lifecycle Draft", status: "DRAFT" })
    }
  )

  it("publishes valid content, unlocks enrollment and retains published authoring guards", async () => {
    expect((await publish()).status).toBe(200)
    expect((await request(app).post(`/api/enrollments/courses/${courseId}`)
      .set("Authorization", `Bearer ${studentToken}`)).status).toBe(201)
    expect((await request(app).get(`/api/lessons/${quizLessonId}`)
      .set("Authorization", `Bearer ${studentToken}`)).status).toBe(200)
    expect((await request(app).post(`/api/quizzes/${quizId}/submit`).set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [{ questionId, answerOptionId: correctOptionId }] })).status).toBe(201)
    expect((await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: studentId, lessonId: quizLessonId } } }))?.completed).toBe(true)
    expect((await publish({ status: "DRAFT" })).status).toBe(409)
  })

  it("permits publishing a course containing only lessons without quizzes", async () => {
    await prisma.quiz.delete({ where: { id: quizId } })
    expect((await publish()).status).toBe(200)
  })

  it("rejects malformed course, quiz and option payloads with 400", async () => {
    const auth = `Bearer ${adminToken}`
    for (const body of [{}, { title: " " }, { title: "Valid", imageUrl: {} }, { title: "Valid", description: [] }]) {
      expect((await request(app).post("/api/courses").set("Authorization", auth).send(body)).status).toBe(400)
    }
    for (const body of [{}, { title: 12 }, { status: null }, { status: "" }, { description: {} }, { imageUrl: false }]) {
      expect((await request(app).patch(`/api/courses/${courseId}`).set("Authorization", auth).send(body)).status).toBe(400)
    }
    expect((await request(app).post("/api/quizzes").set("Authorization", auth)
      .send({ title: 12, lessonId: manualLessonId })).status).toBe(400)
    expect((await request(app).patch(`/api/quizzes/${quizId}`).set("Authorization", auth).send({ title: " " })).status).toBe(400)
    expect((await request(app).post(`/api/quizzes/questions/${questionId}/options`).set("Authorization", auth)
      .send({ text: {}, isCorrect: false })).status).toBe(400)
    for (const body of [{}, { text: [] }, { isCorrect: "true" }]) {
      expect((await request(app).patch(`/api/quizzes/options/${correctOptionId}`).set("Authorization", auth).send(body)).status).toBe(400)
    }
  })

  it.each(["bad", "0", "-1", "1.5", "2147483648"])("rejects invalid path id %s before querying Prisma", async (id) => {
    const auth = `Bearer ${adminToken}`
    for (const path of [`/api/courses/${id}`, `/api/lessons/${id}`, `/api/quizzes/${id}`, `/api/progress/courses/${id}`]) {
      expect((await request(app).get(path).set("Authorization", auth)).status, path).toBe(400)
    }
    expect((await request(app).post(`/api/enrollments/courses/${id}`).set("Authorization", auth)).status).toBe(400)
  })

  it("reports 199/200 lessons as 99% and only reaches 100% after the last completion", async () => {
    await prisma.lesson.deleteMany({ where: { courseId } })
    await prisma.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } })
    await prisma.lesson.createMany({ data: Array.from({ length: 200 }, (_, index) => ({
      courseId, title: `Lesson ${index + 1}`, content: "Content", position: index + 1,
    })) })
    const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } })
    await prisma.lessonProgress.createMany({ data: lessons.slice(0, 199).map((lesson) => ({
      userId: studentId, lessonId: lesson.id, completed: true, completedAt: new Date(),
    })) })
    const auth = `Bearer ${studentToken}`
    const enrollment = await request(app).post(`/api/enrollments/courses/${courseId}`).set("Authorization", auth)
    expect(enrollment.status).toBe(201)
    expect(enrollment.body.enrollment.progress).toEqual({ completedLessons: 199, totalLessons: 200, percentage: 99 })
    const before = await request(app).get(`/api/progress/courses/${courseId}`).set("Authorization", auth)
    expect(before.body.progress.percentage).toBe(99)
    const mine = await request(app).get("/api/enrollments/me").set("Authorization", auth)
    expect(mine.body.enrollments[0].progress.percentage).toBe(99)
    expect((await request(app).post(`/api/progress/lessons/${lessons[199]!.id}/complete`).set("Authorization", auth)).status).toBe(200)
    const after = await request(app).get("/api/enrollments/me").set("Authorization", auth)
    expect(after.body.enrollments[0].progress).toEqual({ completedLessons: 200, totalLessons: 200, percentage: 100 })
  })
})
