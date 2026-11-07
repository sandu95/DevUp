import { useAuth } from "../context/useAuth"
import { LoadingState } from "../components/ui/LoadingState"
import AppLayout from "./AppLayout"
import PublicLayout from "./PublicLayout"

export default function NotFoundLayout() {
  const { isAuthenticated, authLoading } = useAuth()
  if (authLoading) return <LoadingState />
  return isAuthenticated ? <AppLayout /> : <PublicLayout />
}
