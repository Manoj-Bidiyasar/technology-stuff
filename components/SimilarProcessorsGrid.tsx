"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SimilarCard = {
  slug: string;
  antutu?: number;
  fullName: string;
  tile: {
    brand: string;
    tone: string;
    edge: string;
    series?: string;
  };
  series: {
    line1: string;
    line2?: string;
    isPremium?: boolean;
  } | null;
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

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {visible.map((item) => {
          const itemExynos = item.tile.brand === "SAMSUNG";
          const itemUnisoc = item.tile.brand === "UNISOC";
          const itemApple = item.tile.brand === "APPLE";
          const itemSnap7Gen = item.tile.series === "7 GEN";
          const itemSnap7Legacy = item.tile.series === "7 SERIES";
          const itemBrandClass = itemSnap7Gen
            ? "bg-none text-[#e0162d]"
            : itemSnap7Legacy
              ? "bg-none text-[#ff5667]"
              : itemExynos
                ? "bg-none text-white"
                : itemUnisoc
                  ? "bg-none text-[#d1fae5]"
                  : itemApple
                    ? "bg-none text-[#f3f7ff]"
                    : "bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] text-transparent";
          const itemBrandPosClass = itemExynos ? "left-3 top-1/2 text-left" : "left-1/2 top-1/2 -translate-x-1/2 text-center";
          const itemBrandSizeClass = itemExynos ? "text-[16px]" : itemUnisoc ? "text-[15px]" : itemApple ? "text-[17px]" : "text-[13px]";
          const itemSeriesClass = item.series?.isPremium
            ? "font-bold uppercase tracking-[0.08em] text-[#f6c874]"
            : itemSnap7Gen
              ? "font-bold tracking-[0.03em] text-[#e0162d]"
              : itemSnap7Legacy
                ? "font-semibold tracking-[0.03em] text-[#ff7b88]"
                : itemExynos
                  ? "font-bold uppercase tracking-[0.04em] text-slate-100"
                  : itemUnisoc
                    ? "font-bold uppercase tracking-[0.04em] text-emerald-100"
                    : itemApple
                      ? "font-bold uppercase tracking-[0.04em] text-slate-100"
                      : "font-semibold tracking-[0.02em] text-slate-100";
          const itemSeriesLine2Class = item.series?.isPremium
            ? "font-black uppercase tracking-[0.04em] text-[#ffe3a9]"
            : itemSnap7Gen
              ? "font-bold uppercase tracking-[0.04em] text-[#b90f22]"
              : itemSnap7Legacy
                ? "font-bold uppercase tracking-[0.04em] text-[#ff5d72]"
                : itemExynos
                  ? "font-black uppercase tracking-[0.02em] text-white"
                  : itemUnisoc
                    ? "font-black uppercase tracking-[0.03em] text-emerald-50"
                    : itemApple
                      ? "font-black uppercase tracking-[0.03em] text-white"
                      : "font-semibold tracking-[0.02em] text-slate-200";

          return (
            <Link
              key={item.slug}
              href={`/processors/${item.slug}`}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 hover:border-blue-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`relative h-24 w-24 overflow-hidden rounded-md border border-white/10 sm:h-28 sm:w-28 ${item.tile.tone} ${item.tile.edge}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
                  <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
                  {itemApple ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                      <svg viewBox="0 0 24 24" className="h-16 w-16 text-white/80" aria-hidden="true">
                        <path fill="currentColor" d="M16.37 12.2c.02 2.49 2.2 3.32 2.23 3.33-.02.06-.35 1.2-1.14 2.37-.68 1-1.39 1.99-2.5 2.01-1.1.02-1.45-.65-2.71-.65-1.27 0-1.65.63-2.69.67-1.07.04-1.9-1.08-2.58-2.08-1.4-2.03-2.47-5.73-1.03-8.24.71-1.25 1.98-2.03 3.35-2.05 1.04-.02 2.01.7 2.71.7.7 0 2-.86 3.37-.73.57.02 2.17.23 3.2 1.74-.08.05-1.9 1.11-1.88 3.23Zm-2.2-6.32c.57-.69.96-1.65.85-2.61-.82.03-1.81.54-2.39 1.23-.53.61-.99 1.59-.86 2.53.91.07 1.84-.46 2.4-1.15Z" />
                      </svg>
                    </div>
                  ) : null}
                  <div className="relative h-full p-2.5">
                    <div className={`absolute -translate-y-1/2 overflow-hidden whitespace-nowrap bg-clip-text font-black uppercase leading-none tracking-[0.05em] ${itemExynos || itemUnisoc ? "" : "drop-shadow-[0_0_6px_rgba(255,210,120,0.35)]"} ${itemBrandClass} ${itemBrandPosClass} ${itemBrandSizeClass}`}>
                      {item.tile.brand}
                    </div>
                    {item.series ? (
                      <div className={`absolute bottom-2.5 ${itemExynos ? "right-2.5 left-auto max-w-[62%] text-right" : itemUnisoc ? "right-2.5 left-auto max-w-[58%] text-right" : itemSnap7Gen || itemSnap7Legacy ? "right-2.5 left-auto max-w-[58%] text-right" : "right-2.5 max-w-[60%] text-right"} leading-tight`}>
                        <span className={`block text-[9px] ${itemSeriesClass}`}>{item.series.line1}</span>
                        {item.series.line2 ? <span className={`block text-[10px] ${itemSeriesLine2Class}`}>{item.series.line2}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 line-clamp-2 text-[1.03rem] font-extrabold leading-5 text-slate-900">{item.fullName}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{`AnTuTu: ${antutuLabel(item.antutu)}`}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
