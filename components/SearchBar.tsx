"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Suggestion = {
  name: string;
  slug: string;
  brand: string;
  deviceType?: string;
  href?: string;
};

type SearchBarProps = {
  suggestions?: Suggestion[];
  placeholder?: string;
  actionPath?: string;
  className?: string;
  initialQuery?: string;
  suggestionMode?: "product" | "search";
  compact?: boolean;
  iconButton?: boolean;
  hideLeadingIcon?: boolean;
  directNavigate?: boolean;
};

export default function SearchBar({
  suggestions = [],
  placeholder = "Search mobiles, brands, chipsets",
  actionPath = "/mobile",
  className = "max-w-xl",
  initialQuery = "",
  suggestionMode = "product",
  compact = false,
  iconButton = false,
  hideLeadingIcon = false,
  directNavigate = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [focus, setFocus] = useState(false);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return suggestions.slice(0, 6);
    return suggestions
      .filter((item) => `${item.name} ${item.brand}`.toLowerCase().includes(value))
      .slice(0, 6);
  }, [query, suggestions]);

  const queryTrimmed = query.trim();

  const resolveHref = (item: Suggestion) => {
    if (item.href) return item.href;
    if (item.deviceType === "tablet") return `/tablets/${item.slug}`;
    return `/mobile/${item.slug}`;
  };

  const getBestMatch = () => {
    const q = queryTrimmed.toLowerCase();
    const normalized = q.replace(/\s+/g, "-");
    const exact =
      suggestions.find((item) => item.name.toLowerCase() === q) ??
      suggestions.find((item) => item.slug.toLowerCase() === q) ??
      suggestions.find((item) => item.slug.toLowerCase() === normalized);
    return exact ?? filtered[0];
  };

  return (
    <div className={`relative w-full ${className}`}>
      <form
        action={actionPath}
        onSubmit={(event) => {
          if (!queryTrimmed) return;
          if (directNavigate) {
            event.preventDefault();
            const match = getBestMatch();
            if (match) {
              router.push(resolveHref(match));
              setFocus(false);
              return;
            }
          }
          if (suggestionMode === "search") return;
          event.preventDefault();
          router.push(`${actionPath}?q=${encodeURIComponent(queryTrimmed)}`);
        }}
        className={`flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)] transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 ${compact ? "py-1" : "py-2.5"}`}
      >
        {!hideLeadingIcon ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : null}
        <input
          type="search"
          name="q"
          value={query}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-slate-900 caret-slate-900 outline-none placeholder:text-slate-400 ${compact ? "text-xs sm:text-sm" : "text-[0.95rem]"}`}
        />
        <button
          type="submit"
          aria-label="Search"
          className={
            iconButton
              ? "inline-flex h-7 w-7 items-center justify-center rounded-lg p-0 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              : `rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 ${compact ? "px-3 py-1 text-xs" : ""}`
          }
        >
          {iconButton ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            "Search"
          )}
        </button>
      </form>

      {focus && filtered.length > 0 ? (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_32px_-18px_rgba(15,23,42,0.45)]">
          {filtered.map((item) => (
            <button
              key={item.slug}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setQuery(item.name);
                setFocus(false);
                const href =
                  suggestionMode === "search"
                    ? `${actionPath}?q=${encodeURIComponent(item.name)}`
                    : resolveHref(item);
                router.push(href);
              }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-100"
            >
              <span className="font-semibold text-slate-900">{item.name}</span>
              <span className="ml-1 text-xs text-slate-500">{item.brand}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
