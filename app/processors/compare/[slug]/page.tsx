import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidElement, type ReactNode } from "react";
import ProcessorChipVisual from "@/components/ProcessorChipVisual";
import ProcessorCompareCommunity from "@/components/ProcessorCompareCommunity";
import ProcessorNameLabel, { getProcessorLabelLines } from "@/components/ProcessorNameLabel";
import ProcessorComparePhonesSection from "@/components/ProcessorComparePhonesSection";
import ProcessorCompareMoreSection from "@/components/ProcessorCompareMoreSection";
import { compareVoteCookieName, getProcessorCompareVotes } from "@/lib/firestore/processorCompareVotes";
import { listProcessorCompareDiscussionPublic } from "@/lib/firestore/processorDiscussion";
import { listExploreProductsSmartphoneCached } from "@/lib/firestore/products";
import { getProcessorDetailBySlug, listProcessorDetailsBySlug } from "@/lib/processors/details";
import { calculateAiScore, calculateAiScoreReferences, calculateEfficiencyScore, calculateGamingScore, calculateGamingScoreReferences, calculatePerformanceScore, calculatePerformanceScoreReferences, calculateTotalScore, type AiScoreReferences, type GamingScoreReferences, type PerformanceScoreReferences } from "@/lib/processors/scoring";
import { listProcessorProfiles, type ProcessorProfile } from "@/lib/processors/profiles";
import type { Product } from "@/lib/types/content";
import { getPublicSiteUrl } from "@/lib/seo/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const profiles = await listProcessorProfiles();
  const top = profiles.slice(0, 20);
  const params: Array<{ slug: string }> = [];
  for (let i = 0; i < top.length; i += 1) {
    for (let j = i + 1; j < top.length; j += 1) {
      if (params.length >= 100) break;
      params.push({ slug: `${top[i].slug}-vs-${top[j].slug}` });
    }
    if (params.length >= 100) break;
  }
  return params;
}

type SpecRow = {
  label: string;
  left: ReactNode;
  right: ReactNode;
  leftNum?: number;
  rightNum?: number;
  lowerIsBetter?: boolean;
};

type SpecSection = {
  title: string;
  rows: SpecRow[];
};

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

function renderTitleIcon(kind: "bench" | "cpu" | "memory" | "graphics" | "display" | "connectivity" | "camera" | "power" | "chip") {
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
    case "connectivity":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M4 9a12 12 0 0 1 16 0M7 12a8 8 0 0 1 10 0M10 15a4 4 0 0 1 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.4" fill="currentColor" />
        </svg>
      );
    case "camera":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M12 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 5.8A7 7 0 1 0 15.5 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "chip":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 10.5h5v3h-5z" fill="currentColor" />
        </svg>
      );
  }
}

function formatFlops(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/\bflops\b/i.test(raw)) return raw;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw} GFLOPS`;
  return `${raw} GFLOPS`;
}

type ProcessorTier = "flagship" | "upper" | "mid" | "entry";

function processorSearchText(item: Pick<ProcessorProfile, "name" | "vendor">): string {
  return `${item.vendor || ""} ${item.name || ""}`.toLowerCase();
}

function processorGenerationNumber(item: Pick<ProcessorProfile, "name" | "vendor">): number {
  const text = processorSearchText(item);
  const apple = text.match(/\ba\s*(\d{2})\b/);
  if (apple) return Number(apple[1]);
  const tensor = text.match(/\bg\s*(\d+)\b/);
  if (text.includes("tensor") && tensor) return Number(tensor[1]);
  const dimensity = text.match(/\bdimensity\s*(\d{4})/);
  if (dimensity) return Math.floor(Number(dimensity[1]) / 100);
  const exynos = text.match(/\bexynos\s*(\d{4})/);
  if (exynos) return Math.floor(Number(exynos[1]) / 100);
  if (text.includes("snapdragon") && text.includes("elite")) return 9;
  const snapdragon = text.match(/\bsnapdragon\s*(\d)(?:s|\+)?(?:\s*gen\s*(\d+))?/);
  if (snapdragon) return Number(snapdragon[2] || snapdragon[1]);
  return 0;
}

function processorTier(item: Pick<ProcessorProfile, "name" | "vendor" | "antutu">): ProcessorTier {
  const text = processorSearchText(item);
  const antutu = Number(item.antutu || 0);
  if (
    /\bsnapdragon\s*8\b/.test(text) ||
    /\bdimensity\s*9\d{3}/.test(text) ||
    /\bexynos\s*2\d{3}/.test(text) ||
    /\btensor\s*g[4-9]\b/.test(text) ||
    /\ba1[7-9]\s*pro\b/.test(text) ||
    /\ba19\b/.test(text) ||
    antutu >= 1800000
  ) {
    return "flagship";
  }
  if (
    /\bsnapdragon\s*7\+?\s*gen\b/.test(text) ||
    /\bdimensity\s*8\d{3}/.test(text) ||
    /\bdimensity\s*7[3-9]\d{2}/.test(text) ||
    /\bexynos\s*1[4-9]\d{2}/.test(text) ||
    antutu >= 950000
  ) {
    return "upper";
  }
  if (
    /\bsnapdragon\s*(7s|6)\b/.test(text) ||
    /\bdimensity\s*[67]\d{3}/.test(text) ||
    /\bexynos\s*1[23]\d{2}/.test(text) ||
    antutu >= 450000
  ) {
    return "mid";
  }
  return "entry";
}

function launchYearFromDetail(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): number | undefined {
  const raw = String(detail?.announced || "").trim();
  const match = raw.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function familyPriority(target: ProcessorProfile, item: ProcessorProfile): number {
  const targetText = processorSearchText(target);
  const text = processorSearchText(item);
  if (targetText.includes("snapdragon 8")) {
    if (text.includes("snapdragon 8 elite gen 5")) return 100;
    if (text.includes("snapdragon 8 gen 5")) return 96;
    if (text.includes("snapdragon 8 elite")) return 88;
    if (text.includes("dimensity 9500")) return 94;
    if (text.includes("dimensity 9400")) return 84;
    if (text.includes("dimensity 9300")) return 72;
    if (text.includes("exynos 2600")) return 92;
    if (text.includes("exynos 2500")) return 82;
    if (text.includes("exynos 2400")) return 70;
    if (text.includes("tensor g5")) return 90;
    if (text.includes("tensor g4")) return 78;
    if (/\ba19\s*pro\b/.test(text)) return 91;
    if (/\ba19\b/.test(text)) return 89;
    if (/\ba18\s*pro\b/.test(text)) return 80;
    if (/\ba18\b/.test(text)) return 74;
    if (/\ba17\s*pro\b/.test(text)) return 68;
    if (text.includes("snapdragon 8s")) return 66;
  }
  if (targetText.includes("snapdragon 7")) {
    if (text.includes("snapdragon 7")) return 90;
    if (text.includes("dimensity 8")) return 84;
    if (text.includes("dimensity 7")) return 72;
    if (text.includes("exynos 1")) return 68;
  }
  if (targetText.includes("snapdragon 6")) {
    if (text.includes("snapdragon 6")) return 90;
    if (text.includes("dimensity 7") || text.includes("dimensity 6")) return 80;
    if (text.includes("exynos 1")) return 68;
  }
  return 0;
}

function rankedProcessorCandidates(
  target: ProcessorProfile,
  all: ProcessorProfile[],
  detailsBySlug: Record<string, Awaited<ReturnType<typeof getProcessorDetailBySlug>>>,
) {
  const targetTier = processorTier(target);
  const targetYear = launchYearFromDetail(detailsBySlug[target.slug]);
  const targetGen = processorGenerationNumber(target);
  const targetAntutu = Number(target.antutu || 0);

  return all
    .filter((item) => item.slug !== target.slug)
    .map((item) => {
      const itemTier = processorTier(item);
      const itemYear = launchYearFromDetail(detailsBySlug[item.slug]);
      const itemGen = processorGenerationNumber(item);
      const antutuGap = targetAntutu && item.antutu ? Math.abs(item.antutu - targetAntutu) / targetAntutu : 1;
      const sameTier = itemTier === targetTier;
      const family = familyPriority(target, item);
      const yearGap = targetYear && itemYear ? Math.abs(targetYear - itemYear) : undefined;
      const genGap = targetGen && itemGen ? Math.abs(targetGen - itemGen) : undefined;
      const sameVendor = target.vendor.toLowerCase() === item.vendor.toLowerCase();
      let score = 0;

      score += sameTier ? 240 : -260;
      score += family;
      score += yearGap === undefined ? 0 : Math.max(0, 80 - yearGap * 28);
      score += genGap === undefined ? 0 : Math.max(0, 55 - genGap * 16);
      score += Math.max(0, 75 - antutuGap * (targetTier === "flagship" ? 70 : 150));
      if (!sameVendor) score += 35;
      if (targetTier === "flagship" && sameTier && ["Apple", "Google", "MediaTek", "Samsung"].includes(item.vendor)) score += 36;
      if (targetTier !== "flagship" && antutuGap <= 0.25) score += 35;

      return { ...item, similarityScore: score };
    })
    .filter((item) => item.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore || (b.antutu || 0) - (a.antutu || 0))
    .slice(0, 6);
}

function iconForSection(title: string): "bench" | "cpu" | "memory" | "graphics" | "display" | "connectivity" | "camera" | "power" | "chip" {
  if (title.startsWith("AnTuTu")) return "bench";
  if (title.startsWith("Geekbench")) return "bench";
  if (title.startsWith("3DMark")) return "bench";
  if (title === "Benchmarks") return "bench";
  if (title === "CPU Architecture") return "cpu";
  if (title === "Graphics (GPU)") return "graphics";
  if (title.startsWith("AI")) return "chip";
  if (title === "Memory & Storage Support") return "memory";
  if (title === "Camera & Video Recording") return "camera";
  if (title === "Display & Multimedia") return "display";
  if (title === "Connectivity") return "connectivity";
  if (title === "Support & Links") return "power";
  return "chip";
}

function asText(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "-";
  return String(Math.round(value));
}

function chipClass(antutu?: number, explicitClass?: string): string {
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

function num(value?: number, digits = 1): string {
  if (!Number.isFinite(value)) return "-";
  const v = value as number;
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}

function renderScoreBadge(value?: number): ReactNode {
  if (!Number.isFinite(value)) return "-";
  const score = Math.round(Number(value));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - ((progress / 100) * circumference);
  const tone =
    score >= 85
      ? { track: "#d1fae5", stroke: "#059669", text: "text-emerald-700", ring: "bg-emerald-50" }
      : score >= 70
        ? { track: "#dbeafe", stroke: "#2563eb", text: "text-blue-700", ring: "bg-blue-50" }
        : score >= 55
          ? { track: "#fef3c7", stroke: "#d97706", text: "text-amber-700", ring: "bg-amber-50" }
          : { track: "#e5e7eb", stroke: "#64748b", text: "text-slate-700", ring: "bg-slate-50" };

  return (
    <span className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11 ${tone.ring}`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" stroke={tone.track} strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={`relative text-[13px] font-extrabold sm:text-sm ${tone.text}`}>{score}</span>
    </span>
  );
}

function toMonthYear(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (raw.toLowerCase() === "upcoming") return "Upcoming";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return raw;
}

function compareNameLines(name: string, vendor: string): { line1: string; line2: string } {
  const lines = getProcessorLabelLines(name, vendor);
  return { line1: lines.line1, line2: lines.line2 || "" };
}

function inferCoreCount(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (Number.isFinite(detail?.coreCount)) return String(detail?.coreCount);
  const raw = String(detail?.cores || "");
  const m = raw.match(/\b(\d+)\b/);
  return m ? m[1] : "-";
}

function normalizeCpuClockDisplay(value: string): string {
  return String(value || "").replace(/(\d+(?:\.\d+)?)\s*ghz/gi, (_, num) => {
    const text = String(num || "").trim();
    const normalized = text.includes(".") ? text : `${text}.0`;
    return `${normalized}GHz`;
  });
}

function inferCoreConfig(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const explicit = String(detail?.coreConfiguration || "").trim();
  if (explicit) return normalizeCpuClockDisplay(explicit);
  const raw = String(detail?.cores || "").trim();
  const bracket = raw.match(/\((.+)\)/);
  if (bracket?.[1]) return normalizeCpuClockDisplay(bracket[1].trim());
  return normalizeCpuClockDisplay(raw || "-");
}

function formatCoreConfigForCompare(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const config = inferCoreConfig(detail);
  if (config === "-") return "-";
  const rows = config
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return rows.length ? rows.join("\n") : config;
}

function renderCoreConfigValue(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): ReactNode {
  const config = formatCoreConfigForCompare(detail);
  if (config === "-") return "-";
  const rows = config.split("\n").map((item) => item.trim()).filter(Boolean);
  if (!rows.length) return config;

  return (
    <span className="inline-grid justify-items-start gap-1 text-left leading-tight">
      {rows.map((row) => {
        const match = row.match(/^(\d+)\s*[xX]\s*(.+)$/);
        if (!match) return <span key={row}>{row}</span>;
        return (
          <span key={row} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-x-0.5">
            <span className="text-right font-extrabold tabular-nums">{match[1]}x</span>
            <span className="text-left">{match[2]}</span>
          </span>
        );
      })}
    </span>
  );
}

function inferGpuCores(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>, gpuName?: string): string {
  if (Number.isFinite(detail?.pipelines) && (detail?.pipelines as number) > 0) return String(detail?.pipelines);
  const raw = String(gpuName || "");
  const mp = raw.match(/\bMP\s*([0-9]+)\b/i);
  return mp?.[1] || "-";
}

function rowBest(left: number, right: number, lowerIsBetter = false): "left" | "right" | "tie" {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return "tie";
  if (left === right) return "tie";
  if (lowerIsBetter) return left < right ? "left" : "right";
  return left > right ? "left" : "right";
}

function tone(win: "left" | "right" | "tie", side: "left" | "right"): string {
  if (win === "tie") return "bg-white text-slate-800";
  return win === side ? "bg-white text-slate-800" : "bg-rose-50 text-slate-800";
}

function mobileListLines(value: ReactNode): ReactNode {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  const wifiLike = raw.match(/^([A-Za-z0-9.+-]+)\s*(\([^)]*\))$/);
  if (wifiLike) {
    return (
      <span className="inline-flex flex-col items-center leading-tight">
        <span>{wifiLike[1]}</span>
        <span className="whitespace-nowrap text-[11px]">{wifiLike[2]}</span>
      </span>
    );
  }
  if (!raw.includes(",")) return value;
  // Keep values like Wi-Fi standards with parenthesized comma lists in one line.
  if (/\([^)]*,[^)]*\)/.test(raw)) return value;
  return raw.split(/\s*,\s*/).filter(Boolean).join("\n");
}

function parseCompareSlug(slug: string) {
  const parts = slug.split("-vs-").map((v) => v.trim()).filter(Boolean);
  return {
    leftSlug: parts[0] || "",
    rightSlug: parts[1] || "",
  };
}

function buildAlternativeMatchups(
  target: ProcessorProfile,
  excluded: ProcessorProfile,
  all: ProcessorProfile[],
  detailsBySlug: Record<string, Awaited<ReturnType<typeof getProcessorDetailBySlug>>>,
) {
  const candidates = rankedProcessorCandidates(
    target,
    all.filter((item) => item.slug !== excluded.slug),
    detailsBySlug,
  );

  return candidates.map((item) => ({
    slug: `${target.slug}-vs-${item.slug}`,
    leftSlug: target.slug,
    rightSlug: item.slug,
    leftVendor: target.vendor,
    rightVendor: item.vendor,
    leftName: target.name,
    rightName: item.name,
  }));
}

function normalizeMatchText(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productProcessorText(product: Product): string {
  return normalizeMatchText([
    product.performance?.chipset || "",
    product.specs?.processor || "",
    ...(product.performance?.additionalChips || []),
  ].join(" "));
}

function buildProcessorPhoneMatches(processorName: string, items: Product[], limit = 6): Product[] {
  const target = normalizeMatchText(processorName);
  if (!target) return [];

  return [...items]
    .filter((product) => {
      const text = productProcessorText(product);
      return text.includes(target);
    })
    .sort((a, b) => {
      const aHasBuy = a.affiliateLinks?.amazon || a.affiliateLinks?.flipkart ? 1 : 0;
      const bHasBuy = b.affiliateLinks?.amazon || b.affiliateLinks?.flipkart ? 1 : 0;
      if (aHasBuy !== bHasBuy) return bHasBuy - aHasBuy;
      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .slice(0, limit);
}

function officialPageCell(url?: string): ReactNode {
  const href = String(url || "").trim();
  if (!href) return "-";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-700 hover:underline"
    >
      Visit official page
    </a>
  );
}

function formatNetwork(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const explicit = (detail.networkSupport || []).map((v) => String(v).trim().toUpperCase()).filter(Boolean);
  let tokens = explicit;
  if (!tokens.length) {
    const modem = String(detail.modem || "");
    tokens = ["5G", "4G", "3G", "2G"].filter((t) => new RegExp(`\\b${t}\\b`, "i").test(modem));
  }
  if (!tokens.length) return "-";
  const rank = ["5G", "4G", "3G", "2G"];
  const maxNet = rank.find((r) => tokens.includes(r));
  return maxNet || "-";
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

function formatMemoryTypes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const values = detail.memoryTypes?.length ? detail.memoryTypes : (detail.memoryType ? [detail.memoryType] : []);
  return values.length ? sortMemoryTypes(values).join(", ") : "-";
}

function getMemoryFrequencyRows(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const map = detail.memoryFreqByType || {};
  const rank = (v: string) => {
    const t = v.toUpperCase().replace(/\s+/g, "");
    const m = t.match(/LPDDR(\d+)(X?)/);
    if (!m) return -1;
    const gen = Number(m[1] || 0);
    const x = m[2] === "X" ? 0.1 : 0;
    return gen + x;
  };
  const rows = Object.entries(map)
    .filter(([k, v]) => String(k).trim() && Number.isFinite(Number(v)))
    .sort((a, b) => rank(String(b[0])) - rank(String(a[0])) || String(a[0]).localeCompare(String(b[0])))
    .map(([k, v]) => `${k}: ${Number(v)} MHz`);
  if (rows.length) {
    const values = rows.map((row) => Number.parseFloat(row.replace(/[^\d.]+/g, ""))).filter((n) => Number.isFinite(n));
    if (values.length === rows.length && values.every((n) => n === values[0])) {
      return `${values[0]} MHz`;
    }
    return rows.join("\n");
  }
  if (Number.isFinite(detail.memoryFreqMhz)) return `${detail.memoryFreqMhz} MHz`;
  return "-";
}

function parseMemoryChannelCount(value?: string): number | undefined {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw.includes("single")) return 1;
  if (raw.includes("dual")) return 2;
  if (raw.includes("triple")) return 3;
  if (raw.includes("quad")) return 4;
  if (raw.includes("penta")) return 5;
  if (raw.includes("hexa")) return 6;
  if (raw.includes("octa")) return 8;
  const match = raw.match(/(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function formatMemoryBusWidth(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const perChannel = Number(detail.memoryBusWidthBits);
  const total = Number(detail.totalRamBusWidthBits);
  const channelText = String(detail.memoryChannels || "").trim();
  const channelCount = parseMemoryChannelCount(channelText);
  const hasChannelCount = typeof channelCount === "number" && Number.isFinite(channelCount) && channelCount > 0;
  const resolvedTotal = Number.isFinite(total) && total > 0
    ? total
    : (Number.isFinite(perChannel) && perChannel > 0 && hasChannelCount ? perChannel * channelCount : NaN);

  if (Number.isFinite(resolvedTotal) && resolvedTotal > 0 && Number.isFinite(perChannel) && perChannel > 0) {
    const multiplier = channelText
      ? channelText.replace(/-?channel/gi, "").trim() || String(channelCount || "")
      : (hasChannelCount ? String(channelCount) : String(Math.round(resolvedTotal / perChannel)));
    return `${resolvedTotal}-bit (${multiplier} x ${perChannel}-bit)`;
  }
  if (Number.isFinite(resolvedTotal) && resolvedTotal > 0) return `${resolvedTotal}-bit`;
  if (Number.isFinite(perChannel) && perChannel > 0) return `${perChannel}-bit`;
  return "-";
}

function formatMemoryBandwidth(value?: number): string {
  return Number.isFinite(value) && Number(value) > 0 ? `${value} GB/s` : "-";
}

function formatStorageTypes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const values = detail.storageTypes?.length ? detail.storageTypes : (detail.storageType ? [detail.storageType] : []);
  return values.length ? sortStorageTypes(values).join(", ") : "-";
}

function formatWifi(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const upper = raw.toUpperCase();
  if (/\bWI[-\s]?FI\s*7\b|\bWIFI7\b/.test(upper) || /\b802\.11BE\b/i.test(raw)) return "7";
  if (/\bWI[-\s]?FI\s*6E\b|\bWIFI6E\b/.test(upper)) return "6E";
  if (/\bWI[-\s]?FI\s*6\b|\bWIFI6\b/.test(upper) || /\b802\.11AX\b/i.test(raw)) return "6";
  if (/\bWI[-\s]?FI\s*5\b|\bWIFI5\b/.test(upper) || /\b802\.11AC\b/i.test(raw)) return "5";
  if (/\bWI[-\s]?FI\s*4\b|\bWIFI4\b/.test(upper) || /\b802\.11N\b/i.test(raw)) return "4";
  const version = raw.match(/\b(7|6E|6|5|4)\b/i);
  if (version?.[1]) return version[1].toUpperCase();
  return raw;
}

function formatBluetooth(value?: string, features?: string[]): string {
  const raw = String(value || "").trim();
  if (raw) return raw.replace(/^Bluetooth\s*/i, "").trim() || "-";
  const fallback = (features || []).map((item) => String(item || "").trim()).find((item) => /\d/.test(item));
  return fallback ? fallback.replace(/^Bluetooth\s*/i, "").trim() : "-";
}

function formatModemName(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  const genericOnly = /^(5G|4G|3G|2G|\/|\||,|-)+$/.test(cleaned);
  return genericOnly ? "-" : raw;
}

function splitSupportLines(value?: string): string[] {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.includes("\n")) return raw.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  if (raw.includes(",")) return raw.split(",").map((v) => v.trim()).filter(Boolean);
  return [raw];
}

function formatBenchVersion(prefix: string, value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (raw.toLowerCase().startsWith(prefix.toLowerCase())) return raw;
  return `${prefix} ${raw}`;
}

function sectionTitleWithVersion(base: string, leftVersion?: string, rightVersion?: string): string {
  const left = String(leftVersion || "").trim();
  const right = String(rightVersion || "").trim();
  if (!left || !right || left.toLowerCase() !== right.toLowerCase()) return `${base} Score`;
  const normalized = left.toLowerCase().startsWith(base.toLowerCase()) ? left : `${base} ${left}`;
  return `${normalized} Score`;
}

function firstNumber(value: string): number {
  const m = String(value || "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : NaN;
}

function maxMpScore(value: string): number {
  const all = String(value || "").match(/(\d+)\s*mp/gi) || [];
  const nums = all.map((x) => Number(x.replace(/[^0-9.]/g, ""))).filter((n) => Number.isFinite(n));
  if (!nums.length) return NaN;
  return Math.max(...nums);
}

function networkScore(value: string): number {
  const raw = String(value || "").toUpperCase();
  if (/\b5G\b/.test(raw)) return 5;
  if (/\b4G\b/.test(raw)) return 4;
  if (/\b3G\b/.test(raw)) return 3;
  if (/\b2G\b/.test(raw)) return 2;
  return NaN;
}

function wifiScore(value: string): number {
  const raw = String(value || "").toUpperCase();
  if (/WIFI\s*7|WI-?FI\s*7|\b7\s*\(802\.11/.test(raw)) return 7;
  if (/WIFI\s*6E|WI-?FI\s*6E|\b6E\s*\(802\.11/.test(raw)) return 6.5;
  if (/WIFI\s*6|WI-?FI\s*6|\b6\s*\(802\.11/.test(raw)) return 6;
  if (/WIFI\s*5|WI-?FI\s*5|\b5\s*\(802\.11/.test(raw)) return 5;
  if (/WIFI\s*4|WI-?FI\s*4|\b4\s*\(802\.11/.test(raw)) return 4;
  return firstNumber(raw);
}

function bluetoothScore(value: string): number {
  return firstNumber(value);
}

function apiScore(value: string): number {
  return firstNumber(value);
}

function architectureScore(value: string): number {
  return firstNumber(value);
}

function transistorScore(value: string): number {
  const raw = String(value || "").toLowerCase();
  const n = firstNumber(raw);
  if (!Number.isFinite(n)) return NaN;
  if (raw.includes("trillion")) return n * 1_000_000_000_000;
  if (raw.includes("billion")) return n * 1_000_000_000;
  if (raw.includes("million")) return n * 1_000_000;
  return n;
}

function mediaCapabilityScore(value: string): number {
  const raw = String(value || "").toUpperCase();
  if (!raw || raw === "-") return NaN;
  let base = 0;
  if (raw.includes("8K")) base = 8000;
  else if (raw.includes("4K") || raw.includes("UHD")) base = 4000;
  else if (raw.includes("QHD") || raw.includes("2K")) base = 2000;
  else if (raw.includes("FHD") || raw.includes("1080")) base = 1080;
  else if (raw.includes("HD") || raw.includes("720")) base = 720;

  const fpsMatches = raw.match(/(\d+)\s*FPS/g) || [];
  const fpsNums = fpsMatches.map((m) => Number(m.replace(/[^0-9]/g, ""))).filter((n) => Number.isFinite(n));
  const fps = fpsNums.length ? Math.max(...fpsNums) : 0;

  const hzMatches = raw.match(/(\d+)\s*HZ/g) || [];
  const hzNums = hzMatches.map((m) => Number(m.replace(/[^0-9]/g, ""))).filter((n) => Number.isFinite(n));
  const hz = hzNums.length ? Math.max(...hzNums) : 0;

  return base + Math.max(fps, hz) / 1000;
}

function memoryTypeScore(value: string): number {
  const raw = String(value || "").toUpperCase();
  let best = NaN;
  const re = /LPDDR\s*([0-9]+)(X?)/g;
  let m: RegExpExecArray | null = re.exec(raw);
  while (m) {
    const base = Number(m[1]);
    const score = base + (m[2] === "X" ? 0.1 : 0);
    if (!Number.isFinite(best) || score > best) best = score;
    m = re.exec(raw);
  }
  return best;
}

function storageTypeScore(value: string): number {
  const raw = String(value || "").toUpperCase();
  let best = NaN;
  if (raw.includes("NVME")) best = 1000;
  const ufs = /UFS\s*([0-9]+(\.[0-9]+)?)/g;
  let m: RegExpExecArray | null = ufs.exec(raw);
  while (m) {
    const n = 100 + Number(m[1]);
    if (!Number.isFinite(best) || n > best) best = n;
    m = ufs.exec(raw);
  }
  const emmc = /EMMC\s*([0-9]+(\.[0-9]+)?)/g;
  m = emmc.exec(raw);
  while (m) {
    const n = 10 + Number(m[1]);
    if (!Number.isFinite(best) || n > best) best = n;
    m = emmc.exec(raw);
  }
  return best;
}

function memoryFreqScore(value: string): number {
  const nums = (String(value || "").match(/(\d+(\.\d+)?)/g) || []).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!nums.length) return NaN;
  return Math.max(...nums);
}

function flopsScore(value: string): number {
  const raw = String(value || "").trim().toUpperCase();
  const n = firstNumber(raw);
  if (!Number.isFinite(n)) return NaN;
  if (raw.includes("TFLOPS")) return n * 1000;
  return n;
}

function busWidthScore(value: string): number {
  return firstNumber(value);
}

function channelsScore(value: string): number {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("octa")) return 8;
  if (raw.includes("hexa")) return 6;
  if (raw.includes("quad")) return 4;
  if (raw.includes("tri")) return 3;
  if (raw.includes("dual")) return 2;
  if (raw.includes("single")) return 1;
  return firstNumber(raw);
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
  const parts = text.split("+").map((p) => p.trim()).filter(Boolean);
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

function formatCameraSupportModes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const fallbackText = String(detail.maxCameraSupport || detail.cameraSupport || "-").trim();
  const fallbackMatch = fallbackText.match(/([\d.]+)/);
  const fallbackMp = fallbackMatch?.[1] ? Number(fallbackMatch[1]) : NaN;
  const rawModes = (detail.cameraSupportModes || []).map((m) => String(m || "").trim()).filter(Boolean);
  const hasSingleMode = rawModes.some((mode) => !mode.includes("+"));
  const sourceModes = !hasSingleMode && Number.isFinite(fallbackMp) ? [String(fallbackMp), ...rawModes] : rawModes;
  const list = sourceModes.map((m, idx) => {
    const original = String(m || "").trim();
    const parts = original.split("+").map((part) => part.trim()).filter(Boolean);
    const singleMatch = original.match(/([\d.]+)/);
    const singleMp = singleMatch?.[1] ? Number(singleMatch[1]) : NaN;
    if (idx === 0 && parts.length < 2 && Number.isFinite(singleMp) && Number.isFinite(fallbackMp) && fallbackMp > singleMp) {
      return normalizeCameraMode(String(fallbackMp));
    }
    return normalizeCameraMode(original);
  }).filter(Boolean);
  if (list.length) return list.join("\n");
  return normalizeCameraMode(fallbackText);
}

function formatVideoRows(raw: string): string {
  const text = String(raw || "").trim();
  if (!text || text === "-") return "-";
  return text
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function formatCodecList(value: string[] | string | undefined): string {
  if (!value) return "-";
  const list = Array.isArray(value) ? value : String(value).split(/\s*,\s*/);
  const cleaned = list.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : "-";
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

function formatDisplayValue(raw: string): string {
  const text = String(raw || "").trim();
  if (!text || text === "-") return "-";
  const rows = text
    .split(/\s*,\s*/)
    .map((item) => stripResolutionFromMode(item))
    .map((item) => normalizeDisplayRefresh(item))
    .map((item) => item.trim())
    .filter(Boolean);
  return rows.length ? rows.join("\n") : "-";
}

function displaySupportFallback(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail?.maxDisplayResolution && !detail?.maxRefreshRateHz) return "-";
  return `${detail?.maxDisplayResolution || "-"}${detail?.maxRefreshRateHz ? ` @ ${detail.maxRefreshRateHz}Hz` : ""}`;
}

function formatTopDisplayMode(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const top = (detail?.displayModes || []).map((item) => String(item || "").trim()).find(Boolean);
  return formatDisplayValue(top || displaySupportFallback(detail));
}

function formatTopOutputDisplay(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const top = String(detail?.outputDisplay || "")
    .split(",")
    .map((item) => item.trim())
    .find(Boolean);
  return formatDisplayValue(top || "-");
}

function buildSections(
  left: ProcessorProfile,
  right: ProcessorProfile,
  leftDetail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>,
  rightDetail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>,
  gamingReferences: GamingScoreReferences,
  performanceReferences: PerformanceScoreReferences,
  aiReferences: AiScoreReferences
): SpecSection[] {
  const left3dName = asText(leftDetail?.benchmarks?.threeDMarkName);
  const right3dName = asText(rightDetail?.benchmarks?.threeDMarkName);
  const left3dScore = asText(leftDetail?.benchmarks?.threeDMark);
  const right3dScore = asText(rightDetail?.benchmarks?.threeDMark);
  const leftEfficiency = calculateEfficiencyScore({
    fabricationNm: left.fabricationNm,
    process: leftDetail?.process,
    instructionSet: leftDetail?.instructionSet,
    architectureBits: leftDetail?.architectureBits,
    coreConfiguration: leftDetail?.coreConfiguration,
    cores: leftDetail?.cores,
  });
  const rightEfficiency = calculateEfficiencyScore({
    fabricationNm: right.fabricationNm,
    process: rightDetail?.process,
    instructionSet: rightDetail?.instructionSet,
    architectureBits: rightDetail?.architectureBits,
    coreConfiguration: rightDetail?.coreConfiguration,
    cores: rightDetail?.cores,
  });
  const leftGaming = calculateGamingScore({
    fabricationNm: left.fabricationNm,
    process: leftDetail?.process,
    instructionSet: leftDetail?.instructionSet,
    architectureBits: leftDetail?.architectureBits,
    coreConfiguration: leftDetail?.coreConfiguration,
    cores: leftDetail?.cores,
    memoryType: leftDetail?.memoryType,
    memoryTypes: leftDetail?.memoryTypes,
    memoryFreqMhz: leftDetail?.memoryFreqMhz,
    memoryFreqByType: leftDetail?.memoryFreqByType,
    memoryBusWidthBits: leftDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: leftDetail?.totalRamBusWidthBits,
    storageType: leftDetail?.storageType,
    storageTypes: leftDetail?.storageTypes,
    gpuFlops: leftDetail?.gpuFlops,
    wildLifeScore: leftDetail?.benchmarks?.threeDMarkWildLife,
    antutu11GpuScore: leftDetail?.benchmarks?.antutuCalcGpu,
  }, gamingReferences).score;
  const rightGaming = calculateGamingScore({
    fabricationNm: right.fabricationNm,
    process: rightDetail?.process,
    instructionSet: rightDetail?.instructionSet,
    architectureBits: rightDetail?.architectureBits,
    coreConfiguration: rightDetail?.coreConfiguration,
    cores: rightDetail?.cores,
    memoryType: rightDetail?.memoryType,
    memoryTypes: rightDetail?.memoryTypes,
    memoryFreqMhz: rightDetail?.memoryFreqMhz,
    memoryFreqByType: rightDetail?.memoryFreqByType,
    memoryBusWidthBits: rightDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: rightDetail?.totalRamBusWidthBits,
    storageType: rightDetail?.storageType,
    storageTypes: rightDetail?.storageTypes,
    gpuFlops: rightDetail?.gpuFlops,
    wildLifeScore: rightDetail?.benchmarks?.threeDMarkWildLife,
    antutu11GpuScore: rightDetail?.benchmarks?.antutuCalcGpu,
  }, gamingReferences).score;
  const leftPerformance = calculatePerformanceScore({
    processorName: left.name,
    antutuScore: leftDetail?.benchmarks?.antutuCalc,
    antutuFallbackScore: leftDetail?.benchmarks?.antutu || left.antutu,
    geekbenchSingle: leftDetail?.benchmarks?.geekbenchSingle,
    geekbenchMulti: leftDetail?.benchmarks?.geekbenchMulti,
    maxCpuGhz: left.maxCpuGhz,
    fabricationNm: left.fabricationNm,
    process: leftDetail?.process,
    instructionSet: leftDetail?.instructionSet,
    architectureBits: leftDetail?.architectureBits,
    coreConfiguration: leftDetail?.coreConfiguration,
    cores: leftDetail?.cores,
    memoryType: leftDetail?.memoryType,
    memoryTypes: leftDetail?.memoryTypes,
    memoryFreqMhz: leftDetail?.memoryFreqMhz,
    memoryFreqByType: leftDetail?.memoryFreqByType,
    memoryBusWidthBits: leftDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: leftDetail?.totalRamBusWidthBits,
    storageType: leftDetail?.storageType,
    storageTypes: leftDetail?.storageTypes,
  }, performanceReferences).score;
  const rightPerformance = calculatePerformanceScore({
    processorName: right.name,
    antutuScore: rightDetail?.benchmarks?.antutuCalc,
    antutuFallbackScore: rightDetail?.benchmarks?.antutu || right.antutu,
    geekbenchSingle: rightDetail?.benchmarks?.geekbenchSingle,
    geekbenchMulti: rightDetail?.benchmarks?.geekbenchMulti,
    maxCpuGhz: right.maxCpuGhz,
    fabricationNm: right.fabricationNm,
    process: rightDetail?.process,
    instructionSet: rightDetail?.instructionSet,
    architectureBits: rightDetail?.architectureBits,
    coreConfiguration: rightDetail?.coreConfiguration,
    cores: rightDetail?.cores,
    memoryType: rightDetail?.memoryType,
    memoryTypes: rightDetail?.memoryTypes,
    memoryFreqMhz: rightDetail?.memoryFreqMhz,
    memoryFreqByType: rightDetail?.memoryFreqByType,
    memoryBusWidthBits: rightDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: rightDetail?.totalRamBusWidthBits,
    storageType: rightDetail?.storageType,
    storageTypes: rightDetail?.storageTypes,
  }, performanceReferences).score;
  const leftAi = calculateAiScore({
    processorName: left.name,
    aiBenchmarkScore: leftDetail?.benchmarks?.aiScore,
    fabricationNm: left.fabricationNm,
    process: leftDetail?.process,
    instructionSet: leftDetail?.instructionSet,
    architectureBits: leftDetail?.architectureBits,
    coreConfiguration: leftDetail?.coreConfiguration,
    cores: leftDetail?.cores,
    memoryType: leftDetail?.memoryType,
    memoryTypes: leftDetail?.memoryTypes,
    memoryFreqMhz: leftDetail?.memoryFreqMhz,
    memoryFreqByType: leftDetail?.memoryFreqByType,
    memoryBusWidthBits: leftDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: leftDetail?.totalRamBusWidthBits,
    storageType: leftDetail?.storageType,
    storageTypes: leftDetail?.storageTypes,
  }, aiReferences).score;
  const rightAi = calculateAiScore({
    processorName: right.name,
    aiBenchmarkScore: rightDetail?.benchmarks?.aiScore,
    fabricationNm: right.fabricationNm,
    process: rightDetail?.process,
    instructionSet: rightDetail?.instructionSet,
    architectureBits: rightDetail?.architectureBits,
    coreConfiguration: rightDetail?.coreConfiguration,
    cores: rightDetail?.cores,
    memoryType: rightDetail?.memoryType,
    memoryTypes: rightDetail?.memoryTypes,
    memoryFreqMhz: rightDetail?.memoryFreqMhz,
    memoryFreqByType: rightDetail?.memoryFreqByType,
    memoryBusWidthBits: rightDetail?.memoryBusWidthBits,
    totalRamBusWidthBits: rightDetail?.totalRamBusWidthBits,
    storageType: rightDetail?.storageType,
    storageTypes: rightDetail?.storageTypes,
  }, aiReferences).score;
  const leftTotalScore = calculateTotalScore({
    performance: leftPerformance,
    gaming: leftGaming,
    efficiency: leftEfficiency,
    ai: leftAi,
  });
  const rightTotalScore = calculateTotalScore({
    performance: rightPerformance,
    gaming: rightGaming,
    efficiency: rightEfficiency,
    ai: rightAi,
  });
  const same3dName = left3dName !== "-" && right3dName !== "-" && left3dName.toLowerCase() === right3dName.toLowerCase();
  const markName = same3dName ? left3dName : (left3dName !== "-" ? left3dName : (right3dName !== "-" ? right3dName : ""));
  const antutuTitle = sectionTitleWithVersion("AnTuTu", leftDetail?.benchmarks?.antutuVersion, rightDetail?.benchmarks?.antutuVersion);
  const geekbenchTitle = sectionTitleWithVersion("Geekbench", leftDetail?.benchmarks?.geekbenchVersion, rightDetail?.benchmarks?.geekbenchVersion);
  const markTitle = markName ? `3DMark ${markName} Score` : "3DMark Score";

  const sections: SpecSection[] = [
    {
      title: "Overview",
      rows: [
        { label: "Announced", left: toMonthYear(leftDetail?.announced), right: toMonthYear(rightDetail?.announced) },
        { label: "Model Number", left: asText(leftDetail?.model), right: asText(rightDetail?.model) },
        { label: "Fabricated By", left: asText(leftDetail?.manufacturer), right: asText(rightDetail?.manufacturer) },
        { label: "Class", left: chipClass(left.antutu, leftDetail?.className), right: chipClass(right.antutu, rightDetail?.className) },
      ],
    },
    {
      title: "Technology Stuff Score",
      rows: [
        { label: "Total Score", left: renderScoreBadge(leftTotalScore), right: renderScoreBadge(rightTotalScore), leftNum: leftTotalScore, rightNum: rightTotalScore },
        { label: "Performance Score", left: renderScoreBadge(leftPerformance), right: renderScoreBadge(rightPerformance), leftNum: leftPerformance, rightNum: rightPerformance },
        { label: "Efficiency Score", left: renderScoreBadge(leftEfficiency), right: renderScoreBadge(rightEfficiency), leftNum: leftEfficiency, rightNum: rightEfficiency },
        { label: "Gaming Score", left: renderScoreBadge(leftGaming), right: renderScoreBadge(rightGaming), leftNum: leftGaming, rightNum: rightGaming },
        { label: "AI Score", left: renderScoreBadge(leftAi), right: renderScoreBadge(rightAi), leftNum: leftAi, rightNum: rightAi },
      ],
    },
    {
      title: antutuTitle,
      rows: [
        ...(antutuTitle === "AnTuTu Score" ? [{
          label: "AnTuTu Version",
          left: formatBenchVersion("AnTuTu", leftDetail?.benchmarks?.antutuVersion),
          right: formatBenchVersion("AnTuTu", rightDetail?.benchmarks?.antutuVersion),
        }] : []),
        {
          label: "AnTuTu Total",
          left: antutuLabel(leftDetail?.benchmarks?.antutu || left.antutu),
          right: antutuLabel(rightDetail?.benchmarks?.antutu || right.antutu),
          leftNum: Number(leftDetail?.benchmarks?.antutu || left.antutu),
          rightNum: Number(rightDetail?.benchmarks?.antutu || right.antutu),
        },
        {
          label: "AnTuTu CPU",
          left: asText(leftDetail?.benchmarks?.antutuCpu),
          right: asText(rightDetail?.benchmarks?.antutuCpu),
          leftNum: Number(leftDetail?.benchmarks?.antutuCpu),
          rightNum: Number(rightDetail?.benchmarks?.antutuCpu),
        },
        {
          label: "AnTuTu GPU",
          left: asText(leftDetail?.benchmarks?.antutuGpu),
          right: asText(rightDetail?.benchmarks?.antutuGpu),
          leftNum: Number(leftDetail?.benchmarks?.antutuGpu),
          rightNum: Number(rightDetail?.benchmarks?.antutuGpu),
        },
        {
          label: "AnTuTu Memory",
          left: asText(leftDetail?.benchmarks?.antutuMemory),
          right: asText(rightDetail?.benchmarks?.antutuMemory),
          leftNum: Number(leftDetail?.benchmarks?.antutuMemory),
          rightNum: Number(rightDetail?.benchmarks?.antutuMemory),
        },
        {
          label: "AnTuTu UX",
          left: asText(leftDetail?.benchmarks?.antutuUx),
          right: asText(rightDetail?.benchmarks?.antutuUx),
          leftNum: Number(leftDetail?.benchmarks?.antutuUx),
          rightNum: Number(rightDetail?.benchmarks?.antutuUx),
        },
      ],
    },
    {
      title: geekbenchTitle,
      rows: [
        ...(geekbenchTitle === "Geekbench Score" ? [{
          label: "Geekbench Version",
          left: formatBenchVersion("Geekbench", leftDetail?.benchmarks?.geekbenchVersion),
          right: formatBenchVersion("Geekbench", rightDetail?.benchmarks?.geekbenchVersion),
        }] : []),
        {
          label: "Single-Core",
          left: asText(leftDetail?.benchmarks?.geekbenchSingle),
          right: asText(rightDetail?.benchmarks?.geekbenchSingle),
          leftNum: Number(leftDetail?.benchmarks?.geekbenchSingle),
          rightNum: Number(rightDetail?.benchmarks?.geekbenchSingle),
        },
        {
          label: "Multi-Core",
          left: asText(leftDetail?.benchmarks?.geekbenchMulti),
          right: asText(rightDetail?.benchmarks?.geekbenchMulti),
          leftNum: Number(leftDetail?.benchmarks?.geekbenchMulti),
          rightNum: Number(rightDetail?.benchmarks?.geekbenchMulti),
        },
      ],
    },
    {
      title: markTitle,
      rows: [
        {
          label: "Score",
          left: left3dScore,
          right: right3dScore,
          leftNum: Number(leftDetail?.benchmarks?.threeDMark),
          rightNum: Number(rightDetail?.benchmarks?.threeDMark),
        },
      ],
    },
    {
      title: "AI Score",
      rows: [
        {
          label: "Score",
          left: asText(leftDetail?.benchmarks?.aiScore),
          right: asText(rightDetail?.benchmarks?.aiScore),
          leftNum: Number(leftDetail?.benchmarks?.aiScore),
          rightNum: Number(rightDetail?.benchmarks?.aiScore),
        },
      ],
    },
    {
      title: "CPU Architecture",
      rows: [
        { label: "Cores", left: inferCoreCount(leftDetail), right: inferCoreCount(rightDetail), leftNum: Number(inferCoreCount(leftDetail)), rightNum: Number(inferCoreCount(rightDetail)) },
        { label: "Core Configuration", left: renderCoreConfigValue(leftDetail), right: renderCoreConfigValue(rightDetail) },
        { label: "Architecture", left: asText(leftDetail?.architecture), right: asText(rightDetail?.architecture), leftNum: architectureScore(asText(leftDetail?.architecture)), rightNum: architectureScore(asText(rightDetail?.architecture)) },
        {
          label: "Max. Clock Speed",
          left: left.maxCpuGhz ? `${num(left.maxCpuGhz, 2)} GHz` : "-",
          right: right.maxCpuGhz ? `${num(right.maxCpuGhz, 2)} GHz` : "-",
          leftNum: Number(left.maxCpuGhz),
          rightNum: Number(right.maxCpuGhz),
        },
        {
          label: "Fabrication Process",
          left: left.fabricationNm ? `${num(left.fabricationNm)}nm` : asText(leftDetail?.process),
          right: right.fabricationNm ? `${num(right.fabricationNm)}nm` : asText(rightDetail?.process),
          leftNum: Number(left.fabricationNm),
          rightNum: Number(right.fabricationNm),
          lowerIsBetter: true,
        },
        { label: "Transistor Count", left: asText(leftDetail?.transistorCount), right: asText(rightDetail?.transistorCount), leftNum: transistorScore(asText(leftDetail?.transistorCount)), rightNum: transistorScore(asText(rightDetail?.transistorCount)) },
      ],
    },
    {
      title: "Graphics (GPU)",
      rows: [
        { label: "GPU Name", left: asText(left.gpu || leftDetail?.gpuName), right: asText(right.gpu || rightDetail?.gpuName) },
        {
          label: "GPU Frequency",
          left: leftDetail?.gpuFrequencyMhz ? `${leftDetail.gpuFrequencyMhz} MHz` : "-",
          right: rightDetail?.gpuFrequencyMhz ? `${rightDetail.gpuFrequencyMhz} MHz` : "-",
          leftNum: Number(leftDetail?.gpuFrequencyMhz),
          rightNum: Number(rightDetail?.gpuFrequencyMhz),
        },
        {
          label: "FLOPS (FP32)",
          left: formatFlops(leftDetail?.gpuFlops),
          right: formatFlops(rightDetail?.gpuFlops),
          leftNum: flopsScore(formatFlops(leftDetail?.gpuFlops)),
          rightNum: flopsScore(formatFlops(rightDetail?.gpuFlops)),
        },
        { label: "API Support", left: leftDetail?.gpuApis?.length ? leftDetail.gpuApis.join(", ") : "-", right: rightDetail?.gpuApis?.length ? rightDetail.gpuApis.join(", ") : "-" },
      ],
    },
    {
      title: "AI",
      rows: [
        { label: "AI Engine", left: asText(leftDetail?.aiEngine), right: asText(rightDetail?.aiEngine) },
        { label: "AI Performance", left: Number.isFinite(leftDetail?.aiPerformanceTops) ? `${leftDetail?.aiPerformanceTops} TOPS` : "-", right: Number.isFinite(rightDetail?.aiPerformanceTops) ? `${rightDetail?.aiPerformanceTops} TOPS` : "-", leftNum: Number(leftDetail?.aiPerformanceTops), rightNum: Number(rightDetail?.aiPerformanceTops) },
        { label: "Precision", left: asText(leftDetail?.aiPrecision), right: asText(rightDetail?.aiPrecision) },
        { label: "AI Features", left: leftDetail?.aiFeatures?.length ? leftDetail.aiFeatures.join(", ") : "-", right: rightDetail?.aiFeatures?.length ? rightDetail.aiFeatures.join(", ") : "-" },
      ],
    },
    {
      title: "Memory & Storage Support",
      rows: [
        { label: "RAM Type", left: formatMemoryTypes(leftDetail), right: formatMemoryTypes(rightDetail), leftNum: memoryTypeScore(formatMemoryTypes(leftDetail)), rightNum: memoryTypeScore(formatMemoryTypes(rightDetail)) },
        {
          label: "RAM Bus Width",
          left: formatMemoryBusWidth(leftDetail),
          right: formatMemoryBusWidth(rightDetail),
          leftNum: busWidthScore(formatMemoryBusWidth(leftDetail)),
          rightNum: busWidthScore(formatMemoryBusWidth(rightDetail)),
        },
        { label: "RAM Frequency", left: getMemoryFrequencyRows(leftDetail), right: getMemoryFrequencyRows(rightDetail), leftNum: memoryFreqScore(getMemoryFrequencyRows(leftDetail)), rightNum: memoryFreqScore(getMemoryFrequencyRows(rightDetail)) },
        { label: "RAM Bandwidth", left: formatMemoryBandwidth(leftDetail?.bandwidthGbps), right: formatMemoryBandwidth(rightDetail?.bandwidthGbps), leftNum: Number(leftDetail?.bandwidthGbps), rightNum: Number(rightDetail?.bandwidthGbps) },
        { label: "Storage Type Support", left: formatStorageTypes(leftDetail), right: formatStorageTypes(rightDetail), leftNum: storageTypeScore(formatStorageTypes(leftDetail)), rightNum: storageTypeScore(formatStorageTypes(rightDetail)) },
      ],
    },
    {
      title: "Display & Multimedia",
      rows: [
        {
          label: "Max Display Support",
          left: formatTopDisplayMode(leftDetail),
          right: formatTopDisplayMode(rightDetail),
          leftNum: mediaCapabilityScore(formatTopDisplayMode(leftDetail)),
          rightNum: mediaCapabilityScore(formatTopDisplayMode(rightDetail)),
        },
        {
          label: "Maximum Output Display",
          left: formatTopOutputDisplay(leftDetail),
          right: formatTopOutputDisplay(rightDetail),
        },
      ],
    },
    {
      title: "Camera & Video Recording",
      rows: [
        { label: "Camera ISP", left: asText(leftDetail?.cameraIsp), right: asText(rightDetail?.cameraIsp) },
        { label: "Camera Support Modes", left: formatCameraSupportModes(leftDetail), right: formatCameraSupportModes(rightDetail), leftNum: maxMpScore(formatCameraSupportModes(leftDetail)), rightNum: maxMpScore(formatCameraSupportModes(rightDetail)) },
        {
          label: "Video Recording Modes",
          left: formatVideoRows(leftDetail?.videoRecordingModes?.length ? leftDetail.videoRecordingModes.join(", ") : asText(leftDetail?.maxVideoCapture || leftDetail?.videoCapture)),
          right: formatVideoRows(rightDetail?.videoRecordingModes?.length ? rightDetail.videoRecordingModes.join(", ") : asText(rightDetail?.maxVideoCapture || rightDetail?.videoCapture)),
          leftNum: mediaCapabilityScore(leftDetail?.videoRecordingModes?.length ? leftDetail.videoRecordingModes.join(", ") : asText(leftDetail?.maxVideoCapture || leftDetail?.videoCapture)),
          rightNum: mediaCapabilityScore(rightDetail?.videoRecordingModes?.length ? rightDetail.videoRecordingModes.join(", ") : asText(rightDetail?.maxVideoCapture || rightDetail?.videoCapture)),
        },
        {
          label: "Video Playback",
          left: formatVideoRows(asText(leftDetail?.videoPlayback)),
          right: formatVideoRows(asText(rightDetail?.videoPlayback)),
          leftNum: mediaCapabilityScore(asText(leftDetail?.videoPlayback)),
          rightNum: mediaCapabilityScore(asText(rightDetail?.videoPlayback)),
        },
        {
          label: "Video Codec",
          left: formatCodecList(leftDetail?.videoRecordingCodecs),
          right: formatCodecList(rightDetail?.videoRecordingCodecs),
        },
      ],
    },
    {
      title: "Connectivity",
      rows: [
        { label: "Modem", left: formatModemName(leftDetail?.modem), right: formatModemName(rightDetail?.modem) },
        { label: "Network Support", left: formatNetwork(leftDetail), right: formatNetwork(rightDetail), leftNum: networkScore(formatNetwork(leftDetail)), rightNum: networkScore(formatNetwork(rightDetail)) },
        {
          label: "Download Speed",
          left: leftDetail?.downloadMbps ? `${leftDetail.downloadMbps} Mbps` : "-",
          right: rightDetail?.downloadMbps ? `${rightDetail.downloadMbps} Mbps` : "-",
          leftNum: Number(leftDetail?.downloadMbps),
          rightNum: Number(rightDetail?.downloadMbps),
        },
        {
          label: "Upload Speed",
          left: leftDetail?.uploadMbps ? `${leftDetail.uploadMbps} Mbps` : "-",
          right: rightDetail?.uploadMbps ? `${rightDetail.uploadMbps} Mbps` : "-",
          leftNum: Number(leftDetail?.uploadMbps),
          rightNum: Number(rightDetail?.uploadMbps),
        },
        { label: "Wi-Fi", left: formatWifi(leftDetail?.wifi), right: formatWifi(rightDetail?.wifi), leftNum: wifiScore(formatWifi(leftDetail?.wifi)), rightNum: wifiScore(formatWifi(rightDetail?.wifi)) },
        { label: "Bluetooth", left: formatBluetooth(leftDetail?.bluetooth, leftDetail?.bluetoothFeatures), right: formatBluetooth(rightDetail?.bluetooth, rightDetail?.bluetoothFeatures), leftNum: bluetoothScore(formatBluetooth(leftDetail?.bluetooth, leftDetail?.bluetoothFeatures)), rightNum: bluetoothScore(formatBluetooth(rightDetail?.bluetooth, rightDetail?.bluetoothFeatures)) },
        { label: "Navigation", left: leftDetail?.navigation?.length ? leftDetail.navigation.join(", ") : "-", right: rightDetail?.navigation?.length ? rightDetail.navigation.join(", ") : "-" },
      ],
    },
    {
      title: "Support & Links",
      rows: [
        { label: "Official Page", left: officialPageCell(leftDetail?.sourceUrl), right: officialPageCell(rightDetail?.sourceUrl) },
      ],
    },
  ];

  const normalized = sections
    .map((section) => {
      const rows = section.rows
        .filter((row) => hasValueNode(row.left) || hasValueNode(row.right))
        .map((row) => ({
          ...row,
          left: hasValueNode(row.left) ? row.left : "-",
          right: hasValueNode(row.right) ? row.right : "-",
          leftNum: hasValueNode(row.left) ? row.leftNum : undefined,
          rightNum: hasValueNode(row.right) ? row.rightNum : undefined,
        }));
      return { ...section, rows };
    })
    .filter((section) => section.rows.length > 0);

  return normalized;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { leftSlug, rightSlug } = parseCompareSlug(slug);
  const siteUrl = getPublicSiteUrl();
  const canonicalUrl = `${siteUrl}/processors/compare/${slug}`;
  if (!leftSlug || !rightSlug) {
    return {
      title: "Processor Comparison",
      description: "Compare processor specs side-by-side.",
      alternates: { canonical: canonicalUrl },
    };
  }
  const profiles = await listProcessorProfiles();
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  const left = bySlug.get(leftSlug);
  const right = bySlug.get(rightSlug);
  if (!left || !right) {
    return {
      title: "Processor Comparison",
      description: "Compare processor specs side-by-side.",
      alternates: { canonical: canonicalUrl },
    };
  }
  const title = `${left.name} vs ${right.name}`;
  const description = `Detailed processor comparison: ${left.name} vs ${right.name}.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: "Technology Stuff",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ProcessorCompareSlugPage({ params }: Props) {
  const { slug } = await params;
  const { leftSlug, rightSlug } = parseCompareSlug(slug);
  if (!leftSlug || !rightSlug) notFound();
  const siteUrl = getPublicSiteUrl();
  const canonicalUrl = `${siteUrl}/processors/compare/${slug}`;

  const [profiles, allDetailsBySlug, smartphones] = await Promise.all([
    listProcessorProfiles(),
    listProcessorDetailsBySlug(),
    listExploreProductsSmartphoneCached(),
  ]);
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  const left = bySlug.get(leftSlug);
  const right = bySlug.get(rightSlug);
  if (!left || !right) notFound();

  const [leftDetail, rightDetail] = await Promise.all([
    getProcessorDetailBySlug(left.slug),
    getProcessorDetailBySlug(right.slug),
  ]);
  const gamingReferences = calculateGamingScoreReferences(Object.values(allDetailsBySlug));
  const performanceReferences = calculatePerformanceScoreReferences(
    Object.values(allDetailsBySlug),
    profiles.map((item) => Number(item.antutu || 0)),
    profiles.map((item) => Number(item.maxCpuGhz || 0))
  );
  const aiReferences = calculateAiScoreReferences(Object.values(allDetailsBySlug));
  const sections = buildSections(left, right, leftDetail, rightDetail, gamingReferences, performanceReferences, aiReferences);
  const leftAlternatives = buildAlternativeMatchups(left, right, profiles, allDetailsBySlug);
  const rightAlternatives = buildAlternativeMatchups(right, left, profiles, allDetailsBySlug);
  const leftPhones = buildProcessorPhoneMatches(left.name, smartphones);
  const rightPhones = buildProcessorPhoneMatches(right.name, smartphones);
  const [compareComments, compareVotes] = await Promise.all([
    listProcessorCompareDiscussionPublic(slug),
    getProcessorCompareVotes({
      compareSlug: slug,
      leftSlug: left.slug,
      rightSlug: right.slug,
      leftName: left.name,
      rightName: right.name,
    }),
  ]);
  const cookieStore = await cookies();
  const initialHasVoted = Boolean(cookieStore.get(compareVoteCookieName(slug))?.value);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Processors", item: `${siteUrl}/processors` },
      { "@type": "ListItem", position: 3, name: "Compare", item: canonicalUrl },
    ],
  };
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${left.name} vs ${right.name}`,
    description: `Detailed processor comparison: ${left.name} vs ${right.name}.`,
    url: canonicalUrl,
  };

  return (
    <main className="mobile-container py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <section className="mb-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/" className="rounded px-1 py-0.5 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">Home</Link>
          <span className="text-slate-300">/</span>
          <Link href="/processors" className="rounded px-1 py-0.5 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">Processors</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">Compare</span>
        </div>
      </section>

      <section className="panel">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h1 className="text-base font-extrabold text-slate-900 sm:text-2xl">{`${left.name} vs ${right.name}`}</h1>
          <p className="mt-1 text-sm text-slate-600">Processor specification comparison</p>
        </div>

        <div className="grid grid-cols-[1fr_42px_1fr] border-b border-slate-200 max-[360px]:grid-cols-[1fr_38px_1fr] sm:grid-cols-[1fr_72px_1fr]">
          <div className="bg-white px-2 py-3 sm:px-4">
            <div className="mb-2 flex justify-end">
              <Link
                href={`/processors?left=${encodeURIComponent(right.slug)}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm font-bold text-slate-500 hover:border-red-300 hover:text-red-600"
                title={`Remove ${left.name}`}
                aria-label={`Remove ${left.name}`}
              >
                x
              </Link>
            </div>
            <Link href={`/processors/${left.slug}`} className="mx-auto flex w-fit flex-col items-center text-center hover:opacity-95">
              <ProcessorChipVisual
                name={left.name}
                vendor={left.vendor}
                className="h-[clamp(4.5rem,24vw,7rem)] w-[clamp(4.5rem,24vw,7rem)] sm:h-24 sm:w-24 md:h-28 md:w-28"
              />
              <ProcessorNameLabel
                name={left.name}
                vendor={left.vendor}
                allowSingleLine={false}
                className="mt-2 max-w-[180px] min-h-[2.3rem] text-slate-900"
                lineClassName="text-xs font-extrabold leading-tight sm:text-sm md:text-base md:leading-5"
              />
            </Link>
          </div>
          <div className="flex items-center justify-center bg-slate-50">
            <span className="inline-flex h-[clamp(1.9rem,8.8vw,2.25rem)] w-[clamp(1.9rem,8.8vw,2.25rem)] items-center justify-center rounded-full bg-slate-900 text-[clamp(0.75rem,3.2vw,0.9rem)] font-extrabold text-white sm:h-11 sm:w-11 sm:text-sm">VS</span>
          </div>
          <div className="bg-white px-2 py-3 sm:px-4">
            <div className="mb-2 flex justify-end">
              <Link
                href={`/processors?left=${encodeURIComponent(left.slug)}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm font-bold text-slate-500 hover:border-red-300 hover:text-red-600"
                title={`Remove ${right.name}`}
                aria-label={`Remove ${right.name}`}
              >
                x
              </Link>
            </div>
            <Link href={`/processors/${right.slug}`} className="mx-auto flex w-fit flex-col items-center text-center hover:opacity-95">
              <ProcessorChipVisual
                name={right.name}
                vendor={right.vendor}
                className="h-[clamp(4.5rem,24vw,7rem)] w-[clamp(4.5rem,24vw,7rem)] sm:h-24 sm:w-24 md:h-28 md:w-28"
              />
              <ProcessorNameLabel
                name={right.name}
                vendor={right.vendor}
                allowSingleLine={false}
                className="mt-2 max-w-[180px] min-h-[2.3rem] text-slate-900"
                lineClassName="text-xs font-extrabold leading-tight sm:text-sm md:text-base md:leading-5"
              />
            </Link>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="sticky top-[6.5rem] z-30 mb-0 overflow-hidden border-y border-slate-200 bg-white shadow-sm sm:top-14">
            <div className="grid grid-cols-2 text-sm md:hidden">
              <div className="border-r border-slate-200 bg-white px-3 py-2 text-center font-bold text-slate-900">
                {(() => {
                  const n = compareNameLines(left.name, left.vendor);
                  return (
                    <span className="block leading-tight">
                      <span className="block">{n.line1}</span>
                      <span className="block">{n.line2}</span>
                    </span>
                  );
                })()}
              </div>
              <div className="bg-white px-3 py-2 text-center font-bold text-slate-900">
                {(() => {
                  const n = compareNameLines(right.name, right.vendor);
                  return (
                    <span className="block leading-tight">
                      <span className="block">{n.line1}</span>
                      <span className="block">{n.line2}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="hidden min-w-[720px] grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] text-sm md:grid">
              <div className="border-r border-slate-200 bg-slate-100 px-3 py-2 font-bold text-slate-800">Specification</div>
              <div className="border-r border-slate-200 bg-white px-3 py-2 font-bold text-slate-900">{left.name}</div>
              <div className="bg-white px-3 py-2 font-bold text-slate-900">{right.name}</div>
            </div>
          </div>
          <div className="space-y-3 pt-3">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-1 px-1 md:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-700">
                    {renderTitleIcon(iconForSection(section.title))}
                  </span>
                  <span className="text-[13px] font-extrabold uppercase tracking-wide text-blue-700">{section.title}</span>
                </span>
              </div>
            <details open className="rounded-lg border border-slate-200 bg-white">
              <summary className="hidden cursor-pointer list-none border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 md:block">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-700">
                    {renderTitleIcon(iconForSection(section.title))}
                  </span>
                  <span className="text-[13px] font-extrabold uppercase tracking-wide text-blue-700">{section.title}</span>
                </span>
              </summary>
              <div className="md:hidden">
                {section.rows.map((row) => {
                  const win = rowBest(Number(row.leftNum), Number(row.rightNum), row.lowerIsBetter === true);
                  return (
                    <div key={`${section.title}-${row.label}`} className="border-b border-slate-200 last:border-b-0">
                      <div className="bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{row.label}</div>
                      <div className="grid grid-cols-2 text-sm">
                        <div className={`border-r border-slate-200 px-3 py-2 text-center whitespace-pre-line ${row.leftNum !== undefined && row.rightNum !== undefined ? tone(win, "left") : "bg-white text-slate-800"}`}>
                          {mobileListLines(row.left)}
                        </div>
                        <div className={`px-3 py-2 text-center whitespace-pre-line ${row.leftNum !== undefined && row.rightNum !== undefined ? tone(win, "right") : "bg-white text-slate-800"}`}>
                          {mobileListLines(row.right)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] text-sm">
                    {section.rows.map((row) => {
                      const win = rowBest(Number(row.leftNum), Number(row.rightNum), row.lowerIsBetter === true);
                      return (
                        <div key={`${section.title}-${row.label}`} className="contents">
                          <div className="flex items-center border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{row.label}</div>
                          <div className={`border-b border-r border-slate-200 px-3 py-2 whitespace-pre-line ${row.leftNum !== undefined && row.rightNum !== undefined ? tone(win, "left") : "bg-white text-slate-800"}`}>
                            {row.left}
                          </div>
                          <div className={`border-b border-slate-200 px-3 py-2 whitespace-pre-line ${row.leftNum !== undefined && row.rightNum !== undefined ? tone(win, "right") : "bg-white text-slate-800"}`}>
                            {row.right}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>
            </div>
          ))}
          </div>
        </div>
      </section>

      <ProcessorComparePhonesSection
        title={`Smartphones With ${left.name}`}
        items={leftPhones}
      />

      <ProcessorComparePhonesSection
        title={`Smartphones With ${right.name}`}
        items={rightPhones}
      />

      <ProcessorCompareMoreSection
        items={leftAlternatives}
        title={`Compare ${left.name} With Similar Processors`}
      />

      <ProcessorCompareMoreSection
        items={rightAlternatives}
        title={`Compare ${right.name} With Similar Processors`}
      />

      <ProcessorCompareCommunity
        compareSlug={slug}
        leftSlug={left.slug}
        rightSlug={right.slug}
        leftName={left.name}
        rightName={right.name}
        initialComments={compareComments}
        initialVotes={compareVotes}
        initialHasVoted={initialHasVoted}
      />
    </main>
  );
}










