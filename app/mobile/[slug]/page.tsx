import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
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
  getProductAdminById,
  getPublishedProductBySlug,
  listComparisonSuggestions,
  listRelatedProducts,
} from "@/lib/firestore/products";
import { productSchema } from "@/lib/seo/schema";
import { getShowSmartphoneRamStorageConfiguration } from "@/lib/firestore/siteSettings";
import { buildAutoProsCons } from "@/lib/utils/prosCons";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { getScoreBadgeTone } from "@/lib/utils/scoreBadge";
import { getLaunchState, parseLaunchDate } from "@/lib/utils/launchStatus";
import { getAdminViewerFromSessionToken } from "@/lib/auth/admin";
import { hasCapability } from "@/lib/admin/permissions";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import type { ReactNode } from "react";
import { DEFAULT_PRODUCT_QUICK_SPECS, type ProductQuickSpecKey, type ProductDisplayPanel, type ProductNetwork, type TimestampLike } from "@/lib/types/content";

type MobileDetailProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
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
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function parseStorageToGb(value: string): number {
  const text = cleanValue(value).toUpperCase();
  const match = text.match(/(\d+(\.\d+)?)\s*(TB|GB)/);
  if (!match) {
    const bareAmount = Number(text);
    return Number.isFinite(bareAmount) && bareAmount > 0 ? bareAmount : 0;
  }
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
    ...((product?.general?.variants || []).map((v) => cleanValue(v.ram)).filter(Boolean)),
    ...((product?.variants || []).map((v) => cleanValue(v.ram)).filter(Boolean)),
    cleanValue(product?.specs?.ram),
  ].filter(Boolean);

  const storageCandidates = [
    ...(product?.memoryStorage?.internalStorage || []),
    ...((product?.general?.variants || []).map((v) => cleanValue(v.storage)).filter(Boolean)),
    ...((product?.variants || []).map((v) => cleanValue(v.storage)).filter(Boolean)),
    cleanValue(product?.specs?.storage),
  ].filter(Boolean);

  const maxRamGb = Math.max(...ramCandidates.map(parseStorageToGb), 0);
  const maxStorageGb = Math.max(...storageCandidates.map(parseStorageToGb), 0);

  const ramTypes = [
    cleanValue(product?.memoryStorage?.commonRamType),
    ...(product?.memoryStorage?.ramType || []).map(cleanValue),
    ...(product?.memoryStorage?.variantGroups || []).map((variant) => cleanValue(variant.ramType)),
    ...((product?.general?.variants || []).map((variant) => cleanValue(variant.ramType))),
  ].filter(Boolean);
  const storageTypes = [
    cleanValue(product?.memoryStorage?.commonStorageType),
    ...(product?.memoryStorage?.storageType || []).map(cleanValue),
    ...(product?.memoryStorage?.variantGroups || []).map((variant) => cleanValue(variant.storageType)),
    ...((product?.general?.variants || []).map((variant) => cleanValue(variant.storageType))),
  ].filter(Boolean);
  const highestType = (types: string[]) => [...new Set(types)].sort((left, right) => {
    const rank = (type: string) => {
      const match = type.match(/(\d+(?:\.\d+)?)([A-Z])?/i);
      if (!match) return 0;
      return Number(match[1]) + (match[2]?.toUpperCase() === "T" ? 0.02 : match[2]?.toUpperCase() === "X" ? 0.01 : 0);
    };
    return rank(left) - rank(right);
  }).pop() || "";
  const ramText = formatCapacity(maxRamGb);
  const storageText = formatCapacity(maxStorageGb);
  const ramSummary = ramText ? `${ramText}${highestType(ramTypes) ? ` ${highestType(ramTypes)}` : ""} RAM` : "";
  const storageSummary = storageText ? `${storageText}${highestType(storageTypes) ? ` ${highestType(storageTypes)}` : ""} Storage` : "";
  return [ramSummary, storageSummary].filter(Boolean).join(" · ");
}

function rearCameraSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const fromStructured = Array.isArray(product?.rearCamera?.cameras) && product.rearCamera!.cameras!.length > 0
    ? product.rearCamera!.cameras!
        .map((item) => formatCameraMp(cleanValue(item.resolution) || cleanValue(item.imageResolution)))
        .filter(Boolean)
        .join(" + ")
    : "";
  const text = fromStructured || formatCameraMp(cleanValue(product?.specs?.rearCamera) || cleanValue(product?.specs?.camera));
  if (!text) return "";
  return `${text} Rear Camera`;
}

function frontCameraSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const fromStructured = Array.isArray(product?.frontCamera?.cameras) && product.frontCamera!.cameras!.length > 0
    ? product.frontCamera!.cameras!
        .map((item) => formatCameraMp(cleanValue(item.resolution) || cleanValue(item.imageResolution)))
        .filter(Boolean)
        .join(" + ")
    : "";
  const text = fromStructured || formatCameraMp(cleanValue(product?.frontCamera?.maxCameraResolution) || cleanValue(product?.specs?.frontCamera));
  if (!text) return "";
  return `${text} Front Camera`;
}

function formatCameraMp(value: string): string {
  return value && /^\d+(\.\d+)?$/.test(value) ? `${value}MP` : value;
}

function batterySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>) {
  const capacity = cleanValue(product?.battery?.capacityTypical) || cleanValue(product?.battery?.capacity) || cleanValue(product?.specs?.batteryMah) || cleanValue(product?.specs?.battery);
  const power = cleanValue(product?.battery?.chargerInBox?.power) || cleanValue(product?.battery?.wired?.maxPower) || cleanValue(product?.specs?.charging);
  const capacityLabel = capacity ? `${/^\d+(\.\d+)?$/.test(capacity) ? `${capacity} mAh` : capacity} Battery` : "";
  const powerLabel = power ? `${/^\d+(\.\d+)?$/.test(power) ? `${power}W` : power} Charger` : "";
  return [capacityLabel, powerLabel].filter(Boolean).join(" · ");
}

function formatDisplayPanel(panel?: ProductDisplayPanel): string {
  if (!panel) return "";
  const sizeValue = cleanValue(panel.sizeInches ?? panel.size);
  const size = sizeValue ? `${sizeValue.replace(/\s*(inches|inch|in|\")$/i, "")}\"` : "";
  const resolution = cleanValue(panel.resolutionLabel || panel.resolution || (panel.resolutionWidth && panel.resolutionHeight ? `${panel.resolutionWidth} × ${panel.resolutionHeight}` : ""));
  const type = cleanValue(panel.type);
  const curved = panel.curved ? "Curved" : "";
  return [size, resolution, curved, type, "Display"].filter(Boolean).join(" ");
}

function displaySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  const customText = cleanValue(product?.display?.quickSpecText);
  if (customText) return customText;
  return formatDisplayPanel(product?.display?.primary || product?.display || product?.displays?.[0]) || cleanValue(product?.specs?.display);
}

function secondaryDisplaySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  return formatDisplayPanel(product?.display?.secondary || product?.displays?.[1]) || cleanValue(product?.specs?.secondaryDisplay);
}

function refreshRateSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  const rate = cleanValue(product?.display?.primary?.refreshRate ?? product?.display?.refreshRate ?? product?.displays?.[0]?.refreshRate ?? product?.specs?.refreshRateHz);
  return rate ? `${rate}${/hz/i.test(rate) ? "" : "Hz"} Refresh Rate` : "";
}

function securitySummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  const fingerprint = product?.security?.fingerprint;
  if (fingerprint?.available) {
    const location = cleanValue(fingerprint.locations?.[0]);
    const type = cleanValue(fingerprint.type?.[0]);
    const normalizedLocation = /in[\s-]?display/i.test(location)
      ? "In-display"
      : /side/i.test(location)
        ? "Side-mounted"
        : /top/i.test(location)
          ? "Top-mounted"
          : location;
    return [normalizedLocation, "Fingerprint"].filter(Boolean).join(" ");
  }

  const face = product?.security?.faceUnlock;
  if (face?.available) {
    const type = cleanValue(face.type);
    return type || "Face Unlock";
  }
  return "";
}

function softwareSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  const osName = cleanValue(product?.software?.os?.name);
  const osVersion = cleanValue(product?.software?.os?.version);
  const normalizedOs = osName.toLowerCase() === "android" ? "Android" : osName.toLowerCase() === "ios" ? "iOS" : osName;
  const os = [normalizedOs, osVersion].filter(Boolean).join(" ");
  const ui = cleanValue(product?.software?.ui);
  return [os, ui].filter(Boolean).join(" + ");
}

function softwareUpdatesSummary(product: Awaited<ReturnType<typeof getPublishedProductBySlug>>): string {
  const updates = product?.software?.updates;
  const parts = [
    updates?.os ? `${updates.os} years OS updates` : "",
    updates?.security ? `${updates.security} years security updates` : "",
  ].filter(Boolean);
  return parts.join(" · ");
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
        Wi-Fi {wifi}
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

function SpecIcon({ kind }: { kind: "processor" | "memory" | "rear" | "front" | "connectivity" | "battery" | "display" | "fingerprint" | "software" }) {
  const iconClass = "h-4 w-4 text-blue-700";
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
  if (kind === "display") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "fingerprint") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <path d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5M12 6.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2-.6 5.9-1.8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 9.5a1.5 1.5 0 0 0-1.5 1.5c0 4-.5 6.9-1.5 9.5M12 3.5a7.5 7.5 0 0 1 7.5 7.5c0 2.7-.2 5-.8 7M15 11c0 4.2-.3 7.1-1.1 9.5M18 11c0 2.2-.1 4-.4 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "software") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 12h5M8 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
  const product = await getPublishedProductBySlug(slug);
  if (!product) {
    return { title: "Product not found" };
  }

  const title = product.seo?.metaTitle || product.name;
  const description = product.seo?.metaDescription || product.shortDescription || `${product.name} full specs, rating, pros and cons, and comparison suggestions.`;
  const newsKeywords = product.seo?.newsKeywords?.filter(Boolean) || [];
  return {
    title,
    description,
    keywords: product.seo?.keywords?.filter(Boolean),
    alternates: product.seo?.canonicalUrl ? { canonical: product.seo.canonicalUrl } : undefined,
    other: newsKeywords.length ? { "news_keywords": newsKeywords.join(", ") } : undefined,
    openGraph: {
      title,
      description,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function MobileDetailPage({ params, searchParams }: MobileDetailProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const previewFlag = String(query?.preview || "").trim() === "1";
  const previewId = String(query?.id || slug || "").trim();

  let product = await getPublishedProductBySlug(slug);

  if (previewFlag && previewId) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
    const viewer = await getAdminViewerFromSessionToken(token);
    const canPreview = Boolean(viewer && hasCapability(viewer.role, "products"));
    if (canPreview) {
      const draft = await getProductAdminById(previewId);
      if (draft && draft.name && draft.deviceType === "smartphone") {
        product = draft;
      }
    }
  }

  if (!product) {
    return (
      <main className="mobile-container py-8">
        <section className="panel p-5">
          <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
          <Link href="/mobile" className="mt-3 inline-flex text-sm font-semibold text-blue-700">Back to mobiles</Link>
        </section>
      </main>
    );
  }

  const [related, allComparisonSuggestions, showRamStorageConfiguration] = await Promise.all([
    listRelatedProducts(product, 16),
    listComparisonSuggestions(product, 120),
    getShowSmartphoneRamStorageConfiguration().catch(() => false),
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
  const generatedQuickSpecValues: Record<ProductQuickSpecKey, { value: ReactNode; kind: "processor" | "memory" | "rear" | "front" | "battery" | "display" | "fingerprint" | "software" }> = {
    processor: { value: cleanValue(product.specs.processor), kind: "processor" },
    "chipset-score": { value: product.specs.chipsetScore ? `${product.specs.chipsetScore} Chipset Score` : "", kind: "processor" },
    display: { value: displaySummary(product), kind: "display" },
    "primary-display": { value: formatDisplayPanel(product.display?.primary || product.display || product.displays?.[0]) || cleanValue(product.specs.primaryDisplay), kind: "display" },
    "secondary-display": { value: secondaryDisplaySummary(product), kind: "display" },
    "refresh-rate": { value: refreshRateSummary(product), kind: "display" },
    "ram-storage": { value: maxRamAndStorage(product), kind: "memory" },
    rear: { value: rearCameraSummary(product), kind: "rear" },
    front: { value: frontCameraSummary(product), kind: "front" },
    battery: { value: batterySummary(product), kind: "battery" },
    security: { value: securitySummary(product), kind: "fingerprint" },
    software: { value: softwareSummary(product), kind: "software" },
    updates: { value: softwareUpdatesSummary(product), kind: "memory" },
  };
  const selectedQuickSpecs = product.quickSpecsVersion && product.quickSpecsVersion >= 2
    ? product.quickSpecs || DEFAULT_PRODUCT_QUICK_SPECS
    : Array.from(new Set([
      ...(product.quickSpecs || DEFAULT_PRODUCT_QUICK_SPECS),
      "chipset-score",
      "primary-display",
      "secondary-display",
      "refresh-rate",
    ] as ProductQuickSpecKey[]));
  const quickSpecs = selectedQuickSpecs
    .map((key) => ({
    key,
    ...generatedQuickSpecValues[key],
    value: product.quickSpecOverrides?.[key]?.trim()
      ? product.quickSpecOverrides[key]
      : generatedQuickSpecValues[key].value,
    })).filter((item) => item.key === "ram-storage" || hasSummaryValue(item.value));
  const connectivitySpec = {
    key: "connectivity",
    value: connectivitySummary(product),
    kind: "connectivity" as const,
  };
  /*
   * Connectivity stays visible as its own badge row; its supported generation
   * is computed automatically and it is intentionally not an Admin option.
   */
  const publicQuickSpecs = [
    ...quickSpecs,
    ...(hasSummaryValue(connectivitySpec.value) ? [connectivitySpec] : []),
  ];

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
          <Link href="/mobile" className="hover:text-blue-700">Mobiles</Link>
          <span>/</span>
          <span className="text-slate-700">{product.name}</span>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
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
              <ProductImageGallery images={product.images} allColorImages={product.allColorImages} imageVariants={product.imageVariants} imageItems={product.imageItems} colors={product.design?.colors} memoryVariants={product.general?.variants} name={product.name} background={product.imageBackground} hideControls />
              <div className="space-y-6 p-1">
                <div className="space-y-2">
                  {publicQuickSpecs.map((item) => (
                    <div key={item.key} className="border-b border-slate-200 pb-2.5 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        {item.kind === "connectivity" ? null : <div className="flex items-center gap-1"><SpecIcon kind={item.kind} /></div>}
                        <div className="text-sm font-semibold text-slate-900 whitespace-pre-line">{item.value || (item.key === "ram-storage" ? "RAM / Storage" : null)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <ProductImageGallery images={product.images} allColorImages={product.allColorImages} imageVariants={product.imageVariants} imageItems={product.imageItems} colors={product.design?.colors} memoryVariants={product.general?.variants} name={product.name} background={product.imageBackground} controlsOnly showVariantSelector={showRamStorageConfiguration} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {product.affiliateLinks.amazon ? (
                <a href={product.affiliateLinks.amazon} target="_blank" rel="noreferrer" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Buy Now
                </a>
              ) : null}
              {product.affiliateLinks.flipkart ? (
                <a href={product.affiliateLinks.flipkart} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  Buy on Flipkart
                </a>
              ) : null}
            {suggestions[0] ? (
              <Link href={`/compare/${product.slug}-vs-${suggestions[0].slug}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Compare Now
              </Link>
            ) : null}
            <ImageGalleryModalButton images={product.images} allColorImages={product.allColorImages} imageVariants={product.imageVariants} imageItems={product.imageItems} colors={product.design?.colors} memoryVariants={product.general?.variants} name={product.name} background={product.imageBackground} />
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
            <a href="#related" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Related Phones</a>
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
          <h2 className="text-xl font-extrabold text-slate-900">Similar Phones You May Like</h2>
        </div>
        <RelatedPhonesCarousel pageSize={4}>
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </RelatedPhonesCarousel>
      </section>

      <section id="comparison" className="mt-6 panel p-4">
        <h2 className="text-xl font-extrabold text-slate-900">Comparison suggestions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {suggestions.map((item) => (
            <Link
              key={item.slug}
              href={`/compare/${product.slug}-vs-${item.slug}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                <div className="min-w-0 text-center">
                  <ComparisonSuggestionImage
                    src={product.images?.[0] || "https://placehold.co/120x120?text=Phone"}
                    alt={product.name}
                  />
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-900">{product.name}</p>
                </div>
                <span className="mt-5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-extrabold text-white">
                  VS
                </span>
                <div className="min-w-0 text-center">
                  <ComparisonSuggestionImage
                    src={item.images?.[0] || "https://placehold.co/120x120?text=Phone"}
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
                    href={`/compare/${product.slug}-vs-${item.slug}`}
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
      <PopularLinksSection brand={product.brand} />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {mobileCompareTarget ? (
            <Link
              href={`/compare/${product.slug}-vs-${mobileCompareTarget.slug}`}
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
