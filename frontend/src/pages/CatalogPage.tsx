import { useEffect, useMemo, useState } from "react"
import { api } from "../services/api"
import type { Course } from "../types/course"
import CourseCard from "../components/CourseCard"
import { CourseGridSkeleton } from "../components/CourseGridSkeleton"
import { Button, ButtonLink } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { FormField } from "../components/ui/FormField"
import { PageHeader } from "../components/ui/PageHeader"
import { StatusBadge } from "../components/ui/StatusBadge"

function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const loadCourses = async () => {
      try {
        setError("")
        const data = await api<{ courses: Course[] }>("/courses", { signal })
        if (signal.aborted) return
        // Admin sessions also receive drafts from this endpoint; the public catalog shows published content.
        setCourses(data.courses.filter((course) => course.status === "PUBLISHED"))
      } catch (error) {
        if (signal.aborted) return
        setError(error instanceof Error ? error.message : "Failed to load courses")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void loadCourses()
    return () => controller.abort()
  }, [])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return courses.filter((course) =>
      !query || course.title.toLowerCase().includes(query) || course.description?.toLowerCase().includes(query)
    )
  }, [courses, search])

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f7f7f5]">
      <div aria-busy={loading} className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
        <PageHeader
          eyebrow="DevUp courses"
          title="Learn at your own pace."
          description="Explore programming courses designed to help you understand the fundamentals, practice your skills, and build better software."
        />
        <div className="max-w-xl">
          <FormField
            id="catalog-search"
            label="Search courses"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or description..."
          />
        </div>
        {loading ? <CourseGridSkeleton /> : error ? <ErrorMessage>{error}</ErrorMessage> : (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Available courses</h2>
              <p role="status" className="text-sm text-slate-500">
                {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
                {search.trim() && ` matching "${search.trim()}"`}
              </p>
            </div>
            {filteredCourses.length === 0 ? (
              <EmptyState
                title={search.trim() ? "No courses found" : "No courses available yet"}
                description={search.trim() ? "Try another search term to find your next course." : "New courses will appear here when they are published."}
                action={search ? <Button variant="secondary" onClick={() => setSearch("")}>Clear search</Button> : undefined}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    to={`/catalog/${course.id}`}
                    headingLevel={3}
                    badge={<StatusBadge>Course</StatusBadge>}
                    actions={<ButtonLink to={`/catalog/${course.id}`} className="w-full">View course</ButtonLink>}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default CatalogPage
