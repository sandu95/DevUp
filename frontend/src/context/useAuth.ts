import { createContext, useContext } from "react"
import type { User } from "../types/auth"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  authLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
