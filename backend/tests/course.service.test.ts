import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  courseCreateMock,
  courseUpdateMock,
} = vi.hoisted(() => ({
  courseCreateMock: vi.fn(),
  courseUpdateMock: vi.fn(),
}))

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    course: {
      create: courseCreateMock,
      update: courseUpdateMock,
    },
  },
}))

import {
  createCourse,
  updateCourse,
} from "../src/services/course.service.js"

describe("Course service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create a course as DRAFT", async () => {
    const mockCourse = {
      id: 1,
      title: "JavaScript Basics",
      description: "Learn JavaScript",
      imageUrl: null,
      status: "DRAFT",
    }

    courseCreateMock.mockResolvedValue(mockCourse)

    const result = await createCourse({
      title: "JavaScript Basics",
      description: "Learn JavaScript",
    })

    expect(courseCreateMock).toHaveBeenCalledWith({
      data: {
        title: "JavaScript Basics",
        description: "Learn JavaScript",
        imageUrl: undefined,
      },
    })

    expect(result).toEqual(mockCourse)
    expect(result.status).toBe("DRAFT")
  })

  it("should update a course", async () => {
    const mockCourse = {
      id: 1,
      title: "Updated JavaScript",
      description: "Updated description",
      imageUrl: null,
      status: "DRAFT",
    }

    courseUpdateMock.mockResolvedValue(mockCourse)

    const result = await updateCourse(1, {
      title: "Updated JavaScript",
      description: "Updated description",
    })

    expect(courseUpdateMock).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        title: "Updated JavaScript",
        description: "Updated description",
      },
    })

    expect(result).toEqual(mockCourse)
  })
})