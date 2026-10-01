import { useEffect, useState } from "react"
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

  const [answers, setAnswers] = useState<
    Record<number, number>
  >({})

  const [result, setResult] =
    useState<QuizResult | null>(null)

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
        const data = await api(`/quizzes/${quizId}`)

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
  }

  const handleSubmit = async () => {
    if (!quiz) {
      return
    }

    if (
      Object.keys(answers).length !==
      quiz.questions.length
    ) {
      setError("Please answer all questions.")
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

      const data = await api(
        `/quizzes/${quiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: submittedAnswers,
          }),
        }
      )

      setResult(data.result)
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

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading quiz...
      </p>
    )
  }

  if (error && !quiz) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!quiz) {
    return null
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-indigo-600">
            Quiz completed
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {quiz.title}
          </h1>

          <div className="mx-auto mt-8 flex h-32 w-32 items-center justify-center rounded-full bg-indigo-50">
            <span className="text-4xl font-bold text-indigo-600">
              {result.score}%
            </span>
          </div>

          <p className="mt-6 text-slate-500">
            You answered{" "}
            <span className="font-semibold text-slate-900">
              {result.correctAnswers}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {result.totalQuestions}
            </span>{" "}
            questions correctly.
          </p>

          {result.score === 100 ? (
            <p className="mt-3 font-semibold text-emerald-600">
              Perfect score! This lesson has been completed.
            </p>
          ) : (
            <p className="mt-3 text-sm text-amber-600">
              You need 100% to complete this lesson.
            </p>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => {
                setResult(null)
                setAnswers({})
              }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>

            <Link
              to={`/lessons/${quiz.lessonId}`}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Back to lesson
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          to={`/lessons/${quiz.lessonId}`}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Back to lesson
        </Link>

        <p className="mt-6 text-sm font-medium text-indigo-600">
          Quiz
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {quiz.title}
        </h1>

        <p className="mt-2 text-slate-500">
          Answer all {quiz.questions.length} questions
          and submit your answers.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {quiz.questions.map((question, index) => (
          <section
            key={question.id}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                {index + 1}
              </div>

              <div className="flex-1">
                <h2 className="font-semibold leading-7 text-slate-900">
                  {question.text}
                </h2>

                <div className="mt-5 space-y-3">
                  {question.options.map((option) => {
                    const selected =
                      answers[question.id] === option.id

                    return (
                      <label
                        key={option.id}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition",
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
                          className="h-4 w-4"
                        />

                        <span className="text-sm text-slate-700">
                          {option.text}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">
          {Object.keys(answers).length} of{" "}
          {quiz.questions.length} answered
        </p>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : "Submit quiz"}
        </button>
      </div>
    </div>
  )
}

export default QuizPage