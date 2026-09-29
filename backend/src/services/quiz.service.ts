import { prisma } from "../lib/prisma.js"

interface CreateQuizData {
  title: string
  lessonId: number
}

interface CreateQuestionData {
  text: string
  position: number
  quizId: number
}

interface CreateAnswerOptionData {
  text: string
  isCorrect: boolean
  questionId: number
}

export const createQuiz = async (data: CreateQuizData) => {
  return prisma.quiz.create({
    data,
  })
}

export const getQuizById = async (id: number) => {
  return prisma.quiz.findUnique({
    where: {
      id,
    },
    include: {
      questions: {
        orderBy: {
          position: "asc",
        },
        include: {
          options: true,
        },
      },
    },
  })
}

export const getQuizForStudent = async (id: number) => {
  return prisma.quiz.findUnique({
    where: {
      id,
    },
    include: {
      lesson: {
        select: {
          id: true,
          courseId: true,
        },
      },
      questions: {
        orderBy: {
          position: "asc",
        },
        include: {
          options: {
            select: {
              id: true,
              text: true,
              questionId: true,
            },
          },
        },
      },
    },
  })
}

export const getQuizForAdmin = async (id: number) => {
  return prisma.quiz.findUnique({
    where: {
      id,
    },
    include: {
      questions: {
        orderBy: {
          position: "asc",
        },
        include: {
          options: true,
        },
      },
    },
  })
}

export const getQuizByLesson = async (lessonId: number) => {
  return prisma.quiz.findUnique({
    where: {
      lessonId,
    },
    include: {
      questions: {
        orderBy: {
          position: "asc",
        },
        include: {
          options: true,
        },
      },
    },
  })
}

export const getQuizByLessonForStudent = async (
  lessonId: number
) => {
  return prisma.quiz.findUnique({
    where: {
      lessonId,
    },
    select: {
      id: true,
      title: true,
      lessonId: true,
    },
  })
}

export const createQuestion = async (
  data: CreateQuestionData
) => {
  return prisma.question.create({
    data,
  })
}

export const getQuestionById = async (
  questionId: number
) => {
  return prisma.question.findUnique({
    where: {
      id: questionId,
    },
    include: {
      options: true,
      quiz: {
        select: {
          id: true,
          title: true,
          lessonId: true,
        },
      },
    },
  })
}

export const createAnswerOption = async (
  data: CreateAnswerOptionData
) => {
  if (data.isCorrect) {
    const existingCorrectOption =
      await prisma.answerOption.findFirst({
        where: {
          questionId: data.questionId,
          isCorrect: true,
        },
      })

    if (existingCorrectOption) {
      throw new Error("CORRECT_OPTION_ALREADY_EXISTS")
    }
  }

  return prisma.answerOption.create({
    data,
  })
}

interface SubmittedAnswer {
  questionId: number
  answerOptionId: number
}

export const submitQuiz = async (
  quizId: number,
  userId: number,
  submittedAnswers: SubmittedAnswer[]
) => {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  })

  if (!quiz) {
    throw new Error("QUIZ_NOT_FOUND")
  }

  if (quiz.questions.length === 0) {
    throw new Error("QUIZ_HAS_NO_QUESTIONS")
  }

  if (submittedAnswers.length !== quiz.questions.length) {
    throw new Error("INCOMPLETE_ANSWERS")
  }

  const usedQuestionIds = new Set<number>()
  let correctAnswers = 0

  const answerOptionIds: number[] = []

  for (const submittedAnswer of submittedAnswers) {
    if (usedQuestionIds.has(submittedAnswer.questionId)) {
      throw new Error("DUPLICATE_QUESTION")
    }

    usedQuestionIds.add(submittedAnswer.questionId)

    const question = quiz.questions.find(
      (item) => item.id === submittedAnswer.questionId
    )

    if (!question) {
      throw new Error("INVALID_QUESTION")
    }

    const option = question.options.find(
      (item) => item.id === submittedAnswer.answerOptionId
    )

    if (!option) {
      throw new Error("INVALID_ANSWER_OPTION")
    }

    if (option.isCorrect) {
      correctAnswers++
    }

    answerOptionIds.push(option.id)
  }

  const score = Math.round(
    (correctAnswers / quiz.questions.length) * 100
  )

  const attempt = await prisma.$transaction(async (tx) => {
    const createdAttempt = await tx.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        completedAt: new Date(),
      },
    })

    await tx.quizAnswer.createMany({
      data: answerOptionIds.map((answerOptionId) => ({
        attemptId: createdAttempt.id,
        answerOptionId,
      })),
    })

    return createdAttempt
  })

  return {
    attemptId: attempt.id,
    score,
    correctAnswers,
    totalQuestions: quiz.questions.length,
  }
}

export const getUserQuizAttempts = async (
  userId: number,
  quizId?: number
) => {
  return prisma.quizAttempt.findMany({
    where: {
      userId,
      ...(quizId ? { quizId } : {}),
    },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          lessonId: true,
        },
      },
    },
  })
}

interface UpdateQuestionData {
  text?: string
  position?: number
}

interface UpdateAnswerOptionData {
  text?: string
  isCorrect?: boolean
}

export const updateQuestion = async (
  questionId: number,
  data: UpdateQuestionData
) => {
  return prisma.question.update({
    where: {
      id: questionId,
    },
    data,
  })
}

export const deleteQuestion = async (
  questionId: number
) => {
  return prisma.question.delete({
    where: {
      id: questionId,
    },
  })
}

export const updateAnswerOption = async (
  optionId: number,
  data: UpdateAnswerOptionData
) => {
  if (data.isCorrect === true) {
    const option = await prisma.answerOption.findUnique({
      where: {
        id: optionId,
      },
    })

    if (!option) {
      throw new Error("ANSWER_OPTION_NOT_FOUND")
    }

    const existingCorrect =
      await prisma.answerOption.findFirst({
        where: {
          questionId: option.questionId,
          isCorrect: true,
          NOT: {
            id: optionId,
          },
        },
      })

    if (existingCorrect) {
      throw new Error("CORRECT_OPTION_ALREADY_EXISTS")
    }
  }

  return prisma.answerOption.update({
    where: {
      id: optionId,
    },
    data,
  })
}

export const deleteAnswerOption = async (
  optionId: number
) => {
  return prisma.answerOption.delete({
    where: {
      id: optionId,
    },
  })
}

export const updateQuiz = async (
  quizId: number,
  title: string
) => {
  return prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      title,
    },
  })
}

export const deleteQuiz = async (quizId: number) => {
  return prisma.quiz.delete({
    where: {
      id: quizId,
    },
  })
}