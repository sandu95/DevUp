import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../services/api"
import type { Course, Enrollment } from "../types/course"
import { useAuth } from "../context/AuthContext"

type Filter = "all" | "enrolled" | "available"

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionCourseId, setActionCourseId] =
    useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError("")

        const coursesData = await api("/courses")

        setCourses(coursesData.courses)

        if (isAuthenticated) {
          const enrollmentsData = await api("/enrollments/me")

          setEnrollments(enrollmentsData.enrollments)
        } else {
          setEnrollments([])
        }
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

    loadData()
  }, [isAuthenticated])

  const isEnrolled = (courseId: number) =>
    enrollments.some(
      (enrollment) => enrollment.course.id === courseId
    )

  const getEnrollment = (courseId: number) =>
    enrollments.find(
      (enrollment) => enrollment.course.id === courseId
    )

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return courses.filter((course) => {
      const matchesSearch =
        normalizedSearch === "" ||
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.description
          ?.toLowerCase()
          .includes(normalizedSearch)

      const enrolled = isEnrolled(course.id)

      const matchesFilter =
        filter === "all" ||
        (filter === "enrolled" && enrolled) ||
        (filter === "available" && !enrolled)

      return matchesSearch && matchesFilter
    })
  }, [courses, enrollments, search, filter])

  const handleEnroll = async (courseId: number) => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    try {
      setActionCourseId(courseId)
      setError("")

      const data = await api(
        `/enrollments/courses/${courseId}`,
        {
          method: "POST",
        }
      )

      setEnrollments((current) => [
        data.enrollment,
        ...current,
      ])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enroll"
      )
    } finally {
      setActionCourseId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-9 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="h-36 animate-pulse bg-slate-100" />

              <div className="space-y-4 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-10 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Heading */}
      <section>
        <p className="mb-2 text-sm font-medium text-slate-400">
          Learning
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Explore courses
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Find a course, build your skills, and continue your
          programming journey.
        </p>
      </section>

      {/* Search + filters */}
      <section className="space-y-4">

        <div className="relative max-w-xl">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />

            <path d="m20 20-4-4" />
          </svg>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search courses..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={[
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              filter === "all"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            All courses
          </button>

          <button
            type="button"
            onClick={() => setFilter("enrolled")}
            className={[
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              filter === "enrolled"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            My courses
          </button>

          <button
            type="button"
            onClick={() => setFilter("available")}
            className={[
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              filter === "available"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            Available
          </button>

          <span className="ml-auto text-xs font-medium text-slate-400">
            {filteredCourses.length}{" "}
            {filteredCourses.length === 1
              ? "course"
              : "courses"}
          </span>

        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {filteredCourses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-5 w-5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />
            </svg>
          </div>

          <h2 className="mt-4 font-semibold text-slate-900">
            No courses found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Try another search term or change the selected
            filter.
          </p>

          {(search || filter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setFilter("all")
              }}
              className="mt-5 text-sm font-semibold text-slate-900 underline underline-offset-4"
            >
              Clear filters
            </button>
          )}

        </div>
      )}

      {/* Courses */}
      {filteredCourses.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {filteredCourses.map((course) => {
            const enrolled = isEnrolled(course.id)
            const enrollment = getEnrollment(course.id)
            const actionLoading =
              actionCourseId === course.id

            const progress =
              enrollment?.progress?.percentage ?? 0

            return (
              <article
                key={course.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >

                {/* Image */}
                <Link
                  to={`/courses/${course.id}`}
                  className="block h-36 overflow-hidden bg-slate-100"
                >
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-3xl font-bold text-slate-300">
                        {course.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="p-5">

                  <div className="flex items-start justify-between gap-3">

                    <h2 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900">
                      {course.title}
                    </h2>

                    {enrolled && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Enrolled
                      </span>
                    )}

                  </div>

                  <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
                    {course.description ??
                      "No description available."}
                  </p>

                  {/* Progress */}
                  {enrolled && (
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
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex gap-2">

                    {enrolled ? (
                      <Link
                        to={`/courses/${course.id}`}
                        className="flex-1 rounded-lg bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        Continue
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleEnroll(course.id)
                        }
                        disabled={actionLoading}
                        className="flex-1 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading
                          ? "Enrolling..."
                          : "Enroll"}
                      </button>
                    )}

                    <Link
                      to={`/courses/${course.id}`}
                      className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Details
                    </Link>

                  </div>

                </div>
              </article>
            )
          })}

        </div>
      )}

    </div>
  )
}

export default CoursesPage