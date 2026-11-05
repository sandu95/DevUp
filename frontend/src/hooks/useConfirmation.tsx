import { useCallback, useEffect, useRef, useState } from "react"
import { ConfirmationDialog, type ConfirmationOptions } from "../components/ui/ConfirmationDialog"

export function useConfirmation() {
  const [request, setRequest] = useState<ConfirmationOptions | null>(null)
  const resolveRequest = useRef<((confirmed: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmationOptions) => {
    if (resolveRequest.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      resolveRequest.current = resolve
      setRequest(options)
    })
  }, [])

  const choose = useCallback((confirmed: boolean) => {
    const resolve = resolveRequest.current
    if (!resolve) return
    resolveRequest.current = null
    setRequest(null)
    resolve(confirmed)
  }, [])

  useEffect(() => () => {
    resolveRequest.current?.(false)
    resolveRequest.current = null
  }, [])

  return {
    confirm,
    dialog: request ? <ConfirmationDialog {...request} onChoose={choose} /> : null,
  }
}
