import type { StudentQuestion } from "../../types/quiz"

type QuizQuestionCardProps = {
  question: StudentQuestion
  index: number
  selectedOptionId?: number
  submitting: boolean
  onSelectAnswer: (questionId: number, optionId: number) => void
}

export function QuizQuestionCard({ question, index, selectedOptionId, submitting, onSelectAnswer }: QuizQuestionCardProps) {
  const isAnswered = question.options.some(
    (option) => option.id === selectedOptionId
  )

  return (
    <fieldset
      disabled={submitting}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
    >
      <legend className="sr-only">{question.text}</legend>
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isAnswered
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600"
            }`}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-base font-semibold leading-7 text-slate-950">
              {question.text}
            </h2>
            {isAnswered && (
              <span className="text-xs font-semibold text-indigo-600">
                Answered
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = selectedOptionId === option.id

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${selected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={selected}
                    onChange={() =>
                      onSelectAnswer(question.id, option.id)
                    }
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 ${selected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span
                    className={`text-sm leading-6 ${selected
                        ? "font-semibold text-slate-950"
                        : "text-slate-700"
                      }`}
                  >
                    {option.text}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </fieldset>
  )
}
