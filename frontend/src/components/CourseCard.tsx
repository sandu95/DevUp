import { Link } from "react-router-dom"
import type { Enrollment } from "../types/course"

type CourseCardProps = {
  enrollment: Enrollment
}

function CourseCard({ enrollment }: CourseCardProps) {
  const progress = enrollment.progress?.percentage ?? 0

  return (
    <Link
      to={`/courses/${enrollment.course.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      {/* Image */}
      <div className="h-36 overflow-hidden bg-slate-100">
        {enrollment.course.imageUrl ? (
          <img
            src={enrollment.course.imageUrl}
            alt={enrollment.course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl font-bold text-slate-300">
              {enrollment.course.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-slate-600">
            {enrollment.course.title}
          </h3>

          {progress === 100 && (
            <span className="shrink-0 text-xs font-semibold text-slate-400">
              Done
            </span>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Progress
            </span>

            <span className="font-semibold text-slate-700">
              {progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CourseCard