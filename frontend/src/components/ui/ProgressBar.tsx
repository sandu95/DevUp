type ProgressBarProps = {
  value: number
  label?: string
  accessibleLabel?: string
}

export function ProgressBar({
  value, label = "Progress", accessibleLabel = label,
}: ProgressBarProps) {
  const percentage = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold tabular-nums text-slate-700">{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
