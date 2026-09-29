import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import type { Course } from "../types/course"

function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setError("")

        const data = await api("/courses")
        setCourses(data.courses)
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

    loadCourses()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-slate-500">
          Loading courses...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-indigo-600">
          Course catalog
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Explore our courses
        </h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          Browse available courses and find the right path
          for developing your programming skills.
        </p>
      </div>

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="font-semibold text-slate-900">
            No courses available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Published courses will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Available
                </span>

                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  {course.title}
                </h2>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                  {course.description ??
                    "No description available."}
                </p>

                <div className="mt-6">
                  <Link
                    to={`/catalog/${course.id}`}
                    className="block w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View course
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default CatalogPage