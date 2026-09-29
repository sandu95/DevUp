import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import type { Enrollment } from "../types/course"
import { useAuth } from "../context/AuthContext"

function DashboardPage() {
  const { user } = useAuth()

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const data = await api("/enrollments/me")

        setEnrollments(data.enrollments)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load courses"
        )
      } finally {
        setLoading(false)
      }
    }

    loadEnrollments()
  }, [])

  const totalCourses = enrollments.length

  const completedCourses = enrollments.filter(
    (enrollment) =>
      enrollment.progress.percentage === 100
  ).length

  const averageProgress =
    totalCourses === 0
      ? 0
      : Math.round(
          enrollments.reduce(
            (sum, enrollment) =>
              sum + enrollment.progress.percentage,
            0
          ) / totalCourses
        )

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading dashboard...
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error}
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          Dashboard
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, {user?.name}
        </h1>

        <p className="mt-2 text-slate-500">
          Continue learning and track your progress.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Enrolled courses
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalCourses}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Completed courses
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {completedCourses}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Average progress
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {averageProgress}%
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              My courses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Continue where you left off.
            </p>
          </div>

          <Link
            to="/courses"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Browse courses
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-900">
              No courses yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Browse available courses and enroll to start learning.
            </p>

            <Link
              to="/courses"
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Explore courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.course.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[16/9] bg-slate-100">
                  {enrollment.course.imageUrl ? (
                    <img
                      src={enrollment.course.imageUrl}
                      alt={enrollment.course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Course image
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">
                    {enrollment.course.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {enrollment.course.description ??
                      "No description available."}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">
                        Progress
                      </span>

                      <span className="font-semibold text-slate-700">
                        {enrollment.progress.percentage}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{
                          width: `${enrollment.progress.percentage}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {enrollment.progress.completedLessons} of{" "}
                      {enrollment.progress.totalLessons} lessons completed
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPage