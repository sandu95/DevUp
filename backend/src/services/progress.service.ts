import { prisma } from "../lib/prisma.js"

export const markLessonCompleted = async (
  userId: number,
  lessonId: number
) => {
  return prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
    create: {
      userId,
      lessonId,
      completed: true,
      completedAt: new Date(),
    },
  })
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