import type { Response } from "express"
import type { AuthRequest } from "../middleware/auth.middleware.js"
import { getCourseById } from "../services/course.service.js"
import {
  enrollUserInCourse,
  getEnrollment,
  getUserEnrollments,
  removeEnrollment,
} from "../services/enrollment.service.js"

export const enroll = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const courseId = Number(req.params.courseId)

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const course = await getCourseById(courseId)

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    const existingEnrollment = await getEnrollment(
      req.user.userId,
      courseId
    )

    if (existingEnrollment) {
      return res.status(409).json({
        message: "Already enrolled in this course",
      })
    }

    const enrollment = await enrollUserInCourse(
      req.user.userId,
      courseId
    )

    return res.status(201).json({
      message: "Enrolled successfully",
      enrollment,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to enroll in course",
    })
  }
}

export const getMyEnrollments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const enrollments = await getUserEnrollments(
      req.user.userId
    )

    return res.json({
      enrollments,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch enrollments",
    })
  }
}

export const unenroll = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const courseId = Number(req.params.courseId)

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course id",
      })
    }

    const enrollment = await getEnrollment(
      req.user.userId,
      courseId
    )

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found",
      })
    }

    await removeEnrollment(
      req.user.userId,
      courseId
    )

    return res.json({
      message: "Unenrolled successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to unenroll from course",
    })
  }
}