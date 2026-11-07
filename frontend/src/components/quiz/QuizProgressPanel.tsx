type QuizProgressPanelProps = {
  questionCount: number
  answeredCount: number
  answeredPercentage: number
}

export function QuizProgressPanel({ questionCount, answeredCount, answeredPercentage }: QuizProgressPanelProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Your progress
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {answeredCount} of {questionCount} questions answered
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
        aria-valuemax={questionCount}
        aria-valuenow={answeredCount}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${answeredPercentage}%` }}
        />
      </div>
    </section>
  )
}
