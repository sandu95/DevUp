import type { Request, Response } from "express"
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getPublishedCourseById,
  getPublishedCourses,
  getPublicCourseCurriculum,
} from "../services/course.service.js"
import { AuthRequest } from "../middleware/auth.middleware.js"

export const create = async (req: Request, res: Response) => {
  try {
    const { title, description, imageUrl } = req.body

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        message: "Course title is required",
      })
    }

    const course = await createCourse({
      title,
      description,
      imageUrl,
    })

    return res.status(201).json({
      message: "Course created successfully",
      course,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to create course",
    })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const existingCourse = await getCourseById(id)

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    const {
      title,
      description,
      imageUrl,
      status,
    } = req.body

    if (
      status &&
      status !== "DRAFT" &&
      status !== "PUBLISHED"
    ) {
      return res.status(400).json({
        message: "Invalid course status",
      })
    }

    const course = await updateCourse(id, {
      title,
      description,
      imageUrl,
      status,
    })

    return res.json({
      message: "Course updated successfully",
      course,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to update course",
    })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const existingCourse = await getCourseById(id)

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    await deleteCourse(id)

    return res.json({
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to delete course",
    })
  }
}

export const getAll = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const courses =
      req.user?.role === "ADMIN"
        ? await getCourses()
        : await getPublishedCourses()

    return res.json({
      courses,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to load courses",
    })
  }
}

export const getOne = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const courseId = Number(req.params.id)

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const course =
      req.user?.role === "ADMIN"
        ? await getCourseById(courseId)
        : await getPublishedCourseById(courseId)

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    return res.json({
      course,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to load course",
    })
  }
}

export const getPublicCurriculum = async (
  req: Request,
  res: Response
) => {
  try {
    const courseId = Number(req.params.id)

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const course =
      await getPublicCourseCurriculum(courseId)

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    return res.json({
      courseId: course.id,
      title: course.title,
      lessons: course.lessons,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to load course curriculum",
    })
  }
}