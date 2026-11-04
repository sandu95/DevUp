import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  lessonProgressCreateMock,
  lessonProgressUpdateMock,
  lessonProgressReadMock,
  lessonFindUniqueMock,
  enrollmentMock,
  quizMock,
  lessonFindManyMock,
} = vi.hoisted(() => ({
  lessonProgressCreateMock: vi.fn(),
  lessonProgressUpdateMock: vi.fn(),
  lessonProgressReadMock: vi.fn(),
  lessonFindUniqueMock: vi.fn(),
  enrollmentMock: vi.fn(),
  quizMock: vi.fn(),
  lessonFindManyMock: vi.fn(),
}))

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => callback({
      lessonProgress: {
        createMany: lessonProgressCreateMock,
        updateMany: lessonProgressUpdateMock,
        findUniqueOrThrow: lessonProgressReadMock,
      },
    })),
    enrollment: { findFirst: enrollmentMock },
    quiz: { findUnique: quizMock },
    lesson: {
      findUnique: lessonFindUniqueMock,
      findMany: lessonFindManyMock,
    },
  },
}))

import {
  markLessonCompleted,
  getCourseProgress,
} from "../src/services/progress.service.js"

describe("Progress service", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    lessonFindUniqueMock.mockResolvedValue({ id: 10, courseId: 5, course: { status: "PUBLISHED" } })
    enrollmentMock.mockResolvedValue({ id: 1 })
    quizMock.mockResolvedValue(null)
  })

  it("should mark a lesson as completed", async () => {
    const mockProgress = {
      id: 1,
      userId: 1,
      lessonId: 10,
      completed: true,
      completedAt: new Date(),
    }

    lessonProgressReadMock.mockResolvedValue(mockProgress)

    const result = await markLessonCompleted(1, 10)

    expect(lessonProgressCreateMock).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [{
        userId: 1,
        lessonId: 10,
        completed: true,
        completedAt: expect.any(Date),
      }],
    })
    expect(lessonProgressUpdateMock).toHaveBeenCalledWith({
      where: { userId: 1, lessonId: 10, completed: false },
      data: { completed: true, completedAt: expect.any(Date) },
    })

    expect(result).toEqual(mockProgress)
  })

  it.each(["LESSON_NOT_FOUND", "NOT_ENROLLED", "LESSON_HAS_QUIZ"])(
    "rejects %s before writing progress", async (error) => {
      if (error === "LESSON_NOT_FOUND") lessonFindUniqueMock.mockResolvedValue(null)
      if (error === "NOT_ENROLLED") enrollmentMock.mockResolvedValue(null)
      if (error === "LESSON_HAS_QUIZ") quizMock.mockResolvedValue({ id: 20 })
      await expect(markLessonCompleted(1, 10)).rejects.toThrow(error)
      expect(lessonProgressCreateMock).not.toHaveBeenCalled()
    }
  )

  it("should calculate course progress correctly", async () => {
    lessonFindManyMock.mockResolvedValue([
      {
        id: 1,
        title: "Introduction",
        position: 1,
        progress: [
          {
            completed: true,
            completedAt: new Date(),
          },
        ],
      },
      {
        id: 2,
        title: "Variables",
        position: 2,
        progress: [],
      },
      {
        id: 3,
        title: "Functions",
        position: 3,
        progress: [
          {
            completed: true,
            completedAt: new Date(),
          },
        ],
      },
      {
        id: 4,
        title: "Arrays",
        position: 4,
        progress: [],
      },
    ])

    const result = await getCourseProgress(1, 5)

    expect(result.courseId).toBe(5)
    expect(result.totalLessons).toBe(4)
    expect(result.completedLessons).toBe(2)
    expect(result.percentage).toBe(50)

    expect(result.lessons).toHaveLength(4)

    expect(result.lessons[0].completed).toBe(true)
    expect(result.lessons[1].completed).toBe(false)
    expect(result.lessons[2].completed).toBe(true)
    expect(result.lessons[3].completed).toBe(false)
  })

  it("should return 0 percent for a course without lessons", async () => {
    lessonFindManyMock.mockResolvedValue([])

    const result = await getCourseProgress(1, 5)

    expect(result.courseId).toBe(5)
    expect(result.totalLessons).toBe(0)
    expect(result.completedLessons).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.lessons).toEqual([])
  })
})
