import { ButtonLink } from "../ui/Button"
import type { CurriculumLesson } from "../../types/course"

type CourseCurriculumProps = {
  lessons: CurriculumLesson[]
  enrolled: boolean
  isAdmin: boolean
  progressAvailable: boolean
  completedLessonIds: ReadonlySet<number>
}

export function CourseCurriculum({ lessons, enrolled, isAdmin, progressAvailable, completedLessonIds }: CourseCurriculumProps) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Curriculum
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Course lessons
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {enrolled
              ? "Follow the lessons in order and track your progress."
              : "Enroll in the course to access the lessons."}
          </p>
        </div>

        <span className="shrink-0 text-sm font-medium text-slate-400">
          {lessons.length} lessons
        </span>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            No lessons available yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson) => {
              const completed = completedLessonIds.has(lesson.id)

              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  {/* Status */}
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      !enrolled
                        ? "bg-slate-100 text-slate-400"
                        : completed
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600",
                    ].join(" ")}
                  >
                    {!enrolled
                      ? "—"
                      : completed
                        ? "✓"
                        : String(lesson.position).padStart(2, "0")}
                  </div>

                  {/* Lesson */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-400">
                      Lesson {lesson.position}
                    </p>

                    <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {lesson.title}
                    </h3>
                  </div>

                  {/* Action */}
                  {enrolled || isAdmin ? (
                    <ButtonLink
                      to={`/lessons/${lesson.id}`}
                      variant={completed ? "secondary" : "primary"}
                      className="shrink-0"
                    >
                      {!enrolled ? "Preview" : !progressAvailable ? "Open" : completed ? "Review" : "Start"}
                    </ButtonLink>
                  ) : (
                    <span className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
