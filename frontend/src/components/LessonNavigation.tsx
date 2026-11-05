import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import type { Curriculum } from "../types/course"
import { Button, ButtonLink } from "./ui/Button"

type LessonSummary = Curriculum["lessons"][number]

type LessonNavigationProps = {
  lessonId: number
  courseId: number
  draft: boolean
}

export function LessonNavigation({ lessonId, courseId, draft }: LessonNavigationProps) {
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const loadNavigation = async () => {
      setLoading(true)
      setError("")
      setLessons([])
      try {
        const endpoint = draft ? `/lessons/course/${courseId}` : `/courses/${courseId}/curriculum`
        const data = await api<{ lessons: LessonSummary[] }>(endpoint, { signal })
        if (signal.aborted) return
        if (!data.lessons.some((lesson) => lesson.id === lessonId)) {
          throw new Error("Current lesson is missing from the curriculum")
        }
        setLessons([...data.lessons].sort((left, right) => left.position - right.position))
      } catch {
        if (signal.aborted) return
        setError("Lesson navigation could not be loaded. You can still read this lesson.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void loadNavigation()
    return () => controller.abort()
  }, [lessonId, courseId, draft, attempt])

  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  const previous = lessons[index - 1]
  const next = lessons[index + 1]

  return (
    <nav aria-label="Lesson navigation" aria-busy={loading} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      {loading ? (
        <p className="text-sm text-slate-500">Loading lesson navigation...</p>
      ) : error ? (
        <div>
          <p role="alert" className="text-sm leading-6 text-slate-600">{error}</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)} className="mt-3">Retry navigation</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Lesson {index + 1} of {lessons.length}</p>
            <ButtonLink to={`/courses/${courseId}`} variant="ghost">Course outline</ButtonLink>
          </div>
          {lessons.length > 1 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {previous ? (
                <Link
                  to={`/lessons/${previous.id}`}
                  onClick={() => window.scrollTo({ top: 0 })}
                  aria-label={`Previous lesson: ${previous.title}`}
                  className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <span className="block text-xs text-slate-500">← Previous lesson</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-slate-900">{previous.title}</span>
                </Link>
              ) : <p className="px-4 py-3 text-sm text-slate-400">First lesson</p>}
              {next ? (
                <Link
                  to={`/lessons/${next.id}`}
                  onClick={() => window.scrollTo({ top: 0 })}
                  aria-label={`Next lesson: ${next.title}`}
                  className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <span className="block text-xs text-slate-500">Next lesson →</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-slate-900">{next.title}</span>
                </Link>
              ) : <p className="px-4 py-3 text-sm text-slate-400">Last lesson</p>}
            </div>
          )}
        </>
      )}
    </nav>
  )
}
