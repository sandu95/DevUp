import { useEffect, useState } from "react"
import { api } from "../services/api"
import type { Enrollment } from "../types/course"
import CourseCard from "../components/CourseCard"
import { CourseGridSkeleton } from "../components/CourseGridSkeleton"
import { ButtonLink } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { PageHeader } from "../components/ui/PageHeader"
import { ProgressBar } from "../components/ui/ProgressBar"
import { StatusBadge } from "../components/ui/StatusBadge"
import { isCourseCompleted } from "../utils/progress"

function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const loadDashboard = async () => {
      try {
        const data = await api<{ enrollments: Enrollment[] }>("/enrollments/me", { signal })
        if (signal.aborted) return
        setEnrollments(data.enrollments)
      } catch (error) {
        if (signal.aborted) return
        setError(error instanceof Error ? error.message : "Unable to load your courses.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void loadDashboard()
    return () => controller.abort()
  }, [])

  const getProgress = (enrollment: Enrollment) => enrollment.progress?.percentage ?? 0
  const completedCourses = enrollments.filter((enrollment) => isCourseCompleted(enrollment.progress)).length
  const averageProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((total, enrollment) => total + getProgress(enrollment), 0) / enrollments.length)
    : 0
  const currentCourse = enrollments.find((enrollment) => !isCourseCompleted(enrollment.progress))
  const featuredCourse = currentCourse ?? enrollments[0]
  const featuredProgress = featuredCourse ? getProgress(featuredCourse) : 0
  const featuredCompleted = isCourseCompleted(featuredCourse?.progress)

  return (
    <div aria-busy={loading} className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Keep learning."
        description="Continue your courses, track your progress, and build your programming skills one lesson at a time."
      />
      {loading ? <CourseGridSkeleton /> : error ? <ErrorMessage>{error}</ErrorMessage> : (
        <>
          {featuredCourse ? (
            <section aria-labelledby="featured-heading" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="featured-heading" className="text-lg font-semibold text-slate-900">{currentCourse ? "Continue learning" : "Recently completed"}</h2>
                <ButtonLink to="/courses" variant="ghost">Explore courses <span aria-hidden="true">→</span></ButtonLink>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0 p-6 sm:p-8">
                    <StatusBadge tone={featuredCompleted ? "accent" : "neutral"}>{featuredCompleted ? "Completed" : "In progress"}</StatusBadge>
                    <h3 className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-950">{featuredCourse.course.title}</h3>
                    {featuredCourse.course.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{featuredCourse.course.description}</p>}
                    <div className="mt-6 max-w-xl">
                      <ProgressBar value={featuredProgress} label="Course progress" accessibleLabel="Featured course progress" />
                    </div>
                    <ButtonLink to={`/courses/${featuredCourse.course.id}`} className="mt-6">
                      {featuredCompleted ? "Review course" : "Continue course"} <span aria-hidden="true">→</span>
                    </ButtonLink>
                  </div>
                  <div className="border-t border-slate-200 bg-indigo-50/50 p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <p className="text-sm font-medium text-slate-600">Your progress</p>
                    <p className="mt-3 text-5xl font-semibold tracking-tight text-indigo-700">{featuredProgress}%</p>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{featuredCompleted ? "You completed this course." : "Keep going. You're making progress."}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <EmptyState
              title="You haven't enrolled in any courses yet."
              description="Explore the DevUp catalog and start learning something new."
              action={<ButtonLink to="/courses">Explore courses</ButtonLink>}
            />
          )}
          <section aria-labelledby="overview-heading" className="space-y-4">
            <h2 id="overview-heading" className="text-lg font-semibold text-slate-900">Your overview</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Enrolled courses", value: enrollments.length },
                { label: "Completed", value: completedCourses },
                { label: "Average progress", value: `${averageProgress}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </section>
          {enrollments.length > 0 && (
            <section aria-labelledby="my-courses-heading" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="my-courses-heading" className="text-lg font-semibold text-slate-900">My courses</h2>
                  <p className="mt-1 text-sm text-slate-500">Courses you're currently learning.</p>
                </div>
                <ButtonLink to="/courses" variant="ghost">View all <span aria-hidden="true">→</span></ButtonLink>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {enrollments.map((enrollment) => {
                  const completed = isCourseCompleted(enrollment.progress)
                  return (
                    <CourseCard
                      key={enrollment.id}
                      course={enrollment.course}
                      to={`/courses/${enrollment.course.id}`}
                      headingLevel={3}
                      progress={enrollment.progress}
                      badge={<StatusBadge tone={completed ? "accent" : "neutral"}>{completed ? "Completed" : "Enrolled"}</StatusBadge>}
                      actions={<ButtonLink to={`/courses/${enrollment.course.id}`} className="w-full">{completed ? "Review" : "Continue"}</ButtonLink>}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default DashboardPage
