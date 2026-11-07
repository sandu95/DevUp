import { ProgressBar } from "../ui/ProgressBar"
import { Button } from "../ui/Button"
import type { CourseProgress } from "../../types/course"

type CourseProgressPanelProps = {
  progress: CourseProgress | null
  unavailable: boolean
  onRetry: () => void
}

export function CourseProgressPanel({ progress, unavailable, onRetry }: CourseProgressPanelProps) {
  const percentage = progress?.percentage ?? 0
  return (
    <>
      {unavailable && (
        <div role="status" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Progress could not be loaded. Your saved progress has not changed.
          <Button type="button" onClick={onRetry} variant="secondary" className="ml-2">
            Retry
          </Button>
        </div>
      )}
      {progress && (
        <div className="mt-8 max-w-2xl">
          <ProgressBar value={percentage} label="Your progress" accessibleLabel="Course progress" />
          <p className="mt-2 text-xs text-slate-500">
            {progress.completedLessons} of {progress.totalLessons} lessons completed
          </p>
        </div>
      )}
    </>
  )
}
