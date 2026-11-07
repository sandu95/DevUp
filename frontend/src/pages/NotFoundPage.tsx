import { useAuth } from "../context/useAuth"
import { PageHeader } from "../components/ui/PageHeader"
import { ButtonLink } from "../components/ui/Button"

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8">
      <PageHeader autoFocus eyebrow="404" title="Page not found" description="That page doesn't exist. Choose a destination to continue." />
      <div className="flex flex-wrap gap-3">
        <ButtonLink to={isAuthenticated ? "/courses" : "/catalog"}>{isAuthenticated ? "Explore courses" : "Browse courses"}</ButtonLink>
        <ButtonLink variant="secondary" to={isAuthenticated ? "/dashboard" : "/"}>{isAuthenticated ? "Go to dashboard" : "Back to home"}</ButtonLink>
      </div>
    </div>
  )
}
