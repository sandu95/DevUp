import { ErrorMessage } from "../components/ui/ErrorMessage"
import { LoadingState } from "../components/ui/LoadingState"
import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"
import { LessonContent } from "../components/LessonContent"
import { LessonNavigation } from "../components/LessonNavigation"
import { Button, ButtonLink } from "../components/ui/Button"

interface Lesson {
  id: number
  title: string
  content: string
  position: number
  courseId: number
  course: { status: "DRAFT" | "PUBLISHED" }
}

interface Quiz {
  id: number
  title: string
  lessonId: number
}

function LessonPage() {
  const { id } = useParams()
  const lessonId = Number(id)

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizStatus, setQuizStatus] = useState<
    "loading" | "ready" | "error"
  >("loading")

  const [reload, setReload] = useState(0)
  const [checkingProgress, setCheckingProgress] = useState(false)
  const progressCheckPending = useRef(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [progressUnavailable, setProgressUnavailable] = useState(false)
  const routeRequest = useRef<AbortController | null>(null)
  const completionPending = useRef(false)
  const quizCheckPending = useRef(false)
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    routeRequest.current = controller
    completionPending.current = false
    quizCheckPending.current = false
    progressCheckPending.current = false
    let active = true

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return () => controller.abort()
    }

    const loadLesson = async () => {
      setLoading(true)
      setLoadError("")
      setActionError("")
      setLesson(null)
      setQuiz(null)
      setQuizStatus("loading")
      setCompleted(false)
      setProgressUnavailable(false)
      setCompleting(false)
      setCheckingProgress(false)

      try {
        const lessonData = await api<{
          lesson: Lesson
        }>(`/lessons/${lessonId}`, { signal: controller.signal })

        if (!active) return
        setLesson(lessonData.lesson)

        // Both requests are independent: a failed quiz lookup must not
        // be interpreted as proof that the lesson has no quiz.
        const [progressResult, quizResult] = await Promise.allSettled([
          api<{
            progress: {
              lessons: { id: number; completed: boolean }[]
            }
          }>(`/progress/courses/${lessonData.lesson.courseId}`, { signal: controller.signal }),
          api<{ quiz: Quiz | null }>(`/quizzes/lesson/${lessonId}`, { signal: controller.signal }),
        ])

        if (!active) return

        if (progressResult.status === "fulfilled") {
          const current = progressResult.value.progress.lessons.find(
            (item) => item.id === lessonId
          )
          setCompleted(current?.completed ?? false)
        } else {
          setProgressUnavailable(true)
        }

        if (quizResult.status === "fulfilled") {
          setQuiz(quizResult.value.quiz ?? null)
          setQuizStatus("ready")
        } else {
          setQuiz(null)
          setQuizStatus("error")
        }
      } catch (error) {
        if (!active) return
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load lesson"
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadLesson()
    return () => {
      active = false
      controller.abort()
    }
  }, [lessonId, reload])

  useEffect(() => {
    if (!loading && lesson?.id === lessonId) {
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [lessonId, lesson?.id, loading])

  const retryQuizCheck = async () => {
    if (!lesson || lesson.id !== lessonId || quizCheckPending.current) return
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted) return
    quizCheckPending.current = true

    setQuizStatus("loading")
    try {
      const data = await api<{ quiz: Quiz | null }>(
        `/quizzes/lesson/${lesson.id}`, { signal }
      )
      if (signal.aborted) return
      setQuiz(data.quiz ?? null)
      setQuizStatus("ready")
    } catch {
      if (signal.aborted) return
      setQuiz(null)
      setQuizStatus("error")
    } finally {
      if (!signal.aborted) quizCheckPending.current = false
    }
  }

  const retryProgress = async () => {
    const signal = routeRequest.current?.signal
    if (!lesson || lesson.id !== lessonId || !signal || signal.aborted ||
      progressCheckPending.current || completionPending.current) return
    progressCheckPending.current = true
    setCheckingProgress(true)
    try {
      const data = await api<{ progress: { lessons: { id: number; completed: boolean }[] } }>(
        `/progress/courses/${lesson.courseId}`, { signal }
      )
      if (signal.aborted) return
      setCompleted(data.progress.lessons.find((item) => item.id === lessonId)?.completed ?? false)
      setProgressUnavailable(false)
    } catch {
      if (!signal.aborted) setProgressUnavailable(true)
    } finally {
      if (!signal.aborted) {
        progressCheckPending.current = false
        setCheckingProgress(false)
      }
    }
  }

  const handleComplete = async () => {
    if (!lesson || lesson.course.status !== "PUBLISHED" || lesson.id !== lessonId || quizStatus !== "ready" || quiz || completed || completionPending.current || progressCheckPending.current) {
      return
    }
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted) return
    completionPending.current = true

    try {
      setCompleting(true)
      setActionError("")

      await api(`/progress/lessons/${lessonId}/complete`, {
        method: "POST",
        signal,
      })

      if (signal.aborted) return
      setCompleted(true)
      setProgressUnavailable(false)
    } catch (error) {
      if (signal.aborted) return
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to complete lesson"
      )
    } finally {
      if (!signal.aborted) {
        completionPending.current = false
        setCompleting(false)
      }
    }
  }

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid lesson</p>
  }

  if (loading || (lesson && lesson.id !== lessonId)) {
    return (
      <LoadingState label="Loading lesson...">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-8">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-6">
                <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-11 w-3/4 animate-pulse rounded bg-slate-200" />

                <div className="space-y-3 pt-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
                </div>
              </div>

              <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
        </div>
      </LoadingState>
    )
  }

  if (loadError || !lesson) {
    return (
      <div className="mx-auto max-w-6xl">
        <ErrorMessage onRetry={() => setReload((value) => value + 1)}>{loadError || "Lesson not found"}</ErrorMessage>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Back */}
      <Link
        to={`/courses/${lesson.courseId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to course
      </Link>

      {lesson.course.status === "DRAFT" && (
        <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Draft preview. Progress is not recorded.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        {/* Main */}
        <div className="min-w-0">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Header */}
            <header className="border-b border-slate-100 px-6 py-7 sm:px-9 sm:py-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Lesson {lesson.position}
                  </p>

                  <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-bold tracking-tight text-slate-950 focus:outline-none sm:text-4xl">
                    {lesson.title}
                  </h1>
                </div>

                {completed && (
                  <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                    <span aria-hidden="true">✓</span>
                    Completed
                  </span>
                )}
              </div>
            </header>

            {/* Lesson content */}
            <div className="px-6 py-8 sm:px-9 sm:py-10">
              <div className="max-w-3xl">
                <LessonContent content={lesson.content} />
              </div>
            </div>

            {/* Only lessons confirmed to have no quiz can be completed manually. */}
            {lesson.course.status === "PUBLISHED" && quizStatus === "ready" && !quiz && (
              <div className="border-t border-slate-100 px-6 py-6 sm:px-9">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {completed
                        ? "Lesson completed"
                        : "Finished this lesson?"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {completed
                        ? "Your progress has been updated."
                        : "Mark it as completed to update your course progress."}
                    </p>
                  </div>

                  <Button
                    onClick={handleComplete}
                    disabled={completed || completing || checkingProgress}
                    aria-busy={completing}
                    variant={completed ? "secondary" : "primary"}
                    className="shrink-0"
                  >
                    {completed
                      ? "Lesson completed"
                      : completing
                        ? "Saving..."
                        : "Mark as completed"}
                  </Button>
                </div>

                {actionError && (
                  <div className="mt-4"><ErrorMessage>{actionError}</ErrorMessage></div>
                )}
              </div>
            )}
          </article>

          {quizStatus === "loading" && (
            <p className="mt-4 text-sm text-slate-500">
              Checking for a lesson quiz...
            </p>
          )}

          {quizStatus === "error" && (
            <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">
                Could not check whether this lesson has a quiz.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Manual completion is unavailable until this check succeeds.
              </p>
              <Button
                type="button"
                onClick={retryQuizCheck}
                variant="secondary" className="mt-3"
              >
                Retry
              </Button>
            </div>
          )}

          {progressUnavailable && (
            <div role="status" className="mt-4 text-sm text-amber-700">
              <p>Progress could not be loaded. The completion status may be outdated.</p>
              <Button variant="secondary" className="mt-3" disabled={checkingProgress || completing} onClick={retryProgress}>
                {checkingProgress ? "Checking progress..." : "Retry progress"}
              </Button>
            </div>
          )}

          {/* Quiz */}
          {quiz && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
              <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      Knowledge check
                    </p>

                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      {quiz.title}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Test your understanding of this lesson with a
                      short quiz.
                    </p>
                  </div>

                  <ButtonLink
                    to={`/quizzes/${quiz.id}`}
                    className="shrink-0"
                  >
                    {lesson.course.status === "DRAFT" ? "Preview quiz" : completed ? "Retake quiz" : "Start quiz"}
                    <span className="ml-2" aria-hidden="true">
                      →
                    </span>
                  </ButtonLink>
                </div>
              </div>
            </section>
          )}

          <LessonNavigation
            key={lesson.id}
            lessonId={lesson.id}
            courseId={lesson.courseId}
            draft={lesson.course.status === "DRAFT"}
          />
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current lesson
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                  completed
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-indigo-50 text-indigo-600",
                ].join(" ")}
              >
                {completed ? "✓" : lesson.position}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Lesson {lesson.position}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {progressUnavailable
                    ? "Progress unavailable"
                    : completed
                      ? "Completed"
                      : "In progress"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Status
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {progressUnavailable
                    ? "Unavailable"
                    : completed
                      ? "Completed"
                      : "Not completed"}
                </span>

                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    progressUnavailable
                      ? "bg-amber-500"
                      : completed
                        ? "bg-emerald-500"
                        : "bg-slate-300",
                  ].join(" ")}
                />
              </div>
            </div>

            {/* Quiz */}
            {quiz && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Assessment
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Quiz available
                </p>

                <Link
                  to={`/quizzes/${quiz.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  {completed ? "Retake quiz" : "Take quiz"} →
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default LessonPage
