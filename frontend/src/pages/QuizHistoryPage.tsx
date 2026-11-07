import { useSearchParams } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useQuizAttempts } from "../hooks/useQuizAttempts"
import { QuizAttemptCard } from "../components/quiz/QuizAttemptCard"
import { Button, ButtonLink } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { LoadingState } from "../components/ui/LoadingState"
import { PageHeader } from "../components/ui/PageHeader"

export default function QuizHistoryPage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const filters = params.getAll("quizId")
  const quizId = filters.length === 0 ? undefined : Number(filters[0])
  if (filters.length > 1 || (quizId !== undefined &&
    (!Number.isInteger(quizId) || quizId <= 0 || quizId > 2147483647))) {
    return (
      <div className="space-y-4">
        <PageHeader autoFocus eyebrow="Your learning" title="Quiz history" description="Choose a quiz from your saved attempts to review its history." />
        <ErrorMessage>Invalid quiz filter.</ErrorMessage>
        <ButtonLink to="/quiz-history" variant="secondary">View all attempts</ButtonLink>
      </div>
    )
  }
  return <QuizHistoryContent key={`${user?.id}:${quizId ?? "all"}`} quizId={quizId} />
}

function QuizHistoryContent({ quizId }: { quizId?: number }) {
  const { attempts, loading, error, refresh } = useQuizAttempts(quizId)
  const filtered = quizId !== undefined
  return (
    <div className="space-y-8">
      <PageHeader autoFocus eyebrow="Your learning" title="Quiz history" description="Review your saved attempts, newest first. Recorded scores describe individual attempts; lesson completion is tracked separately." />
      <div className="flex flex-wrap items-center gap-3">
        {filtered && <ButtonLink to="/quiz-history" variant="secondary">View all attempts</ButtonLink>}
        <Button variant="secondary" onClick={refresh} disabled={loading} aria-busy={loading}>Refresh history</Button>
      </div>
      {loading ? <LoadingState label="Loading your quiz history..." /> : error ? (
        <ErrorMessage onRetry={refresh}>{error}</ErrorMessage>
      ) : (
        <section aria-label="Quiz attempts" className="space-y-4">
          <p role="status" className="text-sm text-slate-600">
            {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
            {filtered && (attempts[0] ? ` for ${attempts[0].quiz.title}` : " for the selected quiz")}
          </p>
          {attempts.length === 0 ? (
            <EmptyState title={filtered ? "No attempts for this quiz yet" : "No quiz attempts yet"} description="Submit a quiz to see its recorded score here." action={<ButtonLink to="/courses">Explore courses</ButtonLink>} />
          ) : (
            <ul className="space-y-4">
              {attempts.map((attempt) => <li key={attempt.id}><QuizAttemptCard attempt={attempt} filtered={filtered} /></li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
