import { useState } from "react"
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean
  }) =>
    [
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-slate-950 text-white"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ")

  const getInitial = () =>
    user?.name?.charAt(0).toUpperCase() ?? "U"

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <div className="flex min-h-screen">

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">

          {/* Logo */}
          <div className="flex h-20 items-center px-6">
            <NavLink
              to="/"
              end
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                D
              </div>

              <div>
                <p className="text-lg font-bold tracking-tight">
                  DevUp
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Learn. Build. Grow.
                </p>
              </div>
            </NavLink>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col px-4 py-6">

            <nav className="space-y-1">

              <NavLink
                to="/dashboard"
                end
                className={navLinkClass}
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                  />
                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                  />
                  <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                  />
                  <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                  />
                </svg>

                Dashboard
              </NavLink>

              <NavLink
                to="/courses"
                className={navLinkClass}
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M4 5.5v16" />
                  <path d="M8 7h8" />
                  <path d="M8 11h8" />
                </svg>

                Explore courses
              </NavLink>

              {user?.role === "ADMIN" && (
                <div className="pt-5">
                  <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Management
                  </p>

                  <NavLink
                    to="/admin"
                    className={navLinkClass}
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 3v3" />
                      <path d="M12 18v3" />
                      <path d="M3 12h3" />
                      <path d="M18 12h3" />
                      <path d="m5.6 5.6 2.1 2.1" />
                      <path d="m16.3 16.3 2.1 2.1" />
                      <path d="m18.4 5.6-2.1 2.1" />
                      <path d="m7.7 16.3-2.1 2.1" />
                      <circle
                        cx="12"
                        cy="12"
                        r="4"
                      />
                    </svg>

                    Administration
                  </NavLink>
                </div>
              )}
            </nav>

            {/* User */}
            <div className="mt-auto border-t border-slate-100 pt-5">

              <div className="flex items-center gap-3 px-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {getInitial()}
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
                className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
                </svg>

                Log out
              </button>

            </div>
          </div>
        </aside>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">

            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobileMenu}
              className="absolute inset-0 bg-slate-950/20"
            />

            <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">

              <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
                <NavLink
                  to="/"
                  end
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                    D
                  </div>

                  <span className="text-lg font-bold tracking-tight">
                    DevUp
                  </span>
                </NavLink>

                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-1 px-4 py-6">
                <NavLink
                  to="/dashboard"
                  end
                  onClick={closeMobileMenu}
                  className={navLinkClass}
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/courses"
                  onClick={closeMobileMenu}
                  className={navLinkClass}
                >
                  Explore courses
                </NavLink>

                {user?.role === "ADMIN" && (
                  <NavLink
                    to="/admin"
                    onClick={closeMobileMenu}
                    className={navLinkClass}
                  >
                    Administration
                  </NavLink>
                )}
              </nav>

              <div className="mt-auto border-t border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {getInitial()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user?.name}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main area */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">

          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>

            <div className="hidden lg:block">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Learning workspace
              </p>

              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">

              <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">
                {user?.role === "ADMIN"
                  ? "Administrator"
                  : "Student"}
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {getInitial()}
              </div>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
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