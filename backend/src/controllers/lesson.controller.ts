import type { Request, Response } from "express"
import type { AuthRequest } from "../middleware/auth.middleware.js"
import { isUserEnrolled } from "../services/enrollment.service.js"
import {
  createLesson,
  deleteLesson,
  getLessonById,
  getLessonsByCourse,
  updateLesson,
} from "../services/lesson.service.js"
import { getCourseById } from "../services/course.service.js"

export const create = async (req: Request, res: Response) => {
  try {
    const { title, content, position, courseId } = req.body

    if (
      !title ||
      !content ||
      !Number.isInteger(position) ||
      !Number.isInteger(courseId)
    ) {
      return res.status(400).json({
        message: "Title, content, position and courseId are required",
      })
    }

    const course = await getCourseById(courseId)

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    if (course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Lessons cannot be modified in a published course",
      })
    }

    const lesson = await createLesson({
      title,
      content,
      position,
      courseId,
    })

    return res.status(201).json({
      message: "Lesson created successfully",
      lesson,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to create lesson",
    })
  }
}

export const getByCourse = async (req: Request, res: Response) => {
  try {
    const courseId = Number(req.params.courseId)

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const lessons = await getLessonsByCourse(courseId)

    return res.json({
      lessons,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch lessons",
    })
  }
}

export const getOne = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid lesson id",
      })
    }

    const lesson = await getLessonById(id)

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found",
      })
    }

    if (req.user.role !== "ADMIN") {
      const enrolled = await isUserEnrolled(
        req.user.userId,
        lesson.courseId
      )

      if (!enrolled) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        })
      }
    }

    return res.json({
      lesson,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch lesson",
    })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid lesson id",
      })
    }

    const existingLesson = await getLessonById(id)

    if (!existingLesson) {
      return res.status(404).json({
        message: "Lesson not found",
      })
    }

    const course = await getCourseById(
      existingLesson.courseId
    )

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    if (course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Lessons cannot be modified in a published course",
      })
    }

    const { title, content, position } = req.body

    const lesson = await updateLesson(id, {
      title,
      content,
      position,
    })

    return res.json({
      message: "Lesson updated successfully",
      lesson,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to update lesson",
    })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid lesson id",
      })
    }

    const existingLesson = await getLessonById(id)

    if (!existingLesson) {
      return res.status(404).json({
        message: "Lesson not found",
      })
    }

    const course = await getCourseById(
      existingLesson.courseId
    )

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    if (course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Lessons cannot be modified in a published course",
      })
    }

    await deleteLesson(id)

    return res.json({
      message: "Lesson deleted successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to delete lesson",
    })
  }
}