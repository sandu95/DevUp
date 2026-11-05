import type { ComponentProps } from "react"

type FormFieldProps = ComponentProps<"input"> & {
  id: string
  label: string
  hint?: string
  error?: string
}

export function FormField({
  id,
  label,
  hint,
  error,
  className = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: FormFieldProps) {
  const descriptionIds = [describedBy, hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean).join(" ") || undefined

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : invalid}
        className={`min-h-11 w-full min-w-0 rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${error ? "border-red-300" : "border-slate-200"} ${className}`}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-slate-500">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  )
}
