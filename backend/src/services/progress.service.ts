
import { prisma } from "../lib/prisma.js"
import type { Prisma } from "../generated/prisma/client.js"

// Internal write shared by the authorized manual and quiz completion flows.
export const saveLessonCompletion = async (
  tx: Prisma.TransactionClient,
  userId: number,
  lessonId: number
) => {
  const completedAt = new Date()

  // Concurrent requests may insert the same progress. Never overwrite an
  // already completed row, including its original completion timestamp.
  await tx.lessonProgress.createMany({
    data: [{ userId, lessonId, completed: true, completedAt }],
    skipDuplicates: true,
  })
  await tx.lessonProgress.updateMany({
    where: { userId, lessonId, completed: false },
    data: { completed: true, completedAt },
  })

  return tx.lessonProgress.findUniqueOrThrow({
    where: { userId_lessonId: { userId, lessonId } },
  })
}

export const markLessonCompleted = async (
  userId: number,
  lessonId: number
) => {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },
    select: {
      id: true,
      courseId: true,
    },
  })

  if (!lesson) {
    throw new Error("LESSON_NOT_FOUND")
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: lesson.courseId,
    },
    select: {
      id: true,
    },
  })

  if (!enrollment) {
    throw new Error("NOT_ENROLLED")
  }

  const quiz = await prisma.quiz.findUnique({
    where: {
      lessonId,
    },
    select: {
      id: true,
    },
  })

  if (quiz) {
    throw new Error("LESSON_HAS_QUIZ")
  }

  return prisma.$transaction((tx) =>
    saveLessonCompletion(tx, userId, lessonId)
  )
}

export const getUserProgress = async (userId: number) => {
  return prisma.lessonProgress.findMany({
    where: {
      userId,
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          position: true,
          courseId: true,
        },
      },
    },
  })
}

export const getCourseProgress = async (
  userId: number,
  courseId: number
) => {
  const lessons = await prisma.lesson.findMany({
    where: {
      courseId,
    },
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
      title: true,
      position: true,
      progress: {
        where: {
          userId,
        },
        select: {
          completed: true,
          completedAt: true,
        },
      },
    },
  })

  const totalLessons = lessons.length

  const formattedLessons = lessons.map((lesson) => {
    const lessonProgress = lesson.progress[0]

    return {
      id: lesson.id,
      title: lesson.title,
      position: lesson.position,
      completed: lessonProgress?.completed ?? false,
      completedAt: lessonProgress?.completedAt ?? null,
    }
  })

  const completedLessons = formattedLessons.filter(
    (lesson) => lesson.completed
  ).length

  const percentage =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100)

  return {
    courseId,
    completedLessons,
    totalLessons,
    percentage,
    lessons: formattedLessons,
  }
}
