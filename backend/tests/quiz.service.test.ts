import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  quiz: vi.fn(), enrollment: vi.fn(), attempt: vi.fn(), answers: vi.fn(),
  progressCreate: vi.fn(), progressUpdate: vi.fn(), progressRead: vi.fn(),
}))
vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    quiz: { findUnique: mocks.quiz },
    enrollment: { findFirst: mocks.enrollment },
    $transaction: vi.fn(async (callback) => callback({
      quizAttempt: { create: mocks.attempt },
      quizAnswer: { createMany: mocks.answers },
      lessonProgress: {
        createMany: mocks.progressCreate,
        updateMany: mocks.progressUpdate,
        findUniqueOrThrow: mocks.progressRead,
      },
    })),
  },
}))
import { submitQuiz } from "../src/services/quiz.service.js"

const question = (id: number) => ({
  id, options: [
    { id: id * 10, isCorrect: true },
    { id: id * 10 + 1, isCorrect: false },
  ],
})
const quiz = (count = 2) => ({
  id: 20, lessonId: 10, lesson: { courseId: 5 },
  questions: Array.from({ length: count }, (_, index) => question(index + 1)),
})
const correct = [
  { questionId: 1, answerOptionId: 10 },
  { questionId: 2, answerOptionId: 20 },
]

describe("Quiz service", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.quiz.mockResolvedValue(quiz())
    mocks.enrollment.mockResolvedValue({ id: 1 })
    mocks.attempt.mockResolvedValue({ id: 50 })
    mocks.answers.mockResolvedValue({ count: 2 })
    mocks.progressRead.mockResolvedValue({ completed: true })
  })

  it("saves answers and completes a perfect quiz inside the transaction", async () => {
    expect(await submitQuiz(20, 1, correct)).toEqual({
      attemptId: 50, score: 100, correctAnswers: 2, totalQuestions: 2,
    })
    expect(mocks.answers).toHaveBeenCalledWith({ data: [
      { attemptId: 50, answerOptionId: 10 },
      { attemptId: 50, answerOptionId: 20 },
    ] })
    expect(mocks.progressCreate).toHaveBeenCalledWith({
      data: [{ userId: 1, lessonId: 10, completed: true, completedAt: expect.any(Date) }],
      skipDuplicates: true,
    })
  })

  it("saves an imperfect attempt without touching lesson progress", async () => {
    expect(await submitQuiz(20, 1, [correct[0]!, { questionId: 2, answerOptionId: 21 }]))
      .toMatchObject({ score: 50, correctAnswers: 1, totalQuestions: 2 })
    expect(mocks.answers).toHaveBeenCalled()
    expect(mocks.progressCreate).not.toHaveBeenCalled()
    expect(mocks.progressUpdate).not.toHaveBeenCalled()
  })

  it("does not display 100 or complete a 199/200 attempt", async () => {
    mocks.quiz.mockResolvedValue(quiz(200))
    const answers = Array.from({ length: 200 }, (_, index) => ({
      questionId: index + 1,
      answerOptionId: (index + 1) * 10 + (index === 199 ? 1 : 0),
    }))
    expect(await submitQuiz(20, 1, answers))
      .toMatchObject({ score: 99, correctAnswers: 199, totalQuestions: 200 })
    expect(mocks.progressCreate).not.toHaveBeenCalled()
  })

  it("rejects a missing quiz", async () => {
    mocks.quiz.mockResolvedValue(null)
    await expect(submitQuiz(20, 1, correct)).rejects.toThrow("QUIZ_NOT_FOUND")
    expect(mocks.attempt).not.toHaveBeenCalled()
  })

  it("requires enrollment at service level", async () => {
    mocks.enrollment.mockResolvedValue(null)
    await expect(submitQuiz(20, 1, correct)).rejects.toThrow("NOT_ENROLLED")
    expect(mocks.attempt).not.toHaveBeenCalled()
  })

  it("rejects an empty quiz", async () => {
    mocks.quiz.mockResolvedValue(quiz(0))
    await expect(submitQuiz(20, 1, [])).rejects.toThrow("QUIZ_HAS_NO_QUESTIONS")
    expect(mocks.attempt).not.toHaveBeenCalled()
  })

  it.each([
    ["INCOMPLETE_ANSWERS", [correct[0]!]],
    ["DUPLICATE_QUESTION", [correct[0]!, correct[0]!]],
    ["INVALID_QUESTION", [correct[0]!, { questionId: 999, answerOptionId: 20 }]],
    ["INVALID_ANSWER_OPTION", [correct[0]!, { questionId: 2, answerOptionId: 10 }]],
  ])("rejects %s without saving an attempt", async (error, answers) => {
    await expect(submitQuiz(20, 1, answers)).rejects.toThrow(error)
    expect(mocks.attempt).not.toHaveBeenCalled()
  })

  it("propagates a failed progress write so the transaction can roll back", async () => {
    mocks.progressCreate.mockRejectedValue(new Error("WRITE_FAILED"))
    await expect(submitQuiz(20, 1, correct)).rejects.toThrow("WRITE_FAILED")
  })
})
