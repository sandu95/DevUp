import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma.js"

export { prisma }

export async function createBrowserData() {
  if (!process.env.DATABASE_URL || !/_test$/.test(new URL(process.env.DATABASE_URL).pathname)) {
    throw new Error("Browser fixtures require a test database")
  }
  const userIds: number[] = []
  const courseIds: number[] = []
  const cleanup = async () => {
    if (courseIds.length) await prisma.course.deleteMany({ where: { id: { in: courseIds } } })
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  try {
    const password = "browser-test-password"
    const hashed = await bcrypt.hash(password, 4)
    const student = await prisma.user.create({ data: {
      name: "Browser Student", email: `browser-student-${crypto.randomUUID()}@example.com`, password: hashed,
    } })
    userIds.push(student.id)
    const admin = await prisma.user.create({ data: {
      name: "Browser Admin", email: `browser-admin-${crypto.randomUUID()}@example.com`, password: hashed, role: "ADMIN",
    } })
    userIds.push(admin.id)
    const course = await prisma.course.create({ data: {
      title: "Browser Programming Course", description: "Browser test course", status: "PUBLISHED",
      lessons: { create: [
        { title: "Browser Manual Lesson", content: "Manual lesson content", position: 1 },
        { title: "Browser Quiz Lesson", content: "Quiz lesson content", position: 2 },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" } } } })
    courseIds.push(course.id)
    const manualLessonId = course.lessons[0]!.id
    const quizLessonId = course.lessons[1]!.id
    const quiz = await prisma.quiz.create({ data: {
      title: "Browser Knowledge Check", lessonId: quizLessonId,
      questions: { create: [1, 2, 3].map((position) => ({
        text: `Browser question ${position}`, position,
        options: { create: [
          { text: `Correct ${position}`, isCorrect: true },
          { text: `Wrong ${position}`, isCorrect: false },
        ] },
      })) },
    } })
    const draft = await prisma.course.create({ data: {
      title: "Browser Draft Course", status: "DRAFT",
      lessons: { create: [
        { title: "Draft First", content: "First content", position: 1 },
        { title: "Draft Third", content: "Third content", position: 3 },
      ] },
    }, include: { lessons: { orderBy: { position: "asc" } } } })
    courseIds.push(draft.id)
    const draftLessonId = draft.lessons[0]!.id
    await prisma.quiz.create({ data: {
      title: "Draft Quiz", lessonId: draftLessonId,
      questions: { create: [
        { text: "Draft question first", position: 1 },
        { text: "Draft question third", position: 3 },
      ] },
    } })
    return {
      student: { id: student.id, email: student.email, password },
      admin: { id: admin.id, email: admin.email, password },
      courseId: course.id, manualLessonId, quizLessonId, quizId: quiz.id,
      draftCourseId: draft.id, draftLessonId, cleanup,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
