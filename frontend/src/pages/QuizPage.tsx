import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"

interface AnswerOption {
  id: number
  text: string
  questionId: number
}

interface Question {
  id: number
  text: string
  position: number
  options: AnswerOption[]
}

interface Quiz {
  id: number
  title: string
  lessonId: number
  lesson: {
    id: number
    courseId: number
    course: { status: "DRAFT" | "PUBLISHED" }
  }
  questions: Question[]
}

interface QuizResult {
  attemptId: number
  score: number
  correctAnswers: number
  totalQuestions: number
}

type CompletionStatus =
  | "checking"
  | "confirmed"
  | "not-recorded"
  | "unknown"
  | null

function QuizPage() {
  const { id } = useParams()
  const quizId = Number(id)

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const routeRequest = useRef<AbortController | null>(null)
  const submissionPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    routeRequest.current = controller
    submissionPending.current = false
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
  }, [quizId])

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
      if (perfect) {
        const courseId = quiz.lesson?.courseId

        if (!Number.isInteger(courseId) || courseId <= 0) {
          setCompletionStatus("unknown")
        } else {
          try {
            const progressData = await api<{
              progress: {
                lessons: { id: number; completed: boolean }[]
              }
            }>(`/progress/courses/${courseId}`, { signal })

            if (signal.aborted) return

            const lessonProgress = progressData.progress.lessons.find(
              (lesson) => lesson.id === quiz.lessonId
            )

            setCompletionStatus(
              lessonProgress?.completed ? "confirmed" : "not-recorded"
            )
          } catch {
            if (signal.aborted) return
            setCompletionStatus("unknown")
          }
        }
      }
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

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid quiz</p>
  }

  if (loading || (quiz && quiz.id !== quizId)) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-10 w-2/3 rounded bg-slate-200" />
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error || "Quiz not found"}
      </div>
    )
  }

  if (result) {
    // Use exact correct-answer counts: a rounded score could display 100%.
    const perfect =
      result.totalQuestions > 0 &&
      result.correctAnswers === result.totalQuestions

    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to={`/lessons/${quiz.lessonId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
        >
          <span aria-hidden="true">←</span>
          Back to lesson
        </Link>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                perfect
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {perfect ? "Perfect score" : "Quiz submitted"}
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              {quiz.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {perfect
                ? "You answered every question correctly."
                : "Review your score and try again when you're ready."}
            </p>
          </div>

          <div className="px-6 py-9 sm:px-10">
            <div
              className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-8 ${
                perfect ? "border-emerald-100" : "border-indigo-100"
              }`}
            >
              <div className="text-center">
                <p className="text-4xl font-bold tracking-tight text-slate-950">
                  {result.score}%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Your score
                </p>
              </div>
            </div>

            <div className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-950">
                  {result.correctAnswers}
                </p>
                <p className="mt-1 text-xs text-slate-500">Correct answers</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-950">
                  {result.totalQuestions}
                </p>
                <p className="mt-1 text-xs text-slate-500">Total questions</p>
              </div>
            </div>

            <div
              role="status"
              className={`mx-auto mt-6 max-w-lg rounded-xl px-4 py-3 text-center text-sm leading-6 ${
                perfect
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {!perfect
                ? "A perfect score completes this lesson. Any earlier completion is kept. You can try again."
                : completionStatus === "checking"
                  ? "Perfect score! Checking your lesson progress..."
                  : completionStatus === "confirmed"
                    ? "Perfect score! Your lesson has been marked as completed."
                    : completionStatus === "not-recorded"
                      ? "Perfect score, but the lesson hasn't been marked as completed yet."
                      : "Perfect score! We couldn't verify the lesson completion status."}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {!perfect && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                >
                  Try again
                </button>
              )}
              <Link
                to={`/lessons/${quiz.lessonId}`}
                className={`rounded-xl px-6 py-3 text-center text-sm font-semibold transition-colors ${
                  perfect
                    ? "bg-slate-950 text-white hover:bg-indigo-600"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Back to lesson
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-4">
      <Link
        to={`/lessons/${quiz.lessonId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to lesson
      </Link>

      {quiz.lesson.course.status === "DRAFT" && (
        <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Draft preview. Publish the course and enroll before submitting answers.
        </p>
      )}
      <header className="mt-8">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          Knowledge check
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {quiz.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Choose one answer for each question. A perfect score completes the
          lesson once recorded by the platform.
        </p>
      </header>

      {questions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No questions available yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            This quiz cannot be submitted until questions are added.
          </p>
          <Link
            to={`/lessons/${quiz.lessonId}`}
            className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Back to lesson →
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Your progress
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {answeredCount} of {questions.length} questions answered
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-slate-950">
                {answeredPercentage}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Questions answered"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={answeredCount}
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${answeredPercentage}%` }}
              />
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 space-y-5">
            {questions.map((question, index) => {
              const selectedOptionId = answers[question.id]
              const isAnswered = question.options.some(
                (option) => option.id === selectedOptionId
              )

              return (
                <fieldset
                  key={question.id}
                  disabled={submitting}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
                >
                  <legend className="sr-only">{question.text}</legend>
                  <div className="flex items-start gap-4">
                    <div
                      aria-hidden="true"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        isAnswered
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className="text-base font-semibold leading-7 text-slate-950">
                          {question.text}
                        </h2>
                        {isAnswered && (
                          <span className="text-xs font-semibold text-indigo-600">
                            Answered
                          </span>
                        )}
                      </div>

                      <div className="mt-5 space-y-3">
                        {question.options.map((option, optionIndex) => {
                          const selected = selectedOptionId === option.id

                          return (
                            <label
                              key={option.id}
                              className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                                selected
                                  ? "border-indigo-500 bg-indigo-50"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option.id}
                                checked={selected}
                                onChange={() =>
                                  selectAnswer(question.id, option.id)
                                }
                                className="peer sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 ${
                                  selected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span
                                className={`text-sm leading-6 ${
                                  selected
                                    ? "font-semibold text-slate-950"
                                    : "text-slate-700"
                                }`}
                              >
                                {option.text}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </fieldset>
              )
            })}
          </div>

          <div className="sticky bottom-4 z-10 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {allAnswered
                    ? "All questions answered"
                    : `${questions.length - answeredCount} questions remaining`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {allAnswered
                    ? "Ready to submit your answers."
                    : "Answer every question to enable submission."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={quiz.lesson.course.status !== "PUBLISHED" || submitting || !allAnswered}
                className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              >
                {submitting ? "Submitting..." : "Submit quiz"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default QuizPage
