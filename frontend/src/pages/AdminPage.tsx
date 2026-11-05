import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../services/api"
import { useConfirmation } from "../hooks/useConfirmation"
import { useFormValidation } from "../hooks/useFormValidation"
import { FieldError } from "../components/ui/FieldError"
import type { Course } from "../types/course"
import { Link } from "react-router-dom"
import { PublicationChecklist } from "../components/PublicationChecklist"

interface CourseForm {
    title: string
    description: string
    imageUrl: string
    status: "DRAFT" | "PUBLISHED"
}

const emptyForm: CourseForm = {
    title: "",
    description: "",
    imageUrl: "",
    status: "DRAFT",
}

function AdminPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [form, setForm] = useState<CourseForm>(emptyForm)
    const [editingId, setEditingId] = useState<number | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const savePending = useRef(false)
    const deletionPending = useRef(false)
    const confirmation = useConfirmation()
    const validation = useFormValidation()
    const [error, setError] = useState("")
    const routeRequest = useRef<AbortController | null>(null)

    const loadCourses = useCallback((signal: AbortSignal) => {
        return api<{ courses: Course[] }>("/courses", { signal }).then((data) => {
            if (signal.aborted) return
            setError("")
            setCourses(data.courses)
        }).catch((error: unknown) => {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load courses"
            )
        }).finally(() => {
            if (!signal.aborted) setLoading(false)
        })
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        routeRequest.current = controller
        void loadCourses(controller.signal)
        return () => controller.abort()
    }, [loadCourses])

    const handleChange = (
        event:
            | React.ChangeEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLTextAreaElement>
            | React.ChangeEvent<HTMLSelectElement>
    ) => {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    const resetForm = () => {
        validation.clear()
        setError("")
        setForm(emptyForm)
        setEditingId(null)
    }

    const handleEdit = (course: Course) => {
        validation.clear()
        setError("")

        setEditingId(course.id)

        setForm({
            title: course.title,
            description: course.description ?? "",
            imageUrl: course.imageUrl ?? "",
            status: course.status,
        })

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted || saving || savePending.current || deletionPending.current) return

        if (!validation.validate({ "course-title": form.title.trim() ? "" : "A course title is required." })) return
        savePending.current = true

        try {
            setSaving(true)
            setError("")

            const payload = {
                title: form.title,
                description: form.description || null,
                imageUrl: form.imageUrl || null,
                status: form.status,
            }

            if (editingId) {
                await api(`/courses/${editingId}`, {
                    method: "PATCH",
                    signal,
                    body: JSON.stringify(payload),
                })
            } else {
                await api("/courses", {
                    method: "POST",
                    signal,
                    body: JSON.stringify({
                        title: form.title,
                        description: form.description || undefined,
                        imageUrl: form.imageUrl || undefined,
                    }),
                })
            }

            if (signal.aborted) return
            resetForm()
            await loadCourses(signal)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to save course"
            )
        } finally {
            savePending.current = false
            if (!signal.aborted) setSaving(false)
        }
    }

    const handleDelete = async (course: Course) => {
        const signal = routeRequest.current?.signal
        if (!signal || signal.aborted || savePending.current || deletionPending.current) return
        deletionPending.current = true
        const confirmed = await confirmation.confirm({ title: "Delete course?", description: `Delete "${course.title}"? This permanently removes all its lessons, quizzes, enrollments, progress and quiz attempts.`, confirmLabel: "Delete course" })

        if (!confirmed || signal.aborted) {
            deletionPending.current = false
            return
        }

        setDeleting(true)

        try {
            setError("")

            await api(`/courses/${course.id}`, {
                method: "DELETE",
                signal,
            })

            if (signal.aborted) return
            if (editingId === course.id) {
                resetForm()
            }

            await loadCourses(signal)
        } catch (error) {
            if (signal.aborted) return
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete course"
            )
        } finally {
            deletionPending.current = false
            if (!signal.aborted) setDeleting(false)
        }
    }

    if (loading) {
        return (
            <p className="text-sm text-slate-500">
                Loading admin panel...
            </p>
        )
    }

    return (
        <div className="space-y-8">
            {confirmation.dialog}
            <div>
                <p className="text-sm font-medium text-violet-600">
                    Administration
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    Course management
                </h1>

                <p className="mt-2 text-slate-500">
                    Create, edit and publish learning content.
                </p>
            </div>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
                <form noValidate onChangeCapture={validation.clearOnChange}
                    onSubmit={handleSubmit}
                    className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
                >
                    <fieldset disabled={saving || deleting} className="min-w-0">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingId
                                    ? "Edit course"
                                    : "Create course"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {editingId
                                    ? "Update the selected course."
                                    : "Add a new course to the platform."}
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="course-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Title
                                </label>

                                <input
                                    {...validation.fieldProps("course-title")}
                                    id="course-title"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError id="course-title" message={validation.errors["course-title"]} />
                            </div>

                            <div>
                                <label htmlFor="course-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Description
                                </label>

                                <textarea
                                    id="course-description"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={5}
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <div>
                                <label htmlFor="course-image" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Image URL
                                </label>

                                <input
                                    id="course-image"
                                    name="imageUrl"
                                    value={form.imageUrl}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            {editingId && (
                                <div>
                                    <label htmlFor="course-status" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Status
                                    </label>

                                    <select
                                        id="course-status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500"
                                    >
                                        <option value="DRAFT">
                                            Draft
                                        </option>
                                        <option value="PUBLISHED">
                                            Published
                                        </option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {editingId && form.status === "PUBLISHED" && <PublicationChecklist key={editingId} courseId={editingId} />}
                        <div className="mt-6 flex gap-3">
                            <button
                                type="submit"
                                disabled={saving || deleting}
                                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Save changes"
                                        : "Create course"}
                            </button>

                            {editingId && (
                                <button disabled={saving || deleting}
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </fieldset>
                </form>

                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Courses
                            </h2>

                            <p className="text-sm text-slate-500">
                                {courses.length} total courses
                            </p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {courses.length === 0 ? (
                            <div className="p-10 text-center text-sm text-slate-500">
                                No courses created yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="flex flex-wrap items-center gap-4 p-5"
                                    >
                                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                            {course.imageUrl ? (
                                                <img
                                                    src={course.imageUrl}
                                                    alt={course.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                                    No image
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="break-words font-semibold text-slate-900">
                                                    {course.title}
                                                </h3>

                                                <span
                                                    className={[
                                                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                                                        course.status === "PUBLISHED"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-amber-50 text-amber-700",
                                                    ].join(" ")}
                                                >
                                                    {course.status}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                                                {course.description ??
                                                    "No description"}
                                            </p>
                                        </div>

                                        <div className="flex w-full flex-wrap gap-2">
                                        {course.status === "DRAFT" && (
                                            <button disabled={saving || deleting}
                                                onClick={() => handleEdit(course)}
                                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                        )}

                                        <button disabled={saving || deleting}
                                            onClick={() => handleDelete(course)}
                                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                        >
                                            Delete
                                        </button>

                                        <Link
                                            to={`/admin/courses/${course.id}`}
                                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                        >
                                            Manage
                                        </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}

export default AdminPage
