import { ErrorMessage } from "../ui/ErrorMessage"
import { Button, ButtonLink } from "../ui/Button"
import { Link } from "react-router-dom"
import type { Course } from "../../types/course"

type CourseActionCardProps = {
  course: Course
  enrolled: boolean
  enrolling: boolean
  progressAvailable: boolean
  completed: boolean
  firstLessonId?: number
  nextLessonId?: number
  error: string
  onEnroll: () => void
}

export function CourseActionCard({ course, enrolled, enrolling, progressAvailable, completed, firstLessonId, nextLessonId, error, onEnroll }: CourseActionCardProps) {
  return (
    <aside>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="aspect-[16/10] bg-slate-100">
          {course.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No course image
            </div>
          )}
        </div>

        <div className="p-6">
          {course.status === "DRAFT" ? (
            <div role="status" className="text-sm leading-6 text-slate-600">
              Draft preview. Publish this course before enrolling or recording learning progress.
              <Link to={`/admin/courses/${course.id}`} className="mt-4 block font-semibold text-indigo-600">Manage course</Link>
            </div>
          ) : !enrolled ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Start learning
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Begin this course
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enroll to unlock all lessons, quizzes and
                progress tracking.
              </p>

              <Button
                type="button"
                onClick={onEnroll}
                disabled={enrolling}
                className="mt-6 w-full"
              >
                {enrolling ? "Enrolling..." : "Enroll in course"}
              </Button>
            </>
          ) : !progressAvailable ? (
            <p role="status" className="text-sm text-slate-500">
              Your enrollment is confirmed. Load your progress to continue where you left off.
            </p>
          ) : completed ? (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                ✓
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Course completed
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Great work
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                You completed every lesson in this course.
              </p>

              {firstLessonId !== undefined && (
                <ButtonLink
                  to={`/lessons/${firstLessonId}`}
                  variant="secondary" className="mt-6 w-full"
                >
                  Review course
                </ButtonLink>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Continue learning
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Keep going
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Continue where you left off and keep building
                your progress.
              </p>

              {nextLessonId !== undefined ? (
                <ButtonLink
                  to={`/lessons/${nextLessonId}`}
                  className="mt-6 w-full"
                >
                  Continue learning
                </ButtonLink>
              ) : (
                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-500">
                  All available lessons are completed.
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-4"><ErrorMessage>{error}</ErrorMessage></div>
          )}
        </div>
      </div>
    </aside>
  )
}
