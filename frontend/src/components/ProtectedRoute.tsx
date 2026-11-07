import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { LoadingState } from "./ui/LoadingState"

interface ProtectedRouteProps {
  allowedRole?: "ADMIN" | "STUDENT"
}

export default function ProtectedRoute({
  allowedRole,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, authLoading } = useAuth()

  if (authLoading) {
    return <LoadingState label="Restoring your session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
