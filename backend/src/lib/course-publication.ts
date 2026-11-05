import type { Prisma } from "../generated/prisma/client.js"

export const publicationInclude = {
  lessons: {
    orderBy: { position: "asc" },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { position: "asc" }, include: { options: true } },
        },
      },
    },
  },
} satisfies Prisma.CourseInclude

type PublicationCourse = Prisma.CourseGetPayload<{ include: typeof publicationInclude }>

export interface PublicationIssue {
  message: string
  target: "metadata" | "course" | "lesson" | "question"
  lessonId?: number
  questionId?: number
}

export function getPublicationIssues(course: PublicationCourse): PublicationIssue[] {
  const issues: PublicationIssue[] = []
  if (!course.title.trim()) issues.push({ message: "Course must have a title.", target: "metadata" })
  if (!course.lessons.length) issues.push({ message: "Course must contain at least one lesson.", target: "course" })
  for (const lesson of course.lessons) {
    const addLessonIssue = (message: string, target: "course" | "lesson" = "lesson") => issues.push({ message, target, lessonId: lesson.id })
    if (!lesson.title.trim() || !lesson.content.trim()) {
      addLessonIssue(`Lesson ${lesson.position} must have a title and content.`, "course")
    }
    const quiz = lesson.quiz
    if (!quiz) continue
    if (!quiz.title.trim()) addLessonIssue(`The quiz in lesson ${lesson.position} must have a title.`)
    if (!quiz.questions.length) addLessonIssue(`Quiz "${quiz.title}" must contain at least one question.`)
    for (const question of quiz.questions) {
      const label = `Question ${question.position} in quiz "${quiz.title}"`
      const addQuestionIssue = (message: string, target: "lesson" | "question" = "question") => issues.push({ message, target, lessonId: lesson.id, questionId: question.id })
      if (!question.text.trim()) addQuestionIssue(`${label} must have text.`, "lesson")
      if (!question.options.length) addQuestionIssue(`${label} must have answer options.`)
      if (question.options.some((option) => !option.text.trim())) addQuestionIssue(`${label} has a blank answer option.`)
      if (question.options.filter((option) => option.isCorrect).length !== 1) {
        addQuestionIssue(`${label} must have exactly one correct answer.`)
      }
    }
  }
  return issues
}
