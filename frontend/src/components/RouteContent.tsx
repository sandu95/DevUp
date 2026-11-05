import { Component, Suspense, type ReactNode } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Button } from "./ui/Button"

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="mx-auto max-w-xl space-y-4 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Unable to load this page</h1>
          <p className="text-slate-600">Please reload the page to try again.</p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      )
    }

    return this.props.children
  }
}

export function RouteContent() {
  const { pathname } = useLocation()

  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Loading page...</p>}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  )
}
