import { beforeEach, describe, expect, it, vi } from "vitest"

const {
    getCourseByIdMock,
    updateCourseMock,
    deleteCourseMock,
} = vi.hoisted(() => ({
    getCourseByIdMock: vi.fn(),
    updateCourseMock: vi.fn(),
    deleteCourseMock: vi.fn(),
}))

vi.mock("../src/services/course.service.js", () => ({
    getCourseById: getCourseByIdMock,
    updateCourse: updateCourseMock,
    deleteCourse: deleteCourseMock,
}))

import {
    update,
    remove,
} from "../src/controllers/course.controller.js"

describe("Course controller - update", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should reject modification of a published course", async () => {
        getCourseByIdMock.mockResolvedValue({
            id: 1,
            title: "JavaScript Basics",
            description: "Learn JavaScript",
            imageUrl: null,
            status: "PUBLISHED",
        })

        const req = {
            params: {
                id: "1",
            },
            body: {
                title: "Changed title",
            },
        } as any

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any

        await update(req, res)

        expect(res.status).toHaveBeenCalledWith(409)

        expect(res.json).toHaveBeenCalledWith({
            message: "Published courses cannot be modified",
        })

        expect(updateCourseMock).not.toHaveBeenCalled()
    })

    it("should return 404 when deleting a course that does not exist", async () => {
        getCourseByIdMock.mockResolvedValue(null)

        const req = {
            params: {
                id: "999",
            },
        } as any

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any

        await remove(req, res)

        expect(res.status).toHaveBeenCalledWith(404)

        expect(res.json).toHaveBeenCalledWith({
            message: "Course not found",
        })

        expect(deleteCourseMock).not.toHaveBeenCalled()
    })

    it("should delete an existing published course", async () => {
        const publishedCourse = {
            id: 1,
            title: "JavaScript Basics",
            description: "Learn JavaScript",
            imageUrl: null,
            status: "PUBLISHED",
        }

        getCourseByIdMock.mockResolvedValue(publishedCourse)
        deleteCourseMock.mockResolvedValue(publishedCourse)

        const req = {
            params: {
                id: "1",
            },
        } as any

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any

        await remove(req, res)

        expect(deleteCourseMock).toHaveBeenCalledWith(1)

        expect(res.json).toHaveBeenCalledWith({
            message: "Course deleted successfully",
        })
    })
})