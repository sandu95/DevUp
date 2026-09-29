import { prisma } from "../lib/prisma.js"

interface CreateCourseData {
  title: string
  description?: string
  imageUrl?: string
}

export const createCourse = async (data: CreateCourseData) => {
  return prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
    },
  })
}

export const getCourses = async () => {
  return prisma.course.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })
}

export const getCourseById = async (id: number) => {
  return prisma.course.findUnique({
    where: {
      id,
    },
  })
}

interface UpdateCourseData {
  title?: string
  description?: string | null
  imageUrl?: string | null
  status?: "DRAFT" | "PUBLISHED"
}

export const updateCourse = async (
  id: number,
  data: UpdateCourseData
) => {
  return prisma.course.update({
    where: {
      id,
    },
    data,
  })
}

export const deleteCourse = async (id: number) => {
  return prisma.course.delete({
    where: {
      id,
    },
  })
}

export const getPublishedCourses = async () => {
  return prisma.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export const getPublishedCourseById = async (
  courseId: number
) => {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
    },
  })
}

export const getPublicCourseCurriculum = async (
  courseId: number
) => {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      lessons: {
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
    },
  })
}