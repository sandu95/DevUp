import { Link } from "react-router-dom"

function HomePage() {
  return (
    <div className="bg-[#f7f7f5]">
      {/* Hero */}
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* Content */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Learn programming
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Learn to build.
            <br />
            <span className="text-slate-400">
              Build to grow.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            DevUp helps you develop practical programming
            skills through structured courses, focused lessons,
            quizzes and measurable progress.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Explore courses
            </Link>

            <Link
              to="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
            <span>Structured courses</span>
            <span>Interactive quizzes</span>
            <span>Progress tracking</span>
          </div>
        </div>

        {/* Platform preview */}
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              </div>

              <span className="text-xs font-medium text-slate-400">
                DevUp
              </span>
            </div>

            <div className="p-6 sm:p-8">
              {/* Dashboard heading */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Dashboard
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Continue where you left off.
                </p>
              </div>

              {/* Continue course */}
              <div className="mt-7 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Continue learning
                    </p>

                    <h3 className="mt-1 font-semibold text-slate-950">
                      JavaScript Fundamentals
                    </h3>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                    68%
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[68%] rounded-full bg-indigo-600" />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>17 of 25 lessons</span>
                  <span>In progress</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-bold text-slate-950">
                    3
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Courses
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-bold text-slate-950">
                    24
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Lessons
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-bold text-slate-950">
                    68%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Progress
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Accent element */}
          <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:block">
            <p className="text-xs font-medium text-slate-400">
              Learning progress
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-950">
              Keep going
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              How DevUp works
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Everything you need to learn consistently.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Follow a clear learning path instead of jumping
              between disconnected tutorials.
            </p>
          </div>

          <div className="mt-12 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-3">
            <div>
              <span className="text-sm font-semibold text-indigo-600">
                01
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Choose a course
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Explore programming courses and choose the one
                that matches your learning goals.
              </p>
            </div>

            <div>
              <span className="text-sm font-semibold text-indigo-600">
                02
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Learn through lessons
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Work through focused lessons designed to build
                your knowledge step by step.
              </p>
            </div>

            <div>
              <span className="text-sm font-semibold text-indigo-600">
                03
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Test and track
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete quizzes and monitor your progress as
                you move through each course.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 sm:flex-row sm:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready to start learning?
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Explore the available courses and start building
              your programming skills.
            </p>
          </div>

          <Link
            to="/catalog"
            className="shrink-0 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Explore courses
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage