import { beforeEach, describe, expect, it, vi } from "vitest"

const {
    getLessonByIdMock,
    getQuizByLessonMock,
    isUserEnrolledMock,
    markLessonCompletedMock,
} = vi.hoisted(() => ({
    getLessonByIdMock: vi.fn(),
    getQuizByLessonMock: vi.fn(),
    isUserEnrolledMock: vi.fn(),
    markLessonCompletedMock: vi.fn(),
}))

vi.mock("../src/services/lesson.service.js", () => ({
    getLessonById: getLessonByIdMock,
}))

vi.mock("../src/services/quiz.service.js", () => ({
    getQuizByLesson: getQuizByLessonMock,
}))

vi.mock("../src/services/enrollment.service.js", () => ({
    isUserEnrolled: isUserEnrolledMock,
}))

vi.mock("../src/services/progress.service.js", () => ({
    markLessonCompleted: markLessonCompletedMock,
    getCourseProgress: vi.fn(),
    getUserProgress: vi.fn(),
}))

import {
    completeLesson,
} from "../src/controllers/progress.controller.js"

describe("Progress controller - completeLesson", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should reject manual completion when lesson has a quiz", async () => {
        getLessonByIdMock.mockResolvedValue({
            id: 10,
            title: "JavaScript Basics",
            content: "Lesson content",
            position: 1,
            courseId: 5,
        })

        isUserEnrolledMock.mockResolvedValue(true)

        getQuizByLessonMock.mockResolvedValue({
            id: 20,
            title: "JavaScript Quiz",
            lessonId: 10,
        })

        const req = {
            user: {
                userId: 1,
                role: "STUDENT",
            },
            params: {
                lessonId: "10",
            },
        } as any

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any

        await completeLesson(req, res)

        expect(res.status).toHaveBeenCalledWith(409)

        expect(res.json).toHaveBeenCalledWith({
            message:
                "This lesson has a quiz and can only be completed by achieving 100% on the quiz",
        })

        expect(markLessonCompletedMock).not.toHaveBeenCalled()
    })

    it("should allow manual completion when lesson has no quiz", async () => {
        const mockProgress = {
            id: 1,
            userId: 1,
            lessonId: 10,
            completed: true,
            completedAt: new Date(),
        }

        getLessonByIdMock.mockResolvedValue({
            id: 10,
            title: "Introduction",
            content: "Lesson content",
            position: 1,
            courseId: 5,
        })

        isUserEnrolledMock.mockResolvedValue(true)

        getQuizByLessonMock.mockResolvedValue(null)

        markLessonCompletedMock.mockResolvedValue(mockProgress)

        const req = {
            user: {
                userId: 1,
                role: "STUDENT",
            },
            params: {
                lessonId: "10",
            },
        } as any

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any

        await completeLesson(req, res)

        expect(markLessonCompletedMock).toHaveBeenCalledWith(
            1,
            10
        )

        expect(res.json).toHaveBeenCalledWith({
            message: "Lesson marked as completed",
            progress: mockProgress,
        })
    })
})