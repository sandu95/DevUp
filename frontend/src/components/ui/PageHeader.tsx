import { useEffect, useRef } from "react"

export function PageHeader({
  eyebrow, title, description, autoFocus = false,
}: { eyebrow: string; title: string; description: string; autoFocus?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (autoFocus) heading.current?.focus({ preventScroll: true })
  }, [autoFocus, title])
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-medium text-indigo-600">{eyebrow}</p>
      <h1 ref={heading} tabIndex={autoFocus ? -1 : undefined} className="mt-2 text-3xl font-bold tracking-tight text-slate-950 focus:outline-none sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </header>
  )
}
