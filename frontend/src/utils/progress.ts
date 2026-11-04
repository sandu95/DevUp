import type { EnrollmentProgress } from "../types/course"

export const isCourseCompleted = (progress: EnrollmentProgress | undefined) =>
  Boolean(progress && progress.totalLessons > 0 &&
    progress.completedLessons === progress.totalLessons)
