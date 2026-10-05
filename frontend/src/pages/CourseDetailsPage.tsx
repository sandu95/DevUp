import { useEffect, useMemo, useState } from "react"
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

  const nextLesson = useMemo(() => {
    if (!enrolled) {
      return null
    }

    return lessons.find(
      (lesson) => !isLessonCompleted(lesson.id)
    ) ?? null
  }, [lessons, progress, enrolled])

  const isCourseCompleted =
    enrolled &&
    lessons.length > 0 &&
    lessons.every((lesson) => isLessonCompleted(lesson.id))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="h-10 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (error && !course) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Course not found
      </div>
    )
  }

  const percentage = progress?.percentage ?? 0

  return (
    <div className="space-y-10">

      {/* Back */}
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <span>←</span>
        Back to courses
      </Link>

      {/* Hero */}
      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">

        {/* Course information */}
        <div className="flex flex-col justify-center">
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            Course
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {course.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            {course.description ??
              "Learn through structured lessons and practical exercises."}
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-8 border-y border-slate-200 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Lessons
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {lessons.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Format
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                Self-paced
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {isCourseCompleted
                  ? "Completed"
                  : enrolled
                    ? "In progress"
                    : "Not started"}
              </p>
            </div>
          </div>

          {/* Progress */}
          {enrolled && progress && (
            <div className="mt-8 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Your progress
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {progress.completedLessons} of{" "}
                    {progress.totalLessons} lessons completed
                  </p>
                </div>

                <span className="text-sm font-bold text-slate-950">
                  {percentage}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Course card */}
        <aside>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="aspect-[16/10] bg-slate-100">
              {course.imageUrl ? (
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No course image
                </div>
              )}
            </div>

            <div className="p-6">
              {!enrolled ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Start learning
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    Begin this course
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Enroll to unlock all lessons, quizzes and
                    progress tracking.
                  </p>

                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enrolling
                      ? "Enrolling..."
                      : "Enroll in course"}
                  </button>
                </>
              ) : isCourseCompleted ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Course completed
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    Great work
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    You completed every lesson in this course.
                  </p>

                  {lessons.length > 0 && (
                    <Link
                      to={`/lessons/${lessons[0].id}`}
                      className="mt-6 flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Review course
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Continue learning
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    Keep going
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Continue where you left off and keep building
                    your progress.
                  </p>

                  {nextLesson && (
                    <Link
                      to={`/lessons/${nextLesson.id}`}
                      className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    >
                      Continue learning
                    </Link>
                  )}
                </>
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
      </section>

      {/* Lessons */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Curriculum
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Course lessons
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {enrolled
                ? "Follow the lessons in order and track your progress."
                : "Enroll in the course to access the lessons."}
            </p>
          </div>

          <span className="shrink-0 text-sm font-medium text-slate-400">
            {lessons.length} lessons
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No lessons available yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {lessons.map((lesson) => {
                const completed = isLessonCompleted(lesson.id)

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    {/* Number / status */}
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        !enrolled
                          ? "bg-slate-100 text-slate-400"
                          : completed
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-indigo-50 text-indigo-600",
                      ].join(" ")}
                    >
                      {!enrolled
                        ? "—"
                        : completed
                          ? "✓"
                          : String(lesson.position).padStart(2, "0")}
                    </div>

                    {/* Lesson information */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">
                        Lesson {lesson.position}
                      </p>

                      <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                        {lesson.title}
                      </h3>
                    </div>

                    {/* Action */}
                    {enrolled ? (
                      <Link
                        to={`/lessons/${lesson.id}`}
                        className={[
                          "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
                          completed
                            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            : "bg-slate-950 text-white hover:bg-indigo-600",
                        ].join(" ")}
                      >
                        {completed ? "Review" : "Start"}
                      </Link>
                    ) : (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
                        Locked
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default CourseDetailsPage