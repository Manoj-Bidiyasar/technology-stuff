"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProcessorAdmin } from "@/lib/firestore/processors";
import type { ProcessorAdminNoteGroup } from "@/lib/firestore/processorAdminNotes";
import type { ProcessorDetail } from "@/lib/processors/details";
import { calculateAiScore, calculateAiScoreReferences, calculateEfficiencyScore, calculateGamingScore, calculateGamingScoreReferences, calculateMemoryStorageScore, calculatePerformanceScore, calculatePerformanceScoreReferences, calculateTotalScore } from "@/lib/processors/scoring";
import { slugify } from "@/utils/slugify";

type StatusFilter = "all" | "draft" | "review" | "published" | "scheduled" | "recently_deleted";
type BenchmarkDraft = {
  aiScore: string;
  antutuCalcVersion: string;
  antutuCalc: string;
  antutuCalcCpu: string;
  antutuCalcGpu: string;
  antutuVersion: string;
  antutu: string;
  antutuCpu: string;
  antutuGpu: string;
  antutuMemory: string;
  antutuUx: string;
  geekbenchVersion: string;
  geekbenchSingle: string;
  geekbenchMulti: string;
  threeDMarkWildLife: string;
  threeDMarkSolarBay: string;
  threeDMarkSteelNomadLight: string;
  threeDMarkWildLifeExtreme: string;
  threeDMarkWildLifeExtremeMin: string;
  threeDMarkWildLifeExtremeMax: string;
  threeDMarkName: string;
  threeDMark: string;
};
type BenchmarkTableView = "antutu-geekbench" | "ai-3dmark";
type AntutuGeekbenchGroup = "antutu-normal" | "antutu-ranking" | "geekbench";
type Ai3dMarkGroup = "ai-score" | "three-dmark";
type AdminSectionView = "processors" | "scores" | "benchmarks" | "notes";
type BenchmarkVendorFilter = "all" | "qualcomm" | "mediatek-dimensity" | "mediatek-helio" | "samsung-exynos" | "google" | "apple" | "unisoc" | "xiaomi";
type ScoreSortKey = "total" | "performance" | "gpu" | "efficiency" | "ai" | "memoryStorage";
type ScoreSortDirection = "desc" | "asc";
type ProcessorNoteForm = {
  processorNames: string;
  rawPoints: string;
};
const NOTE_BULLET = "\u2022";
const BRAND_OPTIONS = ["Samsung", "Qualcomm", "MediaTek", "Apple", "Google", "Unisoc", "Huawei", "Intel", "AMD"];
const CLASS_FILTER_ORDER = ["Flagship", "Upper Midrange", "Midrange", "Budget", "Entry"] as const;
const BENCHMARK_VENDOR_ORDER: BenchmarkVendorFilter[] = ["qualcomm", "mediatek-dimensity", "mediatek-helio", "samsung-exynos", "google", "apple", "unisoc", "xiaomi"];
const BENCHMARK_VENDOR_LABELS: Record<BenchmarkVendorFilter, string> = {
  all: "All",
  qualcomm: "Qualcomm",
  "mediatek-dimensity": "MediaTek Dimensity",
  "mediatek-helio": "MediaTek Helio",
  "samsung-exynos": "Samsung Exynos",
  google: "Google Tensor",
  apple: "Apple",
  unisoc: "Unisoc",
  xiaomi: "Xiaomi",
};

function normalizeBenchmarkProcessorName(name: string): string {
  const raw = String(name || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("mediatek dimensity ")) return `Dimensity ${raw.slice("MediaTek Dimensity ".length).trim()}`;
  if (lower.startsWith("mediatek helio ")) return `Helio ${raw.slice("MediaTek Helio ".length).trim()}`;
  if (lower.startsWith("samsung exynos ")) return `Exynos ${raw.slice("Samsung Exynos ".length).trim()}`;
  if (lower.startsWith("apple a")) return `Apple ${raw.slice("Apple ".length).trim()}`;
  if (lower.startsWith("qualcomm snapdragon ")) return `Snapdragon ${raw.slice("Qualcomm Snapdragon ".length).trim()}`;
  if (lower.startsWith("xiaomi xrings ")) return `XRING ${raw.slice("Xiaomi XRings ".length).trim()}`;
  if (lower.startsWith("xiaomi xring ")) return `XRING ${raw.slice("Xiaomi XRing ".length).trim()}`;
  if (lower.startsWith("unisoc ")) return raw.slice("Unisoc ".length).trim();
  return raw;
}

function benchmarkSuffixRank(value: string): number {
  const suffix = value.trim().toLowerCase();
  if (!suffix) return 50;
  if (suffix.includes("ultra") || suffix.includes("max") || suffix.includes("pro")) return 90;
  if (suffix.includes("elite")) return 85;
  if (suffix.includes("+")) return 80;
  if (suffix === "s") return 45;
  if (suffix === "e") return 40;
  return 30;
}

function snapdragonSeriesBucket(series: number, hasElite: boolean): number {
  if (hasElite && series === 8) return 5;
  if (series === 8) return 4;
  if (series === 7) return 3;
  if (series === 6) return 2;
  if (series === 4) return 1;
  return 0;
}

function parseSnapdragonName(label: string): { bucket: number; series: number; variant: number; gen: number; extra: string } | null {
  const normalized = label.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^Snapdragon\s+(\d+)(\+|s)?(?:\s+Elite)?(?:\s+Gen\s+(\d+))?(.*)$/i);
  if (!match) return null;
  const series = Number(match[1] || 0);
  const marker = String(match[2] || "").toLowerCase();
  const hasElite = /\belite\b/i.test(normalized);
  const gen = Number(match[3] || 0);
  const extra = String(match[4] || "").trim().toLowerCase();
  const variant = hasElite ? 4 : marker === "+" ? 3 : marker === "" ? 2 : marker === "s" ? 1 : 0;
  return { bucket: snapdragonSeriesBucket(series, hasElite), series, variant, gen, extra };
}

function parseBenchmarkNameParts(name: string): { family: string; prefix: string; num: number; suffix: string; label: string } {
  const label = normalizeBenchmarkProcessorName(name);
  const snapdragon = parseSnapdragonName(label);
  if (snapdragon) {
    return {
      family: "snapdragon",
      prefix: "",
      num: snapdragon.series * 100 + snapdragon.gen,
      suffix: `${snapdragon.variant}:${snapdragon.extra}`,
      label,
    };
  }
  const match = label.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+([A-Za-z]*)(\d+)(.*)$/);
  if (!match) return { family: label.toLowerCase(), prefix: "", num: -1, suffix: "", label };
  return {
    family: match[1].trim().toLowerCase(),
    prefix: String(match[2] || "").trim().toLowerCase(),
    num: Number(match[3] || 0),
    suffix: (match[4] || "").trim(),
    label,
  };
}

function compareProcessorNames(leftName: string, rightName: string): number {
  const left = parseBenchmarkNameParts(leftName);
  const right = parseBenchmarkNameParts(rightName);
  if (left.family !== right.family) return left.family.localeCompare(right.family);
  const leftSnapdragon = parseSnapdragonName(left.label);
  const rightSnapdragon = parseSnapdragonName(right.label);
  if (leftSnapdragon && rightSnapdragon) {
    if (leftSnapdragon.bucket !== rightSnapdragon.bucket) return rightSnapdragon.bucket - leftSnapdragon.bucket;
    if (leftSnapdragon.series !== rightSnapdragon.series) return rightSnapdragon.series - leftSnapdragon.series;
    if (leftSnapdragon.gen !== rightSnapdragon.gen) return rightSnapdragon.gen - leftSnapdragon.gen;
    if (leftSnapdragon.variant !== rightSnapdragon.variant) return rightSnapdragon.variant - leftSnapdragon.variant;
    return left.label.localeCompare(right.label);
  }
  if (left.prefix !== right.prefix) return left.prefix.localeCompare(right.prefix);
  if (left.num !== right.num) return right.num - left.num;
  const suffixGap = benchmarkSuffixRank(right.suffix) - benchmarkSuffixRank(left.suffix);
  if (suffixGap !== 0) return suffixGap;
  return left.label.localeCompare(right.label);
}

function normalizeNoteLine(value: string): string {
  return String(value || "").replace(/^\s*[-*•]\s*/, "").replace(/\s+/g, " ").trim();
}

function parseNoteLines(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  String(value || "")
    .split(/\r?\n/)
    .map((line) => normalizeNoteLine(line))
    .filter(Boolean)
    .forEach((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(line);
    });
  return out;
}

function formatNoteEditorValue(items: string[]): string {
  return items
    .map((item) => normalizeNoteLine(item))
    .map((item) => `${NOTE_BULLET} ${item}`)
    .join("\n");
}

function normalizeProcessorText(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseProcessorNameList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  String(value || "")
    .split(/\r?\n|,/)
    .map((item) => normalizeProcessorText(item))
    .filter(Boolean)
    .forEach((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
  return out;
}

function inferVendorFromProcessorName(name: string): string {
  const text = normalizeProcessorText(name).toLowerCase();
  if (!text) return "Other";
  if (text.includes("snapdragon") || text.includes("qualcomm")) return "Qualcomm";
  if (text.includes("dimensity") || text.includes("helio") || text.includes("mediatek")) return "MediaTek";
  if (text.includes("exynos") || text.includes("samsung")) return "Samsung";
  if (text.includes("tensor") || text.includes("google")) return "Google";
  if (/^a\d{2}\b/.test(text) || text.includes("apple ")) return "Apple";
  if (text.includes("unisoc") || text.includes("tiger")) return "Unisoc";
  if (text.includes("xring") || text.includes("xiaomi")) return "Xiaomi";
  if (text.includes("kirin") || text.includes("huawei")) return "Huawei";
  if (text.includes("intel") || text.includes("core ") || text.includes("atom")) return "Intel";
  if (text.includes("amd") || text.includes("ryzen")) return "AMD";
  return "Other";
}
const BRAND_TITLE_HINTS: Record<string, string[]> = {
  Samsung: ["Exynos"],
  Qualcomm: ["Snapdragon"],
  MediaTek: ["Dimensity", "Helio"],
  Google: ["Tensor"],
  Apple: ["A", "M"],
  Unisoc: ["Tiger", "T"],
  Huawei: ["Kirin"],
  Intel: ["Core", "Atom"],
  AMD: ["Ryzen"],
};

export default function AdminProcessorsPage() {
  const [rows, setRows] = useState<ProcessorAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [createTitle, setCreateTitle] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createSlugInput, setCreateSlugInput] = useState("");
  const [createSlugEdited, setCreateSlugEdited] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [normalizingAll, setNormalizingAll] = useState(false);
  const [benchmarkDrafts, setBenchmarkDrafts] = useState<Record<string, BenchmarkDraft>>({});
  const [benchmarkSavedDrafts, setBenchmarkSavedDrafts] = useState<Record<string, BenchmarkDraft>>({});
  const [benchmarkTableEditing, setBenchmarkTableEditing] = useState(false);
  const [savingBenchmarkIds, setSavingBenchmarkIds] = useState<string[]>([]);
  const [savingBenchmarkBulk, setSavingBenchmarkBulk] = useState(false);
  const [submittingBenchmarkBulk, setSubmittingBenchmarkBulk] = useState(false);
  const [benchmarkQuery, setBenchmarkQuery] = useState("");
  const [benchmarkVendorFilter, setBenchmarkVendorFilter] = useState<BenchmarkVendorFilter>("all");
  const [benchmarkTableView, setBenchmarkTableView] = useState<BenchmarkTableView>("antutu-geekbench");
  const [antutuGeekbenchGroups, setAntutuGeekbenchGroups] = useState<AntutuGeekbenchGroup[]>(["antutu-normal", "antutu-ranking", "geekbench"]);
  const [ai3dMarkGroups, setAi3dMarkGroups] = useState<Ai3dMarkGroup[]>(["ai-score", "three-dmark"]);
  const [adminSectionView, setAdminSectionView] = useState<AdminSectionView>("processors");
  const [adminSectionReady, setAdminSectionReady] = useState(false);
  const [scoreQuery, setScoreQuery] = useState("");
  const [scoreVendorFilter, setScoreVendorFilter] = useState<string>("all");
  const [scoreSortKey, setScoreSortKey] = useState<ScoreSortKey>("total");
  const [scoreSortDirection, setScoreSortDirection] = useState<ScoreSortDirection>("desc");
  const [noteGroups, setNoteGroups] = useState<ProcessorAdminNoteGroup[]>([]);
  const [savedNoteSignatures, setSavedNoteSignatures] = useState<Record<string, string>>({});
  const [noteEditorDrafts, setNoteEditorDrafts] = useState<Record<string, string>>({});
  const [noteQuery, setNoteQuery] = useState("");
  const [noteVendorFilter, setNoteVendorFilter] = useState<string>("all");
  const [noteForm, setNoteForm] = useState<ProcessorNoteForm>({ processorNames: "", rawPoints: "" });
  const [savingNoteGroupIds, setSavingNoteGroupIds] = useState<string[]>([]);
  const [deletingNoteGroupIds, setDeletingNoteGroupIds] = useState<string[]>([]);
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const createTitleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedSection = window.localStorage.getItem("admin-processors-section");
    if (savedSection === "processors" || savedSection === "benchmarks" || savedSection === "scores" || savedSection === "notes") {
      setAdminSectionView(savedSection);
    }
    setAdminSectionReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !adminSectionReady) return;
    window.localStorage.setItem("admin-processors-section", adminSectionView);
  }, [adminSectionReady, adminSectionView]);

  const suggestedSlug = useMemo(() => slugify(createTitle || ""), [createTitle]);
  const createSlug = useMemo(
    () => slugify((createSlugEdited ? createSlugInput : suggestedSlug) || createTitle || ""),
    [createSlugEdited, createSlugInput, suggestedSlug, createTitle]
  );
  const createDocId = createSlug;
  const createTitleSuggestions = useMemo(() => {
    const hints = BRAND_TITLE_HINTS[createBrand] || [];
    if (!createBrand || hints.length === 0) return [];
    const raw = createTitle.trim();
    const afterBrand = raw.toLowerCase().startsWith(createBrand.toLowerCase()) ? raw.slice(createBrand.length).trim() : raw;
    if (!afterBrand) return hints;
    return hints.filter((item) => item.toLowerCase().startsWith(afterBrand.toLowerCase()));
  }, [createBrand, createTitle]);
  const isCreateDocDuplicate = useMemo(
    () => Boolean(createDocId) && rows.some((row) => String(row.id || "").toLowerCase() === createDocId.toLowerCase()),
    [createDocId, rows]
  );

  async function refresh() {
    const response = await fetch("/api/processors?admin=1", { cache: "no-store", credentials: "include" });
    const json = await response.json();
    setRows((json.items || []) as ProcessorAdmin[]);
  }

  async function refreshNoteGroups() {
    const response = await fetch("/api/processors/admin-notes", { cache: "no-store", credentials: "include" });
    const json = await response.json();
    const items = (json.items || []) as ProcessorAdminNoteGroup[];
    setNoteGroups(items);
    setNoteEditorDrafts(
      Object.fromEntries(
        items
          .filter((item) => item.id)
          .map((item) => [item.id as string, formatNoteEditorValue(item.items || [])])
      )
    );
    setSavedNoteSignatures(
      Object.fromEntries(
        items
          .filter((item) => item.id)
          .map((item) => [
            item.id as string,
            JSON.stringify({
              processorName: normalizeProcessorText(item.processorName),
              vendor: String(item.vendor || "").trim(),
              items: item.items || [],
            }),
          ])
      )
    );
  }

  function toDraft(row: ProcessorAdmin): BenchmarkDraft {
    const benchmarks = row.detail?.benchmarks;
    const legacy3dName = String(benchmarks?.threeDMarkName || "").trim().toLowerCase();
    const legacy3dScore = benchmarks?.threeDMark === undefined ? "" : String(benchmarks.threeDMark);
    return {
      aiScore: benchmarks?.aiScore === undefined ? "" : String(benchmarks.aiScore),
      antutuCalcVersion: String(benchmarks?.antutuCalcVersion || "11"),
      antutuCalc: benchmarks?.antutuCalc === undefined ? "" : String(benchmarks.antutuCalc || ""),
      antutuCalcCpu: benchmarks?.antutuCalcCpu === undefined ? "" : String(benchmarks.antutuCalcCpu),
      antutuCalcGpu: benchmarks?.antutuCalcGpu === undefined ? "" : String(benchmarks.antutuCalcGpu),
      antutuVersion: String(benchmarks?.antutuVersion || "11"),
      antutu: benchmarks?.antutu === undefined ? "" : String(benchmarks.antutu || ""),
      antutuCpu: benchmarks?.antutuCpu === undefined ? "" : String(benchmarks.antutuCpu),
      antutuGpu: benchmarks?.antutuGpu === undefined ? "" : String(benchmarks.antutuGpu),
      antutuMemory: benchmarks?.antutuMemory === undefined ? "" : String(benchmarks.antutuMemory),
      antutuUx: benchmarks?.antutuUx === undefined ? "" : String(benchmarks.antutuUx),
      geekbenchVersion: String(benchmarks?.geekbenchVersion || ""),
      geekbenchSingle: benchmarks?.geekbenchSingle === undefined ? "" : String(benchmarks.geekbenchSingle),
      geekbenchMulti: benchmarks?.geekbenchMulti === undefined ? "" : String(benchmarks.geekbenchMulti),
      threeDMarkWildLife: benchmarks?.threeDMarkWildLife === undefined ? (legacy3dName === "wild life" || !legacy3dName ? legacy3dScore : "") : String(benchmarks.threeDMarkWildLife),
      threeDMarkSolarBay: benchmarks?.threeDMarkSolarBay === undefined ? (legacy3dName === "solar bay" ? legacy3dScore : "") : String(benchmarks.threeDMarkSolarBay),
      threeDMarkSteelNomadLight: benchmarks?.threeDMarkSteelNomadLight === undefined ? (legacy3dName === "steel nomad light" ? legacy3dScore : "") : String(benchmarks.threeDMarkSteelNomadLight),
      threeDMarkWildLifeExtreme: benchmarks?.threeDMarkWildLifeExtreme === undefined ? (legacy3dName === "wild life extreme" ? legacy3dScore : "") : String(benchmarks.threeDMarkWildLifeExtreme),
      threeDMarkWildLifeExtremeMin: benchmarks?.threeDMarkWildLifeExtremeMin === undefined ? "" : String(benchmarks.threeDMarkWildLifeExtremeMin),
      threeDMarkWildLifeExtremeMax: benchmarks?.threeDMarkWildLifeExtremeMax === undefined ? "" : String(benchmarks.threeDMarkWildLifeExtremeMax),
      threeDMarkName: String(benchmarks?.threeDMarkName || ""),
      threeDMark: benchmarks?.threeDMark === undefined ? "" : String(benchmarks.threeDMark),
    };
  }

  function sanitizeText(value: string): string | undefined {
    const next = value.trim();
    return next || undefined;
  }

  function sanitizeNumber(value: string): number | undefined {
    const next = value.trim();
    if (!next) return undefined;
    const parsed = Number(next);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function buildBenchmarksPayload(draft: BenchmarkDraft): NonNullable<ProcessorDetail["benchmarks"]> | undefined {
    const payload: NonNullable<ProcessorDetail["benchmarks"]> = {
      aiScore: sanitizeNumber(draft.aiScore),
      antutuCalcVersion: sanitizeText(draft.antutuCalcVersion),
      antutuCalc: sanitizeNumber(draft.antutuCalc),
      antutuCalcCpu: sanitizeNumber(draft.antutuCalcCpu),
      antutuCalcGpu: sanitizeNumber(draft.antutuCalcGpu),
      antutuVersion: sanitizeText(draft.antutuVersion),
      antutu: sanitizeNumber(draft.antutu),
      antutuCpu: sanitizeNumber(draft.antutuCpu),
      antutuGpu: sanitizeNumber(draft.antutuGpu),
      antutuMemory: sanitizeNumber(draft.antutuMemory),
      antutuUx: sanitizeNumber(draft.antutuUx),
      geekbenchVersion: sanitizeText(draft.geekbenchVersion),
      geekbenchSingle: sanitizeNumber(draft.geekbenchSingle),
      geekbenchMulti: sanitizeNumber(draft.geekbenchMulti),
      threeDMarkWildLife: sanitizeNumber(draft.threeDMarkWildLife),
      threeDMarkSolarBay: sanitizeNumber(draft.threeDMarkSolarBay),
      threeDMarkSteelNomadLight: sanitizeNumber(draft.threeDMarkSteelNomadLight),
      threeDMarkWildLifeExtreme: sanitizeNumber(draft.threeDMarkWildLifeExtreme),
      threeDMarkWildLifeExtremeMin: sanitizeNumber(draft.threeDMarkWildLifeExtremeMin),
      threeDMarkWildLifeExtremeMax: sanitizeNumber(draft.threeDMarkWildLifeExtremeMax),
      threeDMarkName: sanitizeText(draft.threeDMarkName),
      threeDMark: sanitizeNumber(draft.threeDMark),
    };
    if (payload.threeDMarkWildLife !== undefined) {
      payload.threeDMarkName = "Wild Life";
      payload.threeDMark = payload.threeDMarkWildLife;
    }
    return Object.values(payload).some((value) => value !== undefined) ? payload : undefined;
  }

  function isSameDraft(a: BenchmarkDraft, b: BenchmarkDraft): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function updateBenchmarkDraft(id: string, key: keyof BenchmarkDraft, value: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    setBenchmarkDrafts((prev) => {
      const baseDraft = benchmarkSavedDrafts[id] || toDraft(row);
      const nextDraft = { ...(prev[id] || baseDraft), [key]: value };
      if (isSameDraft(nextDraft, baseDraft)) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: nextDraft };
    });
  }

  function tempSaveBenchmarkRow(row: ProcessorAdmin) {
    if (!row.id) return;
    const currentDraft = benchmarkDrafts[row.id] || benchmarkSavedDrafts[row.id] || toDraft(row);
    setBenchmarkSavedDrafts((prev) => ({ ...prev, [row.id as string]: currentDraft }));
    setBenchmarkDrafts((prev) => {
      const next = { ...prev };
      delete next[row.id as string];
      return next;
    });
  }

  function displayBenchmarkValue(value: string | undefined): string {
    const next = String(value || "").trim();
    return next || "-";
  }

  function applySavedBenchmarkRow(id: string, draft: BenchmarkDraft) {
    const benchmarks = buildBenchmarksPayload(draft);
    const antutu = sanitizeNumber(draft.antutuCalc) ?? sanitizeNumber(draft.antutu) ?? 0;
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              antutu,
              detail: {
                ...(row.detail || {}),
                benchmarks,
              },
            }
          : row
      )
    );
    setBenchmarkDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBenchmarkSavedDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  useEffect(() => {
    Promise.all([refresh(), refreshNoteGroups()]).catch((err) => setError(err instanceof Error ? err.message : "Failed to load processors."));
  }, []);

  function getBenchmarkVendorKey(row: ProcessorAdmin): BenchmarkVendorFilter | null {
    const vendor = String(row.vendor || "").trim().toLowerCase();
    const name = String(row.name || "").trim().toLowerCase();
    if (vendor === "qualcomm" || name.includes("snapdragon")) return "qualcomm";
    if (vendor === "mediatek" || name.includes("dimensity") || name.includes("helio")) {
      if (name.includes("helio")) return "mediatek-helio";
      return "mediatek-dimensity";
    }
    if (vendor === "samsung" || name.includes("exynos")) return "samsung-exynos";
    if (vendor === "google" || name.includes("tensor")) return "google";
    if (vendor === "apple") return "apple";
    if (vendor === "unisoc") return "unisoc";
    if (vendor === "xiaomi") return "xiaomi";
    return null;
  }

  const scoreReferences = useMemo(() => {
    const details = rows
      .map((row) => row.detail)
      .filter((detail): detail is ProcessorDetail => Boolean(detail));

    return {
      gaming: calculateGamingScoreReferences(details),
      ai: calculateAiScoreReferences(details),
      performance: calculatePerformanceScoreReferences(
        details,
        rows.map((row) => Number(row.antutu || 0)),
        rows.map((row) => Number(row.maxCpuGhz || 0))
      ),
    };
  }, [rows]);

  const processorScores = useMemo(() => {
    return Object.fromEntries(
      rows.map((row) => {
        const detail = row.detail;
        const performance = calculatePerformanceScore({
          processorName: row.name,
          antutuScore: detail?.benchmarks?.antutuCalc,
          antutuFallbackScore: detail?.benchmarks?.antutu || row.antutu,
          geekbenchSingle: detail?.benchmarks?.geekbenchSingle,
          geekbenchMulti: detail?.benchmarks?.geekbenchMulti,
          maxCpuGhz: row.maxCpuGhz,
          fabricationNm: row.fabricationNm,
          process: detail?.process,
          instructionSet: detail?.instructionSet,
          architectureBits: detail?.architectureBits,
          coreConfiguration: detail?.coreConfiguration,
          cores: detail?.cores,
          memoryType: detail?.memoryType,
          memoryTypes: detail?.memoryTypes,
          memoryFreqMhz: detail?.memoryFreqMhz,
          memoryFreqByType: detail?.memoryFreqByType,
          memoryBusWidthBits: detail?.memoryBusWidthBits,
          totalRamBusWidthBits: detail?.totalRamBusWidthBits,
          storageType: detail?.storageType,
          storageTypes: detail?.storageTypes,
        }, scoreReferences.performance).score;
        const efficiency = calculateEfficiencyScore({
          fabricationNm: row.fabricationNm,
          process: detail?.process,
          instructionSet: detail?.instructionSet,
          architectureBits: detail?.architectureBits,
          coreConfiguration: detail?.coreConfiguration,
          cores: detail?.cores,
        });
        const gamingBreakdown = calculateGamingScore({
          fabricationNm: row.fabricationNm,
          process: detail?.process,
          instructionSet: detail?.instructionSet,
          architectureBits: detail?.architectureBits,
          coreConfiguration: detail?.coreConfiguration,
          cores: detail?.cores,
          memoryType: detail?.memoryType,
          memoryTypes: detail?.memoryTypes,
          memoryFreqMhz: detail?.memoryFreqMhz,
          memoryFreqByType: detail?.memoryFreqByType,
          memoryBusWidthBits: detail?.memoryBusWidthBits,
          totalRamBusWidthBits: detail?.totalRamBusWidthBits,
          storageType: detail?.storageType,
          storageTypes: detail?.storageTypes,
          gpuFlops: detail?.gpuFlops,
          wildLifeScore: detail?.benchmarks?.threeDMarkWildLife,
          antutu11GpuScore: detail?.benchmarks?.antutuCalcGpu,
        }, scoreReferences.gaming);
        const gaming = gamingBreakdown.score;
        const ai = calculateAiScore({
          processorName: row.name,
          aiBenchmarkScore: detail?.benchmarks?.aiScore,
          fabricationNm: row.fabricationNm,
          process: detail?.process,
          instructionSet: detail?.instructionSet,
          architectureBits: detail?.architectureBits,
          coreConfiguration: detail?.coreConfiguration,
          cores: detail?.cores,
          memoryType: detail?.memoryType,
          memoryTypes: detail?.memoryTypes,
          memoryFreqMhz: detail?.memoryFreqMhz,
          memoryFreqByType: detail?.memoryFreqByType,
          memoryBusWidthBits: detail?.memoryBusWidthBits,
          totalRamBusWidthBits: detail?.totalRamBusWidthBits,
          storageType: detail?.storageType,
          storageTypes: detail?.storageTypes,
        }, scoreReferences.ai).score;
        const memoryStorage = calculateMemoryStorageScore({
          memoryType: detail?.memoryType,
          memoryTypes: detail?.memoryTypes,
          memoryFreqMhz: detail?.memoryFreqMhz,
          memoryFreqByType: detail?.memoryFreqByType,
          memoryBusWidthBits: detail?.memoryBusWidthBits,
          totalRamBusWidthBits: detail?.totalRamBusWidthBits,
          storageType: detail?.storageType,
          storageTypes: detail?.storageTypes,
          frequencyReferenceMhz: scoreReferences.performance.memoryFrequencyReference,
        }).score;
        const gpu = (() => {
          const gpuComponents = [gamingBreakdown.gpuComputeScore, gamingBreakdown.gpuBenchmarkScore].filter((value): value is number => Number.isFinite(value));
          if (gpuComponents.length === 0) return gaming;
          return Math.round(gpuComponents.reduce((sum, value) => sum + value, 0) / gpuComponents.length);
        })();
        const total = calculateTotalScore({ performance, gaming, efficiency, ai });

        return [row.id || row.name, { total, performance, gpu, efficiency, ai, memoryStorage }];
      })
    ) as Record<string, { total: number; performance: number; gpu: number; efficiency: number; ai: number; memoryStorage: number }>;
  }, [rows, scoreReferences]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const rowStatus = row.status || "published";
        if (statusFilter === "all" && rowStatus === "recently_deleted") return false;
        if (statusFilter !== "all" && rowStatus !== statusFilter) return false;
        if (vendorFilter.length > 0 && !vendorFilter.some((item) => item.toLowerCase() === String(row.vendor || "").toLowerCase())) return false;
        const rowClass = String(row.detail?.className || "").trim().toLowerCase();
        if (classFilter.length > 0 && !classFilter.some((item) => item.toLowerCase() === rowClass)) return false;
        if (!q) return true;
        const hay = [row.name, row.vendor, row.id, row.gpu, row.status].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => compareProcessorNames(a.name || "", b.name || ""));
  }, [classFilter, query, rows, statusFilter, vendorFilter]);

  const vendorOptions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => String(row.vendor || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [rows]
  );


  const vendorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const vendor = String(row.vendor || "").trim();
      if (!vendor) return;
      counts.set(vendor, (counts.get(vendor) || 0) + 1);
    });
    return counts;
  }, [rows]);

  const statusCounts = useMemo(() => {
    const counts = new Map<StatusFilter, number>([
      ["all", 0],
      ["draft", 0],
      ["review", 0],
      ["published", 0],
      ["scheduled", 0],
      ["recently_deleted", 0],
    ]);
    rows.forEach((row) => {
      const status = (row.status || "published") as StatusFilter;
      counts.set(status, (counts.get(status) || 0) + 1);
      if (status !== "recently_deleted") counts.set("all", (counts.get("all") || 0) + 1);
    });
    return counts;
  }, [rows]);

  const classOptions = useMemo(() => {
    const seen = new Set(rows.map((row) => String(row.detail?.className || "").trim()).filter(Boolean));
    const ordered = CLASS_FILTER_ORDER.filter((item) => seen.has(item));
    const extras = Array.from(seen).filter((item) => !CLASS_FILTER_ORDER.includes(item as (typeof CLASS_FILTER_ORDER)[number])).sort((a, b) => a.localeCompare(b));
    return ["all", ...ordered, ...extras];
  }, [rows]);

  const benchmarkVendorCounts = useMemo(() => {
    const counts = new Map<BenchmarkVendorFilter, number>();
    rows.forEach((row) => {
      if (!row.id || row.status === "recently_deleted") return;
      const key = getBenchmarkVendorKey(row);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [rows]);
  const scoreVendorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      if (row.status === "recently_deleted") return;
      const vendor = String(row.vendor || "").trim();
      if (!vendor) return;
      counts.set(vendor, (counts.get(vendor) || 0) + 1);
    });
    return counts;
  }, [rows]);
  const scoreRows = useMemo(() => {
    const q = scoreQuery.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (row.status === "recently_deleted") return false;
        const vendor = String(row.vendor || "").trim();
        if (scoreVendorFilter !== "all" && vendor.toLowerCase() !== scoreVendorFilter.toLowerCase()) return false;
        if (!q) return true;
        const hay = [row.name, row.id, row.vendor, row.detail?.model].map((value) => String(value || "").toLowerCase()).join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => {
        const left = processorScores[a.id || a.name] || { total: 0, performance: 0, gpu: 0, efficiency: 0, ai: 0, memoryStorage: 0 };
        const right = processorScores[b.id || b.name] || { total: 0, performance: 0, gpu: 0, efficiency: 0, ai: 0, memoryStorage: 0 };
        const gap = (left[scoreSortKey] || 0) - (right[scoreSortKey] || 0);
        if (gap !== 0) return scoreSortDirection === "desc" ? -gap : gap;
        const performanceGap = (left.performance || 0) - (right.performance || 0);
        if (performanceGap !== 0) return scoreSortDirection === "desc" ? -performanceGap : performanceGap;
        const antutuGap = Number(a.antutu || 0) - Number(b.antutu || 0);
        if (antutuGap !== 0) return scoreSortDirection === "desc" ? -antutuGap : antutuGap;
        const clockGap = Number(a.maxCpuGhz || 0) - Number(b.maxCpuGhz || 0);
        if (clockGap !== 0) return scoreSortDirection === "desc" ? -clockGap : clockGap;
        const gpuGap = (left.gpu || 0) - (right.gpu || 0);
        if (gpuGap !== 0) return scoreSortDirection === "desc" ? -gpuGap : gpuGap;
        const nameGap = compareProcessorNames(String(a.name || ""), String(b.name || ""));
        if (nameGap !== 0) return nameGap;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [processorScores, rows, scoreQuery, scoreSortDirection, scoreSortKey, scoreVendorFilter]);
  const benchmarkRows = useMemo(() => {
    const q = benchmarkQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (!row.id || row.status === "recently_deleted") return false;
      const vendorKey = getBenchmarkVendorKey(row);
      if (!vendorKey) return false;
      if (benchmarkVendorFilter !== "all" && vendorKey !== benchmarkVendorFilter) return false;
      if (!q) return true;
      const hay = [row.name, row.id, row.vendor, row.detail?.model].map((value) => String(value || "").toLowerCase()).join(" ");
      return hay.includes(q);
    }).sort((a, b) => compareProcessorNames(a.name || "", b.name || ""));
  }, [benchmarkQuery, benchmarkVendorFilter, rows]);
  const changedBenchmarkRows = useMemo(
    () => benchmarkRows.filter((row) => row.id && benchmarkDrafts[row.id]),
    [benchmarkDrafts, benchmarkRows]
  );
  const allSavedBenchmarkRows = useMemo(
    () => rows.filter((row) => row.id && benchmarkSavedDrafts[row.id]),
    [rows, benchmarkSavedDrafts]
  );
  const noteVendorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    noteGroups.forEach((group) => {
      const vendor = String(group.vendor || "").trim() || "Other";
      counts.set(vendor, (counts.get(vendor) || 0) + 1);
    });
    return counts;
  }, [noteGroups]);
  const noteSuggestions = useMemo(
    () => Array.from(new Set([
      ...rows.map((row) => normalizeProcessorText(row.name || "")).filter(Boolean),
      ...noteGroups.map((group) => normalizeProcessorText(group.processorName || "")).filter(Boolean),
    ])).sort(compareProcessorNames),
    [noteGroups, rows]
  );
  const visibleNoteGroups = useMemo(() => {
    const q = noteQuery.trim().toLowerCase();
    return [...noteGroups]
      .filter((group) => {
        const vendor = String(group.vendor || "").trim() || "Other";
        if (noteVendorFilter !== "all" && vendor.toLowerCase() !== noteVendorFilter.toLowerCase()) return false;
        if (!q) return true;
        const hay = [group.processorName, group.vendor, ...(group.items || [])]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => compareProcessorNames(a.processorName || "", b.processorName || ""));
  }, [noteGroups, noteQuery, noteVendorFilter]);

  function resolveNoteVendor(name: string): string {
    const normalized = normalizeProcessorText(name).toLowerCase();
    const matchedRow = rows.find((row) => normalizeProcessorText(row.name || "").toLowerCase() === normalized);
    return String(matchedRow?.vendor || "").trim() || inferVendorFromProcessorName(name);
  }

  function noteGroupSignature(group: ProcessorAdminNoteGroup): string {
    return JSON.stringify({
      processorName: normalizeProcessorText(group.processorName),
      vendor: String(group.vendor || "").trim(),
      items: (group.items || []).map((item) => normalizeNoteLine(item)).filter(Boolean),
    });
  }

  function getNoteEditorValue(group: ProcessorAdminNoteGroup): string {
    const key = String(group.id || slugify(group.processorName || ""));
    return noteEditorDrafts[key] ?? formatNoteEditorValue(group.items || []);
  }

  function noteEditorSignature(group: ProcessorAdminNoteGroup): string {
    return JSON.stringify({
      processorName: normalizeProcessorText(group.processorName),
      vendor: String(group.vendor || "").trim(),
      items: parseNoteLines(getNoteEditorValue(group)),
    });
  }

  function isNoteGroupDirty(group: ProcessorAdminNoteGroup): boolean {
    if (!group.id) return true;
    return savedNoteSignatures[group.id] !== noteEditorSignature(group);
  }

  function updateNoteGroupLocally(id: string, updater: (group: ProcessorAdminNoteGroup) => ProcessorAdminNoteGroup) {
    setNoteGroups((prev) => prev.map((group) => (group.id === id ? updater(group) : group)));
  }

  function setNoteEditorValue(id: string, value: string) {
    setNoteEditorDrafts((prev) => ({ ...prev, [id]: value }));
  }

  function handleNoteEditorKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
    group: ProcessorAdminNoteGroup
  ) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = getNoteEditorValue(group);
    const insert = `\n${NOTE_BULLET} `;
    const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    setNoteEditorValue(id, nextValue);
    window.requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insert.length;
    });
  }

  async function persistNoteGroup(group: ProcessorAdminNoteGroup) {
    const processorName = normalizeProcessorText(group.processorName);
    const editorKey = String(group.id || slugify(group.processorName || ""));
    const items = parseNoteLines(noteEditorDrafts[editorKey] ?? formatNoteEditorValue(group.items || []));
    if (!processorName) throw new Error("Processor name is required.");
    if (!items.length) throw new Error("Add at least one point before saving.");

    const savingId = group.id || slugify(processorName);
    setSavingNoteGroupIds((prev) => (prev.includes(savingId) ? prev : [...prev, savingId]));
    try {
      const payload: ProcessorAdminNoteGroup = {
        id: group.id,
        processorName,
        vendor: resolveNoteVendor(processorName),
        items,
      };
      const response = await fetch("/api/processors/admin-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save notes.");
      const nextId = String(json.id || payload.id || savingId);
      const normalizedGroup = { ...payload, id: nextId };
      setNoteGroups((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === nextId);
        if (existingIndex >= 0) return prev.map((item, index) => (index === existingIndex ? normalizedGroup : item));
        return [...prev, normalizedGroup];
      });
      setNoteEditorDrafts((prev) => ({ ...prev, [nextId]: formatNoteEditorValue(normalizedGroup.items) }));
      setSavedNoteSignatures((prev) => ({ ...prev, [nextId]: noteGroupSignature(normalizedGroup) }));
      setMessage(`Saved admin notes for ${processorName}.`);
    } finally {
      setSavingNoteGroupIds((prev) => prev.filter((item) => item !== savingId));
    }
  }

  async function handleQuickNoteSave() {
    const processorNames = parseProcessorNameList(noteForm.processorNames);
    const newItems = parseNoteLines(noteForm.rawPoints);
    if (!processorNames.length) {
      setError("Choose or write at least one processor name before saving notes.");
      return;
    }
    if (!newItems.length) {
      setError("Write at least one point in the notes box.");
      return;
    }

    setSavingQuickNote(true);
    setError("");
    setMessage("");
    try {
      for (const processorName of processorNames) {
        const existing = noteGroups.find((group) => normalizeProcessorText(group.processorName).toLowerCase() === processorName.toLowerCase());
        const mergedMap = new Map<string, string>();
        [...(existing?.items || []), ...newItems].forEach((item) => {
          const normalized = normalizeNoteLine(item);
          if (!normalized) return;
          const key = normalized.toLowerCase();
          if (!mergedMap.has(key)) mergedMap.set(key, normalized);
        });
        await persistNoteGroup({
          id: existing?.id,
          processorName,
          vendor: resolveNoteVendor(processorName),
          items: Array.from(mergedMap.values()),
        });
      }
      setNoteForm({ processorNames: "", rawPoints: "" });
      setMessage(
        processorNames.length === 1
          ? `Saved notes for ${processorNames[0]}.`
          : `Saved the same notes for ${processorNames.length} processors.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save processor notes.");
    } finally {
      setSavingQuickNote(false);
    }
  }

  async function deleteNoteGroup(id: string, label: string) {
    if (!window.confirm(`Delete all admin notes for ${label}? This cannot be undone.`)) return;
    setDeletingNoteGroupIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/processors/admin-notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to delete processor notes.");
      setNoteGroups((prev) => prev.filter((group) => group.id !== id));
      setSavedNoteSignatures((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setNoteEditorDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setMessage(`Deleted admin notes for ${label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete processor notes.");
    } finally {
      setDeletingNoteGroupIds((prev) => prev.filter((item) => item !== id));
    }
  }

  async function removeNoteItem(group: ProcessorAdminNoteGroup, index: number) {
    const current = normalizeNoteLine(group.items[index] || "");
    if (!current) return;
    if (!window.confirm(`Delete this point from ${group.processorName}?\n\n${current}`)) return;
    const nextItems = group.items.filter((_, itemIndex) => itemIndex !== index);
    if (nextItems.length === 0) {
      if (group.id) await deleteNoteGroup(group.id, group.processorName);
      return;
    }
    try {
      await persistNoteGroup({ ...group, items: nextItems });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note point.");
    }
  }

  async function changeStatus(id: string, status: ProcessorAdmin["status"]) {
    const response = await fetch(`/api/processors/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Status update failed.");
  }

  async function moveToRecentlyDeleted(id?: string) {
    if (!id) return;
    if (!window.confirm("Move this processor to Recently Deleted?")) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "recently_deleted");
      setMessage("Processor moved to recently deleted.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move.");
    }
  }

  async function restoreProcessor(id?: string) {
    if (!id) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "draft");
      setMessage("Processor restored as draft.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    }
  }

  async function deletePermanently(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this processor permanently?")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/processors/${id}`, { method: "DELETE", credentials: "include" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
      setMessage("Processor deleted permanently.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent delete failed.");
    }
  }

  async function normalizeAllProcessors() {
    if (!window.confirm("Normalize all existing processors now? This will update saved Firestore data to the latest formatting rules.")) return;
    setError("");
    setMessage("");
    setNormalizingAll(true);
    try {
      const response = await fetch("/api/processors/normalize-all", {
        method: "POST",
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Normalization failed.");
      setMessage(`Normalized ${Number(json.processed || 0)} processor(s).`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Normalization failed.");
    } finally {
      setNormalizingAll(false);
    }
  }

  async function saveBenchmarkRows(targetRows: ProcessorAdmin[]) {
    if (targetRows.length === 0) return;
    setError("");
    setMessage("");
    setSavingBenchmarkBulk(true);
    try {
      setBenchmarkSavedDrafts((prev) => {
        const next = { ...prev };
        targetRows.forEach((row) => {
          if (!row.id) return;
          const draft = benchmarkDrafts[row.id] || benchmarkSavedDrafts[row.id] || toDraft(row);
          next[row.id] = draft;
        });
        return next;
      });
      setBenchmarkDrafts((prev) => {
        const next = { ...prev };
        targetRows.forEach((row) => {
          if (!row.id) return;
          delete next[row.id];
        });
        return next;
      });
      setMessage(`Temporarily saved benchmark details for ${targetRows.length} processor${targetRows.length > 1 ? "s" : ""}.`);
    } finally {
      setSavingBenchmarkBulk(false);
    }
  }

  async function submitSavedBenchmarkRows(targetRows: ProcessorAdmin[]) {
    if (targetRows.length === 0) return;
    setError("");
    setMessage("");
    setSubmittingBenchmarkBulk(true);
    try {
      for (const row of targetRows) {
        if (!row.id) continue;
        const draft = benchmarkSavedDrafts[row.id];
        if (!draft) continue;
        setSavingBenchmarkIds((prev) => (prev.includes(row.id as string) ? prev : [...prev, row.id as string]));
        try {
          const response = await fetch(`/api/processors/${encodeURIComponent(row.id)}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              antutu: sanitizeNumber(draft.antutuCalc) ?? sanitizeNumber(draft.antutu) ?? 0,
              detail: {
                ...(row.detail || {}),
                benchmarks: buildBenchmarksPayload(draft),
              },
            }),
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || "Benchmark update failed.");
          applySavedBenchmarkRow(row.id, draft);
        } finally {
          setSavingBenchmarkIds((prev) => prev.filter((item) => item !== row.id));
        }
      }
      setMessage(`Permanently updated ${targetRows.length} processor${targetRows.length > 1 ? "s" : ""}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark final submit failed.");
    } finally {
      setSubmittingBenchmarkBulk(false);
    }
  }

  function toggleAntutuGeekbenchGroup(group: AntutuGeekbenchGroup) {
    setAntutuGeekbenchGroups((prev) => {
      if (prev.includes(group)) {
        const next = prev.filter((item) => item !== group);
        return next.length ? next : prev;
      }
      return [...prev, group];
    });
  }

  function toggleAi3dMarkGroup(group: Ai3dMarkGroup) {
    setAi3dMarkGroups((prev) => {
      if (prev.includes(group)) {
        const next = prev.filter((item) => item !== group);
        return next.length ? next : prev;
      }
      return [...prev, group];
    });
  }

  function toggleScoreSort(key: ScoreSortKey) {
    if (scoreSortKey === key) {
      setScoreSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setScoreSortKey(key);
    setScoreSortDirection("desc");
  }

  async function moveSelectedToRecentlyDeleted() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} selected processor(s) to Recently Deleted?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "recently_deleted")));
      setSelectedIds([]);
      setMessage("Selected processors moved to recently deleted.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk move failed.");
    }
  }

  async function restoreSelectedProcessors() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Restore ${selectedIds.length} selected processor(s) as draft?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "draft")));
      setSelectedIds([]);
      setMessage("Selected processors restored as draft.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk restore failed.");
    }
  }

  async function forceDeleteSelectedProcessors() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected processor(s) permanently?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(`/api/processors/${id}`, { method: "DELETE", credentials: "include" });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
        })
      );
      setSelectedIds([]);
      setMessage("Selected processors deleted permanently.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk permanent delete failed.");
    }
  }

  return (
    <main className="space-y-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Processors</h2>
            <p className="mt-1 text-sm text-slate-600">Manage processor entries and publish status.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Create Processor</h3>
              <p className="mt-1 text-sm text-slate-600">Set top fields first, then open full editor.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Quick Create</span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Brand</span>
              <select
                value={createBrand}
                onChange={(e) => {
                  const nextBrand = e.target.value;
                  setCreateBrand(nextBrand);
                  setCreateTitle(nextBrand ? `${nextBrand} ` : "");
                  setCreateSlugInput("");
                  setCreateSlugEdited(false);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">Select Brand</option>
                {BRAND_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Slug</span>
              <input
                value={createSlug}
                onChange={(e) => {
                  setCreateSlugInput(e.target.value);
                  setCreateSlugEdited(true);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">Title (Processor Name)</span>
                {createBrand && createTitleSuggestions.length > 0 ? (
                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    {createTitleSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const next = `${createBrand} ${item} `.trimEnd();
                          setCreateTitle(next);
                          if (!createSlugEdited) setCreateSlugInput(slugify(next));
                          requestAnimationFrame(() => {
                            const input = createTitleInputRef.current;
                            if (!input) return;
                            input.focus();
                            const caret = next.length;
                            input.setSelectionRange(caret, caret);
                          });
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {item}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
              <input
                ref={createTitleInputRef}
                value={createTitle}
                onChange={(e) => {
                  const next = e.target.value;
                  setCreateTitle(next);
                  if (!createSlugEdited) setCreateSlugInput(slugify(next));
                }}
                placeholder="Samsung Exynos 2400"
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Document ID</span>
              <input value={createDocId} readOnly className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600" />
            </label>
          </div>

          <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
            <Link
              href={
                createTitle && createSlug && !isCreateDocDuplicate
                  ? `/admin/processor-bootstrap?name=${encodeURIComponent(createTitle)}&slug=${encodeURIComponent(createSlug)}&brand=${encodeURIComponent(createBrand)}`
                  : "/admin/processors"
              }
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
                !createTitle || !createSlug || isCreateDocDuplicate ? "pointer-events-none bg-slate-400" : "bg-blue-700 shadow-sm"
              }`}
            >
              Create New Processor
            </Link>
          </div>
          {isCreateDocDuplicate ? (
            <p className="mt-2 text-center text-xs font-semibold text-rose-700">
              Slug/Document ID already exists. Please change slug to a unique value.
            </p>
          ) : null}
        </div>
      </section>

      {adminSectionReady && adminSectionView === "processors" ? (
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminSectionView("processors")}
                className="rounded-t-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Processor List
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("benchmarks")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Benchmark Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("scores")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Score Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("notes")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Admin Notes
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Open the list when you want to search, filter, edit, or manage processor status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={normalizeAllProcessors}
              disabled={normalizingAll}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${normalizingAll ? "cursor-wait border-slate-200 bg-slate-100 text-slate-400" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
            >
              {normalizingAll ? "Normalizing..." : "Normalize Existing Data"}
            </button>
          </div>
        </div>
        <>
            <div className="mt-3 grid gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by processor name, vendor, id..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "draft", label: "Draft" },
                    { key: "review", label: "Review" },
                    { key: "published", label: "Published" },
                    { key: "scheduled", label: "Scheduled" },
                    { key: "recently_deleted", label: "Recently Deleted" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key as StatusFilter)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${
                        statusFilter === item.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label} ({statusCounts.get(item.key as StatusFilter) || 0})
                    </button>
                  ))}
                </div>

                <div className="text-xs font-medium text-slate-500">
                  {classFilter.length > 0 ? `${classFilter.length} class filter${classFilter.length > 1 ? "s" : ""} selected` : "All classes"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVendorFilter([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${vendorFilter.length === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All Vendors ({rows.filter((row) => String(row.vendor || "").trim()).length})
                </button>
                {vendorOptions.filter((item) => item !== "all").map((item) => {
                  const selected = vendorFilter.some((value) => value.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={`vendor-chip-${item}`}
                      type="button"
                      onClick={() => setVendorFilter((prev) => selected ? prev.filter((value) => value.toLowerCase() !== item.toLowerCase()) : [...prev, item])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {item} ({vendorCounts.get(item) || 0})
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setClassFilter([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${classFilter.length === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All Classes
                </button>
                {classOptions.filter((item) => item !== "all").map((item) => {
                  const selected = classFilter.some((value) => value.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={`class-chip-${item}`}
                      type="button"
                      onClick={() => setClassFilter((prev) => selected ? prev.filter((value) => value.toLowerCase() !== item.toLowerCase()) : [...prev, item])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${selected ? "border-violet-700 bg-violet-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {statusFilter === "recently_deleted" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={restoreSelectedProcessors}
                    disabled={selectedIds.length === 0}
                    className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                  >
                    Restore Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={forceDeleteSelectedProcessors}
                    disabled={selectedIds.length === 0}
                    className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                  >
                    Force Delete Selected ({selectedIds.length})
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={moveSelectedToRecentlyDeleted}
                  disabled={selectedIds.length === 0}
                  className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                >
                  Move Selected to Recently Deleted ({selectedIds.length})
                </button>
              )}
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3 font-semibold">Select</th>
                    <th className="px-4 py-3 font-semibold">Processor</th>
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">AnTuTu</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Creator</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id || row.name} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        {row.id ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, row.id as string] : prev.filter((id) => id !== row.id)
                              )
                            }
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{row.name || "-"}</p>
                        <p className="text-xs text-slate-500">{row.id || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{row.vendor || "-"}</td>
                      <td className="px-4 py-3 text-slate-800">{row.antutu ? `~${Math.round(row.antutu).toLocaleString("en-IN")}` : "NA"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            (row.status || "published") === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : row.status === "recently_deleted"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {row.status || "published"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{row.createdBy || "Admin"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={row.id ? `/admin/processor-editor?id=${encodeURIComponent(row.id)}` : "/admin/processor-create"}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </Link>
                          {row.status === "recently_deleted" ? (
                            <>
                              <button type="button" onClick={() => restoreProcessor(row.id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                Restore
                              </button>
                              <button type="button" onClick={() => deletePermanently(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                                Delete Forever
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => moveToRecentlyDeleted(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                        No processors found for current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
        </>
      </section>
      ) : null}

      {adminSectionReady && adminSectionView === "scores" ? (
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminSectionView("processors")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Processor List
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("benchmarks")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Benchmark Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("scores")}
                className="rounded-t-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Score Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("notes")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Admin Notes
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Compare processors directly by score field and spot which chip leads in each category.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <input
            value={scoreQuery}
            onChange={(e) => setScoreQuery(e.target.value)}
            placeholder="Search processor name, vendor or id..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScoreVendorFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${scoreVendorFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              All ({Array.from(scoreVendorCounts.values()).reduce((sum, count) => sum + count, 0)})
            </button>
            {Array.from(scoreVendorCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([vendor, count]) => (
                <button
                  key={`score-vendor-${vendor}`}
                  type="button"
                  onClick={() => setScoreVendorFilter(vendor)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${scoreVendorFilter.toLowerCase() === vendor.toLowerCase() ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {vendor} ({count})
                </button>
              ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">All scores are out of 100.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1200px] divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50">
              <tr className="text-center text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Processor</th>
                {[
                  { key: "total", label: "Total Score" },
                  { key: "performance", label: "Performance Score" },
                  { key: "gpu", label: "GPU Score" },
                  { key: "efficiency", label: "Efficiency Score" },
                  { key: "ai", label: "AI Score" },
                  { key: "memoryStorage", label: "Memory & Storage Score" },
                ].map((column) => (
                  <th key={column.key} className="min-w-[150px] px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleScoreSort(column.key as ScoreSortKey)}
                      className="inline-flex flex-col items-center text-center"
                    >
                      <span>{column.label}</span>
                      <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">
                        {scoreSortKey === column.key ? (scoreSortDirection === "desc" ? "Max to Min" : "Min to Max") : "Max to Min"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scoreRows.map((row) => {
                const scores = processorScores[row.id || row.name] || { total: 0, performance: 0, gpu: 0, efficiency: 0, ai: 0, memoryStorage: 0 };
                return (
                  <tr key={`scores-${row.id || row.name}`} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-left">
                      <p className="font-semibold text-slate-900">{row.name || "-"}</p>
                      <p className="text-xs text-slate-500">{row.id || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900">{scores.total}</td>
                    <td className="px-4 py-3 text-center text-slate-800">{scores.performance}</td>
                    <td className="px-4 py-3 text-center text-slate-800">{scores.gpu}</td>
                    <td className="px-4 py-3 text-center text-slate-800">{scores.efficiency}</td>
                    <td className="px-4 py-3 text-center text-slate-800">{scores.ai}</td>
                    <td className="px-4 py-3 text-center text-slate-800">{scores.memoryStorage}</td>
                  </tr>
                );
              })}
              {scoreRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No processors found for current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {adminSectionReady && adminSectionView === "benchmarks" ? (
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminSectionView("processors")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Processor List
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("benchmarks")}
                className="rounded-t-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Benchmark Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("scores")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Score Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("notes")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Admin Notes
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Open only when needed, edit existing scores directly, then collapse it again.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => submitSavedBenchmarkRows(allSavedBenchmarkRows)}
              disabled={submittingBenchmarkBulk || allSavedBenchmarkRows.length === 0}
              className={`rounded-lg px-5 py-3 text-sm font-bold transition ${
                submittingBenchmarkBulk || allSavedBenchmarkRows.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-rose-300 bg-rose-600 text-white shadow-sm hover:bg-rose-700"
              }`}
            >
              {submittingBenchmarkBulk ? "Submitting..." : `Save All Updated Data (${allSavedBenchmarkRows.length})`}
            </button>
            <button
              type="button"
              onClick={() => setBenchmarkTableEditing((prev) => !prev)}
              className={`rounded-lg border px-5 py-3 text-sm font-bold transition ${benchmarkTableEditing ? "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
            >
              {benchmarkTableEditing ? "Close Edit" : "Edit Table"}
            </button>
          </div>
        </div>

        <>
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-slate-600">Existing benchmark values are already filled here. Search processors and filter by vendor group, then edit only the rows you need.</p>
              <input
                value={benchmarkQuery}
                onChange={(e) => setBenchmarkQuery(e.target.value)}
                placeholder="Search processor name or id..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBenchmarkVendorFilter("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${benchmarkVendorFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All ({Array.from(benchmarkVendorCounts.values()).reduce((sum, count) => sum + count, 0)})
                </button>
                {BENCHMARK_VENDOR_ORDER.filter((item) => (benchmarkVendorCounts.get(item) || 0) > 0).map((item) => (
                  <button
                    key={`benchmark-vendor-${item}`}
                    type="button"
                    onClick={() => setBenchmarkVendorFilter(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${benchmarkVendorFilter === item ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {BENCHMARK_VENDOR_LABELS[item]} ({benchmarkVendorCounts.get(item) || 0})
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBenchmarkTableView("antutu-geekbench")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${benchmarkTableView === "antutu-geekbench" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  AnTuTu + Geekbench
                </button>
                <button
                  type="button"
                  onClick={() => setBenchmarkTableView("ai-3dmark")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${benchmarkTableView === "ai-3dmark" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  AI + 3DMark
                </button>
                </div>
                {benchmarkTableView === "antutu-geekbench" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAntutuGeekbenchGroups(["antutu-normal", "antutu-ranking", "geekbench"])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${antutuGeekbenchGroups.length === 3 ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAntutuGeekbenchGroup("antutu-normal")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${antutuGeekbenchGroups.includes("antutu-normal") ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      AnTuTu Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAntutuGeekbenchGroup("antutu-ranking")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${antutuGeekbenchGroups.includes("antutu-ranking") ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      AnTuTu Ranking
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAntutuGeekbenchGroup("geekbench")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${antutuGeekbenchGroups.includes("geekbench") ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      Geekbench
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAi3dMarkGroups(["ai-score", "three-dmark"])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${ai3dMarkGroups.length === 2 ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAi3dMarkGroup("ai-score")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${ai3dMarkGroups.includes("ai-score") ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      AI Score
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAi3dMarkGroup("three-dmark")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${ai3dMarkGroups.includes("three-dmark") ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      3DMark
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <p className="self-center text-sm text-slate-600">Visible rows: {benchmarkRows.length}</p>
                <p className="self-center text-sm text-slate-600">Temporarily saved: {allSavedBenchmarkRows.length}</p>
                <button
                  type="button"
                  onClick={() => saveBenchmarkRows(changedBenchmarkRows)}
                  disabled={savingBenchmarkBulk || changedBenchmarkRows.length === 0}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${savingBenchmarkBulk || changedBenchmarkRows.length === 0 ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "border border-slate-200 bg-white text-slate-700"}`}
                >
                  Save All Edited Rows ({changedBenchmarkRows.length})
                </button>
              </div>
            </div>

            {benchmarkTableView === "antutu-geekbench" ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[1450px] divide-y divide-slate-200 bg-white text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-3 font-semibold">Processor</th>
                    {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? (
                    <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>AnTuTu</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Version</span>
                      </div>
                    </th>
                    ) : null}
                    {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? <th className="px-3 py-3 font-semibold">AnTuTu Total</th> : null}
                    {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? <th className="px-3 py-3 font-semibold">CPU</th> : null}
                    {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? <th className="px-3 py-3 font-semibold">GPU</th> : null}
                    {antutuGeekbenchGroups.includes("antutu-normal") ? <th className="px-3 py-3 font-semibold">Memory</th> : null}
                    {antutuGeekbenchGroups.includes("antutu-normal") ? <th className="px-3 py-3 font-semibold">UX</th> : null}
                    {antutuGeekbenchGroups.includes("geekbench") ? (
                    <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>Geekbench</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Version</span>
                      </div>
                    </th>
                    ) : null}
                    {antutuGeekbenchGroups.includes("geekbench") ? <th className="px-3 py-3 font-semibold">Single</th> : null}
                    {antutuGeekbenchGroups.includes("geekbench") ? <th className="px-3 py-3 font-semibold">Multi</th> : null}
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {benchmarkRows.map((row) => {
                    if (!row.id) return null;
                    const draft = benchmarkDrafts[row.id] || benchmarkSavedDrafts[row.id] || toDraft(row);
                    const isDirty = Boolean(benchmarkDrafts[row.id]);
                    const isTempSaved = Boolean(benchmarkSavedDrafts[row.id]);
                    const isSaving = savingBenchmarkIds.includes(row.id);
                    const isEditing = benchmarkTableEditing;
                    const disableTempSave = !isDirty || isSaving || savingBenchmarkBulk || submittingBenchmarkBulk;
                    return (
                      <tr key={`benchmark-${row.id}`} className={isDirty ? "bg-amber-50/40" : "hover:bg-slate-50/70"}>
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900">{normalizeBenchmarkProcessorName(row.name || "-")}</p>
                          <p className="text-xs text-slate-500">{row.id}</p>
                        </td>
                        {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? (
                            <div className="grid gap-2">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <input value={draft.antutuVersion} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuVersion", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Normal" /> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <input value={draft.antutuCalcVersion} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuCalcVersion", e.target.value)} className="h-9 w-24 rounded-lg border border-amber-200 bg-amber-50 px-2" placeholder="Ranking" /> : null}
                            </div>
                          ) : (
                            <div className="grid gap-1 text-sm">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <p>{displayBenchmarkValue(draft.antutuVersion)}</p> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <p className="text-amber-700">{displayBenchmarkValue(draft.antutuCalcVersion)}</p> : null}
                            </div>
                          )}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? (
                            <div className="grid gap-2">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <input value={draft.antutu} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutu", e.target.value)} className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2" placeholder="Normal" /> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <input value={draft.antutuCalc} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuCalc", e.target.value)} className="h-9 w-32 rounded-lg border border-amber-200 bg-amber-50 px-2" placeholder="Ranking" /> : null}
                            </div>
                          ) : (
                            <div className="grid gap-1 text-sm">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <p>{displayBenchmarkValue(draft.antutu)}</p> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <p className="text-amber-700">{displayBenchmarkValue(draft.antutuCalc)}</p> : null}
                            </div>
                          )}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? (
                            <div className="grid gap-2">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <input value={draft.antutuCpu} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuCpu", e.target.value)} className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2" placeholder="Normal" /> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <input value={draft.antutuCalcCpu} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuCalcCpu", e.target.value)} className="h-9 w-28 rounded-lg border border-amber-200 bg-amber-50 px-2" placeholder="Ranking" /> : null}
                            </div>
                          ) : (
                            <div className="grid gap-1 text-sm">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <p>{displayBenchmarkValue(draft.antutuCpu)}</p> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <p className="text-amber-700">{displayBenchmarkValue(draft.antutuCalcCpu)}</p> : null}
                            </div>
                          )}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? (
                            <div className="grid gap-2">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <input value={draft.antutuGpu} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuGpu", e.target.value)} className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2" placeholder="Normal" /> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <input value={draft.antutuCalcGpu} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuCalcGpu", e.target.value)} className="h-9 w-28 rounded-lg border border-amber-200 bg-amber-50 px-2" placeholder="Ranking" /> : null}
                            </div>
                          ) : (
                            <div className="grid gap-1 text-sm">
                              {antutuGeekbenchGroups.includes("antutu-normal") ? <p>{displayBenchmarkValue(draft.antutuGpu)}</p> : null}
                              {antutuGeekbenchGroups.includes("antutu-ranking") ? <p className="text-amber-700">{displayBenchmarkValue(draft.antutuCalcGpu)}</p> : null}
                            </div>
                          )}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("antutu-normal") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.antutuMemory} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuMemory", e.target.value)} className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2" placeholder="Memory" /> : <p className="text-sm">{displayBenchmarkValue(draft.antutuMemory)}</p>}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("antutu-normal") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.antutuUx} onChange={(e) => updateBenchmarkDraft(row.id as string, "antutuUx", e.target.value)} className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2" placeholder="UX" /> : <p className="text-sm">{displayBenchmarkValue(draft.antutuUx)}</p>}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("geekbench") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.geekbenchVersion} onChange={(e) => updateBenchmarkDraft(row.id as string, "geekbenchVersion", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Version" /> : <p className="text-sm">{displayBenchmarkValue(draft.geekbenchVersion)}</p>}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("geekbench") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.geekbenchSingle} onChange={(e) => updateBenchmarkDraft(row.id as string, "geekbenchSingle", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Single" /> : <p className="text-sm">{displayBenchmarkValue(draft.geekbenchSingle)}</p>}
                        </td>
                        ) : null}
                        {antutuGeekbenchGroups.includes("geekbench") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.geekbenchMulti} onChange={(e) => updateBenchmarkDraft(row.id as string, "geekbenchMulti", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Multi" /> : <p className="text-sm">{displayBenchmarkValue(draft.geekbenchMulti)}</p>}
                        </td>
                        ) : null}
                        <td className="sticky right-0 z-10 bg-white px-3 py-3 align-top shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                          <button
                            type="button"
                            onClick={() => tempSaveBenchmarkRow(row)}
                            disabled={disableTempSave}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${disableTempSave ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}
                          >
                            {isSaving ? "Saving..." : isDirty ? "Save Row" : isTempSaved ? "Saved" : "Save Row"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {benchmarkRows.length === 0 ? (
                    <tr>
                      <td colSpan={2 + ((antutuGeekbenchGroups.includes("antutu-normal") || antutuGeekbenchGroups.includes("antutu-ranking")) ? 4 : 0) + (antutuGeekbenchGroups.includes("antutu-normal") ? 2 : 0) + (antutuGeekbenchGroups.includes("geekbench") ? 3 : 0)} className="px-4 py-8 text-center text-sm text-slate-500">
                        No processors available for benchmark editing with the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[1300px] divide-y divide-slate-200 bg-white text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-3 font-semibold">Processor</th>
                    {ai3dMarkGroups.includes("ai-score") ? <th className="px-3 py-3 text-center font-semibold">AI Score</th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Wild Life</span>
                      </div>
                    </th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Solar Bay</span>
                      </div>
                    </th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Steel Nomad Light</span>
                      </div>
                    </th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Wild Life Extreme</span>
                      </div>
                    </th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Wild Life Extreme Min</span>
                      </div>
                    </th> : null}
                    {ai3dMarkGroups.includes("three-dmark") ? <th className="px-3 py-3 text-center font-semibold">
                      <div className="flex flex-col items-center">
                        <span>3DMark</span>
                        <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">Wild Life Extreme Max</span>
                      </div>
                    </th> : null}
                    <th className="sticky right-0 z-10 bg-slate-50 px-3 py-3 text-center font-semibold shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {benchmarkRows.map((row) => {
                    if (!row.id) return null;
                    const draft = benchmarkDrafts[row.id] || benchmarkSavedDrafts[row.id] || toDraft(row);
                    const isDirty = Boolean(benchmarkDrafts[row.id]);
                    const isTempSaved = Boolean(benchmarkSavedDrafts[row.id]);
                    const isSaving = savingBenchmarkIds.includes(row.id);
                    const isEditing = benchmarkTableEditing;
                    const disableTempSave = !isDirty || isSaving || savingBenchmarkBulk || submittingBenchmarkBulk;
                    return (
                      <tr key={`benchmark-ai-${row.id}`} className={isDirty ? "bg-amber-50/40" : "hover:bg-slate-50/70"}>
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900">{normalizeBenchmarkProcessorName(row.name || "-")}</p>
                          <p className="text-xs text-slate-500">{row.id}</p>
                        </td>
                        {ai3dMarkGroups.includes("ai-score") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.aiScore} onChange={(e) => updateBenchmarkDraft(row.id as string, "aiScore", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="AI" /> : <p className="text-sm">{displayBenchmarkValue(draft.aiScore)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkWildLife} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkWildLife", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Wild Life" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkWildLife)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkSolarBay} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkSolarBay", e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2" placeholder="Solar Bay" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkSolarBay)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkSteelNomadLight} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkSteelNomadLight", e.target.value)} className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2" placeholder="Steel Nomad Light" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkSteelNomadLight)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkWildLifeExtreme} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkWildLifeExtreme", e.target.value)} className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2" placeholder="Wild Life Extreme" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkWildLifeExtreme)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkWildLifeExtremeMin} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkWildLifeExtremeMin", e.target.value)} className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2" placeholder="Min" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkWildLifeExtremeMin)}</p>}
                        </td>
                        ) : null}
                        {ai3dMarkGroups.includes("three-dmark") ? (
                        <td className="px-3 py-3 align-top">
                          {isEditing ? <input value={draft.threeDMarkWildLifeExtremeMax} onChange={(e) => updateBenchmarkDraft(row.id as string, "threeDMarkWildLifeExtremeMax", e.target.value)} className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2" placeholder="Max" /> : <p className="text-sm">{displayBenchmarkValue(draft.threeDMarkWildLifeExtremeMax)}</p>}
                        </td>
                        ) : null}
                        <td className="sticky right-0 z-10 bg-white px-3 py-3 align-top shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                          <button
                            type="button"
                            onClick={() => tempSaveBenchmarkRow(row)}
                            disabled={disableTempSave}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${disableTempSave ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}
                          >
                            {isSaving ? "Saving..." : isDirty ? "Save Row" : isTempSaved ? "Saved" : "Save Row"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {benchmarkRows.length === 0 ? (
                    <tr>
                      <td colSpan={2 + (ai3dMarkGroups.includes("ai-score") ? 1 : 0) + (ai3dMarkGroups.includes("three-dmark") ? 6 : 0)} className="px-4 py-8 text-center text-sm text-slate-500">
                        No processors available for benchmark editing with the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            )}
        </>
      </section>
      ) : null}

      {adminSectionReady && adminSectionView === "notes" ? (
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminSectionView("processors")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Processor List
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("benchmarks")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Benchmark Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("scores")}
                className="rounded-t-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Score Table
              </button>
              <button
                type="button"
                onClick={() => setAdminSectionView("notes")}
                className="rounded-t-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Admin Notes
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Keep admin-only guessed data, leaks, missing points, and reminders grouped under each processor so you can update them later when the real specs arrive.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Total processors with notes: <span className="font-semibold text-slate-900">{noteGroups.length}</span></p>
            <p>Visible after filters: <span className="font-semibold text-slate-900">{visibleNoteGroups.length}</span></p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,340px)_1fr_auto] lg:items-start">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Processor Name</label>
              <textarea
                value={noteForm.processorNames}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, processorNames: e.target.value }))}
                rows={4}
                placeholder={"Write one processor per line or separate by commas.\nExample:\nMediaTek Dimensity 9500\nMediaTek Dimensity 9400\nSamsung Exynos 2500"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              />
              <p className="text-xs text-slate-500">You can add the same point set to many processors at once. Existing processor headings will be reused automatically.</p>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data Points</label>
              <textarea
                value={noteForm.rawPoints}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, rawPoints: e.target.value }))}
                placeholder={"Write one point per line.\nExample:\nGuessed Cortex-A78 based on leaked cluster\nLaunch expected in September\nGeekbench score still missing official source"}
                className="min-h-[124px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              />
              <p className="text-xs text-slate-500">Paste one line or many lines at once. Duplicate points for the same processor are ignored.</p>
            </div>
            <div className="flex gap-2 lg:flex-col">
              <button
                type="button"
                onClick={() => void handleQuickNoteSave()}
                disabled={savingQuickNote}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${savingQuickNote ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}
              >
                {savingQuickNote ? "Saving..." : "Save Notes"}
              </button>
              <button
                type="button"
                onClick={() => setNoteForm({ processorNames: "", rawPoints: "" })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            value={noteQuery}
            onChange={(e) => setNoteQuery(e.target.value)}
            placeholder="Search processor name, vendor, or any saved point..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNoteVendorFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${noteVendorFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              All ({Array.from(noteVendorCounts.values()).reduce((sum, count) => sum + count, 0)})
            </button>
            {Array.from(noteVendorCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([vendor, count]) => (
                <button
                  key={`note-vendor-${vendor}`}
                  type="button"
                  onClick={() => setNoteVendorFilter(vendor)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${noteVendorFilter.toLowerCase() === vendor.toLowerCase() ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {vendor} ({count})
                </button>
              ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {visibleNoteGroups.map((group) => {
            const safeId = String(group.id || slugify(group.processorName || ""));
            const isSaving = savingNoteGroupIds.includes(safeId);
            const isDeleting = deletingNoteGroupIds.includes(safeId);
            const dirty = isNoteGroupDirty(group);
            return (
              <article key={`processor-note-${safeId}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{group.processorName}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{group.vendor || "Other"}</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{group.items.length} point{group.items.length === 1 ? "" : "s"}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Admin-only scratchpad for guessed values, leaks, and missing-source reminders.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                    onClick={() => {
                      const current = getNoteEditorValue(group);
                      const nextValue = current.trim() ? `${current}\n${NOTE_BULLET} ` : `${NOTE_BULLET} `;
                      setNoteEditorValue(safeId, nextValue);
                    }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Add Point
                    </button>
                    <button
                      type="button"
                      onClick={() => void persistNoteGroup(group).catch((err) => setError(err instanceof Error ? err.message : "Failed to save processor notes."))}
                      disabled={isSaving || !dirty}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${isSaving || !dirty ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}
                    >
                      {isSaving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteNoteGroup(safeId, group.processorName)}
                      disabled={isDeleting}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${isDeleting ? "cursor-not-allowed border border-rose-100 bg-rose-50 text-rose-300" : "border border-rose-200 bg-rose-50 text-rose-700"}`}
                    >
                      {isDeleting ? "Deleting..." : "Delete Processor"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <textarea
                    value={getNoteEditorValue(group)}
                    onChange={(e) => setNoteEditorValue(safeId, e.target.value)}
                    onKeyDown={(e) => handleNoteEditorKeyDown(e, safeId, group)}
                    rows={Math.max(3, parseNoteLines(getNoteEditorValue(group)).length + 1)}
                    placeholder={"• CPU benchmark is guessed from early leak\n• Launch window likely September\n• Official Geekbench source still missing"}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-500">Write one point per line. Remove any point naturally with backspace or by deleting the line, like a normal note editor.</p>
                </div>
              </article>
            );
          })}

          {visibleNoteGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No admin notes found for the current filters.</p>
              <p className="mt-1 text-sm text-slate-500">Use the form above to save guessed data, leaks, or pending verification points for any processor.</p>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}
    </main>
  );
}







