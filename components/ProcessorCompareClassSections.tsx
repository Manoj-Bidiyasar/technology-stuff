"use client";

import { useState } from "react";
import Link from "next/link";

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

function getChipTileMeta(name: string, vendor: string): { brand: string; tone: string; edge: string } {
  const lower = name.toLowerCase();
  if ((/qualcomm/i.test(vendor) || /snapdragon/i.test(name)) && /elite/i.test(name)) {
    return {
      brand: "SNAPDRAGON",
      tone: "bg-gradient-to-br from-[#090d14] via-[#1a1b1e] to-[#6b4a17] text-[#ffe8b2]",
      edge: "shadow-[0_0_0_1px_rgba(244,198,105,0.85),0_0_22px_rgba(245,175,73,0.5),0_0_34px_rgba(255,208,120,0.35)]",
    };
  }
  if (/qualcomm/i.test(vendor) || /snapdragon/i.test(name)) {
    return {
      brand: "SNAPDRAGON",
      tone: "bg-gradient-to-br from-[#101726] via-[#1f2b40] to-[#5e4523] text-[#f7e2b5]",
      edge: "shadow-[0_0_0_1px_rgba(212,172,98,0.65),0_0_14px_rgba(196,146,52,0.3),0_0_26px_rgba(59,130,246,0.2)]",
    };
  }
  if (/samsung/i.test(vendor) || /exynos/i.test(lower)) {
    return {
      brand: "SAMSUNG",
      tone: "bg-gradient-to-br from-[#070d1b] via-[#101b33] to-[#0c1324] text-[#dbeafe]",
      edge: "shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_18px_rgba(37,99,235,0.35),0_0_32px_rgba(59,130,246,0.25)]",
    };
  }
  if (/apple/i.test(vendor) || /^apple\s+/i.test(name)) {
    return {
      brand: "APPLE",
      tone: "bg-gradient-to-br from-[#0b1020] via-[#1a2442] to-[#2b3f70] text-[#e5eefc]",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.7),0_0_18px_rgba(59,130,246,0.28),0_0_30px_rgba(148,163,184,0.2)]",
    };
  }
  if (/mediatek/i.test(vendor) || /dimensity|helio/i.test(lower)) {
    return {
      brand: "MEDIATEK",
      tone: "bg-gradient-to-br from-[#060b14] via-[#0a1322] to-[#12294a] text-[#f8e9c2]",
      edge: "shadow-[0_0_0_1px_rgba(245,188,96,0.75),0_0_18px_rgba(255,170,82,0.45),0_0_32px_rgba(59,130,246,0.35)]",
    };
  }
  return {
    brand: vendor.toUpperCase(),
    tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
    edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.55),0_0_18px_rgba(100,116,139,0.2)]",
  };
}

function getChipSeriesInfo(name: string, vendor: string): { line1: string; line2?: string; isPremium?: boolean } | null {
  const n = String(name || "").trim();
  if (/qualcomm/i.test(vendor) || /snapdragon/i.test(n)) {
    const m = n.match(/snapdragon\s+(.+)$/i);
    const suffix = String(m?.[1] || "").trim();
    if (suffix) return { line1: suffix.toUpperCase(), isPremium: /elite/i.test(suffix) };
    return { line1: "SNAPDRAGON" };
  }
  if (/mediatek/i.test(vendor) || /dimensity|helio/i.test(n)) {
    const d = n.match(/dimensity\s+(.+)$/i);
    if (d?.[1]) return { line1: "DIMENSITY", line2: d[1].trim().toUpperCase(), isPremium: true };
    const h = n.match(/helio\s+(.+)$/i);
    if (h?.[1]) return { line1: "HELIO", line2: h[1].trim().toUpperCase() };
    return { line1: "MEDIATEK" };
  }
  if (/samsung/i.test(vendor) || /exynos/i.test(n)) {
    const ex = n.match(/exynos\s+(.+)$/i);
    return ex?.[1] ? { line1: "EXYNOS", line2: ex[1].trim().toUpperCase() } : { line1: "EXYNOS" };
  }
  if (/apple/i.test(vendor) || /^apple\s+/i.test(n)) {
    const ap = n.match(/^apple\s+(.+)$/i);
    return ap?.[1] ? { line1: ap[1].trim().toUpperCase(), isPremium: true } : { line1: "A-SERIES", isPremium: true };
  }
  return null;
}

function CompareCard({ item }: { item: PairItem }) {
  const leftTile = getChipTileMeta(item.leftRawName, item.leftVendor);
  const rightTile = getChipTileMeta(item.rightRawName, item.rightVendor);
  const leftSeries = getChipSeriesInfo(item.leftRawName, item.leftVendor);
  const rightSeries = getChipSeriesInfo(item.rightRawName, item.rightVendor);

  function miniVisual(
    tile: ReturnType<typeof getChipTileMeta>,
    series: ReturnType<typeof getChipSeriesInfo>
  ) {
    const exynos = tile.brand === "SAMSUNG";
    const unisoc = tile.brand === "UNISOC";
    const apple = tile.brand === "APPLE";
    const google = tile.brand === "GOOGLE";

    const brandClass = exynos
      ? "bg-none text-white"
      : unisoc
        ? "bg-none text-[#d1fae5]"
        : apple
          ? "bg-none text-[#f3f7ff]"
          : "bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] text-transparent";

    const brandPosClass = exynos ? "left-2 top-1/2 text-left" : "left-1/2 top-1/2 -translate-x-1/2 text-center";
    const brandSizeClass = exynos ? "text-[11px]" : unisoc ? "text-[11px]" : apple ? "text-[12px]" : google ? "text-[12px]" : "text-[10px]";

    const seriesClass = series?.isPremium
      ? "font-bold uppercase tracking-[0.08em] text-[#f6c874]"
      : exynos
        ? "font-bold uppercase tracking-[0.04em] text-slate-100"
        : unisoc
          ? "font-bold uppercase tracking-[0.04em] text-emerald-100"
          : apple
            ? "font-bold uppercase tracking-[0.04em] text-slate-100"
            : "font-semibold tracking-[0.02em] text-slate-100";

    const seriesLine2Class = series?.isPremium
      ? "font-black uppercase tracking-[0.04em] text-[#ffe3a9]"
      : exynos
        ? "font-black uppercase tracking-[0.02em] text-white"
        : unisoc
          ? "font-black uppercase tracking-[0.03em] text-emerald-50"
          : apple
            ? "font-black uppercase tracking-[0.03em] text-white"
            : "font-semibold tracking-[0.02em] text-slate-200";

    return (
      <span className={`relative inline-flex h-[74px] w-[74px] shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-[92px] sm:w-[92px] ${tile.tone} ${tile.edge}`}>
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
        <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
        <span className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
        <span className="relative h-full w-full p-1.5">
          <span className={`absolute -translate-y-1/2 overflow-hidden whitespace-nowrap bg-clip-text font-black uppercase leading-none tracking-[0.04em] ${brandClass} ${brandPosClass} ${brandSizeClass}`}>
            {tile.brand}
          </span>
          {series ? (
            <span className={`absolute bottom-2 ${exynos || unisoc ? "right-1.5 max-w-[66%] text-right" : "right-1.5 max-w-[70%] text-right"} leading-tight`}>
              <span className={`block truncate text-[9px] ${seriesClass}`}>{series.line1}</span>
              {series.line2 ? <span className={`block truncate text-[9px] ${seriesLine2Class}`}>{series.line2}</span> : null}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center text-center">
          {miniVisual(leftTile, leftSeries)}
          <p className="mt-1.5 line-clamp-2 text-xs font-extrabold text-slate-900 group-hover:text-blue-700">{item.left}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">VS</span>
        <div className="flex flex-col items-center text-center">
          {miniVisual(rightTile, rightSeries)}
          <p className="mt-1.5 line-clamp-2 text-xs font-extrabold text-slate-900 group-hover:text-blue-700">{item.right}</p>
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
    <section className="mt-5 panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full bg-gradient-to-r ${tone.stripe}`} />
          <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">{group.chipClass}</h2>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tone.badge}`}>{group.items.length} matchups</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
