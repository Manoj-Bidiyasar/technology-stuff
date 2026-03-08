"use client";

import { useState } from "react";
import Link from "next/link";
import ProcessorChipVisual from "@/components/ProcessorChipVisual";
import ProcessorNameLabel from "@/components/ProcessorNameLabel";

type ChipClass = "Ultra Flagship" | "Flagship" | "Upper Midrange" | "Midrange" | "Budget" | "Entry";

type PairItem = {
  left: string;
  right: string;
  leftRawName: string;
  rightRawName: string;
  leftVendor: string;
  rightVendor: string;
  href: string;
  chipClass: ChipClass;
};

type GroupItem = {
  chipClass: ChipClass;
  items: PairItem[];
};

type Props = {
  grouped: GroupItem[];
};

function classTone(chipClass: ChipClass): { badge: string; stripe: string } {
  if (chipClass === "Ultra Flagship") return { badge: "bg-violet-100 text-violet-800 border-violet-200", stripe: "from-violet-500 to-indigo-500" };
  if (chipClass === "Flagship") return { badge: "bg-blue-100 text-blue-800 border-blue-200", stripe: "from-blue-500 to-cyan-500" };
  if (chipClass === "Upper Midrange") return { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", stripe: "from-emerald-500 to-teal-500" };
  if (chipClass === "Midrange") return { badge: "bg-amber-100 text-amber-800 border-amber-200", stripe: "from-amber-500 to-orange-500" };
  if (chipClass === "Budget") return { badge: "bg-orange-100 text-orange-800 border-orange-200", stripe: "from-orange-500 to-amber-500" };
  return { badge: "bg-slate-100 text-slate-700 border-slate-200", stripe: "from-slate-500 to-slate-400" };
}

function CompareCard({ item }: { item: PairItem }) {
  return (
    <Link
      href={item.href}
      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md max-[360px]:p-2 max-[320px]:p-1.5"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 max-[320px]:gap-1">
        <div className="flex flex-col items-center text-center">
          <ProcessorChipVisual name={item.leftRawName} vendor={item.leftVendor} className="h-[74px] w-[74px] max-[360px]:h-[68px] max-[360px]:w-[68px] max-[320px]:h-[62px] max-[320px]:w-[62px] sm:h-[92px] sm:w-[92px]" />
          <ProcessorNameLabel
            name={item.leftRawName}
            vendor={item.leftVendor}
            allowSingleLine={false}
            className="mt-1.5 min-h-[2.3rem] text-slate-900 group-hover:text-blue-700 max-[360px]:mt-1 max-[320px]:min-h-[2rem]"
            lineClassName="text-xs font-extrabold leading-tight max-[360px]:text-[11px] max-[320px]:text-[10px] max-[320px]:leading-3.5"
          />
        </div>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white max-[360px]:px-1.5 max-[360px]:text-[9px] max-[320px]:px-1 max-[320px]:text-[8px]">VS</span>
        <div className="flex flex-col items-center text-center">
          <ProcessorChipVisual name={item.rightRawName} vendor={item.rightVendor} className="h-[74px] w-[74px] max-[360px]:h-[68px] max-[360px]:w-[68px] max-[320px]:h-[62px] max-[320px]:w-[62px] sm:h-[92px] sm:w-[92px]" />
          <ProcessorNameLabel
            name={item.rightRawName}
            vendor={item.rightVendor}
            allowSingleLine={false}
            className="mt-1.5 min-h-[2.3rem] text-slate-900 group-hover:text-blue-700 max-[360px]:mt-1 max-[320px]:min-h-[2rem]"
            lineClassName="text-xs font-extrabold leading-tight max-[360px]:text-[11px] max-[320px]:text-[10px] max-[320px]:leading-3.5"
          />
        </div>
      </div>
    </Link>
  );
}

function GroupSection({ group }: { group: GroupItem }) {
  const [visible, setVisible] = useState(12);
  const tone = classTone(group.chipClass);
  const canLoadMore = group.items.length > visible;
  const shown = group.items.slice(0, visible);

  return (
    <section className="mt-5 panel p-4 max-[320px]:p-2.5 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 max-[320px]:mb-2">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full bg-gradient-to-r max-[320px]:h-2.5 max-[320px]:w-2.5 ${tone.stripe}`} />
          <h2 className="text-lg font-extrabold text-slate-900 max-[320px]:text-base sm:text-xl">{group.chipClass}</h2>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold max-[320px]:px-2 max-[320px]:py-0.5 max-[320px]:text-[10px] ${tone.badge}`}>{group.items.length} matchups</span>
      </div>

      <div className="grid gap-3 max-[320px]:gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((item, idx) => (
          <CompareCard key={`${item.href}-${idx}`} item={item} />
        ))}
      </div>

      {canLoadMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 12)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            Load More
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default function ProcessorCompareClassSections({ grouped }: Props) {
  return (
    <>
      {grouped.map((group) => (
        <GroupSection key={group.chipClass} group={group} />
      ))}
    </>
  );
}
