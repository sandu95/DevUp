import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { User } from "../types/auth"
import { api } from "../services/api"
import { AuthContext } from "./useAuth"

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
  const sessionRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    sessionRequest.current = controller

    const checkSession = async () => {
      const storedToken = localStorage.getItem("token")

      if (!storedToken) {
        setAuthLoading(false)
        return
      }

      try {
        const response = await api<{ user: User }>("/users/me", { signal })

        if (signal.aborted || localStorage.getItem("token") !== storedToken) return

        setToken(storedToken)
        setUser(response.user)

        localStorage.setItem(
          "user",
          JSON.stringify(response.user)
        )

      } catch (error) {
        if (signal.aborted || localStorage.getItem("token") !== storedToken) return
        const status = (
          error as Error & { status?: number }
        ).status

        if (status === 401 || status === 404) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")

          setToken(null)
          setUser(null)
        }
      } finally {
        if (!signal.aborted) setAuthLoading(false)
      }
    }

    void checkSession()
    return () => controller.abort()
  }, [])

  const login = (token: string, user: User) => {
    sessionRequest.current?.abort()
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))

    setToken(token)
    setUser(user)
    setAuthLoading(false)
  }

  const logout = () => {
    sessionRequest.current?.abort()
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    setToken(null)
    setUser(null)
    setAuthLoading(false)
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
