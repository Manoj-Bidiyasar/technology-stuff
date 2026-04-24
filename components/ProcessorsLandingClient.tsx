"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  processors: ProcessorProfile[];
};

type SortKey = "antutu" | "score" | "nm" | "clock" | "phones";
type ClassKey = "all" | "flagship" | "upper-midrange" | "midrange" | "budget" | "entry";

function splitCompareParam(value: string): { left: string; right: string } {
  const raw = String(value || "").trim();
  if (!raw.includes("-vs-")) return { left: raw, right: "" };
  const parts = raw.split("-vs-").map((v) => v.trim()).filter(Boolean);
  return { left: parts[0] || "", right: parts[1] || "" };
}

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "NA";
  return Math.round(value).toLocaleString("en-IN");
}

function vendorChipLabel(value: string): string {
  if (String(value || "").trim().toLowerCase() === "qualcomm") return "Qualcomm Snapdragon";
  return value;
}

function scoreLabel(value?: number): string {
  if (!Number.isFinite(value)) return "NA";
  return String(Math.round(Number(value)));
}

function num(value?: number, digits = 1): string {
  if (!Number.isFinite(value)) return "NA";
  const v = value as number;
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}

function fullProcessorName(p: ProcessorProfile): string {
  const raw = String(p.name || "").trim();
  const vendor = String(p.vendor || "").trim();
  if (!raw) return raw;
  if (!vendor || vendor.toLowerCase() === "other") return raw;
  if (raw.toLowerCase().startsWith(vendor.toLowerCase())) return raw;
  return `${vendor} ${raw}`;
}

function processorCardScore(p: ProcessorProfile): number | undefined {
  if (Number.isFinite(p.totalScore)) return Number(p.totalScore);
  if (Number.isFinite(p.avgPhoneScore)) return Math.round(Number(p.avgPhoneScore) * 10);
  return undefined;
}

function mobileCardName(p: ProcessorProfile): string {
  const raw = fullProcessorName(p);
  if (/^qualcomm\s+/i.test(raw)) return raw.replace(/^qualcomm\s+/i, "").trim();
  return raw;
}

function levenshtein(a: string, b: string): number {
  const alen = a.length;
  const blen = b.length;
  if (!alen) return blen;
  if (!blen) return alen;
  const dp = Array.from({ length: alen + 1 }, (_, i) => i);
  for (let j = 1; j <= blen; j += 1) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= alen; i += 1) {
      const temp = dp[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[alen];
}

function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/(\d)\s*plus\b/g, "$1+")
    .replace(/(\d)\s*\+/g, "$1+")
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNumericToken(value: string): boolean {
  return /\d/.test(value);
}

const IGNORED_SEARCH_TOKENS = new Set(["qualcomm", "snapdragon", "mediatek", "dimensity", "helio", "exynos", "apple", "google", "tensor", "unisoc"]);

function tokenizeQuery(input: string): string[] {
  return normalizeQuery(input)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !IGNORED_SEARCH_TOKENS.has(token));
}

function tokenizeTarget(input: string): string[] {
  const tokens = normalizeQuery(input).split(" ").filter(Boolean);
  const expanded: string[] = [];
  for (const token of tokens) {
    if (IGNORED_SEARCH_TOKENS.has(token)) continue;
    expanded.push(token);
    const numericParts = token.match(/\d+\+?[a-z]?/g) || [];
    for (const part of numericParts) {
      if (part !== token) expanded.push(part);
    }
  }
  return expanded;
}

function tokenMatchesQueryToken(token: string, queryToken: string): boolean {
  return token.startsWith(queryToken);
}

function startsWithToken(text: string, query: string): boolean {
  const qTokens = tokenizeQuery(query);
  if (qTokens.length === 0) return false;
  const tTokens = tokenizeTarget(text);
  if (qTokens.length === 1) return tTokens.some((token) => tokenMatchesQueryToken(token, qTokens[0]));
  for (let start = 0; start <= tTokens.length - qTokens.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < qTokens.length; offset += 1) {
      if (!tokenMatchesQueryToken(tTokens[start + offset], qTokens[offset])) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function fuzzyMatchName(target: string, query: string): boolean {
  const queryTerms = tokenizeQuery(query);
  if (!queryTerms.length || queryTerms.some(isNumericToken)) return false;
  const q = queryTerms.join(" ");
  const t = tokenizeTarget(target).join(" ");
  if (!t) return false;
  if (t.includes(q)) return true;
  const qTokens = q.split(" ");
  const tTokens = t.split(" ");
  return qTokens.every((qt) =>
    tTokens.some((tt) => {
      if (tokenMatchesQueryToken(tt, qt)) return true;
      return levenshtein(tt, qt) <= 1;
    }),
  );
}

function suggestionScore(target: string, query: string): number {
  const rawTarget = target.toLowerCase().trim();
  const rawQuery = query.toLowerCase().trim();
  const normalizedTarget = normalizeQuery(target);
  const normalizedQuery = normalizeQuery(query);
  const queryTokens = tokenizeQuery(query);
  const targetTokens = tokenizeTarget(target);
  if (!rawQuery || !normalizedQuery) return 0;
  if (rawTarget === rawQuery) return 1000;
  if (normalizedTarget === normalizedQuery) return 950;
  const sequenceStart = startsWithToken(target, query)
    ? (() => {
        if (queryTokens.length === 1) return targetTokens.findIndex((token) => tokenMatchesQueryToken(token, queryTokens[0]));
        for (let start = 0; start <= targetTokens.length - queryTokens.length; start += 1) {
          let matches = true;
          for (let offset = 0; offset < queryTokens.length; offset += 1) {
            if (!tokenMatchesQueryToken(targetTokens[start + offset], queryTokens[offset])) {
              matches = false;
              break;
            }
          }
          if (matches) return start;
        }
        return -1;
      })()
    : -1;
  if (sequenceStart === 0 && queryTokens.length > 1) return 900;
  if (sequenceStart === 0) return 860;
  if (sequenceStart > 0 && queryTokens.length > 1) return 820;
  if (sequenceStart > 0) return 780;
  if (fuzzyMatchName(target, query)) return 620;
  return 0;
}

function processorClass(value?: number): Exclude<ClassKey, "all"> {
  const score = Number(value || 0);
  if (score >= 1800000) return "flagship";
  if (score >= 1300000) return "upper-midrange";
  if (score >= 900000) return "midrange";
  if (score >= 550000) return "budget";
  return "entry";
}

export default function ProcessorsLandingClient({ processors }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const bySlug = useMemo(() => new Map(processors.map((p) => [p.slug, p])), [processors]);
  const vendors = useMemo(() => ["All", ...Array.from(new Set(processors.map((p) => p.vendor))).sort((a, b) => b.localeCompare(a))], [processors]);
  const rawLeftParam = String(searchParams.get("left") || "").trim();
  const rawRightParam = String(searchParams.get("right") || "").trim();
  const splitLeft = splitCompareParam(rawLeftParam);
  const initialLeftSlug = splitLeft.left;
  const initialRightSlug = rawRightParam || splitLeft.right;

  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("All");
  const [sortBy, setSortBy] = useState<SortKey>("antutu");
  const [classFilter, setClassFilter] = useState<ClassKey>("all");
  const [showCount, setShowCount] = useState(18);
  const [leftSlug, setLeftSlug] = useState(initialLeftSlug);
  const [rightSlug, setRightSlug] = useState(initialRightSlug);
  const [leftText, setLeftText] = useState(bySlug.get(initialLeftSlug) ? fullProcessorName(bySlug.get(initialLeftSlug) as ProcessorProfile) : "");
  const [rightText, setRightText] = useState(bySlug.get(initialRightSlug) ? fullProcessorName(bySlug.get(initialRightSlug) as ProcessorProfile) : "");
  const [leftFocused, setLeftFocused] = useState(false);
  const [rightFocused, setRightFocused] = useState(false);
  const [leftTrayFocused, setLeftTrayFocused] = useState(false);
  const [rightTrayFocused, setRightTrayFocused] = useState(false);
  const [isTrayVisible, setIsTrayVisible] = useState(Boolean(initialLeftSlug || initialRightSlug));
  const [trayDismissed, setTrayDismissed] = useState(false);

  const left = bySlug.get(leftSlug);
  const right = bySlug.get(rightSlug);
  const syncKey = `${leftSlug}|${rightSlug}|${pathname || ""}|${trayDismissed ? "1" : "0"}|${searchParams.toString()}`;

  useEffect(() => {
    if (trayDismissed) {
      setIsTrayVisible(false);
      return;
    }
    if (leftSlug || rightSlug) {
      setIsTrayVisible(true);
    } else {
      setIsTrayVisible(false);
    }
  }, [leftSlug, rightSlug, trayDismissed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("processorsCompareTrayDismissed") === "1";
    setTrayDismissed(dismissed);
    if (dismissed && (leftSlug || rightSlug)) {
      setLeftSlug("");
      setRightSlug("");
      setLeftText("");
      setRightText("");
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const current = searchParams.toString();
    const params = new URLSearchParams(current);
    if (leftSlug) {
      params.set("left", leftSlug);
    } else {
      params.delete("left");
    }
    if (rightSlug) {
      params.set("right", rightSlug);
    } else {
      params.delete("right");
    }
    if (trayDismissed) {
      params.delete("left");
      params.delete("right");
    }
    const next = params.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [syncKey, router, pathname, searchParams]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = processors.filter((p) => {
      if (vendor !== "All" && p.vendor !== vendor) return false;
      if (classFilter !== "all" && processorClass(p.antutu) !== classFilter) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || p.vendor.toLowerCase().includes(query);
    });

    const sorted = [...list].sort((a, b) => {
      if (sortBy === "score") return (processorCardScore(b) || 0) - (processorCardScore(a) || 0);
      if (sortBy === "nm") return (a.fabricationNm || 99) - (b.fabricationNm || 99);
      if (sortBy === "clock") return (b.maxCpuGhz || 0) - (a.maxCpuGhz || 0);
      if (sortBy === "phones") return (b.phoneCount || 0) - (a.phoneCount || 0);
      return (b.antutu || 0) - (a.antutu || 0);
    });

    return sorted;
  }, [processors, q, vendor, sortBy, classFilter]);

  const top = useMemo(() => [...processors].sort((a, b) => (b.antutu || 0) - (a.antutu || 0))[0], [processors]);
  const maxAntutu = useMemo(() => Math.max(...processors.map((p) => p.antutu || 0), 1), [processors]);
  const formatProcessLabel = (value?: string) => {
    const raw = String(value || "").trim();
    if (!raw) return "NA";
    if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}nm`;
    return raw;
  };
  const bestNm = useMemo(() => {
    const values = processors.map((p) => Number(p.fabricationNm || 0)).filter((v) => v > 0);
    return values.length ? Math.min(...values) : undefined;
  }, [processors]);
  const bestProcess = useMemo(() => {
    if (bestNm) return undefined;
    const found = processors.find((p) => String(p.process || "").trim());
    return found ? String(found.process || "").trim() : undefined;
  }, [processors, bestNm]);

  const canCompare = Boolean(left && right && left.slug !== right.slug);
  const duplicateSelection = Boolean(leftSlug && rightSlug && leftSlug === rightSlug);
  const leftMatches = useMemo(() => {
    const t = leftText.trim();
    if (!t) return [];
    return processors
      .filter((p) => Math.max(suggestionScore(fullProcessorName(p), t), suggestionScore(p.name, t)) > 0)
      .sort((a, b) => {
        const leftScore = Math.max(suggestionScore(fullProcessorName(a), t), suggestionScore(a.name, t));
        const rightScore = Math.max(suggestionScore(fullProcessorName(b), t), suggestionScore(b.name, t));
        if (rightScore !== leftScore) return rightScore - leftScore;
        return fullProcessorName(a).localeCompare(fullProcessorName(b));
      });
  }, [processors, leftText, rightSlug]);
  const rightMatches = useMemo(() => {
    const t = rightText.trim();
    if (!t) return [];
    return processors
      .filter((p) => Math.max(suggestionScore(fullProcessorName(p), t), suggestionScore(p.name, t)) > 0)
      .sort((a, b) => {
        const leftScore = Math.max(suggestionScore(fullProcessorName(a), t), suggestionScore(a.name, t));
        const rightScore = Math.max(suggestionScore(fullProcessorName(b), t), suggestionScore(b.name, t));
        if (rightScore !== leftScore) return rightScore - leftScore;
        return fullProcessorName(a).localeCompare(fullProcessorName(b));
      });
  }, [processors, rightText, leftSlug]);

  useEffect(() => {
    setShowCount(18);
  }, [q, vendor, sortBy, classFilter]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    if (showCount >= filtered.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setShowCount((current) => {
          if (current >= filtered.length) return current;
          return Math.min(current + 18, filtered.length);
        });
      },
      {
        root: null,
        rootMargin: "400px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, showCount]);

  const leftSuggestions = useMemo(() => leftMatches.slice(0, 16), [leftMatches]);
  const rightSuggestions = useMemo(() => rightMatches.slice(0, 16), [rightMatches]);

  const leftNotFound = Boolean(leftText.trim() && leftSuggestions.length === 0 && !leftSlug);
  const rightNotFound = Boolean(rightText.trim() && rightSuggestions.length === 0 && !rightSlug);
  const leftDuplicateSuggestion = Boolean(rightSlug && leftSuggestions.some((p) => p.slug === rightSlug));
  const rightDuplicateSuggestion = Boolean(leftSlug && rightSuggestions.some((p) => p.slug === leftSlug));
  const leftNotFoundWarning = leftNotFound && leftText.trim().length >= 3 && !leftFocused;
  const rightNotFoundWarning = rightNotFound && rightText.trim().length >= 3 && !rightFocused;
  const leftTrayNotFoundWarning = leftNotFound && leftText.trim().length >= 3 && !leftTrayFocused;
  const rightTrayNotFoundWarning = rightNotFound && rightText.trim().length >= 3 && !rightTrayFocused;
  const leftDuplicateWarning = leftDuplicateSuggestion && leftText.trim().length >= 2 && !leftSlug;
  const rightDuplicateWarning = rightDuplicateSuggestion && rightText.trim().length >= 2 && !rightSlug;

  function exactSelectableSlug(value: string, otherSlug: string): string {
    const t = value.trim().toLowerCase();
    if (!t) return "";
    const exact = processors.find((p) => p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t);
    if (!exact || suggestionDisabled(exact.slug, otherSlug)) return "";
    return exact.slug;
  }

  function openCompare() {
    if (!canCompare || !left || !right) return;
    router.push(`/processors/compare/${left.slug}-vs-${right.slug}`);
  }

  function addToCompare(slug: string) {
    const item = bySlug.get(slug);
    if (!item) return;
    if (trayDismissed) {
      setTrayDismissed(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("processorsCompareTrayDismissed", "0");
      }
      setLeftSlug("");
      setRightSlug("");
      setLeftText("");
      setRightText("");
    }
    setIsTrayVisible(true);

    if (!leftSlug) {
      setLeftSlug(item.slug);
      setLeftText(fullProcessorName(item));
      return;
    }

    if (!rightSlug && slug !== leftSlug) {
      setRightSlug(item.slug);
      setRightText(fullProcessorName(item));
      return;
    }

    if (slug !== leftSlug) {
      setRightSlug(item.slug);
      setRightText(fullProcessorName(item));
    }
  }

  function suggestionDisabled(candidateSlug: string, otherSlug: string): boolean {
    return Boolean(candidateSlug && otherSlug && candidateSlug === otherSlug);
  }

  function clearLeftSelection() {
    setLeftSlug("");
    setLeftText("");
  }

  function clearRightSelection() {
    setRightSlug("");
    setRightText("");
  }

  function clearAllSelection() {
    clearLeftSelection();
    clearRightSelection();
  }

  function dismissTray() {
    clearAllSelection();
    setIsTrayVisible(false);
    setTrayDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("processorsCompareTrayDismissed", "1");
    }
  }

  return (
    <main className="mobile-container pb-28 pt-4 sm:pb-24 sm:pt-5">
      <section className="relative hidden overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#fefefe] via-[#f7fbff] to-[#eef6ff] text-slate-900 shadow-lg sm:block">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-700">Processor Hub</p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">Find The Best Mobile Chipset</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Modern benchmark explorer with quick side-by-side compare, vendor filters, and real-world score signals.
          </p>

          <div className="mt-3 hidden gap-2 sm:hidden">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">AnTuTu Score</p>
                <p className="text-sm font-extrabold text-slate-900">{top ? antutuLabel(top.antutu) : "NA"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Peak CPU Speed</p>
                <p className="text-sm font-extrabold text-slate-900">{top?.maxCpuGhz ? `${num(top.maxCpuGhz, 2)} GHz` : "NA"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Best Node</p>
                <p className="text-sm font-extrabold text-slate-900">{bestNm ? `${bestNm}nm` : formatProcessLabel(bestProcess)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">AnTuTu Score</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">{top ? antutuLabel(top.antutu) : "NA"}</p>
              <p className="text-xs text-slate-600">{top?.name || "No data"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Peak CPU Clock</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">{top?.maxCpuGhz ? `${num(top.maxCpuGhz, 2)} GHz` : "NA"}</p>
              <p className="text-xs text-slate-600">{top?.name || "No data"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Best Node</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">{bestNm ? `${bestNm}nm` : formatProcessLabel(bestProcess)}</p>
              <p className="text-xs text-slate-600">Lower is generally better efficiency</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mt-3 sm:mt-5">
        <article className="panel overflow-visible border border-blue-100 p-2.5 sm:overflow-hidden sm:p-5">
          <div className="pointer-events-none absolute" />
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Quick Compare Studio</h2>
            <Link
              href="/processors/compare"
              className="text-sm font-extrabold text-blue-700 underline-offset-2 transition hover:text-blue-800 hover:underline sm:text-base"
            >
              Open Compare List
            </Link>
          </div>

          <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:mt-4 sm:gap-3 sm:items-center">
            <div className="relative">
              <input
                value={leftText}
                onChange={(e) => {
                  const value = e.target.value;
                  setLeftText(value);
                  setLeftSlug(exactSelectableSlug(value, rightSlug));
                }}
                onFocus={() => setLeftFocused(true)}
                onBlur={() => setTimeout(() => setLeftFocused(false), 100)}
                placeholder="Select left processor"
                className="h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2 sm:h-11 sm:px-3 sm:text-sm"
              />
              {leftFocused && leftText.trim() ? (
                <div className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg sm:bottom-auto sm:top-full sm:mt-1 sm:mb-0 sm:w-full">
                  {leftSuggestions.length > 0 ? (
                    leftSuggestions.map((p) => {
                      const disabled = suggestionDisabled(p.slug, rightSlug);
                      return (
                      <button
                        key={`left-sg-${p.slug}`}
                        type="button"
                        disabled={disabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (disabled) return;
                          setLeftSlug(p.slug);
                          setLeftText(fullProcessorName(p));
                          setLeftFocused(false);
                        }}
                        className={`block w-full border-b border-slate-100 px-2.5 py-2 text-left last:border-b-0 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:px-3 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                      >
                        <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-[9px] font-semibold text-slate-800 sm:text-sm">{fullProcessorName(p)}</span>
                        {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700 sm:mt-0 sm:shrink-0 sm:text-[11px] sm:normal-case sm:tracking-normal">Already selected</span> : null}
                      </button>
                    )})
                  ) : (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                  )}
                </div>
              ) : null}
              {leftDuplicateWarning ? <p className="mt-1 text-xs font-semibold text-amber-700">Already selected in the other field.</p> : null}
              {leftNotFoundWarning ? <p className="mt-1 text-xs font-semibold text-amber-600">No exact processor found.</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                const nextLeft = rightSlug;
                const nextRight = leftSlug;
                const nextLeftText = rightText;
                const nextRightText = leftText;
                setLeftSlug(nextLeft);
                setRightSlug(nextRight);
                setLeftText(nextLeftText);
                setRightText(nextRightText);
              }}
              aria-label="Swap selected processors"
              className="mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 sm:mx-0 sm:h-10 sm:w-10"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 sm:h-5 sm:w-5" aria-hidden="true">
                <path d="M7 7h11M14 4l4 3-4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 17H6M10 14l-4 3 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="relative">
              <input
                value={rightText}
                onChange={(e) => {
                  const value = e.target.value;
                  setRightText(value);
                  setRightSlug(exactSelectableSlug(value, leftSlug));
                }}
                onFocus={() => setRightFocused(true)}
                onBlur={() => setTimeout(() => setRightFocused(false), 100)}
                placeholder="Select right processor"
                className="h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2 sm:h-11 sm:px-3 sm:text-sm"
              />
              {rightFocused && rightText.trim() ? (
                <div className="absolute bottom-full right-0 z-20 mb-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg sm:bottom-auto sm:top-full sm:right-auto sm:left-0 sm:mt-1 sm:mb-0 sm:w-full">
                  {rightSuggestions.length > 0 ? (
                    rightSuggestions.map((p) => {
                      const disabled = suggestionDisabled(p.slug, leftSlug);
                      return (
                      <button
                        key={`right-sg-${p.slug}`}
                        type="button"
                        disabled={disabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (disabled) return;
                          setRightSlug(p.slug);
                          setRightText(fullProcessorName(p));
                          setRightFocused(false);
                        }}
                        className={`block w-full border-b border-slate-100 px-2.5 py-2 text-left last:border-b-0 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:px-3 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                      >
                        <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-[9px] font-semibold text-slate-800 sm:text-sm">{fullProcessorName(p)}</span>
                        {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700 sm:mt-0 sm:shrink-0 sm:text-[11px] sm:normal-case sm:tracking-normal">Already selected</span> : null}
                      </button>
                    )})
                  ) : (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                  )}
                </div>
              ) : null}
              {rightDuplicateWarning ? <p className="mt-1 text-xs font-semibold text-amber-700">Already selected in the other field.</p> : null}
              {rightNotFoundWarning ? <p className="mt-1 text-xs font-semibold text-amber-600">No exact processor found.</p> : null}
            </div>
          </div>

          <div className="mt-1.5 text-[10px] leading-snug text-slate-600 sm:mt-4 sm:rounded-2xl sm:border sm:border-blue-100 sm:bg-gradient-to-r sm:from-blue-50 sm:to-cyan-50 sm:p-3 sm:text-xs">
            {left && right ? (
              <p>
                Ready: <span className="font-bold text-slate-800">{fullProcessorName(left)}</span> vs{" "}
                <span className="font-bold text-slate-800">{fullProcessorName(right)}</span>
              </p>
            ) : (
              <p>Pick two processors to open a full, detailed comparison page.</p>
            )}
          </div>
          {duplicateSelection ? (
            <p className="mt-1.5 text-xs font-semibold text-red-600 sm:mt-2">Both selections are the same. Pick two different processors.</p>
          ) : null}

          <button
            type="button"
            onClick={openCompare}
            disabled={!canCompare}
            className="mt-1.5 mx-auto block h-8 rounded-xl bg-blue-700 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:mt-4 sm:h-11 sm:px-5 sm:text-sm"
          >
            Compare Now
          </button>
        </article>
      </section>

      <section className="mt-1 panel p-3 sm:mt-5 sm:p-5" id="processor-filters">
        <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search processor name or vendor"
            className="h-9 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none ring-blue-200 focus:ring-2 sm:h-10 sm:flex-1 sm:px-3 sm:text-sm"
          />
          <div className="grid w-full grid-cols-2 gap-1.5 sm:w-auto sm:min-w-[360px] sm:gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 w-full rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none sm:h-10 sm:px-3 sm:text-sm"
            >
              <option value="antutu">Sort: AnTuTu Score</option>
              <option value="score">Sort: TS Score</option>
              <option value="nm">Sort: Fabrication nm</option>
              <option value="clock">Sort: Max Clock</option>
              <option value="phones">Sort: Device Count</option>
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value as ClassKey)}
              className="h-9 w-full rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none sm:h-10 sm:px-3 sm:text-sm"
            >
              <option value="all">Class: All</option>
              <option value="flagship">Class: Flagship</option>
              <option value="upper-midrange">Class: Upper Midrange</option>
              <option value="midrange">Class: Midrange</option>
              <option value="budget">Class: Budget</option>
              <option value="entry">Class: Entry</option>
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          {vendors.map((v) => {
            const active = vendor === v;
            return (
              <button
                key={`vendor-${v}`}
                type="button"
                onClick={() => setVendor(v)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                  active
                    ? "border-blue-300 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {vendorChipLabel(v)}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] font-semibold text-slate-500 sm:mt-3 sm:text-xs">{filtered.length} processors match current filters.</p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, showCount).map((p, idx) => {
          const barWidth = Math.max(6, Math.round(((p.antutu || 0) / maxAntutu) * 100));
          return (
            <article
              key={`processor-${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-900 p-2 text-white sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold leading-tight sm:hidden">{mobileCardName(p)}</p>
                    <p className="hidden truncate text-base font-extrabold sm:block">{fullProcessorName(p)}</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold">#{idx + 1}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/20">
                  <div className="h-1.5 rounded-full bg-cyan-300" style={{ width: `${barWidth}%` }} />
                </div>
              </div>

              <div className="p-2 sm:p-3">
                <div className="grid grid-cols-2 gap-1 text-xs sm:gap-2">
                  <div className="rounded-lg bg-slate-50 p-1 sm:p-2">
                    <p className="text-slate-500">AnTuTu Score</p>
                    <p className="font-extrabold text-slate-900">{antutuLabel(p.antutu)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1 sm:p-2">
                    <p className="text-slate-500">TS Score</p>
                    <p className="font-extrabold text-slate-900">
                      {scoreLabel(Number(p.totalScore ?? processorCardScore(p)))}
                      <span className="ml-0.5 font-semibold text-slate-400">/100</span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1 sm:p-2">
                    <p className="text-slate-500">Fabrication</p>
                    <p className="font-extrabold text-slate-900">{p.fabricationNm ? `${num(p.fabricationNm)}nm` : formatProcessLabel(p.process)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1 sm:p-2">
                    <p className="text-slate-500">Peak Clock</p>
                    <p className="font-extrabold text-slate-900">{p.maxCpuGhz ? `${num(p.maxCpuGhz, 2)} GHz` : "NA"}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => addToCompare(p.slug)}
                    className={`rounded-lg border px-2 py-1 text-xs font-bold sm:px-2.5 sm:py-1.5 ${
                      leftSlug === p.slug || rightSlug === p.slug
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    Compare
                  </button>
                  <Link
                    href={`/processors/${p.slug}`}
                    className="rounded-lg bg-blue-700 px-2 py-1 text-xs font-bold text-white hover:bg-blue-800 sm:px-2.5 sm:py-1.5"
                  >
                    View Specs
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {showCount < filtered.length ? <div ref={loadMoreRef} className="mt-5 h-4 w-full" aria-hidden="true" /> : null}

      {isTrayVisible ? (
        <section className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-1 pb-1 sm:hidden">
              <p className="text-[11px] font-bold text-slate-500">Build your processor Comparison</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearAllSelection}
                  className="rounded-full border border-slate-300 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={dismissTray}
                  aria-label="Close compare tray"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:text-slate-700"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:hidden">
              <div className="relative grid grid-cols-[minmax(0,1fr)_18%] grid-rows-2 gap-x-2 gap-y-1.5">
                <div>
                  <input
                    value={leftText}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (trayDismissed) {
                        setTrayDismissed(false);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem("processorsCompareTrayDismissed", "0");
                        }
                      }
                      setLeftText(value);
                      setLeftSlug(exactSelectableSlug(value, rightSlug));
                    }}
                    onFocus={() => setLeftTrayFocused(true)}
                    onBlur={() => setTimeout(() => setLeftTrayFocused(false), 100)}
                    placeholder="Pick left processor"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                  />
                  {leftTrayFocused && leftText.trim() ? (
                    <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {leftSuggestions.length > 0 ? (
                        leftSuggestions.map((p) => {
                          const disabled = suggestionDisabled(p.slug, rightSlug);
                          return (
                          <button
                            key={`left-tray-sg-${p.slug}`}
                            type="button"
                            disabled={disabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (disabled) return;
                              setLeftSlug(p.slug);
                              setLeftText(fullProcessorName(p));
                              setLeftTrayFocused(false);
                            }}
                            className={`block w-full border-b border-slate-100 px-2 py-1.5 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                          >
                            <span className="block truncate whitespace-nowrap text-[9px] font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                            {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700">Already selected</span> : null}
                          </button>
                        )})
                      ) : (
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                      )}
                    </div>
                  ) : null}
                  {leftDuplicateWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Already selected in the other field.</p> : null}
                  {leftTrayNotFoundWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-600">No exact processor found.</p> : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!left || !right) return;
                    const nextLeft = rightSlug;
                    const nextRight = leftSlug;
                    const nextLeftText = rightText;
                    const nextRightText = leftText;
                    setLeftSlug(nextLeft);
                    setRightSlug(nextRight);
                    setLeftText(nextLeftText);
                    setRightText(nextRightText);
                  }}
                  disabled={!left || !right}
                  aria-label="Swap compare processors"
                  className="row-span-2 inline-flex h-full min-h-[56px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M7 7h11M14 4l4 3-4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 17H6M10 14l-4 3 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div>
                  <input
                    value={rightText}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (trayDismissed) {
                        setTrayDismissed(false);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem("processorsCompareTrayDismissed", "0");
                        }
                      }
                      setRightText(value);
                      setRightSlug(exactSelectableSlug(value, leftSlug));
                    }}
                    onFocus={() => setRightTrayFocused(true)}
                    onBlur={() => setTimeout(() => setRightTrayFocused(false), 100)}
                    placeholder="Pick right processor"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                  />
                  {rightTrayFocused && rightText.trim() ? (
                    <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {rightSuggestions.length > 0 ? (
                        rightSuggestions.map((p) => {
                          const disabled = suggestionDisabled(p.slug, leftSlug);
                          return (
                          <button
                            key={`right-tray-sg-${p.slug}`}
                            type="button"
                            disabled={disabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (disabled) return;
                              setRightSlug(p.slug);
                              setRightText(fullProcessorName(p));
                              setRightTrayFocused(false);
                            }}
                            className={`block w-full border-b border-slate-100 px-2 py-1.5 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                          >
                            <span className="block truncate whitespace-nowrap text-[9px] font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                            {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700">Already selected</span> : null}
                          </button>
                        )})
                      ) : (
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                      )}
                    </div>
                  ) : null}
                  {rightDuplicateWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Already selected in the other field.</p> : null}
                  {rightTrayNotFoundWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-600">No exact processor found.</p> : null}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={openCompare}
                  disabled={!canCompare}
                  className="h-8 w-[72%] max-w-[236px] rounded-lg bg-blue-700 px-4 text-sm font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Compare
                </button>
              </div>

              {duplicateSelection ? (
                <p className="text-xs font-semibold text-red-600">Both selections are the same. Pick two different processors.</p>
              ) : null}
            </div>

            <div className="hidden items-center justify-between gap-2 px-1 pb-1 sm:flex">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Build Your Processor Comparison</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearAllSelection}
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:text-slate-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={dismissTray}
                  aria-label="Close compare tray"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:text-slate-700"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          <div className="hidden items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
            <div className="grid grid-cols-[minmax(0,1.35fr)_28px_minmax(0,1.35fr)] items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 sm:gap-3 sm:px-3">
              <div className="relative">
                <input
                  value={leftText}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (trayDismissed) {
                      setTrayDismissed(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("processorsCompareTrayDismissed", "0");
                      }
                    }
                    setLeftText(value);
                    setLeftSlug(exactSelectableSlug(value, rightSlug));
                  }}
                  onFocus={() => setLeftTrayFocused(true)}
                  onBlur={() => setTimeout(() => setLeftTrayFocused(false), 100)}
                  placeholder="Pick left processor"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                />
                {leftTrayFocused && leftText.trim() ? (
                  <div className="absolute bottom-full z-20 mb-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {leftSuggestions.length > 0 ? (
                      leftSuggestions.map((p) => {
                        const disabled = suggestionDisabled(p.slug, rightSlug);
                        return (
                        <button
                          key={`left-tray-sg-${p.slug}`}
                          type="button"
                          disabled={disabled}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (disabled) return;
                            setLeftSlug(p.slug);
                            setLeftText(fullProcessorName(p));
                            setLeftTrayFocused(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                        >
                          <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-xs font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                          {disabled ? <span className="shrink-0 text-[10px] font-bold text-amber-700">Already selected</span> : null}
                        </button>
                      )})
                    ) : (
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                    )}
                  </div>
                ) : null}
                {leftDuplicateWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Already selected in the other field.</p> : null}
                {leftTrayNotFoundWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-600">No exact processor found.</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!left || !right) return;
                  const nextLeft = rightSlug;
                  const nextRight = leftSlug;
                  const nextLeftText = rightText;
                  const nextRightText = leftText;
                  setLeftSlug(nextLeft);
                  setRightSlug(nextRight);
                  setLeftText(nextLeftText);
                  setRightText(nextRightText);
                }}
                disabled={!left || !right}
                aria-label="Swap compare processors"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M7 7h11M14 4l4 3-4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 17H6M10 14l-4 3 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="relative">
                <input
                  value={rightText}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (trayDismissed) {
                      setTrayDismissed(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("processorsCompareTrayDismissed", "0");
                      }
                    }
                    setRightText(value);
                    setRightSlug(exactSelectableSlug(value, leftSlug));
                  }}
                  onFocus={() => setRightTrayFocused(true)}
                  onBlur={() => setTimeout(() => setRightTrayFocused(false), 100)}
                  placeholder="Pick right processor"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                />
                {rightTrayFocused && rightText.trim() ? (
                  <div className="absolute bottom-full z-20 mb-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {rightSuggestions.length > 0 ? (
                      rightSuggestions.map((p) => {
                        const disabled = suggestionDisabled(p.slug, leftSlug);
                        return (
                        <button
                          key={`right-tray-sg-${p.slug}`}
                          type="button"
                          disabled={disabled}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (disabled) return;
                            setRightSlug(p.slug);
                            setRightText(fullProcessorName(p));
                            setRightTrayFocused(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                        >
                          <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-xs font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                          {disabled ? <span className="shrink-0 text-[10px] font-bold text-amber-700">Already selected</span> : null}
                        </button>
                      )})
                    ) : (
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                    )}
                  </div>
                ) : null}
                {rightDuplicateWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Already selected in the other field.</p> : null}
                {rightTrayNotFoundWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-600">No exact processor found.</p> : null}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:justify-end">
              <button
                type="button"
                onClick={openCompare}
                disabled={!canCompare}
                className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Compare
              </button>
            </div>
          </div>
          {duplicateSelection ? (
            <p className="mt-2 hidden text-xs font-semibold text-red-600 sm:block">Both selections are the same. Pick two different processors.</p>
          ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
