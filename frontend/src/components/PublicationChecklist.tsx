import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import { Button } from "./ui/Button"

interface PublicationCheck {
  courseId: number
  status: "DRAFT" | "PUBLISHED"
  ready: boolean
  issues: { message: string; target: "metadata" | "course" | "lesson" | "question"; lessonId?: number; questionId?: number }[]
}

export function PublicationChecklist({ courseId }: { courseId: number }) {
  const [check, setCheck] = useState<PublicationCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const loadCheck = async () => {
      setLoading(true)
      setError("")
      setCheck(null)
      try {
        const data = await api<{ check: PublicationCheck }>(`/courses/${courseId}/publication-check`, { signal })
        if (!signal.aborted) setCheck(data.check)
      } catch (error) {
        if (!signal.aborted) setError(error instanceof Error ? error.message : "Publication checks could not be loaded.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void loadCheck()
    return () => controller.abort()
  }, [courseId, attempt])

  return (
    <section aria-label="Publication checklist" aria-busy={loading} className="mt-5 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-900">Publication checklist</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">Checks use saved content. Final validation runs again when you publish. Published content cannot be edited.</p>
      {loading ? <p className="mt-3 text-sm text-slate-500">Checking saved content...</p> : error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
      ) : check && (
        check.status === "PUBLISHED" ? <p className="mt-3 text-sm text-slate-600">This course is already published.</p> :
        check.ready ? <p className="mt-3 text-sm font-medium text-indigo-700">Saved content is ready to publish.</p> : (
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {check.issues.map((issue, index) => (
              <li key={index}>
                <p>{issue.message}</p>
                <Link
                  to={issue.target === "metadata" ? "/admin" : issue.target === "question" ? `/admin/questions/${issue.questionId}` : issue.target === "lesson" ? `/admin/lessons/${issue.lessonId}` : `/admin/courses/${courseId}`}
                  className="font-medium text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {issue.target === "metadata" ? "Edit course" : issue.target === "question" ? "Review answers" : issue.target === "lesson" ? "Review lesson" : "Manage lessons"}
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
      <Button variant="secondary" disabled={loading} onClick={() => setAttempt((value) => value + 1)} className="mt-4">
        {error ? "Retry checks" : "Refresh checks"}
      </Button>
    </section>
  )
}
