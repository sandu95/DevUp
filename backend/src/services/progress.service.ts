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