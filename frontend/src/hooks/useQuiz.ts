import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../services/api"
import type { StudentQuiz as Quiz, QuizResult, QuizCompletionStatus as CompletionStatus } from "../types/quiz"

export function useQuiz(quizId: number) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>(null)

  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const routeRequest = useRef<AbortController | null>(null)
  const completionCheckPending = useRef(false)
  const submissionPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    routeRequest.current = controller
    submissionPending.current = false
    completionCheckPending.current = false
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return () => controller.abort()
    }

    let cancelled = false

    const loadQuiz = async () => {
      setLoading(true)
      setError("")
      setQuiz(null)
      setAnswers({})
      setResult(null)
      setCompletionStatus(null)
      setSubmitting(false)

      try {
        const data = await api<{ quiz: Quiz }>(`/quizzes/${quizId}`, { signal: controller.signal })
        if (!cancelled) setQuiz(data.quiz)
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load quiz"
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadQuiz()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [quizId, reload])

  const questions = useMemo(
    () =>
      [...(quiz?.questions ?? [])].sort(
        (a, b) => a.position - b.position || a.id - b.id
      ),
    [quiz]
  )

  const answeredCount = questions.filter((question) =>
    question.options.some((option) => option.id === answers[question.id])
  ).length

  const allAnswered =
    questions.length > 0 && answeredCount === questions.length

  const answeredPercentage = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0

  const selectAnswer = (questionId: number, optionId: number) => {
    if (submitting) return
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
    setError("")
  }

  const checkCompletion = async (currentQuiz: Quiz, signal: AbortSignal) => {
    if (signal.aborted || completionCheckPending.current) return
    completionCheckPending.current = true
    setCompletionStatus("checking")
    try {
      const courseId = currentQuiz.lesson.courseId
      if (!Number.isInteger(courseId) || courseId <= 0) {
        setCompletionStatus("unknown")
        return
      }
      const data = await api<{
        progress: { lessons: { id: number; completed: boolean }[] }
      }>(`/progress/courses/${courseId}`, { signal })
      if (signal.aborted) return
      const progress = data.progress.lessons.find((lesson) => lesson.id === currentQuiz.lessonId)
      setCompletionStatus(progress?.completed ? "confirmed" : "not-recorded")
    } catch {
      if (!signal.aborted) setCompletionStatus("unknown")
    } finally {
      if (!signal.aborted) completionCheckPending.current = false
    }
  }

  const retryCompletion = async () => {
    const signal = routeRequest.current?.signal
    if (!quiz || quiz.id !== quizId || !signal || signal.aborted || submissionPending.current ||
      !result || result.totalQuestions <= 0 || result.correctAnswers !== result.totalQuestions) return
    await checkCompletion(quiz, signal)
  }

  const handleSubmit = async () => {
    if (!quiz || quiz.lesson.course.status !== "PUBLISHED" || quiz.id !== quizId || submissionPending.current) return
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted) return

    if (!allAnswered) {
      setError("Please answer all questions before submitting.")
      return
    }

    submissionPending.current = true
    setSubmitting(true)
    setError("")

    try {
      const submittedAnswers = questions.map((question) => ({
        questionId: question.id,
        answerOptionId: answers[question.id],
      }))

      const data = await api<{ result: QuizResult }>(
        `/quizzes/${quiz.id}/submit`,
        {
          method: "POST",
          signal,
          body: JSON.stringify({ answers: submittedAnswers }),
        }
      )

      if (signal.aborted) return
      const submittedResult = data.result
      const perfect =
        submittedResult.totalQuestions > 0 &&
        submittedResult.correctAnswers === submittedResult.totalQuestions

      setResult(submittedResult)
      setCompletionStatus(perfect ? "checking" : null)

      window.scrollTo({ top: 0, behavior: "smooth" })

      // A perfect score must be recorded by the backend, not by
      // calling the manual-completion endpoint from this page.
      if (perfect) await checkCompletion(quiz, signal)
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit quiz"
      )
    } finally {
      if (!signal.aborted) {
        submissionPending.current = false
        setSubmitting(false)
      }
    }
  }

  const handleTryAgain = () => {
    if (submissionPending.current) return
    setResult(null)
    setAnswers({})
    setError("")
    setCompletionStatus(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return {
    retryLoad: () => setReload((value) => value + 1), retryCompletion,
    quiz, answers, result, completionStatus, loading, submitting, error,
    questions, answeredCount, allAnswered, answeredPercentage, selectAnswer,
    submit: handleSubmit,
    tryAgain: handleTryAgain,
  }
}
