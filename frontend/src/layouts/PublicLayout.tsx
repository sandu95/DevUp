import { Link, NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function PublicLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-xl font-bold text-slate-900"
          >
            DevUp
          </Link>

          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Home
            </NavLink>

            <NavLink
              to="/catalog"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Courses
            </NavLink>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout