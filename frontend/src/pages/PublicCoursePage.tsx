import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import { useAuth } from "../context/AuthContext"
import type { Course, Curriculum } from "../types/course"

function PublicCoursePage() {
  const { id } = useParams()
  const courseId = Number(id)

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        setError("")

        const [courseData, curriculumData] = await Promise.all([
          api<{ course: Course }>(`/courses/${courseId}`),
          api<Curriculum>(`/courses/${courseId}/curriculum`),
        ])

        setCourse(courseData.course)
        setCurriculum(curriculumData)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load course"
        )
      } finally {
        setLoading(false)
      }
    }

    if (!Number.isInteger(courseId) || courseId <= 0) {
      setError("Invalid course")
      setLoading(false)
      return
    }

    loadData()
  }, [courseId])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    try {
      setEnrolling(true)
      setError("")

      await api(`/enrollments/courses/${courseId}`, {
        method: "POST",
      })

      navigate(`/courses/${courseId}`)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enroll"
      )
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#f7f7f5]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-12 w-3/4 rounded bg-slate-200" />
              <div className="h-20 max-w-2xl rounded bg-slate-100" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="aspect-[16/10] animate-pulse bg-slate-100" />
              <div className="space-y-4 p-6">
                <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-10 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#f7f7f5]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-xl rounded-2xl border border-red-200 bg-white p-6">
            <p className="text-sm font-medium text-red-600">
              {error || "Course not found"}
            </p>

            <Link
              to="/catalog"
              className="mt-4 inline-flex text-sm font-semibold text-slate-950 underline underline-offset-4 hover:text-indigo-600"
            >
              ← Back to catalog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const lessonCount = curriculum?.lessons.length ?? 0

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7f7f5]">
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">

        {/* Back */}
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          <span>←</span>
          Back to courses
        </Link>

        {/* Hero */}
        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_400px] lg:items-start">

          {/* Main content */}
          <section>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                DevUp course
              </p>

              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {course.title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {course.description ??
                  "Learn the fundamentals through structured lessons and practical exercises."}
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-slate-200 py-6">
              <div>
                <p className="text-2xl font-bold text-slate-950">
                  {lessonCount}
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Lessons
                </p>
              </div>

              <div className="border-l border-slate-200 pl-5">
                <p className="text-2xl font-bold text-slate-950">
                  Free
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Access
                </p>
              </div>

              <div className="border-l border-slate-200 pl-5">
                <p className="text-2xl font-bold text-slate-950">
                  Self-paced
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Format
                </p>
              </div>
            </div>

            {/* Curriculum */}
            <section className="mt-14">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                    Curriculum
                  </p>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                    What you'll learn
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Preview the lessons included in this course.
                  </p>
                </div>

                <span className="hidden shrink-0 text-sm font-medium text-slate-400 sm:block">
                  {lessonCount}{" "}
                  {lessonCount === 1 ? "lesson" : "lessons"}
                </span>
              </div>

              <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {curriculum?.lessons.length ? (
                  <div className="divide-y divide-slate-100">
                    {curriculum.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-4 px-5 py-5 transition hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                          {lesson.position}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Lesson {lesson.position}
                          </p>

                          <h3 className="mt-1 truncate text-sm font-semibold text-slate-950">
                            {lesson.title}
                          </h3>
                        </div>

                        <span className="hidden text-xs font-medium text-slate-400 sm:block">
                          Preview
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">
                      No lessons available yet.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </section>

          {/* Enrollment card */}
          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Image */}
              <div className="aspect-[16/10] bg-slate-100">
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-5xl font-bold text-slate-300">
                      {course.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-950">
                    Free course
                  </span>

                  <span className="text-xs font-medium text-slate-400">
                    {lessonCount} lessons
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Enroll to unlock the complete course,
                  quizzes and progress tracking.
                </p>

                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enrolling ? "Enrolling..." : "Enroll in course"}
                </button>

                {!isAuthenticated && (
                  <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                    Sign in is required before enrolling.
                  </p>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs leading-5 text-red-600">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default PublicCoursePage