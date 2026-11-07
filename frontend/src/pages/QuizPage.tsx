import { LoadingState } from "../components/ui/LoadingState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useQuiz } from "../hooks/useQuiz"
import { QuizProgressPanel } from "../components/quiz/QuizProgressPanel"
import { QuizQuestionCard } from "../components/quiz/QuizQuestionCard"
import { QuizResultPanel } from "../components/quiz/QuizResultPanel"
import { QuizSubmitBar } from "../components/quiz/QuizSubmitBar"

function QuizPage() {
  const { id } = useParams()
  const { user } = useAuth()
  return (
    <QuizContent key={`${id}:${user?.id}:${user?.role}`} quizId={Number(id)} />
  )
}

function QuizContent({ quizId }: { quizId: number }) {
  const {
    retryLoad, retryCompletion, quiz, answers, result, completionStatus, loading, submitting, error,
    questions, answeredCount, allAnswered, answeredPercentage, selectAnswer, submit, tryAgain,
  } = useQuiz(quizId)

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return <p role="alert" className="text-sm text-red-700">Invalid quiz</p>
  }

  if (loading || (quiz && quiz.id !== quizId)) {
    return (
      <LoadingState label="Loading quiz...">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="h-10 w-2/3 rounded bg-slate-200" />
          <div className="h-5 w-1/2 rounded bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      </LoadingState>
    )
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-4xl"><ErrorMessage onRetry={retryLoad}>{error || "Quiz not found"}</ErrorMessage></div>
    )
  }

  if (result) {
    return (
      <QuizResultPanel
        quizId={quiz.id}
        title={quiz.title}
        lessonId={quiz.lessonId}
        result={result}
        completionStatus={completionStatus}
        submitting={submitting}
        onTryAgain={tryAgain}
        onRetryCompletion={retryCompletion}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-4">
      <Link
        to={`/lessons/${quiz.lessonId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to lesson
      </Link>

      {quiz.lesson.course.status === "DRAFT" && (
        <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Draft preview. Publish the course and enroll before submitting answers.
        </p>
      )}
      <header className="mt-8">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          Knowledge check
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {quiz.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Choose one answer for each question. A perfect score completes the
          lesson once recorded by the platform.
        </p>
      </header>

      {questions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No questions available yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            This quiz cannot be submitted until questions are added.
          </p>
          <Link
            to={`/lessons/${quiz.lessonId}`}
            className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Back to lesson →
          </Link>
        </div>
      ) : (
        <>
          <QuizProgressPanel
            questionCount={questions.length}
            answeredCount={answeredCount}
            answeredPercentage={answeredPercentage}
          />

          {error && (
            <div className="mt-5"><ErrorMessage>{error}</ErrorMessage></div>
          )}

          <div className="mt-6 space-y-5">
            {questions.map((question, index) => (
              <QuizQuestionCard
                key={question.id}
                question={question}
                index={index}
                selectedOptionId={answers[question.id]}
                submitting={submitting}
                onSelectAnswer={selectAnswer}
              />
            ))}
          </div>

          <QuizSubmitBar
            questionCount={questions.length}
            answeredCount={answeredCount}
            allAnswered={allAnswered}
            published={quiz.lesson.course.status === "PUBLISHED"}
            submitting={submitting}
            onSubmit={submit}
          />
        </>
      )}
    </div>
  )
}

export default QuizPage
