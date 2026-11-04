import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"
import * as progressService from "../src/services/progress.service.js"
import { submitQuiz } from "../src/services/quiz.service.js"

describe("Lesson and quiz completion flow", () => {
  let courseId: number
  let lessonId: number
  let manualLessonId: number
  let emptyQuizId: number
  let quizId: number
  let studentId: number
  let outsiderId: number
  let adminId: number
  let studentToken: string
  let outsiderToken: string
  let adminToken: string
  const userIds: number[] = []
  let answers: { questionId: number; answerOptionId: number }[]
  let wrongOptionId: number

  const token = (userId: number, role: "STUDENT" | "ADMIN") =>
    jwt.sign({ userId, role }, process.env.JWT_SECRET!)
  const progress = () => prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: studentId, lessonId } },
  })
  const send = (payload: unknown, auth = studentToken, id = quizId) =>
    request(app).post(`/api/quizzes/${id}/submit`)
      .set("Authorization", `Bearer ${auth}`).send(payload)
  const complete = (id = manualLessonId, auth = studentToken) =>
    request(app).post(`/api/progress/lessons/${id}/complete`)
      .set("Authorization", `Bearer ${auth}`)

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret"
    for (const role of ["STUDENT", "STUDENT", "ADMIN"] as const) {
      const user = await prisma.user.create({ data: {
        name: "Completion Flow Test", email: `completion-${crypto.randomUUID()}@example.com`,
        password: "unused-test-password", role,
      } })
      userIds.push(user.id)
    }
    ;[studentId, outsiderId, adminId] = userIds as [number, number, number]
    studentToken = token(studentId, "STUDENT")
    outsiderToken = token(outsiderId, "STUDENT")
    adminToken = token(adminId, "ADMIN")
    const course = await prisma.course.create({ data: {
      title: "Completion Flow Test", status: "PUBLISHED",
      lessons: { create: [
        { title: "Quiz Lesson", content: "Protected content", position: 1 },
        { title: "Manual Lesson", content: "Protected content", position: 2 },
        { title: "Empty Quiz Lesson", content: "Protected content", position: 3 },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" } } } })
    courseId = course.id
    lessonId = course.lessons[0]!.id
    manualLessonId = course.lessons[1]!.id
    const quiz = await prisma.quiz.create({ data: {
      title: "Five Question Quiz", lessonId,
      questions: { create: Array.from({ length: 5 }, (_, index) => ({
        text: `Question ${index + 1}`, position: index + 1,
        options: { create: [
          { text: "Correct", isCorrect: true }, { text: "Wrong", isCorrect: false },
        ] },
      })) },
    }, include: { questions: { orderBy: { position: "asc" }, include: { options: true } } } })
    quizId = quiz.id
    answers = quiz.questions.map((question) => ({
      questionId: question.id,
      answerOptionId: question.options.find((option) => option.isCorrect)!.id,
    }))
    wrongOptionId = quiz.questions[4]!.options.find((option) => !option.isCorrect)!.id
    emptyQuizId = (await prisma.quiz.create({ data: {
      title: "Empty Quiz", lessonId: course.lessons[2]!.id,
    } })).id
    await prisma.enrollment.create({ data: { userId: studentId, courseId } })
  })

  beforeEach(async () => {
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.lessonProgress.deleteMany({ where: { userId: { in: userIds } } })
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } })
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("requires authentication on every protected lesson and quiz endpoint", async () => {
    for (const path of [
      `/api/lessons/${lessonId}`, `/api/lessons/course/${courseId}`,
      `/api/quizzes/${quizId}`, `/api/quizzes/lesson/${lessonId}`,
    ]) expect((await request(app).get(path)).status).toBe(401)
    expect((await request(app).post(`/api/quizzes/${quizId}/submit`).send({ answers })).status).toBe(401)
    expect((await request(app).post(`/api/progress/lessons/${manualLessonId}/complete`)).status).toBe(401)
  })

  it("blocks unenrolled students from lesson content, quizzes, and progress writes", async () => {
    for (const path of [
      `/api/lessons/${lessonId}`, `/api/lessons/course/${courseId}`,
      `/api/quizzes/${quizId}`, `/api/quizzes/lesson/${lessonId}`,
    ]) {
      const response = await request(app).get(path).set("Authorization", `Bearer ${outsiderToken}`)
      expect(response.status).toBe(403)
      expect(JSON.stringify(response.body)).not.toContain("Protected content")
    }
    expect((await send({ answers }, outsiderToken)).status).toBe(403)
    expect((await complete(manualLessonId, outsiderToken)).status).toBe(403)
    expect(await prisma.quizAttempt.count({ where: { userId: outsiderId } })).toBe(0)
  })

  it("allows admin preview while requiring enrollment to submit or complete", async () => {
    for (const path of [`/api/lessons/${lessonId}`, `/api/lessons/course/${courseId}`, `/api/quizzes/${quizId}`]) {
      expect((await request(app).get(path).set("Authorization", `Bearer ${adminToken}`)).status).toBe(200)
    }
    expect((await send({ answers }, adminToken)).status).toBe(403)
    expect((await complete(manualLessonId, adminToken)).status).toBe(403)
  })

  it("keeps curriculum public without exposing content or correctness", async () => {
    const curriculum = await request(app).get(`/api/courses/${courseId}/curriculum`)
    expect(curriculum.status).toBe(200)
    expect(curriculum.body.lessons).toHaveLength(3)
    expect(curriculum.body.lessons[0]).not.toHaveProperty("content")
    const quiz = await request(app).get(`/api/quizzes/${quizId}`)
      .set("Authorization", `Bearer ${studentToken}`)
    expect(quiz.status).toBe(200)
    expect(JSON.stringify(quiz.body)).not.toContain("isCorrect")
    expect((await request(app).get(`/api/quizzes/${quizId}/admin`)
      .set("Authorization", `Bearer ${studentToken}`)).status).toBe(403)
  })

  it("allows an enrolled admin to learn under the same completion rules", async () => {
    const enrollment = await prisma.enrollment.create({ data: { userId: adminId, courseId } })
    try {
      expect((await complete(manualLessonId, adminToken)).status).toBe(200)
      expect((await complete(lessonId, adminToken)).status).toBe(409)
      expect((await send({ answers }, adminToken)).status).toBe(201)
      const saved = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: adminId, lessonId } },
      })
      expect(saved?.completed).toBe(true)
    } finally {
      await prisma.enrollment.delete({ where: { id: enrollment.id } })
    }
  })

  it("keeps published quiz authoring protected", async () => {
    const questionId = answers[0]!.questionId
    const optionId = answers[0]!.answerOptionId
    const auth = `Bearer ${adminToken}`
    expect((await request(app).post("/api/quizzes").set("Authorization", auth)
      .send({ title: "New quiz", lessonId: manualLessonId })).status).toBe(409)
    expect((await request(app).post(`/api/quizzes/${quizId}/questions`).set("Authorization", auth)
      .send({ text: "New question", position: 6 })).status).toBe(409)
    expect((await request(app).post(`/api/quizzes/questions/${questionId}/options`).set("Authorization", auth)
      .send({ text: "New option", isCorrect: false })).status).toBe(409)
    for (const path of [`/api/quizzes/${quizId}`, `/api/quizzes/questions/${questionId}`, `/api/quizzes/options/${optionId}`]) {
      expect((await request(app).patch(path).set("Authorization", auth)
        .send({ title: "Changed", text: "Changed" })).status).toBe(409)
      expect((await request(app).delete(path).set("Authorization", auth)).status).toBe(409)
    }
  })

  it("permits manual completion without a quiz and rejects completion with a quiz", async () => {
    const first = await complete()
    expect(first.status).toBe(200)
    expect(first.body.progress.completed).toBe(true)
    expect((await complete()).body.progress.completedAt).toBe(first.body.progress.completedAt)
    expect((await complete(lessonId)).status).toBe(409)
    expect(await progress()).toBeNull()
  })

  it("saves 80% without completion, then completes at 100% and preserves progress on retakes", async () => {
    const partial = answers.map((answer, index) => index === 4
      ? { ...answer, answerOptionId: wrongOptionId } : answer)
    const failed = await send({ answers: partial })
    expect(failed.status).toBe(201)
    expect(failed.body.result.score).toBe(80)
    expect(await progress()).toBeNull()
    expect((await send({ answers })).status).toBe(201)
    const completed = await progress()
    expect(completed?.completed).toBe(true)
    expect(completed?.completedAt).toBeInstanceOf(Date)
    expect((await send({ answers: partial })).status).toBe(201)
    expect((await send({ answers })).status).toBe(201)
    expect(await progress()).toEqual(completed)
    expect(await prisma.quizAttempt.count({ where: { userId: studentId, quizId } })).toBe(4)
    expect(await prisma.quizAnswer.count({ where: { attempt: { userId: studentId, quizId } } })).toBe(20)
  })

  it("preserves the original timestamp when concurrent requests complete an incomplete lesson", async () => {
    await prisma.lessonProgress.create({ data: { userId: studentId, lessonId: manualLessonId } })
    const results = await Promise.all(Array.from({ length: 4 }, () => complete()))
    expect(results.map((result) => result.status)).toEqual([200, 200, 200, 200])
    const timestamps = results.map((result) => result.body.progress.completedAt)
    expect(timestamps[0]).toBeTruthy()
    expect(new Set(timestamps).size).toBe(1)
  })

  it("commits concurrent perfect submissions with one completed progress row", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => send({ answers })))
    expect(results.map((result) => result.status)).toEqual([201, 201, 201, 201])
    expect(await prisma.lessonProgress.count({ where: { userId: studentId, lessonId } })).toBe(1)
    const completed = await progress()
    expect(completed?.completed).toBe(true)
    await send({ answers })
    expect(await progress()).toEqual(completed)
    expect(await prisma.quizAttempt.count({ where: { userId: studentId, quizId } })).toBe(5)
  })

  it("rejects malformed, incomplete, duplicate, foreign, and empty quiz answers", async () => {
    const invalid = [
      null, {}, { answers: null }, { answers: [null] }, { answers: [[]] },
      { answers: [{ questionId: "1", answerOptionId: 1 }] },
      { answers: [{ questionId: -1, answerOptionId: 1 }] },
      { answers: answers.slice(1) },
      { answers: [answers[0], answers[0], ...answers.slice(2)] },
      { answers: [{ questionId: 2147483647, answerOptionId: answers[0]!.answerOptionId }, ...answers.slice(1)] },
      { answers: [{ ...answers[0], answerOptionId: answers[1]!.answerOptionId }, ...answers.slice(1)] },
    ]
    for (const payload of invalid) expect((await send(payload)).status).toBe(400)
    expect((await send({ answers: [] }, studentToken, emptyQuizId)).status).toBe(400)
    expect(await prisma.quizAttempt.count({ where: { userId: studentId } })).toBe(0)
  })

  it("returns 400 for invalid ids and 404 for missing resources", async () => {
    for (const suffix of ["bad", "0", "-1", "1.5"]) {
      expect((await request(app).get(`/api/lessons/course/${suffix}`)
        .set("Authorization", `Bearer ${studentToken}`)).status).toBe(400)
      expect((await request(app).post(`/api/quizzes/${suffix}/submit`)
        .set("Authorization", `Bearer ${studentToken}`).send({ answers })).status).toBe(400)
    }
    expect((await complete(2147483647)).status).toBe(404)
    expect((await send({ answers }, studentToken, 2147483647)).status).toBe(404)
  })

  it("rolls back attempts and answers when automatic completion fails", async () => {
    const failure = vi.spyOn(progressService, "saveLessonCompletion")
      .mockRejectedValueOnce(new Error("SIMULATED_PROGRESS_FAILURE"))
    try {
      await expect(submitQuiz(quizId, studentId, answers)).rejects.toThrow("SIMULATED_PROGRESS_FAILURE")
    } finally {
      failure.mockRestore()
    }
    expect(await prisma.quizAttempt.count({ where: { userId: studentId, quizId } })).toBe(0)
    expect(await prisma.quizAnswer.count({ where: { attempt: { userId: studentId, quizId } } })).toBe(0)
    expect(await progress()).toBeNull()
  })
})
