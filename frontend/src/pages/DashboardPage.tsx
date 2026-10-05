import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import type { Enrollment } from "../types/course"
import CourseCard from "../components/CourseCard"

function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await api("/enrollments/me")

        setEnrollments(data.enrollments)
      } catch (err) {
        console.error(err)

        setError("Unable to load your courses.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const getProgress = (enrollment: Enrollment) =>
    enrollment.progress?.percentage ?? 0

  const completedCourses = enrollments.filter(
    (enrollment) => getProgress(enrollment) === 100
  ).length

  const averageProgress =
    enrollments.length > 0
      ? Math.round(
        enrollments.reduce(
          (total, enrollment) =>
            total + getProgress(enrollment),
          0
        ) / enrollments.length
      )
      : 0

  const currentCourse = enrollments.find(
    (enrollment) => getProgress(enrollment) < 100
  )

  const featuredCourse =
    currentCourse ?? enrollments[0]

  const featuredProgress = featuredCourse
    ? getProgress(featuredCourse)
    : 0

  return (
    <div className="space-y-10">

      {/* Page heading */}
      <section>
        <p className="mb-2 text-sm font-medium text-slate-400">
          Dashboard
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Keep learning.
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
          Continue your courses, track your progress, and
          build your programming skills one lesson at a time.
        </p>
      </section>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Featured course */}
          {featuredCourse && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {currentCourse
                    ? "Continue learning"
                    : "Recently completed"}
                </h2>

                <Link
                  to="/courses"
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
                >
                  Explore courses →
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                <div className="grid lg:grid-cols-[1fr_320px]">

                  {/* Main content */}
                  <div className="p-7 sm:p-9">

                    <div className="mb-6">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${featuredProgress === 100
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {featuredProgress === 100
                          ? "Completed"
                          : "In progress"}
                      </span>
                    </div>

                    <h3 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-950">
                      {featuredCourse.course.title}
                    </h3>

                    {featuredCourse.course.description && (
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        {featuredCourse.course.description}
                      </p>
                    )}

                    <div className="mt-8 max-w-xl">

                      <div className="mb-2 flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">
                          Course progress
                        </span>

                        <span className="text-slate-900">
                          {featuredProgress}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all"
                          style={{
                            width: `${featuredProgress}%`,
                          }}
                        />
                      </div>

                    </div>

                    <div className="mt-8">
                      <Link
                        to={`/courses/${featuredCourse.course.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        {featuredProgress === 100
                          ? "Review course"
                          : "Continue course"}

                        <span className="ml-2">
                          →
                        </span>
                      </Link>
                    </div>

                  </div>

                  {/* Progress panel */}
                  <div className="hidden border-l border-slate-200 bg-slate-50 p-8 lg:block">

                    <div className="flex h-full flex-col justify-between">

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Your progress
                        </p>

                        <p className="mt-3 text-5xl font-bold tracking-tight text-slate-950">
                          {featuredProgress}%
                        </p>

                        <p className="mt-2 text-sm leading-5 text-slate-500">
                          {featuredProgress === 100
                            ? "Course completed."
                            : "Keep going. You're making progress."}
                        </p>
                      </div>

                      <div className="mt-10">
                        <div className="h-1.5 rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-slate-950"
                            style={{
                              width: `${featuredProgress}%`,
                            }}
                          />
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            </section>
          )}

          {/* Empty state */}
          {enrollments.length === 0 && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <h2 className="text-lg font-semibold text-slate-900">
                You haven't enrolled in any courses yet.
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Explore the DevUp catalog and start learning
                something new.
              </p>

              <Link
                to="/courses"
                className="mt-6 inline-flex rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Explore courses
              </Link>

            </section>
          )}

          {/* Overview */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Your overview
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Enrolled courses
                </p>

                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  {enrollments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Completed
                </p>

                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  {completedCourses}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Average progress
                </p>

                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  {averageProgress}%
                </p>
              </div>

            </div>
          </section>

          {/* My courses */}
          {enrollments.length > 0 && (
            <section>

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    My courses
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Courses you're currently learning.
                  </p>
                </div>

                <Link
                  to="/courses"
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
                >
                  View all →
                </Link>

              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {enrollments.map((enrollment) => (
                  <CourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>

            </section>
          )}

        </>
      )}

    </div>
  )
}

export default DashboardPage