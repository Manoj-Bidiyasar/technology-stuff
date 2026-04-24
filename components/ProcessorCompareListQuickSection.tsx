"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  processors: ProcessorProfile[];
};

function fullProcessorName(p: ProcessorProfile): string {
  const raw = String(p.name || "").trim();
  const vendor = String(p.vendor || "").trim();
  if (!raw) return raw;
  if (!vendor || vendor.toLowerCase() === "other") return raw;
  if (raw.toLowerCase().startsWith(vendor.toLowerCase())) return raw;
  return `${vendor} ${raw}`;
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

function findQuerySequenceStart(target: string, query: string): number {
  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) return -1;
  const targetTokens = tokenizeTarget(target);
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
}

function fuzzyMatchName(target: string, query: string): boolean {
  const queryTokens = tokenizeQuery(query);
  if (!queryTokens.length || queryTokens.some(isNumericToken)) return false;
  const q = queryTokens.join(" ");
  const t = tokenizeTarget(target).join(" ");
  if (!t) return false;
  if (t.includes(q)) return true;
  const qTokens = q.split(" ");
  const tTokens = t.split(" ");
  return qTokens.every((qt) =>
    tTokens.some((tt) => {
      if (tt.startsWith(qt)) return true;
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
  if (!rawQuery || !normalizedQuery) return 0;
  const sequenceStart = findQuerySequenceStart(target, query);
  if (rawTarget === rawQuery) return 1000;
  if (normalizedTarget === normalizedQuery) return 950;
  if (sequenceStart === 0 && queryTokens.length > 1) return 900;
  if (sequenceStart === 0) return 860;
  if (sequenceStart > 0 && queryTokens.length > 1) return 820;
  if (sequenceStart > 0) return 780;
  if (fuzzyMatchName(target, query)) return 620;
  return 0;
}

export default function ProcessorCompareListQuickSection({ processors }: Props) {
  const router = useRouter();
  const bySlug = useMemo(() => new Map(processors.map((p) => [p.slug, p])), [processors]);
  const [leftSlug, setLeftSlug] = useState("");
  const [rightSlug, setRightSlug] = useState("");
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [leftFocused, setLeftFocused] = useState(false);
  const [rightFocused, setRightFocused] = useState(false);

  const left = bySlug.get(leftSlug);
  const right = bySlug.get(rightSlug);
  const canCompare = Boolean(left && right && left.slug !== right.slug);
  const duplicateSelection = Boolean(leftSlug && rightSlug && leftSlug === rightSlug);

  const leftSuggestions = useMemo(() => {
    const t = leftText.trim();
    if (!t) return [];
    return processors
      .filter((p) => Math.max(suggestionScore(fullProcessorName(p), t), suggestionScore(p.name, t)) > 0)
      .sort((a, b) => {
        const leftRank = Math.max(suggestionScore(fullProcessorName(a), t), suggestionScore(a.name, t));
        const rightRank = Math.max(suggestionScore(fullProcessorName(b), t), suggestionScore(b.name, t));
        if (rightRank !== leftRank) return rightRank - leftRank;
        return fullProcessorName(a).localeCompare(fullProcessorName(b));
      })
      .slice(0, 16);
  }, [leftText, processors, rightSlug]);

  const rightSuggestions = useMemo(() => {
    const t = rightText.trim();
    if (!t) return [];
    return processors
      .filter((p) => Math.max(suggestionScore(fullProcessorName(p), t), suggestionScore(p.name, t)) > 0)
      .sort((a, b) => {
        const leftRank = Math.max(suggestionScore(fullProcessorName(a), t), suggestionScore(a.name, t));
        const rightRank = Math.max(suggestionScore(fullProcessorName(b), t), suggestionScore(b.name, t));
        if (rightRank !== leftRank) return rightRank - leftRank;
        return fullProcessorName(a).localeCompare(fullProcessorName(b));
      })
      .slice(0, 16);
  }, [leftSlug, processors, rightText]);

  function openCompare() {
    if (!left || !right || left.slug === right.slug) return;
    router.push(`/processors/compare/${left.slug}-vs-${right.slug}`);
  }

  function handleSwap() {
    const nextLeft = rightSlug;
    const nextRight = leftSlug;
    const nextLeftText = rightText;
    const nextRightText = leftText;
    setLeftSlug(nextLeft);
    setRightSlug(nextRight);
    setLeftText(nextLeftText);
    setRightText(nextRightText);
  }

  function suggestionDisabled(candidateSlug: string, otherSlug: string): boolean {
    return Boolean(candidateSlug && otherSlug && candidateSlug === otherSlug);
  }

  function exactSelectableSlug(value: string, otherSlug: string): string {
    const t = value.trim().toLowerCase();
    if (!t) return "";
    const exact = processors.find((p) => p.name.toLowerCase() === t || fullProcessorName(p).toLowerCase() === t);
    if (!exact || suggestionDisabled(exact.slug, otherSlug)) return "";
    return exact.slug;
  }

  return (
    <div className="mt-1">
      <p className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Quick Compare</p>
      <p className="mt-1 text-sm text-slate-600">Pick two processors or open an already listed matchup below.</p>

      <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
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
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2 sm:h-11"
          />
          {leftFocused && leftText.trim() ? (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {leftSuggestions.length > 0 ? leftSuggestions.map((p) => {
                const disabled = suggestionDisabled(p.slug, rightSlug);
                return (
                  <button
                    key={`compare-list-left-${p.slug}`}
                    type="button"
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (disabled) return;
                      setLeftSlug(p.slug);
                      setLeftText(fullProcessorName(p));
                      setLeftFocused(false);
                    }}
                    className={`block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                  >
                    <span className="block truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                  </button>
                );
              }) : <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSwap}
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
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring-2 sm:h-11"
          />
          {rightFocused && rightText.trim() ? (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {rightSuggestions.length > 0 ? rightSuggestions.map((p) => {
                const disabled = suggestionDisabled(p.slug, leftSlug);
                return (
                  <button
                    key={`compare-list-right-${p.slug}`}
                    type="button"
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (disabled) return;
                      setRightSlug(p.slug);
                      setRightText(fullProcessorName(p));
                      setRightFocused(false);
                    }}
                    className={`block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                  >
                    <span className="block truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                  </button>
                );
              }) : <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:hidden">
        <div className="relative grid grid-cols-[minmax(0,1fr)_18%] grid-rows-2 gap-x-2 gap-y-1.5">
          <div>
            <input
              value={leftText}
              onChange={(e) => {
                const value = e.target.value;
                setLeftText(value);
                setLeftSlug(exactSelectableSlug(value, rightSlug));
              }}
              onFocus={() => setLeftFocused(true)}
              onBlur={() => setTimeout(() => setLeftFocused(false), 100)}
              placeholder="Pick left processor"
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
            />
            {leftFocused && leftText.trim() ? (
              <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {leftSuggestions.length > 0 ? leftSuggestions.map((p) => {
                  const disabled = suggestionDisabled(p.slug, rightSlug);
                  return (
                    <button
                      key={`compare-list-mobile-left-${p.slug}`}
                      type="button"
                      disabled={disabled}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (disabled) return;
                        setLeftSlug(p.slug);
                        setLeftText(fullProcessorName(p));
                        setLeftFocused(false);
                      }}
                      className={`block w-full border-b border-slate-100 px-2 py-1.5 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                    >
                      <span className="block truncate whitespace-nowrap text-[9px] font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                      {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700">Already selected</span> : null}
                    </button>
                  );
                }) : <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap selected processors"
            className="row-span-2 inline-flex h-full min-h-[56px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
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
                setRightText(value);
                setRightSlug(exactSelectableSlug(value, leftSlug));
              }}
              onFocus={() => setRightFocused(true)}
              onBlur={() => setTimeout(() => setRightFocused(false), 100)}
              placeholder="Pick right processor"
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none ring-blue-200 focus:border-blue-400 focus:ring-2"
            />
            {rightFocused && rightText.trim() ? (
              <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {rightSuggestions.length > 0 ? rightSuggestions.map((p) => {
                  const disabled = suggestionDisabled(p.slug, leftSlug);
                  return (
                    <button
                      key={`compare-list-mobile-right-${p.slug}`}
                      type="button"
                      disabled={disabled}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (disabled) return;
                        setRightSlug(p.slug);
                        setRightText(fullProcessorName(p));
                        setRightFocused(false);
                      }}
                      className={`block w-full border-b border-slate-100 px-2 py-1.5 text-left last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50 opacity-55" : "hover:bg-blue-50"}`}
                    >
                      <span className="block truncate whitespace-nowrap text-[9px] font-semibold leading-tight text-slate-800">{fullProcessorName(p)}</span>
                      {disabled ? <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-amber-700">Already selected</span> : null}
                    </button>
                  );
                }) : <div className="px-3 py-2 text-xs font-semibold text-slate-500">No matching processor</div>}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {left && right ? (
        <div className="mt-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 text-xs text-slate-600">
          <p>
            Ready: <span className="font-bold text-slate-800">{fullProcessorName(left)}</span> vs{" "}
            <span className="font-bold text-slate-800">{fullProcessorName(right)}</span>
          </p>
        </div>
      ) : null}

      {duplicateSelection ? <p className="mt-2 text-xs font-semibold text-red-600">Both selections are the same. Pick two different processors.</p> : null}

      <div className="mt-3 flex justify-center sm:mt-4 sm:justify-start">
        <button
          type="button"
          onClick={openCompare}
          disabled={!canCompare}
          className="block h-8 w-[72%] max-w-[236px] rounded-xl bg-blue-700 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-11 sm:w-auto sm:max-w-none sm:px-5 sm:text-sm"
        >
          Compare Now
        </button>
      </div>
    </div>
  );
}
