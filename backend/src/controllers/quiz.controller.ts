import type { Request, Response } from "express"
import {
  createAnswerOption,
  createQuestion,
  createQuiz,
  getQuizById,
  getQuizForAdmin,
  getQuizForStudent,
  getQuizByLesson,
  submitQuiz,
  getUserQuizAttempts,
} from "../services/quiz.service.js"
import { getLessonById } from "../services/lesson.service.js"
import { isUserEnrolled } from "../services/enrollment.service.js"

import type { AuthRequest } from "../middleware/auth.middleware.js"

export const create = async (req: Request, res: Response) => {
  try {
    const { title, lessonId } = req.body

    if (!title || !Number.isInteger(lessonId)) {
      return res.status(400).json({
        message: "Title and lessonId are required",
      })
    }

    const lesson = await getLessonById(lessonId)

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found",
      })
    }

    const existingQuiz = await getQuizByLesson(lessonId)

    if (existingQuiz) {
      return res.status(409).json({
        message: "This lesson already has a quiz",
      })
    }

    const quiz = await createQuiz({
      title,
      lessonId,
    })

    return res.status(201).json({
      message: "Quiz created successfully",
      quiz,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to create quiz",
    })
  }
}

export const getStudentQuiz = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    const quiz = await getQuizForStudent(id)

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    if (req.user?.role !== "ADMIN") {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
        })
      }

      const enrolled = await isUserEnrolled(
        req.user.userId,
        quiz.lesson.courseId
      )

      if (!enrolled) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        })
      }
    }

    return res.json({
      quiz,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch quiz",
    })
  }
}

export const getAdminQuiz = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    const quiz = await getQuizForAdmin(id)

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    return res.json({
      quiz,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch quiz",
    })
  }
}

export const addQuestion = async (
  req: Request,
  res: Response
) => {
  try {
    const quizId = Number(req.params.quizId)
    const { text, position } = req.body

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0 ||
      !text ||
      !Number.isInteger(position)
    ) {
      return res.status(400).json({
        message: "Valid quizId, text and position are required",
      })
    }

    const quiz = await getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    const question = await createQuestion({
      text,
      position,
      quizId,
    })

    return res.status(201).json({
      message: "Question created successfully",
      question,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to create question",
    })
  }
}

export const addAnswerOption = async (
  req: Request,
  res: Response
) => {
  try {
    const questionId = Number(req.params.questionId)
    const { text, isCorrect } = req.body

    if (
      !Number.isInteger(questionId) ||
      questionId <= 0 ||
      !text ||
      typeof isCorrect !== "boolean"
    ) {
      return res.status(400).json({
        message: "Valid questionId, text and isCorrect are required",
      })
    }

    const option = await createAnswerOption({
      text,
      isCorrect,
      questionId,
    })

    return res.status(201).json({
      message: "Answer option created successfully",
      option,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to create answer option",
    })
  }
}

export const submit = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const quizId = Number(req.params.id)
    const { answers } = req.body

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: "Answers must be an array",
      })
    }

    const invalidAnswer = answers.some(
      (answer) =>
        !Number.isInteger(answer.questionId) ||
        !Number.isInteger(answer.answerOptionId)
    )

    if (invalidAnswer) {
      return res.status(400).json({
        message: "Invalid answer format",
      })
    }

    const quiz = await getQuizForStudent(quizId)

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    if (req.user.role !== "ADMIN") {
      const enrolled = await isUserEnrolled(
        req.user.userId,
        quiz.lesson.courseId
      )

      if (!enrolled) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        })
      }
    }

    const result = await submitQuiz(
      quizId,
      req.user.userId,
      answers
    )

    return res.status(201).json({
      message: "Quiz submitted successfully",
      result,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "QUIZ_NOT_FOUND") {
        return res.status(404).json({
          message: "Quiz not found",
        })
      }

      if (error.message === "QUIZ_HAS_NO_QUESTIONS") {
        return res.status(400).json({
          message: "Quiz has no questions",
        })
      }

      if (error.message === "INCOMPLETE_ANSWERS") {
        return res.status(400).json({
          message: "All questions must be answered",
        })
      }

      if (
        error.message === "INVALID_QUESTION" ||
        error.message === "INVALID_ANSWER_OPTION" ||
        error.message === "DUPLICATE_QUESTION"
      ) {
        return res.status(400).json({
          message: "Invalid quiz answers",
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: "Failed to submit quiz",
    })
  }
}

export const getMyAttempts = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const quizId = req.query.quizId
      ? Number(req.query.quizId)
      : undefined

    if (
      quizId !== undefined &&
      (!Number.isInteger(quizId) || quizId <= 0)
    ) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    const attempts = await getUserQuizAttempts(
      req.user.userId,
      quizId
    )

    return res.json({
      attempts,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch quiz attempts",
    })
  }
}