"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mobile-container py-8">
      <section className="panel p-5">
        <h2 className="text-xl font-bold text-rose-700">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">{error.message || "Unexpected error"}</p>
        <button onClick={reset} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </section>
    </main>
  );
}
