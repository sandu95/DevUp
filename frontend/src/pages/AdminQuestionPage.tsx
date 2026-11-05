import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"
import { useConfirmation } from "../hooks/useConfirmation"
import { useFormValidation } from "../hooks/useFormValidation"
import { FieldError } from "../components/ui/FieldError"

interface AnswerOption {
    id: number
    text: string
    isCorrect: boolean
    questionId: number
}

interface Question {
    id: number
    text: string
    position: number
    quizId: number
    options: AnswerOption[]
    quiz: {
        id: number
        title: string
        lessonId: number
        lesson: {
            course: {
                id: number
                status: "DRAFT" | "PUBLISHED"
            }
        }
    }
}

function AdminQuestionPage() {
    const { id } = useParams()
    return <AdminQuestionContent key={id} questionId={Number(id)} />
}

function AdminQuestionContent({ questionId }: { questionId: number }) {
    const [question, setQuestion] = useState<Question | null>(null)

    const [optionText, setOptionText] = useState("")
    const [isCorrect, setIsCorrect] = useState(false)

    const [editingOptionId, setEditingOptionId] = useState<number | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const savePending = useRef(false)
    const deletionPending = useRef(false)
    const confirmation = useConfirmation()
    const validation = useFormValidation()
    const [error, setError] = useState("")
    const routeRequest = useRef<AbortController | null>(null)

    const loadQuestion = useCallback((signal: AbortSignal) => {
        return api<{ question: Question }>(
            `/quizzes/questions/${questionId}/admin`, { signal }
        ).then((data) => {
            if (signal.aborted) return
            setError("")
            setQuestion(data.question)
        }).catch((error: unknown) => {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load question"
            )
        }).finally(() => {
            if (!signal.aborted) setLoading(false)
        })
    }, [questionId])

    useEffect(() => {
        const controller = new AbortController()
        routeRequest.current = controller
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return () => controller.abort()
        }

        void loadQuestion(controller.signal)
        return () => controller.abort()
    }, [questionId, loadQuestion])

    const handleEditOption = (option: AnswerOption) => {
        validation.clear()
        setError("")

        setEditingOptionId(option.id)
        setOptionText(option.text)
        setIsCorrect(option.isCorrect)
    }

    const handleDeleteOption = async (optionId: number) => {
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted || savePending.current || deletionPending.current) return
        deletionPending.current = true
        const confirmed = await confirmation.confirm({ title: "Delete answer option?", description: `Delete "${question?.options.find((option) => option.id === optionId)?.text ?? "this answer option"}"? Submitted answers that reference it will also be removed.`, confirmLabel: "Delete answer option" })

        if (!confirmed || signal.aborted) {
            deletionPending.current = false
            return
        }

        setDeleting(true)

        try {
            setError("")

            await api(`/quizzes/options/${optionId}`, {
                method: "DELETE",
                signal,
            })

            if (signal.aborted) return
            if (editingOptionId === optionId) {
                validation.clear()
                setEditingOptionId(null)
                setOptionText("")
                setIsCorrect(false)
            }
            await loadQuestion(signal)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete answer option"
            )
        } finally {
            deletionPending.current = false
            if (!signal.aborted) setDeleting(false)
        }
    }

    const handleAddOption = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted || saving || savePending.current || deletionPending.current) return

        if (!validation.validate({ "answer-text": optionText.trim() ? "" : "Answer text is required." })) return
        savePending.current = true

        try {
            setSaving(true)
            setError("")

            if (editingOptionId) {
                await api(`/quizzes/options/${editingOptionId}`, {
                    method: "PATCH",
                    signal,
                    body: JSON.stringify({
                        text: optionText,
                        isCorrect,
                    }),
                })
                if (signal.aborted) return
                setEditingOptionId(null)
                setOptionText("")
                setIsCorrect(false)
            } else {
                await api(`/quizzes/questions/${questionId}/options`, {
                    method: "POST",
                    signal,
                    body: JSON.stringify({
                        text: optionText,
                        isCorrect,
                    }),
                })
            }

            if (signal.aborted) return
            setOptionText("")
            setIsCorrect(false)

            await loadQuestion(signal)
        } catch (error) {
            if (signal.aborted) return
            if (error instanceof Error && (error as { status?: number }).status === 409 && error.message.includes("correct answer")) {
                validation.setFieldError("answer-correct", error.message)
            } else {
                setError(error instanceof Error ? error.message : "Failed to save answer option")
            }
        } finally {
            savePending.current = false
            if (!signal.aborted) setSaving(false)
        }
    }

    const anotherCorrectOptionExists =
        question?.options.some(
            (option) =>
                option.isCorrect &&
                option.id !== editingOptionId
        ) ?? false

    if (!Number.isInteger(questionId) || questionId <= 0) {
        return <p role="alert" className="text-sm text-red-700">Invalid question</p>
    }

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading question...
            </p>
        )
    }

    if (!question) {
        return (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error || "Question not found"}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {confirmation.dialog}
            <div>
                <Link
                    to={`/admin/lessons/${question.quiz.lessonId}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                    ← Back to lesson
                </Link>

                <p className="mt-5 text-sm font-medium text-violet-600">
                    Question management
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    Question {question.position}
                </h1>

                <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
                    {question.text}
                </p>
            </div>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
                {question.quiz.lesson.course.status === "DRAFT" && (
                    <form noValidate onChangeCapture={validation.clearOnChange}
                        onSubmit={handleAddOption}
                        className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
                    >
                        <fieldset disabled={saving || deleting} className="min-w-0">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingOptionId ? "Edit option" : "Add option"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Add one possible answer for this question.
                            </p>

                            <div className="mt-5">
                                <label htmlFor="answer-text" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Answer text
                                </label>

                                <textarea
                                    {...validation.fieldProps("answer-text")}
                                    id="answer-text"
                                    value={optionText}
                                    onChange={(event) =>
                                        setOptionText(event.target.value)
                                    }
                                    rows={4}
                                    required
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError id="answer-text" message={validation.errors["answer-text"]} />
                            </div>

                            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                                <input
                                    {...validation.fieldProps("answer-correct")}
                                    id="answer-correct"
                                    type="checkbox"
                                    checked={isCorrect}
                                    disabled={anotherCorrectOptionExists}
                                    onChange={(event) =>
                                        setIsCorrect(event.target.checked)
                                    }
                                />

                                <div>
                                    {anotherCorrectOptionExists && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            Another answer is already marked as correct.
                                        </p>
                                    )}
                                    <p className="text-sm font-medium text-slate-700">
                                        Correct answer
                                    </p>

                                    <p className="text-xs text-slate-400">
                                        Mark this option as correct.
                                    </p>
                                </div>
                            </label>
                            <FieldError id="answer-correct" message={validation.errors["answer-correct"]} />

                            <button
                                type="submit"
                                disabled={saving || deleting}
                                className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : editingOptionId ? "Save changes" : "Add option"}
                            </button>
                        </fieldset>
                    </form>
                )}

                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Answer options
                        </h2>

                        <p className="text-sm text-slate-500">
                            {question.options.length} options configured
                        </p>
                    </div>

                    {question.options.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                            No answer options yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {question.options.map((option) => (
                                <div
                                    key={option.id}
                                    className={[
                                        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-2xl border bg-white p-5",
                                        option.isCorrect
                                            ? "border-emerald-300"
                                            : "border-slate-200",
                                    ].join(" ")}
                                >
                                    <div
                                        className={[
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                                            option.isCorrect
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500",
                                        ].join(" ")}
                                    >
                                        {option.isCorrect ? "✓" : "—"}
                                    </div>

                                    <div className="min-w-0 break-words">
                                        <p className="text-sm font-medium text-slate-800">
                                            {option.text}
                                        </p>
                                    </div>

                                    <div className="col-span-2 flex flex-wrap items-center gap-2">
                                        {option.isCorrect && (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                Correct
                                            </span>
                                        )}

                                        {question.quiz.lesson.course.status === "DRAFT" && (
                                            <>
                                                <button disabled={saving || deleting}
                                                    onClick={() => handleEditOption(option)}
                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>

                                                <button disabled={saving || deleting}
                                                    onClick={() => handleDeleteOption(option.id)}
                                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default AdminQuestionPage
