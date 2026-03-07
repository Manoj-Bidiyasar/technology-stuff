import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ProcessorCompareMoreSection from "@/components/ProcessorCompareMoreSection";
import { getProcessorDetailBySlug } from "@/lib/processors/details";
import { listProcessorProfiles, type ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  params: Promise<{ slug: string }>;
};

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

function iconForSection(title: string): "bench" | "cpu" | "memory" | "graphics" | "display" | "connectivity" | "camera" | "power" | "chip" {
  if (title === "AnTuTu Benchmark Score") return "bench";
  if (title === "Geekbench Score") return "bench";
  if (title === "3DMark Score") return "bench";
  if (title === "Benchmarks") return "bench";
  if (title === "CPU Architecture") return "cpu";
  if (title === "Graphics (GPU)") return "graphics";
  if (title === "AI") return "chip";
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

function toMonthYear(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return raw;
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

function valueScore(profile: ProcessorProfile): number {
  const usage = Math.min(100, (profile.phoneCount || 0) * 12);
  const avg = Math.min(100, Math.round((profile.avgPhoneScore || 0) * 10));
  return Math.round(avg * 0.7 + usage * 0.3);
}

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

function inferCoreCount(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (Number.isFinite(detail?.coreCount)) return String(detail?.coreCount);
  const raw = String(detail?.cores || "");
  const m = raw.match(/\b(\d+)\b/);
  return m ? m[1] : "-";
}

function inferCoreConfig(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const explicit = String(detail?.coreConfiguration || "").trim();
  if (explicit) return explicit;
  const raw = String(detail?.cores || "").trim();
  const bracket = raw.match(/\((.+)\)/);
  if (bracket?.[1]) return bracket[1].trim();
  return raw || "-";
}

function formatCoreConfigForCompare(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const config = inferCoreConfig(detail);
  if (config === "-") return "-";
  const rows = config
    .split(",")
    .map((item) => item.trim())
    .map((item) => item.replace(/\bCortex-/gi, "ARM Cortex-"))
    .filter(Boolean);
  return rows.length ? rows.join("\n") : config;
}

function inferGpuCores(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>, gpuName?: string): string {
  if (Number.isFinite(detail?.pipelines) && (detail?.pipelines as number) > 0) return String(detail?.pipelines);
  const raw = String(gpuName || "");
  const mp = raw.match(/\bMP\s*([0-9]+)\b/i);
  return mp?.[1] || "-";
}

function formatCpuFeatures(detail?: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  const list = (detail?.cpuFeatures || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (!list.length) return "-";
  const architecture = String(detail?.architecture || "").trim().toLowerCase();
  const instructionSet = String(detail?.instructionSet || "").trim().toLowerCase();
  const filtered = list.filter((item) => {
    const x = item.toLowerCase();
    if (architecture && (x === architecture || x.includes(architecture))) return false;
    if (instructionSet && (x === instructionSet || x.includes(instructionSet))) return false;
    return true;
  });
  return filtered.length ? filtered.join(", ") : "-";
}

function rowBest(left: number, right: number, lowerIsBetter = false): "left" | "right" | "tie" {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return "tie";
  if (left === right) return "tie";
  if (lowerIsBetter) return left < right ? "left" : "right";
  return left > right ? "left" : "right";
}

function tone(win: "left" | "right" | "tie", side: "left" | "right"): string {
  return win === side ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800";
}

function parseCompareSlug(slug: string) {
  const parts = slug.split("-vs-").map((v) => v.trim()).filter(Boolean);
  return {
    leftSlug: parts[0] || "",
    rightSlug: parts[1] || "",
  };
}

function buildMoreMatchups(left: ProcessorProfile, right: ProcessorProfile, all: ProcessorProfile[]) {
  const pool = all.filter((p) => p.slug !== left.slug && p.slug !== right.slug);
  const byDistance = [...pool].sort((a, b) => {
    const da = Math.min(Math.abs((a.antutu || 0) - (left.antutu || 0)), Math.abs((a.antutu || 0) - (right.antutu || 0)));
    const db = Math.min(Math.abs((b.antutu || 0) - (left.antutu || 0)), Math.abs((b.antutu || 0) - (right.antutu || 0)));
    return da - db;
  });

  const pairs: Array<{
    slug: string;
    leftSlug: string;
    rightSlug: string;
    leftVendor: string;
    rightVendor: string;
    leftName: string;
    rightName: string;
  }> = [];
  const seen = new Set<string>();
  const add = (a: ProcessorProfile, b: ProcessorProfile) => {
    if (!a?.slug || !b?.slug || a.slug === b.slug) return;
    const key = [a.slug, b.slug].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({
      slug: `${a.slug}-vs-${b.slug}`,
      leftSlug: a.slug,
      rightSlug: b.slug,
      leftVendor: a.vendor,
      rightVendor: b.vendor,
      leftName: a.name,
      rightName: b.name,
    });
  };

  for (const candidate of byDistance.slice(0, 12)) add(left, candidate);
  for (const candidate of byDistance.slice(0, 12)) add(right, candidate);
  for (let i = 0; i + 1 < byDistance.length && pairs.length < 24; i += 2) add(byDistance[i], byDistance[i + 1]);

  return pairs.slice(0, 24);
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

function formatMemoryTypes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const values = detail.memoryTypes?.length ? detail.memoryTypes : (detail.memoryType ? [detail.memoryType] : []);
  return values.length ? values.join(", ") : "-";
}

function getMemoryFrequencyRows(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const map = detail.memoryFreqByType || {};
  const rows = Object.entries(map)
    .filter(([k, v]) => String(k).trim() && Number.isFinite(Number(v)))
    .map(([k, v]) => `${k}: ${Number(v)} MHz`);
  if (rows.length) return rows.join(", ");
  if (Number.isFinite(detail.memoryFreqMhz)) return `${detail.memoryFreqMhz} MHz`;
  return "-";
}

function formatStorageTypes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const values = detail.storageTypes?.length ? detail.storageTypes : (detail.storageType ? [detail.storageType] : []);
  return values.length ? values.join(", ") : "-";
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
    const numKey = raw.toUpperCase().replace("WIFI", "").trim();
    if (map[numKey]) return map[numKey];
  }
  return raw;
}

function formatBluetooth(value?: string, features?: string[]): string {
  const raw = String(value || "").trim();
  const base = raw || "-";
  const extra = features?.length ? ` (${features.join(", ")})` : "";
  return base === "-" ? "-" : `${base}${extra}`;
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

function cacheScore(value: string): number {
  const raw = String(value || "").toLowerCase();
  const n = firstNumber(raw);
  if (!Number.isFinite(n)) return NaN;
  if (raw.includes("mb")) return n;
  if (raw.includes("kb")) return n / 1024;
  if (raw.includes("gb")) return n * 1024;
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
  const ufs = /UFS\s*([0-9]+(\.[0-9]+)?)/g;
  let m: RegExpExecArray | null = ufs.exec(raw);
  while (m) {
    const n = Number(m[1]);
    if (!Number.isFinite(best) || n > best) best = n;
    m = ufs.exec(raw);
  }
  const emmc = /EMMC\s*([0-9]+(\.[0-9]+)?)/g;
  m = emmc.exec(raw);
  while (m) {
    const n = Number(m[1]) * 0.1;
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
  const text = String(raw || "").trim();
  if (!text) return text;
  const parts = text.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return text;
  const parsed = parts.map((p) => {
    const m = p.match(/^(\d+)\s*mp?$/i);
    return m ? Number(m[1]) : NaN;
  });
  if (parsed.some((n) => !Number.isFinite(n))) return text;
  const first = parsed[0];
  if (parsed.every((n) => n === first)) return `${parts.length}x${first}MP`;
  return text;
}

function formatCameraSupportModes(detail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>): string {
  if (!detail) return "-";
  const list = (detail.cameraSupportModes || []).map((m) => normalizeCameraMode(m)).filter(Boolean);
  if (list.length) return list.join(", ");
  return normalizeCameraMode(String(detail.maxCameraSupport || detail.cameraSupport || "-"));
}

function buildSections(
  left: ProcessorProfile,
  right: ProcessorProfile,
  leftDetail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>,
  rightDetail: Awaited<ReturnType<typeof getProcessorDetailBySlug>>
): SpecSection[] {
  const left3dName = asText(leftDetail?.benchmarks?.threeDMarkName);
  const right3dName = asText(rightDetail?.benchmarks?.threeDMarkName);
  const left3dScore = asText(leftDetail?.benchmarks?.threeDMark);
  const right3dScore = asText(rightDetail?.benchmarks?.threeDMark);
  const same3dName = left3dName !== "-" && right3dName !== "-" && left3dName.toLowerCase() === right3dName.toLowerCase();
  const markName = same3dName ? left3dName : (left3dName !== "-" ? left3dName : (right3dName !== "-" ? right3dName : ""));
  const markRowLabel = markName ? `3DMark ${markName}` : "3DMark";

  const sections: SpecSection[] = [
    {
      title: "Overview",
      rows: [
        { label: "Announced", left: toMonthYear(leftDetail?.announced), right: toMonthYear(rightDetail?.announced) },
        { label: "Model Number", left: asText(leftDetail?.model), right: asText(rightDetail?.model) },
        { label: "Manufacturer", left: asText(leftDetail?.manufacturer), right: asText(rightDetail?.manufacturer) },
        { label: "Class", left: chipClass(left.antutu, leftDetail?.className), right: chipClass(right.antutu, rightDetail?.className) },
        { label: "Performance Score", left: `${perfIndex(left.antutu || 0)}/100`, right: `${perfIndex(right.antutu || 0)}/100`, leftNum: perfIndex(left.antutu || 0), rightNum: perfIndex(right.antutu || 0) },
        { label: "Efficiency Score", left: `${efficiency(left.fabricationNm)}/100`, right: `${efficiency(right.fabricationNm)}/100`, leftNum: efficiency(left.fabricationNm), rightNum: efficiency(right.fabricationNm) },
        { label: "Gaming Score", left: `${gaming(left)}/100`, right: `${gaming(right)}/100`, leftNum: gaming(left), rightNum: gaming(right) },
        { label: "Value Score", left: `${valueScore(left)}/100`, right: `${valueScore(right)}/100`, leftNum: valueScore(left), rightNum: valueScore(right) },
      ],
    },
    {
      title: "AnTuTu Benchmark Score",
      rows: [
        {
          label: "AnTuTu Version",
          left: formatBenchVersion("AnTuTu", leftDetail?.benchmarks?.antutuVersion),
          right: formatBenchVersion("AnTuTu", rightDetail?.benchmarks?.antutuVersion),
        },
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
      title: "Geekbench Score",
      rows: [
        {
          label: "Geekbench Version",
          left: formatBenchVersion("Geekbench", leftDetail?.benchmarks?.geekbenchVersion),
          right: formatBenchVersion("Geekbench", rightDetail?.benchmarks?.geekbenchVersion),
        },
        {
          label: "Geekbench Single-Core",
          left: asText(leftDetail?.benchmarks?.geekbenchSingle),
          right: asText(rightDetail?.benchmarks?.geekbenchSingle),
          leftNum: Number(leftDetail?.benchmarks?.geekbenchSingle),
          rightNum: Number(rightDetail?.benchmarks?.geekbenchSingle),
        },
        {
          label: "Geekbench Multi-Core",
          left: asText(leftDetail?.benchmarks?.geekbenchMulti),
          right: asText(rightDetail?.benchmarks?.geekbenchMulti),
          leftNum: Number(leftDetail?.benchmarks?.geekbenchMulti),
          rightNum: Number(rightDetail?.benchmarks?.geekbenchMulti),
        },
      ],
    },
    {
      title: "3DMark Score",
      rows: [
        {
          label: markRowLabel,
          left: left3dScore,
          right: right3dScore,
          leftNum: Number(leftDetail?.benchmarks?.threeDMark),
          rightNum: Number(rightDetail?.benchmarks?.threeDMark),
        },
      ],
    },
    {
      title: "CPU Architecture",
      rows: [
        { label: "Cores", left: inferCoreCount(leftDetail), right: inferCoreCount(rightDetail), leftNum: Number(inferCoreCount(leftDetail)), rightNum: Number(inferCoreCount(rightDetail)) },
        { label: "Core Configuration", left: formatCoreConfigForCompare(leftDetail), right: formatCoreConfigForCompare(rightDetail) },
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
        { label: "TDP", left: Number.isFinite(leftDetail?.tdpW) ? `${leftDetail?.tdpW} W` : "-", right: Number.isFinite(rightDetail?.tdpW) ? `${rightDetail?.tdpW} W` : "-", leftNum: Number(leftDetail?.tdpW), rightNum: Number(rightDetail?.tdpW) },
        { label: "L2 Cache", left: asText(leftDetail?.l2Cache), right: asText(rightDetail?.l2Cache), leftNum: cacheScore(asText(leftDetail?.l2Cache)), rightNum: cacheScore(asText(rightDetail?.l2Cache)) },
        { label: "L3 Cache", left: asText(leftDetail?.l3Cache), right: asText(rightDetail?.l3Cache), leftNum: cacheScore(asText(leftDetail?.l3Cache)), rightNum: cacheScore(asText(rightDetail?.l3Cache)) },
        { label: "Other CPU Features", left: formatCpuFeatures(leftDetail), right: formatCpuFeatures(rightDetail) },
      ],
    },
    {
      title: "Graphics (GPU)",
      rows: [
        { label: "GPU Name", left: asText(left.gpu || leftDetail?.gpuName), right: asText(right.gpu || rightDetail?.gpuName) },
        { label: "Architecture (GPU)", left: asText(leftDetail?.gpuArchitecture), right: asText(rightDetail?.gpuArchitecture), leftNum: architectureScore(asText(leftDetail?.gpuArchitecture)), rightNum: architectureScore(asText(rightDetail?.gpuArchitecture)) },
        { label: "GPU Cores", left: inferGpuCores(leftDetail, left.gpu || leftDetail?.gpuName), right: inferGpuCores(rightDetail, right.gpu || rightDetail?.gpuName), leftNum: Number(inferGpuCores(leftDetail, left.gpu || leftDetail?.gpuName)), rightNum: Number(inferGpuCores(rightDetail, right.gpu || rightDetail?.gpuName)) },
        {
          label: "GPU Frequency",
          left: leftDetail?.gpuFrequencyMhz ? `${leftDetail.gpuFrequencyMhz} MHz` : "-",
          right: rightDetail?.gpuFrequencyMhz ? `${rightDetail.gpuFrequencyMhz} MHz` : "-",
          leftNum: Number(leftDetail?.gpuFrequencyMhz),
          rightNum: Number(rightDetail?.gpuFrequencyMhz),
        },
        { label: "Vulkan Version", left: asText(leftDetail?.vulkanVersion), right: asText(rightDetail?.vulkanVersion), leftNum: apiScore(asText(leftDetail?.vulkanVersion)), rightNum: apiScore(asText(rightDetail?.vulkanVersion)) },
        { label: "OpenCL Version", left: asText(leftDetail?.openclVersion), right: asText(rightDetail?.openclVersion), leftNum: apiScore(asText(leftDetail?.openclVersion)), rightNum: apiScore(asText(rightDetail?.openclVersion)) },
        { label: "DirectX Version", left: asText(leftDetail?.directxVersion), right: asText(rightDetail?.directxVersion), leftNum: apiScore(asText(leftDetail?.directxVersion)), rightNum: apiScore(asText(rightDetail?.directxVersion)) },
        { label: "Other GPU Features", left: leftDetail?.gpuFeatures?.length ? leftDetail.gpuFeatures.join(", ") : "-", right: rightDetail?.gpuFeatures?.length ? rightDetail.gpuFeatures.join(", ") : "-" },
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
        { label: "Memory Type", left: formatMemoryTypes(leftDetail), right: formatMemoryTypes(rightDetail), leftNum: memoryTypeScore(formatMemoryTypes(leftDetail)), rightNum: memoryTypeScore(formatMemoryTypes(rightDetail)) },
        { label: "Memory Frequency", left: getMemoryFrequencyRows(leftDetail), right: getMemoryFrequencyRows(rightDetail), leftNum: memoryFreqScore(getMemoryFrequencyRows(leftDetail)), rightNum: memoryFreqScore(getMemoryFrequencyRows(rightDetail)) },
        { label: "Memory Channels", left: asText(leftDetail?.memoryChannels), right: asText(rightDetail?.memoryChannels), leftNum: channelsScore(asText(leftDetail?.memoryChannels)), rightNum: channelsScore(asText(rightDetail?.memoryChannels)) },
        { label: "Memory Bus Width", left: Number.isFinite(leftDetail?.memoryBusWidthBits) ? `${leftDetail?.memoryBusWidthBits}-bit` : "-", right: Number.isFinite(rightDetail?.memoryBusWidthBits) ? `${rightDetail?.memoryBusWidthBits}-bit` : "-", leftNum: Number(leftDetail?.memoryBusWidthBits), rightNum: Number(rightDetail?.memoryBusWidthBits) },
        { label: "Bandwidth", left: Number.isFinite(leftDetail?.bandwidthGbps) ? `${num(leftDetail?.bandwidthGbps, 1)} GB/s` : "-", right: Number.isFinite(rightDetail?.bandwidthGbps) ? `${num(rightDetail?.bandwidthGbps, 1)} GB/s` : "-", leftNum: Number(leftDetail?.bandwidthGbps), rightNum: Number(rightDetail?.bandwidthGbps) },
        { label: "Max Memory", left: leftDetail?.maxMemoryGb ? `${leftDetail.maxMemoryGb}GB` : "-", right: rightDetail?.maxMemoryGb ? `${rightDetail.maxMemoryGb}GB` : "-", leftNum: Number(leftDetail?.maxMemoryGb), rightNum: Number(rightDetail?.maxMemoryGb) },
        { label: "Storage Type", left: formatStorageTypes(leftDetail), right: formatStorageTypes(rightDetail), leftNum: storageTypeScore(formatStorageTypes(leftDetail)), rightNum: storageTypeScore(formatStorageTypes(rightDetail)) },
      ],
    },
    {
      title: "Camera & Video Recording",
      rows: [
        { label: "Camera ISP", left: asText(leftDetail?.cameraIsp), right: asText(rightDetail?.cameraIsp) },
        { label: "Camera Support Modes", left: formatCameraSupportModes(leftDetail), right: formatCameraSupportModes(rightDetail), leftNum: maxMpScore(formatCameraSupportModes(leftDetail)), rightNum: maxMpScore(formatCameraSupportModes(rightDetail)) },
        { label: "Other Camera Features", left: leftDetail?.cameraFeatures?.length ? leftDetail.cameraFeatures.join(", ") : "-", right: rightDetail?.cameraFeatures?.length ? rightDetail.cameraFeatures.join(", ") : "-" },
        { label: "Video Recording Modes", left: leftDetail?.videoRecordingModes?.length ? leftDetail.videoRecordingModes.join(", ") : asText(leftDetail?.maxVideoCapture || leftDetail?.videoCapture), right: rightDetail?.videoRecordingModes?.length ? rightDetail.videoRecordingModes.join(", ") : asText(rightDetail?.maxVideoCapture || rightDetail?.videoCapture), leftNum: mediaCapabilityScore(leftDetail?.videoRecordingModes?.length ? leftDetail.videoRecordingModes.join(", ") : asText(leftDetail?.maxVideoCapture || leftDetail?.videoCapture)), rightNum: mediaCapabilityScore(rightDetail?.videoRecordingModes?.length ? rightDetail.videoRecordingModes.join(", ") : asText(rightDetail?.maxVideoCapture || rightDetail?.videoCapture)) },
        { label: "Other Video Features", left: leftDetail?.videoFeatures?.length ? leftDetail.videoFeatures.join(", ") : "-", right: rightDetail?.videoFeatures?.length ? rightDetail.videoFeatures.join(", ") : "-" },
        { label: "Video Playback", left: asText(leftDetail?.videoPlayback), right: asText(rightDetail?.videoPlayback), leftNum: mediaCapabilityScore(asText(leftDetail?.videoPlayback)), rightNum: mediaCapabilityScore(asText(rightDetail?.videoPlayback)) },
      ],
    },
    {
      title: "Display & Multimedia",
      rows: [
        { label: "Display Modes", left: leftDetail?.displayModes?.length ? leftDetail.displayModes.join(", ") : asText((leftDetail?.maxDisplayResolution || leftDetail?.maxRefreshRateHz) ? `${leftDetail?.maxDisplayResolution || "-"}${leftDetail?.maxRefreshRateHz ? ` @ ${leftDetail.maxRefreshRateHz}Hz` : ""}` : "-"), right: rightDetail?.displayModes?.length ? rightDetail.displayModes.join(", ") : asText((rightDetail?.maxDisplayResolution || rightDetail?.maxRefreshRateHz) ? `${rightDetail?.maxDisplayResolution || "-"}${rightDetail?.maxRefreshRateHz ? ` @ ${rightDetail.maxRefreshRateHz}Hz` : ""}` : "-"), leftNum: mediaCapabilityScore(leftDetail?.displayModes?.length ? leftDetail.displayModes.join(", ") : asText((leftDetail?.maxDisplayResolution || leftDetail?.maxRefreshRateHz) ? `${leftDetail?.maxDisplayResolution || "-"}${leftDetail?.maxRefreshRateHz ? ` @ ${leftDetail.maxRefreshRateHz}Hz` : ""}` : "-")), rightNum: mediaCapabilityScore(rightDetail?.displayModes?.length ? rightDetail.displayModes.join(", ") : asText((rightDetail?.maxDisplayResolution || rightDetail?.maxRefreshRateHz) ? `${rightDetail?.maxDisplayResolution || "-"}${rightDetail?.maxRefreshRateHz ? ` @ ${rightDetail.maxRefreshRateHz}Hz` : ""}` : "-")) },
        { label: "Output Display", left: asText(leftDetail?.outputDisplay), right: asText(rightDetail?.outputDisplay) },
        { label: "Display Features", left: leftDetail?.displayFeatures?.length ? leftDetail.displayFeatures.join(", ") : "-", right: rightDetail?.displayFeatures?.length ? rightDetail.displayFeatures.join(", ") : "-" },
        { label: "Audio Codecs", left: leftDetail?.audioCodecs?.length ? leftDetail.audioCodecs.join(", ") : "-", right: rightDetail?.audioCodecs?.length ? rightDetail.audioCodecs.join(", ") : "-" },
        { label: "Multimedia Features", left: leftDetail?.multimediaFeatures?.length ? leftDetail.multimediaFeatures.join(", ") : "-", right: rightDetail?.multimediaFeatures?.length ? rightDetail.multimediaFeatures.join(", ") : "-" },
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
        { label: "Quick Charging", left: asText(leftDetail?.quickCharging), right: asText(rightDetail?.quickCharging) },
        { label: "Charging Speed", left: splitSupportLines(leftDetail?.chargingSpeed).join("\n") || "-", right: splitSupportLines(rightDetail?.chargingSpeed).join("\n") || "-" },
        { label: "Official Page", left: officialPageCell(leftDetail?.sourceUrl), right: officialPageCell(rightDetail?.sourceUrl) },
      ],
    },
  ];

  return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { leftSlug, rightSlug } = parseCompareSlug(slug);
  if (!leftSlug || !rightSlug) {
    return {
      title: "Processor Comparison",
      description: "Compare processor specs side-by-side.",
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
    };
  }
  return {
    title: `${left.name} vs ${right.name}`,
    description: `Detailed processor comparison: ${left.name} vs ${right.name}.`,
  };
}

export default async function ProcessorCompareSlugPage({ params }: Props) {
  const { slug } = await params;
  const { leftSlug, rightSlug } = parseCompareSlug(slug);
  if (!leftSlug || !rightSlug) notFound();

  const profiles = await listProcessorProfiles();
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  const left = bySlug.get(leftSlug);
  const right = bySlug.get(rightSlug);
  if (!left || !right) notFound();

  const [leftDetail, rightDetail] = await Promise.all([
    getProcessorDetailBySlug(left.slug),
    getProcessorDetailBySlug(right.slug),
  ]);
  const leftTile = getChipTileMeta(left.name, left.vendor);
  const rightTile = getChipTileMeta(right.name, right.vendor);
  const leftSeries = getChipSeriesInfo(left.name, left.vendor);
  const rightSeries = getChipSeriesInfo(right.name, right.vendor);

  const sections = buildSections(left, right, leftDetail, rightDetail);
  const moreMatchups = buildMoreMatchups(left, right, profiles);

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="mb-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/" className="text-slate-600 hover:text-blue-700">Home</Link>
          <span className="text-slate-300">/</span>
          <Link href="/processors" className="text-slate-600 hover:text-blue-700">Processors</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">Compare</span>
        </div>
      </section>

      <section className="panel">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{`${left.name} vs ${right.name}`}</h1>
          <p className="mt-1 text-sm text-slate-600">Processor specification comparison</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:border-b md:border-slate-200">
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:border-b-0">
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
              <div className={`relative h-24 w-24 overflow-hidden rounded-md border border-white/10 sm:h-28 sm:w-28 ${leftTile.tone} ${leftTile.edge}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
                <div className="relative h-full p-3">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] bg-clip-text text-[13px] font-black uppercase leading-none tracking-[0.05em] text-transparent drop-shadow-[0_0_6px_rgba(255,210,120,0.35)] sm:text-[14px]">
                    {leftTile.brand}
                  </div>
                  {leftSeries ? (
                    <div className="absolute bottom-2.5 right-2.5 max-w-[60%] text-right leading-tight">
                      <div className={`truncate text-[9px] ${leftSeries.isPremium ? "font-bold uppercase tracking-[0.08em] text-[#f6c874]" : "font-semibold tracking-[0.02em] text-slate-100"}`}>{leftSeries.line1}</div>
                      {leftSeries.line2 ? <div className={`text-[10px] ${leftSeries.isPremium ? "font-black uppercase tracking-[0.04em] text-[#ffe3a9]" : "font-semibold tracking-[0.02em] text-slate-200"}`}>{leftSeries.line2}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="mt-2 block text-lg font-extrabold text-slate-900">{left.name}</span>
            </Link>
          </div>
          <div className="hidden items-center justify-center bg-slate-50 md:flex">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-extrabold text-white">VS</span>
          </div>
          <div className="bg-white px-4 py-3">
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
              <div className={`relative h-24 w-24 overflow-hidden rounded-md border border-white/10 sm:h-28 sm:w-28 ${rightTile.tone} ${rightTile.edge}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />
                <div className="relative h-full p-3">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] bg-clip-text text-[13px] font-black uppercase leading-none tracking-[0.05em] text-transparent drop-shadow-[0_0_6px_rgba(255,210,120,0.35)] sm:text-[14px]">
                    {rightTile.brand}
                  </div>
                  {rightSeries ? (
                    <div className="absolute bottom-2.5 right-2.5 max-w-[60%] text-right leading-tight">
                      <div className={`truncate text-[9px] ${rightSeries.isPremium ? "font-bold uppercase tracking-[0.08em] text-[#f6c874]" : "font-semibold tracking-[0.02em] text-slate-100"}`}>{rightSeries.line1}</div>
                      {rightSeries.line2 ? <div className={`text-[10px] ${rightSeries.isPremium ? "font-black uppercase tracking-[0.04em] text-[#ffe3a9]" : "font-semibold tracking-[0.02em] text-slate-200"}`}>{rightSeries.line2}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="mt-2 block text-lg font-extrabold text-slate-900">{right.name}</span>
            </Link>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="sticky top-14 z-30 mb-0 overflow-hidden border-y border-slate-200 bg-white shadow-sm">
            <div className="grid min-w-[720px] grid-cols-3 text-sm">
              <div className="border-r border-slate-200 bg-slate-100 px-3 py-2 font-bold text-slate-800">Specification</div>
              <div className="border-r border-slate-200 bg-white px-3 py-2 font-bold text-slate-900">{left.name}</div>
              <div className="bg-white px-3 py-2 font-bold text-slate-900">{right.name}</div>
            </div>
          </div>
          <div className="space-y-3 pt-3">
          {sections.map((section) => (
            <details key={section.title} open className="rounded-lg border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-700">
                    {renderTitleIcon(iconForSection(section.title))}
                  </span>
                  <span className="text-[13px] font-extrabold uppercase tracking-wide text-blue-700">{section.title}</span>
                </span>
              </summary>
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-3 text-sm">
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
          ))}
          </div>
        </div>
      </section>

      <ProcessorCompareMoreSection items={moreMatchups} />
    </main>
  );
}

