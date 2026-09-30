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
          api<{course: Course}>(`/courses/${courseId}`),
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
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-slate-500">
          Loading course...
        </p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Course not found"}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Link
        to="/catalog"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        ← Back to catalog
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <p className="text-sm font-semibold text-indigo-600">
            Course
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {course.title}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {course.description ?? "No description available."}
          </p>

          <div className="mt-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Course curriculum
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preview the lessons included in this course.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                {curriculum?.lessons.length ?? 0} lessons
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {curriculum?.lessons.length ? (
                curriculum.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                      {lesson.position}
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">
                        Lesson {lesson.position}
                      </p>

                      <h3 className="font-semibold text-slate-900">
                        {lesson.title}
                      </h3>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  No lessons available yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-[16/9] bg-slate-100">
              {course.imageUrl ? (
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Course image
                </div>
              )}
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900">
                Start learning
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enroll in this course to unlock lessons,
                quizzes and progress tracking.
              </p>

              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enrolling ? "Enrolling..." : "Enroll now"}
              </button>

              {!isAuthenticated && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  You will be asked to sign in before enrolling.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default PublicCoursePage