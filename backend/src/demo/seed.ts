import bcrypt from "bcryptjs"
import type { PrismaClient } from "../generated/prisma/client.js"
import { getPublicationIssues, publicationInclude } from "../lib/course-publication.js"
import { DemoConfigError } from "./config.js"
import { demoCourses } from "./content.js"

export const demoAccounts = {
  admin: { name: "DevUp Demo Admin (v1)", email: "admin@demo.devup.local", role: "ADMIN" },
  learner: { name: "Demo Learner", email: "learner@demo.devup.local", role: "STUDENT" },
  newcomer: { name: "New Learner", email: "new@demo.devup.local", role: "STUDENT" },
} as const

export async function seedDemo(prisma: PrismaClient, password: string) {
  if (process.env.NODE_ENV === "production" || password.length < 12) {
    throw new DemoConfigError("Demo seeding requires a local environment and a password of at least 12 characters.")
  }
  const [target] = await prisma.$queryRaw<{ database: string; schema: string }[]>`
    SELECT current_database() AS database, current_schema() AS schema`
  if (!target || !/^[a-z][a-z0-9_]*_demo$/.test(target.database) || target.schema !== "public") {
    throw new DemoConfigError("Demo seeding requires a dedicated _demo database and public schema.")
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261107)::text`
    const marker = await tx.user.findUnique({ where: { email: demoAccounts.admin.email } })
    if (marker?.name === demoAccounts.admin.name && marker.role === "ADMIN") return { status: "already-seeded" as const }
    if (await tx.user.count() || await tx.course.count()) {
      throw new DemoConfigError("Demo seeding refuses a nonempty database without its dataset marker. Use a fresh _demo database.")
    }
    const hashed = await bcrypt.hash(password, 10)
    await tx.user.create({ data: { ...demoAccounts.admin, password: hashed } })
    const learner = await tx.user.create({ data: { ...demoAccounts.learner, password: hashed } })
    await tx.user.create({ data: { ...demoAccounts.newcomer, password: hashed } })
    const courses = []
    for (const data of demoCourses) {
      const course = await tx.course.create({ data, include: publicationInclude })
      if (course.status === "PUBLISHED" && getPublicationIssues(course).length) {
        throw new Error("Invalid published demo content")
      }
      courses.push(course)
    }
    const javascript = courses[0]!
    const html = courses[1]!
    const date = (day: number) => new Date(`2026-01-${String(day).padStart(2, "0")}T12:00:00Z`)
    await tx.enrollment.createMany({ data: [javascript, html].map((course) => ({ userId: learner.id, courseId: course.id, enrolledAt: date(10) })) })
    for (const course of [javascript, html]) {
      await tx.lessonProgress.create({ data: { userId: learner.id, lessonId: course.lessons[0]!.id, completed: true, completedAt: date(11) } })
    }
    // These are fixed historical fixtures, with submitted answers and progress
    // written in this same transaction. Runtime submission rules remain in quiz.service.
    for (const [course, correctCount, day] of [[javascript, 1, 12], [html, 3, 13], [html, 0, 14]] as const) {
      const lesson = course.lessons.find((item) => item.quiz)!
      const quiz = lesson.quiz!
      const questions = [...quiz.questions].sort((a, b) => a.position - b.position)
      const answers = questions.map((question, index) => ({
        answerOptionId: question.options.find((option) => option.isCorrect === (index < correctCount))!.id,
      }))
      await tx.quizAttempt.create({ data: { userId: learner.id, quizId: quiz.id,
        score: Math.floor(correctCount / questions.length * 100), startedAt: date(day), completedAt: date(day),
        answers: { create: answers },
      } })
      if (correctCount === questions.length) await tx.lessonProgress.create({ data: {
        userId: learner.id, lessonId: lesson.id, completed: true, completedAt: date(day),
      } })
    }
    return { status: "created" as const }
  }, { maxWait: 30000, timeout: 30000 })
}
