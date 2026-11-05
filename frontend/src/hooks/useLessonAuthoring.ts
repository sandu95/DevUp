import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../services/api"
import { useConfirmation } from "./useConfirmation"
import { useFormValidation, positionError } from "./useFormValidation"
import type { AdminLesson as Lesson, AdminQuiz as Quiz, AdminQuestion as Question } from "../types/authoring"

export function useLessonAuthoring(lessonId: number) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  const [quizTitle, setQuizTitle] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [questionPosition, setQuestionPosition] = useState<number | null>(null)

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const savePending = useRef(false)
  const deletionPending = useRef(false)
  const confirmation = useConfirmation()
  const quizValidation = useFormValidation()
  const questionValidation = useFormValidation()
  const [error, setError] = useState("")
  const routeRequest = useRef<AbortController | null>(null)
  const nextQuestionPosition = (quiz?.questions ?? []).reduce(
    (maximum, question) => Math.max(maximum, question.position), 0
  ) + 1

  const loadData = useCallback((signal: AbortSignal) => {
    return Promise.all([
      api<{ lesson: Lesson }>(`/lessons/${lessonId}`, { signal }),
      api<{ quiz: { id: number } | null }>(`/quizzes/lesson/${lessonId}`, { signal }),
    ]).then(async ([lessonData, quizData]) => {
      const adminQuiz = quizData.quiz
        ? await api<{ quiz: Quiz }>(`/quizzes/${quizData.quiz.id}/admin`, { signal })
        : null
      return { lessonData, adminQuiz }
    }).then(({ lessonData, adminQuiz }) => {
      if (signal.aborted) return
      setError("")
      setLesson(lessonData.lesson)
      setQuiz(adminQuiz?.quiz ?? null)
      setQuizTitle(adminQuiz?.quiz.title ?? "")
    }).catch((error: unknown) => {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load lesson"
      )
    }).finally(() => {
      if (!signal.aborted) setLoading(false)
    })
  }, [lessonId])

  useEffect(() => {
    const controller = new AbortController()
    routeRequest.current = controller
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return () => controller.abort()
    }

    void loadData(controller.signal)
    return () => controller.abort()
  }, [lessonId, loadData])

  const handleEditQuestion = (question: Question) => {
    questionValidation.clear()
    setError("")

    setEditingQuestionId(question.id)
    setQuestionText(question.text)
    setQuestionPosition(question.position)
  }

  const handleDeleteQuestion = async (questionId: number) => {
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted || savePending.current || deletionPending.current) return
    deletionPending.current = true
    const confirmed = await confirmation.confirm({ title: "Delete question?", description: `Delete "${quiz?.questions.find((question) => question.id === questionId)?.text ?? "this question"}"? Its answer options and submitted answers will also be removed.`, confirmLabel: "Delete question" })

    if (!confirmed || signal.aborted) {
      deletionPending.current = false
      return
    }

    setDeleting(true)

    try {
      setError("")

      await api(`/quizzes/questions/${questionId}`, {
        method: "DELETE",
        signal,
      })

      if (signal.aborted) return
      if (editingQuestionId === questionId) {
        questionValidation.clear()
        setEditingQuestionId(null)
        setQuestionText("")
        setQuestionPosition(null)
      }
      await loadData(signal)
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete question"
      )
    } finally {
      deletionPending.current = false
      if (!signal.aborted) setDeleting(false)
    }
  }

  const handleCreateQuiz = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    const signal = routeRequest.current?.signal
    if (!signal || signal.aborted || saving || savePending.current || deletionPending.current) return

    if (!quizValidation.validate({ "quiz-title": quizTitle.trim() ? "" : "A quiz title is required." })) return
    savePending.current = true

    try {
      setSaving(true)
      setError("")

      if (quiz) {
        await api(`/quizzes/${quiz.id}`, {
          method: "PATCH",
          signal,
          body: JSON.stringify({
            title: quizTitle,
          }),
        })
      } else {
        await api("/quizzes", {
          method: "POST",
          signal,
          body: JSON.stringify({
            title: quizTitle,
            lessonId,
          }),
        })
      }

      await loadData(signal)
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save quiz"
      )
    } finally {
      savePending.current = false
      if (!signal.aborted) setSaving(false)
    }
  }

  const handleDeleteQuiz = async () => {
    const signal = routeRequest.current?.signal
    if (!quiz || !signal || signal.aborted || saving || savePending.current || deletionPending.current) return

    deletionPending.current = true
    const confirmed = await confirmation.confirm({ title: "Delete quiz?", description: `Delete "${quiz.title}"? All its questions, answer options and attempts will also be removed.`, confirmLabel: "Delete quiz" })

    if (!confirmed || signal.aborted) {
      deletionPending.current = false
      return
    }

    setDeleting(true)

    try {
      setSaving(true)
      setError("")

      await api(`/quizzes/${quiz.id}`, {
        method: "DELETE",
        signal,
      })

      if (signal.aborted) return
      quizValidation.clear()
      questionValidation.clear()
      setQuiz(null)
      setQuizTitle("")
      setEditingQuestionId(null)
      setQuestionText("")
      setQuestionPosition(null)
    } catch (error) {
      if (signal.aborted) return
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete quiz"
      )
    } finally {
      deletionPending.current = false
      if (!signal.aborted) setDeleting(false)
      if (!signal.aborted) setSaving(false)
    }
  }

  const handleAddQuestion = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const signal = routeRequest.current?.signal
    if (!quiz || !signal || signal.aborted || saving || savePending.current || deletionPending.current) return

    if (!questionValidation.validate({
      "question-text": questionText.trim() ? "" : "Question text is required.",
      "question-position": positionError(questionPosition ?? nextQuestionPosition),
    })) return
    savePending.current = true

    try {
      setSaving(true)
      setError("")

      if (editingQuestionId) {
        await api(`/quizzes/questions/${editingQuestionId}`, {
          method: "PATCH",
          signal,
          body: JSON.stringify({
            text: questionText,
            position: questionPosition ?? nextQuestionPosition,
          }),
        })
      } else {
        await api(`/quizzes/${quiz.id}/questions`, {
          method: "POST",
          signal,
          body: JSON.stringify({
            text: questionText,
            position: questionPosition ?? nextQuestionPosition,
          }),
        })
      }

      if (signal.aborted) return
      setEditingQuestionId(null)
      setQuestionText("")
      setQuestionPosition(null)

      await loadData(signal)

    } catch (error) {
      if (signal.aborted) return
      if (error instanceof Error && (error as { status?: number }).status === 409 && error.message.includes("position")) {
        questionValidation.setFieldError("question-position", error.message)
      } else {
        setError(error instanceof Error ? error.message : "Failed to save question")
      }
    } finally {
      savePending.current = false
      if (!signal.aborted) setSaving(false)
    }
  }

  const cancelQuestion = () => {
    questionValidation.clear()
    setError("")
    setEditingQuestionId(null)
    setQuestionText("")
    setQuestionPosition(null)
  }

  return {
    lesson, quiz, loading, error, saving, deleting,
    confirmationDialog: confirmation.dialog,
    handleEditQuestion, handleDeleteQuestion,
    quizForm: {
      title: quizTitle, hasQuiz: Boolean(quiz), saving, busy: saving || deleting,
      validation: quizValidation, onTitleChange: setQuizTitle,
      onSubmit: handleCreateQuiz, onDelete: handleDeleteQuiz,
    },
    questionForm: {
      text: questionText, position: questionPosition ?? nextQuestionPosition,
      editing: editingQuestionId !== null, saving, busy: saving || deleting,
      validation: questionValidation, onTextChange: setQuestionText,
      onPositionChange: setQuestionPosition, onSubmit: handleAddQuestion,
      onCancel: cancelQuestion,
    },
  }
}
