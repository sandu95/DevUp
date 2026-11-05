export function CourseGridSkeleton() {
  return (
    <div role="status" aria-label="Loading courses">
      <span className="sr-only">Loading courses...</span>
      <div aria-hidden="true" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="aspect-video animate-pulse bg-slate-100 motion-reduce:animate-none" />
            <div className="space-y-4 p-6">
              <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
              <div className="h-16 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
              <div className="h-11 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
