import { useState } from "react"
import type { FormEvent } from "react"

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (candidates: Record<string, string>) => {
    const next = Object.fromEntries(Object.entries(candidates).filter(([, message]) => message))
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) document.getElementById(first)?.focus()
    return !first
  }

  const setFieldError = (id: string, message: string) => {
    setErrors((current) => ({ ...current, [id]: message }))
    const field = document.getElementById(id)
    requestAnimationFrame(() => {
      if (field?.isConnected) field.focus()
    })
  }

  const clearOnChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.id) return
    const id = target.id
    setErrors((current) => {
      if (!current[id]) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const fieldProps = (id: string, describedBy?: string) => ({
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": [describedBy, errors[id] && id + "-error"].filter(Boolean).join(" ") || undefined,
  })

  return { errors, validate, setFieldError, clearOnChange, fieldProps, clear: () => setErrors({}) }
}

export function positionError(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647
    ? "" : "Position must be a whole number between 1 and 2147483647."
}
