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

export interface Curriculum {
  courseId: number
  title: string
  lessons: CurriculumLesson[]
}

export interface CurriculumLesson {
  id: number
  title: string
  position: number
}

export interface CourseLessonProgress extends CurriculumLesson {
  completed: boolean
  completedAt: string | null
}

export interface CourseProgress extends EnrollmentProgress {
  courseId: number
  lessons: CourseLessonProgress[]
}
