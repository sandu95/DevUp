import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../services/api"
import type { Course } from "../types/course"

function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setError("")

        const data = await api<{ courses: Course[] }>("/courses")

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

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return courses
    }

    return courses.filter((course) => {
      return (
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query)
      )
    })
  }, [courses, search])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#f7f7f5]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />

            <div className="mt-5 h-12 w-80 max-w-full animate-pulse rounded bg-slate-200" />

            <div className="mt-5 h-12 w-full max-w-xl animate-pulse rounded bg-slate-100" />
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="aspect-[16/9] animate-pulse bg-slate-100" />

                <div className="space-y-4 p-6">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-16 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f7f7f5]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">

        {/* Header */}
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            DevUp courses
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Learn at your own pace.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Explore programming courses designed to help you
            understand the fundamentals, practice your skills,
            and build better software.
          </p>
        </section>

        {/* Search */}
        <section className="mt-10">
          <div className="relative max-w-2xl">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <>
            {/* Results header */}
            <div className="mt-14 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Available courses
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredCourses.length}{" "}
                  {filteredCourses.length === 1
                    ? "course"
                    : "courses"}
                  {search && ` matching "${search}"`}
                </p>
              </div>
            </div>

            {/* Empty state */}
            {filteredCourses.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                <h2 className="mt-4 font-semibold text-slate-950">
                  No courses found
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Try searching for another course.
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-5 text-sm font-semibold text-slate-950 underline underline-offset-4"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Course grid */}
            {filteredCourses.length > 0 && (
              <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <article
                    key={course.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  >
                    {/* Image */}
                    <Link
                      to={`/catalog/${course.id}`}
                      className="block aspect-[16/9] overflow-hidden bg-slate-100"
                    >
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-4xl font-bold text-slate-300">
                            {course.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                          Course
                        </span>

                        <span className="text-xs text-slate-400">
                          Free
                        </span>
                      </div>

                      <h2 className="mt-4 line-clamp-2 min-h-14 text-xl font-bold leading-7 tracking-tight text-slate-950">
                        {course.title}
                      </h2>

                      <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
                        {course.description ??
                          "No description available."}
                      </p>

                      <Link
                        to={`/catalog/${course.id}`}
                        className="mt-6 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        View course
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CatalogPage