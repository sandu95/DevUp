import { Button } from "../ui/Button"
import type { FormEventHandler } from "react"
import type { useFormValidation } from "../../hooks/useFormValidation"
import { FieldError } from "../ui/FieldError"

interface QuizFormProps {
  title: string
  hasQuiz: boolean
  saving: boolean
  busy: boolean
  validation: ReturnType<typeof useFormValidation>
  onTitleChange: (title: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onDelete: () => void
}

export function QuizForm({ title, hasQuiz, saving, busy, validation, onTitleChange, onSubmit, onDelete }: QuizFormProps) {
  return (
    <form noValidate onChangeCapture={validation.clearOnChange}
      onSubmit={onSubmit}
      className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6"
    >
      <fieldset disabled={busy} className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">
          {hasQuiz ? "Edit quiz" : "Create quiz"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {hasQuiz
            ? "Update the quiz title."
            : "Create a quiz for this lesson."}
        </p>

        <div className="mt-5">
          <label htmlFor="quiz-title" className="mb-1.5 block text-sm font-medium text-slate-700">
            Quiz title
          </label>

          <input
            {...validation.fieldProps("quiz-title")}
            id="quiz-title"
            value={title}
            onChange={(event) =>
              onTitleChange(event.target.value)
            }
            required
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <FieldError id="quiz-title" message={validation.errors["quiz-title"]} />
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            type="submit"
            disabled={busy}
          >
            {saving
              ? "Saving..."
              : hasQuiz
                ? "Save changes"
                : "Create quiz"}
          </Button>

          {hasQuiz && (
            <Button disabled={busy}
              type="button"
              onClick={onDelete}
              variant="danger-outline"
            >
              Delete quiz
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  )
}
