import { Link, NavLink } from "react-router-dom"
import { RouteContent } from "../components/RouteContent"
import { useAuth } from "../context/useAuth"
import { ButtonLink } from "../components/ui/Button"

function PublicLayout() {
  const { isAuthenticated } = useAuth()

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean
  }) =>
    [
      "text-sm font-medium transition-colors",
      isActive
        ? "text-slate-950"
        : "text-slate-500 hover:text-slate-950",
    ].join(" ")

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#f7f7f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3 lg:px-8">

          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white transition-transform group-hover:-translate-y-0.5">
              D
            </div>

            <span className="text-lg font-bold tracking-tight text-slate-950">
              DevUp
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-3 sm:gap-8">
            <NavLink
              to="/"
              end
              className={navLinkClass}
            >
              Home
            </NavLink>

            <NavLink
              to="/catalog"
              className={navLinkClass}
            >
              Courses
            </NavLink>

            {isAuthenticated ? (
              <ButtonLink
                to="/dashboard"
              >
                Dashboard
              </ButtonLink>
            ) : (
              <ButtonLink
                to="/login"
              >
                Log in
              </ButtonLink>
            )}
          </nav>
        </div>
      </header>

      <main>
        <RouteContent />
      </main>
    </div>
  )
}

export default PublicLayout
