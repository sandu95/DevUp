import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"
import type { Course } from "../types/course"

interface Lesson {
  id: number
  title: string
  content: string
  position: number
  courseId: number
}

interface Enrollment {
  id: number
  enrolledAt: string
  course: Course
  progress: {
    completedLessons: number
    totalLessons: number
    percentage: number
  }
}

interface LessonProgress {
  id: number
  title: string
  position: number
  completed: boolean
  completedAt: string | null
}

interface CourseProgress {
  courseId: number
  completedLessons: number
  totalLessons: number
  percentage: number
  lessons: LessonProgress[]
}

function CourseDetailsPage() {
  const { id } = useParams()

  const courseId = Number(id)

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [enrolled, setEnrolled] = useState(false)

  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!Number.isInteger(courseId) || courseId <= 0) {
      setError("Invalid course")
      setLoading(false)
      return
    }

    const loadCourse = async () => {
      try {
        setLoading(true)
        setError("")

        const [courseData, lessonsData, enrollmentsData] =
          await Promise.all([
            api<{ course: Course }>(`/courses/${courseId}`),
            api<{ lessons: Lesson[] }>(
              `/lessons/course/${courseId}`
            ),
            api<{ enrollments: Enrollment[] }>(
              "/enrollments/me"
            ),
          ])

        setCourse(courseData.course)
        setLessons(lessonsData.lessons)

        const isEnrolled = enrollmentsData.enrollments.some(
          (enrollment) => enrollment.course.id === courseId
        )

        setEnrolled(isEnrolled)

        if (isEnrolled) {
          try {
            const progressData = await api<{
              progress: CourseProgress
            }>(`/progress/courses/${courseId}`)

            setProgress(progressData.progress)
          } catch {
            setProgress(null)
          }
        } else {
          setProgress(null)
        }
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

    loadCourse()
  }, [courseId])

  const handleEnroll = async () => {
    try {
      setEnrolling(true)
      setError("")

      await api(`/enrollments/courses/${courseId}`, {
        method: "POST",
      })

      setEnrolled(true)

      const progressData = await api<{
        progress: CourseProgress
      }>(`/progress/courses/${courseId}`)

      setProgress(progressData.progress)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enroll in course"
      )
    } finally {
      setEnrolling(false)
    }
  }

  const isLessonCompleted = (lessonId: number) => {
    return (
      progress?.lessons.find(
        (lesson) => lesson.id === lessonId
      )?.completed ?? false
    )
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading course...
      </p>
    )
  }

  if (error && !course) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!course) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Course not found
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="grid lg:grid-cols-[1.4fr_1fr]">
          <div className="p-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Course
              </span>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  course.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {course.status}
              </span>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  enrolled
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {enrolled ? "Enrolled" : "Not enrolled"}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {course.title}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-500">
              {course.description ?? "No description available."}
            </p>

            {!enrolled && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enrolling
                    ? "Enrolling..."
                    : "Enroll in course"}
                </button>
              </div>
            )}

            {enrolled && progress && (
              <div className="mt-8 max-w-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    Course progress
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {progress.percentage}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{
                      width: `${progress.percentage}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {progress.completedLessons} of{" "}
                  {progress.totalLessons} lessons completed
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="min-h-64 bg-slate-100">
            {course.imageUrl ? (
              <img
                src={course.imageUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-400">
                Course image
              </div>
            )}
          </div>
        </div>
      </div>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            Course lessons
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {enrolled
              ? "Follow the lessons in order and track your progress."
              : "Enroll in the course to access the lessons."}
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No lessons available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const completed = isLessonCompleted(lesson.id)

              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                      !enrolled
                        ? "bg-slate-100 text-slate-400"
                        : completed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {!enrolled
                      ? "🔒"
                      : completed
                        ? "✓"
                        : lesson.position}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {lesson.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Lesson {lesson.position}
                    </p>
                  </div>

                  {enrolled ? (
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {completed ? "Review" : "Start"}
                    </Link>
                  ) : (
                    <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default CourseDetailsPage