import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"

interface Lesson {
    id: number
    title: string
    content: string
    position: number
    courseId: number
    course: {
        id: number
        status: "DRAFT" | "PUBLISHED"
    }
}

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
    options: AnswerOption[]
}

interface Quiz {
    id: number
    title: string
    lessonId: number
    questions: Question[]
}

function AdminLessonPage() {
    const { id } = useParams()
    return <AdminLessonContent key={id} lessonId={Number(id)} />
}

function AdminLessonContent({ lessonId }: { lessonId: number }) {
    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [quiz, setQuiz] = useState<Quiz | null>(null)

    const [quizTitle, setQuizTitle] = useState("")
    const [questionText, setQuestionText] = useState("")
    const [questionPosition, setQuestionPosition] = useState<number | null>(null)

    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const routeRequest = useRef<AbortController | null>(null)
    const nextQuestionPosition = (quiz?.questions ?? []).reduce(
        (maximum, question) => Math.max(maximum, question.position), 0
    ) + 1

    const loadData = useCallback((signal: AbortSignal) => {
        return Promise.all([
            api<{ lesson: Lesson }>(`/lessons/${lessonId}`, { signal }),
            api<{ quiz: { id: number } | null }>(`/quizzes/lesson/${lessonId}`, { signal }),
        ]).then(async ([lessonData, quizData]) => {
            const adminQuiz = quizData.quiz
                ? await api<{ quiz: Quiz }>(`/quizzes/${quizData.quiz.id}/admin`, { signal })
                : null
            return { lessonData, adminQuiz }
        }).then(({ lessonData, adminQuiz }) => {
            if (signal.aborted) return
            setError("")
            setLesson(lessonData.lesson)
            setQuiz(adminQuiz?.quiz ?? null)
            setQuizTitle(adminQuiz?.quiz.title ?? "")
        }).catch((error: unknown) => {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load lesson"
            )
        }).finally(() => {
            if (!signal.aborted) setLoading(false)
        })
    }, [lessonId])

    useEffect(() => {
        const controller = new AbortController()
        routeRequest.current = controller
        if (!Number.isInteger(lessonId) || lessonId <= 0) {
            return () => controller.abort()
        }

        void loadData(controller.signal)
        return () => controller.abort()
    }, [lessonId, loadData])

    const handleEditQuestion = (question: Question) => {
        setEditingQuestionId(question.id)
        setQuestionText(question.text)
        setQuestionPosition(question.position)
    }

    const handleDeleteQuestion = async (questionId: number) => {
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted) return
        const confirmed = window.confirm(
            "Are you sure you want to delete this question?"
        )

        if (!confirmed) {
            return
        }

        try {
            setError("")

            await api(`/quizzes/questions/${questionId}`, {
                method: "DELETE",
                signal,
            })

            if (signal.aborted) return
            if (editingQuestionId === questionId) {
                setEditingQuestionId(null)
                setQuestionText("")
                setQuestionPosition(null)
            }
            await loadData(signal)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete question"
            )
        }
    }

    const handleCreateQuiz = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted || saving) return

        try {
            setSaving(true)
            setError("")

            if (quiz) {
                await api(`/quizzes/${quiz.id}`, {
                    method: "PATCH",
                    signal,
                    body: JSON.stringify({
                        title: quizTitle,
                    }),
                })
            } else {
                await api("/quizzes", {
                    method: "POST",
                    signal,
                    body: JSON.stringify({
                        title: quizTitle,
                        lessonId,
                    }),
                })
            }

            await loadData(signal)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to save quiz"
            )
        } finally {
            if (!signal.aborted) setSaving(false)
        }
    }

    const handleDeleteQuiz = async () => {
        const signal = routeRequest.current?.signal
        if (!quiz || !signal || signal.aborted || saving) return

        const confirmed = window.confirm(
            "Are you sure you want to delete this quiz?"
        )

        if (!confirmed) {
            return
        }

        try {
            setSaving(true)
            setError("")

            await api(`/quizzes/${quiz.id}`, {
                method: "DELETE",
                signal,
            })

            if (signal.aborted) return
            setQuiz(null)
            setQuizTitle("")
            setEditingQuestionId(null)
            setQuestionText("")
            setQuestionPosition(null)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete quiz"
            )
        } finally {
            if (!signal.aborted) setSaving(false)
        }
    }

    const handleAddQuestion = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        const signal = routeRequest.current?.signal
        if (!quiz || !signal || signal.aborted || saving) return

        try {
            setSaving(true)
            setError("")

            if (editingQuestionId) {
                await api(`/quizzes/questions/${editingQuestionId}`, {
                    method: "PATCH",
                    signal,
                    body: JSON.stringify({
                        text: questionText,
                        position: questionPosition ?? nextQuestionPosition,
                    }),
                })
            } else {
                await api(`/quizzes/${quiz.id}/questions`, {
                    method: "POST",
                    signal,
                    body: JSON.stringify({
                        text: questionText,
                        position: questionPosition ?? nextQuestionPosition,
                    }),
                })
            }

            if (signal.aborted) return
            setEditingQuestionId(null)
            setQuestionText("")
            setQuestionPosition(null)

            await loadData(signal)

        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to add question"
            )
        } finally {
            if (!signal.aborted) setSaving(false)
        }
    }

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
        return <p role="alert" className="text-sm text-red-700">Invalid lesson</p>
    }

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading lesson...
            </p>
        )
    }

    if (!lesson) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error || "Lesson not found"}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <Link
                    to={`/admin/courses/${lesson.courseId}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                    ← Back to course
                </Link>

                <p className="mt-5 text-sm font-medium text-violet-600">
                    Lesson management
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    {lesson.title}
                </h1>

                <p className="mt-2 text-slate-500">
                    Manage the quiz, questions and answer options.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {lesson.course.status === "DRAFT" && (
                <form
                    onSubmit={handleCreateQuiz}
                    className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6"
                >
                    <h2 className="text-lg font-semibold text-slate-900">
                        {quiz ? "Edit quiz" : "Create quiz"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        {quiz
                            ? "Update the quiz title."
                            : "Create a quiz for this lesson."}
                    </p>

                    <div className="mt-5">
                        <label htmlFor="quiz-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Quiz title
                        </label>

                        <input
                            id="quiz-title"
                            value={quizTitle}
                            onChange={(event) =>
                                setQuizTitle(event.target.value)
                            }
                            required
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving
                                ? "Saving..."
                                : quiz
                                    ? "Save changes"
                                    : "Create quiz"}
                        </button>

                        {quiz && (
                            <button
                                type="button"
                                onClick={handleDeleteQuiz}
                                className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                                Delete quiz
                            </button>
                        )}
                    </div>
                </form>
            )}
            {quiz && (
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
                    {lesson.course.status === "DRAFT" && (
                        <form
                            onSubmit={handleAddQuestion}
                            className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
                        >
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingQuestionId
                                    ? "Edit question"
                                    : "Add question"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {editingQuestionId
                                    ? "Update the selected question."
                                    : "Add a new question to this quiz."}
                            </p>

                            <div className="mt-5 space-y-5">
                                <div>
                                    <label htmlFor="question-text" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Question
                                    </label>

                                    <textarea
                                        id="question-text"
                                        value={questionText}
                                        onChange={(event) =>
                                            setQuestionText(event.target.value)
                                        }
                                        rows={4}
                                        required
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="question-position" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Position
                                    </label>

                                    <input
                                        id="question-position"
                                        type="number"
                                        min="1"
                                        max="2147483647"
                                        value={questionPosition ?? nextQuestionPosition}
                                        onChange={(event) =>
                                            setQuestionPosition(
                                                Number(event.target.value)
                                            )
                                        }
                                        required
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingQuestionId
                                            ? "Save changes"
                                            : "Add question"}
                                </button>

                                {editingQuestionId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingQuestionId(null)
                                            setQuestionText("")
                                            setQuestionPosition(null)
                                        }}
                                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Questions
                            </h2>

                            <p className="text-sm text-slate-500">
                                {quiz.questions.length} questions in this quiz
                            </p>
                        </div>

                        {quiz.questions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                                No questions yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {quiz.questions.map((question) => (
                                    <div
                                        key={question.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                                                {question.position}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-slate-900">
                                                    {question.text}
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {question.options.length} answer options
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <Link
                                                        to={`/admin/questions/${question.id}`}
                                                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                                    >
                                                        Manage answers
                                                    </Link>

                                                    {lesson.course.status === "DRAFT" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditQuestion(question)}
                                                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteQuestion(question.id)
                                                                }
                                                                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}

export default AdminLessonPage
