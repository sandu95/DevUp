export interface Course {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  status: "DRAFT" | "PUBLISHED"
  createdAt: string
  updatedAt: string
}

export interface EnrollmentProgress {
  completedLessons: number
  totalLessons: number
  percentage: number
}

export interface Enrollment {
  id: number
  enrolledAt: string
  course: Course
  progress: EnrollmentProgress
}