import { Button } from "../ui/Button"
import type { FormEventHandler } from "react"
import type { useFormValidation } from "../../hooks/useFormValidation"
import { FieldError } from "../ui/FieldError"

interface QuestionFormProps {
  text: string
  position: number
  editing: boolean
  saving: boolean
  busy: boolean
  validation: ReturnType<typeof useFormValidation>
  onTextChange: (text: string) => void
  onPositionChange: (position: number) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

export function QuestionForm({ text, position, editing, saving, busy, validation, onTextChange, onPositionChange, onSubmit, onCancel }: QuestionFormProps) {
  return (
    <form noValidate onChangeCapture={validation.clearOnChange}
      onSubmit={onSubmit}
      className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
    >
      <fieldset disabled={busy} className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">
          {editing
            ? "Edit question"
            : "Add question"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {editing
            ? "Update the selected question."
            : "Add a new question to this quiz."}
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="question-text" className="mb-1.5 block text-sm font-medium text-slate-700">
              Question
            </label>

            <textarea
              {...validation.fieldProps("question-text")}
              id="question-text"
              value={text}
              onChange={(event) =>
                onTextChange(event.target.value)
              }
              rows={4}
              required
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <FieldError id="question-text" message={validation.errors["question-text"]} />
          </div>

          <div>
            <label htmlFor="question-position" className="mb-1.5 block text-sm font-medium text-slate-700">
              Position
            </label>

            <input
              {...validation.fieldProps("question-position")}
              id="question-position"
              type="number"
              min="1"
              max="2147483647"
              value={position}
              onChange={(event) =>
                onPositionChange(
                  Number(event.target.value)
                )
              }
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500"
            />
            <FieldError id="question-position" message={validation.errors["question-position"]} />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            type="submit"
            disabled={busy}
            className="flex-1"
          >
            {saving
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Add question"}
          </Button>

          {editing && (
            <Button disabled={busy}
              type="button"
              onClick={onCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  )
}
