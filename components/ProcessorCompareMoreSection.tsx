"use client";

import Link from "next/link";
import ProcessorChipVisual from "@/components/ProcessorChipVisual";
import ProcessorNameLabel from "@/components/ProcessorNameLabel";

type MatchupItem = {
  slug: string;
  leftSlug: string;
  rightSlug: string;
  leftVendor: string;
  rightVendor: string;
  leftName: string;
  rightName: string;
};

export default function ProcessorCompareMoreSection({ items }: { items: MatchupItem[] }) {
  const initial = 6;
  const visible = items.slice(0, initial);
  const canExpand = items.length > initial;

  if (!items.length) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-50 px-4 py-3">
        <h2 className="text-xl font-bold text-slate-900">Head-to-Head Matchups</h2>
      </div>
      <ol className="grid grid-cols-1 gap-3 px-4 pb-1 pt-4 md:grid-cols-2">
        {visible.map((item, idx) => (
          <li key={`${item.slug}-${idx}`}>
            <Link
              href={`/processors/compare/${item.slug}`}
              className="block rounded-xl border border-slate-200 bg-white px-3 pb-0.5 pt-3 hover:border-blue-300 max-[360px]:px-2 max-[360px]:pt-2"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] items-start gap-2">
                <div className="flex w-full min-w-0 flex-col items-center text-center">
                  <ProcessorChipVisual name={item.leftName} vendor={item.leftVendor} className="h-24 w-24 max-[360px]:h-20 max-[360px]:w-20" />
                  <ProcessorNameLabel
                    name={item.leftName}
                    vendor={item.leftVendor}
                    allowSingleLine={false}
                    className="mt-2 min-h-[2.3rem] text-slate-900 max-[360px]:mt-1 max-[360px]:min-h-[2rem] sm:min-h-0"
                    lineClassName="text-[9px] font-extrabold leading-tight max-[360px]:text-[9px] sm:text-sm"
                  />
                </div>
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-black text-blue-700 max-[360px]:h-8 max-[360px]:w-8 max-[360px]:text-xs">VS</span>
                <div className="flex w-full min-w-0 flex-col items-center text-center">
                  <ProcessorChipVisual name={item.rightName} vendor={item.rightVendor} className="h-24 w-24 max-[360px]:h-20 max-[360px]:w-20" />
                  <ProcessorNameLabel
                    name={item.rightName}
                    vendor={item.rightVendor}
                    allowSingleLine={false}
                    className="mt-2 min-h-[2.3rem] text-slate-900 max-[360px]:mt-1 max-[360px]:min-h-[2rem] sm:min-h-0"
                    lineClassName="text-[9px] font-extrabold leading-tight max-[360px]:text-[9px] sm:text-sm"
                  />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      {canExpand ? (
        <div className="flex justify-center px-4 pb-4">
          <Link
            href="/processors/compare"
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            More
          </Link>
        </div>
      ) : null}
    </section>
  );
}
