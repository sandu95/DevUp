import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"

interface Lesson {
  id: number
  title: string
  content: string
  position: number
  courseId: number
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      setError("Invalid lesson")
      setLoading(false)
      return
    }

    const loadLesson = async () => {
      try {
        setError("")

        const lessonData = await api<{
          lesson: Lesson
        }>(`/lessons/${lessonId}`)

        setLesson(lessonData.lesson)

        try {
          const progressData = await api<{
            progress: {
              lessons: {
                id: number
                completed: boolean
              }[]
            }
          }>(`/progress/courses/${lessonData.lesson.courseId}`)

          const lessonProgress =
            progressData.progress.lessons.find(
              (item) => item.id === lessonId
            )

          setCompleted(lessonProgress?.completed ?? false)
        } catch {
          setCompleted(false)
        }

        try {
          const quizData = await api<{
            quiz: Quiz
          }>(`/quizzes/lesson/${lessonId}`)

          setQuiz(quizData.quiz)
        } catch {
          setQuiz(null)
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load lesson"
        )
      } finally {
        setLoading(false)
      }
    }

    loadLesson()
  }, [lessonId])

  const handleComplete = async () => {
    try {
      setCompleting(true)
      setError("")

      await api(`/progress/lessons/${lessonId}/complete`, {
        method: "POST",
      })

      setCompleted(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete lesson"
      )
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-28 rounded bg-slate-200" />

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <div className="h-10 w-2/3 rounded bg-slate-200" />
              <div className="h-5 w-full rounded bg-slate-200" />
              <div className="h-5 w-5/6 rounded bg-slate-200" />
              <div className="h-5 w-4/5 rounded bg-slate-200" />
            </div>

            <div className="h-48 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Lesson not found"}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">

      {/* Back */}
      <Link
        to={`/courses/${lesson.courseId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <span>←</span>
        Back to course
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">

        {/* Main content */}
        <main>
          <div className="rounded-2xl border border-slate-200 bg-white">

            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-7 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Lesson {lesson.position}
                  </p>

                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {lesson.title}
                  </h1>
                </div>

                {completed && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                    ✓ Completed
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <article className="px-6 py-8 sm:px-8 sm:py-10">
              <div className="max-w-3xl">
                {lesson.content.split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className={[
                      "text-base leading-8 text-slate-700",
                      index > 0 ? "mt-5" : "",
                    ].join(" ")}
                  >
                    {paragraph || "\u00A0"}
                  </p>
                ))}
              </div>
            </article>

            {/* Completion */}
            {!quiz && (
              <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Finished this lesson?
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Mark it as completed to update your progress.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completed || completing}
                    className={[
                      "shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition",
                      completed
                        ? "cursor-default bg-emerald-50 text-emerald-600"
                        : "bg-slate-950 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50",
                    ].join(" ")}
                  >
                    {completed
                      ? "Lesson completed"
                      : completing
                        ? "Saving..."
                        : "Mark as completed"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quiz */}
          {quiz && (
            <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Next step
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    {quiz.title}
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Test your understanding of this lesson with a short quiz.
                  </p>
                </div>

                <Link
                  to={`/quizzes/${quiz.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  Start quiz
                  <span className="ml-2">→</span>
                </Link>
              </div>
            </section>
          )}
        </main>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Lesson
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div
                className={[
                  "flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold",
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
                  {completed ? "Completed" : "In progress"}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {completed ? "Completed" : "Not completed"}
                </span>

                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    completed
                      ? "bg-emerald-500"
                      : "bg-slate-300",
                  ].join(" ")}
                />
              </div>
            </div>

            {quiz && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Assessment
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Quiz available
                </p>

                <Link
                  to={`/quizzes/${quiz.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Take quiz →
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