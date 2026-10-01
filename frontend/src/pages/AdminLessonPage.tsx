import { useEffect, useState } from "react"
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
    const lessonId = Number(id)

    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [quiz, setQuiz] = useState<Quiz | null>(null)

    const [quizTitle, setQuizTitle] = useState("")
    const [questionText, setQuestionText] = useState("")
    const [questionPosition, setQuestionPosition] = useState(1)

    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const loadData = async () => {
        try {
            setError("")

            const lessonData = await api(`/lessons/${lessonId}`)
            setLesson(lessonData.lesson)

            const quizData = await api(`/quizzes/lesson/${lessonId}`)

            if (quizData.quiz) {
                const adminQuiz = await api(
                    `/quizzes/${quizData.quiz.id}/admin`
                )

                setQuiz(adminQuiz.quiz)
                setQuizTitle(adminQuiz.quiz.title)
            } else {
                setQuiz(null)
                setQuizTitle("")
            }
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load lesson"
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!Number.isInteger(lessonId) || lessonId <= 0) {
            setError("Invalid lesson")
            setLoading(false)
            return
        }

        loadData()
    }, [lessonId])

    const handleEditQuestion = (question: Question) => {
        setEditingQuestionId(question.id)
        setQuestionText(question.text)
        setQuestionPosition(question.position)
    }

    const handleDeleteQuestion = async (questionId: number) => {
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
            })

            await loadData()
        } catch (error) {
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

        try {
            setSaving(true)
            setError("")

            if (quiz) {
                await api(`/quizzes/${quiz.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        title: quizTitle,
                    }),
                })
            } else {
                await api("/quizzes", {
                    method: "POST",
                    body: JSON.stringify({
                        title: quizTitle,
                        lessonId,
                    }),
                })
            }

            await loadData()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to save quiz"
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteQuiz = async () => {
        if (!quiz) return

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
            })

            setQuiz(null)
            setQuizTitle("")
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete quiz"
            )
        } finally {
            setSaving(false)
        }
    }

    const handleAddQuestion = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        if (!quiz) return

        try {
            setSaving(true)
            setError("")

            if (editingQuestionId) {
                await api(`/quizzes/questions/${editingQuestionId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        text: questionText,
                        position: questionPosition,
                    }),
                })
            } else {
                await api(`/quizzes/${quiz.id}/questions`, {
                    method: "POST",
                    body: JSON.stringify({
                        text: questionText,
                        position: questionPosition,
                    }),
                })
            }

            setEditingQuestionId(null)
            setQuestionText("")
            setQuestionPosition(
                editingQuestionId
                    ? quiz.questions.length
                    : quiz.questions.length + 2
            )

            await loadData()

        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to add question"
            )
        } finally {
            setSaving(false)
        }
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
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Quiz title
                        </label>

                        <input
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
                <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
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
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Question
                                    </label>

                                    <textarea
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
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Position
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        value={questionPosition}
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
                                            setQuestionPosition(
                                                quiz.questions.length + 1
                                            )
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