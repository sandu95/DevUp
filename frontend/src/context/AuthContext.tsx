import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { User } from "../types/auth"
import { api } from "../services/api"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  authLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
)

export const AuthProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [user, setUser] = useState<User | null>(null)

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  )

  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = localStorage.getItem("token")

      if (!storedToken) {
        setAuthLoading(false)
        return
      }

      try {
        const response = await api<{ user: User }>("/users/me")

        setToken(storedToken)
        setUser(response.user)

        localStorage.setItem(
          "user",
          JSON.stringify(response.user)
        )

      } catch (error) {
        const status = (
          error as Error & { status?: number }
        ).status

        if (status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")

          setToken(null)
          setUser(null)
        }
      } finally {
        setAuthLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = (token: string, user: User) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))

    setToken(token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        authLoading,
        isAuthenticated: Boolean(user && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    )
  }

  return context
}