import { Button, ButtonLink } from "../components/ui/Button"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { LoadingState } from "../components/ui/LoadingState"
import { Link, useParams } from "react-router-dom"
import { useLessonAuthoring } from "../hooks/useLessonAuthoring"
import { QuizForm } from "../components/admin/QuizForm"
import { QuestionForm } from "../components/admin/QuestionForm"

function AdminLessonPage() {
  const { id } = useParams()
  return <AdminLessonContent key={id} lessonId={Number(id)} />
}

function AdminLessonContent({ lessonId }: { lessonId: number }) {
  const {
    retry, lesson, quiz, loading, error, saving, deleting, confirmationDialog,
    handleEditQuestion, handleDeleteQuestion, quizForm, questionForm,
  } = useLessonAuthoring(lessonId)

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid lesson</p>
  }

  if (loading) {
    return (
      <LoadingState label="Loading lesson..." />
    )
  }

  if (!lesson) {
    return (
      <ErrorMessage onRetry={retry}>{error || "Lesson not found"}</ErrorMessage>
    )
  }

  return (
    <div className="space-y-8">
      {confirmationDialog}
      <div>
        <Link
          to={`/admin/courses/${lesson.courseId}`}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Back to course
        </Link>

        <p className="mt-5 text-sm font-medium text-indigo-600">
          Lesson management
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {lesson.title}
        </h1>

        <p className="mt-2 text-slate-500">
          Manage the quiz, questions and answer options.
        </p>
      </div>

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {lesson.course.status === "DRAFT" && (
        <QuizForm {...quizForm} />
      )}
      {quiz && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
          {lesson.course.status === "DRAFT" && (
            <QuestionForm {...questionForm} />
          )}

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Questions
              </h2>

              <p className="text-sm text-slate-500">
                {quiz.questions.length} questions in this quiz
              </p>
            </div>

            {quiz.questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No questions yet.
              </div>
            ) : (
              <div className="space-y-4">
                {quiz.questions.map((question) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                        {question.position}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {question.text}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {question.options.length} answer options
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <ButtonLink
                            to={`/admin/questions/${question.id}`}
                            variant="secondary"
                          >
                            Manage answers
                          </ButtonLink>

                          {lesson.course.status === "DRAFT" && (
                            <>
                              <Button disabled={saving || deleting}
                                type="button"
                                onClick={() => handleEditQuestion(question)}
                                variant="secondary"
                              >
                                Edit
                              </Button>

                              <Button disabled={saving || deleting}
                                type="button"
                                onClick={() =>
                                  handleDeleteQuestion(question.id)
                                }
                                variant="danger-outline"
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminLessonPage
