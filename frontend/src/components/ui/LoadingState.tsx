import type { ReactNode } from "react"

export function LoadingState({ label = "Loading page...", children }: { label?: string; children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <p className={children ? "sr-only" : "text-sm text-slate-500"}>{label}</p>
      {children && <div aria-hidden="true">{children}</div>}
    </div>
  )
}
