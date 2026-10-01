import type { Response } from "express"
import type { AuthRequest } from "../middleware/auth.middleware.js"
import {
  getCourseProgress,
  getUserProgress,
  markLessonCompleted,
} from "../services/progress.service.js"
import { getCourseById } from "../services/course.service.js"
import { getLessonById } from "../services/lesson.service.js"
import { getQuizByLesson } from "../services/quiz.service.js"
import { isUserEnrolled } from "../services/enrollment.service.js"

export const completeLesson = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const lessonId = Number(req.params.lessonId)

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        message: "Invalid lesson id",
      })
    }

    const lesson = await getLessonById(lessonId)

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

    const quiz = await getQuizByLesson(lessonId)

    if (quiz) {
      return res.status(409).json({
        message:
          "This lesson has a quiz and can only be completed by achieving 100% on the quiz",
      })
    }

    const progress = await markLessonCompleted(
      req.user.userId,
      lessonId
    )

    return res.json({
      message: "Lesson marked as completed",
      progress,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to update lesson progress",
    })
  }
}

export const getMyProgress = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const progress = await getUserProgress(
      req.user.userId
    )

    return res.json({
      progress,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch progress",
    })
  }
}

export const getMyCourseProgress = async (
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

    if (req.user.role !== "ADMIN") {
      const enrolled = await isUserEnrolled(
        req.user.userId,
        courseId
      )

      if (!enrolled) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        })
      }
    }

    const progress = await getCourseProgress(
      req.user.userId,
      courseId
    )

    return res.json({
      progress,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch course progress",
    })
  }
}