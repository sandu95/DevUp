export interface StudentAnswerOption {
  id: number
  text: string
  questionId: number
}

export interface StudentQuestion {
  id: number
  text: string
  position: number
  options: StudentAnswerOption[]
}

export interface StudentQuiz {
  id: number
  title: string
  lessonId: number
  lesson: {
    id: number
    courseId: number
    course: { status: "DRAFT" | "PUBLISHED" }
  }
  questions: StudentQuestion[]
}

export interface QuizResult {
  attemptId: number
  score: number
  correctAnswers: number
  totalQuestions: number
}

export interface QuizAttempt {
  id: number
  userId: number
  quizId: number
  score: number
  startedAt: string
  completedAt: string | null
  quiz: {
    id: number
    title: string
    lessonId: number
  }
}

export type QuizCompletionStatus =
  | "checking"
  | "confirmed"
  | "not-recorded"
  | "unknown"
  | null
