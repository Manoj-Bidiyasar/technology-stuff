"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProcessorChipVisual from "@/components/ProcessorChipVisual";
import ProcessorNameLabel from "@/components/ProcessorNameLabel";

type SimilarCard = {
  slug: string;
  antutu?: number;
  fullName: string;
  rawName: string;
  vendor: string;
};

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "-";
  return String(Math.round(value));
}

export default function SimilarProcessorsGrid({ items }: { items: SimilarCard[] }) {
  const pageSize = 8;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const visible = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage]
  );

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div className="relative mt-3">
      {items.length > pageSize ? (
        <>
          {canPrev ? (
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="absolute -left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
              aria-label="Previous similar processors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="m14.5 6.5-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          {canNext ? (
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="absolute -right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
              aria-label="Next similar processors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="m9.5 6.5 5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-2 max-[360px]:gap-1.5 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
        {visible.map((item) => {
          return (
            <Link
              key={item.slug}
              href={`/processors/${item.slug}`}
              className="h-full rounded-xl border border-slate-200 bg-white px-2 py-2 hover:border-blue-300 max-[360px]:px-1.5 max-[360px]:py-1.5 sm:px-2.5 sm:py-2.5"
            >
              <div className="flex h-full flex-col items-center text-center">
                <ProcessorChipVisual name={item.rawName} vendor={item.vendor} className="h-[92px] w-[92px] max-[360px]:h-[80px] max-[360px]:w-[80px] sm:h-28 sm:w-28" />
                <ProcessorNameLabel
                  name={item.rawName}
                  vendor={item.vendor}
                  singleLineMaxChars={16}
                  className="mt-1.5 min-h-[2.6rem] leading-tight text-slate-900 max-[360px]:mt-1 max-[360px]:min-h-[2.2rem]"
                  lineClassName="text-[11px] font-medium tracking-tight max-[360px]:text-[10px] sm:text-[0.62rem] sm:leading-4 md:text-[0.7rem] md:leading-5 lg:text-[0.76rem]"
                />
                <div className="mt-1 text-xs font-semibold text-slate-500 max-[360px]:text-[10px]">{`AnTuTu: ${antutuLabel(item.antutu)}`}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
