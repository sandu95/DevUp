import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"

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
    const questionId = Number(id)

    const [question, setQuestion] = useState<Question | null>(null)

    const [optionText, setOptionText] = useState("")
    const [isCorrect, setIsCorrect] = useState(false)

    const [editingOptionId, setEditingOptionId] = useState<number | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const loadQuestion = async () => {
        try {
            setError("")

            const data = await api(
                `/quizzes/questions/${questionId}/admin`
            )

            setQuestion(data.question)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load question"
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!Number.isInteger(questionId) || questionId <= 0) {
            setError("Invalid question")
            setLoading(false)
            return
        }

        loadQuestion()
    }, [questionId])

    const handleEditOption = (option: AnswerOption) => {
        setEditingOptionId(option.id)
        setOptionText(option.text)
        setIsCorrect(option.isCorrect)
    }

    const handleDeleteOption = async (optionId: number) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this answer option?"
        )

        if (!confirmed) {
            return
        }

        try {
            setError("")

            await api(`/quizzes/options/${optionId}`, {
                method: "DELETE",
            })

            await loadQuestion()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete answer option"
            )
        }
    }

    const handleAddOption = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        try {
            setSaving(true)
            setError("")

            if (editingOptionId) {
                await api(`/quizzes/options/${editingOptionId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        text: optionText,
                        isCorrect,
                    }),
                })
                setEditingOptionId(null)
                setOptionText("")
                setIsCorrect(false)
            } else {
                await api(`/quizzes/questions/${questionId}/options`, {
                    method: "POST",
                    body: JSON.stringify({
                        text: optionText,
                        isCorrect,
                    }),
                })
            }

            setOptionText("")
            setIsCorrect(false)

            await loadQuestion()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to add answer option"
            )
        } finally {
            setSaving(false)
        }
    }

    const anotherCorrectOptionExists =
        question?.options.some(
            (option) =>
                option.isCorrect &&
                option.id !== editingOptionId
        ) ?? false

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading question...
            </p>
        )
    }

    if (!question) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error || "Question not found"}
            </div>
        )
    }

    return (
        <div className="space-y-8">
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
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
                {question.quiz.lesson.course.status === "DRAFT" && (
                    <form
                        onSubmit={handleAddOption}
                        className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
                    >
                        <h2 className="text-lg font-semibold text-slate-900">
                            {editingOptionId ? "Edit option" : "Add option"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Add one possible answer for this question.
                        </p>

                        <div className="mt-5">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Answer text
                            </label>

                            <textarea
                                value={optionText}
                                onChange={(event) =>
                                    setOptionText(event.target.value)
                                }
                                rows={4}
                                required
                                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                            <input
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

                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editingOptionId ? "Save changes" : "Add option"}
                        </button>
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
                                        "flex items-center gap-4 rounded-2xl border bg-white p-5",
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

                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800">
                                            {option.text}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {option.isCorrect && (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                Correct
                                            </span>
                                        )}

                                        {question.quiz.lesson.course.status === "DRAFT" && (
                                            <>
                                                <button
                                                    onClick={() => handleEditOption(option)}
                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>

                                                <button
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