"use client";

import { useRef } from "react";
import Link from "next/link";

type InlineFilterRowProps = {
  title: string;
  chips: Array<{ label: string; href: string }>;
};

export default function InlineFilterRow({ title, chips }: InlineFilterRowProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  function scrollByAmount(amount: number) {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (!chips.length) return null;

  return (
    <article className="panel border-dashed p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-slate-900">{title}</p>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollByAmount(-260)}
            className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-extrabold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            aria-label="Scroll left"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(260)}
            className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-extrabold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            aria-label="Scroll right"
          >
            {">"}
          </button>
        </div>
      </div>

      <div ref={trackRef} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <Link
            key={`${title}-${chip.label}`}
            href={chip.href}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
