export default function MobileLoading() {
  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="h-8 w-44 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 lg:w-[560px]" />
        </div>
        <div className="mt-2 h-5 w-full max-w-4xl animate-pulse rounded bg-slate-100" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel h-fit p-4 lg:sticky lg:top-20">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`filter-skeleton-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-9 w-full animate-pulse rounded-lg bg-white" />
                <div className="mt-2 h-9 w-full animate-pulse rounded-lg bg-white" />
              </div>
            ))}
          </div>
        </aside>

        <div>
          <section className="panel mb-4 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-6 w-72 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-9 w-48 animate-pulse rounded bg-slate-100" />
            </div>
          </section>

          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <article key={`card-skeleton-${idx}`} className="panel overflow-hidden p-4">
                <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)]">
                  <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
                  <div className="space-y-3">
                    <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
