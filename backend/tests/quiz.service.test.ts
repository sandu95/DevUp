import { beforeEach, describe, expect, it, vi } from "vitest"

const {
    quizFindUniqueMock,
    quizAttemptCreateMock,
    quizAnswerCreateManyMock,
    markLessonCompletedMock,
} = vi.hoisted(() => ({
    quizFindUniqueMock: vi.fn(),
    quizAttemptCreateMock: vi.fn(),
    quizAnswerCreateManyMock: vi.fn(),
    markLessonCompletedMock: vi.fn(),
}))

vi.mock("../src/lib/prisma.js", () => ({
    prisma: {
        quiz: {
            findUnique: quizFindUniqueMock,
        },
        $transaction: vi.fn(async (callback) => {
            return callback({
                quizAttempt: {
                    create: quizAttemptCreateMock,
                },
                quizAnswer: {
                    createMany: quizAnswerCreateManyMock,
                },
            })
        }),
    },
}))

vi.mock("../src/services/progress.service.js", () => ({
    markLessonCompleted: markLessonCompletedMock,
}))

import { submitQuiz } from "../src/services/quiz.service.js"

describe("Quiz service", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should complete the lesson when the quiz score is 100%", async () => {
        const mockQuiz = {
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "What is JavaScript?",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "A programming language",
                            isCorrect: true,
                        },
                        {
                            id: 102,
                            text: "A database",
                            isCorrect: false,
                        },
                    ],
                },
                {
                    id: 2,
                    text: "Which keyword declares a constant?",
                    position: 2,
                    options: [
                        {
                            id: 201,
                            text: "const",
                            isCorrect: true,
                        },
                        {
                            id: 202,
                            text: "variable",
                            isCorrect: false,
                        },
                    ],
                },
            ],
        }

        const mockAttempt = {
            id: 50,
            userId: 1,
            quizId: 20,
            score: 100,
            completedAt: new Date(),
        }

        quizFindUniqueMock.mockResolvedValue(mockQuiz)
        quizAttemptCreateMock.mockResolvedValue(mockAttempt)
        quizAnswerCreateManyMock.mockResolvedValue({
            count: 2,
        })

        const result = await submitQuiz(
            20,
            1,
            [
                {
                    questionId: 1,
                    answerOptionId: 101,
                },
                {
                    questionId: 2,
                    answerOptionId: 201,
                },
            ]
        )

        expect(result).toEqual({
            attemptId: 50,
            score: 100,
            correctAnswers: 2,
            totalQuestions: 2,
        })

        expect(markLessonCompletedMock).toHaveBeenCalledWith(
            1,
            10
        )
    })

    it("should not complete the lesson when the quiz score is below 100%", async () => {
        const mockQuiz = {
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "What is JavaScript?",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "A programming language",
                            isCorrect: true,
                        },
                        {
                            id: 102,
                            text: "A database",
                            isCorrect: false,
                        },
                    ],
                },
                {
                    id: 2,
                    text: "Which keyword declares a constant?",
                    position: 2,
                    options: [
                        {
                            id: 201,
                            text: "const",
                            isCorrect: true,
                        },
                        {
                            id: 202,
                            text: "variable",
                            isCorrect: false,
                        },
                    ],
                },
            ],
        }

        const mockAttempt = {
            id: 51,
            userId: 1,
            quizId: 20,
            score: 50,
            completedAt: new Date(),
        }

        quizFindUniqueMock.mockResolvedValue(mockQuiz)
        quizAttemptCreateMock.mockResolvedValue(mockAttempt)
        quizAnswerCreateManyMock.mockResolvedValue({
            count: 2,
        })

        const result = await submitQuiz(
            20,
            1,
            [
                {
                    questionId: 1,
                    answerOptionId: 101,
                },
                {
                    questionId: 2,
                    answerOptionId: 202,
                },
            ]
        )

        expect(result).toEqual({
            attemptId: 51,
            score: 50,
            correctAnswers: 1,
            totalQuestions: 2,
        })

        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject submission when quiz does not exist", async () => {
        quizFindUniqueMock.mockResolvedValue(null)

        await expect(
            submitQuiz(999, 1, [])
        ).rejects.toThrow("QUIZ_NOT_FOUND")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject submission when quiz has no questions", async () => {
        quizFindUniqueMock.mockResolvedValue({
            id: 20,
            title: "Empty Quiz",
            lessonId: 10,
            questions: [],
        })

        await expect(
            submitQuiz(20, 1, [])
        ).rejects.toThrow("QUIZ_HAS_NO_QUESTIONS")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject incomplete answers", async () => {
        quizFindUniqueMock.mockResolvedValue({
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "Question 1",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
                {
                    id: 2,
                    text: "Question 2",
                    position: 2,
                    options: [
                        {
                            id: 201,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
            ],
        })

        await expect(
            submitQuiz(20, 1, [
                {
                    questionId: 1,
                    answerOptionId: 101,
                },
            ])
        ).rejects.toThrow("INCOMPLETE_ANSWERS")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject duplicate question answers", async () => {
        quizFindUniqueMock.mockResolvedValue({
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "Question 1",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
                {
                    id: 2,
                    text: "Question 2",
                    position: 2,
                    options: [
                        {
                            id: 201,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
            ],
        })

        await expect(
            submitQuiz(20, 1, [
                {
                    questionId: 1,
                    answerOptionId: 101,
                },
                {
                    questionId: 1,
                    answerOptionId: 101,
                },
            ])
        ).rejects.toThrow("DUPLICATE_QUESTION")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject an invalid question", async () => {
        quizFindUniqueMock.mockResolvedValue({
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "Question 1",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
            ],
        })

        await expect(
            submitQuiz(20, 1, [
                {
                    questionId: 999,
                    answerOptionId: 101,
                },
            ])
        ).rejects.toThrow("INVALID_QUESTION")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should reject an invalid answer option", async () => {
        quizFindUniqueMock.mockResolvedValue({
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
            questions: [
                {
                    id: 1,
                    text: "Question 1",
                    position: 1,
                    options: [
                        {
                            id: 101,
                            text: "Correct",
                            isCorrect: true,
                        },
                    ],
                },
            ],
        })

        await expect(
            submitQuiz(20, 1, [
                {
                    questionId: 1,
                    answerOptionId: 999,
                },
            ])
        ).rejects.toThrow("INVALID_ANSWER_OPTION")

        expect(quizAttemptCreateMock).not.toHaveBeenCalled()
        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })
})