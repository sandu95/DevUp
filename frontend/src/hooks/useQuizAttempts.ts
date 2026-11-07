import { useEffect, useState } from "react"
import { api } from "../services/api"
import type { QuizAttempt } from "../types/quiz"

export function useQuizAttempts(quizId?: number) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const load = async () => {
      setLoading(true)
      setError("")
      setAttempts([])
      try {
        const filter = quizId === undefined ? "" : `?quizId=${quizId}`
        const data = await api<{ attempts: QuizAttempt[] }>(`/quizzes/attempts/me${filter}`, { signal })
        if (!signal.aborted) setAttempts(data.attempts)
      } catch (error) {
        if (!signal.aborted) setError(error instanceof Error ? error.message : "Unable to load your quiz history.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [quizId, reload])

  return { attempts, loading, error, refresh: () => setReload((value) => value + 1) }
}
