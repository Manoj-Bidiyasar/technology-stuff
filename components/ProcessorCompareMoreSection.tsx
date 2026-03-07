"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type MatchupItem = {
  slug: string;
  leftSlug: string;
  rightSlug: string;
  leftVendor: string;
  rightVendor: string;
  leftName: string;
  rightName: string;
};

function getChipTileMeta(name: string, vendor: string): { brand: string; series?: string; tone: string; edge: string } {
  const lower = name.toLowerCase();
  if ((/qualcomm/i.test(vendor) || /snapdragon/i.test(name)) && /elite/i.test(name)) {
    return {
      brand: "SNAPDRAGON",
      series: "ELITE",
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
      series: "EXYNOS",
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
      series: /dimensity/i.test(lower) ? "DIMENSITY" : "HELIO",
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

function miniVisual(name: string, vendor: string) {
  const tile = getChipTileMeta(name, vendor);
  const series = getChipSeriesInfo(name, vendor);
  return (
    <div className={`relative h-24 w-24 overflow-hidden rounded-md border border-white/10 ${tile.tone} ${tile.edge}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
      <div className="relative h-full p-2.5">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] bg-clip-text text-[10px] font-black uppercase leading-none tracking-[0.05em] text-transparent drop-shadow-[0_0_6px_rgba(255,210,120,0.35)]">
          {tile.brand}
        </div>
        {series ? (
          <div className="absolute bottom-2 right-2.5 max-w-[62%] text-right leading-tight">
            <span className={`block text-[8px] ${series.isPremium ? "font-bold uppercase tracking-[0.08em] text-[#f6c874]" : "font-semibold tracking-[0.02em] text-slate-100"}`}>{series.line1}</span>
            {series.line2 ? <span className={`block text-[9px] ${series.isPremium ? "font-black uppercase tracking-[0.04em] text-[#ffe3a9]" : "font-semibold tracking-[0.02em] text-slate-200"}`}>{series.line2}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ProcessorCompareMoreSection({ items }: { items: MatchupItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const initial = 6;
  const visible = useMemo(() => (expanded ? items : items.slice(0, initial)), [expanded, items]);
  const canExpand = items.length > initial;

  if (!items.length) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-50 px-4 py-3">
        <h2 className="text-xl font-bold text-slate-900">Head-to-Head Matchups</h2>
      </div>
      <ol className="grid grid-cols-1 gap-3 px-4 pt-4 pb-1 md:grid-cols-2">
        {visible.map((item, idx) => (
          <li key={`${item.slug}-${idx}`}>
            <Link
              href={`/processors/compare/${item.slug}`}
              className="block rounded-xl border border-slate-200 bg-white px-3 pt-3 pb-0.5 hover:border-blue-300"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] items-start gap-2">
                <div className="flex flex-col items-center text-center">
                  {miniVisual(item.leftName, item.leftVendor)}
                  <span className="mt-2 block min-h-[2.3rem] text-xs font-extrabold leading-tight text-slate-900 sm:min-h-0 sm:text-sm">{item.leftName}</span>
                </div>
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">VS</span>
                <div className="flex flex-col items-center text-center">
                  {miniVisual(item.rightName, item.rightVendor)}
                  <span className="mt-2 block min-h-[2.3rem] text-xs font-extrabold leading-tight text-slate-900 sm:min-h-0 sm:text-sm">{item.rightName}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      {canExpand ? (
        <div className="flex justify-center px-4 pb-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            {expanded ? "Show Less" : "More"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
