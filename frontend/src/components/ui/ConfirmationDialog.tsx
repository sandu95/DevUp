import { useEffect, useId, useRef } from "react"
import { Button } from "./Button"

export interface ConfirmationOptions {
  title: string
  description: string
  confirmLabel: string
}

export function ConfirmationDialog({
  title, description, confirmLabel, onChoose,
}: ConfirmationOptions & { onChoose: (confirmed: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // Keep the original trigger across Strict Mode's effect replay.
    if (!triggerRef.current && document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement
    }
    dialog.showModal()
    cancelRef.current?.focus()
    return () => {
      dialog.close()
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onChoose(false) }}
      className="m-auto max-h-[90dvh] w-11/12 max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl backdrop:bg-slate-950/40"
    >
      <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
      <p id={descriptionId} className="mt-3 break-words text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button ref={cancelRef} variant="secondary" onClick={() => onChoose(false)}>Cancel</Button>
        <Button variant="danger" onClick={() => onChoose(true)}>{confirmLabel}</Button>
      </div>
    </dialog>
  )
}
