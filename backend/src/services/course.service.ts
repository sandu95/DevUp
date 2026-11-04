import { prisma } from "../lib/prisma.js"
import { CoursePublicationError } from "../lib/course-publication-error.js"

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
        include: { lessons: { orderBy: { position: "asc" }, include: {
          quiz: { include: { questions: { orderBy: { position: "asc" }, include: { options: true } } } },
        } } },
      })
      if (!course) throw new Error("COURSE_NOT_FOUND")
      if (course.status === "PUBLISHED") throw new Error("COURSE_ALREADY_PUBLISHED")

      const issues: string[] = []
      if (!(data.title ?? course.title).trim()) issues.push("Course must have a title.")
      if (!course.lessons.length) issues.push("Course must contain at least one lesson.")
      for (const lesson of course.lessons) {
        if (!lesson.title.trim() || !lesson.content.trim()) {
          issues.push(`Lesson ${lesson.position} must have a title and content.`)
        }
        const quiz = lesson.quiz
        if (!quiz) continue
        if (!quiz.title.trim()) issues.push(`The quiz in lesson ${lesson.position} must have a title.`)
        if (!quiz.questions.length) issues.push(`Quiz "${quiz.title}" must contain at least one question.`)
        for (const question of quiz.questions) {
          const label = `Question ${question.position} in quiz "${quiz.title}"`
          if (!question.text.trim()) issues.push(`${label} must have text.`)
          if (!question.options.length) issues.push(`${label} must have answer options.`)
          if (question.options.some((option) => !option.text.trim())) issues.push(`${label} has a blank answer option.`)
          if (question.options.filter((option) => option.isCorrect).length !== 1) {
            issues.push(`${label} must have exactly one correct answer.`)
          }
        }
      }
      if (issues.length) throw new CoursePublicationError(issues)
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
