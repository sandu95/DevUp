import { useEffect, useMemo, useState } from "react"
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
  }
  questions: Question[]
}

interface QuizResult {
  attemptId: number
  score: number
  correctAnswers: number
  totalQuestions: number
}

function QuizPage() {
  const { id } = useParams()
  const quizId = Number(id)

  const [quiz, setQuiz] = useState<Quiz | null>(null)

  const [answers, setAnswers] = useState<Record<number, number>>({})

  const [result, setResult] = useState<QuizResult | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setError("Invalid quiz")
      setLoading(false)
      return
    }

    const loadQuiz = async () => {
      try {
        setError("")

        const data = await api<{
          quiz: Quiz
        }>(`/quizzes/${quizId}`)

        setQuiz(data.quiz)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load quiz"
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [quizId])

  const selectAnswer = (
    questionId: number,
    answerOptionId: number
  ) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: answerOptionId,
    }))

    setError("")
  }

  const answeredCount = Object.keys(answers).length

  const allAnswered = useMemo(() => {
    if (!quiz) {
      return false
    }

    return answeredCount === quiz.questions.length
  }, [answeredCount, quiz])

  const handleSubmit = async () => {
    if (!quiz) {
      return
    }

    if (!allAnswered) {
      setError("Please answer all questions before submitting.")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      const submittedAnswers = quiz.questions.map(
        (question) => ({
          questionId: question.id,
          answerOptionId: answers[question.id],
        })
      )

      const data = await api<{
        result: QuizResult
      }>(`/quizzes/${quiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: submittedAnswers,
        }),
      })

      setResult(data.result)

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit quiz"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setResult(null)
    setAnswers({})
    setError("")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="h-10 w-2/3 rounded bg-slate-200" />
          <div className="h-5 w-1/2 rounded bg-slate-200" />

          <div className="space-y-4 pt-5">
            <div className="h-52 rounded-2xl bg-slate-200" />
            <div className="h-52 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !quiz) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!quiz) {
    return null
  }

  /*
   * Result screen
   */
  if (result) {
    const perfect = result.score === 100

    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to={`/lessons/${quiz.lessonId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          <span>←</span>
          Back to lesson
        </Link>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                perfect
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600",
              ].join(" ")}
            >
              {perfect ? "Quiz passed" : "Quiz completed"}
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              {quiz.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Here is your quiz result.
            </p>
          </div>

          <div className="px-6 py-10 sm:px-10">

            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-8 border-indigo-50">
              <div className="text-center">
                <p className="text-4xl font-bold tracking-tight text-slate-950">
                  {result.score}%
                </p>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Score
                </p>
              </div>
            </div>

            <div className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-950">
                  {result.correctAnswers}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Correct answers
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-950">
                  {result.totalQuestions}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Total questions
                </p>
              </div>
            </div>

            <div
              className={[
                "mx-auto mt-6 max-w-lg rounded-xl px-4 py-3 text-center text-sm",
                perfect
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              ].join(" ")}
            >
              {perfect
                ? "Perfect score! This lesson has been completed."
                : "You need 100% to complete this lesson. Try again to improve your score."}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {!perfect && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Try again
                </button>
              )}

              <Link
                to={`/lessons/${quiz.lessonId}`}
                className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                Back to lesson
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /*
   * Quiz screen
   */
  return (
    <div className="mx-auto max-w-4xl">

      {/* Header */}
      <div>
        <Link
          to={`/lessons/${quiz.lessonId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          <span>←</span>
          Back to lesson
        </Link>

        <div className="mt-8">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            Quiz
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {quiz.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Answer all questions and submit your answers when
            you are ready.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Your progress
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {answeredCount} of {quiz.questions.length} answered
            </p>
          </div>

          <span className="text-sm font-bold text-slate-950">
            {quiz.questions.length > 0
              ? Math.round(
                  (answeredCount / quiz.questions.length) * 100
                )
              : 0}
            %
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{
              width: `${
                quiz.questions.length > 0
                  ? (answeredCount / quiz.questions.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Questions */}
      <div className="mt-6 space-y-5">
        {quiz.questions.map((question, index) => {
          const selectedAnswer = answers[question.id]

          return (
            <section
              key={question.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
            >
              <div className="flex items-start gap-4">

                {/* Question number */}
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    selectedAnswer
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-base font-semibold leading-7 text-slate-950">
                      {question.text}
                    </h2>

                    {selectedAnswer && (
                      <span className="hidden shrink-0 text-xs font-medium text-indigo-600 sm:block">
                        Answered
                      </span>
                    )}
                  </div>

                  {/* Answers */}
                  <div className="mt-6 space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const selected =
                        selectedAnswer === option.id

                      return (
                        <label
                          key={option.id}
                          className={[
                            "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition",
                            selected
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            checked={selected}
                            onChange={() =>
                              selectAnswer(
                                question.id,
                                option.id
                              )
                            }
                            className="sr-only"
                          />

                          <span
                            className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {String.fromCharCode(
                              65 + optionIndex
                            )}
                          </span>

                          <span
                            className={[
                              "text-sm",
                              selected
                                ? "font-semibold text-slate-950"
                                : "text-slate-700",
                            ].join(" ")}
                          >
                            {option.text}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 z-10 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-semibold text-slate-900">
              {allAnswered
                ? "All questions answered"
                : `${quiz.questions.length - answeredCount} questions remaining`}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {allAnswered
                ? "You can submit the quiz now."
                : "Answer every question before submitting."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? "Submitting..." : "Submit quiz"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizPage