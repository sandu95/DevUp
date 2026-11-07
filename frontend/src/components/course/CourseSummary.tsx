import type { Course } from "../../types/course"

type CourseSummaryProps = {
  course: Course
  lessonCount: number
  enrolled: boolean
  progressAvailable: boolean
  completed: boolean
}

export function CourseSummary({ course, lessonCount, enrolled, progressAvailable, completed }: CourseSummaryProps) {
  return (
    <>
      <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
        Course
      </span>

      <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        {course.title}
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
        {course.description ??
          "Learn through structured lessons and practical exercises."}
      </p>

      {/* Stats */}
      <div className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-y border-slate-200 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Lessons
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {lessonCount}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Format
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Self-paced
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Status
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {course.status === "DRAFT"
              ? "Draft preview"
              : completed
                ? "Completed"
                : enrolled && !progressAvailable
                  ? "Progress unavailable"
                  : enrolled
                    ? "In progress"
                    : "Not started"}
          </p>
        </div>
      </div>
    </>
  )
}
