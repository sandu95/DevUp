import type { ReactNode } from "react"

export function StatusBadge({
  children, tone = "neutral",
}: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${tone === "accent" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  )
}
