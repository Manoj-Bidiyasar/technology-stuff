import type { Metadata } from "next";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isValidElement, type ReactNode } from "react";
import ProcessorComments from "@/components/ProcessorComments";
import ProcessorChipVisual from "@/components/ProcessorChipVisual";
import ProcessorNameLabel from "@/components/ProcessorNameLabel";
import SectionChipNav from "@/components/SectionChipNav";
import SimilarProcessorsGrid from "@/components/SimilarProcessorsGrid";
import { getProcessorDetailBySlug, type ProcessorDetail } from "@/lib/processors/details";
import { listProcessorProfiles, type ProcessorProfile } from "@/lib/processors/profiles";
import { getProcessorAdminById } from "@/lib/firestore/processors";
import { getAdminViewerFromSessionToken } from "@/lib/auth/admin";
import { hasCapability } from "@/lib/admin/permissions";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { getPublicSiteUrl } from "@/lib/seo/site";
import { slugify } from "@/utils/slugify";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateStaticParams() {
  const profiles = await listProcessorProfiles();
  return profiles.slice(0, 100).map((p) => ({ slug: p.slug }));
}

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
});

function decimal(value?: number, digits = 1): string {
  if (!Number.isFinite(value)) return "-";
  return Number.isInteger(value) ? String(value) : (value as number).toFixed(digits);
}

function perfIndex(score: number): number {
  return Math.max(0, Math.min(100, Math.round((score / 3000000) * 100)));
}

function efficiency(nm?: number): number {
  if (!Number.isFinite(nm)) return 60;
  if ((nm as number) <= 3) return 94;
  if ((nm as number) <= 4) return 88;
  if ((nm as number) <= 5) return 80;
  if ((nm as number) <= 6) return 72;
  return 64;
}

function gaming(profile: ProcessorProfile): number {
  const base = perfIndex(profile.antutu || 0);
  const gpuBonus = profile.gpu ? 6 : 0;
  return Math.min(100, Math.round(base * 0.85 + gpuBonus));
}

function value(profile: ProcessorProfile): number {
  const usage = Math.min(100, (profile.phoneCount || 0) * 12);
  const avg = Math.min(100, Math.round((profile.avgPhoneScore || 0) * 10));
  return Math.round(avg * 0.7 + usage * 0.3);
}

function neighbors(target: ProcessorProfile, all: ProcessorProfile[]) {
  return all
    .filter((p) => p.slug !== target.slug)
    .map((p) => ({ ...p, gap: Math.abs((p.antutu || 0) - (target.antutu || 0)) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 8);
}

function tone(score: number): string {
  if (score >= 90) return "text-emerald-700";
  if (score >= 80) return "text-blue-700";
  if (score >= 70) return "text-amber-700";
  return "text-slate-700";
}

function bar(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-slate-400";
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className={`font-extrabold ${tone(value)}`}>{value}/100</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${bar(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function renderTitleIcon(kind: "bench" | "cpu" | "memory" | "graphics" | "display" | "connectivity" | "camera" | "power" | "chip"): ReactNode {
  switch (kind) {
    case "bench":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M5 19h14M7 16V9m5 7V5m5 11v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "cpu":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "memory":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="5" y="8" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11h2M12 11h2M16 11h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "graphics":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "display":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="4" y="6" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "chip":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 10.5h5v3h-5z" fill="currentColor" />
        </svg>
      );
    case "connectivity":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M4 9a12 12 0 0 1 16 0M7 12a8 8 0 0 1 10 0M10 15a4 4 0 0 1 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.4" fill="currentColor" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M12 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 5.8A7 7 0 1 0 15.5 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "camera":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
  }
}

function ModernSpecCards({
  title,
  titleIcon = "chip",
  rows,
  showEmptyRows = false,
}: {
  title?: string;
  titleIcon?: "bench" | "cpu" | "memory" | "graphics" | "display" | "connectivity" | "camera" | "power" | "chip";
  rows: Array<{ label: string; value: ReactNode; valueAlign?: "left" | "center"; labelAlign?: "top" | "center" }>;
  showEmptyRows?: boolean;
}) {
  const visibleRows = showEmptyRows ? rows : rows.filter((row) => hasValueNode(row.value));
  if (!visibleRows.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {title ? (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-700">
            {renderTitleIcon(titleIcon)}
          </span>
          <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-blue-700">{title}</h3>
        </div>
      ) : null}
      {visibleRows.map((row, idx) => {
        const hasValue = hasValueNode(row.value);
        const displayValue = hasValue ? row.value : (showEmptyRows ? "" : "-");
        return (
        <div
          key={`${row.label}-${idx}`}
          className={`grid grid-cols-2 items-stretch gap-0 sm:grid-cols-[230px_minmax(0,1fr)] ${
            idx !== visibleRows.length - 1 ? "border-b border-slate-200" : ""
          }`}
        >
          <div className="flex items-center justify-start bg-slate-100 px-3 py-2 text-left text-sm font-medium leading-6 text-slate-600 sm:px-4">{row.label}</div>
          <div className={`px-3 py-2 text-center text-[13px] font-semibold leading-5 text-slate-900 sm:px-4 sm:text-sm sm:leading-6 ${row.valueAlign === "center" ? "sm:text-center" : "sm:text-left"}`}>{displayValue}</div>
        </div>
      );
      })}
    </div>
  );
}

function getChipClass(antutu?: number, explicitClass?: string): string {
  const explicit = String(explicitClass || "").trim();
  if (explicit) return explicit;
  const score = Number(antutu || 0);
  if (score >= 2800000) return "Ultra Flagship";
  if (score >= 1800000) return "Flagship";
  if (score >= 1300000) return "Upper Midrange";
  if (score >= 900000) return "Midrange";
  if (score >= 550000) return "Budget";
  return "Entry";
}

function chipClassBadgeTone(chipClass: string): string {
  const key = chipClass.toLowerCase();
  if (key.includes("ultra")) return "border-indigo-300/80 bg-gradient-to-r from-indigo-500/15 to-violet-500/20 text-indigo-800 ring-1 ring-indigo-200/70 shadow-indigo-200/70";
  if (key.includes("flagship")) return "border-blue-300/80 bg-gradient-to-r from-blue-500/15 to-cyan-500/20 text-blue-800 ring-1 ring-blue-200/70 shadow-blue-200/70";
  if (key.includes("upper")) return "border-emerald-300/80 bg-gradient-to-r from-emerald-500/15 to-teal-500/20 text-emerald-800 ring-1 ring-emerald-200/70 shadow-emerald-200/70";
  if (key.includes("midrange")) return "border-amber-300/80 bg-gradient-to-r from-amber-500/15 to-yellow-500/20 text-amber-800 ring-1 ring-amber-200/70 shadow-amber-200/70";
  if (key.includes("budget")) return "border-orange-300/80 bg-gradient-to-r from-orange-500/15 to-amber-500/20 text-orange-800 ring-1 ring-orange-200/70 shadow-orange-200/70";
  return "border-slate-300/80 bg-gradient-to-r from-slate-400/15 to-slate-300/20 text-slate-700 ring-1 ring-slate-200/80 shadow-slate-200/70";
}

function hasValueNode(value: ReactNode): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") {
    const t = value.trim();
    return t !== "" && t !== "-" && t.toLowerCase() !== "n/a";
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some((item) => hasValueNode(item));
  if (isValidElement(value)) {
    const props = (value.props as { children?: ReactNode } | null) || {};
    if (typeof props.children !== "undefined") return hasValueNode(props.children);
    return true;
  }
  return true;
}

function toMonthYear(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const monthYear = raw.match(/([A-Za-z]+)\s+\d{1,2},?\s+(\d{4})/);
  if (monthYear) return `${monthYear[1]} ${monthYear[2]}`;
  const yearOnly = raw.match(/\b(\d{4})\b/);
  if (yearOnly) return yearOnly[1];
  return "Upcoming";
}

function cameraTopLabel(detail?: ProcessorDetail): string {
  const maxCameraSupport = String(detail?.maxCameraSupport || "").trim();
  const cameraSupportModes = (detail?.cameraSupportModes || []).map((item) => String(item || "").trim()).filter(Boolean);
  const rawParts = [
    maxCameraSupport,
    ...cameraSupportModes,
  ].filter(Boolean);

  if (!rawParts.length) return "";

  const allNumberMatches = rawParts
    .flatMap((part) => [...part.matchAll(/([\d.]+)/g)].map((m) => Number(m[1])))
    .filter((n) => Number.isFinite(n));
  if (allNumberMatches.length) {
    const max = Math.max(...allNumberMatches);
    return `Up to ${Number.isInteger(max) ? max : max}MP`;
  }

  return "";
}

function inferCoreCount(detail?: { coreCount?: number; cores?: string }): string {
  if (Number.isFinite(detail?.coreCount)) return String(detail?.coreCount);
  const raw = String(detail?.cores || "");
  const m = raw.match(/\b(\d+)\b/);
  return m ? m[1] : "-";
}

function inferCoreConfig(detail?: { coreConfiguration?: string; cores?: string }): string {
  const explicit = String(detail?.coreConfiguration || "").trim();
  if (explicit) return explicit;
  const raw = String(detail?.cores || "").trim();
  const bracket = raw.match(/\((.+)\)/);
  if (bracket?.[1]) return bracket[1].trim();
  return raw || "-";
}

function inferGpuCores(gpuName?: string, pipelines?: number): string {
  if (Number.isFinite(pipelines) && (pipelines as number) > 0) return String(pipelines);
  const raw = String(gpuName || "");
  const mp = raw.match(/\bMP\s*([0-9]+)\b/i);
  if (mp?.[1]) return mp[1];
  return "-";
}

function getChipTileMeta(name: string, vendor: string): { brand: string; series?: string; tone: string; edge: string } {
  const lower = name.toLowerCase();
  const tier = getSnapdragonTier(name, vendor);

  if (tier === "elite") {
    return {
      brand: "SNAPDRAGON",
      series: "ELITE",
      tone: "bg-gradient-to-br from-[#090d14] via-[#171b24] to-[#2a2f3a] text-[#ffe8b2]",
      edge: "shadow-[0_0_0_1px_rgba(244,198,105,0.85),0_0_22px_rgba(245,175,73,0.5),0_0_34px_rgba(255,208,120,0.35)]",
    };
  }
  if (tier === "series8") {
    return {
      brand: "SNAPDRAGON",
      series: "8 SERIES",
      tone: "bg-gradient-to-br from-[#101726] via-[#1f2b40] to-[#2b3444] text-[#f7e2b5]",
      edge: "shadow-[0_0_0_1px_rgba(212,172,98,0.65),0_0_14px_rgba(196,146,52,0.3),0_0_26px_rgba(59,130,246,0.2)]",
    };
  }
  if (tier === "series7gen" || tier === "series7legacy" || tier === "series6" || tier === "series4" || tier === "series2") {
    const series =
      tier === "series7gen" ? "7 GEN" :
      tier === "series7legacy" ? "7 SERIES" :
      tier === "series6" ? "6 SERIES" :
      tier === "series4" ? "4 SERIES" :
      "2 SERIES";
    return {
      brand: "SNAPDRAGON",
      series,
      tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.55),0_0_18px_rgba(100,116,139,0.2)]",
    };
  }
  if (tier === "other") {
    return {
      brand: "SNAPDRAGON",
      series: "OTHER",
      tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.55),0_0_18px_rgba(100,116,139,0.2)]",
    };
  }
  if (vendor.toLowerCase() === "samsung" || lower.includes("exynos")) {
    return {
      brand: "SAMSUNG",
      series: "EXYNOS",
      tone: "bg-gradient-to-br from-[#070d1b] via-[#101b33] to-[#0c1324] text-[#dbeafe]",
      edge: "shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_18px_rgba(37,99,235,0.35),0_0_32px_rgba(59,130,246,0.25)]",
    };
  }
  if (vendor.toLowerCase() === "unisoc" || lower.includes("unisoc") || lower.includes("tiger")) {
    return {
      brand: "UNISOC",
      series: "UNISOC",
      tone: "bg-gradient-to-br from-[#0b1d1a] via-[#10302a] to-[#1f4e45] text-[#d1fae5]",
      edge: "shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_16px_rgba(16,185,129,0.3),0_0_28px_rgba(20,184,166,0.22)]",
    };
  }
  if (vendor.toLowerCase() === "apple" || lower.startsWith("apple ")) {
    return {
      brand: "APPLE",
      series: "A SERIES",
      tone: "bg-gradient-to-br from-[#0b1020] via-[#1a2442] to-[#2b3f70] text-[#e5eefc]",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.7),0_0_18px_rgba(59,130,246,0.28),0_0_30px_rgba(148,163,184,0.2)]",
    };
  }

  if (vendor.toLowerCase() === "mediatek") {
    if (lower.includes("dimensity")) {
      return {
        brand: "MEDIATEK",
        series: "DIMENSITY",
        tone: "bg-gradient-to-br from-[#060b14] via-[#0a1322] to-[#12294a] text-[#f8e9c2]",
        edge: "shadow-[0_0_0_1px_rgba(245,188,96,0.75),0_0_18px_rgba(255,170,82,0.45),0_0_32px_rgba(59,130,246,0.35)]",
      };
    }
    if (lower.includes("helio")) {
      return {
        brand: "MEDIATEK",
        series: "HELIO",
        tone: "bg-gradient-to-br from-[#0d1116] via-[#18202a] to-[#2a3440] text-[#dbe6f5]",
        edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.6),0_0_12px_rgba(100,116,139,0.3)]",
      };
    }
  }
  return {
    brand: vendor.toUpperCase(),
    tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
    edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.55),0_0_18px_rgba(100,116,139,0.2)]",
  };
}

function titleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatProcessorDisplayName(name: string, vendor: string): string {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  const isQualcomm = /qualcomm/i.test(vendor) || /snapdragon/i.test(raw);
  if (!isQualcomm) return raw;
  if (/^qualcomm\b/i.test(raw)) return raw;
  return `Qualcomm ${raw}`;
}

function formatFullProcessorName(name: string, vendor: string): string {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  const v = String(vendor || "").toLowerCase();
  const lower = raw.toLowerCase();

  if (v.includes("qualcomm") || lower.includes("snapdragon")) {
    return /^qualcomm\b/i.test(raw) ? raw : `Qualcomm ${raw}`;
  }
  if (v.includes("mediatek") || lower.includes("dimensity") || lower.includes("helio")) {
    return /^mediatek\b/i.test(raw) ? raw : `MediaTek ${raw}`;
  }
  if (v.includes("samsung") || lower.includes("exynos")) {
    return /^samsung\b/i.test(raw) ? raw : `Samsung ${raw}`;
  }
  if (v.includes("unisoc") || lower.includes("unisoc") || lower.includes("tiger")) {
    return /^unisoc\b/i.test(raw) ? raw : `Unisoc ${raw}`;
  }
  if (v.includes("apple") || lower.startsWith("apple ")) {
    return /^apple\b/i.test(raw) ? raw : `Apple ${raw}`;
  }
  return raw;
}

type SnapdragonTier = "elite" | "series8" | "series7gen" | "series7legacy" | "series6" | "series4" | "series2" | "other" | "none";

function getSnapdragonSuffix(name: string): string {
  const raw = String(name || "").trim();
  const m = raw.match(/snapdragon\s+(.+)$/i);
  return String(m?.[1] || "").trim();
}

function normalizeSnapdragonSuffix(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/^8sgen\s*(\d+)/i, "8s gen $1")
    .replace(/^8gen\s*(\d+)/i, "8 gen $1")
    .replace(/^7sgen\s*(\d+)/i, "7s gen $1")
    .replace(/^7gen\s*(\d+)/i, "7 gen $1")
    .trim();
}

function getSnapdragonTier(name: string, vendor: string): SnapdragonTier {
  const rawName = String(name || "");
  const isSnapdragon = /snapdragon/i.test(rawName) || /qualcomm/i.test(vendor);
  if (!isSnapdragon) return "none";
  const suffix = normalizeSnapdragonSuffix(getSnapdragonSuffix(rawName)).toLowerCase();
  if (!suffix) return "other";
  if (/\belite\b/.test(suffix)) return "elite";
  if (/^8s?(?:\b|gen|\+)/.test(suffix) || /^8\d{2}\b/.test(suffix)) return "series8";
  if (/^7s?(?:\+)?\s*gen\b|^7s?gen\b/.test(suffix)) return "series7gen";
  if (/^7\d{2}\b/.test(suffix) || /\b7\d{2}g?\b/.test(suffix)) return "series7legacy";
  if (/^6(?:\b|gen|\+)/.test(suffix) || /^6\d{2}\b/.test(suffix)) return "series6";
  if (/^4(?:\b|gen|\+)/.test(suffix) || /^4\d{2}\b/.test(suffix)) return "series4";
  if (/^2(?:\b|gen|\+)/.test(suffix) || /^2\d{2}\b/.test(suffix)) return "series2";
  return "other";
}

function getChipSeriesInfo(
  name: string,
  vendor: string
): { line1: string; line2?: string; isPremium?: boolean } | null {
  const n = String(name || "").trim();
  if (/snapdragon/i.test(n) || /qualcomm/i.test(vendor)) {
    const suffix = normalizeSnapdragonSuffix(getSnapdragonSuffix(n));
    if (suffix) {
      const clean = suffix.replace(/\s+/g, " ").trim();
      const displayHead = (value: string) =>
        value
          .replace(/\s*\+\s*/g, "+")
          .replace(/\belite\b/gi, "Elite")
          .trim();
      const genMatch = clean.match(/^(.*?)(?:\s+)?gen\s*(\d+)$/i);

      if (genMatch) {
        const rawHead = String(genMatch[1] || "").replace(/\s*\+\s*/g, "+").trim();
        const head = rawHead ? displayHead(rawHead) : "Snapdragon";
        const gen = Number(genMatch[2]);
        return {
          line1: head,
          line2: Number.isFinite(gen) ? `GEN ${gen}` : undefined,
          isPremium: /\belite\b/i.test(rawHead),
        };
      }

      const single = displayHead(clean);
      return {
        line1: single,
        isPremium: /\belite\b/i.test(single),
      };
    }
    return { line1: "SNAPDRAGON" };
  }
  if (/exynos/i.test(n) || /samsung/i.test(vendor)) {
    const ex = n.match(/exynos\s+(.+)$/i);
    if (ex?.[1]) {
      return { line1: "Exynos", line2: ex[1].trim() };
    }
    return { line1: "Exynos" };
  }
  if (/unisoc/i.test(n) || /tiger/i.test(n) || /unisoc/i.test(vendor)) {
    const uni = n.match(/(?:unisoc|tiger)\s+(.+)$/i);
    if (uni?.[1]) {
      return { line1: uni[1].trim().toUpperCase() };
    }
    return { line1: "UNISOC" };
  }
  if (/^apple\s+/i.test(n) || /apple/i.test(vendor)) {
    const ap = n.match(/^apple\s+(.+)$/i);
    if (ap?.[1]) {
      return { line1: ap[1].trim().toUpperCase(), isPremium: true };
    }
    return { line1: "A-SERIES", isPremium: true };
  }
  if (/tensor/i.test(n) || /google/i.test(vendor)) {
    const g = n.match(/(?:google\s+)?tensor\s+(.+)$/i);
    if (g?.[1]) return { line1: `Tensor ${g[1].trim()}` };
    return { line1: "Tensor" };
  }
  if (vendor.toLowerCase() === "mediatek") {
    const dim = n.match(/dimensity\s+(.+)$/i);
    if (dim?.[1]) return { line1: "DIMENSITY", line2: dim[1].trim().toUpperCase(), isPremium: true };
    const helio = n.match(/helio\s+(.+)$/i);
    if (helio?.[1]) {
      const suffix = helio[1].trim();
      const parts = suffix.split(/\s+/).filter(Boolean);
      if (parts.length <= 1) {
        return { line1: `Helio ${parts[0] || ""}`.trim() };
      }
      const head = `Helio ${parts[0]}`;
      const tail = titleCaseWords(parts.slice(1).join(" "));
      return { line1: head, line2: tail };
    }
  }
  return null;
}

function normalizeCameraMode(raw: string): string {
  const original = String(raw || "").trim();
  if (!original) return original;
  const text = original.includes(":") ? original.split(":").slice(1).join(":").trim() : original;
  if (!text) return text;
  const parseMpNumber = (value: string): number => {
    const cleaned = String(value || "").trim();
    if (!cleaned) return NaN;
    const m = cleaned.match(/([\d.]+)(?:\s*mp)?/i);
    if (!m?.[1]) return NaN;
    return Number(m[1]);
  };
  const parts = text
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    const n = parseMpNumber(text);
    if (Number.isFinite(n)) return `Up to ${Number.isInteger(n) ? n : n}MP`;
    return text;
  }
  const parsed = parts.map((p) => parseMpNumber(p));
  if (parsed.some((n) => !Number.isFinite(n))) return text;
  const first = parsed[0];
  const same = parsed.every((n) => n === first);
  if (same) {
    const value = Number.isInteger(first) ? first : first;
    return `${parsed.length}x${value}MP`;
  }
  return parsed
    .map((n) => `${Number.isInteger(n) ? n : n}MP`)
    .join(" + ");
}

function formatCameraSupportModes(modes: string[] | undefined, fallback?: string | number): string {
  const list = (modes || []).map((m) => normalizeCameraMode(m)).filter(Boolean);
  if (list.length > 0) return list.join(", ");
  return normalizeCameraMode(String(fallback || "-"));
}

function clusterRows(value: string): ReactNode {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "-";
  const rows = raw
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!rows.length) return "-";
  if (rows.length === 1) return rows[0];
  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row}>{row}</div>
      ))}
    </div>
  );
}

function formatCodecList(value: string[] | string | undefined): string {
  if (!value) return "-";
  const list = Array.isArray(value) ? value : String(value).split(/\s*,\s*/);
  const cleaned = list.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : "-";
}

function formatFlops(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/\bflops\b/i.test(raw)) return raw;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw} Gigaflops`;
  return `${raw} Gigaflops`;
}

function stripResolutionFromMode(value: string): string {
  return String(value || "")
    .replace(/\(\s*\d{3,5}\s*[xX*]\s*\d{3,5}\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+:/g, ":")
    .trim();
}

function normalizeDisplayRefresh(value: string): string {
  const text = String(value || "").trim();
  if (!text) return text;
  if (/@/.test(text)) return text.replace(/\s*@\s*/g, " @ ");
  return text.replace(/\s*:\s*/g, " @ ");
}

function formatDisplayModeLines(values: string[]): string {
  const rows = values
    .map((item) => stripResolutionFromMode(item))
    .map((item) => normalizeDisplayRefresh(item))
    .map((item) => item.trim())
    .filter(Boolean);
  return rows.length ? rows.join(", ") : "-";
}

function mobileClusterRows(value: string): ReactNode {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "-";
  const rows = raw
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (rows.length <= 1) return raw;
  return (
    <>
      <div className="space-y-1 sm:hidden">
        {rows.map((row) => (
          <div key={row}>{row}</div>
        ))}
      </div>
      <span className="hidden sm:inline">{raw}</span>
    </>
  );
}

function mobileVersionWithDetails(value: string): ReactNode {
  const raw = String(value || "").trim();
  const parts = raw.match(/^([A-Za-z0-9.+-]+)\s*(\([^)]*\))$/);
  if (!parts) return raw || "-";
  return (
    <>
      <span className="sm:hidden">
        <span className="block leading-tight">{parts[1]}</span>
        <span className="block whitespace-nowrap text-[11px] leading-tight">{parts[2]}</span>
      </span>
      <span className="hidden sm:inline">{raw}</span>
    </>
  );
}

function normalizeFeatureText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatOtherCpuFeatures(features: string[] | undefined, architecture?: string): string {
  const list = (features || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (!list.length) return "-";
  const archRaw = String(architecture || "").trim();
  const archNorm = normalizeFeatureText(archRaw);
  const archTokens = archRaw
    .split(/[^A-Za-z0-9.+-]+/)
    .map((t) => normalizeFeatureText(t))
    .filter((t) => t.length >= 4);
  const filtered = list.filter((item) => {
    if (!archNorm) return true;
    const featureNorm = normalizeFeatureText(item);
    if (!featureNorm) return false;
    if (featureNorm === archNorm) return false;
    if (featureNorm.length >= 6 && archNorm.includes(featureNorm)) return false;
    if (archNorm.length >= 6 && featureNorm.includes(archNorm)) return false;
    if (archTokens.some((token) => featureNorm.includes(token) || token.includes(featureNorm))) return false;
    return true;
  });
  return filtered.length ? filtered.join(", ") : "-";
}

function formatCpuArchitecture(detail?: ProcessorDetail): string {
  const instruction = String(detail?.instructionSet || "").trim();
  const bits = String(detail?.architectureBits || "").trim();
  if (instruction && bits) return `${instruction}, ${bits}`;
  if (instruction) return instruction;
  const legacy = String(detail?.architecture || "").trim();
  return legacy || "-";
}

function sortMemoryTypes(values: string[]): string[] {
  const rank = (v: string) => {
    const t = v.toUpperCase().replace(/\s+/g, "");
    const m = t.match(/LPDDR(\d+)(X?)/);
    if (!m) return -1;
    const gen = Number(m[1] || 0);
    const x = m[2] === "X" ? 0.1 : 0;
    return gen + x;
  };
  return [...values].sort((a, b) => rank(b) - rank(a) || a.localeCompare(b));
}

function sortStorageTypes(values: string[]): string[] {
  const rank = (v: string) => {
    const t = v.toUpperCase().replace(/\s+/g, "");
    if (t.includes("NVME")) return 300;
    const ufs = t.match(/UFS(\d+(?:\.\d+)?)/);
    if (ufs) return 100 + Number(ufs[1]);
    if (t.includes("EMMC")) return 10;
    return 0;
  };
  return [...values].sort((a, b) => rank(b) - rank(a) || a.localeCompare(b));
}

function toUnique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function formatMemoryTypes(detail: {
  memoryTypes?: string[];
  memoryType?: string;
}): string {
  const list = toUnique([...(detail.memoryTypes || []), String(detail.memoryType || "")]);
  if (!list.length) return "-";
  return sortMemoryTypes(list).join(", ");
}

function formatStorageTypes(detail: {
  storageTypes?: string[];
  storageType?: string;
}): string {
  const list = toUnique([...(detail.storageTypes || []), String(detail.storageType || "")]);
  if (!list.length) return "-";
  return sortStorageTypes(list).join(", ");
}

function formatMemoryFrequency(detail: {
  memoryFreqByType?: Record<string, number | string>;
  memoryFreqMhz?: number;
  memoryTypes?: string[];
  memoryType?: string;
}): string {
  const byType = detail.memoryFreqByType || {};
  const typeKeys = sortMemoryTypes(Object.keys(byType).filter(Boolean));
  if (typeKeys.length > 0) {
    const parsed = typeKeys.map((type) => {
      const raw = byType[type];
      if (typeof raw === "number") return raw;
      const n = Number.parseFloat(String(raw || "").replace(/[^\d.]+/g, ""));
      return Number.isFinite(n) ? n : NaN;
    });
    if (parsed.length > 0 && parsed.every((n) => Number.isFinite(n)) && parsed.every((n) => n === parsed[0])) {
      return `${parsed[0]} MHz`;
    }
    return typeKeys
      .map((type) => {
        const raw = byType[type];
        const value = typeof raw === "number" ? `${raw} MHz` : `${String(raw).trim()}`;
        return `${type}: ${value.toUpperCase().includes("MHZ") ? value : `${value} MHz`}`;
      })
      .join(", ");
  }
  if (Number.isFinite(detail.memoryFreqMhz)) return `${detail.memoryFreqMhz} MHz`;
  const inferredTypes = toUnique([...(detail.memoryTypes || []), String(detail.memoryType || "")]);
  if (inferredTypes.length === 1 && Number.isFinite(detail.memoryFreqMhz)) {
    return `${inferredTypes[0]}: ${detail.memoryFreqMhz} MHz`;
  }
  return "-";
}

function getMemoryFrequencyRows(detail: {
  memoryFreqByType?: Record<string, number | string>;
  memoryFreqMhz?: number;
  memoryTypes?: string[];
  memoryType?: string;
}): string[] {
  const byType = detail.memoryFreqByType || {};
  const typeKeys = sortMemoryTypes(Object.keys(byType).filter(Boolean));
  if (typeKeys.length > 0) {
    const parsed = typeKeys.map((type) => {
      const raw = byType[type];
      if (typeof raw === "number") return raw;
      const n = Number.parseFloat(String(raw || "").replace(/[^\d.]+/g, ""));
      return Number.isFinite(n) ? n : NaN;
    });
    if (parsed.length > 0 && parsed.every((n) => Number.isFinite(n)) && parsed.every((n) => n === parsed[0])) {
      return [`${parsed[0]} MHz`];
    }
    return typeKeys.map((type) => {
      const raw = byType[type];
      const value = typeof raw === "number" ? `${raw} MHz` : `${String(raw).trim()}`;
      return `${type}: ${value.toUpperCase().includes("MHZ") ? value : `${value} MHz`}`;
    });
  }
  const single = formatMemoryFrequency(detail);
  return [single || "-"];
}

function formatNetworkSupport(detail: {
  networkSupport?: string[];
  modem?: string;
  dual5g?: boolean;
}): string {
  const explicit = (detail.networkSupport || []).map((v) => String(v).trim().toUpperCase()).filter(Boolean);
  let tokens = explicit;
  if (!tokens.length) {
    const modem = String(detail.modem || "");
    tokens = ["5G", "4G", "3G", "2G"].filter((t) => new RegExp(`\\b${t}\\b`, "i").test(modem));
  }
  if (!tokens.length) return "-";
  const rank = ["5G", "4G", "3G", "2G"];
  const maxNet = rank.find((r) => tokens.includes(r));
  if (!maxNet) return "-";
  return maxNet;
}

function formatModemName(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const compact = raw.toUpperCase().replace(/\s+/g, "");
  const generic = compact
    .replace(/DUAL/g, "")
    .split(/[/,|+()-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (generic.length > 0 && generic.every((t) => /^(2G|3G|4G|5G|LTE|NR|SA|NSA)$/.test(t))) {
    return "-";
  }
  return raw;
}

function compactNetworkBadge(value?: string): string {
  const raw = String(value || "").toUpperCase();
  const hit = raw.match(/\b([2-6]G)\b/);
  return hit?.[1] || "-";
}

function formatBluetooth(version?: string, features?: string[]): string {
  const v = String(version || "").trim();
  const f = (features || []).map((x) => String(x).trim()).filter(Boolean);
  if (!v && !f.length) return "-";
  if (!v) return f.join(", ");
  if (!f.length) return v;
  return `${v} (${f.join(", ")})`;
}

function formatWifi(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/802\.11/i.test(raw)) return raw;
  const cleaned = raw.toUpperCase().replace(/^WI[-\s]?FI\s*/i, "");
  const key = cleaned.replace(/\s+/g, "");
  const map: Record<string, string> = {
    "7": "7 (802.11 a/b/g/n/ac/ax/be)",
    "6E": "6E (802.11 a/b/g/n/ac/ax)",
    "6": "6 (802.11 a/b/g/n/ac/ax)",
    "5": "5 (802.11 a/b/g/n/ac)",
    "4": "4 (802.11 a/b/g/n)",
  };
  if (map[key]) return map[key];
  if (/^WIFI\s*\d/i.test(raw.toUpperCase())) {
    const num = raw.toUpperCase().replace("WIFI", "").trim();
    if (map[num]) return map[num];
  }
  return raw;
}

function formatChargingText(value?: string): ReactNode {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const m = raw.match(/^([^(]+)\((.+)\)$/);
  if (!m) return raw;
  const head = m[1].trim();
  const inside = m[2]
    .split(/\s*&\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="space-y-0.5">
      <div>{head}</div>
      <div className="text-slate-700">
        {inside.map((line, idx) => (
          <div key={`${line}-${idx}`}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function splitSupportLines(value?: string): string[] {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.includes("\n")) {
    return raw
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [raw];
}

function TopSpecIcon({ kind }: { kind: string }) {
  const base = "inline-flex h-5 w-5 items-center justify-center rounded-md";
  switch (kind) {
    case "gpu":
      return (
        <span className={`${base} bg-indigo-50 text-indigo-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="6" y="7" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 10h6M9 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "fabrication":
      return (
        <span className={`${base} bg-emerald-50 text-emerald-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "cores":
      return (
        <span className={`${base} bg-blue-50 text-blue-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="8" cy="8" r="2" fill="currentColor" />
            <circle cx="16" cy="8" r="2" fill="currentColor" />
            <circle cx="8" cy="16" r="2" fill="currentColor" />
            <circle cx="16" cy="16" r="2" fill="currentColor" />
          </svg>
        </span>
      );
    case "clock":
      return (
        <span className={`${base} bg-amber-50 text-amber-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "camera":
      return (
        <span className={`${base} bg-violet-50 text-violet-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
      );
    case "ram":
      return (
        <span className={`${base} bg-cyan-50 text-cyan-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="5" y="8" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 11h2M12 11h2M16 11h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "storage":
      return (
        <span className={`${base} bg-slate-100 text-slate-700`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="6" y="5" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      );
    default:
      return <span className={`${base} bg-slate-100 text-slate-500`} />;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const all = await listProcessorProfiles();
  const p = all.find((item) => item.slug === slug);
  if (!p) return { title: "Processor not found" };
  const detail = await getProcessorDetailBySlug(slug);
  const seo = detail?.seo;
  const displayName = formatProcessorDisplayName(p.name, p.vendor);
  const siteUrl = getPublicSiteUrl();
  const metaTitle = String(seo?.metaTitle || "").trim();
  const fallbackParts = [
    p.fabricationNm ? `${p.fabricationNm}nm` : String(detail?.process || "").trim(),
    p.maxCpuGhz ? `${p.maxCpuGhz} GHz` : "",
    p.gpu ? p.gpu : "",
  ].filter(Boolean);
  const fallbackDesc = `${displayName} specs, benchmarks${fallbackParts.length ? `, ${fallbackParts.join(", ")}` : ""}.`;
  const metaDescription = String(seo?.metaDescription || "").trim() || String(seo?.summary || "").trim() || fallbackDesc;
  const canonicalUrl = String(seo?.canonicalUrl || "").trim() || `${siteUrl}/processors/${p.slug}`;
  const keywords = [
    ...(Array.isArray(seo?.tags) ? seo?.tags : []),
    String(seo?.focusKeyword || "").trim(),
  ].filter(Boolean);
  const ogImage = String(seo?.ogImage || "").trim();
  const noIndex = Boolean(seo?.noIndex);
  return {
    title: metaTitle || `${displayName} - Processor Details`,
    description: metaDescription,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: metaTitle || `${displayName} - Processor Details`,
      description: metaDescription,
      url: canonicalUrl,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "article",
      siteName: "Technology Stuff",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: metaTitle || `${displayName} - Processor Details`,
      description: metaDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

export default async function ProcessorDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const previewFlag = String(query?.preview || "").trim() === "1";
  const previewId = String(query?.id || slug || "").trim();

  const all = await listProcessorProfiles();
  let p = all.find((item) => item.slug === slug);
  let detail = await getProcessorDetailBySlug(slug);
  let previewMode = false;

  if (previewFlag && previewId) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
    const viewer = await getAdminViewerFromSessionToken(token);
    const canPreview = Boolean(viewer && hasCapability(viewer.role, "processors"));
    if (canPreview) {
      const draft = await getProcessorAdminById(previewId);
      if (draft && draft.name) {
        const previewSlug = slugify(String(draft.id || draft.name || slug));
        p = {
          slug: previewSlug,
          name: draft.name,
          vendor: draft.vendor || "Other",
          antutu: Number(draft.antutu || 0),
          fabricationNm: draft.fabricationNm,
          maxCpuGhz: draft.maxCpuGhz,
          gpu: draft.gpu,
          phoneCount: 0,
          avgPhoneScore: Number(draft.avgPhoneScore || 0),
          topPhones: [],
        };
        detail = draft.detail;
        previewMode = true;
      }
    }
  }

  if (!p) notFound();

  const siteUrl = getPublicSiteUrl();
  const canonicalUrl = String(detail?.seo?.canonicalUrl || "").trim() || `${siteUrl}/processors/${p.slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Processors",
        item: `${siteUrl}/processors`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: formatFullProcessorName(p.name, p.vendor),
        item: canonicalUrl,
      },
    ],
  };

  const seo = detail?.seo || {};
  const productName = formatFullProcessorName(p.name, p.vendor);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    brand: p.vendor ? { "@type": "Brand", name: p.vendor } : undefined,
    category: "Mobile Processor",
    sku: p.slug,
    description: String(seo?.metaDescription || seo?.summary || "").trim() || `${productName} specs and benchmark details.`,
    url: canonicalUrl,
    image: seo?.ogImage ? [String(seo.ogImage).trim()] : undefined,
  };

  const allForSimilar = all.some((item) => item.slug === p.slug) ? all : [p, ...all];
  const similar = neighbors(p, allForSimilar);
  const perf = perfIndex(p.antutu || 0);
  const eff = efficiency(p.fabricationNm);
  const game = gaming(p);
  const val = value(p);

  const benchAntutu = detail?.benchmarks?.antutu || p.antutu || 0;
  const benchAntutuVersion = String(detail?.benchmarks?.antutuVersion || "").trim();
  const benchAntutuCpu = detail?.benchmarks?.antutuCpu || 0;
  const benchAntutuGpu = detail?.benchmarks?.antutuGpu || 0;
  const benchAntutuMemory = detail?.benchmarks?.antutuMemory || 0;
  const benchAntutuUx = detail?.benchmarks?.antutuUx || 0;
  const benchGeekbenchVersion = String(detail?.benchmarks?.geekbenchVersion || "").trim();
  const bench3dName = String(detail?.benchmarks?.threeDMarkName || "").trim();
  const benchSingle = detail?.benchmarks?.geekbenchSingle || 0;
  const benchMulti = detail?.benchmarks?.geekbenchMulti || 0;
  const bench3d = detail?.benchmarks?.threeDMark || 0;

  const antutuPct = Math.max(1, Math.min(100, Math.round((benchAntutu / 3500000) * 100)));
  const singlePct = Math.max(1, Math.min(100, Math.round((benchSingle / 3500) * 100)));
  const multiPct = Math.max(1, Math.min(100, Math.round((benchMulti / 14000) * 100)));
  const markPct = Math.max(1, Math.min(100, Math.round((bench3d / 10000) * 100)));
  const benchmarkRows: Array<{ label: string; value: ReactNode }> = [
    {
      label: `AnTuTu ${benchAntutuVersion || "-"}`,
      value: (
        <div>
          <div>{String(benchAntutu)}</div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${antutuPct}%` }} />
          </div>
        </div>
      ),
      score: benchAntutu,
    } as { label: string; value: ReactNode; score: number },
    {
      label: `Geekbench ${benchGeekbenchVersion || "-"} Single-Core`,
      value: (
        <div>
          <div>{String(benchSingle)}</div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${singlePct}%` }} />
          </div>
        </div>
      ),
      score: benchSingle,
    } as { label: string; value: ReactNode; score: number },
    {
      label: `Geekbench ${benchGeekbenchVersion || "-"} Multi-Core`,
      value: (
        <div>
          <div>{String(benchMulti)}</div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-amber-500" style={{ width: `${multiPct}%` }} />
          </div>
        </div>
      ),
      score: benchMulti,
    } as { label: string; value: ReactNode; score: number },
    {
      label: `3DMark ${bench3dName || "-"}`,
      value: (
        <div>
          <div>{String(bench3d)}</div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-violet-500" style={{ width: `${markPct}%` }} />
          </div>
        </div>
      ),
      score: bench3d,
    } as { label: string; value: ReactNode; score: number },
  ]
    .filter((row) => Number.isFinite((row as { score: number }).score) && (row as { score: number }).score > 0)
    .map((row) => ({ label: row.label, value: row.value }));
  const antutuBreakdownRows = [
    { label: "CPU", value: benchAntutuCpu },
    { label: "GPU", value: benchAntutuGpu },
    { label: "Memory", value: benchAntutuMemory },
    { label: "UX", value: benchAntutuUx },
    { label: "Total Score", value: benchAntutu },
  ].filter((row) => Number.isFinite(row.value) && row.value > 0);
  const hasBenchmarksSection = benchmarkRows.length > 0 || antutuBreakdownRows.length > 0;
  const coreCount = inferCoreCount(detail);
  const coreConfig = inferCoreConfig(detail);
  const coreConfigRows = coreConfig
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const clockMhz = p.maxCpuGhz ? Math.round(p.maxCpuGhz * 1000) : null;
  const gpuName = detail?.gpuName || p.gpu || "-";
  const gpuCores = inferGpuCores(gpuName, detail?.pipelines);
  const supportRows: Array<{ label: string; value: ReactNode; labelAlign?: "top" | "center" }> = [];
  if (String(detail?.quickCharging || "").trim()) {
    supportRows.push({
      label: "Quick Charging",
      value: formatChargingText(detail?.quickCharging),
    });
  }
  if (String(detail?.chargingSpeed || "").trim()) {
    const lines = splitSupportLines(detail?.chargingSpeed);
    supportRows.push({
      label: "Charging Speed",
      labelAlign: lines.length > 1 ? "center" : "top",
      value: (
        <div className="space-y-1">
          {lines.map((line) => (
            <div key={line}>{formatChargingText(line)}</div>
          ))}
        </div>
      ),
    });
  }
  if (String(detail?.sourceUrl || "").trim()) {
    supportRows.push({
      label: "Official Page",
      value: (
        <a href={detail?.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
          Visit official page
        </a>
      ),
    });
  }
  const chipClass = getChipClass(p.antutu, detail?.className);
  const chipTile = getChipTileMeta(p.name, p.vendor);
  const chipSeries = getChipSeriesInfo(p.name, p.vendor);
  const isExynosTile = chipTile.brand === "SAMSUNG";
  const isUnisocTile = chipTile.brand === "UNISOC";
  const isMediaTekTile = chipTile.brand === "MEDIATEK";
  const isAppleTile = chipTile.brand === "APPLE";
  const isGoogleTile = chipTile.brand === "GOOGLE";
  const isSnapdragonTile = chipTile.brand === "SNAPDRAGON";
  const snapdragonTier = getSnapdragonTier(p.name, p.vendor);
  const isSnapdragon8Tier = isSnapdragonTile && (snapdragonTier === "elite" || snapdragonTier === "series8");
  const isSnapdragon6Tier = isSnapdragonTile && snapdragonTier === "series6";
  const isSnapdragon4Tier = isSnapdragonTile && snapdragonTier === "series4";
  const isSnapdragon2Tier = isSnapdragonTile && snapdragonTier === "series2";
  const isSnapdragonOtherTier = isSnapdragonTile && snapdragonTier === "other";
  const isSnapdragonEliteTile = isSnapdragonTile && Boolean(chipSeries?.isPremium);
  const isSnapdragon7GenTier = chipTile.series === "7 GEN";
  const isSnapdragon7LegacyTier = chipTile.series === "7 SERIES";
  const isMediaTekDimensity = isMediaTekTile && String(chipSeries?.line1 || "").toLowerCase() === "dimensity";
  const isMediaTekHelio = isMediaTekTile && /^helio/i.test(String(chipSeries?.line1 || ""));
  const displayName = formatProcessorDisplayName(p.name, p.vendor);
  const computedNetworkType = compactNetworkBadge(formatNetworkSupport(detail || {}));
  const maxNetworkType = computedNetworkType !== "-" ? computedNetworkType : (isAppleTile ? "5G" : "");
  const tileNetworkClass = "text-white/95";
  const tileBrandClass = isSnapdragon8Tier
    ? "bg-none text-[#f2bd46]"
    : isSnapdragonTile
      ? "bg-none text-white"
      : isGoogleTile
        ? "bg-none text-[#eef4ff]"
      : isSnapdragon6Tier
        ? "bg-none text-[#32d1b7]"
      : isSnapdragon4Tier
        ? "bg-none text-[#8ea2ff]"
      : isSnapdragon2Tier
        ? "bg-none text-[#b7c0cf]"
      : isSnapdragonOtherTier
        ? "bg-none text-[#d4dae4]"
      : isSnapdragonTile
        ? "bg-none text-[#d4dae4]"
      : isExynosTile
        ? "bg-none text-white"
        : isUnisocTile
          ? "bg-none text-[#d1fae5]"
        : isAppleTile
          ? "bg-none text-[#f3f7ff]"
        : "bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] text-transparent";
  const tileBrandPositionClass = "left-1/2 top-1/2 -translate-x-1/2 text-center";
  const tileBrandSizeClass = isExynosTile
    ? "text-[16px] sm:text-[17px]"
    : isUnisocTile
      ? "text-[15px] sm:text-[16px]"
      : isAppleTile
        ? "text-[17px] sm:text-[18px]"
        : isSnapdragonTile
          ? ""
          : "text-[12px] sm:text-[13px]";
  const tileBrandTrackingClass = isSnapdragonTile || isGoogleTile || isAppleTile || isUnisocTile || isExynosTile || isMediaTekTile ? "tracking-[0.02em]" : "tracking-[0.04em]";
  const tileBrandLeadingClass = isSnapdragonTile || isGoogleTile || isAppleTile || isUnisocTile || isExynosTile || isMediaTekTile ? "leading-[1.08]" : "leading-none";
  const tileBrandLabel = isSnapdragonTile ? "Snapdragon" : isAppleTile ? "Apple" : isGoogleTile ? "Google" : isExynosTile ? "Samsung" : isMediaTekTile ? "MediaTek" : chipTile.brand;
  const tilePrimaryFontClass = isSnapdragonTile || isAppleTile || isGoogleTile || isUnisocTile || isExynosTile || isMediaTekTile ? poppins.className : "";
  const tileBrandSizeStyle = isSnapdragonTile
    ? { fontSize: "clamp(12px, 13cqw, 18px)" }
    : isGoogleTile
      ? { fontSize: "clamp(16px, 17cqw, 26px)" }
      : isAppleTile
        ? { fontSize: "clamp(19px, 19cqw, 30px)" }
        : isExynosTile
          ? { fontSize: "clamp(15px, 16cqw, 24px)" }
        : isUnisocTile
          ? { fontSize: "clamp(13px, 14cqw, 20px)" }
        : isMediaTekTile
          ? { fontSize: "clamp(14px, 15cqw, 22px)" }
      : undefined;
  const tileBrandWidthClass = isAppleTile
    ? "w-[85%] max-w-[85%]"
    : isMediaTekTile
      ? "w-[90%] max-w-[90%]"
      : "w-[90%] max-w-[90%]";
  const tileContainerEdgeClass = isSnapdragon8Tier
    ? "shadow-[0_0_0_1px_rgba(210,160,70,0.98),0_8px_16px_rgba(16,24,40,0.24)]"
    : isSnapdragonTile
      ? "shadow-[0_0_0_1px_rgba(236,242,255,0.9),0_8px_16px_rgba(16,24,40,0.22)]"
    : isSnapdragonTile
      ? "shadow-[0_0_0_1px_rgba(178,188,201,0.88),0_8px_16px_rgba(16,24,40,0.22)]"
    : chipTile.edge;
  const isSnapdragonSeriesCompact = isSnapdragonTile && (((chipSeries?.line1?.length || 0) >= 8) || Boolean(chipSeries?.line2));
  const tileSeriesWrapClass = isSnapdragonTile || isMediaTekHelio ? "flex flex-col items-start gap-0.5 text-left" : isExynosTile ? "flex flex-col items-end gap-0.5 text-right" : "";
  const tileSeriesPositionClass = isSnapdragonTile
    ? "right-2.5 left-auto max-w-[58%] text-left"
    : isExynosTile
      ? "right-2.5 left-auto max-w-[62%] text-right"
      : isMediaTekDimensity
        ? "right-2.5 left-auto max-w-[62%] text-right"
      : isMediaTekHelio
        ? "right-2.5 left-auto max-w-[62%] text-left"
      : isUnisocTile
        ? "right-2.5 left-auto max-w-[58%] text-right"
        : isSnapdragon7GenTier || isSnapdragon7LegacyTier
          ? "right-2.5 left-auto max-w-[58%] text-right"
          : "right-2.5 max-w-[60%] text-right";
  const tileSeriesClass = chipSeries?.isPremium
    ? isSnapdragonEliteTile
      ? isSnapdragonSeriesCompact
        ? "font-extrabold tracking-[0.03em] [text-shadow:none] text-[#f7d892] text-[10px] sm:text-[12px]"
        : "font-extrabold tracking-[0.05em] [text-shadow:none] text-[#f7d892] text-[10px] sm:text-[12px]"
      : "font-bold uppercase tracking-[0.08em] text-[#f6c874] sm:text-[10px]"
    : isSnapdragonTile
      ? "font-semibold tracking-[0.03em] text-white sm:text-[10px]"
      : isExynosTile
          ? "font-semibold tracking-[0.03em] text-slate-100 sm:text-[11px]"
          : isUnisocTile
            ? "font-bold uppercase tracking-[0.04em] text-emerald-100 sm:text-[10px]"
          : isAppleTile
            ? "font-bold uppercase tracking-[0.04em] text-slate-100 sm:text-[11px]"
          : "font-semibold tracking-[0.02em] text-slate-100 sm:text-[10px]";
  const tileSeriesLine2Class = chipSeries?.isPremium
    ? isSnapdragonEliteTile
      ? isSnapdragonSeriesCompact
        ? "font-bold uppercase tracking-[0.03em] [text-shadow:none] text-[#fff1c9] text-[8px] sm:text-[9px]"
        : "font-bold uppercase tracking-[0.02em] [text-shadow:none] text-[#fff1c9] text-[8px] sm:text-[9px]"
      : "font-black uppercase tracking-[0.04em] text-[#ffe3a9] sm:text-[11px]"
    : isSnapdragonTile
      ? "font-bold uppercase tracking-[0.04em] text-[#f2f6ff] sm:text-[10px]"
      : isExynosTile
          ? "font-bold tracking-[0.03em] text-white sm:text-[11px]"
          : isUnisocTile
            ? "font-black uppercase tracking-[0.03em] text-emerald-50 sm:text-[11px]"
            : isAppleTile
              ? "font-black uppercase tracking-[0.03em] text-white sm:text-[12px]"
          : "font-semibold tracking-[0.02em] text-slate-200 sm:text-[10px]";
  const tileSeriesLine1Style = isSnapdragonTile
    ? { fontSize: "clamp(10px, 9cqw, 14px)" }
    : isGoogleTile
      ? { fontSize: "clamp(10px, 10cqw, 15px)" }
      : isAppleTile
        ? { fontSize: "clamp(10px, 10cqw, 15px)" }
        : isMediaTekTile
          ? { fontSize: "clamp(10px, 10.2cqw, 16px)" }
        : isUnisocTile
          ? { fontSize: "clamp(9px, 9cqw, 13px)" }
        : isExynosTile
          ? { fontSize: "clamp(9px, 9.5cqw, 14px)" }
      : undefined;
  const tileSeriesLine2Style = isSnapdragonTile
    ? { fontSize: "clamp(8px, 7cqw, 11px)" }
    : isGoogleTile || isAppleTile || isUnisocTile || isExynosTile || isMediaTekTile
      ? isExynosTile
        ? { fontSize: "clamp(8px, 8.2cqw, 12px)" }
        : isMediaTekTile
          ? { fontSize: "clamp(8px, 7.2cqw, 11px)" }
        : { fontSize: "clamp(8px, 7cqw, 10px)" }
      : undefined;
  const orderedTopSpecs = [
    { label: "GPU", value: detail?.gpuName || p.gpu || "", kind: "gpu" },
    { label: "Fabrication Process", value: p.fabricationNm ? `${p.fabricationNm}nm` : (detail?.process || ""), kind: "fabrication" },
    { label: "Cores", value: coreCount !== "-" ? coreCount : "", kind: "cores" },
    { label: "Max. Clock Speed", value: clockMhz ? `${clockMhz} MHz` : "", kind: "clock" },
    { label: "Camera", value: cameraTopLabel(detail), kind: "camera" },
    {
      label: "RAM",
      value: (() => {
        const list = toUnique([...(detail?.memoryTypes || []), String(detail?.memoryType || "")]);
        const best = sortMemoryTypes(list)[0];
        return best || "";
      })(),
      kind: "ram",
    },
    {
      label: "Storage",
      value: (() => {
        const list = toUnique([...(detail?.storageTypes || []), String(detail?.storageType || "")]);
        const best = sortStorageTypes(list)[0];
        return best || "";
      })(),
      kind: "storage",
    },
  ]
    .filter((row) => previewMode || String(row.value || "").trim().length > 0)
    .slice(0, 5);
  const announcedValue = toMonthYear(detail?.announced);
  const modelValue = String(detail?.model || "").trim() || "-";
  const manufacturerValue = String(detail?.manufacturer || "").trim() || "-";
  const infoRows = [
    {
      key: "announced",
      label: "Announced",
      value: announcedValue,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "class",
      label: "Class",
      value: chipClass,
      hideOnDesktop: true,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-700",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M6 7h12M6 12h12M6 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "model",
      label: "Model Number",
      value: modelValue,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "manufacturer",
      label: "Manufacturer",
      value: manufacturerValue,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-700",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10h3M17 10h3M4 14h3M17 14h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
  ].filter((row) => previewMode || hasValueNode(row.value));
  const competitorRows = similar.slice(0, 6);
  const similarCards = similar.map((item) => ({
    slug: item.slug,
    antutu: item.antutu,
    fullName: formatFullProcessorName(item.name, item.vendor),
    rawName: item.name,
    vendor: item.vendor,
  }));
  const commentRows = [
    {
      user: "TechRanker",
      at: "February 22, 2026 at 04:45 PM",
      text: `Please update recent benchmarks for ${p.name}; real-world thermal consistency should be reflected as well.`,
      score: 12,
    },
    {
      user: "PhoneNerd",
      at: "February 10, 2026 at 04:49 PM",
      text: `Interesting positioning. ${p.name} seems strong in sustained performance, but camera pipeline numbers still look conservative.`,
      score: 8,
    },
  ];

  return (
    <main className="mobile-container py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <section className="mb-3">
        <div className="inline-flex max-w-full items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-500 sm:text-sm">
          <Link href="/" className="rounded px-1 py-0.5 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">Home</Link>
          <span className="text-slate-300">/</span>
          <Link href="/processors" className="rounded px-1 py-0.5 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">Processors</Link>
          <span className="text-slate-300">/</span>
          <span className="min-w-0 max-w-[46vw] truncate text-slate-900 sm:max-w-none sm:truncate-none">{displayName}</span>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col items-start gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h1 className="w-full truncate whitespace-nowrap text-lg font-extrabold text-blue-800 sm:w-auto sm:whitespace-normal sm:text-xl">{displayName}</h1>
          <Link href={`/processors?left=${encodeURIComponent(p.slug)}`} className="hidden shrink-0 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 sm:inline-flex">
            Compare
          </Link>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 md:grid-cols-[124px_minmax(0,1fr)] md:gap-4">
              <div className="space-y-2">
                <div className={`relative mx-auto h-28 w-28 overflow-hidden rounded-md border border-white/10 [container-type:inline-size] sm:h-32 sm:w-32 ${chipTile.tone} ${tileContainerEdgeClass}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
                  <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
                  {isAppleTile ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                      <svg viewBox="0 0 24 24" className="h-24 w-24 text-white/80" aria-hidden="true">
                        <path fill="currentColor" d="M16.37 12.2c.02 2.49 2.2 3.32 2.23 3.33-.02.06-.35 1.2-1.14 2.37-.68 1-1.39 1.99-2.5 2.01-1.1.02-1.45-.65-2.71-.65-1.27 0-1.65.63-2.69.67-1.07.04-1.9-1.08-2.58-2.08-1.4-2.03-2.47-5.73-1.03-8.24.71-1.25 1.98-2.03 3.35-2.05 1.04-.02 2.01.7 2.71.7.7 0 2-.86 3.37-.73.57.02 2.17.23 3.2 1.74-.08.05-1.9 1.11-1.88 3.23Zm-2.2-6.32c.57-.69.96-1.65.85-2.61-.82.03-1.81.54-2.39 1.23-.53.61-.99 1.59-.86 2.53.91.07 1.84-.46 2.4-1.15Z" />
                      </svg>
                    </div>
                  ) : null}
                  <div className="relative h-full p-3">
                    {maxNetworkType ? (
                      <div className={`absolute right-0 top-2 inline-flex min-w-[2.2rem] items-center justify-center text-[10px] font-black uppercase tracking-[0.08em] sm:text-[11px] ${tileNetworkClass}`}>
                        {maxNetworkType}
                      </div>
                    ) : null}
                    <div style={tileBrandSizeStyle} className={`absolute -translate-y-1/2 ${tileBrandWidthClass} ${isSnapdragonTile || isGoogleTile ? "overflow-visible" : "overflow-hidden"} whitespace-nowrap bg-clip-text text-center ${tileBrandLeadingClass} ${isSnapdragonTile || isMediaTekTile ? "font-semibold" : "font-black"} ${isSnapdragonTile || isAppleTile || isGoogleTile || isMediaTekTile ? "" : "uppercase"} ${tilePrimaryFontClass} ${tileBrandTrackingClass} ${isExynosTile || isUnisocTile || isSnapdragonTile || isGoogleTile ? "" : "drop-shadow-[0_0_6px_rgba(255,210,120,0.35)]"} ${tileBrandClass} ${tileBrandPositionClass} ${tileBrandSizeClass}`}>
                      {tileBrandLabel}
                    </div>
                    {chipSeries ? (
                      <div className={`absolute bottom-2.5 ${tileSeriesPositionClass} leading-tight ${tileSeriesWrapClass}`}>
                        <div
                          style={tileSeriesLine1Style}
                          className={`truncate ${tilePrimaryFontClass} ${isSnapdragonTile ? "" : "text-[9px]"} ${tileSeriesClass}`}
                        >
                          {chipSeries.line1}
                        </div>
                        {chipSeries.line2 ? (
                          <div
                            style={tileSeriesLine2Style}
                            className={`${tilePrimaryFontClass} ${isSnapdragonTile ? "" : "text-[10px]"} ${tileSeriesLine2Class}`}
                          >
                            {chipSeries.line2}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
                <Link href={`/processors?left=${encodeURIComponent(p.slug)}`} className="mx-auto flex w-fit rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 sm:hidden">
                  Compare
                </Link>
                <span className={`mx-auto hidden w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] shadow-sm sm:inline-flex sm:w-full sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.08em] ${chipClassBadgeTone(chipClass)}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {chipClass}
                </span>
              </div>
              <div>
                <ul className="space-y-2 text-xs text-slate-800 sm:text-sm">
                  {orderedTopSpecs.map((row) => (
                    <li key={row.label} className="flex items-start gap-3">
                      <TopSpecIcon kind={row.kind} />
                      <span><strong>{row.label}:</strong> {row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {infoRows.length ? (
              <aside className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="divide-y divide-slate-100">
                  {infoRows.map((row) => (
                    <div key={row.key} className={`flex items-start justify-between gap-3 py-2 ${row.hideOnDesktop ? "sm:hidden" : ""}`}>
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${row.iconBg} ${row.iconColor}`}>
                          {row.icon}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide">{row.label}</span>
                      </div>
                      <span className="ml-auto max-w-[58%] break-words text-right text-sm font-semibold leading-5 text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-700 sm:px-5 sm:text-sm">
          {p.name} is a mobile chipset {detail?.announced ? `announced in ${toMonthYear(detail.announced)}` : "built for modern smartphones"}{p.fabricationNm ? ` using a ${p.fabricationNm}nm process` : ""}.
          It offers {coreCount} CPU cores, a peak clock of {clockMhz ? `${clockMhz} MHz` : "-"}, and {p.gpu || "integrated graphics"} for graphics workloads.
        </div>
      </section>

      <SectionChipNav
        className="top-[6.5rem] sm:top-14"
        items={[
          ...(hasBenchmarksSection ? [{ id: "benchmarks", label: "Benchmarks" }] : []),
          { id: "cpu-memory", label: "CPU & Memory" },
          { id: "graphics", label: "Graphics & Gaming" },
          { id: "ai", label: "AI" },
          { id: "display-multimedia", label: "Display & Multimedia" },
          { id: "camera-media", label: "Camera & Video" },
          { id: "connectivity", label: "Connectivity" },
          ...(supportRows.length > 0 ? [{ id: "support-links", label: "Support & Links" }] : []),
          { id: "devices", label: "Devices" },
          { id: "similar", label: "Similar Chips" },
        ]}
      />

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {hasBenchmarksSection ? (
            <article id="benchmarks" className="scroll-mt-28">
              <ModernSpecCards
                title="Benchmarks"
                titleIcon="bench"
                showEmptyRows={previewMode}
                rows={benchmarkRows}
              />

            {antutuBreakdownRows.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-700">
                    {renderTitleIcon("bench")}
                  </span>
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-blue-700">AnTuTu Score</h3>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {benchAntutuVersion ? `Detailed AnTuTu ${benchAntutuVersion} score breakdown` : "Detailed AnTuTu score breakdown"}
                </p>
              </div>
              <div className="grid grid-cols-2 text-sm sm:grid-cols-[230px_minmax(0,1fr)]">
                {antutuBreakdownRows.map((row, idx) => (
                  <div key={row.label} className="contents">
                    <div className={`border-r border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 sm:px-4 ${idx !== antutuBreakdownRows.length - 1 ? "border-b" : ""}`}>
                      {row.label}
                    </div>
                    <div className={`px-3 py-2 text-center font-semibold text-slate-900 sm:px-4 sm:text-left ${idx !== antutuBreakdownRows.length - 1 ? "border-b border-slate-200" : ""}`}>
                      {String(row.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : null}
            </article>
          ) : null}

          <article id="cpu-memory" className="scroll-mt-28">
            <ModernSpecCards
              title="CPU Architecture"
              titleIcon="cpu"
              showEmptyRows={previewMode}
              rows={[
                { label: "Cores", value: coreCount || "-" },
                {
                  label: "Core Configuration",
                  labelAlign: "center",
                  value:
                    coreConfigRows.length > 0 ? (
                      <div className="space-y-1.5">
                        {coreConfigRows.map((cluster) => (
                          <div key={cluster}>{cluster}</div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    ),
                },
                { label: "Architecture", value: formatCpuArchitecture(detail) },
                { label: "Max. Clock Speed", value: clockMhz ? `${clockMhz} MHz` : "-" },
                { label: "Fabrication Process", value: p.fabricationNm ? `${p.fabricationNm}nm` : (detail?.process || "-") },
                { label: "Transistor Count", value: detail?.transistorCount || "-" },
                { label: "TDP", value: Number.isFinite(detail?.tdpW) ? `${detail?.tdpW} W` : "-" },
                { label: "L2 Cache", value: detail?.l2Cache || "-" },
                { label: "L3 Cache", value: detail?.l3Cache || "-" },
                { label: "Other CPU Features", value: formatOtherCpuFeatures(detail?.cpuFeatures, formatCpuArchitecture(detail)) },
              ]}
            />
          </article>

          <article id="graphics" className="scroll-mt-28">
            <ModernSpecCards
              title="Graphics (GPU)"
              titleIcon="graphics"
              showEmptyRows={previewMode}
              rows={[
                { label: "GPU Name", value: gpuName },
                { label: "Architecture (GPU)", value: detail?.gpuArchitecture || "-" },
                { label: "GPU Cores", value: gpuCores },
                { label: "GPU Frequency", value: detail?.gpuFrequencyMhz ? `${detail.gpuFrequencyMhz} MHz` : "-" },
                { label: "APIs", value: detail?.gpuApis?.length ? detail.gpuApis.join(", ") : "-" },
                { label: "FLOPS", value: formatFlops(detail?.gpuFlops) },
                { label: "Other GPU Features", value: detail?.gpuFeatures?.length ? detail.gpuFeatures.join(", ") : "-" },
              ]}
            />
          </article>

          <article id="ai" className="scroll-mt-28">
            <ModernSpecCards
              title="AI"
              titleIcon="chip"
              showEmptyRows={previewMode}
              rows={[
                { label: "AI Engine", value: detail?.aiEngine || "-" },
                { label: "AI Performance", value: Number.isFinite(detail?.aiPerformanceTops) ? `${detail?.aiPerformanceTops} TOPS` : "-" },
                { label: "Precision", value: detail?.aiPrecision || "-" },
                { label: "AI Features", value: detail?.aiFeatures?.length ? detail.aiFeatures.join(", ") : "-" },
              ]}
            />
          </article>

          <article>
            <ModernSpecCards
              title="Memory & Storage Support"
              titleIcon="memory"
              showEmptyRows={previewMode}
              rows={[
                { label: "Memory Type", value: mobileClusterRows(formatMemoryTypes(detail || {})) },
                {
                  label: "Memory Frequency",
                  labelAlign: "center",
                  value: (
                    <div className="space-y-1">
                      {getMemoryFrequencyRows(detail || {}).map((row) => (
                        <div key={row}>{row}</div>
                      ))}
                    </div>
                  ),
                },
                { label: "Max Memory", value: detail?.maxMemoryGb ? `${detail.maxMemoryGb}GB` : "-" },
                { label: "Storage Type", value: mobileClusterRows(formatStorageTypes(detail || {})) },
                { label: "Storage Channels / Lanes", value: detail?.storageChannels || "-" },
              ]}
            />
          </article>

          <article id="display-multimedia" className="scroll-mt-28">
            <ModernSpecCards
              title="Display & Multimedia"
              titleIcon="display"
              showEmptyRows={previewMode}
              rows={[
                {
                  label: "Display Modes",
                  value: clusterRows(
                    detail?.displayModes?.length
                      ? formatDisplayModeLines(detail.displayModes)
                      : ((detail?.maxDisplayResolution || detail?.maxRefreshRateHz)
                          ? `${detail?.maxDisplayResolution || "-"}${detail?.maxRefreshRateHz ? ` @ ${detail.maxRefreshRateHz}Hz` : ""}`
                          : "-")
                  ),
                  labelAlign: "center",
                },
                {
                  label: "Output Display",
                  value: clusterRows(
                    formatDisplayModeLines(
                      String(detail?.outputDisplay || "-")
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    )
                  ),
                  labelAlign: "center",
                },
                { label: "Display Features", value: detail?.displayFeatures?.length ? detail.displayFeatures.join(", ") : "-" },
                { label: "Audio Codecs", value: detail?.audioCodecs?.length ? detail.audioCodecs.join(", ") : "-" },
                { label: "Multimedia Features", value: detail?.multimediaFeatures?.length ? detail.multimediaFeatures.join(", ") : "-" },
              ]}
            />
          </article>

          <article id="camera-media" className="scroll-mt-28">
            <ModernSpecCards
              title="Camera & Video Recording"
              titleIcon="camera"
              showEmptyRows={previewMode}
              rows={[
                { label: "Camera ISP", value: detail?.cameraIsp || "-" },
                {
                  label: "Camera Support Modes",
                  value: clusterRows(
                    formatCameraSupportModes(
                      detail?.cameraSupportModes,
                      detail?.maxCameraSupport || detail?.cameraSupport || "-"
                    )
                  ),
                  labelAlign: "center",
                },
                { label: "Other Camera Features", value: detail?.cameraFeatures?.length ? detail.cameraFeatures.join(", ") : "-" },
                {
                  label: "Video Recording Modes",
                  value: clusterRows(
                    detail?.videoRecordingModes?.length
                      ? detail.videoRecordingModes.join(", ")
                      : (detail?.maxVideoCapture || detail?.videoCapture || "-")
                  ),
                  labelAlign: "center",
                },
                {
                  label: "Video Recording Codecs",
                  value: formatCodecList(detail?.videoRecordingCodecs),
                },
                {
                  label: "Video Recording HDR Formats",
                  value: formatCodecList(detail?.videoRecordingHdrFormats),
                },
                { label: "Other Video Features", value: detail?.videoFeatures?.length ? detail.videoFeatures.join(", ") : "-" },
                { label: "Video Playback", value: clusterRows(detail?.videoPlayback || "-"), labelAlign: "center" },
                {
                  label: "Video Playback Codecs",
                  value: formatCodecList(detail?.videoPlaybackCodecs),
                },
                {
                  label: "Video Playback HDR Formats",
                  value: formatCodecList(detail?.videoPlaybackHdrFormats),
                },
              ]}
            />
          </article>

          <article id="connectivity" className="scroll-mt-28">
            <ModernSpecCards
              title="Connectivity"
              titleIcon="connectivity"
              showEmptyRows={previewMode}
              rows={[
                { label: "Modem Name", value: formatModemName(detail?.modem) },
                { label: "Network Support", value: formatNetworkSupport(detail || {}) },
                { label: "Download Speed", value: Number.isFinite(detail?.downloadMbps) ? `Up to ${detail?.downloadMbps} Mbps` : "-" },
                { label: "Upload Speed", value: Number.isFinite(detail?.uploadMbps) ? `Up to ${detail?.uploadMbps} Mbps` : "-" },
                { label: "Wi-Fi", value: mobileVersionWithDetails(formatWifi(detail?.wifi)) },
                { label: "Bluetooth", value: mobileVersionWithDetails(formatBluetooth(detail?.bluetooth, detail?.bluetoothFeatures)) },
                { label: "Navigation", value: detail?.navigation?.length ? detail.navigation.join(", ") : "-" },
              ]}
            />
          </article>

          {supportRows.length > 0 ? (
            <article id="support-links" className="scroll-mt-28">
              <ModernSpecCards title="Support & Links" titleIcon="power" showEmptyRows={previewMode} rows={supportRows} />
            </article>
          ) : null}
        </div>

        <aside className="space-y-5">
          <article className="panel p-4">
            <h2 className="text-base font-extrabold text-slate-900">Real-World Score</h2>
            <div className="mt-3 space-y-2">
              <ProgressRow label="Performance" value={perf} />
              <ProgressRow label="Efficiency" value={eff} />
              <ProgressRow label="Gaming" value={game} />
              <ProgressRow label="Value for Money" value={val} />
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Avg Device Rating: <span className="font-bold text-slate-800">{decimal(p.avgPhoneScore)} / 10</span>
              <br />
              Devices Using This Chip: <span className="font-bold text-slate-800">{p.phoneCount}</span>
            </div>
          </article>

        </aside>
      </section>

      <section id="devices" className="mt-5 scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-bold text-slate-900">{`Smartphones with ${p.name}`}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">Click device name to open your phone specification page.</p>
        </div>
        <div className="hidden grid-cols-[44px_minmax(0,1fr)_180px_220px] border-b border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 md:grid">
          <div>#</div>
          <div>Phone</div>
          <div>{`AnTuTu ${benchAntutuVersion || "-"}`}</div>
          <div>Buy</div>
        </div>
        {p.topPhones.length > 0 ? (
          <ol className="divide-y divide-slate-100">
            {p.topPhones.map((phone, idx) => (
              <li key={`${p.slug}-${phone.slug}`} className="px-4 py-3 text-sm">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_180px_220px] items-center md:grid">
                  <div className="hidden font-semibold text-slate-500 md:block">{idx + 1}.</div>
                  <div className="hidden min-w-0 md:block">
                    <Link href={`/mobile/${phone.slug}`} className="font-medium text-blue-700 hover:underline">
                      {phone.name}
                    </Link>
                  </div>
                  <div className="hidden text-slate-800 md:block">{phone.antutu ? String(phone.antutu) : "-"}</div>
                  <div className="hidden flex-wrap items-center gap-2 md:flex">
                    {phone.amazonUrl ? (
                      <a
                        href={phone.amazonUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                      >
                        Amazon
                      </a>
                    ) : null}
                    {phone.flipkartUrl ? (
                      <a
                        href={phone.flipkartUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Flipkart
                      </a>
                    ) : null}
                    {!phone.amazonUrl && !phone.flipkartUrl && phone.buyUrl ? (
                      <a
                        href={phone.buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        {`Buy${phone.buyLabel ? ` on ${phone.buyLabel}` : ""}`}
                      </a>
                    ) : null}
                    {!phone.amazonUrl && !phone.flipkartUrl && !phone.buyUrl ? <span className="text-slate-400">-</span> : null}
                  </div>

                  <div className="space-y-2 md:hidden">
                    <div className="min-w-0">
                      <span className="mr-2 font-semibold text-slate-500">{idx + 1}.</span>
                      <Link href={`/mobile/${phone.slug}`} className="font-medium text-blue-700 hover:underline">
                        {phone.name}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">AnTuTu</span>
                      <span className="text-sm font-semibold text-slate-800">{phone.antutu ? String(phone.antutu) : "-"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {phone.amazonUrl ? (
                        <a
                          href={phone.amazonUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                        >
                          Amazon
                        </a>
                      ) : null}
                      {phone.flipkartUrl ? (
                        <a
                          href={phone.flipkartUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Flipkart
                        </a>
                      ) : null}
                      {!phone.amazonUrl && !phone.flipkartUrl && phone.buyUrl ? (
                        <a
                          href={phone.buyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          {`Buy${phone.buyLabel ? ` on ${phone.buyLabel}` : ""}`}
                        </a>
                      ) : null}
                      {!phone.amazonUrl && !phone.flipkartUrl && !phone.buyUrl ? <span className="text-slate-400">-</span> : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-4 py-4 text-sm text-slate-600">No mapped phones yet.</div>
        )}
      </section>

      <section id="similar" className="mt-5 scroll-mt-28 panel p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-slate-900">{`Similar Processors to ${p.name}`}</h2>
        </div>
        <SimilarProcessorsGrid items={similarCards} />
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="bg-slate-50 px-4 py-2">
          <h2 className="text-xl font-bold text-slate-900">Head-to-Head Matchups</h2>
        </div>
        <ol className="grid grid-cols-1 gap-3 px-4 pb-4 pt-1 md:grid-cols-2">
          {competitorRows.map((item) => {
            return (
              <li key={`${p.slug}-vs-${item.slug}`}>
                <Link
                  href={`/processors/compare/${encodeURIComponent(p.slug)}-vs-${encodeURIComponent(item.slug)}`}
                  className="block rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-3 shadow-sm hover:border-blue-300 hover:shadow-md max-[360px]:px-2 max-[360px]:py-2"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-center gap-2">
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <ProcessorChipVisual name={p.name} vendor={p.vendor} className="h-[92px] w-[92px] max-[360px]:h-[80px] max-[360px]:w-[80px]" />
                      <ProcessorNameLabel
                        name={p.name}
                        vendor={p.vendor}
                        singleLineMaxChars={22}
                        className="mt-1.5 min-h-[2.4rem] px-1 text-slate-900 max-[360px]:mt-1 max-[360px]:min-h-[2rem]"
                        lineClassName="text-[10px] font-bold leading-4 max-[360px]:text-[9px] max-[360px]:leading-4"
                      />
                    </div>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-black text-blue-800 shadow-sm max-[360px]:h-7 max-[360px]:w-7 max-[360px]:text-[10px]">
                      VS
                    </span>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <ProcessorChipVisual name={item.name} vendor={item.vendor} className="h-[92px] w-[92px] max-[360px]:h-[80px] max-[360px]:w-[80px]" />
                      <ProcessorNameLabel
                        name={item.name}
                        vendor={item.vendor}
                        singleLineMaxChars={22}
                        className="mt-1.5 min-h-[2.4rem] px-1 text-slate-900 max-[360px]:mt-1 max-[360px]:min-h-[2rem]"
                        lineClassName="text-[10px] font-bold leading-4 max-[360px]:text-[9px] max-[360px]:leading-4"
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="flex justify-center px-4 py-3">
          <Link
            href="/processors/compare"
            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Compare More
          </Link>
        </div>
      </section>

      <ProcessorComments processorName={p.name} initialComments={commentRows} />
    </main>
  );
}

