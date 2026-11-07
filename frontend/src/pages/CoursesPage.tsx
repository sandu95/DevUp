import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../services/api"
import type { Course, Enrollment } from "../types/course"
import { isCourseCompleted } from "../utils/progress"
import CourseCard from "../components/CourseCard"
import { CourseGridSkeleton } from "../components/CourseGridSkeleton"
import { Button, ButtonLink } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { FormField } from "../components/ui/FormField"
import { PageHeader } from "../components/ui/PageHeader"
import { StatusBadge } from "../components/ui/StatusBadge"

type Filter = "all" | "enrolled" | "available"

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All courses" },
  { value: "enrolled", label: "My courses" },
  { value: "available", label: "Available" },
]

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionCourseId, setActionCourseId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const requestController = useRef<AbortController | null>(null)
  const enrollmentPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    requestController.current = controller
    const loadCourses = async () => {
      try {
        setLoading(true)
        setError("")
        const [coursesData, enrollmentsData] = await Promise.all([
          api<{ courses: Course[] }>("/courses", { signal }),
          api<{ enrollments: Enrollment[] }>("/enrollments/me", { signal }),
        ])
        if (signal.aborted) return
        setCourses(coursesData.courses)
        setEnrollments(enrollmentsData.enrollments)
      } catch (error) {
        if (signal.aborted) return
        setError(error instanceof Error ? error.message : "Failed to load courses.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void loadCourses()
    return () => controller.abort()
  }, [reload])

  const enrollmentMap = useMemo(() => new Map(
    enrollments.map((enrollment) => [enrollment.course.id, enrollment])
  ), [enrollments])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesSearch = !query || course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query)
      const enrolled = enrollmentMap.has(course.id)
      const matchesFilter = filter === "all" ||
        (filter === "enrolled" && enrolled) ||
        (filter === "available" && !enrolled && course.status === "PUBLISHED")
      return matchesSearch && matchesFilter
    })
  }, [courses, enrollmentMap, search, filter])

  const handleEnroll = async (courseId: number) => {
    const signal = requestController.current?.signal
    if (!signal || signal.aborted || enrollmentPending.current) return
    enrollmentPending.current = true
    try {
      setActionCourseId(courseId)
      setError("")
      const data = await api<{ enrollment: Enrollment }>(`/enrollments/courses/${courseId}`, {
        method: "POST",
        signal,
      })
      if (signal.aborted) return
      setEnrollments((current) => [data.enrollment, ...current])
    } catch (error) {
      if (signal.aborted) return
      setError(error instanceof Error ? error.message : "Failed to enroll.")
    } finally {
      if (!signal.aborted) {
        enrollmentPending.current = false
        setActionCourseId(null)
      }
    }
  }

  const clearFilters = () => {
    setSearch("")
    setFilter("all")
  }

  return (
    <div aria-busy={loading} className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="Explore courses"
        description="Find a course, build your skills, and continue your programming journey."
      />
      <section aria-label="Course filters" className="space-y-4">
        <div className="max-w-xl">
          <FormField
            id="courses-search"
            label="Search courses"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or description..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter courses" className="flex flex-wrap gap-2">
            {filters.map(({ value, label }) => (
              <Button
                key={value}
                variant={filter === value ? "primary" : "secondary"}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {!loading && !error && (
            <span role="status" className="ml-auto text-sm text-slate-500">
              {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
            </span>
          )}
        </div>
      </section>
      {error && <ErrorMessage onRetry={courses.length === 0 ? () => setReload((value) => value + 1) : undefined}>{error}</ErrorMessage>}
      {loading ? <CourseGridSkeleton /> : filteredCourses.length === 0 ? (
        !error && <EmptyState
          title={search.trim() || filter !== "all" ? "No courses found" : "No courses available yet"}
          description={search.trim() || filter !== "all" ? "Try another search term or change the selected filter." : "Published courses will appear here when they are ready."}
          action={(search || filter !== "all") ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const enrollment = enrollmentMap.get(course.id)
            const completed = isCourseCompleted(enrollment?.progress)
            return (
              <CourseCard
                key={course.id}
                course={course}
                to={`/courses/${course.id}`}
                badge={course.status === "DRAFT" ? (
                  <StatusBadge>Draft</StatusBadge>
                ) : enrollment ? (
                  <StatusBadge tone="accent">{completed ? "Completed" : "Enrolled"}</StatusBadge>
                ) : (
                  <StatusBadge>Available</StatusBadge>
                )}
                progress={enrollment?.progress}
                actions={
                  <>
                    {course.status === "DRAFT" ? (
                      <ButtonLink to={`/courses/${course.id}`} className="flex-1">Preview draft</ButtonLink>
                    ) : enrollment ? (
                      <ButtonLink to={`/courses/${course.id}`} className="flex-1">{completed ? "Review" : "Continue"}</ButtonLink>
                    ) : (
                      <Button
                        disabled={actionCourseId !== null}
                        aria-busy={actionCourseId === course.id}
                        onClick={() => handleEnroll(course.id)}
                        className="flex-1"
                      >
                        {actionCourseId === course.id ? "Enrolling..." : "Enroll"}
                      </Button>
                    )}
                    <ButtonLink to={`/courses/${course.id}`} variant="secondary">Details</ButtonLink>
                  </>
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CoursesPage
