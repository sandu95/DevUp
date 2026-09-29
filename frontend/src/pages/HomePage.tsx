import { Link } from "react-router-dom"

function HomePage() {
  return (
    <div>
      <section className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Learn programming
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900">
            Build your programming skills step by step
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Explore structured courses, complete lessons,
            test your knowledge with quizzes and track your
            learning progress.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              to="/catalog"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Explore courses
            </Link>

            <Link
              to="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-indigo-50 p-6">
              <p className="text-2xl font-bold text-indigo-700">
                Courses
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Structured learning content.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-6">
              <p className="text-2xl font-bold text-emerald-700">
                Lessons
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Learn one topic at a time.
              </p>
            </div>

            <div className="rounded-2xl bg-violet-50 p-6">
              <p className="text-2xl font-bold text-violet-700">
                Quizzes
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Check your understanding.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-6">
              <p className="text-2xl font-bold text-amber-700">
                Progress
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Track completed lessons.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage