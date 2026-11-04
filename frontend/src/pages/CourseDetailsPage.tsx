import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"
import type { Course } from "../types/course"
import { useAuth } from "../context/useAuth"

interface Lesson {
  id: number
  title: string
  position: number
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
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [enrolled, setEnrolled] = useState(false)

  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState("")
  const [progressUnavailable, setProgressUnavailable] = useState(false)
  const [reload, setReload] = useState(0)
  const routeRequest = useRef<AbortController | null>(null)
  const enrollmentPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    routeRequest.current = controller
    enrollmentPending.current = false
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return () => controller.abort()
    }

    const loadCourse = async () => {
      try {
        setLoading(true)
        setError("")
        setCourse(null)
        setLessons([])
        setProgress(null)
        setProgressUnavailable(false)
        setEnrolled(false)
        setEnrolling(false)

        const [courseData, lessonsData, enrollmentsData] =
          await Promise.all([
            api<{ course: Course }>(`/courses/${courseId}`, { signal }),
            api<{ lessons: Lesson[] }>(
              isAdmin ? `/lessons/course/${courseId}` : `/courses/${courseId}/curriculum`, { signal }
            ),
            api<{ enrollments: Enrollment[] }>(
              "/enrollments/me", { signal }
            ),
          ])

        if (signal.aborted) return
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
            }>(`/progress/courses/${courseId}`, { signal })

            if (signal.aborted) return
            setProgress(progressData.progress)
          } catch {
            if (signal.aborted) return
            setProgress(null)
            setProgressUnavailable(true)
          }
        } else {
          setProgress(null)
        }
      } catch (error) {
        if (signal.aborted) return
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load course"
        )
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    void loadCourse()
    return () => controller.abort()
  }, [courseId, isAdmin, reload])

  const handleEnroll = async () => {
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted || enrollmentPending.current || enrolled || course?.status !== "PUBLISHED") return
    enrollmentPending.current = true
    try {
      setEnrolling(true)
      setError("")

      await api(`/enrollments/courses/${courseId}`, {
        method: "POST",
        signal,
      })

      if (signal.aborted) return
      setEnrolled(true)

      try {
        const progressData = await api<{
          progress: CourseProgress
        }>(`/progress/courses/${courseId}`, { signal })
        if (!signal.aborted) setProgress(progressData.progress)
      } catch {
        if (!signal.aborted) setProgressUnavailable(true)
      }
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enroll in course"
      )
    } finally {
      if (!signal.aborted) {
        enrollmentPending.current = false
        setEnrolling(false)
      }
    }
  }

  const completedLessonIds = useMemo(() => {
    return new Set(
      progress?.lessons
        .filter((lesson) => lesson.completed)
        .map((lesson) => lesson.id) ?? []
    )
  }, [progress])

  const isLessonCompleted = (lessonId: number) => {
    return completedLessonIds.has(lessonId)
  }

  const nextLesson = useMemo(() => {
    if (!enrolled || !progress) {
      return null
    }

    return (
      lessons.find(
        (lesson) => !completedLessonIds.has(lesson.id)
      ) ?? null
    )
  }, [lessons, completedLessonIds, enrolled, progress])

  const isCourseCompleted =
    enrolled &&
    lessons.length > 0 &&
    lessons.every((lesson) =>
      completedLessonIds.has(lesson.id)
    )

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid course</p>
  }

  if (loading || (course && course.id !== courseId)) {
    return (
      <div className="space-y-8">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            </div>
          </div>

          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (error && !course) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Course not found
      </div>
    )
  }

  const percentage = progress?.percentage ?? 0

  return (
    <div className="space-y-12">
      {/* Back */}
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to courses
      </Link>

      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Information */}
        <div className="flex min-w-0 flex-col justify-center">
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            Course
          </span>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {course.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            {course.description ??
              "Learn through structured lessons and practical exercises."}
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-y border-slate-200 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Lessons
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {lessons.length}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Format
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Self-paced
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {course.status === "DRAFT"
                  ? "Draft preview"
                  : isCourseCompleted
                  ? "Completed"
                    : enrolled && !progress
                      ? "Progress unavailable"
                    : enrolled
                    ? "In progress"
                    : "Not started"}
              </p>
            </div>
          </div>

          {/* Progress */}
          {enrolled && progressUnavailable && (
            <div role="status" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Progress could not be loaded. Your saved progress has not changed.
              <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-2 font-semibold underline">
                Retry
              </button>
            </div>
          )}
          {enrolled && progress && (
            <div className="mt-8 max-w-2xl">
              <div className="flex items-end justify-between gap-4">
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
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Course action card */}
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
              {course.status === "DRAFT" ? (
                <div role="status" className="text-sm leading-6 text-slate-600">
                  Draft preview. Publish this course before enrolling or recording learning progress.
                  <Link to={`/admin/courses/${course.id}`} className="mt-4 block font-semibold text-indigo-600">Manage course</Link>
                </div>
              ) : !enrolled ? (
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
                    className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enrolling ? "Enrolling..." : "Enroll in course"}
                  </button>
                </>
              ) : !progress ? (
                <p role="status" className="text-sm text-slate-500">
                  Your enrollment is confirmed. Load your progress to continue where you left off.
                </p>
              ) : isCourseCompleted ? (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                    ✓
                  </div>

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">
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
                      className="mt-6 flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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

                  {nextLesson ? (
                    <Link
                      to={`/lessons/${nextLesson.id}`}
                      className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                    >
                      Continue learning
                    </Link>
                  ) : (
                    <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-500">
                      All available lessons are completed.
                    </div>
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

      {/* Curriculum */}
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
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
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    {/* Status */}
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

                    {/* Lesson */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">
                        Lesson {lesson.position}
                      </p>

                      <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                        {lesson.title}
                      </h3>
                    </div>

                    {/* Action */}
                    {enrolled || isAdmin ? (
                      <Link
                        to={`/lessons/${lesson.id}`}
                        className={[
                          "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                          completed
                            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            : "bg-slate-950 text-white hover:bg-indigo-600",
                        ].join(" ")}
                      >
                        {!enrolled ? "Preview" : !progress ? "Open" : completed ? "Review" : "Start"}
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
