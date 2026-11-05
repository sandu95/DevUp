import { prisma } from "../lib/prisma.js"
import { CoursePublicationError } from "../lib/course-publication-error.js"
import { getPublicationIssues, publicationInclude } from "../lib/course-publication.js"

interface CreateCourseData {
  title: string
  description?: string | null
  imageUrl?: string | null
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
  if (data.status === "PUBLISHED") {
    return prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id },
        include: publicationInclude,
      })
      if (!course) throw new Error("COURSE_NOT_FOUND")
      if (course.status === "PUBLISHED") throw new Error("COURSE_ALREADY_PUBLISHED")

      const issues = getPublicationIssues({ ...course, title: data.title ?? course.title })
      if (issues.length) throw new CoursePublicationError(issues.map((issue) => issue.message))
      return tx.course.update({ where: { id }, data })
    })
  }
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

export const getCoursePublicationCheck = async (id: number) => {
  const course = await prisma.course.findUnique({ where: { id }, include: publicationInclude })
  if (!course) return null
  const issues = getPublicationIssues(course)
  return { courseId: id, status: course.status, ready: course.status === "DRAFT" && issues.length === 0, issues }
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
