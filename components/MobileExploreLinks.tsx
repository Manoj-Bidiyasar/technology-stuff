"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types/content";
import { formatPrice } from "@/lib/utils/format";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { getScoreBadgeTone } from "@/lib/utils/scoreBadge";
import { formatLaunchDate, getLaunchState, parseLaunchDate } from "@/lib/utils/launchStatus";
import { slugify } from "@/utils/slugify";

type Props = {
  brands: string[];
  products: Product[];
  deviceType?: "smartphone" | "tablet";
};

function NormalizedPhoneImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto h-28 w-20 overflow-hidden rounded-md bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full scale-[1.03] object-cover object-center transition group-hover:scale-[1.06]"
      />
    </div>
  );
}

function toRecommended(products: Product[]) {
  return [...products]
    .sort((a, b) => calculateOverallScore100(b) - calculateOverallScore100(a))
    .slice(0, 16);
}

function toUpcoming(products: Product[]) {
  return [...products]
    .filter((product) => getLaunchState(product.general, product.tags) === "upcoming")
    .sort((a, b) => {
      const left = parseLaunchDate(a.general?.launchDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      const right = parseLaunchDate(b.general?.launchDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .slice(0, 8);
}

function preferredBrands(allBrands: string[]) {
  const order = ["Samsung", "Motorola", "Vivo", "Tecno", "Realme", "iQOO", "OnePlus", "Xiaomi", "Oppo"];
  const normalized = new Map(allBrands.map((name) => [name.toLowerCase(), name]));
  const preferred = order
    .map((name) => normalized.get(name.toLowerCase()))
    .filter((name): name is string => Boolean(name));

  const used = new Set(preferred.map((name) => name.toLowerCase()));
  const remaining = allBrands
    .filter((name) => !used.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return [...preferred, ...remaining].slice(0, 15);
}

function brandWordmark(brand: string): string {
  const map: Record<string, string> = {
    samsung: "SAMSUNG",
    motorola: "motorola",
    vivo: "vivo",
    tecno: "TECNO",
    realme: "realme",
    iqoo: "iQOO",
    oneplus: "ONEPLUS",
    xiaomi: "Xiaomi",
    oppo: "oppo",
  };
  return map[brand.toLowerCase()] || brand;
}

function brandColorClass(brand: string): string {
  const key = brand.toLowerCase();
  if (key === "samsung") return "text-blue-700";
  if (key === "motorola") return "text-slate-800";
  if (key === "vivo") return "text-blue-600";
  if (key === "tecno") return "text-cyan-700";
  if (key === "realme") return "text-yellow-500";
  if (key === "iqoo") return "text-slate-900";
  if (key === "oneplus") return "text-red-600";
  if (key === "xiaomi") return "text-orange-500";
  if (key === "oppo") return "text-emerald-600";
  return "text-slate-800";
}

function toComparePairs(products: Product[]) {
  const ranked = [...products]
    .sort((a, b) => calculateOverallScore100(b) - calculateOverallScore100(a))
    .slice(0, 30);
  const bySlug = new Map(ranked.map((item) => [slugify(String(item.slug || item.name || "")), item]));
  const dedupe = new Set<string>();
  const pairs: Array<{ left: Product; right: Product }> = [];

  for (const left of ranked) {
    const suggestions = (left.compareSuggestions || [])
      .map((value) => slugify(String(value)))
      .filter(Boolean);
    for (const suggestionSlug of suggestions) {
      const right = bySlug.get(suggestionSlug);
      if (!right) continue;
      if (right.slug === left.slug) continue;
      const key = [left.slug, right.slug].sort().join("|");
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      pairs.push({ left, right });
      if (pairs.length >= 10) return pairs;
    }
  }

  for (let i = 0; i + 1 < ranked.length; i += 2) {
    const left = ranked[i];
    const right = ranked[i + 1];
    const key = [left.slug, right.slug].sort().join("|");
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    pairs.push({ left, right });
    if (pairs.length >= 10) break;
  }

  return pairs;
}

type ShortcutItem = {
  id: string;
  label: string;
  href: string;
  matches: (product: Product) => boolean;
};

function withShortcutCounts(items: ShortcutItem[], products: Product[]) {
  return items
    .map((item) => ({
      ...item,
      count: products.reduce((acc, product) => acc + (item.matches(product) ? 1 : 0), 0),
    }))
    .filter((item) => item.count > 0);
}

function formatScoreValue(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

export default function MobileExploreLinks({ brands, products, deviceType = "smartphone" }: Props) {
  const RUPEE = "\u20B9";
  const SHORTCUTS_INITIAL = 6;
  const isTablet = deviceType === "tablet";
  const listPath = isTablet ? "/tablets" : "/mobile";
  const specPath = (slug: string) => `${listPath}/${slug}`;
  const comparePath = (left: string, right: string) =>
    isTablet ? `/tablets/compare/${left}-vs-${right}` : `/compare/${left}-vs-${right}`;
  const itemLabelPlural = isTablet ? "tablets" : "phones";

  const recommended = useMemo(() => toRecommended(products), [products]);
  const upcoming = useMemo(() => toUpcoming(products), [products]);
  const featuredBrands = preferredBrands(brands);
  const comparePairs = useMemo(() => toComparePairs(products), [products]);

  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllBudget, setShowAllBudget] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [recPage, setRecPage] = useState(0);

  const budgetUseCaseLinks = useMemo(
    () =>
      withShortcutCounts(
        [
          { id: "best-under-10k", label: `Best ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}10,000`, href: `${listPath}?maxPrice=10000&sort=overall`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 10000 },
          { id: "best-camera-under-10k", label: `Best Camera ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}10,000`, href: `${listPath}?maxPrice=10000&sort=camera`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 10000 && calculateOverallScore100(p) > 0 },
          { id: "best-display-under-10k", label: `Best Display ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}10,000`, href: `${listPath}?maxPrice=10000&sort=display`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 10000 && calculateOverallScore100(p) > 0 },
          { id: "best-battery-under-10k", label: `Best Battery ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}10,000`, href: `${listPath}?maxPrice=10000&sort=battery`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 10000 && calculateOverallScore100(p) > 0 },
          { id: "gaming-under-20k", label: `Best Performance ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}20,000`, href: `${listPath}?maxPrice=20000&sort=performance`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 20000 && calculateOverallScore100(p) > 0 },
          { id: "battery-under-15k", label: `Best Battery ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}15,000`, href: `${listPath}?maxPrice=15000&sort=battery`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 15000 && calculateOverallScore100(p) > 0 },
          { id: "camera-under-20k", label: `Best Camera ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}20,000`, href: `${listPath}?maxPrice=20000&sort=camera`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 20000 && calculateOverallScore100(p) > 0 },
          { id: "5g-under-20k", label: `Best 5G ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}20,000`, href: `${listPath}?maxPrice=20000&networkType=5G`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 20000 && (p.network?.supported || []).map((v) => String(v).toUpperCase()).includes("5G") },
          { id: "amoled-under-25k", label: `Best AMOLED ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}25,000`, href: `${listPath}?maxPrice=25000&displayPanel=AMOLED,LTPO%20AMOLED`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 25000 && /amoled/i.test(`${p.display?.type || ""} ${p.specs?.display || ""}`) },
          { id: "performance-under-30k", label: `Best Performance ${isTablet ? "Tablets" : "Phones"} Under ${RUPEE}30,000`, href: `${listPath}?maxPrice=30000&sort=performance`, matches: (p) => Number(p.price || 0) > 0 && Number(p.price || 0) <= 30000 && calculateOverallScore100(p) > 0 },
          { id: "flagship-over-50k", label: `Best Flagship ${isTablet ? "Tablets" : "Phones"} Above ${RUPEE}50,000`, href: `${listPath}?minPrice=50000&sort=overall`, matches: (p) => Number(p.price || 0) >= 50000 },
        ],
        products
      ),
    [products, RUPEE, isTablet, listPath]
  );

  const trendingDiscoveryLinks = useMemo(
    () =>
      withShortcutCounts(
        [
          { id: "top-performance", label: `Top Performance ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?sort=performance`, matches: () => true },
          { id: "top-camera", label: `Top Camera ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?sort=camera`, matches: (p) => Boolean((p.rearCamera?.cameras || []).length || p.specs?.rearCamera || p.specs?.camera) },
          { id: "top-display", label: `Top Display ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?sort=display`, matches: (p) => Boolean(p.display?.type || p.specs?.display) },
          { id: "top-battery", label: `Top Battery ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?sort=battery`, matches: (p) => Boolean(p.battery?.capacity || p.specs?.battery) },
          { id: "wireless", label: `${isTablet ? "Tablets" : "Phones"} with Wireless Charging`, href: `${listPath}?wirelessCharging=1`, matches: (p) => p.battery?.wireless?.supported === true },
          { id: "ip68", label: `IP68 Rated ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?waterResistance=IP68`, matches: (p) => (p.design?.ipRating || []).some((v) => /ip68/i.test(String(v))) },
          { id: "foldable", label: `Foldable ${isTablet ? "Tablets" : "Smartphones"}`, href: `${listPath}?q=foldable`, matches: (p) => String(p.design?.type || "").toLowerCase().includes("fold") || /fold/i.test(p.name) },
          { id: "esim", label: `eSIM Supported ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?eSim=1`, matches: (p) => /esim/i.test(String(p.network?.sim?.config || "")) },
          { id: "200mp", label: `200MP Camera ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?rearMaxRes=200`, matches: (p) => /200\s*mp/i.test(`${p.specs?.rearCamera || ""} ${p.specs?.camera || ""}`) || (p.rearCamera?.cameras || []).some((c) => /200\s*mp/i.test(String(c.resolution || ""))) },
          { id: "512gb", label: `512GB Storage ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?internalMemory=512`, matches: (p) => /512\s*gb/i.test(`${p.specs?.storage || ""} ${(p.memoryStorage?.internalStorage || []).join(" ")}`) },
          { id: "12gb-ram", label: `12GB RAM ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?ram=12`, matches: (p) => /12\s*gb/i.test(`${p.specs?.ram || ""} ${(p.memoryStorage?.ram || []).join(" ")}`) },
          { id: "1tb", label: `1TB Storage ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?q=1TB`, matches: (p) => /1\s*tb/i.test(`${p.specs?.storage || ""} ${(p.memoryStorage?.internalStorage || []).join(" ")}`) },
          { id: "4k-video", label: `4K Recording ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?rearVideo=4k30,4k60`, matches: (p) => /4k/i.test(`${(p.rearCamera?.video?.recording || []).join(" ")} ${(p.camera?.video?.rear || []).join(" ")}`) },
          { id: "android15", label: `Android 15 ${isTablet ? "Tablets" : "Phones"}`, href: `${listPath}?osName=android&osVersion=15`, matches: (p) => /android/i.test(String(p.software?.os?.name || p.specs?.os || "")) && /15/.test(String(p.software?.os?.version || p.specs?.os || "")) },
        ],
        products
      ),
    [products, isTablet, listPath]
  );

  const recPageSize = 4;
  const recTotalPages = Math.max(1, Math.ceil(recommended.length / recPageSize));
  const safePage = Math.min(recPage, recTotalPages - 1);
  const recVisible = recommended.slice(safePage * recPageSize, safePage * recPageSize + recPageSize);
  const budgetVisible = showAllBudget ? budgetUseCaseLinks : budgetUseCaseLinks.slice(0, SHORTCUTS_INITIAL);
  const trendingVisible = showAllTrending ? trendingDiscoveryLinks : trendingDiscoveryLinks.slice(0, SHORTCUTS_INITIAL);

  function prevRecPage() {
    setRecPage((p) => (p <= 0 ? recTotalPages - 1 : p - 1));
  }

  function nextRecPage() {
    setRecPage((p) => (p >= recTotalPages - 1 ? 0 : p + 1));
  }

  if (recommended.length === 0 && featuredBrands.length === 0) return null;

  return (
    <section className="mt-6 space-y-8">
      {recommended.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900 sm:text-xl">
              Recently Viewed & Recommended
            </h2>
          </div>
          <div className="relative mt-4">
            {recTotalPages > 1 ? (
              <>
                {safePage > 0 ? (
                  <button
                    type="button"
                    onClick={prevRecPage}
                    className="absolute -left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
                    aria-label={`Previous ${itemLabelPlural}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                      <path d="m14.5 6.5-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
                {safePage < recTotalPages - 1 ? (
                  <button
                    type="button"
                    onClick={nextRecPage}
                    className="absolute -right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-600/95 text-white shadow-lg transition hover:bg-slate-700"
                    aria-label={`Next ${itemLabelPlural}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                      <path d="m9.5 6.5 5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
              </>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recVisible.map((product) => {
                const score = calculateOverallScore100(product);
                const tone = getScoreBadgeTone(score);
                return (
                  <Link
                    key={`rec-${product.slug}`}
                    href={specPath(product.slug)}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative bg-white p-3">
                      <span className={`absolute left-2 top-2 z-10 inline-flex h-[46px] w-[46px] rounded-full p-[1.5px] shadow-[0_6px_14px_rgba(15,23,42,0.22)] ${tone.outerClass}`}>
                        <span className="inline-flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                          <span className="text-[13px] font-black leading-none text-slate-900">{formatScoreValue(score)}</span>
                          <span className={`mt-0.5 inline-flex flex-col items-center text-[6px] font-semibold uppercase tracking-wide leading-none ${tone.subTextClass}`}>
                            <span>Specs</span>
                            <span>Score</span>
                          </span>
                        </span>
                      </span>
                      <div className="pt-6 pl-5">
                        <NormalizedPhoneImage src={product.images?.[0] || "/placeholder-mobile.svg"} alt={product.name} />
                      </div>
                    </div>
                    <div className="space-y-2 px-3 py-3">
                      <p className="line-clamp-2 min-h-[2.6rem] text-[0.95rem] font-semibold text-slate-900">{product.name}</p>
                      <p className="text-base font-semibold text-slate-800">
                        {product.price > 0 ? formatPrice(product.price) : "N/A"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900 sm:text-xl">
          {isTablet ? "Upcoming Tablets" : "Upcoming Mobiles"}
        </h2>
        {upcoming.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(0, 4).map((product) => {
              const score = calculateOverallScore100(product);
              const tone = getScoreBadgeTone(score);
              const launchDate = formatLaunchDate(product.general?.launchDate);
              return (
                <Link
                  key={`upcoming-${product.slug}`}
                  href={specPath(product.slug)}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative bg-white p-3">
                    <span className={`absolute left-2 top-2 z-10 inline-flex h-[46px] w-[46px] rounded-full p-[1.5px] shadow-[0_6px_14px_rgba(15,23,42,0.22)] ${tone.outerClass}`}>
                      <span className="inline-flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-[13px] font-black leading-none text-slate-900">{formatScoreValue(score)}</span>
                        <span className={`mt-0.5 inline-flex flex-col items-center text-[6px] font-semibold uppercase tracking-wide leading-none ${tone.subTextClass}`}>
                          <span>Specs</span>
                          <span>Score</span>
                        </span>
                      </span>
                    </span>
                    <div className="pt-6 pl-5">
                      <NormalizedPhoneImage src={product.images?.[0] || "/placeholder-mobile.svg"} alt={product.name} />
                    </div>
                  </div>
                  <div className="space-y-2 px-3 py-3">
                    <p className="line-clamp-2 min-h-[2.6rem] text-[0.95rem] font-semibold text-slate-900">{product.name}</p>
                    <p className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      Upcoming
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {launchDate ? `Launch: ${launchDate}` : "Launch: TBA"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {isTablet ? "No upcoming tablets added yet." : "No upcoming mobiles added yet."}
          </p>
        )}
      </div>

      {featuredBrands.length > 0 ? (
        <div>
          <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900 sm:text-xl">{isTablet ? "Featured Tablet Brands" : "Featured Mobile Brands"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {(showAllBrands ? featuredBrands : featuredBrands.slice(0, 7)).map((brand) => (
              <Link key={`featured-${brand}`} href={`${listPath}?brand=${encodeURIComponent(brand)}`} className="group">
                <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-center transition group-hover:border-blue-300 group-hover:bg-blue-50/40">
                  <div className={`text-base font-bold tracking-wide ${brandColorClass(brand)}`}>
                    {brandWordmark(brand)}
                  </div>
                </div>
                <p className="mt-1.5 h-6 text-center text-base font-semibold text-slate-900">{brand}</p>
              </Link>
            ))}
          </div>
          {featuredBrands.length > 7 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAllBrands((prev) => !prev)}
                className="block w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-base font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                {showAllBrands ? "Show Less Brands" : "View More Brands"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {comparePairs.length > 0 ? (
        <div>
          <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900 sm:text-xl">{isTablet ? "Compare Tablet Finder" : "Compare Phone Finder"}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {comparePairs.map((pair, idx) => (
              <Link
                key={`compare-pair-${idx}-${pair.left.slug}-${pair.right.slug}`}
                href={comparePath(pair.left.slug, pair.right.slug)}
                className="group grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-center rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pair.left.images?.[0] || "/placeholder-mobile.svg"}
                    alt={pair.left.name}
                    className="h-11 w-8 rounded object-cover"
                  />
                  <p className="line-clamp-2 text-xs font-medium text-slate-900">{pair.left.name}</p>
                </div>
                <span className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-extrabold text-white">
                  VS
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pair.right.images?.[0] || "/placeholder-mobile.svg"}
                    alt={pair.right.name}
                    className="h-11 w-8 rounded object-cover"
                  />
                  <p className="line-clamp-2 text-xs font-medium text-slate-900 group-hover:text-blue-700">{pair.right.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {budgetUseCaseLinks.length > 0 || trendingDiscoveryLinks.length > 0 ? (
        <div>
          <h2 className="border-l-2 border-orange-500 pl-3 text-lg font-bold text-slate-900 sm:text-xl">Popular Finder Shortcuts</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">By Budget & Use Case</div>
              <div>
                {budgetVisible.map((item) => (
                  <Link
                    key={`shortcut-budget-${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 last:border-b-0"
                  >
                    <span className="pr-3">{item.label}</span>
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{item.count}</span>
                      <span className="text-base leading-none">{">"}</span>
                    </span>
                  </Link>
                ))}
                {budgetUseCaseLinks.length > SHORTCUTS_INITIAL ? (
                  <button
                    type="button"
                    onClick={() => setShowAllBudget((prev) => !prev)}
                    className="w-full border-t border-slate-100 px-4 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50/50"
                  >
                    {showAllBudget ? "Show less" : `View more (${budgetUseCaseLinks.length - SHORTCUTS_INITIAL})`}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">Trending Discovery Links</div>
              <div>
                {trendingVisible.map((item) => (
                  <Link
                    key={`shortcut-trend-${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 last:border-b-0"
                  >
                    <span className="pr-3">{item.label}</span>
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{item.count}</span>
                      <span className="text-base leading-none">{">"}</span>
                    </span>
                  </Link>
                ))}
                {trendingDiscoveryLinks.length > SHORTCUTS_INITIAL ? (
                  <button
                    type="button"
                    onClick={() => setShowAllTrending((prev) => !prev)}
                    className="w-full border-t border-slate-100 px-4 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50/50"
                  >
                    {showAllTrending ? "Show less" : `View more (${trendingDiscoveryLinks.length - SHORTCUTS_INITIAL})`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
