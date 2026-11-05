export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id + "-error"} role="alert" className="mt-2 text-sm text-red-700">{message}</p> : null
}
