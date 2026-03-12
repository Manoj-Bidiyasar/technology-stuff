"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  processors: ProcessorProfile[];
};

type SortKey = "antutu" | "score" | "nm" | "clock" | "phones";
type ClassKey = "all" | "ultra-flagship" | "flagship" | "upper-midrange" | "midrange" | "budget" | "entry";

function splitCompareParam(value: string): { left: string; right: string } {
  const raw = String(value || "").trim();
  if (!raw.includes("-vs-")) return { left: raw, right: "" };
  const parts = raw.split("-vs-").map((v) => v.trim()).filter(Boolean);
  return { left: parts[0] || "", right: parts[1] || "" };
}

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "NA";
  return `~${Math.round(value).toLocaleString("en-IN")}`;
}

function scoreLabel(value?: number): string {
  if (!Number.isFinite(value)) return "NA";
  return `${Number(value).toFixed(1)} / 10`;
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

function startsWithToken(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const normalized = text.toLowerCase();
  if (normalized.startsWith(q)) return true;
  return normalized.split(/[\s\-_/]+/).some((token) => token.startsWith(q));
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
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatchName(target: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return false;
  const t = normalizeQuery(target);
  if (!t) return false;
  if (t.includes(q)) return true;
  const qTokens = q.split(" ");
  const tTokens = t.split(" ");
  return qTokens.every((qt) =>
    tTokens.some((tt) => tt.startsWith(qt) || levenshtein(tt, qt) <= 1),
  );
}

function processorClass(value?: number): Exclude<ClassKey, "all"> {
  const score = Number(value || 0);
  if (score >= 2800000) return "ultra-flagship";
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

  const bySlug = useMemo(() => new Map(processors.map((p) => [p.slug, p])), [processors]);
  const vendors = useMemo(() => ["All", ...Array.from(new Set(processors.map((p) => p.vendor))).sort()], [processors]);
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
      if (sortBy === "score") return (b.avgPhoneScore || 0) - (a.avgPhoneScore || 0);
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
      .filter((p) => p.slug !== rightSlug)
      .filter(
        (p) =>
          startsWithToken(fullProcessorName(p), t) ||
          startsWithToken(p.name, t) ||
          startsWithToken(p.vendor, t) ||
          fuzzyMatchName(fullProcessorName(p), t) ||
          fuzzyMatchName(p.name, t),
      );
  }, [processors, leftText, rightSlug]);
  const rightMatches = useMemo(() => {
    const t = rightText.trim();
    if (!t) return [];
    return processors
      .filter((p) => p.slug !== leftSlug)
      .filter(
        (p) =>
          startsWithToken(fullProcessorName(p), t) ||
          startsWithToken(p.name, t) ||
          startsWithToken(p.vendor, t) ||
          fuzzyMatchName(fullProcessorName(p), t) ||
          fuzzyMatchName(p.name, t),
      );
  }, [processors, rightText, leftSlug]);

  const leftSuggestions = useMemo(() => leftMatches.slice(0, 8), [leftMatches]);
  const rightSuggestions = useMemo(() => rightMatches.slice(0, 8), [rightMatches]);

  const leftNotFound = Boolean(leftText.trim() && leftSuggestions.length === 0 && !leftSlug);
  const rightNotFound = Boolean(rightText.trim() && rightSuggestions.length === 0 && !rightSlug);
  const leftNotFoundWarning = leftNotFound && leftText.trim().length >= 3 && !leftFocused;
  const rightNotFoundWarning = rightNotFound && rightText.trim().length >= 3 && !rightFocused;
  const leftTrayNotFoundWarning = leftNotFound && leftText.trim().length >= 3 && !leftTrayFocused;
  const rightTrayNotFoundWarning = rightNotFound && rightText.trim().length >= 3 && !rightTrayFocused;

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
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#fefefe] via-[#f7fbff] to-[#eef6ff] text-slate-900 shadow-lg">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-700">Processor Hub</p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">Find The Best Mobile Chipset</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Modern benchmark explorer with quick side-by-side compare, vendor filters, and real-world score signals.
          </p>

          <div className="mt-3 grid gap-2 sm:hidden">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Top Benchmark</p>
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
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Top Benchmark</p>
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

      <section className="mt-5">
        <article className="panel overflow-hidden border border-blue-100 p-4 sm:p-5">
          <div className="pointer-events-none absolute" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Quick Compare Studio</h2>
            <button
              type="button"
              onClick={() => router.push("/processors/compare")}
              className="text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              Open compare list
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="relative">
              <input
                value={leftText}
                onChange={(e) => {
                  const value = e.target.value;
                  setLeftText(value);
                  const exact = processors.find((p) => {
                    const t = value.trim().toLowerCase();
                    return p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t;
                  });
                  setLeftSlug(exact?.slug || "");
                }}
                onFocus={() => setLeftFocused(true)}
                onBlur={() => setTimeout(() => setLeftFocused(false), 100)}
                placeholder="Select left processor"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2"
              />
              {leftFocused && leftText.trim() ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {leftSuggestions.length > 0 ? (
                    leftSuggestions.map((p) => (
                      <button
                        key={`left-sg-${p.slug}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setLeftSlug(p.slug);
                          setLeftText(fullProcessorName(p));
                          setLeftFocused(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                      >
                        <span className="truncate text-sm font-semibold text-slate-800">{fullProcessorName(p)}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{p.vendor}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                  )}
                </div>
              ) : null}
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
              className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 sm:mx-0"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
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
                  const exact = processors.find((p) => {
                    const t = value.trim().toLowerCase();
                    return p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t;
                  });
                  setRightSlug(exact?.slug || "");
                }}
                onFocus={() => setRightFocused(true)}
                onBlur={() => setTimeout(() => setRightFocused(false), 100)}
                placeholder="Select right processor"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2"
              />
              {rightFocused && rightText.trim() ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {rightSuggestions.length > 0 ? (
                    rightSuggestions.map((p) => (
                      <button
                        key={`right-sg-${p.slug}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setRightSlug(p.slug);
                          setRightText(fullProcessorName(p));
                          setRightFocused(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                      >
                        <span className="truncate text-sm font-semibold text-slate-800">{fullProcessorName(p)}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{p.vendor}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                  )}
                </div>
              ) : null}
              {rightNotFoundWarning ? <p className="mt-1 text-xs font-semibold text-amber-600">No exact processor found.</p> : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 text-xs text-slate-600">
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
            <p className="mt-2 text-xs font-semibold text-red-600">Both selections are the same. Pick two different processors.</p>
          ) : null}

          <button
            type="button"
            onClick={openCompare}
            disabled={!canCompare}
            className="mt-4 mx-auto block h-11 rounded-xl bg-blue-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Compare Now
          </button>
        </article>
      </section>

      <section className="mt-5 panel p-4 sm:p-5" id="processor-filters">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search processor name or vendor"
            className="h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-200 focus:ring-2 sm:flex-1"
          />
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none sm:px-3 sm:text-sm"
            >
              <option value="antutu">Sort: Benchmark</option>
              <option value="score">Sort: Avg Score</option>
              <option value="nm">Sort: Fabrication nm</option>
              <option value="clock">Sort: Max Clock</option>
              <option value="phones">Sort: Device Count</option>
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value as ClassKey)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none sm:px-3 sm:text-sm"
            >
              <option value="all">Class: All</option>
              <option value="ultra-flagship">Class: Ultra Flagship</option>
              <option value="flagship">Class: Flagship</option>
              <option value="upper-midrange">Class: Upper Midrange</option>
              <option value="midrange">Class: Midrange</option>
              <option value="budget">Class: Budget</option>
              <option value="entry">Class: Entry</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vendors.map((v) => {
            const active = vendor === v;
            return (
              <button
                key={`vendor-${v}`}
                type="button"
                onClick={() => setVendor(v)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "border-blue-300 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">{filtered.length} processors match current filters.</p>
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
                    <p className="truncate text-base font-extrabold">{fullProcessorName(p)}</p>
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
                    <p className="text-slate-500">AnTuTu</p>
                    <p className="font-extrabold text-slate-900">{antutuLabel(p.antutu)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1 sm:p-2">
                    <p className="text-slate-500">Avg Score</p>
                    <p className="font-extrabold text-slate-900">{scoreLabel(p.avgPhoneScore)}</p>
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

      {showCount < filtered.length ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowCount((c) => Math.min(c + 18, filtered.length))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            Load More
          </button>
        </div>
      ) : null}

      {isTrayVisible ? (
        <section className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4">
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
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
          <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 rounded-xl bg-slate-50 px-2 py-2">
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
                    const exact = processors.find((p) => {
                      const t = value.trim().toLowerCase();
                      return p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t;
                    });
                    setLeftSlug(exact?.slug || "");
                  }}
                  onFocus={() => setLeftTrayFocused(true)}
                  onBlur={() => setTimeout(() => setLeftTrayFocused(false), 100)}
                  placeholder="Pick left processor"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                />
                {leftTrayFocused && leftText.trim() ? (
                  <div className="absolute bottom-full z-20 mb-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {leftSuggestions.length > 0 ? (
                      leftSuggestions.map((p) => (
                        <button
                          key={`left-tray-sg-${p.slug}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setLeftSlug(p.slug);
                            setLeftText(fullProcessorName(p));
                            setLeftTrayFocused(false);
                          }}
                          className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                        >
                          <span className="truncate text-xs font-semibold text-slate-800">{fullProcessorName(p)}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{p.vendor}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                    )}
                  </div>
                ) : null}
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
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    const exact = processors.find((p) => {
                      const t = value.trim().toLowerCase();
                      return p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t;
                    });
                    setRightSlug(exact?.slug || "");
                  }}
                  onFocus={() => setRightTrayFocused(true)}
                  onBlur={() => setTimeout(() => setRightTrayFocused(false), 100)}
                  placeholder="Pick right processor"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
                />
                {rightTrayFocused && rightText.trim() ? (
                  <div className="absolute bottom-full z-20 mb-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {rightSuggestions.length > 0 ? (
                      rightSuggestions.map((p) => (
                        <button
                          key={`right-tray-sg-${p.slug}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRightSlug(p.slug);
                            setRightText(fullProcessorName(p));
                            setRightTrayFocused(false);
                          }}
                          className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                        >
                          <span className="truncate text-xs font-semibold text-slate-800">{fullProcessorName(p)}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{p.vendor}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>
                    )}
                  </div>
                ) : null}
                {rightTrayNotFoundWarning ? <p className="mt-1 text-[11px] font-semibold text-amber-600">No exact processor found.</p> : null}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:justify-end">
              <button
                type="button"
                onClick={openCompare}
                disabled={!canCompare}
                className="h-8 rounded-lg bg-blue-700 px-3 text-xs font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Compare
              </button>
            </div>
          </div>
          {duplicateSelection ? (
            <p className="mt-2 text-xs font-semibold text-red-600">Both selections are the same. Pick two different processors.</p>
          ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
