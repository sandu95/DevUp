import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  lessonProgressUpsertMock,
  lessonFindManyMock,
} = vi.hoisted(() => ({
  lessonProgressUpsertMock: vi.fn(),
  lessonFindManyMock: vi.fn(),
}))

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    lessonProgress: {
      upsert: lessonProgressUpsertMock,
    },
    lesson: {
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
    vi.clearAllMocks()
  })

  it("should mark a lesson as completed", async () => {
    const mockProgress = {
      id: 1,
      userId: 1,
      lessonId: 10,
      completed: true,
      completedAt: new Date(),
    }

    lessonProgressUpsertMock.mockResolvedValue(mockProgress)

    const result = await markLessonCompleted(1, 10)

    expect(lessonProgressUpsertMock).toHaveBeenCalledWith({
      where: {
        userId_lessonId: {
          userId: 1,
          lessonId: 10,
        },
      },
      update: {
        completed: true,
        completedAt: expect.any(Date),
      },
      create: {
        userId: 1,
        lessonId: 10,
        completed: true,
        completedAt: expect.any(Date),
      },
    })

    expect(result).toEqual(mockProgress)
  })

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