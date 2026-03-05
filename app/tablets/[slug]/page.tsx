import type { Metadata } from "next";
import Link from "next/link";
import ImageGalleryModalButton from "@/components/ImageGalleryModalButton";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductCard from "@/components/ProductCard";
import RelatedPhonesCarousel from "@/components/RelatedPhonesCarousel";
import ScoreCard from "@/components/ScoreCard";
import SpecsTable from "@/components/SpecsTable";
import ComparisonSuggestionImage from "@/components/ComparisonSuggestionImage";
import UserFeedbackSection from "@/components/UserFeedbackSection";
import PopularLinksSection from "@/components/PopularLinksSection";
import {
  getPublishedProductBySlug,
  listComparisonSuggestions,
  listRelatedProducts,
} from "@/lib/firestore/products";
import { productSchema } from "@/lib/seo/schema";
import { buildAutoProsCons } from "@/lib/utils/prosCons";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { getScoreBadgeTone } from "@/lib/utils/scoreBadge";
import { getLaunchState, parseLaunchDate } from "@/lib/utils/launchStatus";
import type { ReactNode } from "react";
import type { ProductNetwork, TimestampLike } from "@/lib/types/content";

type MobileDetailProps = {
  params: Promise<{ slug: string }>;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatScoreValue(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function toDate(value?: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const parsed = value.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    if (typeof value.seconds === "number") {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function formatBadgeDate(value: Date): string {
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function parseStorageToGb(value: string): number {
  const text = cleanValue(value).toUpperCase();
  const match = text.match(/(\d+(\.\d+)?)\s*(TB|GB)/);
  if (!match) return 0;
  const number = Number(match[1]);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return match[3] === "TB" ? number * 1024 : number;
}

function formatCapacity(valueGb: number): string {
  if (!valueGb || valueGb <= 0) return "";
  if (valueGb >= 1024) {
    const tb = valueGb / 1024;
    return Number.isInteger(tb) ? `${tb}TB` : `${tb.toFixed(1)}TB`;
  }
  return `${Math.round(valueGb)}GB`;
}

function maxRamAndStorage(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const ramCandidates = [
    ...(product?.memoryStorage?.ram || []),
    ...((product?.variants || []).map((v) => cleanValue(v.ram)).filter(Boolean)),
    cleanValue(product?.specs?.ram),
  ].filter(Boolean);

  const storageCandidates = [
    ...(product?.memoryStorage?.internalStorage || []),
    ...((product?.variants || []).map((v) => cleanValue(v.storage)).filter(Boolean)),
    cleanValue(product?.specs?.storage),
  ].filter(Boolean);

  const maxRamGb = Math.max(...ramCandidates.map(parseStorageToGb), 0);
  const maxStorageGb = Math.max(...storageCandidates.map(parseStorageToGb), 0);

  const ramText = formatCapacity(maxRamGb);
  const storageText = formatCapacity(maxStorageGb);
  if (ramText && storageText) return `${ramText} RAM + ${storageText} Storage`;
  return ramText || storageText || "";
}

function resolutionLabel(value?: string): string {
  const raw = cleanValue(value);
  if (!raw) return "";
  const match = raw.replace(/\s+/g, "").match(/(\d{3,4})[x*](\d{3,4})/i);
  if (!match) return raw;
  const w = Number(match[1]);
  const h = Number(match[2]);
  const maxEdge = Math.max(w, h);
  if (maxEdge >= 3000) return "QHD+";
  if (maxEdge >= 2300) return "FHD+";
  if (maxEdge >= 1700) return "HD+";
  return "HD";
}

function normalizeDisplayType(type?: string): string {
  const raw = cleanValue(type);
  if (!raw) return "";
  return raw
    .replace(/^\d+(\.\d+)?\s*[- ]?inch\s*/i, "")
    .replace(/\((cover|secondary|primary)\s*display\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function panelSummary(panel?: { size?: string | number; resolution?: string; type?: string }): string {
  const size = cleanValue(panel?.size);
  const resLabel = resolutionLabel(panel?.resolution);
  const type = normalizeDisplayType(panel?.type);
  const parts = [
    size ? `${size}"` : "",
    resLabel,
    type,
  ].filter(Boolean);
  return parts.join(" ");
}

function displaySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const display = product?.display;
  const primary = panelSummary(display?.primary || display);
  const secondary = panelSummary(display?.secondary);
  if (secondary) return `${primary} | ${secondary}`;
  return primary || "";
}

function rearCameraSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const fromStructured = Array.isArray(product?.rearCamera?.cameras) && product.rearCamera!.cameras!.length > 0
    ? product.rearCamera!.cameras!
        .map((item) => cleanValue(item.resolution))
        .filter(Boolean)
        .join(" + ")
    : "";
  const text = fromStructured || cleanValue(product?.specs?.rearCamera) || cleanValue(product?.specs?.camera) || "";
  if (!text) return "";
  return `${text} Rear Camera`;
}

function frontCameraSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const fromStructured = Array.isArray(product?.frontCamera?.cameras) && product.frontCamera!.cameras!.length > 0
    ? product.frontCamera!.cameras!
        .map((item) => cleanValue(item.resolution))
        .filter(Boolean)
        .join(" + ")
    : "";
  const text = fromStructured || cleanValue(product?.specs?.frontCamera) || "";
  if (!text) return "";
  return `${text} Front Camera`;
}

function batterySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const capacity = cleanValue(product?.battery?.capacity) || cleanValue(product?.specs?.battery);
  const batteryText = capacity ? `${capacity} Battery` : "";
  if (!batteryText) return "";
  const inBox = product?.battery?.chargerInBox?.available;
  const power = cleanValue(product?.battery?.chargerInBox?.power);
  if (inBox && power) {
    return `${batteryText}, ${power} Charger in box`;
  }
  return batteryText;
}

function maxNetworkType(supported?: string[]): string {
  const normalized = (supported || []).map((item) => cleanValue(item).toUpperCase());
  if (normalized.includes("5G")) return "5G";
  if (normalized.includes("4G")) return "4G";
  if (normalized.includes("3G")) return "3G";
  return "";
}

function wifiGeneration(network?: ProductNetwork): string {
  const version = cleanValue(network?.wifi?.version).toLowerCase();
  if (version.includes("7")) return "7";
  if (version.includes("6e")) return "6E";
  if (version.includes("6")) return "6";
  if (version.includes("5")) return "5";
  if (version.includes("4")) return "4";

  const standards = (network?.wifi?.standards || []).map((item) => cleanValue(item).toLowerCase());
  if (standards.includes("be")) return "7";
  if (standards.includes("ax")) return "6";
  if (standards.includes("ac")) return "5";
  if (standards.includes("n")) return "4";
  return "";
}

function bluetoothLabel(network?: ProductNetwork): string {
  const value = cleanValue(network?.bluetooth);
  return value || "";
}

function connectivitySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const network = maxNetworkType(product?.network?.supported);
  const wifi = wifiGeneration(product?.network);
  const bluetooth = bluetoothLabel(product?.network);
  if (!network && !wifi && !bluetooth) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 ring-1 ring-blue-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-700" aria-hidden="true">
          <rect x="3" y="14.5" width="3" height="6.5" rx="0.8" fill="currentColor" />
          <rect x="8" y="12" width="3" height="9" rx="0.8" fill="currentColor" />
          <rect x="13" y="9" width="3" height="12" rx="0.8" fill="currentColor" />
          <rect x="18" y="6" width="3" height="15" rx="0.8" fill="currentColor" />
        </svg>
        {network}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 ring-1 ring-blue-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-700" aria-hidden="true">
          <path d="M3.8 9.2a13.5 13.5 0 0 1 16.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M6.9 12.4a8.7 8.7 0 0 1 10.2 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M10.1 15.6a3.8 3.8 0 0 1 3.8 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="18.9" r="1.2" fill="currentColor" />
        </svg>
        {wifi}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 ring-1 ring-blue-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-700" aria-hidden="true">
          <path d="M12 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m7 7 10 10-5 5V2l5 5L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {bluetooth}
      </span>
    </div>
  );
}

function hasSummaryValue(value: ReactNode): boolean {
  if (typeof value === "string") return Boolean(cleanValue(value));
  return value !== null && value !== undefined && value !== false;
}

function SpecIcon({ kind }: { kind: "display" | "processor" | "memory" | "rear" | "front" | "connectivity" | "battery" }) {
  const iconClass = "h-4 w-4 text-blue-700";
  if (kind === "display") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.5 5.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="18.5" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "processor") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "battery") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="2" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="9" width="13.5" height="6" rx="1" fill="currentColor" opacity="0.8" />
        <path d="M21 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "memory") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="4" y="5" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="12" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="7.5" r="0.9" fill="currentColor" />
        <circle cx="17.5" cy="14.5" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "connectivity") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <path d="M3 9.5C5.5 7.5 8.6 6.5 12 6.5s6.5 1 9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6.5 13c1.6-1.3 3.5-2 5.5-2s3.9.7 5.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="18.5" r="1.3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

export async function generateMetadata({ params }: MobileDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug, "tablet");
  if (!product) {
    return { title: "Product not found" };
  }

  return {
    title: product.name,
    description: product.shortDescription || `${product.name} full specs, rating, pros and cons, and comparison suggestions.`,
    openGraph: {
      title: product.name,
      description: product.shortDescription || `${product.name} review page`,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function MobileDetailPage({ params }: MobileDetailProps) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug, "tablet");

  if (!product) {
    return (
      <main className="mobile-container py-8">
        <section className="panel p-5">
          <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
          <Link href="/tablets" className="mt-3 inline-flex text-sm font-semibold text-blue-700">Back to tablets</Link>
        </section>
      </main>
    );
  }

  const [related, allComparisonSuggestions] = await Promise.all([
    listRelatedProducts(product, 16),
    listComparisonSuggestions(product, 120),
  ]);
  const suggestions = allComparisonSuggestions.slice(0, 6);
  const extraComparisonSuggestions = allComparisonSuggestions.slice(6);
  const mobileCompareTarget = suggestions[0];
  const mobileBuyLink = product.affiliateLinks.amazon || product.affiliateLinks.flipkart || "";
  const overall100 = calculateOverallScore100(product);
  const overallBadgeTone = getScoreBadgeTone(overall100);
  const autoProsCons = buildAutoProsCons(product);
  const visiblePros = (product.pros || []).length > 0 ? (product.pros || []) : autoProsCons.pros;
  const visibleCons = (product.cons || []).length > 0 ? (product.cons || []) : autoProsCons.cons;
  const launchDate = parseLaunchDate(product.general?.launchDate) || toDate(product.general?.launchDate);
  const createdDate = toDate(product.createdAt);
  const effectiveDate = launchDate || createdDate;
  const isNew = (product.tags || []).some((tag) => cleanValue(tag).toLowerCase() === "new");
  const launchState = getLaunchState(product.general, product.tags);
  const isUpcoming = launchState === "upcoming";
  const quickSpecs: Array<{ key: string; value: ReactNode; kind: "display" | "processor" | "memory" | "rear" | "front" | "connectivity" | "battery" }> = [
    { key: "display", value: displaySummary(product), kind: "display" as const },
    { key: "processor", value: cleanValue(product.specs.processor), kind: "processor" as const },
    { key: "ram-storage", value: maxRamAndStorage(product), kind: "memory" as const },
    {
      key: "rear",
      value: rearCameraSummary(product),
      kind: "rear" as const,
    },
    {
      key: "front",
      value: frontCameraSummary(product),
      kind: "front" as const,
    },
    { key: "battery", value: batterySummary(product), kind: "battery" as const },
    {
      key: "connectivity",
      value: connectivitySummary(product),
      kind: "connectivity" as const,
    },
  ].filter((item) => hasSummaryValue(item.value));

  return (
    <main className="mobile-container py-6 pb-24 sm:py-8 sm:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }} />

      <section className="mb-3 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/" className="hover:text-blue-700">Home</Link>
          <span>/</span>
          <span className="text-slate-700">{product.name}</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/" className="hover:text-blue-700">Home</Link>
          <span>/</span>
          <Link href="/tablets" className="hover:text-blue-700">Tablets</Link>
          <span>/</span>
          <span className="text-slate-700">{product.name}</span>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <article className="panel relative p-4 sm:p-5">
            <span className={`absolute right-1 top-1 inline-flex h-[40px] w-[40px] rounded-full p-[1.5px] shadow-[0_6px_14px_rgba(15,23,42,0.22)] sm:right-2 sm:top-2 sm:h-[58px] sm:w-[58px] ${overallBadgeTone.outerClass}`}>
              <span className="inline-flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[9px] font-black leading-none text-slate-900 sm:text-[13px]">{formatScoreValue(overall100)}</span>
                <span className={`mt-0.5 inline-flex flex-col items-center text-[5px] font-semibold uppercase tracking-wide leading-none sm:text-[8px] ${overallBadgeTone.subTextClass}`}>
                  <span>Specs</span>
                  <span>Score</span>
                </span>
              </span>
            </span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.brand}</p>
                <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{product.name}</h1>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {isNew ? (
                <span className="inline-flex items-center rounded-md bg-lime-600 px-2.5 py-1 text-xs font-bold text-white">
                  New
                </span>
              ) : null}
              {isUpcoming ? (
                <span className="inline-flex items-center rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                  Upcoming
                </span>
              ) : effectiveDate ? (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
                    <rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span className="font-medium">Release Date:</span>
                  <span className="font-extrabold text-slate-900">{formatBadgeDate(effectiveDate)}</span>
                </span>
              ) : null}
              {product.trending ? (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m8 13 2.2-2.2 1.8 1.8L16 8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-bold text-slate-900">Trending</span>
                </span>
              ) : null}
              {!isNew && !isUpcoming && !effectiveDate && !product.trending ? (
                <span className="text-xs font-semibold text-slate-500">NA</span>
              ) : null}
            </div>
            {product.shortDescription ? <p className="mt-3 text-sm text-slate-600">{product.shortDescription}</p> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <ProductImageGallery images={product.images} name={product.name} />
              <div className="space-y-2 p-1">
                {quickSpecs.map((item) => (
                  <div key={item.key} className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5 last:border-b-0 last:pb-0">
                    {item.kind === "connectivity" ? null : <div className="flex items-center gap-1"><SpecIcon kind={item.kind} /></div>}
                    <div className="text-sm font-semibold text-slate-900 whitespace-pre-line">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {product.affiliateLinks.amazon ? (
                <a href={product.affiliateLinks.amazon} target="_blank" rel="noreferrer" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Buy on Amazon
                </a>
              ) : null}
              {product.affiliateLinks.flipkart ? (
                <a href={product.affiliateLinks.flipkart} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  Buy on Flipkart
                </a>
              ) : null}
            {suggestions[0] ? (
              <Link href={`/tablets/compare/${product.slug}-vs-${suggestions[0].slug}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Compare Now
              </Link>
            ) : null}
            <ImageGalleryModalButton images={product.images} name={product.name} />
            {!product.affiliateLinks.amazon && !product.affiliateLinks.flipkart ? (
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-700">Currently unavailable on Amazon and Flipkart.</p>
                <p className="mt-0.5 text-xs text-slate-500">Check comparison picks below for similar alternatives.</p>
              </div>
              ) : null}
            </div>
          </article>
        </div>

        <aside id="ratings" className="h-full w-full">
          <div className="h-full w-full">
            <ScoreCard product={product} />
          </div>
        </aside>
      </section>

      <section className="mt-4 panel px-3 py-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex w-max flex-nowrap gap-2 text-sm font-semibold">
            <a href="#specifications" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Specifications</a>
            <a href="#pros-cons" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Pros & Cons</a>
            <a href="#related" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Related Tablets</a>
            <a href="#comparison" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Comparison Picks</a>
          </div>
        </div>
      </section>

      <section id="specifications" className="mt-4">
        <SpecsTable
          specs={product.specs}
          ratings={product.ratings}
          memoryStorage={product.memoryStorage}
          variants={product.variants}
          battery={product.battery}
          display={product.display}
          displays={product.displays}
          performance={product.performance}
          camera={product.camera}
          frontCamera={product.frontCamera}
          rearCamera={product.rearCamera}
          security={product.security}
          sensors={product.sensors}
          network={product.network}
          software={product.software}
          design={product.design}
          general={product.general}
        />
      </section>

      <section id="pros-cons" className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="panel p-4">
          <h2 className="text-base font-bold text-emerald-700">Pros</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {visiblePros.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="panel p-4">
          <h2 className="text-base font-bold text-rose-700">Cons</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {visibleCons.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      <section id="related" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Similar Tablets You May Like</h2>
        </div>
        <RelatedPhonesCarousel pageSize={4}>
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} basePath="/tablets" />
          ))}
        </RelatedPhonesCarousel>
      </section>

      <section id="comparison" className="mt-6 panel p-4">
        <h2 className="text-xl font-extrabold text-slate-900">Comparison suggestions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {suggestions.map((item) => (
            <Link
              key={item.slug}
              href={`/tablets/compare/${product.slug}-vs-${item.slug}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                <div className="min-w-0 text-center">
                  <ComparisonSuggestionImage
                    src={product.images?.[0] || "https://placehold.co/120x120?text=Tablet"}
                    alt={product.name}
                  />
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-900">{product.name}</p>
                </div>
                <span className="mt-5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-extrabold text-white">
                  VS
                </span>
                <div className="min-w-0 text-center">
                  <ComparisonSuggestionImage
                    src={item.images?.[0] || "https://placehold.co/120x120?text=Tablet"}
                    alt={item.name}
                  />
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-900">{item.name}</p>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-slate-600">See side-by-side winner summary</p>
            </Link>
          ))}
        </div>
        {extraComparisonSuggestions.length > 0 ? (
          <details className="mt-4">
            <summary className="mx-auto w-fit cursor-pointer list-none rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-blue-700">
              Show all comparisons
            </summary>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {extraComparisonSuggestions.map((item) => (
                  <Link
                    key={`all-compare-${item.slug}`}
                    href={`/tablets/compare/${product.slug}-vs-${item.slug}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-white hover:text-blue-700"
                  >
                    {product.name} vs {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </section>

      <UserFeedbackSection slug={product.slug} name={product.name} />
      <PopularLinksSection brand={product.brand} deviceType="tablet" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {mobileCompareTarget ? (
            <Link
              href={`/tablets/compare/${product.slug}-vs-${mobileCompareTarget.slug}`}
              className="rounded-lg bg-blue-600 px-2 py-2 text-center text-xs font-extrabold text-white"
            >
              Compare
            </Link>
          ) : (
            <a href="#comparison" className="rounded-lg bg-blue-600 px-2 py-2 text-center text-xs font-extrabold text-white">
              Compare
            </a>
          )}
          {mobileBuyLink ? (
            <a
              href={mobileBuyLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-orange-500 px-2 py-2 text-center text-xs font-extrabold text-white"
            >
              Buy
            </a>
          ) : (
            <a href="#comparison" className="rounded-lg bg-orange-500 px-2 py-2 text-center text-xs font-extrabold text-white">
              Buy
            </a>
          )}
          <a href="#specifications" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-xs font-extrabold text-slate-800">
            Specs
          </a>
        </div>
      </div>
    </main>
  );
}
