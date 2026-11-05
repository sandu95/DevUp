export interface AdminLesson {
  id: number
  title: string
  content: string
  position: number
  courseId: number
  course: {
    id: number
    status: "DRAFT" | "PUBLISHED"
  }
}

export interface AdminAnswerOption {
  id: number
  text: string
  isCorrect: boolean
  questionId: number
}

export interface AdminQuestion {
  id: number
  text: string
  position: number
  options: AdminAnswerOption[]
}

export interface AdminQuiz {
  id: number
  title: string
  lessonId: number
  questions: AdminQuestion[]
}
