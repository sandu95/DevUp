import type { ComponentProps } from "react"
import { Link } from "react-router-dom"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variants: Record<Variant, string> = {
  primary: "border-transparent bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  ghost: "border-transparent text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700",
  danger: "border-transparent bg-red-600 text-white hover:bg-red-700",
}

function buttonClasses(variant: Variant, className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />
}
