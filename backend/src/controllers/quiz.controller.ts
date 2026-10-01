import type { Request, Response } from "express"
import {
  createAnswerOption,
  createQuestion,
  createQuiz,
  getQuizById,
  getQuizForAdmin,
  getQuizForStudent,
  getQuizByLesson,
  getQuestionById,
  submitQuiz,
  getUserQuizAttempts,
  getQuizByLessonForStudent,
  deleteAnswerOption,
  updateAnswerOption,
  deleteQuestion,
  updateQuestion,
  updateQuiz,
  deleteQuiz,
  getAnswerOptionWithCourse,
} from "../services/quiz.service.js"
import { getLessonById } from "../services/lesson.service.js"
import { isUserEnrolled } from "../services/enrollment.service.js"

import type { AuthRequest } from "../middleware/auth.middleware.js"
import { getCourseById } from "../services/course.service.js"

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

    const course = await getCourseById(lesson.courseId)

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      })
    }

    if (course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Cannot modify a published course",
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

    if (quiz.lesson.course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
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

    const question = await getQuestionById(questionId)

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      })
    }

    if (question.quiz.lesson.course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
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

    if (
      error instanceof Error &&
      error.message === "CORRECT_OPTION_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        message: "This question already has a correct answer",
      })
    }

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

export const getByLesson = async (
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

    const quiz = await getQuizByLessonForStudent(lessonId)

    return res.json({
      quiz,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch lesson quiz",
    })
  }
}

export const getAdminQuestion = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const questionId = Number(req.params.questionId)

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        message: "Invalid question id",
      })
    }

    const question = await getQuestionById(questionId)

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      })
    }

    return res.json({
      question,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch question",
    })
  }
}

export const updateQuestionController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const questionId = Number(req.params.questionId)
    const { text, position } = req.body

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        message: "Invalid question id",
      })
    }

    const existingQuestion = await getQuestionById(questionId)

    if (!existingQuestion) {
      return res.status(404).json({
        message: "Question not found",
      })
    }

    if (
      existingQuestion.quiz.lesson.course.status ===
      "PUBLISHED"
    ) {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    const question = await updateQuestion(questionId, {
      text,
      position,
    })

    return res.json({
      message: "Question updated successfully",
      question,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to update question",
    })
  }
}

export const deleteQuestionController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const questionId = Number(req.params.questionId)

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        message: "Invalid question id",
      })
    }

    const question = await getQuestionById(questionId)

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      })
    }

    if (
      question.quiz.lesson.course.status ===
      "PUBLISHED"
    ) {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    await deleteQuestion(questionId)

    return res.json({
      message: "Question deleted successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to delete question",
    })
  }
}

export const updateAnswerOptionController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const optionId = Number(req.params.optionId)
    const { text, isCorrect } = req.body

    if (!Number.isInteger(optionId) || optionId <= 0) {
      return res.status(400).json({
        message: "Invalid answer option id",
      })
    }

    const option = await getAnswerOptionWithCourse(optionId)

    if (!option) {
      return res.status(404).json({
        message: "Answer option not found",
      })
    }

    if (
      option.question.quiz.lesson.course.status ===
      "PUBLISHED"
    ) {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    const updatedOption = await updateAnswerOption(optionId, {
      text,
      isCorrect,
    })

    return res.json({
      message: "Answer option updated successfully",
      option: updatedOption,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CORRECT_OPTION_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        message: "This question already has a correct answer",
      })
    }

    console.error(error)

    return res.status(500).json({
      message: "Failed to update answer option",
    })
  }
}

export const deleteAnswerOptionController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const optionId = Number(req.params.optionId)

    if (!Number.isInteger(optionId) || optionId <= 0) {
      return res.status(400).json({
        message: "Invalid answer option id",
      })
    }

    const option = await getAnswerOptionWithCourse(optionId)

    if (!option) {
      return res.status(404).json({
        message: "Answer option not found",
      })
    }

    if (
      option.question.quiz.lesson.course.status ===
      "PUBLISHED"
    ) {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    await deleteAnswerOption(optionId)

    return res.json({
      message: "Answer option deleted successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to delete answer option",
    })
  }
}

export const updateQuizController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const quizId = Number(req.params.id)
    const { title } = req.body

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        message: "Quiz title is required",
      })
    }

    const existingQuiz = await getQuizById(quizId)

    if (!existingQuiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    if (existingQuiz.lesson.course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    const quiz = await updateQuiz(
      quizId,
      title.trim()
    )

    return res.json({
      message: "Quiz updated successfully",
      quiz,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to update quiz",
    })
  }
}

export const deleteQuizController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const quizId = Number(req.params.id)

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        message: "Invalid quiz id",
      })
    }

    const existingQuiz = await getQuizById(quizId)

    if (!existingQuiz) {
      return res.status(404).json({
        message: "Quiz not found",
      })
    }

    if (existingQuiz.lesson.course.status === "PUBLISHED") {
      return res.status(409).json({
        message: "Cannot modify a quiz in a published course",
      })
    }

    await deleteQuiz(quizId)

    return res.json({
      message: "Quiz deleted successfully",
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to delete quiz",
    })
  }
}