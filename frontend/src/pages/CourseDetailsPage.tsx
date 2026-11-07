import { ErrorMessage } from "../components/ui/ErrorMessage"
import { LoadingState } from "../components/ui/LoadingState"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useCourseDetails } from "../hooks/useCourseDetails"
import { CourseSummary } from "../components/course/CourseSummary"
import { CourseProgressPanel } from "../components/course/CourseProgressPanel"
import { CourseActionCard } from "../components/course/CourseActionCard"
import { CourseCurriculum } from "../components/course/CourseCurriculum"

function CourseDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  return (
    <CourseDetailsContent
      key={`${id}:${user?.id}:${user?.role}`}
      courseId={Number(id)}
      isAdmin={user?.role === "ADMIN"}
    />
  )
}

function CourseDetailsContent({ courseId, isAdmin }: { courseId: number; isAdmin: boolean }) {
  const {
    course, lessons, progress, enrolled, loading, enrolling, error,
    progressUnavailable, completedLessonIds, nextLesson, isCourseCompleted, enroll, retry,
  } = useCourseDetails(courseId, isAdmin)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid course</p>
  }

  if (loading || (course && course.id !== courseId)) {
    return (
      <LoadingState label="Loading course...">
        <div className="space-y-8">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-12 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
              </div>
            </div>

            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </LoadingState>
    )
  }

  if (!course) {
    return <ErrorMessage onRetry={retry}>{error || "Course not found"}</ErrorMessage>
  }

  return (
    <div className="space-y-12">
      <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950">
        <span aria-hidden="true">←</span>
        Back to courses
      </Link>
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col justify-center">
          <CourseSummary
            course={course}
            lessonCount={lessons.length}
            enrolled={enrolled}
            progressAvailable={Boolean(progress)}
            completed={isCourseCompleted}
          />
          {enrolled && <CourseProgressPanel progress={progress} unavailable={progressUnavailable} onRetry={retry} />}
        </div>
        <CourseActionCard
          course={course}
          enrolled={enrolled}
          enrolling={enrolling}
          progressAvailable={Boolean(progress)}
          completed={isCourseCompleted}
          firstLessonId={lessons[0]?.id}
          nextLessonId={nextLesson?.id}
          error={error}
          onEnroll={enroll}
        />
      </section>
      <CourseCurriculum
        lessons={lessons}
        enrolled={enrolled}
        isAdmin={isAdmin}
        progressAvailable={Boolean(progress)}
        completedLessonIds={completedLessonIds}
      />
    </div>
  )
}

export default CourseDetailsPage
