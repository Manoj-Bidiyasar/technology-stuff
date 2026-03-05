"use client";

import { Children, type ReactNode, useMemo, useState } from "react";

type Props = {
  children: ReactNode;
  pageSize?: number;
};

export default function RelatedPhonesCarousel({ children, pageSize = 4 }: Props) {
  const items = useMemo(() => Children.toArray(children), [children]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, totalPages - 1);
  const visible = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      {totalPages > 1 ? (
        <>
          {safePage > 0 ? (
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="absolute -left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
              aria-label="Previous related phones"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="m14.5 6.5-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          {safePage < totalPages - 1 ? (
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              className="absolute -right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
              aria-label="Next related phones"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="m9.5 6.5 5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visible}</div>
    </div>
  );
}
