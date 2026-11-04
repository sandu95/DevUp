import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../services/api"
import type { Course } from "../types/course"

interface Lesson {
  id: number
  title: string
  content: string
  position: number
  courseId: number
}

interface LessonForm {
  title: string
  content: string
  position: number | null
}

const emptyForm: LessonForm = {
  title: "",
  content: "",
  position: null,
}

function AdminCoursePage() {
  const { id } = useParams()
  return <AdminCourseContent key={id} courseId={Number(id)} />
}

function AdminCourseContent({ courseId }: { courseId: number }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])

  const [form, setForm] = useState<LessonForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const routeRequest = useRef<AbortController | null>(null)
  const nextLessonPosition = lessons.reduce(
    (maximum, lesson) => Math.max(maximum, lesson.position), 0
  ) + 1

  const loadData = useCallback((signal: AbortSignal) => {
    return Promise.all([
      api<{ course: Course }>(`/courses/${courseId}`, { signal }),
      api<{ lessons: Lesson[] }>(`/lessons/course/${courseId}`, { signal }),
    ]).then(([courseData, lessonsData]) => {
      if (signal.aborted) return
      setError("")
      setCourse(courseData.course)
      setLessons(lessonsData.lessons)
    }).catch((error: unknown) => {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load course"
      )
    }).finally(() => {
      if (!signal.aborted) setLoading(false)
    })
  }, [courseId])

  useEffect(() => {
    const controller = new AbortController()
    routeRequest.current = controller
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return () => controller.abort()
    }

    void loadData(controller.signal)
    return () => controller.abort()
  }, [courseId, loadData])

  const resetForm = () => {
    setEditingId(null)

    setForm({
      title: "",
      content: "",
      position: null,
    })
  }

  const handleEdit = (lesson: Lesson) => {
    setEditingId(lesson.id)

    setForm({
      title: lesson.title,
      content: lesson.content,
      position: lesson.position,
    })
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted || saving) return

    try {
      setSaving(true)
      setError("")
      const payload = { ...form, position: form.position ?? nextLessonPosition }

      if (editingId) {
        await api(`/lessons/${editingId}`, {
          method: "PATCH",
          signal,
          body: JSON.stringify(payload),
        })
      } else {
        await api("/lessons", {
          method: "POST",
          signal,
          body: JSON.stringify({
            ...payload,
            courseId,
          }),
        })
      }

      await loadData(signal)
      if (signal.aborted) return

      setEditingId(null)

      setForm({
        title: "",
        content: "",
        position: null,
      })
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save lesson"
      )
    } finally {
      if (!signal.aborted) setSaving(false)
    }
  }

  const handleDelete = async (lessonId: number) => {
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted) return
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    )

    if (!confirmed) {
      return
    }

    try {
      setError("")

      await api(`/lessons/${lessonId}`, {
        method: "DELETE",
        signal,
      })

      await loadData(signal)
      if (signal.aborted) return

      if (editingId === lessonId) {
        resetForm()
      }
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete lesson"
      )
    }
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid course</p>
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading course...
      </p>
    )
  }

  if (!course) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Course not found"}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Back to courses
        </Link>

        <div className="mt-5">
          <p className="text-sm font-medium text-violet-600">
            Course management
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {course.title}
          </h1>

          <p className="mt-2 text-slate-500">
            Manage lessons and course content.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
        {course.status === "DRAFT" && (
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId
                ? "Edit lesson"
                : "Create lesson"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editingId
                ? "Update the selected lesson."
                : "Add a new lesson to this course."}
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="lesson-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </label>

                <input
                  id="lesson-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label htmlFor="lesson-position" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Position
                </label>

                <input
                  id="lesson-position"
                  type="number"
                  min="1"
                  max="2147483647"
                  value={form.position ?? nextLessonPosition}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      position: Number(event.target.value),
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="lesson-content" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Content
                </label>

                <textarea
                  id="lesson-content"
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  rows={10}
                  required
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create lesson"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
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
              Lessons
            </h2>

            <p className="text-sm text-slate-500">
              {lessons.length} lessons in this course
            </p>
          </div>

          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No lessons created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                    {lesson.position}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {lesson.title}
                    </h3>

                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                      {lesson.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {course.status === "DRAFT" && (
                      <button
                        onClick={() => handleEdit(lesson)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    )}

                    {course.status === "DRAFT" && (
                      <button
                        onClick={() => handleDelete(lesson.id)}
                        className="rounded-xl border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}

                    <Link
                      to={`/admin/lessons/${lesson.id}`}
                      className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Manage
                    </Link>
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

export default AdminCoursePage
