import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"

describe("Admin lesson and question positions", () => {
  const userIds: number[] = []
  let adminToken: string
  let studentToken: string
  let courseId: number
  let lessonId: number
  let secondLessonId: number
  let quizId: number
  let questionId: number
  let secondQuestionId: number

  const lessonPayload = (position: unknown) => ({
    title: "New lesson", content: "Lesson content", courseId, position,
  })
  const questionPayload = (position: unknown) => ({ text: "New question", position })
  const createLesson = (position: unknown) => request(app).post("/api/lessons")
    .set("Authorization", `Bearer ${adminToken}`).send(lessonPayload(position))
  const updateLesson = (position: unknown) => request(app).patch(`/api/lessons/${secondLessonId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ position })
  const createQuestion = (position: unknown) => request(app).post(`/api/quizzes/${quizId}/questions`)
    .set("Authorization", `Bearer ${adminToken}`).send(questionPayload(position))
  const updateQuestion = (position: unknown) => request(app).patch(`/api/quizzes/questions/${secondQuestionId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ position })

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret"
    for (const role of ["ADMIN", "STUDENT"] as const) {
      const user = await prisma.user.create({ data: {
        name: "Authoring Test", email: `authoring-${crypto.randomUUID()}@example.com`,
        password: "unused-test-password", role,
      } })
      userIds.push(user.id)
      const token = jwt.sign({ userId: user.id, role }, process.env.JWT_SECRET)
      if (role === "ADMIN") adminToken = token
      else studentToken = token
    }
  })

  beforeEach(async () => {
    const course = await prisma.course.create({ data: {
      title: "Authoring positions", status: "DRAFT",
      lessons: { create: [
        { title: "First", content: "Content", position: 1 },
        { title: "Third", content: "Content", position: 3 },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" } } } })
    courseId = course.id
    lessonId = course.lessons[0]!.id
    secondLessonId = course.lessons[1]!.id
    const quiz = await prisma.quiz.create({ data: {
      title: "Authoring quiz", lessonId,
      questions: { create: [
        { text: "First", position: 1 }, { text: "Third", position: 3 },
      ] },
    }, include: { questions: { orderBy: { position: "asc" } } } })
    quizId = quiz.id
    questionId = quiz.questions[0]!.id
    secondQuestionId = quiz.questions[1]!.id
  })

  afterEach(async () => {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } })
  })
  afterAll(async () => {
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("returns 409 on occupied lesson positions during create and update", async () => {
    expect((await createLesson(3)).status).toBe(409)
    expect((await updateLesson(1)).status).toBe(409)
    expect(await prisma.lesson.count({ where: { courseId } })).toBe(2)
    expect((await prisma.lesson.findUnique({ where: { id: secondLessonId } }))?.position).toBe(3)
  })

  it("returns 409 on occupied question positions during create and update", async () => {
    expect((await createQuestion(3)).status).toBe(409)
    expect((await updateQuestion(1)).status).toBe(409)
    expect(await prisma.question.count({ where: { quizId } })).toBe(2)
    expect((await prisma.question.findUnique({ where: { id: secondQuestionId } }))?.position).toBe(3)
  })

  it.each([0, -1, 1.5, "2", null, 2147483648])("rejects invalid position %s with 400", async (position) => {
    for (const operation of [createLesson, updateLesson, createQuestion, updateQuestion]) {
      expect((await operation(position)).status).toBe(400)
    }
    expect(await prisma.lesson.count({ where: { courseId } })).toBe(2)
    expect(await prisma.question.count({ where: { quizId } })).toBe(2)
  })

  it("creates and edits lessons without requiring contiguous positions", async () => {
    const created = await createLesson(4)
    expect(created.status).toBe(201)
    expect(created.body.lesson.position).toBe(4)
    expect((await updateLesson(5)).status).toBe(200)
    const result = await request(app).get(`/api/lessons/course/${courseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(result.body.lessons.map((lesson: { position: number }) => lesson.position)).toEqual([1, 4, 5])
  })

  it("creates and edits questions without requiring contiguous positions", async () => {
    expect((await createQuestion(4)).status).toBe(201)
    expect((await updateQuestion(5)).status).toBe(200)
    const result = await request(app).get(`/api/quizzes/${quizId}/admin`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(result.body.quiz.questions.map((question: { position: number }) => question.position)).toEqual([1, 4, 5])
  })

  it("allows an unchanged position when editing text", async () => {
    expect((await updateLesson(3)).status).toBe(200)
    expect((await updateQuestion(3)).status).toBe(200)
    expect((await request(app).patch(`/api/lessons/${secondLessonId}`)
      .set("Authorization", `Bearer ${adminToken}`).send({ title: "Updated" })).status).toBe(200)
    expect((await request(app).patch(`/api/quizzes/questions/${secondQuestionId}`)
      .set("Authorization", `Bearer ${adminToken}`).send({ text: "Updated" })).status).toBe(200)
  })

  it("adds a lesson after a deletion without renumbering the remaining lessons", async () => {
    expect((await createLesson(5)).status).toBe(201)
    expect((await request(app).delete(`/api/lessons/${secondLessonId}`)
      .set("Authorization", `Bearer ${adminToken}`)).status).toBe(200)
    expect((await createLesson(6)).status).toBe(201)
    const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } })
    expect(lessons.map((lesson) => lesson.position)).toEqual([1, 5, 6])
  })

  it("adds a question after a deletion without renumbering the remaining questions", async () => {
    expect((await createQuestion(5)).status).toBe(201)
    expect((await request(app).delete(`/api/quizzes/questions/${secondQuestionId}`)
      .set("Authorization", `Bearer ${adminToken}`)).status).toBe(200)
    expect((await createQuestion(6)).status).toBe(201)
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { position: "asc" } })
    expect(questions.map((question) => question.position)).toEqual([1, 5, 6])
  })

  it("rejects empty or malformed authoring fields without changing content", async () => {
    const auth = `Bearer ${adminToken}`
    for (const body of [{}, { title: 123 }, { title: " " }, { content: null }]) {
      expect((await request(app).patch(`/api/lessons/${secondLessonId}`)
        .set("Authorization", auth).send(body)).status).toBe(400)
    }
    for (const body of [{}, { text: 123 }, { text: " " }]) {
      expect((await request(app).patch(`/api/quizzes/questions/${secondQuestionId}`)
        .set("Authorization", auth).send(body)).status).toBe(400)
    }
    expect((await request(app).post("/api/lessons").set("Authorization", auth)
      .send({ ...lessonPayload(4), title: 123 })).status).toBe(400)
    expect((await request(app).post(`/api/quizzes/${quizId}/questions`).set("Authorization", auth)
      .send({ ...questionPayload(4), text: " " })).status).toBe(400)
    expect((await prisma.lesson.findUnique({ where: { id: secondLessonId } }))?.title).toBe("Third")
    expect((await prisma.question.findUnique({ where: { id: secondQuestionId } }))?.text).toBe("Third")
  })

  it("keeps positions scoped to their course or quiz", async () => {
    const quiz = await prisma.quiz.create({ data: { title: "Other quiz", lessonId: secondLessonId } })
    expect((await request(app).post(`/api/quizzes/${quiz.id}/questions`)
      .set("Authorization", `Bearer ${adminToken}`).send(questionPayload(1))).status).toBe(201)
  })

  it("rejects student authoring and published-course changes", async () => {
    expect((await request(app).post("/api/lessons").send(lessonPayload(4))).status).toBe(401)
    expect((await request(app).post("/api/lessons").set("Authorization", `Bearer ${studentToken}`)
      .send(lessonPayload(4))).status).toBe(403)
    expect((await request(app).post(`/api/quizzes/${quizId}/questions`)
      .set("Authorization", `Bearer ${studentToken}`).send(questionPayload(4))).status).toBe(403)
    await prisma.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } })
    for (const operation of [createLesson, updateLesson, createQuestion, updateQuestion]) {
      expect((await operation(4)).status).toBe(409)
    }
  })
})
