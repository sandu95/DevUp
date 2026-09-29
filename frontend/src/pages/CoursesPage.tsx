import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../services/api"
import type { Course, Enrollment } from "../types/course"
import { useAuth } from "../context/AuthContext"

function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [actionCourseId, setActionCourseId] = useState<number | null>(null)

    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const loadData = async () => {
            try {
                setError("")

                const coursesData = await api("/courses")
                setCourses(coursesData.courses)

                if (isAuthenticated) {
                    const enrollmentsData = await api("/enrollments/me")
                    setEnrollments(enrollmentsData.enrollments)
                } else {
                    setEnrollments([])
                }
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load courses"
                )
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isAuthenticated])

    const isEnrolled = (courseId: number) =>
        enrollments.some(
            (enrollment) => enrollment.course.id === courseId
        )

    const handleEnroll = async (courseId: number) => {
        if (!isAuthenticated) {
            navigate("/login")
            return
        }

        try {
            setActionCourseId(courseId)
            setError("")

            const data = await api(
                `/enrollments/courses/${courseId}`,
                {
                    method: "POST",
                }
            )

            setEnrollments((current) => [
                data.enrollment,
                ...current,
            ])
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to enroll"
            )
        } finally {
            setActionCourseId(null)
        }
    }

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading courses...
            </p>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm font-medium text-indigo-600">
                    Courses
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    Explore courses
                </h1>

                <p className="mt-2 text-slate-500">
                    Choose a course and start learning at your own pace.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <h2 className="font-semibold text-slate-900">
                        No courses available
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Courses will appear here once they are created.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => {
                        const enrolled = isEnrolled(course.id)
                        const actionLoading = actionCourseId === course.id

                        return (
                            <article
                                key={course.id}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                            >
                                <div className="aspect-[16/9] bg-slate-100">
                                    {course.imageUrl ? (
                                        <img
                                            src={course.imageUrl}
                                            alt={course.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                            Course image
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="font-semibold text-slate-900">
                                            {course.title}
                                        </h2>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                                                course.status === "PUBLISHED"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700",
                                            ].join(" ")}
                                        >
                                            {course.status}
                                        </span>
                                    </div>

                                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                                        {course.description ??
                                            "No description available."}
                                    </p>

                                    <div className="mt-6 flex gap-3">
                                        {enrolled ? (
                                            <Link
                                                to={`/courses/${course.id}`}
                                                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                                            >
                                                Continue course
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => handleEnroll(course.id)}
                                                disabled={actionLoading}
                                                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {actionLoading
                                                    ? "Enrolling..."
                                                    : "Enroll"}
                                            </button>
                                        )}

                                        <Link
                                            to={`/courses/${course.id}`}
                                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Details
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default CoursesPage