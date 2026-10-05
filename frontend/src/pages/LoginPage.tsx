import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { LoginResponse } from "../types/auth"
import { api } from "../services/api"
import { useAuth } from "../context/AuthContext"

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setError("")
    setLoading(true)

    try {
      const data = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      })

      login(data.token, data.user)

      if (data.user.role === "ADMIN") {
        navigate("/admin", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-8">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1fr_420px]">

          {/* Left side */}
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                  D
                </div>

                <span className="text-xl font-bold tracking-tight text-slate-950">
                  DevUp
                </span>
              </div>

              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Learning platform
              </p>

              <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight text-slate-950">
                Learn to build.
                <br />
                Build to grow.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                Develop practical programming skills through
                structured courses, interactive lessons and
                quizzes.
              </p>

              <div className="mt-10 flex gap-8 border-t border-slate-200 pt-8">
                <div>
                  <p className="text-2xl font-bold text-slate-950">
                    Courses
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Structured learning
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-slate-950">
                    Quizzes
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Check your knowledge
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-slate-950">
                    Progress
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Track your learning
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login card */}
          <div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <div className="mb-8">
                <div className="mb-6 flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                    D
                  </div>

                  <span className="text-xl font-bold tracking-tight text-slate-950">
                    DevUp
                  </span>
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue your learning journey.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                By signing in, you can access your courses,
                lessons and learning progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage