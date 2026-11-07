import type { ReactNode } from "react"
import { Button } from "./Button"

export function ErrorMessage({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
      {children}
      {onRetry && <div className="mt-3"><Button variant="secondary" onClick={onRetry}>Retry</Button></div>}
    </div>
  )
}
