import type { Response } from "express"
import type { AuthRequest } from "../middleware/auth.middleware.js"
import { getLessonById } from "../services/lesson.service.js"
import {
  getUserProgress,
  markLessonCompleted,
} from "../services/progress.service.js"

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