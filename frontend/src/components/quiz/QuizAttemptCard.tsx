import type { QuizAttempt } from "../../types/quiz"
import { ButtonLink } from "../ui/Button"
import { StatusBadge } from "../ui/StatusBadge"

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })

export function QuizAttemptCard({ attempt, filtered }: { attempt: QuizAttempt; filtered: boolean }) {
  const submitted = attempt.completedAt !== null
  const date = attempt.completedAt ?? attempt.startedAt

  return (
    <article aria-labelledby={`attempt-${attempt.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <StatusBadge tone={submitted ? "accent" : "neutral"}>{submitted ? "Submitted" : "In progress"}</StatusBadge>
          <h2 id={`attempt-${attempt.id}`} className="break-words text-lg font-semibold text-slate-950">{attempt.quiz.title}</h2>
          <p className="text-sm text-slate-500">
            {submitted ? "Submitted on " : "Started on "}
            <time dateTime={date}>{dateFormat.format(new Date(date))}</time>
          </p>
        </div>
        <div className="shrink-0">
          <p className="text-xs font-medium text-slate-500">Recorded score</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{submitted ? `${attempt.score}%` : "Not submitted"}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink to={`/quizzes/${attempt.quizId}`} variant="secondary">Open quiz</ButtonLink>
        {!filtered && <ButtonLink to={`/quiz-history?quizId=${attempt.quizId}`} variant="ghost">Quiz attempts</ButtonLink>}
      </div>
    </article>
  )
}
