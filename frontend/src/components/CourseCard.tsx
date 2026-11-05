import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { Course, EnrollmentProgress } from "../types/course"
import { ProgressBar } from "./ui/ProgressBar"

type CourseCardProps = {
  course: Course
  to: string
  actions: ReactNode
  badge?: ReactNode
  progress?: EnrollmentProgress
  headingLevel?: 2 | 3
}

function CourseCard({
  course, to, actions, badge, progress, headingLevel = 2,
}: CourseCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3"

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      <Link
        to={to}
        aria-label={`View ${course.title}`}
        className="block aspect-video overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
      >
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
          />
        ) : (
          <div aria-hidden="true" className="flex h-full items-center justify-center bg-indigo-50 text-4xl font-semibold text-indigo-200">
            {course.title.charAt(0)}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        {badge && <div className="mb-3">{badge}</div>}
        <Heading className="min-h-14 text-lg font-semibold leading-7 text-slate-950">
          <Link
            to={to}
            className="line-clamp-2 rounded-sm hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {course.title}
          </Link>
        </Heading>
        <p className="mt-3 line-clamp-3 min-h-18 text-sm leading-6 text-slate-500">
          {course.description || "No description available."}
        </p>
        {progress && (
          <div className="mt-5">
            <ProgressBar value={progress.percentage} accessibleLabel={`${course.title} progress`} />
          </div>
        )}
        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
    </article>
  )
}

export default CourseCard
