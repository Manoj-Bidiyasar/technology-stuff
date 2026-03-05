"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ComparisonPair = {
  left: {
    slug: string;
    name: string;
    images?: string[];
  };
  right: {
    slug: string;
    name: string;
    images?: string[];
  };
};

type Props = {
  pairs: ComparisonPair[];
  initialVisible?: number;
  compareBasePath?: string;
};

export default function RelatedComparisons({ pairs, initialVisible = 14, compareBasePath = "/compare" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visiblePairs = useMemo(
    () => (expanded ? pairs : pairs.slice(0, initialVisible)),
    [expanded, pairs, initialVisible]
  );
  const hiddenCount = Math.max(0, pairs.length - initialVisible);

  if (pairs.length === 0) return null;

  return (
    <section className="mt-4 panel p-4">
      <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900">Related Comparisons</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visiblePairs.map((pair, index) => (
          <Link
            key={`related-compare-${index}-${pair.left.slug}-${pair.right.slug}`}
            href={`${compareBasePath}/${pair.left.slug}-vs-${pair.right.slug}`}
            className="group grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-center rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pair.left.images?.[0] || "/placeholder-mobile.svg"}
                alt={pair.left.name}
                className="h-11 w-8 rounded object-cover"
              />
              <p className="line-clamp-2 text-sm font-medium text-slate-900">{pair.left.name}</p>
            </div>
            <span className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-extrabold text-white">
              VS
            </span>
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pair.right.images?.[0] || "/placeholder-mobile.svg"}
                alt={pair.right.name}
                className="h-11 w-8 rounded object-cover"
              />
              <p className="line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-blue-700">{pair.right.name}</p>
            </div>
          </Link>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? "Show less" : `View more (${hiddenCount})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
