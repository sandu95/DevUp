import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"

interface Lesson {
    id: number
    title: string
    content: string
    position: number
    courseId: number
}

interface Quiz {
    id: number
    title: string
    lessonId: number
}

function LessonPage() {
    const { id } = useParams()

    const lessonId = Number(id)

    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [quiz, setQuiz] = useState<Quiz | null>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [completing, setCompleting] = useState(false)
    const [completed, setCompleted] = useState(false)

    useEffect(() => {
        if (!Number.isInteger(lessonId) || lessonId <= 0) {
            setError("Invalid lesson")
            setLoading(false)
            return
        }

        const loadLesson = async () => {
            try {
                const lessonData = await api(`/lessons/${lessonId}`)

                setLesson(lessonData.lesson)

                try {
                    const progressData = await api(
                        `/progress/courses/${lessonData.lesson.courseId}`
                    )

                    const lessonProgress =
                        progressData.progress.lessons.find(
                            (item: { id: number; completed: boolean }) =>
                                item.id === lessonId
                        )

                    setCompleted(lessonProgress?.completed ?? false)
                } catch {
                    setCompleted(false)
                }

                try {
                    const quizData = await api(
                        `/quizzes/lesson/${lessonId}`
                    )

                    setQuiz(quizData.quiz)
                } catch {
                    setQuiz(null)
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

        loadLesson()
    }, [lessonId])

    const handleComplete = async () => {
        try {
            setCompleting(true)
            setError("")

            await api(
                `/progress/lessons/${lessonId}/complete`,
                {
                    method: "POST",
                }
            )

            setCompleted(true)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to complete lesson"
            )
        } finally {
            setCompleting(false)
        }
    }

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading lesson...
            </p>
        )
    }

    if (error || !lesson) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error || "Lesson not found"}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div>
                <Link
                    to={`/courses/${lesson.courseId}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                    ← Back to course
                </Link>
            </div>

            <article className="rounded-3xl border border-slate-200 bg-white p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-indigo-600">
                            Lesson {lesson.position}
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                            {lesson.title}
                        </h1>
                    </div>

                    {completed && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Completed
                        </span>
                    )}
                </div>

                <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-line leading-8 text-slate-600">
                        {lesson.content}
                    </p>
                </div>

                <div className="mt-10 border-t border-slate-100 pt-6">
                    <button
                        onClick={handleComplete}
                        disabled={completed || completing}
                        className={[
                            "rounded-xl px-5 py-3 text-sm font-semibold transition",
                            completed
                                ? "cursor-default bg-emerald-100 text-emerald-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
                        ].join(" ")}
                    >
                        {completed
                            ? "Lesson completed"
                            : completing
                                ? "Saving..."
                                : "Mark as completed"}
                    </button>
                </div>
            </article>

            {quiz && (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
                    <p className="text-sm font-semibold text-indigo-700">
                        Quiz available
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                        {quiz.title}
                    </h2>

                    <Link
                        to={`/quizzes/${quiz.id}`}
                        className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Start quiz
                    </Link>
                </section>
            )}
        </div>
    )
}

export default LessonPage