import { Button, ButtonLink } from "../ui/Button"
import { Link } from "react-router-dom"
import type { QuizResult, QuizCompletionStatus } from "../../types/quiz"

type QuizResultPanelProps = {
  quizId: number
  title: string
  lessonId: number
  result: QuizResult
  completionStatus: QuizCompletionStatus
  submitting: boolean
  onRetryCompletion: () => void
  onTryAgain: () => void
}

export function QuizResultPanel({ quizId, title, lessonId, result, completionStatus, submitting, onTryAgain, onRetryCompletion }: QuizResultPanelProps) {
  // Use exact correct-answer counts: a rounded score could display 100%.
  const perfect =
    result.totalQuestions > 0 &&
    result.correctAnswers === result.totalQuestions

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/lessons/${lessonId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to lesson
      </Link>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${perfect
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
              }`}
          >
            {perfect ? "Perfect score" : "Quiz submitted"}
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {perfect
              ? "You answered every question correctly."
              : "Review your score and try again when you're ready."}
          </p>
        </div>

        <div className="px-6 py-9 sm:px-10">
          <div
            className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-8 ${perfect ? "border-emerald-100" : "border-indigo-100"
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
            className={`mx-auto mt-6 max-w-lg rounded-xl px-4 py-3 text-center text-sm leading-6 ${perfect && completionStatus === "confirmed"
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

          {perfect && (completionStatus === "unknown" || completionStatus === "not-recorded") && (
            <div className="mt-4 text-center">
              <Button variant="secondary" disabled={submitting} onClick={onRetryCompletion}>Retry progress check</Button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!perfect && (
              <Button
                type="button"
                onClick={onTryAgain}
                disabled={submitting}
              >
                Try again
              </Button>
            )}
            <ButtonLink to={`/lessons/${lessonId}`} variant={perfect ? "primary" : "secondary"}>
              Back to lesson
            </ButtonLink>
            <ButtonLink to={`/quiz-history?quizId=${quizId}`} variant="secondary">View quiz history</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  )
}
