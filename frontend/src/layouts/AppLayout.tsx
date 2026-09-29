import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean
  }) =>
    [
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    ].join(" ")

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-20 items-center border-b border-slate-100 px-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                DevUp
              </h1>

              <p className="text-xs text-slate-400">
                Learning Platform
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </p>

            <nav className="space-y-1">
              <NavLink to="/" end className={navLinkClass}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  ⌂
                </span>
                Dashboard
              </NavLink>

              <NavLink
                to="/courses"
                className={navLinkClass}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  ◫
                </span>
                Courses
              </NavLink>

              {user?.role === "ADMIN" && (
                <NavLink
                  to="/admin"
                  className={navLinkClass}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    ⚙
                  </span>
                  Admin
                </NavLink>
              )}
            </nav>

            <div className="mt-auto">
              <div className="mb-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                    {user?.name
                      ?.charAt(0)
                      .toUpperCase() ?? "U"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {user?.name}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="ml-64 flex min-h-screen flex-1 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
            <div>
              <p className="text-sm text-slate-400">
                Welcome back
              </p>

              <h2 className="text-lg font-semibold text-slate-900">
                {user?.name}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  user?.role === "ADMIN"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-emerald-100 text-emerald-700",
                ].join(" ")}
              >
                {user?.role}
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                {user?.name
                  ?.charAt(0)
                  .toUpperCase() ?? "U"}
              </div>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout