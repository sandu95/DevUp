import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Response } from "express"
import type { AuthRequest } from "../src/middleware/auth.middleware.js"

const { markLessonCompleted } = vi.hoisted(() => ({ markLessonCompleted: vi.fn() }))
vi.mock("../src/services/progress.service.js", () => ({ markLessonCompleted }))
vi.mock("../src/services/course.service.js", () => ({}))
vi.mock("../src/services/enrollment.service.js", () => ({}))
import { completeLesson } from "../src/controllers/progress.controller.js"

describe("Progress controller - completeLesson", () => {
  beforeEach(() => vi.resetAllMocks())
  const request = (role = "STUDENT") => ({
    user: { userId: 1, role }, params: { lessonId: "10" },
  }) as unknown as AuthRequest
  const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })

  it.each([
    ["LESSON_NOT_FOUND", 404],
    ["NOT_ENROLLED", 403],
    ["LESSON_HAS_QUIZ", 409],
  ])("maps %s to HTTP %i", async (error, status) => {
    markLessonCompleted.mockRejectedValue(new Error(error))
    const res = response()
    await completeLesson(request(), res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(status)
  })

  it.each(["STUDENT", "ADMIN"])("delegates completion for %s to the guarded service", async (role) => {
    const progress = { completed: true }
    markLessonCompleted.mockResolvedValue(progress)
    const res = response()
    await completeLesson(request(role), res as unknown as Response)
    expect(markLessonCompleted).toHaveBeenCalledWith(1, 10)
    expect(res.json).toHaveBeenCalledWith({ message: "Lesson marked as completed", progress })
  })

  it("rejects an invalid lesson id before calling the service", async () => {
    const req = request()
    req.params.lessonId = "invalid"
    const res = response()
    await completeLesson(req, res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(markLessonCompleted).not.toHaveBeenCalled()
  })
})
