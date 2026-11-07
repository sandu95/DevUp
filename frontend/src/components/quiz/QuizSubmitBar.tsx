import { Button } from "../ui/Button"
type QuizSubmitBarProps = {
  questionCount: number
  answeredCount: number
  allAnswered: boolean
  published: boolean
  submitting: boolean
  onSubmit: () => void
}

export function QuizSubmitBar({ questionCount, answeredCount, allAnswered, published, submitting, onSubmit }: QuizSubmitBarProps) {
  return (
    <div className="sticky bottom-4 z-10 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {allAnswered
              ? "All questions answered"
              : `${questionCount - answeredCount} questions remaining`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {allAnswered
              ? "Ready to submit your answers."
              : "Answer every question to enable submission."}
          </p>
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!published || submitting || !allAnswered}
          className="w-full sm:w-auto"
        >
          {submitting ? "Submitting..." : "Submit quiz"}
        </Button>
      </div>
    </div>
  )
}
