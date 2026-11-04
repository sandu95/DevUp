import { prisma } from "../lib/prisma.js"
import { getCourseProgress } from "./progress.service.js"

export const enrollUserInCourse = async (
  userId: number,
  courseId: number
) => {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } })
  if (!course || course.status !== "PUBLISHED") throw new Error("COURSE_NOT_AVAILABLE")
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
    },
    include: {
      course: true,
    },
  })
  const { completedLessons, totalLessons, percentage } = await getCourseProgress(userId, courseId)
  return { ...enrollment, progress: { completedLessons, totalLessons, percentage } }
}

export const getUserEnrollments = async (userId: number) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      course: { status: "PUBLISHED" },
    },
    orderBy: {
      enrolledAt: "desc",
    },
    include: {
      course: {
        include: {
          lessons: {
            select: {
              id: true,
              progress: {
                where: {
                  userId,
                },
                select: {
                  completed: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.lessons.length

    const completedLessons =
      enrollment.course.lessons.filter((lesson) =>
        lesson.progress.some((progress) => progress.completed)
      ).length

    const percentage =
      totalLessons === 0
        ? 0
        : Math.floor((completedLessons / totalLessons) * 100)

    const { lessons, ...course } = enrollment.course

    return {
      id: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      course,
      progress: {
        completedLessons,
        totalLessons,
        percentage,
      },
    }
  })
}

export const getEnrollment = async (
  userId: number,
  courseId: number
) => {
  return prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  })
}

export const removeEnrollment = async (
  userId: number,
  courseId: number
) => {
  return prisma.enrollment.delete({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  })
}

export const isUserEnrolled = async (
  userId: number,
  courseId: number
) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  })

  return Boolean(enrollment)
}
