export default function Loading() {
  return (
    <main className="mobile-container py-8">
      <section className="panel animate-pulse p-5">
        <div className="h-8 w-56 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-80 rounded bg-slate-200" />
      </section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="panel animate-pulse p-3">
            <div className="h-36 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
          </div>
        ))}
      </section>
    </main>
  );
}
