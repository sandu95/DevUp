import { afterAll, beforeAll, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"

describe("Personal quiz history", () => {
  const userIds: number[] = []
  const courseIds: number[] = []
  let studentId: number
  let studentToken: string
  let adminToken: string
  let quizId: number
  let draftQuizId: number
  let expectedIds: number[]
  let filteredIds: number[]
  let adminAttemptId: number
  const read = (query = "", token = studentToken) => request(app)
    .get(`/api/quizzes/attempts/me${query}`).set("Authorization", `Bearer ${token}`)

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret"
    for (const role of ["STUDENT", "ADMIN"] as const) {
      const user = await prisma.user.create({ data: {
        name: "History fixture", email: `history-${crypto.randomUUID()}@example.com`, password: "unused", role,
      } })
      userIds.push(user.id)
      const token = jwt.sign({ userId: user.id, role }, process.env.JWT_SECRET)
      if (role === "STUDENT") { studentId = user.id; studentToken = token }
      else adminToken = token
    }
    const course = await prisma.course.create({ data: {
      title: "History published course", status: "PUBLISHED", lessons: { create: [
        { title: "First", content: "Content", position: 1, quiz: { create: { title: "History quiz" } } },
        { title: "Second", content: "Content", position: 2, quiz: { create: { title: "Other quiz" } } },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" }, include: { quiz: true } } } })
    courseIds.push(course.id)
    quizId = course.lessons[0]!.quiz!.id
    const otherQuizId = course.lessons[1]!.quiz!.id
    const draft = await prisma.course.create({ data: {
      title: "Private draft", lessons: { create: { title: "Draft", content: "Private", position: 1,
        quiz: { create: { title: "Private draft quiz" } } } },
    }, include: { lessons: { include: { quiz: true } } } })
    courseIds.push(draft.id)
    draftQuizId = draft.lessons[0]!.quiz!.id
    const old = new Date("2026-01-01T12:00:00Z")
    const recent = new Date("2026-01-02T12:00:00Z")
    const ids: number[] = []
    for (const [score, startedAt] of [[33, old], [100, recent], [66, recent]] as const) {
      const attempt = await prisma.quizAttempt.create({ data: { userId: studentId, quizId, score, startedAt, completedAt: startedAt } })
      ids.push(attempt.id)
    }
    filteredIds = ids.reverse()
    const pending = await prisma.quizAttempt.create({ data: { userId: studentId, quizId: otherQuizId, score: 0,
      startedAt: new Date("2026-01-03T12:00:00Z") } })
    expectedIds = [pending.id, ...filteredIds]
    const adminAttempt = await prisma.quizAttempt.create({ data: { userId: userIds[1]!, quizId, score: 88, completedAt: recent } })
    adminAttemptId = adminAttempt.id
    for (const userId of userIds) await prisma.quizAttempt.create({ data: { userId, quizId: draftQuizId, score: 100, completedAt: recent } })
  })

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("requires authentication", async () => {
    expect((await request(app).get("/api/quizzes/attempts/me")).status).toBe(401)
  })

  it("returns only the caller's published history in stable newest-first order without answer data", async () => {
    const result = await read(`?userId=${userIds[1]}`)
    expect(result.status).toBe(200)
    expect(result.body.attempts.map((attempt: { id: number }) => attempt.id)).toEqual(expectedIds)
    for (const attempt of result.body.attempts) {
      expect(attempt.userId).toBe(studentId)
      expect(Object.keys(attempt).sort()).toEqual(["id", "userId", "quizId", "score", "startedAt", "completedAt", "quiz"].sort())
      expect(Object.keys(attempt.quiz).sort()).toEqual(["id", "title", "lessonId"].sort())
    }
    expect(result.body.attempts[0].completedAt).toBeNull()
    expect(JSON.stringify(result.body)).not.toContain("isCorrect")
  })

  it("filters by quiz without exposing draft or nonexistent quiz history", async () => {
    const result = await read(`?quizId=${quizId}`)
    expect(result.status).toBe(200)
    expect(result.body.attempts.map((attempt: { id: number }) => attempt.id)).toEqual(filteredIds)
    for (const id of [draftQuizId, 2147483647]) {
      const empty = await read(`?quizId=${id}`)
      expect(empty.status).toBe(200)
      expect(empty.body.attempts).toEqual([])
    }
  })

  it("rejects malformed, empty, repeated and out-of-range quiz filters", async () => {
    for (const value of ["", "bad", "0", "-1", "1.5", "2147483648", "1&quizId=2", "1&quizId=1"]) {
      const result = await read(`?quizId=${value}`)
      expect(result.status, value).toBe(400)
      expect(result.body.message).toBe("Invalid quiz id")
    }
  })

  it("keeps admin personal history separate from preview privileges", async () => {
    const result = await read("", adminToken)
    expect(result.status).toBe(200)
    expect(result.body.attempts.map((attempt: { id: number }) => attempt.id)).toEqual([adminAttemptId])
    expect((await read(`?quizId=${draftQuizId}`, adminToken)).body.attempts).toEqual([])
  })
})
