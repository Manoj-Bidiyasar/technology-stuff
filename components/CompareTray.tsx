"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addToCompareSelection,
  clearCompareSelection,
  getCompareSelection,
  getCompareSelectionEventName,
  removeFromCompareSelection,
  setCompareSelection,
  type CompareSelectionItem,
} from "@/lib/utils/compareSelection";

function buildCompareHref(items: CompareSelectionItem[], compareBasePath: string): string {
  if (items.length < 2) return "";
  return `${compareBasePath}/${items.map((item) => item.slug).join("-vs-")}`;
}

type CompareTrayProps = {
  deviceType?: "smartphone" | "tablet";
  compareBasePath?: string;
};

export default function CompareTray({ deviceType = "smartphone", compareBasePath = "/compare" }: CompareTrayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<CompareSelectionItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ slug: string; name: string; brand: string; image?: string; price?: number }>>([]);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const eventName = useMemo(() => getCompareSelectionEventName(deviceType), [deviceType]);

  useEffect(() => {
    function sync() {
      setItems(getCompareSelection(deviceType));
    }
    sync();
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, [deviceType, eventName]);

  useEffect(() => {
    let mounted = true;
    async function hydrateFromUrl() {
      const phones = searchParams.get("phones") || "";
      const slugs = phones
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (slugs.length === 0) {
        setUrlHydrated(true);
        return;
      }
      try {
        const res = await fetch(`/api/products?slugs=${encodeURIComponent(slugs.join(","))}&deviceType=${deviceType}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          items?: Array<{ slug: string; name: string; brand: string; image?: string; price?: number }>;
        };
        if (!mounted) return;
        const mapped = (data.items || []).map((item) => ({
          slug: item.slug,
          name: item.name,
          image: item.image,
          price: item.price,
        }));
        if (mapped.length > 0) setCompareSelection(mapped, deviceType);
      } finally {
        if (mounted) setUrlHydrated(true);
      }
    }
    hydrateFromUrl();
    return () => {
      mounted = false;
    };
  }, [deviceType, searchParams]);

  useEffect(() => {
    if (!urlHydrated) return;
    const current = searchParams.get("phones") || "";
    const nextPhones = items.map((item) => item.slug).join(",");
    if (current === nextPhones) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextPhones) params.set("phones", nextPhones);
    else params.delete("phones");
    const nextUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [items, pathname, router, searchParams, urlHydrated]);

  useEffect(() => {
    let mounted = true;
    const q = query.trim();
    if (!q || items.length >= 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&deviceType=${deviceType}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          items?: Array<{ slug: string; name: string; brand: string; image?: string; price?: number }>;
        };
        if (!mounted) return;
        const taken = new Set(items.map((item) => item.slug));
        setResults((data.items || []).filter((item) => !taken.has(item.slug)).slice(0, 8));
      } finally {
        if (mounted) setLoading(false);
      }
    }, 180);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [deviceType, query, items]);

  if (items.length === 0) return null;

  const canCompare = items.length >= 2;
  const compareHref = buildCompareHref(items, compareBasePath);
  const canAddMore = items.length < 3;
  const itemLabel = deviceType === "tablet" ? "tablet" : "phone";
  const itemLabelPlural = deviceType === "tablet" ? "tablets" : "phones";

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4 sm:px-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-300 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Compare Queue ({items.length}/3)
          </p>
          <button
            type="button"
            onClick={() => clearCompareSelection(deviceType)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>

        <div className="mt-2 space-y-2">
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((slotIndex) => {
              const item = items[slotIndex];
              if (item) {
                return (
                  <div key={item.slug} className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <Image
                      src={item.image || "https://placehold.co/80x80?text=P"}
                      alt={item.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-md border border-slate-200 bg-white object-contain"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-bold text-slate-900">{item.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCompareSelection(item.slug, deviceType)}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-600 hover:text-slate-800"
                      aria-label={`Remove ${item.name}`}
                    >
                      x
                    </button>
                  </div>
                );
              }

              if (canAddMore && slotIndex === items.length) {
                return (
                  <div key={`add-slot-${slotIndex}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Add ${itemLabel} ${slotIndex + 1}`}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none ring-blue-500/30 placeholder:text-slate-400 focus:ring"
                    />
                    {query.trim() ? (
                      <div className="absolute bottom-[calc(100%+6px)] left-2 right-2 z-50 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {loading ? <p className="px-3 py-2 text-xs text-slate-500">Searching...</p> : null}
                        {!loading && results.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">{itemLabel === "tablet" ? "Tablet not available" : "Mobile not available"}</p> : null}
                        {!loading
                          ? results.map((candidate) => (
                              <button
                                key={`tray-add-${candidate.slug}`}
                                type="button"
                                onClick={() => {
                                  addToCompareSelection({
                                    slug: candidate.slug,
                                    name: candidate.name,
                                    image: candidate.image,
                                    price: candidate.price,
                                  }, deviceType);
                                  setQuery("");
                                  setResults([]);
                                }}
                                className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                              >
                                <Image
                                  src={candidate.image || "https://placehold.co/40x40?text=P"}
                                  alt={candidate.name}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 rounded border border-slate-200 object-contain"
                                  unoptimized
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold text-slate-900">{candidate.name}</span>
                                  <span className="block truncate text-[11px] text-slate-500">{candidate.brand}</span>
                                </span>
                              </button>
                            ))
                          : null}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return null;
            })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={!canCompare}
                onClick={() => {
                  if (!canCompare || !compareHref) return;
                  router.push(compareHref);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Compare Now
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <p>{canAddMore ? `Select up to 3 ${itemLabelPlural}` : `Max 3 ${itemLabelPlural} reached`}</p>
            {!canCompare ? <p>{`Select at least 2 ${itemLabelPlural}`}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
