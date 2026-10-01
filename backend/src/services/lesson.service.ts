import { prisma } from "../lib/prisma.js"

interface CreateLessonData {
  title: string
  content: string
  position: number
  courseId: number
}

interface UpdateLessonData {
  title?: string
  content?: string
  position?: number
}

export const createLesson = async (data: CreateLessonData) => {
  return prisma.lesson.create({
    data,
  })
}

export const getLessonsByCourse = async (courseId: number) => {
  return prisma.lesson.findMany({
    where: {
      courseId,
    },
    orderBy: {
      position: "asc",
    },
  })
}

export const getLessonById = async (id: number) => {
  return prisma.lesson.findUnique({
    where: {
      id,
    },
    include: {
      course: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })
}

export const updateLesson = async (
  id: number,
  data: UpdateLessonData
) => {
  return prisma.lesson.update({
    where: {
      id,
    },
    data,
  })
}

export const deleteLesson = async (id: number) => {
  return prisma.lesson.delete({
    where: {
      id,
    },
  })
}