import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../services/api"
import type { Course, CurriculumLesson as Lesson, Enrollment, CourseProgress } from "../types/course"

export function useCourseDetails(courseId: number, isAdmin: boolean) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [enrolled, setEnrolled] = useState(false)

  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState("")
  const [progressUnavailable, setProgressUnavailable] = useState(false)
  const [reload, setReload] = useState(0)
  const routeRequest = useRef<AbortController | null>(null)
  const enrollmentPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    routeRequest.current = controller
    enrollmentPending.current = false
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return () => controller.abort()
    }

    const loadCourse = async () => {
      try {
        setLoading(true)
        setError("")
        setCourse(null)
        setLessons([])
        setProgress(null)
        setProgressUnavailable(false)
        setEnrolled(false)
        setEnrolling(false)

        const [courseData, lessonsData, enrollmentsData] =
          await Promise.all([
            api<{ course: Course }>(`/courses/${courseId}`, { signal }),
            api<{ lessons: Lesson[] }>(
              isAdmin ? `/lessons/course/${courseId}` : `/courses/${courseId}/curriculum`, { signal }
            ),
            api<{ enrollments: Enrollment[] }>(
              "/enrollments/me", { signal }
            ),
          ])

        if (signal.aborted) return
        setCourse(courseData.course)
        setLessons(lessonsData.lessons)

        const isEnrolled = enrollmentsData.enrollments.some(
          (enrollment) => enrollment.course.id === courseId
        )

        setEnrolled(isEnrolled)

        if (isEnrolled) {
          try {
            const progressData = await api<{
              progress: CourseProgress
            }>(`/progress/courses/${courseId}`, { signal })

            if (signal.aborted) return
            setProgress(progressData.progress)
          } catch {
            if (signal.aborted) return
            setProgress(null)
            setProgressUnavailable(true)
          }
        } else {
          setProgress(null)
        }
      } catch (error) {
        if (signal.aborted) return
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load course"
        )
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    void loadCourse()
    return () => controller.abort()
  }, [courseId, isAdmin, reload])

  const handleEnroll = async () => {
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted || enrollmentPending.current || enrolled || course?.status !== "PUBLISHED") return
    enrollmentPending.current = true
    try {
      setEnrolling(true)
      setError("")

      await api(`/enrollments/courses/${courseId}`, {
        method: "POST",
        signal,
      })

      if (signal.aborted) return
      setEnrolled(true)

      try {
        const progressData = await api<{
          progress: CourseProgress
        }>(`/progress/courses/${courseId}`, { signal })
        if (!signal.aborted) setProgress(progressData.progress)
      } catch {
        if (!signal.aborted) setProgressUnavailable(true)
      }
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enroll in course"
      )
    } finally {
      if (!signal.aborted) {
        enrollmentPending.current = false
        setEnrolling(false)
      }
    }
  }

  const completedLessonIds = useMemo(() => {
    return new Set(
      progress?.lessons
        .filter((lesson) => lesson.completed)
        .map((lesson) => lesson.id) ?? []
    )
  }, [progress])

  const nextLesson = useMemo(() => {
    if (!enrolled || !progress) {
      return null
    }

    return (
      lessons.find(
        (lesson) => !completedLessonIds.has(lesson.id)
      ) ?? null
    )
  }, [lessons, completedLessonIds, enrolled, progress])

  const isCourseCompleted =
    enrolled &&
    lessons.length > 0 &&
    lessons.every((lesson) =>
      completedLessonIds.has(lesson.id)
    )

  return {
    course, lessons, progress, enrolled, loading, enrolling, error,
    progressUnavailable, completedLessonIds, nextLesson, isCourseCompleted,
    enroll: handleEnroll,
    retry: () => setReload((value) => value + 1),
  }
}
