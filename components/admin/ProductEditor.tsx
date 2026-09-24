"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import type {
  FrontCameraUnit,
  MemoryVariant,
  Product,
  ProductImageItem,
  ProductDisplayPanel,
  RearCameraUnit,
} from "@/lib/types/content";
import type { ProcessorDetail } from "@/lib/processors/details";
import { buildAutoProsCons } from "@/lib/utils/prosCons";
import { slugify } from "@/utils/slugify";

type DeviceType = "smartphone" | "tablet";
type ProductStatusFilter = "all" | Product["status"];
type PathKey = string | number;
type MobileDetailsView = "single_entry" | "content_json_csv" | "bulk_json_csv";

type ProductEditorProps = {
  deviceType: DeviceType;
  pageTitle: string;
  pageDescription: string;
};

const DEFAULT_FLIPKART_AFFILIATE_ID = process.env.NEXT_PUBLIC_FLIPKART_AFFILIATE_ID || "";
const CLOUDINARY_DELIVERY_URL_PREFIX = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dnk5tzvpv"}/image/upload/f_auto/q_auto/`;
const PRODUCT_STATUS_FILTERS: Array<{ key: ProductStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "published", label: "Published" },
  { key: "scheduled", label: "Scheduled" },
  { key: "recently_deleted", label: "Recently Deleted" },
];
const COMMON_SMARTPHONE_BRANDS = [
  "Apple", "Asus", "Google", "Honor", "Huawei", "Infinix", "iQOO", "Motorola", "Nothing", "OnePlus",
  "Oppo", "POCO", "Realme", "Redmi", "Samsung", "Sony", "Tecno", "Vivo", "Xiaomi",
];
const RAM_TYPE_OPTIONS = ["LPDDR6X", "LPDDR6", "LPDDR5X", "LPDDR5T", "LPDDR5", "LPDDR4X", "LPDDR4", "LPDDR3"];
const STORAGE_TYPE_OPTIONS = ["NVMe", "UFS 4.1+MCQ", "UFS 4.1", "UFS 4.0+MCQ", "UFS 4.0", "UFS 3.1", "UFS 3.0", "UFS 2.2", "UFS 2.1", "eMMC 5.1"];
const RAM_CHANNEL_OPTIONS: Array<{ key: "single" | "dual" | "quad"; label: string; count: number }> = [
  { key: "single", label: "Single", count: 1 },
  { key: "dual", label: "Dual", count: 2 },
  { key: "quad", label: "Quad", count: 4 },
];
const RAM_BIT_WIDTH_OPTIONS = [8, 16, 32];
const FINGERPRINT_SETUP_OPTIONS: Array<{ value: "" | "none" | "rear" | "side-mounted" | "in-display"; label: string }> = [
  { value: "", label: "Unknown" },
  { value: "none", label: "No Fingerprint" },
  { value: "rear", label: "Rear Mounted" },
  { value: "side-mounted", label: "Side Mounted" },
  { value: "in-display", label: "In-Display" },
];
const FINGERPRINT_TYPE_OPTIONS = ["Optical", "Ultrasonic", "Capacitive"] as const;
const FACE_UNLOCK_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "No", label: "No" },
  { value: "2D", label: "2D Face Unlock" },
  { value: "3D Structured Light", label: "3D Structured Light" },
  { value: "3D ToF", label: "3D ToF" },
] as const;
const SENSOR_BASE_OPTIONS = [
  { key: "accelerometer", label: "Accelerometer" },
  { key: "gyroscope", label: "Gyroscope" },
  { key: "proximity", label: "Proximity" },
  { key: "magnetometer", label: "Magnetometer" },
  { key: "ecompass", label: "E-Compass" },
  { key: "compass", label: "Compass" },
  { key: "ambientlight", label: "Ambient Light" },
  { key: "barometer", label: "Barometer" },
  { key: "hallsensor", label: "Hall Sensor" },
  { key: "stepsensor", label: "Step Sensor" },
] as const;
const SUPPORTED_NETWORK_OPTIONS = ["5G", "4G", "3G", "2G"] as const;
const SIM_SINGLE_OPTIONS = ["Nano SIM", "Micro SIM", "Mini SIM", "Hybrid SIM", "eSIM"] as const;
const SIM_SLOT_OPTIONS = ["Nano SIM", "Micro SIM", "Mini SIM", "Hybrid SIM", "eSIM"] as const;
const GPS_OPTIONS = ["GPS", "A-GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "NavIC", "SBAS"] as const;
const BLUETOOTH_VERSION_OPTIONS = ["6.0", "5.4", "5.3", "5.2", "5.1", "5.0", "4.2"] as const;
const DEFAULT_BLUETOOTH_FEATURE_OPTIONS = ["LE", "LE+Dual Audio", "A2DP", "aptX", "aptX HD", "aptX Adaptive", "LDAC", "LHDC", "AAC", "SBC", "Dual Audio"] as const;
const WIFI_VERSION_OPTIONS = ["7", "6E", "6", "5", "4"] as const;
const DEFAULT_WIFI_FEATURE_OPTIONS = ["Wi-Fi Direct", "Hotspot", "Dual-Band Wi-Fi", "Tri-Band Wi-Fi", "Wi-Fi Calling", "MIMO"] as const;
const USB_VERSION_OPTIONS = ["4.0", "3.2", "3.1", "3.0", "2.0"] as const;
const DEFAULT_USB_TYPE_OPTIONS = ["USB Type-C", "Micro-USB", "Lightning"] as const;
const DEFAULT_USB_FEATURE_OPTIONS = ["OTG", "Charging", "Fast Charging Input", "Data Transfer", "Audio Output", "Video Output", "DisplayPort"] as const;
const DATE_MONTH_OPTIONS = [
  { value: "01", label: "January" }, { value: "02", label: "February" }, { value: "03", label: "March" },
  { value: "04", label: "April" }, { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" }, { value: "09", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
] as const;
const PACKAGE_BASE_TOGGLES = [
  { key: "handset", label: "Handset" },
  { key: "protective_film", label: "Protective Film" },
  { key: "protective_case", label: "Protective Case" },
  { key: "stylus_pen", label: "Stylus / S Pen" },
  { key: "sim_ejector_tool", label: "SIM Ejector Tool" },
  { key: "documentation", label: "Documentation" },
  { key: "other", label: "Other" },
] as const;
const PACKAGE_CABLE_OPTIONS = ["Type-C to Type-C Cable", "Type-A to Type-C Cable", "Micro USB Cable", "Type-C to Lightning Cable"] as const;
const PACKAGE_CONVERTER_OPTIONS = ["Type-C to 3.5mm Audio Jack Converter", "Lightning to 3.5mm Audio Jack Converter"] as const;
const MOBILE_DETAIL_SECTION_LINKS = [
  { id: "mobile-general", label: "General" },
  { id: "mobile-memory-storage", label: "Storage & Variants" },
  { id: "mobile-design-build", label: "Design & Build" },
  { id: "mobile-display", label: "Display" },
  { id: "mobile-performance", label: "Performance" },
  { id: "mobile-benchmark-scores", label: "Benchmark Scores" },
  { id: "mobile-rear-camera", label: "Rear Camera" },
  { id: "mobile-front-camera", label: "Front Camera" },
  { id: "mobile-battery-charging", label: "Battery & Charging" },
  { id: "mobile-multimedia", label: "Multimedia" },
  { id: "mobile-security-sensors", label: "Security & Sensors" },
  { id: "mobile-network-connectivity", label: "Network & Connectivity" },
  { id: "mobile-software", label: "Software" },
  { id: "mobile-images", label: "Images" },
] as const;
const FORM_FACTOR_OPTIONS = [
  { key: "bar", label: "Normal" },
  { key: "fold", label: "Flip / Fold" },
  { key: "tri_fold", label: "Tri-Fold" },
] as const;
const HARDWARE_SENSOR_OPTIONS = SENSOR_BASE_OPTIONS.filter((sensor) => sensor.key !== "ecompass");
const DISPLAY_FORM_FACTOR_OPTIONS = [
  { key: "bar", label: "Normal" },
  { key: "bar_cover", label: "Normal + Cover" },
  { key: "flip_fold", label: "Flip Fold" },
  { key: "book_fold", label: "Dual Fold" },
  { key: "tri_fold", label: "Tri Fold" },
] as const;
const DISPLAY_PANEL_LAYOUTS: Record<string, Array<{ key: PathKey[]; title: string }>> = {
  bar: [
    { key: [] as PathKey[], title: "Main Display" },
  ],
  bar_cover: [
    { key: [] as PathKey[], title: "Main Display" },
    { key: ["display", "secondary"] as PathKey[], title: "Cover Display" },
  ],
  flip_fold: [
    { key: ["display", "primary"] as PathKey[], title: "Main Display (Inner Display)" },
    { key: ["display", "secondary"] as PathKey[], title: "Cover Display" },
  ],
  book_fold: [
    { key: ["display", "primary"] as PathKey[], title: "Main Display (Inner Display)" },
    { key: ["display", "secondary"] as PathKey[], title: "Cover Display" },
  ],
  tri_fold: [
    { key: [] as PathKey[], title: "Main Display (Inner)" },
    { key: ["display", "primary"] as PathKey[], title: "Extended Display (Inner)" },
    { key: ["display", "secondary"] as PathKey[], title: "Cover Display" },
  ],
};
const DISPLAY_RESOLUTION_LABELS = ["HD", "HD+", "FHD", "FHD+", "WFHD", "WFHD+", "QHD", "QHD+", "WQHD", "WQHD+", "2K", "4K"] as const;
const DISPLAY_HDR_OPTIONS = ["HDR10", "HDR10+", "Dolby Vision", "HLG"] as const;
const DISPLAY_COLOR_GAMUT_OPTIONS = ["DCI-P3", "100% NTSC", "sRGB", "Adobe RGB"] as const;
const DISPLAY_MODE_OPTIONS = ["Vivid", "Natural", "Gentle", "Pro"] as const;
const DISPLAY_DIMMING_OPTIONS = ["DC dimming", "PWM dimming"] as const;
const CAMERA_PURPOSE_OPTIONS = ["Main", "Wide-angle", "Ultra-wide", "Telephoto", "Periscope", "Macro", "Depth", "Monochrome", "ToF", "Other"] as const;
const CAMERA_NAME_OPTIONS = ["Primary Camera", "Secondary Camera", "Tertiary Camera", "Fourth Camera", "Fifth Camera"] as const;
const CAMERA_VIDEO_MODE_OPTIONS = ["All cameras", "Slow motion", "Time lapse", "Movie mode", "Stabilization", "Ultra-wide video", "Zoom video"] as const;
const VIDEO_RESOLUTION_OPTIONS = ["8K", "4K", "QHD", "FHD", "HD", "480p"] as const;

function normalizeDesignFormFactor(value: string): string {
  const key = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!key || key === "bar_dual_display" || key === "bar") return "bar";
  if (key.includes("flip")) return "flip_fold";
  if (key.includes("tri")) return "tri_fold";
  if (key.includes("book") || key.includes("dual") || key.includes("fold")) return "book_fold";
  return "bar";
}

function normalizeDisplayFormFactor(value: string): string {
  const key = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!key || key === "bar") return "bar";
  if (key.includes("cover") || key.includes("rear_display") || key.includes("back_display")) return "bar_cover";
  if (key.includes("flip")) return "flip_fold";
  if (key.includes("tri")) return "tri_fold";
  if (key.includes("book") || key.includes("dual") || key.includes("fold")) return "book_fold";
  return "bar";
}

function suggestResolutionLabel(width: unknown, height: unknown): string {
  const shorterSide = Math.min(Number(width) || 0, Number(height) || 0);
  if (shorterSide >= 2160) return "4K";
  if (shorterSide >= 1440) return "QHD+";
  if (shorterSide >= 1080) return "FHD+";
  if (shorterSide >= 720) return "HD+";
  if (shorterSide > 0) return "HD";
  return "";
}

function getHighestCameraResolution(cameras: Array<{ resolution?: string }>): string {
  let highest = 0;
  let label = "";
  cameras.forEach((camera) => {
    const resolution = cleanText(camera.resolution);
    const match = resolution.match(/(\d+(?:\.\d+)?)\s*mp/i);
    const megapixels = Number(match?.[1] || 0);
    if (megapixels > highest) {
      highest = megapixels;
      label = resolution;
    }
  });
  return label;
}

function getCameraRoleLabel(index: number): string {
  const labels = ["Primary", "Secondary", "Tertiary", "Fourth", "Fifth"];
  return labels[index] ? `${labels[index]} Camera` : `Camera ${index + 1}`;
}

function getPostureOptions(formFactor: string): string[] {
  const normalized = normalizeDesignFormFactor(formFactor);
  if (normalized === "tri_fold") return ["folded", "half_open", "open"];
  if (normalized === "flip_fold" || normalized === "book_fold") return ["folded", "open"];
  return ["normal"];
}

function createEmptyNormalDimensionVariant() {
  return { color: "", height: undefined, width: undefined, depth: undefined, weight: undefined };
}

function createEmptyPostureDimensionVariant(posture = "folded") {
  return { posture, color: "", height: undefined, width: undefined, depth: undefined, weight: undefined };
}

type ProcessorAdminLite = {
  id?: string;
  name?: string;
  maxCpuGhz?: number;
  detail?: ProcessorDetail;
};

function emptyProduct(deviceType: DeviceType): Product {
  return {
    deviceType,
    name: "",
    slug: "",
    brand: "",
    price: 0,
    priceLive: {
      amount: 0,
      source: "manual",
      updatedAt: "",
    },
    status: "draft",
    scheduledAt: "",
    shortDescription: "",
    images: [],
    imageItems: [],
    allColorImages: [],
    imageVariants: [],
    imageBackground: "#ffffff",
    specs: {},
    performance: {},
    camera: {},
    frontCamera: {},
    rearCamera: {},
    security: { irisScanner: false },
    sensors: [],
    network: { supported: ["5G", "4G", "3G", "2G"] },
    software: {},
    design: {},
    general: {},
    memoryStorage: {
      variantGroups: [{ model: "", ram: "", ramType: "", storage: "", storageType: "", virtualRam: "" }],
    },
    variants: [],
    battery: {},
    display: {},
    displays: [],
    ratings: {},
    affiliateLinks: {},
    compareSuggestions: [],
    pros: [],
    cons: [],
    tags: [],
    trending: false,
  };
}

function buildFlipkartAffiliateUrl(rawUrl: string, affiliateId?: string): string {
  const value = rawUrl.trim();
  if (!value) return "";
  const parsed = new URL(value);
  const affId = (affiliateId || "").trim();
  if (affId) parsed.searchParams.set("affid", affId);
  return parsed.toString();
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCpuConfig(value: string): string[] {
  return String(value || "")
    .split(/[|,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveCoreCountText(detail?: ProcessorDetail): string {
  if (!detail) return "";
  if (detail.coreCount && Number.isFinite(Number(detail.coreCount))) return String(detail.coreCount);
  const fromCores = String(detail.cores || "");
  const explicit = fromCores.match(/(\d+)\s*cores?/i);
  if (explicit?.[1]) return explicit[1];
  const plusParts = fromCores.match(/\d+/g);
  if (plusParts && plusParts.length > 1) {
    const total = plusParts.reduce((acc, item) => acc + Number(item || 0), 0);
    if (total > 0) return String(total);
  }
  return "";
}

function formatCsv(values?: string[]): string {
  return Array.isArray(values) ? values.join(", ") : "";
}
function createEmptyMemoryVariant(): MemoryVariant {
  return { model: "", ram: "", ramType: "", storage: "", storageType: "", virtualRam: "" };
}

function sanitizeDigits(value: string, maxLength: number): string {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function sanitizeDecimal(value: string, maxLength: number): string {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  return normalized.slice(0, maxLength);
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLookupKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseIsoDateParts(value: unknown): { year: string; month: string; day: string } {
  const raw = cleanText(value);
  if (!raw) return { year: "", month: "", day: "" };
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function buildIsoDateParts(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || !Number.isInteger(dayNum)) return "";
  const maxDay = new Date(yearNum, monthNum, 0).getDate();
  if (yearNum < 1900 || yearNum > 2100 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > maxDay) return "";
  return `${String(yearNum).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
}

function getMemoryVariantMode(memoryStorage?: Product["memoryStorage"]): "same_both" | "same_ram_type" | "same_storage_type" | "different" {
  const value = memoryStorage?.variantMode;
  return value === "same_ram_type" || value === "same_storage_type" || value === "different" ? value : "same_both";
}

function formatVariantLabel(input: { model?: unknown; ram?: unknown; storage?: unknown }): string {
  const model = cleanText(input.model);
  if (model) return model;
  const ram = cleanText(input.ram);
  const storage = cleanText(input.storage);
  const ramLabel = ram ? (/\D/.test(ram) ? ram : `${ram}GB`) : "";
  const storageLabel = storage ? (/\D/.test(storage) ? storage : `${storage}GB`) : "";
  if (ramLabel && storageLabel) return `${ramLabel} + ${storageLabel}`;
  return ramLabel || storageLabel || "";
}

function splitVariantValues(value: unknown): string[] {
  const raw = cleanText(value);
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function expandVariantGroups(
  groups: MemoryVariant[],
  mode: "same_both" | "same_ram_type" | "same_storage_type" | "different",
  commonRamType: string,
  commonStorageType: string
): MemoryVariant[] {
  const expanded: MemoryVariant[] = [];
  groups.forEach((group) => {
    const ramValues = splitVariantValues(group.ram);
    const storageValues = splitVariantValues(group.storage);
    const left = ramValues.length > 0 ? ramValues : (cleanText(group.ram) ? [cleanText(group.ram)] : [""]);
    const right = storageValues.length > 0 ? storageValues : (cleanText(group.storage) ? [cleanText(group.storage)] : [""]);
    left.forEach((ram) => {
      right.forEach((storage) => {
        const model = formatVariantLabel({ ram, storage });
        if (!model && !group.ramType && !group.storageType && !group.virtualRam) return;
        expanded.push({
          model,
          ram,
          ramType: mode === "same_both" || mode === "same_ram_type" ? commonRamType : cleanText(group.ramType),
          storage,
          storageType: mode === "same_both" || mode === "same_storage_type" ? commonStorageType : cleanText(group.storageType),
          virtualRam: cleanText(group.virtualRam),
        });
      });
    });
  });
  return expanded;
}

function uniqueTextValues(values: Array<unknown>): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  values.forEach((item) => {
    const text = cleanText(item);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });
  return output;
}

function extractMemoryAmount(value: unknown): number {
  const raw = cleanText(value);
  if (!raw) return 0;
  const numericMatch = raw.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!numericMatch) return 0;
  const amount = Number(numericMatch[0]);
  if (!Number.isFinite(amount)) return 0;
  return /tb/i.test(raw) ? amount * 1024 : amount;
}

function pickMaxLabeledValue(values: Array<unknown>): string {
  let bestLabel = "";
  let bestValue = 0;
  values.forEach((item) => {
    const label = cleanText(item);
    const amount = extractMemoryAmount(label);
    if (!label || amount <= 0) return;
    if (amount > bestValue) {
      bestValue = amount;
      bestLabel = label;
    }
  });
  return bestLabel;
}

function syncMemoryProductData(product: Product): Product {
  const variantMode = getMemoryVariantMode(product.memoryStorage);
  const commonRamType = cleanText(product.memoryStorage?.commonRamType);
  const commonStorageType = cleanText(product.memoryStorage?.commonStorageType);
  // Launch variants are the sole editable source. Memory & Storage is derived
  // from them so the two areas can never disagree.
  const variantGroupsRaw = (Array.isArray(product.general?.variants) ? product.general.variants : [])
    .map((variant) => ({
      model: cleanText(variant?.model),
      ram: cleanText(variant?.ram),
      ramType: variantMode === "same_both" || variantMode === "same_ram_type" ? "" : cleanText(variant?.ramType),
      storage: cleanText(variant?.storage),
      storageType: variantMode === "same_both" || variantMode === "same_storage_type" ? "" : cleanText(variant?.storageType),
      virtualRam: cleanText(variant?.virtualRam),
    }));
  const variantGroups = variantGroupsRaw.filter((variant) => Boolean(variant.model || variant.ram || variant.ramType || variant.storage || variant.storageType || variant.virtualRam));
  const variants = expandVariantGroups(variantGroups, variantMode, commonRamType, commonStorageType);
  // Keep an untouched, empty editor row intact.
  if (variants.length === 0) return product;
  const ramOptions = uniqueTextValues(variants.map((variant) => variant.ram));
  const storageOptions = uniqueTextValues(variants.map((variant) => variant.storage));
  const ramTypeOptions = uniqueTextValues(variants.map((variant) => variant.ramType));
  const storageTypeOptions = uniqueTextValues(variants.map((variant) => variant.storageType));
  const virtualRamOptions = uniqueTextValues(variants.map((variant) => variant.virtualRam));
  const derivedVirtualRamMax = pickMaxLabeledValue(variants.map((variant) => variant.virtualRam));
  const currentVirtualRamMax = cleanText(product.memoryStorage?.virtualRamMax);
  const currentMatchesVariantValue = virtualRamOptions.some((item) => cleanText(item) === currentVirtualRamMax);
  const nextVirtualRamMax = !currentVirtualRamMax || currentMatchesVariantValue
    ? (derivedVirtualRamMax || currentVirtualRamMax || "")
    : currentVirtualRamMax;
  return {
    ...product,
    specs: {
      ...product.specs,
      ram: pickMaxLabeledValue(ramOptions) || product.specs?.ram || "",
      ramGb: extractMemoryAmount(ramOptions.length > 0 ? pickMaxLabeledValue(ramOptions) : product.specs?.ramGb) || product.specs?.ramGb,
      storage: pickMaxLabeledValue(storageOptions) || product.specs?.storage || "",
    },
    memoryStorage: {
      ...product.memoryStorage,
      variantMode,
      commonRamType: commonRamType || null,
      commonStorageType: commonStorageType || null,
      ram: ramOptions,
      ramType: ramTypeOptions,
      internalStorage: storageOptions,
      storageType: storageTypeOptions,
      virtualRam: virtualRamOptions,
      // Derive by default, but retain an OEM-published manual maximum.
      virtualRamMax: nextVirtualRamMax,
      variantGroups: variantGroupsRaw.length > 0 ? variantGroupsRaw : [createEmptyMemoryVariant()],
      expandableStorage: {
        supported: product.memoryStorage?.expandableStorage?.supported,
        max: product.memoryStorage?.expandableStorage?.max ?? "",
        slotType: product.memoryStorage?.expandableStorage?.slotType || "",
        types: Array.isArray(product.memoryStorage?.expandableStorage?.types) ? product.memoryStorage?.expandableStorage?.types : [],
      },
    },
    variants,
  };
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitAndCleanList(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeBandToken(value: string): string {
  const token = String(value || "").trim().toLowerCase();
  if (!token) return "";
  return token.replace(/\s+/g, "");
}

function normalizeBandCsv(value: string): string {
  const tokens = splitAndCleanList(value).map(normalizeBandToken).filter(Boolean);
  return tokens.join(", ");
}

function normalizePhoneColors(value: string): string[] {
  const seen = new Set<string>();
  return value.split(",").map((color) => color.trim().replace(/\s+/g, " ")).filter((color) => {
    const key = color.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortBandTokens(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => normalizeBandToken(value || "")).filter(Boolean))).sort((left, right) => {
    const leftNumber = Number(left.match(/\d+/)?.[0] || 0);
    const rightNumber = Number(right.match(/\d+/)?.[0] || 0);
    return leftNumber - rightNumber || left.localeCompare(right);
  });
}

function allBandValues(bands?: { fdd?: string[]; tdd?: string[]; all?: string[] }): string {
  return sortBandTokens([...(bands?.fdd || []), ...(bands?.tdd || []), ...(bands?.all || [])]).join(", ");
}

function normalizeSensorBaseKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(virtual|software|electronic)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isVirtualSensorLabel(value: string): boolean {
  const lower = String(value || "").toLowerCase();
  return lower.includes("virtual") || lower.includes("software") || lower.includes("electronic") || /\be-/.test(lower);
}

function parseLeadingNumber(value: string): number | undefined {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBooleanSelect(value: string): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function formatBooleanSelect(value?: boolean): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function getSdCardMode(memoryStorage?: Product["memoryStorage"]): "" | "none" | "hybrid" | "dedicated" {
  const slotType = cleanText(memoryStorage?.expandableStorage?.slotType).toLowerCase();
  if (slotType === "hybrid" || slotType === "dedicated" || slotType === "none") return slotType;
  if (memoryStorage?.expandableStorage?.supported === false) return "none";
  return "";
}

function formatKeyValueLines(record?: Record<string, string>): string {
  if (!record) return "";
  return Object.entries(record)
    .filter(([key]) => key.trim())
    .map(([key, value]) => String(value || "").trim() ? `${key}: ${value}` : key)
    .join("\n");
}

function parseKeyValueLines(value: string): Record<string, string> {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawKey, ...rest] = line.split(":");
      return [rawKey?.trim() || "", rest.length > 0 ? rest.join(":").trim() : ""] as const;
    })
    .filter(([key]) => key);

  // A charging milestone (for example, "40%") should be listed only once.
  // Keep the first value entered so an accidental duplicate does not replace it.
  return Object.fromEntries(entries.filter(([key], index) => entries.findIndex(([candidate]) => candidate === key) === index));
}

function cloneNode<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  if (value && typeof value === "object") {
    return { ...(value as Record<string, unknown>) } as T;
  }
  return value;
}

function getAtPath(source: unknown, path: PathKey[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setAtPath<T>(source: T, path: PathKey[], value: unknown): T {
  const root = cloneNode(source);
  let cursor = root as Record<string, unknown>;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const nextKey = path[index + 1];
    const existing = cursor[key as keyof typeof cursor];
    const fallback = typeof nextKey === "number" ? [] : {};
    const next = cloneNode((existing ?? fallback) as unknown);
    cursor[key as keyof typeof cursor] = next;
    cursor = next as Record<string, unknown>;
  }

  cursor[path[path.length - 1] as keyof typeof cursor] = value as never;
  return root;
}

function Section({
  title,
  description,
  titleRight,
  children,
}: {
  title: string;
  description?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 cursor-pointer select-none" onDoubleClick={() => setIsCollapsed((current) => !current)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {titleRight}
            <button type="button" onClick={(event) => { event.stopPropagation(); setIsCollapsed((current) => !current); }} onDoubleClick={(event) => event.stopPropagation()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={!isCollapsed}>{isCollapsed ? "Show" : "Hide"}</button>
          </div>
        </div>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {!isCollapsed ? <div className="grid gap-3">{children}</div> : null}
    </section>
  );
}

function CollapsiblePanel({ title, titleRight, children, className }: { title: string; titleRight?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`rounded-lg border border-slate-200 p-3 ${className || ""}`.trim()}>
      <div className="flex cursor-pointer select-none items-center justify-between gap-3" onDoubleClick={() => setIsCollapsed((current) => !current)}>
        <p className="text-sm font-extrabold text-slate-900">{title}</p>
        <div className="flex items-center gap-2">
          {titleRight}
          <button type="button" onClick={(event) => { event.stopPropagation(); setIsCollapsed((current) => !current); }} onDoubleClick={(event) => event.stopPropagation()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={!isCollapsed}>{isCollapsed ? "Show" : "Hide"}</button>
        </div>
      </div>
      {!isCollapsed ? <div className="mt-3 grid gap-3">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 ${className || ""}`.trim()}>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  return <input {...props} ref={ref} className={`rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
});

function isCloudinaryDeliveryUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && (parsed.hostname === "cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com"));
  } catch {
    return false;
  }
}

const PRODUCT_IMAGE_PURPOSES = ["Main image", "All colors", "Front", "Back", "Front and back", "Left side", "Right side", "Left-right", "Top", "Bottom", "Top-bottom", "Side views", "Camera detail", "Other"];

function getProductImageItems(product: Product): ProductImageItem[] {
  const existing = Array.isArray(product.imageItems)
    ? product.imageItems.filter((item) => item && typeof item.url === "string" && item.url.trim()).map((item) => ({
      purpose: item.purpose || "Other",
      color: item.color || "",
      url: item.url.trim(),
    }))
    : [];
  if (existing.length) return existing;

  const migrated: ProductImageItem[] = [];
  const seen = new Set<string>();
  const add = (item: ProductImageItem) => {
    if (!item.url || seen.has(item.url)) return;
    seen.add(item.url);
    migrated.push(item);
  };
  (product.allColorImages || []).forEach((url) => add({ purpose: "All colors", color: "All colors", url }));
  (product.imageVariants || []).forEach((variant) => variant.images.forEach((url) => add({ purpose: "Other", color: variant.color, url })));
  (product.images || []).forEach((url) => add({ purpose: "Main image", color: "", url }));
  return migrated;
}

function OrderedImageUrlList({
  images,
  onChange,
  label,
  disabled = false,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  label: string;
  disabled?: boolean;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [image] = next.splice(from, 1);
    next.splice(to, 0, image);
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          draggable={!disabled}
          onDragStart={() => setDraggingIndex(index)}
          onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); if (!disabled && draggingIndex !== null) moveImage(draggingIndex, index); setDraggingIndex(null); }}
          onDragEnd={() => setDraggingIndex(null)}
          className={`grid min-w-0 grid-cols-[20px_48px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-white p-2 ${draggingIndex === index ? "border-blue-400 opacity-60" : "border-slate-200"}`}
        >
          <span className="cursor-grab select-none text-center text-lg text-slate-400" aria-label={`Drag to reorder ${label} ${index + 1}`} title="Drag to reorder">⋮⋮</span>
          <div className="relative h-12 w-12 overflow-hidden rounded border border-slate-100 bg-slate-50">
            <Image src={url} alt={`${label} ${index + 1}`} fill className="object-contain" unoptimized />
          </div>
          <TextInput value={url} disabled={disabled} onChange={(event) => onChange(images.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="w-full min-w-0 text-xs" aria-label={`${label} URL ${index + 1}`} />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => moveImage(index, index - 1)} disabled={disabled || index === 0} aria-label={`Move ${label} ${index + 1} up`} className="h-8 w-8 rounded border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-40">↑</button>
            <button type="button" onClick={() => moveImage(index, index + 1)} disabled={disabled || index === images.length - 1} aria-label={`Move ${label} ${index + 1} down`} className="h-8 w-8 rounded border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-40">↓</button>
            <button type="button" onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))} disabled={disabled} aria-label={`Remove ${label} ${index + 1}`} className="h-8 rounded px-2 text-xs font-semibold text-rose-700 disabled:opacity-40">Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductImageItemsEditor({
  items,
  colorOptions,
  imageBackground,
  disabled,
  onChange,
}: {
  items: ProductImageItem[];
  colorOptions: string[];
  imageBackground: string;
  disabled: boolean;
  onChange: (items: ProductImageItem[]) => void;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  function moveImage(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }
  function updateImage(index: number, update: Partial<ProductImageItem>) {
    onChange(items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...update };
      if (next.purpose === "All colors") next.color = "All colors";
      else if (next.color.toLocaleLowerCase() === "all colors" && update.color !== "All colors") next.color = "";
      return next;
    }));
  }
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div
          key={`${item.url}-${index}`}
          onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); if (!disabled && draggingIndex !== null) moveImage(draggingIndex, index); setDraggingIndex(null); }}
          onDragEnd={() => setDraggingIndex(null)}
          className={`grid min-w-0 grid-cols-[24px_120px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-white p-3 ${draggingIndex === index ? "border-blue-400 opacity-60" : "border-slate-200"}`}
        >
          <span draggable={!disabled} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggingIndex(index); }} className="cursor-grab select-none text-center text-lg text-slate-400 active:cursor-grabbing" title="Drag to reorder" aria-label={`Drag image ${index + 1} to reorder`}>⠿</span>
          <div style={{ backgroundColor: imageBackground === "transparent" ? "transparent" : imageBackground || "#ffffff" }} className="relative h-[120px] w-[120px] overflow-hidden rounded border border-slate-100">
            <Image src={item.url} alt={`Product image ${index + 1}`} fill className="object-contain" unoptimized />
          </div>
          <div className="grid min-w-0 gap-2">
            <TextInput aria-label={`Image ${index + 1} Cloudinary URL`} value={item.url} readOnly disabled={disabled} draggable={false} onDragStart={(event) => event.preventDefault()} className="w-full min-w-0 select-text text-xs" />
            <div className="flex flex-wrap gap-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Purpose</span>
                <select aria-label={`Image ${index + 1} purpose`} value={item.purpose} disabled={disabled} onChange={(event) => updateImage(index, { purpose: event.target.value, ...(event.target.value === "All colors" ? { color: "All colors" } : item.color === "All colors" ? { color: "" } : {}) })} className="min-w-[170px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
              {[...new Set([...PRODUCT_IMAGE_PURPOSES, item.purpose])].map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Color</span>
                <select aria-label={`Image ${index + 1} color`} value={item.purpose === "All colors" ? "All colors" : item.color} disabled={disabled || item.purpose === "All colors"} onChange={(event) => updateImage(index, { color: event.target.value })} className="min-w-[150px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                  <option value="">No color</option>
                  <option value="All colors">All colors</option>
                  {colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} disabled={disabled} aria-label={`Remove image ${index + 1}`} className="h-8 rounded px-2 text-xs font-semibold text-rose-700 disabled:opacity-40">Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeWifiVersion(value: string): string {
  const versions = splitAndCleanList(value);
  return WIFI_VERSION_OPTIONS.find((option) => versions.includes(option)) || versions[0] || "";
}

function normalizeBluetoothVersion(value: string): string {
  const versions = splitAndCleanList(value);
  return BLUETOOTH_VERSION_OPTIONS.find((option) => versions.includes(option)) || versions[0] || "";
}

function normalizeUsbVersion(values?: string[]): string {
  const list = Array.isArray(values) ? values.map(cleanText).filter(Boolean) : [];
  const normalized = list.map((item) => item === "4" ? "4.0" : item);
  return USB_VERSION_OPTIONS.find((option) => normalized.includes(option)) || normalized[0] || "";
}

function HelperTermInput({
  suggestions, value, onChange, commaSeparated = true, ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  suggestions: string[]; value: string; onChange: (value: string) => void; commaSeparated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const inputValue = commaSeparated ? draft : value;
  const query = (commaSeparated ? draft.split(",").at(-1) || "" : value).trim().toLowerCase();
  const selectedValues = commaSeparated
    ? new Set(draft.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))
    : new Set<string>();
  const matches = suggestions.filter((item) => (!query || item.toLowerCase().includes(query)) && !selectedValues.has(item.toLowerCase()));
  useEffect(() => {
    if (!open || !inputElement) return;
    const updateMenuPosition = () => {
      const rect = inputElement.getBoundingClientRect();
      const menuHeight = Math.min(224, Math.max(40, matches.length * 40));
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(menuHeight, rect.top - 12) } : { top: rect.bottom + 4, maxHeight: Math.min(menuHeight, spaceBelow - 12) }),
      });
    };
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [inputElement, matches.length, open]);
  const selectSuggestion = (suggestion: string) => {
    if (!commaSeparated) return onChange(suggestion);
    const rawParts = draft.split(",");
    const activeText = (rawParts.at(-1) || "").trim();
    const committed = rawParts.slice(0, -1).map((item) => item.trim()).filter(Boolean);
    const alreadySelected = [...committed, activeText].some((item) => item.toLowerCase() === suggestion.toLowerCase());
    if (alreadySelected) return;
    // Replace the current partial query (for example "I") with India. When
    // the last value is already complete, append the newly selected value.
    const nextValues = activeText && activeText.toLowerCase() === query
      ? [...committed, suggestion]
      : [...committed, activeText, suggestion].filter(Boolean);
    const next = nextValues.join(", ");
    setDraft(next);
    onChange(next);
    setOpen(false);
  };
  return <div className="relative w-full">
    <TextInput {...props} ref={setInputElement} className={`w-full ${props.className || ""}`.trim()} value={inputValue} autoComplete="off" onChange={(event) => {
      const next = event.target.value;
      if (commaSeparated) setDraft(next);
      else onChange(next);
      setOpen(true);
    }} onFocus={() => setOpen(true)} onBlur={() => {
      if (commaSeparated) onChange(draft);
      setTimeout(() => setOpen(false), 120);
    }} />
    {open && matches.length > 0 && inputElement ? <div style={menuStyle} className="z-[1000] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
      {matches.map((item) => <button key={item} type="button" onMouseDown={(event) => { event.preventDefault(); selectSuggestion(item); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50">{item}</button>)}
    </div> : null}
  </div>;
}

function HelperTermTextArea({
  suggestions, value, onChange, ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  suggestions: string[]; value: string; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [focused, value]);
  const query = draft.split("\n").at(-1)?.trim().toLowerCase() || "";
  const matches = suggestions.filter((item) => !query || item.toLowerCase().includes(query)).slice(0, 8);
  return <div className="relative w-full">
    <TextArea {...props} value={draft} onChange={(event) => { setDraft(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter") setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => { const normalized = formatKeyValueLines(parseKeyValueLines(draft)); setDraft(normalized); setFocused(false); onChange(normalized); setTimeout(() => setOpen(false), 120); }} />
    {open && matches.length > 0 ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
      {matches.map((item) => <button key={item} type="button" onMouseDown={(event) => { event.preventDefault(); const lines = draft.split("\n"); lines[lines.length - 1] = item; const next = lines.join("\n"); setDraft(next); onChange(next); setOpen(false); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50">{item}</button>)}
    </div> : null}
  </div>;
}

function UnitInput({
  prefix,
  suffix,
  containerClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string; containerClassName?: string }) {
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white ${containerClassName || ""}`.trim()}>
      {prefix ? <span className="border-r border-slate-200 px-2 py-2 text-sm font-semibold text-slate-500">{prefix}</span> : null}
      <input {...props} className={`min-w-0 flex-1 px-2 py-2 ${props.className || ""}`.trim()} />
      {suffix ? <span className="border-l border-slate-200 px-2 py-2 text-sm font-semibold text-slate-500">{suffix}</span> : null}
    </div>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
}

function DateTripleInput({
  value,
  onChange,
  onValidationChange,
  idPrefix,
}: {
  value?: string;
  onChange: (next: string) => void;
  onValidationChange?: (error: string) => void;
  idPrefix?: string;
}) {
  const initial = parseIsoDateParts(value);
  const [parts, setParts] = useState(() => ({
    day: initial.day,
    month: DATE_MONTH_OPTIONS.find((item) => item.value === initial.month)?.label || "",
    year: initial.year,
  }));
  const [dateError, setDateError] = useState("");
  const [invalidDateFields, setInvalidDateFields] = useState<Array<keyof typeof parts>>([]);

  function toMonthValue(monthName: string): string {
    return DATE_MONTH_OPTIONS.find((item) => item.label.toLowerCase() === monthName.trim().toLowerCase())?.value || "";
  }

  function validateAndSave(next: typeof parts) {
    const fail = (message: string, fields: Array<keyof typeof parts>) => {
      setDateError(message);
      setInvalidDateFields(fields);
      onValidationChange?.(message);
    };
    const month = toMonthValue(next.month);
    const year = Number(next.year);
    const day = Number(next.day);
    if (!next.day && !next.month && !next.year) {
      setDateError("");
      setInvalidDateFields([]);
      onValidationChange?.("");
      return;
    }
    if (!next.day || !next.month || !next.year) {
      fail("Complete the day, month, and year before saving.", [
        ...(!next.day ? ["day" as const] : []),
        ...(!next.month ? ["month" as const] : []),
        ...(!next.year ? ["year" as const] : []),
      ]);
      return;
    }
    if (!month) {
      fail("Choose a valid month from the suggestions.", ["month"]);
      return;
    }
    if (!/^\d{4}$/.test(next.year) || !Number.isInteger(year) || year < 2015 || year > 2030) {
      fail("Year must be between 2015 and 2030.", ["year"]);
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      fail("Day must be between 1 and 31.", ["day"]);
      return;
    }
    const maxDay = new Date(year, Number(month), 0).getDate();
    if (day > maxDay) {
      fail(`${next.month} ${year} has only ${maxDay} days.`, ["day", "month"]);
      return;
    }
    setDateError("");
    setInvalidDateFields([]);
    onValidationChange?.("");
    onChange(buildIsoDateParts(String(year), month, String(day)));
  }

  function updatePart(key: keyof typeof parts, rawValue: string) {
    const nextValue = key === "month" ? rawValue : rawValue.replace(/\D/g, "").slice(0, key === "day" ? 2 : 4);
    const next = { ...parts, [key]: nextValue };
    setParts(next);
    if (next.day && next.month && next.year) validateAndSave(next);
    else {
      setDateError("");
      setInvalidDateFields([]);
      onValidationChange?.("");
    }
  }

  function normalizeDay() {
    if (!parts.day) return;
    const next = { ...parts, day: String(Number(parts.day) || 0).padStart(2, "0") };
    setParts(next);
    validateAndSave(next);
  }

  function normalizeMonth() {
    const canonical = DATE_MONTH_OPTIONS.find((item) => item.label.toLowerCase() === parts.month.trim().toLowerCase())?.label || parts.month;
    const next = { ...parts, month: canonical };
    setParts(next);
    validateAndSave(next);
  }

  function normalizeYear() {
    if (!parts.year) return;
    const next = { ...parts };
    setParts(next);
    validateAndSave(next);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <TextInput
        id={idPrefix ? `${idPrefix}-day` : undefined}
        inputMode="numeric"
        value={parts.day}
        onChange={(e) => updatePart("day", e.target.value)}
        onBlur={normalizeDay}
        placeholder="Day"
        maxLength={2}
        className={invalidDateFields.includes("day") ? "border-rose-500 bg-rose-50 focus:border-rose-600" : ""}
      />
      <TextInput
        id={idPrefix ? `${idPrefix}-month` : undefined}
        value={parts.month}
        onChange={(e) => updatePart("month", e.target.value)}
        onBlur={normalizeMonth}
        placeholder="Month"
        list="date-month-suggestions"
        className={invalidDateFields.includes("month") ? "border-rose-500 bg-rose-50 focus:border-rose-600" : ""}
      />
      <TextInput
        id={idPrefix ? `${idPrefix}-year` : undefined}
        inputMode="numeric"
        value={parts.year}
        onChange={(e) => updatePart("year", e.target.value)}
        onBlur={normalizeYear}
        placeholder="Year"
        maxLength={4}
        className={invalidDateFields.includes("year") ? "border-rose-500 bg-rose-50 focus:border-rose-600" : ""}
      />
      <datalist id="date-month-suggestions">
        {DATE_MONTH_OPTIONS.map((month) => <option key={month.value} value={month.label} />)}
      </datalist>
      {dateError ? <p className="col-span-3 text-xs font-semibold text-rose-700">{dateError}</p> : null}
    </div>
  );
}

function ProductEditorNav({ deviceType }: { deviceType: DeviceType }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
      <Link
        href="/admin/products/smartphones"
        className={`rounded-lg px-3 py-2 ${deviceType === "smartphone" ? "bg-blue-700 text-white" : "text-slate-700"}`}
      >
        Smartphones
      </Link>
      <Link
        href="/admin/products/tablets"
        className={`rounded-lg px-3 py-2 ${deviceType === "tablet" ? "bg-blue-700 text-white" : "text-slate-700"}`}
      >
        Tablets
      </Link>
    </div>
  );
}

export default function ProductEditor({ deviceType, pageTitle, pageDescription }: ProductEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "editor">(() => (searchParams.get("view") === "editor" ? "editor" : "list"));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(emptyProduct(deviceType));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [imagePurposeDraft, setImagePurposeDraft] = useState("Main image");
  const [imageColorDraft, setImageColorDraft] = useState("");
  const [imageAdminView, setImageAdminView] = useState<"list" | "preview">("list");
  const [imagePreviewIndex, setImagePreviewIndex] = useState(0);
  const [smartphoneColorsDraft, setSmartphoneColorsDraft] = useState("");
  const [imageColorErrors, setImageColorErrors] = useState<Array<{ index: number; color: string; message: string }>>([]);
  const [dimensionColorErrors, setDimensionColorErrors] = useState<Array<{ path: string; label: string; color: string }>>([]);
  const [flipkartSourceUrl, setFlipkartSourceUrl] = useState("");
  const [flipkartAffiliateId, setFlipkartAffiliateId] = useState(DEFAULT_FLIPKART_AFFILIATE_ID);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [helperAliasMap, setHelperAliasMap] = useState<Record<string, string>>({});
  const [helperSuggestions, setHelperSuggestions] = useState<string[]>([]);
  const [processorSuggestions, setProcessorSuggestions] = useState<ProcessorAdminLite[]>([]);
  const [processorFetchState, setProcessorFetchState] = useState<"idle" | "loading">("idle");
  const [packageContentSuggestions, setPackageContentSuggestions] = useState<string[]>([]);
  const [osVersionSuggestions, setOsVersionSuggestions] = useState<string[]>([]);
  const [customUiSuggestions, setCustomUiSuggestions] = useState<string[]>([]);
  const [osUpdateSuggestions, setOsUpdateSuggestions] = useState<string[]>([]);
  const [securityUpdateSuggestions, setSecurityUpdateSuggestions] = useState<string[]>([]);
  const [bluetoothFeatureSuggestions, setBluetoothFeatureSuggestions] = useState<string[]>([]);
  const [batteryTypeSuggestions, setBatteryTypeSuggestions] = useState<string[]>([]);
  const [batteryTermSuggestions, setBatteryTermSuggestions] = useState<Record<string, string[]>>({});
  const [multimediaTermSuggestions, setMultimediaTermSuggestions] = useState<Record<string, string[]>>({});
  const [usbTypeSuggestions, setUsbTypeSuggestions] = useState<string[]>([]);
  const [otherNetworkSuggestions, setOtherNetworkSuggestions] = useState<string[]>([]);
  const [fiveGBandSuggestions, setFiveGBandSuggestions] = useState<string[]>([]);
  const [fourGBandSuggestions, setFourGBandSuggestions] = useState<string[]>([]);
  const [memoryFeatureSuggestions, setMemoryFeatureSuggestions] = useState<string[]>([]);
  const [sdCardTypeSuggestions, setSdCardTypeSuggestions] = useState<string[]>([]);
  const [originCountrySuggestions, setOriginCountrySuggestions] = useState<string[]>([]);
  const [cameraTermSuggestions, setCameraTermSuggestions] = useState<Record<string, string[]>>({});
  const [displayTermSuggestions, setDisplayTermSuggestions] = useState<Record<string, string[]>>({});
  const [performanceTermSuggestions, setPerformanceTermSuggestions] = useState<Record<string, string[]>>({});
  const [designTermSuggestions, setDesignTermSuggestions] = useState<Record<string, string[]>>({});
  const [securityTermSuggestions, setSecurityTermSuggestions] = useState<Record<string, string[]>>({});
  const [packageContentsInput, setPackageContentsInput] = useState("");
  const [showPackageSuggestions, setShowPackageSuggestions] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createSlugInput, setCreateSlugInput] = useState("");
  const [createSlugEdited, setCreateSlugEdited] = useState(false);
  const [quickCreating, setQuickCreating] = useState(false);
  const [showCreateBrandSuggestions, setShowCreateBrandSuggestions] = useState(false);
  const [dateValidationErrors, setDateValidationErrors] = useState<{ announceDate: string; launchDate: string }>({ announceDate: "", launchDate: "" });
  const [pendingVariantDeleteIndex, setPendingVariantDeleteIndex] = useState<number | null>(null);
  const [pendingLaunchVariantDeleteIndex, setPendingLaunchVariantDeleteIndex] = useState<number | null>(null);
  const [pendingNormalDimensionVariantDeleteIndex, setPendingNormalDimensionVariantDeleteIndex] = useState<number | null>(null);
  const [pendingPostureDimensionVariantDeleteIndex, setPendingPostureDimensionVariantDeleteIndex] = useState<number | null>(null);
  const [mobileDetailsView, setMobileDetailsView] = useState<MobileDetailsView>("single_entry");
  const [mobileDetailsVisible, setMobileDetailsVisible] = useState(true);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const rowStatus = row.status || "published";
        if (statusFilter === "all" && rowStatus === "recently_deleted") return false;
        if (statusFilter !== "all" && rowStatus !== statusFilter) return false;
        if (brandFilter.length > 0 && !brandFilter.some((item) => item.toLowerCase() === String(row.brand || "").toLowerCase())) return false;
        if (!q) return true;
        const hay = [row.name, row.brand, row.slug, row.id, row.status].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [brandFilter, query, rows, statusFilter]);

  const brandOptions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => String(row.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [rows]
  );
  const createBrandSuggestions = useMemo(
    () => {
      if (deviceType !== "smartphone") return [];
      const unique = new Map<string, string>();
      [...COMMON_SMARTPHONE_BRANDS, ...brandOptions.filter((item) => item !== "all")].forEach((brand) => {
        const value = brand.trim();
        if (value) unique.set(value.toLowerCase(), value);
      });
      return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
    },
    [brandOptions, deviceType]
  );
  const filteredCreateBrandSuggestions = useMemo(() => {
    const query = createBrand.trim().toLowerCase();
    return createBrandSuggestions
      .filter((brand) => !query || brand.toLowerCase().startsWith(query) || brand.toLowerCase().includes(query))
      .slice(0, 8);
  }, [createBrand, createBrandSuggestions]);

  const statusCounts = useMemo(() => {
    const counts = new Map<ProductStatusFilter, number>(PRODUCT_STATUS_FILTERS.map((item) => [item.key, 0]));
    rows.forEach((row) => {
      const status = row.status || "published";
      counts.set(status, (counts.get(status) || 0) + 1);
      if (status !== "recently_deleted") counts.set("all", (counts.get("all") || 0) + 1);
    });
    return counts;
  }, [rows]);

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const brand = String(row.brand || "").trim();
      if (!brand) return;
      counts.set(brand, (counts.get(brand) || 0) + 1);
    });
    return counts;
  }, [rows]);

  const suggestedCreateSlug = useMemo(() => slugify(createTitle || ""), [createTitle]);
  const createSlug = useMemo(
    () => slugify((createSlugEdited ? createSlugInput : suggestedCreateSlug) || createTitle || ""),
    [createSlugEdited, createSlugInput, suggestedCreateSlug, createTitle]
  );
  const createDocId = createSlug;
  const isCreateDocDuplicate = useMemo(
    () => Boolean(createDocId) && rows.some((row) => String(row.id || row.slug || "").toLowerCase() === createDocId.toLowerCase()),
    [createDocId, rows]
  );

  const finalSlug = useMemo(() => slugify(form.slug || form.name), [form.name, form.slug]);
  const selectedFormFactor = normalizeDesignFormFactor(cleanText(form.design?.formFactor) || "bar");
  const selectedFormFactorGroup = selectedFormFactor === "flip_fold" || selectedFormFactor === "book_fold" ? "fold" : selectedFormFactor;
  const postureOptions = useMemo(() => getPostureOptions(selectedFormFactor), [selectedFormFactor]);
  const selectedDisplayFormFactor = normalizeDisplayFormFactor(cleanText(form.display?.formFactor) || selectedFormFactor || "bar");
  const displayPanelGroups = useMemo(
    () => DISPLAY_PANEL_LAYOUTS[selectedDisplayFormFactor] || DISPLAY_PANEL_LAYOUTS.bar,
    [selectedDisplayFormFactor]
  );
  const normalDimensionMode = cleanText(form.design?.normalDimensionMode).toLowerCase() === "variant" ? "variant" : "same";
  const postureDimensionModes = form.design?.postureDimensionModes || {};
  const foldedDims = form.design?.dimensionsByPosture?.folded;
  const openDims = form.design?.dimensionsByPosture?.open;
  const showPostureSanityWarning = Boolean(
    selectedFormFactor !== "bar"
    && foldedDims
    && openDims
    && (
      (Number(foldedDims.height || 0) > 0 && Number(openDims.height || 0) > 0 && Number(openDims.height) < Number(foldedDims.height))
      || (Number(foldedDims.width || 0) > 0 && Number(openDims.width || 0) > 0 && Number(openDims.width) < Number(foldedDims.width))
    )
  );
  const memoryVariantMode = getMemoryVariantMode(form.memoryStorage);
  const sdCardMode = getSdCardMode(form.memoryStorage);
  const showSdCardExtraFields = sdCardMode === "hybrid" || sdCardMode === "dedicated";
  const selectedRamChannel = RAM_CHANNEL_OPTIONS.find((item) => item.key === cleanText(form.memoryStorage?.ramChannel).toLowerCase());
  const selectedRamChannelCount = selectedRamChannel?.count || 0;
  const selectedRamBitWidth = Number(form.memoryStorage?.ramBitWidth || 0);
  const computedTotalRamBusWidthBits = selectedRamChannelCount > 0 && selectedRamBitWidth > 0 ? selectedRamChannelCount * selectedRamBitWidth : 0;
  const computedTotalRamBusWidthLabel = computedTotalRamBusWidthBits > 0 ? `${computedTotalRamBusWidthBits}-bit` : "";
  const searchParamsKey = searchParams.toString();
  const architectureRows = useMemo(() => {
    const lines = String(form.performance?.architecture || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean).length;
    return Math.max(3, Math.min(8, lines || 3));
  }, [form.performance?.architecture]);
  const processorNameSuggestions = useMemo(
    () => Array.from(new Set(processorSuggestions.map((item) => String(item.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [processorSuggestions]
  );
  const packageContentMatches = useMemo(() => {
    const parts = packageContentsInput.split(",");
    const used = new Set(parts.slice(0, -1).map((item) => normalizeLookupKey(item)).filter(Boolean));
    const query = normalizeLookupKey(parts[parts.length - 1] || "");
    const available = packageContentSuggestions.filter((item) => !used.has(normalizeLookupKey(item)));
    if (!query) return available.slice(0, 8);
    return available.filter((item) => normalizeLookupKey(item).includes(query)).slice(0, 8);
  }, [packageContentSuggestions, packageContentsInput]);
  const packageContentEntries = useMemo(() => Array.isArray(form.general?.packageContents) ? form.general.packageContents : [], [form.general?.packageContents]);
  const selectedCableValue = useMemo(() => {
    const found = PACKAGE_CABLE_OPTIONS.find((item) =>
      packageContentEntries.some((entry) =>
        normalizeLookupKey(entry) === normalizeLookupKey(item) || normalizeLookupKey(entry) === normalizeLookupKey(`USB ${item}`)
      )
    );
    return found || "";
  }, [packageContentEntries]);
  const selectedConverterValues = useMemo(
    () => PACKAGE_CONVERTER_OPTIONS.filter((item) => packageContentEntries.some((entry) => normalizeLookupKey(entry) === normalizeLookupKey(item))),
    [packageContentEntries]
  );
  const packageBaseToggles = useMemo(() => {
    return PACKAGE_BASE_TOGGLES.map((item) => {
      const foundIndex = packageContentEntries.findIndex((entry) => normalizeLookupKey(entry) === normalizeLookupKey(item.label));
      return {
        ...item,
        checked: foundIndex >= 0,
        value: foundIndex >= 0 ? cleanText(packageContentEntries[foundIndex]) : item.label,
      };
    });
  }, [packageContentEntries]);
  const osNameKey = useMemo(() => {
    const raw = cleanText(form.software?.os?.name).toLowerCase();
    if (!raw) return "";
    if (raw.includes("android")) return "android";
    if (raw === "ios" || raw.includes("iphone") || raw.includes("i os")) return "ios";
    return "";
  }, [form.software?.os?.name]);
  const filteredOsVersionSuggestions = useMemo(() => {
    if (osNameKey === "android") return osVersionSuggestions.filter((item) => /^android\b/i.test(item));
    if (osNameKey === "ios") return osVersionSuggestions.filter((item) => /^i\s*os\b/i.test(item));
    return osVersionSuggestions;
  }, [osNameKey, osVersionSuggestions]);
  const sensorOptionMap = useMemo(() => {
    const map = new Map<string, string>();
    SENSOR_BASE_OPTIONS.forEach((item) => map.set(item.key, item.label));
    return map;
  }, []);
  const selectedHardwareSensorKeys = useMemo(() => {
    const keys = new Set<string>();
    (form.sensors || []).forEach((item) => {
      const key = normalizeSensorBaseKey(item);
      if (!key || !sensorOptionMap.has(key) || isVirtualSensorLabel(item)) return;
      keys.add(key);
    });
    return keys;
  }, [form.sensors, sensorOptionMap]);
  const selectedVirtualSensorKeys = useMemo(() => {
    const keys = new Set<string>();
    (form.sensors || []).forEach((item) => {
      const key = normalizeSensorBaseKey(item);
      if (!key || !sensorOptionMap.has(key) || !isVirtualSensorLabel(item)) return;
      keys.add(key);
    });
    return keys;
  }, [form.sensors, sensorOptionMap]);
  const selectedSensorCards = useMemo(
    () => [
      ...SENSOR_BASE_OPTIONS.filter((item) => selectedHardwareSensorKeys.has(item.key)).map((item) => ({ label: item.label })),
      ...SENSOR_BASE_OPTIONS.filter((item) => selectedVirtualSensorKeys.has(item.key)).map((item) => ({ label: item.key === "ecompass" ? item.label : `Virtual ${item.label}` })),
      ...(form.sensors || []).filter((item) => !sensorOptionMap.has(normalizeSensorBaseKey(item))).map((item) => ({ label: cleanText(item) })),
    ],
    [form.sensors, selectedHardwareSensorKeys, selectedVirtualSensorKeys, sensorOptionMap]
  );
  const fingerprintSetupValue = useMemo(() => {
    const available = form.security?.fingerprint?.available;
    const locations = (form.security?.fingerprint?.locations || []).map((item) => cleanText(item).toLowerCase());
    if (available === false) return "none";
    if (locations.some((item) => item.includes("in-display"))) return "in-display";
    if (locations.some((item) => item.includes("side"))) return "side-mounted";
    if (locations.some((item) => item.includes("rear"))) return "rear";
    return "";
  }, [form.security?.fingerprint?.available, form.security?.fingerprint?.locations]);
  const selectedSupportedNetworks = useMemo(() => {
    const set = new Set<string>();
    (form.network?.supported || []).forEach((item) => {
      const value = cleanText(item).toUpperCase();
      if (SUPPORTED_NETWORK_OPTIONS.includes(value as typeof SUPPORTED_NETWORK_OPTIONS[number])) set.add(value);
    });
    return set;
  }, [form.network?.supported]);
  const has5GNetworkSelected = selectedSupportedNetworks.has("5G");
  const has4GNetworkSelected = selectedSupportedNetworks.has("4G");
  const simMode = useMemo(() => {
    const type = cleanText(form.network?.sim?.type).toLowerCase();
    if (type.includes("dual")) return "dual";
    if (type.includes("single")) return "single";
    return "";
  }, [form.network?.sim?.type]);
  const bluetoothVersionSelected = useMemo(() => normalizeBluetoothVersion(form.network?.bluetooth || ""), [form.network?.bluetooth]);
  const wifiVersionSelected = useMemo(() => normalizeWifiVersion(form.network?.wifi?.version || ""), [form.network?.wifi?.version]);
  const usbVersionSelected = useMemo(() => normalizeUsbVersion(form.network?.usb?.version), [form.network?.usb?.version]);
  const bluetoothFeaturePool = useMemo(
    () => Array.from(new Set([...DEFAULT_BLUETOOTH_FEATURE_OPTIONS, ...bluetoothFeatureSuggestions])),
    [bluetoothFeatureSuggestions]
  );
  const usbTypePool = useMemo(() => Array.from(new Set([...DEFAULT_USB_TYPE_OPTIONS, ...usbTypeSuggestions])), [usbTypeSuggestions]);
  const wifiFeaturePool = useMemo(() => Array.from(new Set(DEFAULT_WIFI_FEATURE_OPTIONS)), []);
  const usbFeaturePool = useMemo(() => Array.from(new Set(DEFAULT_USB_FEATURE_OPTIONS)), []);

  const goToListView = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    params.delete("id");
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const goToEditorView = useCallback((id?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "editor");
    if (id) params.set("id", id);
    else params.delete("id");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const getEditHref = useCallback((idOrSlug?: string) => {
    if (!idOrSlug) return "#";
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "editor");
    params.set("id", idOrSlug);
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/products?admin=1&deviceType=${deviceType}`, { cache: "no-store" });
    const json = (await response.json()) as { items?: Product[]; error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load products.");
    }
    setRows((json.items || []) as Product[]);
  }, [deviceType]);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));
  }, [refresh]);

  useEffect(() => {
    let active = true;
    async function loadHelper() {
      try {
        const response = await fetch(`/api/admin/helper-terms?scope=${deviceType}`, { cache: "no-store" });
        if (!response.ok) return;
        const json = (await response.json()) as { items?: { section?: string; field?: string; name: string; aliases?: string[]; status?: string }[] };
        if (!active) return;

        const map: Record<string, string> = {};
        const suggestions = new Set<string>();
        const packageSuggestions = new Set<string>();
        const osVersionSet = new Set<string>();
        const customUiSet = new Set<string>();
        const osUpdateSet = new Set<string>();
        const securityUpdateSet = new Set<string>();
        const bluetoothFeatureSet = new Set<string>();
        const batteryTypeSet = new Set<string>();
        const usbTypeSet = new Set<string>();
        const otherNetworkSet = new Set<string>();
        const fiveGBandSet = new Set<string>();
        const fourGBandSet = new Set<string>();
        const memoryFeatureSet = new Set<string>();
        const sdCardTypeSet = new Set<string>();
        const originCountrySet = new Set<string>();
        const designTermSets: Record<string, Set<string>> = {};
        const securityTermSets: Record<string, Set<string>> = {};
        const batteryTermSets: Record<string, Set<string>> = {};
        const multimediaTermSets: Record<string, Set<string>> = {};
        const performanceTermSets: Record<string, Set<string>> = {};
        const cameraTermSets: Record<string, Set<string>> = {};
        const displayTermSets: Record<string, Set<string>> = {};

        (json.items || []).forEach((item) => {
          if (item.status && item.status !== "approved") return;
          const canonical = String(item.name || "").trim();
          if (!canonical) return;
          suggestions.add(canonical);
          const sectionKey = normalizeLookupKey(item.section || "");
          const fieldKey = normalizeLookupKey(item.field || "");
          const isPackageTerm = sectionKey === "general" && (!fieldKey || fieldKey.includes("packagecontent"));
          const isOriginCountryTerm = sectionKey === "general" && (fieldKey === "origincountry" || fieldKey === "origin" || fieldKey === "country");
          const isSoftwareTerm = sectionKey === "software";
          const isNetworkTerm = sectionKey === "network" || sectionKey === "networkconnectivity";
          const isBatteryTerm = sectionKey === "battery" || sectionKey === "batterycharging";
          const isDesignTerm = sectionKey === "designbuild" || sectionKey === "design";
          const isSecurityTerm = sectionKey === "securitysensors" || sectionKey === "security";
          const isMemoryTerm = sectionKey === "memorystorage" || sectionKey === "storagevariants" || sectionKey === "storage";
          const isMultimediaTerm = sectionKey === "multimedia";
          const isPerformanceTerm = sectionKey === "performance";
          const isCameraTerm = sectionKey === "camera";
          const isDisplayTerm = sectionKey === "display";
          if (isPackageTerm) packageSuggestions.add(canonical);
          if (isOriginCountryTerm) originCountrySet.add(canonical);
          if (isSoftwareTerm && (fieldKey === "uiname" || fieldKey === "customui" || fieldKey === "ui")) customUiSet.add(canonical);
          if (isSoftwareTerm && fieldKey === "osversion") osVersionSet.add(canonical);
          if (isSoftwareTerm && fieldKey === "osupdates") osUpdateSet.add(canonical);
          if (isSoftwareTerm && fieldKey === "securityupdates") securityUpdateSet.add(canonical);
          if (isNetworkTerm && (fieldKey === "bluetoothfeatures" || fieldKey === "bluetoothfeature")) bluetoothFeatureSet.add(canonical);
          if (isNetworkTerm && (fieldKey === "usbtype" || fieldKey === "usbtypes")) usbTypeSet.add(canonical);
          if (isNetworkTerm && (fieldKey === "othernetwork" || fieldKey === "othernetworkfeatures")) otherNetworkSet.add(canonical);
          if (isNetworkTerm && (fieldKey === "5gband" || fieldKey === "5gbands")) fiveGBandSet.add(canonical);
          if (isNetworkTerm && (fieldKey === "4gband" || fieldKey === "4gbands")) fourGBandSet.add(canonical);
          if (isBatteryTerm && (fieldKey === "type" || fieldKey === "batterytype")) batteryTypeSet.add(canonical);
          if (isBatteryTerm && fieldKey) {
            const set = batteryTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            batteryTermSets[fieldKey] = set;
          }
          if (isMultimediaTerm && fieldKey) {
            const set = multimediaTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            multimediaTermSets[fieldKey] = set;
          }
          if (isMemoryTerm && (fieldKey === "othermemoryfeatures" || fieldKey === "memoryfeatures" || fieldKey === "features")) memoryFeatureSet.add(canonical);
          if (isMemoryTerm && (fieldKey === "sdcardtype" || fieldKey === "sdcardtypes")) sdCardTypeSet.add(canonical);
          if (isPerformanceTerm && fieldKey) {
            const set = performanceTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            performanceTermSets[fieldKey] = set;
          }
          if (isCameraTerm && fieldKey) {
            const set = cameraTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            cameraTermSets[fieldKey] = set;
          }
          if (isDisplayTerm && fieldKey) {
            const set = displayTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            displayTermSets[fieldKey] = set;
          }
          if (isDesignTerm && fieldKey) {
            const set = designTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            designTermSets[fieldKey] = set;
          }
          if (isSecurityTerm && fieldKey) {
            const set = securityTermSets[fieldKey] || new Set<string>();
            set.add(canonical);
            securityTermSets[fieldKey] = set;
          }
          [canonical, ...(item.aliases || [])].forEach((alias) => {
            const key = normalizeLookupKey(alias);
            if (key) map[key] = canonical;
          });
        });

        setHelperAliasMap(map);
        setHelperSuggestions(Array.from(suggestions).sort((left, right) => left.localeCompare(right)));
        setPackageContentSuggestions(Array.from(packageSuggestions).sort((left, right) => left.localeCompare(right)));
        setOsVersionSuggestions(Array.from(osVersionSet).sort((left, right) => left.localeCompare(right)));
        setCustomUiSuggestions(Array.from(customUiSet).sort((left, right) => left.localeCompare(right)));
        setOsUpdateSuggestions(Array.from(osUpdateSet).sort((left, right) => left.localeCompare(right)));
        setSecurityUpdateSuggestions(Array.from(securityUpdateSet).sort((left, right) => left.localeCompare(right)));
        setBluetoothFeatureSuggestions(Array.from(bluetoothFeatureSet).sort((left, right) => left.localeCompare(right)));
        setBatteryTypeSuggestions(Array.from(batteryTypeSet).sort((left, right) => left.localeCompare(right)));
        setBatteryTermSuggestions(Object.fromEntries(Object.entries(batteryTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setMultimediaTermSuggestions(Object.fromEntries(Object.entries(multimediaTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setUsbTypeSuggestions(Array.from(usbTypeSet).sort((left, right) => left.localeCompare(right)));
        setOtherNetworkSuggestions(Array.from(otherNetworkSet).sort((left, right) => left.localeCompare(right)));
        setFiveGBandSuggestions(Array.from(fiveGBandSet).sort((left, right) => left.localeCompare(right)));
        setFourGBandSuggestions(Array.from(fourGBandSet).sort((left, right) => left.localeCompare(right)));
        setMemoryFeatureSuggestions(Array.from(memoryFeatureSet).sort((left, right) => left.localeCompare(right)));
        setSdCardTypeSuggestions(Array.from(sdCardTypeSet).sort((left, right) => left.localeCompare(right)));
        setOriginCountrySuggestions(Array.from(originCountrySet).sort((left, right) => left.localeCompare(right)));
        setPerformanceTermSuggestions(Object.fromEntries(Object.entries(performanceTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setCameraTermSuggestions(Object.fromEntries(Object.entries(cameraTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setDisplayTermSuggestions(Object.fromEntries(Object.entries(displayTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setDesignTermSuggestions(Object.fromEntries(Object.entries(designTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
        setSecurityTermSuggestions(Object.fromEntries(Object.entries(securityTermSets).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])));
      } catch {
        // ignore helper fetch issues
      }
    }

    loadHelper().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [deviceType]);

  useEffect(() => {
    let active = true;
    async function loadProcessors() {
      try {
        const response = await fetch("/api/processors?admin=1", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const json = (await response.json()) as { items?: ProcessorAdminLite[] };
        if (!active) return;
        setProcessorSuggestions(Array.isArray(json.items) ? json.items : []);
      } catch {
        // ignore processor fetch issues
      }
    }
    loadProcessors().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function setField<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canonicalizeColor = useCallback((value: string) => {
    const colors = form.design?.colors || [];
    return colors.find((color) => color.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase()) || value.trim();
  }, [form.design?.colors]);

  const canonicalizeColorList = useCallback((value: string) => normalizePhoneColors(value).map(canonicalizeColor).join(", "), [canonicalizeColor]);

  function setDimensionColor(path: PathKey[], value: string) {
    updatePath(path, canonicalizeColorList(value));
    setDimensionColorErrors([]);
  }

  function updateSmartphoneColors(value: string) {
    setSmartphoneColorsDraft(value);
    const colors = normalizePhoneColors(value);
    const colorMap = new Map(colors.map((color) => [color.toLocaleLowerCase(), color]));
    updatePath(["design", "colors"], colors);
    setForm((previous) => ({
      ...previous,
      imageItems: (previous.imageItems || []).map((item) => ({
        ...item,
        color: item.purpose === "All colors" || item.color.toLocaleLowerCase() === "all colors"
          ? "All colors"
          : colorMap.get(item.color.trim().toLocaleLowerCase()) || item.color,
      })),
    }));
    setImageColorDraft((previous) => colorMap.get(previous.trim().toLocaleLowerCase()) || previous);
    setImageColorErrors([]);
  }

  function updatePath(path: PathKey[], value: unknown) {
    setForm((prev) => setAtPath(prev, path, value));
  }

  function updateDisplayResolution(basePath: PathKey[], dimension: "width" | "height", value: string) {
    setForm((prev) => {
      const panel = (getAtPath(prev, basePath) || {}) as ProductDisplayPanel;
      const width = dimension === "width" ? value : String(panel.resolutionWidth ?? "");
      const height = dimension === "height" ? value : String(panel.resolutionHeight ?? "");
      const resolution = width && height ? `${width} × ${height}` : "";
      let next = setAtPath(prev, [...basePath, dimension === "width" ? "resolutionWidth" : "resolutionHeight"], value);
      next = setAtPath(next, [...basePath, "resolution"], resolution);
      return next;
    });
  }

  function updateCameraUnitAndCommon(
    cameraType: "rearCamera" | "frontCamera",
    index: number,
    fieldPath: PathKey[],
    value: unknown
  ) {
    setForm((prev) => {
      let next = setAtPath(prev, [cameraType, "cameras", index, ...fieldPath], value);
      const cameras = (getAtPath(next, [cameraType, "cameras"]) || []) as Array<RearCameraUnit | FrontCameraUnit>;
      const autofocus = cameras.map((camera) => cleanText(camera.sensor?.autofocus)).find(Boolean) || "";
      const ois = cameras.some((camera) => camera.sensor?.ois === true);
      const eis = cameras.some((camera) => camera.sensor?.eis === true);
      const maxCameraResolution = getHighestCameraResolution(cameras);
      const highestResolutionCamera = cameras.find((camera) => camera.resolution === maxCameraResolution);
      next = setAtPath(next, [cameraType, "autofocus"], autofocus);
      next = setAtPath(next, [cameraType, "ois"], ois || undefined);
      next = setAtPath(next, [cameraType, "eis"], eis || undefined);
      next = setAtPath(next, [cameraType, "maxCameraResolution"], maxCameraResolution);
      next = setAtPath(next, [cameraType, "imageResolution"], highestResolutionCamera?.imageResolution || "");
      return next;
    });
  }

  function updateCameraImageResolution(
    cameraType: "rearCamera" | "frontCamera",
    index: number,
    dimension: "width" | "height",
    value: string
  ) {
    setForm((prev) => {
      const camera = (getAtPath(prev, [cameraType, "cameras", index]) || {}) as RearCameraUnit | FrontCameraUnit;
      const width = dimension === "width" ? value : String(camera.imageResolutionWidth ?? "");
      const height = dimension === "height" ? value : String(camera.imageResolutionHeight ?? "");
      let next = setAtPath(prev, [cameraType, "cameras", index, dimension === "width" ? "imageResolutionWidth" : "imageResolutionHeight"], value);
      next = setAtPath(next, [cameraType, "cameras", index, "imageResolution"], width && height ? `${width} × ${height} px` : "");
      return next;
    });
  }

  function updateCommonCameraImageResolution(cameraType: "rearCamera" | "frontCamera", dimension: "width" | "height", value: string) {
    setForm((prev) => {
      const camera = (getAtPath(prev, [cameraType]) || {}) as Product["rearCamera"];
      const width = dimension === "width" ? value : String(camera?.imageResolutionWidth ?? "");
      const height = dimension === "height" ? value : String(camera?.imageResolutionHeight ?? "");
      let next = setAtPath(prev, [cameraType, dimension === "width" ? "imageResolutionWidth" : "imageResolutionHeight"], value);
      next = setAtPath(next, [cameraType, "imageResolution"], width && height ? `${width} × ${height} px` : "");
      return next;
    });
  }

  function updateCurvedDegree(basePath: PathKey[], value: string) {
    const degree = parseOptionalNumber(value);
    setForm((prev) => {
      let next = setAtPath(prev, [...basePath, "curvedDegree"], degree);
      next = setAtPath(next, [...basePath, "curved"], degree !== undefined && degree > 0 ? true : false);
      return next;
    });
  }

  function appendToPath(path: PathKey[], value: unknown) {
    setForm((prev) => {
      const current = getAtPath(prev, path);
      const next = Array.isArray(current) ? [...current, value] : [value];
      return setAtPath(prev, path, next);
    });
  }

  function removeFromPath(path: PathKey[], index: number) {
    setForm((prev) => {
      const current = getAtPath(prev, path);
      const next = Array.isArray(current) ? current.filter((_, itemIndex) => itemIndex !== index) : [];
      return setAtPath(prev, path, next);
    });
  }

  async function fetchPerformanceFromProcessor() {
    const chipsetInput = String(form.performance?.chipset || "").trim();
    if (!chipsetInput) return;

    const normalizedInput = normalizeLookupKey(chipsetInput);
    let availableProcessors = processorSuggestions;
    if (availableProcessors.length === 0) {
      const listResponse = await fetch("/api/processors?admin=1", { cache: "no-store", credentials: "include" });
      const listJson = (await listResponse.json()) as { items?: ProcessorAdminLite[]; error?: string };
      if (!listResponse.ok) {
        setError(listJson.error || "Failed to load processors. Please refresh and try again.");
        return;
      }
      availableProcessors = Array.isArray(listJson.items) ? listJson.items : [];
      setProcessorSuggestions(availableProcessors);
    }
    const matchedProcessor =
      availableProcessors.find((item) => normalizeLookupKey(item.name || "") === normalizedInput)
      || availableProcessors.find((item) => normalizeLookupKey(item.name || "").includes(normalizedInput))
      || availableProcessors.find((item) => normalizedInput.includes(normalizeLookupKey(item.name || "")));

    if (!matchedProcessor?.id) {
      setError("No processor match found. Pick chipset from suggestion list, then fetch.");
      return;
    }

    setProcessorFetchState("loading");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/processors/${encodeURIComponent(String(matchedProcessor.id))}`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch processor details.");
      const json = (await response.json()) as { item?: ProcessorAdminLite };
      const processor = json.item || matchedProcessor;
      const detail = processor.detail || {};
      const benchmarks = detail.benchmarks || {};
      const parsedCpu = splitCpuConfig(String(detail.cores || detail.coreConfiguration || ""));
      const processLabel = String(detail.process || "").trim();
      const manufacturerLabel = String(detail.manufacturer || "").trim();
      const fabricationLabel =
        processLabel && manufacturerLabel
          ? `${processLabel} (${manufacturerLabel})`
          : (processLabel || manufacturerLabel || "");
      const aiEngineName = String(detail.aiEngine || "").trim();
      const aiTops = detail.aiPerformanceTops && Number.isFinite(Number(detail.aiPerformanceTops))
        ? `${Number(detail.aiPerformanceTops)} TOPS`
        : "";
      const aiEngineLabel = aiEngineName && aiTops ? `${aiEngineName} (${aiTops})` : (aiEngineName || aiTops || "");
      const architectureValue = String(detail.coreConfiguration || detail.cores || "").trim();
      const noOfCoresValue = deriveCoreCountText(detail);

      setForm((prev) => ({
        ...prev,
        specs: {
          ...prev.specs,
          processor: String(processor.name || prev.specs?.processor || "").trim(),
        },
        performance: {
          ...prev.performance,
          chipset: String(processor.name || prev.performance?.chipset || chipsetInput).trim(),
          fabrication: fabricationLabel || String(prev.performance?.fabrication || "").trim(),
          noOfCores: noOfCoresValue || String(prev.performance?.noOfCores || "").trim(),
          architecture: architectureValue || String(prev.performance?.architecture || "").trim(),
          cpu: parsedCpu.length > 0 ? parsedCpu : (prev.performance?.cpu || []),
          cpuFrequency:
            processor.maxCpuGhz && Number.isFinite(Number(processor.maxCpuGhz))
              ? `${Number(processor.maxCpuGhz)} GHz`
              : (prev.performance?.cpuFrequency || ""),
          gpu: String(detail.gpuName || prev.performance?.gpu || "").trim(),
          gpuFrequency:
            detail.gpuFrequencyMhz && Number.isFinite(Number(detail.gpuFrequencyMhz))
              ? `${Number(detail.gpuFrequencyMhz)} MHz`
              : (prev.performance?.gpuFrequency || ""),
          gpuFlops: String(detail.gpuFlops || prev.performance?.gpuFlops || "").trim(),
          aiEngine: aiEngineLabel || String(prev.performance?.aiEngine || "").trim(),
          otherAiFeatures: Array.isArray(detail.aiFeatures) && detail.aiFeatures.length > 0 ? detail.aiFeatures : (prev.performance?.otherAiFeatures || []),
          antutu: {
            total: Number(benchmarks.antutu || benchmarks.antutuCalc || 0) || prev.performance?.antutu?.total,
            cpu: Number(benchmarks.antutuCpu || benchmarks.antutuCalcCpu || 0) || prev.performance?.antutu?.cpu,
            gpu: Number(benchmarks.antutuGpu || benchmarks.antutuCalcGpu || 0) || prev.performance?.antutu?.gpu,
            memory: Number(benchmarks.antutuMemory || 0) || prev.performance?.antutu?.memory,
            ux: Number(benchmarks.antutuUx || 0) || prev.performance?.antutu?.ux,
          },
          benchmarks: {
            ...prev.performance?.benchmarks,
            antutuVersion: String(benchmarks.antutuVersion || benchmarks.antutuCalcVersion || prev.performance?.benchmarks?.antutuVersion || "").trim(),
            geekbenchVersion: String(benchmarks.geekbenchVersion || prev.performance?.benchmarks?.geekbenchVersion || "").trim(),
            geekbenchSingle: Number(benchmarks.geekbenchSingle || 0) || prev.performance?.benchmarks?.geekbenchSingle,
            geekbenchMulti: Number(benchmarks.geekbenchMulti || 0) || prev.performance?.benchmarks?.geekbenchMulti,
            threeDMarkWildLife: Number(benchmarks.threeDMarkWildLife || 0) || prev.performance?.benchmarks?.threeDMarkWildLife,
            threeDMarkSteelNomadLight: Number(benchmarks.threeDMarkSteelNomadLight || 0) || prev.performance?.benchmarks?.threeDMarkSteelNomadLight,
            threeDMarkSolarBay: Number(benchmarks.threeDMarkSolarBay || 0) || prev.performance?.benchmarks?.threeDMarkSolarBay,
            threeDMarkWildLifeExtreme: Number(benchmarks.threeDMarkWildLifeExtreme || 0) || prev.performance?.benchmarks?.threeDMarkWildLifeExtreme,
          },
        },
      }));

      setMessage("Processor fields fetched. You can edit anything manually.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch processor details.");
    } finally {
      setProcessorFetchState("idle");
    }
  }

  function insertMemoryVariantAfter(index: number) {
    setForm((prev) => {
      const current = Array.isArray(prev.general?.variants) ? prev.general.variants : [];
      const next = [...current];
      next.splice(index + 1, 0, { ram: "", storage: "", launchPrice: undefined, livePrice: undefined });
      return setAtPath(prev, ["general", "variants"], next);
    });
    setPendingVariantDeleteIndex(null);
  }

  function removeMemoryVariant(index: number) {
    setForm((prev) => {
      const current = Array.isArray(prev.general?.variants) ? prev.general.variants : [];
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return setAtPath(prev, ["general", "variants"], next.length > 0 ? next : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }]);
    });
    setPendingVariantDeleteIndex(null);
  }

  function updateMemoryVariantMode(nextMode: "same_both" | "same_ram_type" | "same_storage_type" | "different") {
    setForm((prev) => {
      const groups = Array.isArray(prev.general?.variants) ? prev.general.variants : [];
      const firstRamType = cleanText(groups.find((group) => cleanText(group?.ramType))?.ramType);
      const firstStorageType = cleanText(groups.find((group) => cleanText(group?.storageType))?.storageType);
      const commonRamType = cleanText(prev.memoryStorage?.commonRamType) || firstRamType;
      const commonStorageType = cleanText(prev.memoryStorage?.commonStorageType) || firstStorageType;
      let nextForm = setAtPath(prev, ["memoryStorage", "variantMode"], nextMode);
      if (nextMode === "same_both" || nextMode === "same_ram_type") {
        nextForm = setAtPath(nextForm, ["memoryStorage", "commonRamType"], commonRamType);
      }
      if (nextMode === "same_both" || nextMode === "same_storage_type") {
        nextForm = setAtPath(nextForm, ["memoryStorage", "commonStorageType"], commonStorageType);
      }
      return nextForm;
    });
    setPendingVariantDeleteIndex(null);
  }

  function updateMemoryVariantField(index: number, key: keyof MemoryVariant, value: string) {
    setForm((prev) => {
      const groups = Array.isArray(prev.general?.variants) ? [...prev.general.variants] : [{ ram: "", storage: "" }];
      if (!groups[index]) groups[index] = { ram: "", storage: "" };
      const mode = getMemoryVariantMode(prev.memoryStorage);
      const sanitizedValue =
        key === "ram" ? sanitizeDigits(value, 2) : key === "storage" ? sanitizeDigits(value, 4) : key === "virtualRam" ? sanitizeDigits(value, 2) : value;

      if (key === "ramType" && (mode === "same_both" || mode === "same_ram_type")) {
        return setAtPath(prev, ["memoryStorage", "commonRamType"], sanitizedValue);
      }
      if (key === "storageType" && (mode === "same_both" || mode === "same_storage_type")) {
        return setAtPath(prev, ["memoryStorage", "commonStorageType"], sanitizedValue);
      }

      const nextGroup = { ...groups[index], [key]: sanitizedValue };
      groups[index] = nextGroup;
      return setAtPath(prev, ["general", "variants"], groups);
    });
  }

  function updateSdCardMode(nextMode: "" | "none" | "hybrid" | "dedicated") {
    setForm((prev) => {
      const nextExpandableStorage = { ...(prev.memoryStorage?.expandableStorage || {}) };
      if (!nextMode) {
        nextExpandableStorage.supported = undefined;
        nextExpandableStorage.slotType = "";
      } else if (nextMode === "none") {
        nextExpandableStorage.supported = false;
        nextExpandableStorage.slotType = "none";
        nextExpandableStorage.max = "";
        nextExpandableStorage.types = [];
      } else {
        nextExpandableStorage.supported = true;
        nextExpandableStorage.slotType = nextMode;
      }
      return setAtPath(prev, ["memoryStorage", "expandableStorage"], nextExpandableStorage);
    });
  }

  function updateRamChannel(next?: "single" | "dual" | "quad") {
    const channelCount = next ? (RAM_CHANNEL_OPTIONS.find((item) => item.key === next)?.count || 0) : 0;
    setForm((prev) => {
      const bitWidth = Number(prev.memoryStorage?.ramBitWidth || 0);
      const total = channelCount > 0 && bitWidth > 0 ? channelCount * bitWidth : undefined;
      let nextForm = setAtPath(prev, ["memoryStorage", "ramChannel"], next || "");
      nextForm = setAtPath(nextForm, ["memoryStorage", "totalRamBusWidthBits"], total);
      return nextForm;
    });
  }

  function updateRamBitWidth(next?: number) {
    setForm((prev) => {
      const channel = cleanText(prev.memoryStorage?.ramChannel).toLowerCase();
      const channelCount = RAM_CHANNEL_OPTIONS.find((item) => item.key === channel)?.count || 0;
      const safeNext = Number(next || 0);
      const total = channelCount > 0 && safeNext > 0 ? channelCount * safeNext : undefined;
      let nextForm = setAtPath(prev, ["memoryStorage", "ramBitWidth"], safeNext > 0 ? safeNext : undefined);
      nextForm = setAtPath(nextForm, ["memoryStorage", "totalRamBusWidthBits"], total);
      return nextForm;
    });
  }

  function updateFingerprintSetup(next: "" | "none" | "rear" | "side-mounted" | "in-display") {
    setForm((prev) => {
      if (!next) {
        let nextForm = setAtPath(prev, ["security", "fingerprint", "available"], undefined);
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "locations"], []);
        return nextForm;
      }
      if (next === "none") {
        let nextForm = setAtPath(prev, ["security", "fingerprint", "available"], false);
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "locations"], []);
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "type"], []);
        return nextForm;
      }
      const locationLabel = next === "in-display" ? "In-Display" : next === "side-mounted" ? "Side Mounted" : "Rear Mounted";
      let nextForm = setAtPath(prev, ["security", "fingerprint", "available"], true);
      nextForm = setAtPath(nextForm, ["security", "fingerprint", "locations"], [locationLabel]);
      return nextForm;
    });
  }

  function updateFingerprintType(next: string) {
    updatePath(["security", "fingerprint", "type"], next ? [next] : []);
  }

  function updateFingerprintAvailability(next: "yes" | "no" | "unknown") {
    setForm((prev) => {
      let nextForm = setAtPath(prev, ["security", "fingerprint", "available"], next === "yes" ? true : next === "no" ? false : undefined);
      if (next === "yes") {
        // Availability and details are entered separately; never carry an old
        // default technology/position into a newly enabled scanner.
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "locations"], []);
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "type"], []);
      } else {
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "locations"], []);
        nextForm = setAtPath(nextForm, ["security", "fingerprint", "type"], []);
      }
      return nextForm;
    });
  }

  function updateFaceUnlockType(next: string) {
    updatePath(["security", "faceUnlock", "type"], next);
  }

  function updateFaceUnlockAvailability(next: "yes" | "no" | "unknown") {
    setForm((prev) => {
      let nextForm = setAtPath(prev, ["security", "faceUnlock", "available"], next === "yes" ? true : next === "no" ? false : undefined);
      nextForm = setAtPath(nextForm, ["security", "faceUnlock", "type"], "");
      return nextForm;
    });
  }

  function updateIrisScanner(next?: boolean) {
    updatePath(["security", "irisScanner"], next);
  }

  function toggleSensorChip(sensorKey: string, mode: "hardware" | "virtual") {
    setForm((prev) => {
      const current = Array.isArray(prev.sensors) ? prev.sensors : [];
      const hardware = new Set<string>();
      const virtual = new Set<string>();
      const extras: string[] = [];

      current.forEach((item) => {
        const key = normalizeSensorBaseKey(item);
        if (!key || !sensorOptionMap.has(key)) {
          extras.push(item);
          return;
        }
        if (isVirtualSensorLabel(item)) virtual.add(key);
        else hardware.add(key);
      });

      const target = mode === "virtual" ? virtual : hardware;
      if (target.has(sensorKey)) target.delete(sensorKey);
      else target.add(sensorKey);

      const rebuilt = [
        ...SENSOR_BASE_OPTIONS.filter((item) => hardware.has(item.key)).map((item) => item.label),
        ...SENSOR_BASE_OPTIONS.filter((item) => virtual.has(item.key)).map((item) => item.key === "ecompass" ? item.label : `Virtual ${item.label}`),
      ];

      return {
        ...prev,
        sensors: [...rebuilt, ...extras],
      };
    });
  }

  function toggleTextOption(path: PathKey[], option: string) {
    setForm((prev) => {
      const current = getAtPath(prev, path);
      const existing = Array.isArray(current) ? current.map((item) => cleanText(item)).filter(Boolean) : [];
      const has = existing.some((item) => item.toLowerCase() === option.toLowerCase());
      const next = has
        ? existing.filter((item) => item.toLowerCase() !== option.toLowerCase())
        : [...existing, option];
      return setAtPath(prev, path, next);
    });
  }

  function toggleSupportedNetwork(option: typeof SUPPORTED_NETWORK_OPTIONS[number]) {
    setForm((prev) => {
      const existing = Array.isArray(prev.network?.supported) ? prev.network.supported.map(cleanText).filter(Boolean) : [];
      const has = existing.some((item) => item.toUpperCase() === option);
      const supported = has ? existing.filter((item) => item.toUpperCase() !== option) : [...existing, option];
      let nextForm = setAtPath(prev, ["network", "supported"], supported);
      if (option === "5G" && has) {
        nextForm = setAtPath(nextForm, ["network", "bands", "5G"], { fdd: [], tdd: [], all: [] });
      }
      return nextForm;
    });
  }

  function updateSimMode(next: "" | "single" | "dual") {
    setForm((prev) => {
      if (!next) {
        let nextForm = setAtPath(prev, ["network", "sim", "type"], "");
        nextForm = setAtPath(nextForm, ["network", "sim", "config"], "");
        nextForm = setAtPath(nextForm, ["network", "sim", "slot1Type"], "");
        nextForm = setAtPath(nextForm, ["network", "sim", "slot2Type"], "");
        nextForm = setAtPath(nextForm, ["network", "sim", "hybrid"], undefined);
        return nextForm;
      }
      if (next === "single") {
        let nextForm = setAtPath(prev, ["network", "sim", "type"], "Single SIM");
        nextForm = setAtPath(nextForm, ["network", "sim", "slot2Type"], "");
        const slot1 = cleanText(getAtPath(prev, ["network", "sim", "slot1Type"]) as string) || "Nano SIM";
        nextForm = setAtPath(nextForm, ["network", "sim", "slot1Type"], slot1);
        nextForm = setAtPath(nextForm, ["network", "sim", "config"], slot1);
        nextForm = setAtPath(nextForm, ["network", "sim", "hybrid"], undefined);
        return nextForm;
      }
      const existingSlot1 = cleanText(getAtPath(prev, ["network", "sim", "slot1Type"]) as string) || "Nano SIM";
      const existingSlot2 = cleanText(getAtPath(prev, ["network", "sim", "slot2Type"]) as string) || "Nano SIM";
      const slot1 = existingSlot1;
      const slot2 = existingSlot2;
      const config = `${slot1} + ${slot2}`;
      let nextForm = setAtPath(prev, ["network", "sim", "type"], "Dual SIM");
      nextForm = setAtPath(nextForm, ["network", "sim", "slot1Type"], slot1);
      nextForm = setAtPath(nextForm, ["network", "sim", "slot2Type"], slot2);
      nextForm = setAtPath(nextForm, ["network", "sim", "config"], config);
      nextForm = setAtPath(nextForm, ["network", "sim", "hybrid"], config.toLowerCase().includes("hybrid"));
      return nextForm;
    });
  }

  function updateSimSlot(slot: "slot1Type" | "slot2Type", value: string) {
    setForm((prev) => {
      const mode = cleanText(prev.network?.sim?.type).toLowerCase().includes("dual") ? "dual" : "single";
      if (mode === "single") {
        let nextForm = setAtPath(prev, ["network", "sim", "slot1Type"], value);
        nextForm = setAtPath(nextForm, ["network", "sim", "config"], value);
        return nextForm;
      }
      const slot1 = slot === "slot1Type" ? value : cleanText(prev.network?.sim?.slot1Type) || "Nano SIM";
      const slot2 = slot === "slot2Type" ? value : cleanText(prev.network?.sim?.slot2Type) || "Nano SIM";
      const config = `${slot1} + ${slot2}`;
      let nextForm = setAtPath(prev, ["network", "sim", "slot1Type"], slot1);
      nextForm = setAtPath(nextForm, ["network", "sim", "slot2Type"], slot2);
      nextForm = setAtPath(nextForm, ["network", "sim", "config"], config);
      nextForm = setAtPath(nextForm, ["network", "sim", "hybrid"], config.toLowerCase().includes("hybrid"));
      return nextForm;
    });
  }

  function toggleBluetoothVersion(version: string) {
    setForm((prev) => {
      const selected = normalizeBluetoothVersion(prev.network?.bluetooth || "");
      return setAtPath(prev, ["network", "bluetooth"], selected === version ? "" : version);
    });
  }

  function toggleWifiVersion(version: string) {
    setForm((prev) => {
      const selected = normalizeWifiVersion(prev.network?.wifi?.version || "");
      return setAtPath(prev, ["network", "wifi", "version"], selected === version ? "" : version);
    });
  }

  function toggleUsbVersion(version: string) {
    setForm((prev) => {
      const selected = normalizeUsbVersion(prev.network?.usb?.version);
      return setAtPath(prev, ["network", "usb", "version"], selected === version ? [] : [version]);
    });
  }

  function normalizeOsVersion(value: string): string {
    const cleaned = String(value || "").replace(/^((android|ios|i\s*os)\b[\s-]*)+/i, "").replace(/[^0-9.]/g, "");
    const [whole = "", ...decimalParts] = cleaned.split(".");
    return decimalParts.length > 0 ? `${whole}.${decimalParts.join("")}` : whole;
  }

  function updateSoftwareOsName(next?: "android" | "ios") {
    setForm((prev) => {
      const nextName = next === "android" ? "Android" : next === "ios" ? "iOS" : "";
      const currentVersion = cleanText(prev.software?.os?.version);
      const nextVersion = normalizeOsVersion(currentVersion);
      let nextForm = setAtPath(prev, ["software", "os", "name"], nextName);
      nextForm = setAtPath(nextForm, ["software", "os", "version"], nextVersion);
      return nextForm;
    });
  }

  function updateSoftwareOsVersion(value: string) {
    setForm((prev) => setAtPath(prev, ["software", "os", "version"], normalizeOsVersion(value)));
  }

  function removeLaunchVariant(index: number) {
    setForm((prev) => {
      const currentVariants = Array.isArray(prev.general?.variants) ? [...prev.general.variants] : [];
      const nextVariants = currentVariants.filter((_, itemIndex) => itemIndex !== index);
      const safeVariants = nextVariants.length > 0 ? nextVariants : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }];
      return setAtPath(prev, ["general", "variants"], safeVariants);
    });
    setPendingLaunchVariantDeleteIndex(null);
  }

  function moveLaunchVariant(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const variants = Array.isArray(prev.general?.variants) ? [...prev.general.variants] : [];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= variants.length) return prev;
      [variants[index], variants[targetIndex]] = [variants[targetIndex], variants[index]];
      return setAtPath(prev, ["general", "variants"], variants);
    });
    setPendingLaunchVariantDeleteIndex(null);
  }

  function addLaunchVariant() {
    setForm((prev) => {
      const variants = Array.isArray(prev.general?.variants) ? [...prev.general.variants] : [];
      variants.push({ ram: "", storage: "", launchPrice: undefined, livePrice: undefined });
      return setAtPath(prev, ["general", "variants"], variants);
    });
  }

  function removeSensor(sensorLabel: string) {
    setForm((prev) => ({
      ...prev,
      sensors: (prev.sensors || []).filter((item) => cleanText(item).toLowerCase() !== cleanText(sensorLabel).toLowerCase()),
    }));
  }

  function updateAdditionalSensors(value: string) {
    setForm((prev) => {
      const known = (prev.sensors || []).filter((item) => sensorOptionMap.has(normalizeSensorBaseKey(item)));
      return { ...prev, sensors: [...known, ...splitCsv(value)] };
    });
  }

  function changeNormalDimensionMode(nextMode: "same" | "variant") {
    setForm((prev) => {
      const current = Array.isArray(prev.design?.normalDimensionVariants) && prev.design.normalDimensionVariants.length > 0
        ? prev.design.normalDimensionVariants
        : [createEmptyNormalDimensionVariant()];
      const first = current[0] || createEmptyNormalDimensionVariant();
      const variants = nextMode === "variant"
        ? (() => {
            const colors = splitCsv(first.color || "");
            return (colors.length ? colors : [""]).map((color, index) => index === 0 ? { ...first, color } : { color });
          })()
        : [{ ...first, color: Array.from(new Set(current.flatMap((item) => splitCsv(item.color || "")))).join(", ") }];
      return setAtPath(setAtPath(prev, ["design", "normalDimensionMode"], nextMode), ["design", "normalDimensionVariants"], variants);
    });
  }

  function changeDesignFormFactor(nextFormFactor: string) {
    setForm((prev) => {
      const current = normalizeDesignFormFactor(cleanText(prev.design?.formFactor) || "bar");
      const currentGroup = current === "flip_fold" || current === "book_fold" ? "fold" : current;
      const nextNormalized = normalizeDesignFormFactor(nextFormFactor);
      const nextGroup = nextNormalized === "flip_fold" || nextNormalized === "book_fold" ? "fold" : nextNormalized;
      const preserveBodyData = currentGroup === nextGroup;
      return {
        ...prev,
        design: {
          ...prev.design,
          formFactor: nextFormFactor,
          ...(preserveBodyData ? {} : {
            dimensions: {},
            dimensionsByPosture: {},
            normalDimensionMode: "same",
            postureDimensionModes: {},
            postureNotes: {},
            normalDimensionVariants: [createEmptyNormalDimensionVariant()],
            postureDimensionVariants: [],
            weight: [],
            colors: [],
          }),
        },
      };
    });
    setPendingNormalDimensionVariantDeleteIndex(null);
    setPendingPostureDimensionVariantDeleteIndex(null);
  }

  function changePostureDimensionMode(posture: string, nextMode: "same" | "variant") {
    setForm((prev) => {
      const current = Array.isArray(prev.design?.postureDimensionVariants) ? prev.design.postureDimensionVariants : [];
      const matches = current.filter((item) => cleanText(item?.posture).toLowerCase() === cleanText(posture).toLowerCase());
      const base = prev.design?.dimensionsByPosture?.[posture];
      const first = { ...createEmptyPostureDimensionVariant(posture), ...(base || {}), ...(matches[0] || {}) };
      const replacement = nextMode === "variant"
        ? (() => {
            const colors = splitCsv(first.color || "");
            return (colors.length ? colors : [""]).map((color, index) => index === 0 ? { ...first, posture, color } : createEmptyPostureDimensionVariant(posture) && { posture, color });
          })()
        : [{ ...first, posture, color: Array.from(new Set(matches.flatMap((item) => splitCsv(item.color || "")))).join(", ") }];
      const remaining = current.filter((item) => cleanText(item?.posture).toLowerCase() !== cleanText(posture).toLowerCase());
      const next = setAtPath(prev, ["design", "postureDimensionVariants"], [...remaining, ...replacement]);
      return setAtPath(next, ["design", "postureDimensionModes", posture], nextMode);
    });
  }

  function insertNormalDimensionVariantAfter(index: number) {
    setForm((prev) => {
      const current = Array.isArray(prev.design?.normalDimensionVariants) ? [...prev.design.normalDimensionVariants] : [createEmptyNormalDimensionVariant()];
      current.splice(index + 1, 0, createEmptyNormalDimensionVariant());
      return setAtPath(prev, ["design", "normalDimensionVariants"], current);
    });
  }

  function removeNormalDimensionVariant(index: number) {
    setForm((prev) => {
      const current = Array.isArray(prev.design?.normalDimensionVariants) ? [...prev.design.normalDimensionVariants] : [];
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return setAtPath(prev, ["design", "normalDimensionVariants"], next.length > 0 ? next : [createEmptyNormalDimensionVariant()]);
    });
    setPendingNormalDimensionVariantDeleteIndex(null);
  }

  function removePostureDimensionVariant(index: number) {
    setForm((prev) => {
      const defaultPosture = postureOptions[0] || "folded";
      const current = Array.isArray(prev.design?.postureDimensionVariants) ? [...prev.design.postureDimensionVariants] : [];
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return setAtPath(prev, ["design", "postureDimensionVariants"], next.length > 0 ? next : [createEmptyPostureDimensionVariant(defaultPosture)]);
    });
    setPendingPostureDimensionVariantDeleteIndex(null);
  }

  function getPostureDimensionMode(posture: string): "same" | "variant" {
    return cleanText(postureDimensionModes?.[posture]).toLowerCase() === "variant" ? "variant" : "same";
  }

  function getPostureVariantEntries(posture: string): Array<{ item: { posture?: string; color?: string; height?: number; width?: number; depth?: number; weight?: number }; index: number }> {
    const variants = Array.isArray(form.design?.postureDimensionVariants) ? form.design.postureDimensionVariants : [];
    return variants
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => cleanText(item?.posture || "").toLowerCase() === cleanText(posture).toLowerCase());
  }

  function updateSamePostureVariantField(posture: string, key: "color" | "height" | "width" | "depth" | "weight", value: string | number | undefined) {
    if (key === "color") setDimensionColorErrors([]);
    setForm((prev) => {
      const current = Array.isArray(prev.design?.postureDimensionVariants) ? [...prev.design.postureDimensionVariants] : [];
      const matchIndex = current.findIndex((item) => cleanText(item?.posture || "").toLowerCase() === cleanText(posture).toLowerCase());
      if (matchIndex >= 0) {
        current[matchIndex] = { ...(current[matchIndex] || {}), posture, [key]: value };
      } else {
        current.push({ ...createEmptyPostureDimensionVariant(posture), [key]: value });
      }
      return setAtPath(prev, ["design", "postureDimensionVariants"], current);
    });
  }

  function insertPostureDimensionVariantAfterForPosture(posture: string, index: number | null = null) {
    setForm((prev) => {
      const current = Array.isArray(prev.design?.postureDimensionVariants) ? [...prev.design.postureDimensionVariants] : [];
      if (index === null || index < 0 || index >= current.length) {
        current.push(createEmptyPostureDimensionVariant(posture));
        return setAtPath(prev, ["design", "postureDimensionVariants"], current);
      }
      current.splice(index + 1, 0, createEmptyPostureDimensionVariant(posture));
      return setAtPath(prev, ["design", "postureDimensionVariants"], current);
    });
  }

  function getPostureBaseDimensions(posture: string): { height?: number; width?: number; depth?: number; weight?: number } {
    const depthRaw = form.design?.dimensionsByPosture?.[posture]?.depth;
    return {
      height: form.design?.dimensionsByPosture?.[posture]?.height,
      width: form.design?.dimensionsByPosture?.[posture]?.width,
      depth: Array.isArray(depthRaw) ? depthRaw[0] : depthRaw,
      weight: form.design?.dimensionsByPosture?.[posture]?.weight,
    };
  }

  function copyPostureDimensions(fromPosture: string, toPosture: string) {
    setForm((prev) => {
      const sourceBase = prev.design?.dimensionsByPosture?.[fromPosture] || {};
      const sourceEntries = (prev.design?.postureDimensionVariants || []).filter(
        (item) => cleanText(item?.posture).toLowerCase() === cleanText(fromPosture).toLowerCase()
      );
      const sourceRows = sourceEntries.length > 0
        ? sourceEntries
        : [{ ...createEmptyPostureDimensionVariant(fromPosture), ...sourceBase }];
      const targetIsVariant = cleanText(prev.design?.postureDimensionModes?.[toPosture]).toLowerCase() === "variant";
      const copiedRows = targetIsVariant
        ? sourceRows.flatMap((item) => {
            const colors = splitCsv(item.color || "");
            return (colors.length > 0 ? colors : [""]).map((color) => ({
              ...createEmptyPostureDimensionVariant(toPosture),
              ...item,
              posture: toPosture,
              color,
            }));
          })
        : [{
            ...createEmptyPostureDimensionVariant(toPosture),
            ...sourceRows[0],
            posture: toPosture,
            color: Array.from(new Set(sourceRows.flatMap((item) => splitCsv(item.color || "")))).join(", "),
          }];
      const remaining = (prev.design?.postureDimensionVariants || []).filter(
        (item) => cleanText(item?.posture).toLowerCase() !== cleanText(toPosture).toLowerCase()
      );
      let next = setAtPath(prev, ["design", "dimensionsByPosture", toPosture], {
        ...sourceBase,
        height: sourceBase.height,
        width: sourceBase.width,
        depth: sourceBase.depth,
        weight: sourceBase.weight,
      });
      next = setAtPath(next, ["design", "postureDimensionVariants"], [...remaining, ...copiedRows]);
      return next;
    });
  }

  function normalizeLookupKey(value: string): string {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeTextToken(value: string): string {
    const compact = String(value || "").trim().replace(/\s+/g, " ");
    if (!compact) return "";
    const alias = helperAliasMap[normalizeLookupKey(compact)];
    return alias || compact;
  }

  function normalizeCsvArray(values: string[]): string[] {
    const output: string[] = [];
    const seen = new Set<string>();

    values.forEach((item) => {
      const normalized = normalizeTextToken(item);
      if (!normalized) return;
      const key = normalizeLookupKey(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      output.push(normalized);
    });

    return output;
  }

  function normalizeSmartphoneHelperTerms(value: unknown): unknown {
    if (typeof value === "string") {
      if (value.includes(",")) return splitCsv(value).map(normalizeTextToken).join(", ");
      return normalizeTextToken(value);
    }
    if (Array.isArray(value)) return value.map((item) => normalizeSmartphoneHelperTerms(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeSmartphoneHelperTerms(item)]));
    }
    return value;
  }

  function applyPackageContentSuggestion(suggestion: string) {
    const committed = packageContentsInput
      .split(",")
      .slice(0, -1)
      .map((item) => item.trim())
      .filter(Boolean);
    const nextItems = [...committed, suggestion];
    setPackageContentsInput(`${nextItems.join(", ")}, `);
    updatePath(["general", "packageContents"], nextItems);
    setShowPackageSuggestions(true);
  }

  function updatePackageContents(nextItems: string[]) {
    const cleaned = normalizeCsvArray(nextItems);
    setPackageContentsInput(formatCsv(cleaned));
    updatePath(["general", "packageContents"], cleaned);
  }

  function buildPackageContentsFromInputs(input: {
    handset: string;
    charger: boolean;
    chargerLabel: string;
    cable: string;
    converters: string[];
    protectiveFilm: string;
    protectiveCase: string;
    stylusPen: string;
    simEjectorTool: string;
    other: string;
    documentation: string;
  }): string[] {
    const ordered: string[] = [];
    if (cleanText(input.handset)) ordered.push(cleanText(input.handset));
    if (input.charger) ordered.push(cleanText(input.chargerLabel) || "22W In-Box Charger");
    if (cleanText(input.cable)) ordered.push(cleanText(input.cable));
    input.converters.forEach((item) => {
      const cleaned = cleanText(item);
      if (cleaned) ordered.push(cleaned);
    });
    if (cleanText(input.protectiveFilm)) ordered.push(cleanText(input.protectiveFilm));
    if (cleanText(input.protectiveCase)) ordered.push(cleanText(input.protectiveCase));
    if (cleanText(input.stylusPen)) ordered.push(cleanText(input.stylusPen));
    if (cleanText(input.simEjectorTool)) ordered.push(cleanText(input.simEjectorTool));
    if (cleanText(input.other)) ordered.push(cleanText(input.other));
    if (cleanText(input.documentation)) ordered.push(cleanText(input.documentation));
    return ordered;
  }

  const editRow = useCallback((row: Product) => {
    setEditingId(row.id || null);
    setDateValidationErrors({ announceDate: "", launchDate: "" });
    setPendingVariantDeleteIndex(null);
    setSmartphoneColorsDraft((row.design?.colors || []).join(", "));
    setForm({
      ...emptyProduct(deviceType),
      ...row,
      deviceType,
      slug: row.slug,
      images: row.images || [],
      imageItems: getProductImageItems(row),
      allColorImages: Array.isArray(row.allColorImages) ? row.allColorImages : [],
      imageVariants: Array.isArray(row.imageVariants) ? row.imageVariants : [],
      specs: row.specs || {},
      performance: row.performance || {},
      camera: row.camera || {},
      frontCamera: row.frontCamera || {},
      rearCamera: row.rearCamera || {},
      security: row.security || {},
      sensors: row.sensors || [],
      network: row.network || {},
      software: row.software || {},
      design: row.design || {},
      general: row.general || {},
      memoryStorage: {
        ...(row.memoryStorage || {}),
        variantGroups:
          Array.isArray(row.memoryStorage?.variantGroups) && row.memoryStorage.variantGroups.length > 0
            ? row.memoryStorage.variantGroups
            : Array.isArray(row.variants) && row.variants.length > 0
              ? row.variants.map((v) => ({
                  model: v.model || "",
                  ram: v.ram || "",
                  ramType: v.ramType || "",
                  storage: v.storage || "",
                  storageType: v.storageType || "",
                  virtualRam: v.virtualRam || "",
                }))
              : [{ model: "", ram: "", ramType: "", storage: "", storageType: "", virtualRam: "" }],
      },
      variants: row.variants || [],
      battery: row.battery || {},
      display: row.display || {},
      displays: row.displays || [],
      priceLive: row.priceLive || { amount: 0, source: "manual", updatedAt: "" },
      ratings: row.ratings || {},
      affiliateLinks: row.affiliateLinks || {},
      compareSuggestions: row.compareSuggestions || [],
      pros: row.pros || [],
      cons: row.cons || [],
      tags: row.tags || [],
    });
    setMessage("");
    setError("");
    setPackageContentsInput(formatCsv(row.general?.packageContents));
  }, [deviceType]);

  useEffect(() => {
    setForm((prev) => {
      const next = syncMemoryProductData(prev);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [form.general?.variants, form.memoryStorage?.variantMode, form.memoryStorage?.commonRamType, form.memoryStorage?.commonStorageType, form.memoryStorage?.expandableStorage?.max, form.memoryStorage?.expandableStorage?.slotType, form.memoryStorage?.expandableStorage?.supported, form.memoryStorage?.expandableStorage?.types, form.memoryStorage?.features]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    const requestedId = searchParams.get("id");

    if (requestedView !== "editor") {
      if (viewMode !== "list") setViewMode("list");
      return;
    }

    if (!requestedId) {
      if (viewMode !== "editor") setViewMode("editor");
      return;
    }

    const row = rows.find((item) => {
      const rowId = String(item.id || item.slug || "");
      const rowSlug = String(item.slug || "");
      return rowId === requestedId || rowSlug === requestedId;
    });
    if (!row) return;

    const rowEditingId = row.id || null;
    if (viewMode === "editor" && editingId === rowEditingId) return;
    editRow(row);
    setViewMode("editor");
  }, [editRow, editingId, rows, searchParamsKey, searchParams, viewMode]);

  function resetForm() {
    setEditingId(null);
    setDateValidationErrors({ announceDate: "", launchDate: "" });
    setPendingVariantDeleteIndex(null);
    setForm(emptyProduct(deviceType));
    setSmartphoneColorsDraft("");
    setFlipkartSourceUrl("");
    setPackageContentsInput("");
    setMessage("");
    setError("");
  }

  function updateCreateBrand(nextBrand: string) {
    const previousBrand = createBrand.trim();
    setCreateBrand(nextBrand);
    if (deviceType !== "smartphone") return;
    setCreateTitle((previousTitle) => {
      const title = previousTitle.trim();
      const wasOnlyPreviousBrand = !title || (previousBrand && title.toLowerCase() === previousBrand.toLowerCase());
      return wasOnlyPreviousBrand ? (nextBrand ? `${nextBrand} ` : "") : previousTitle;
    });
  }

  function selectCreateBrand(brand: string) {
    updateCreateBrand(brand);
    setShowCreateBrandSuggestions(false);
  }

  async function startCreateFromQuickForm() {
    const name = createTitle.trim();
    const brand = createBrand.trim();
    if (!name || !brand || !createSlug || isCreateDocDuplicate) return;

    const newProduct = {
      ...emptyProduct(deviceType),
      deviceType,
      name,
      brand,
      slug: createSlug,
    };

    setQuickCreating(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(json.error || `Failed to create ${pageTitle.toLowerCase()}.`);

      const id = json.id || createSlug;
      setEditingId(id);
      setPendingVariantDeleteIndex(null);
      setForm({ ...newProduct, id });
      setFlipkartSourceUrl("");
      setPackageContentsInput("");
      setMessage(`${pageTitle} draft created. Add the remaining details and save updates when ready.`);
      setViewMode("editor");
      goToEditorView(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to create ${pageTitle.toLowerCase()}.`);
    } finally {
      setQuickCreating(false);
    }
  }

  function onGenerateFlipkartLink() {
    setError("");
    setMessage("");
    try {
      const generated = buildFlipkartAffiliateUrl(flipkartSourceUrl, flipkartAffiliateId);
      if (!generated) {
        setError("Enter a Flipkart product URL first.");
        return;
      }
      setField("affiliateLinks", { ...form.affiliateLinks, flipkart: generated });
      setMessage("Flipkart affiliate link generated.");
    } catch {
      setError("Invalid Flipkart URL.");
    }
  }

  function onAutoSuggestProsCons() {
    const suggested = buildAutoProsCons(form);
    setField("pros", suggested.pros);
    setField("cons", suggested.cons);
    setMessage("Auto suggestions applied. You can edit them before saving.");
    setError("");
  }

  function addCloudinaryImageUrl() {
    const value = imageUrlDraft.trim();
    if (!value) {
      setError("Paste a secure Cloudinary delivery URL.");
      return;
    }
    if (!isCloudinaryDeliveryUrl(value)) {
      setError("Paste a secure Cloudinary delivery URL.");
      return;
    }
    const color = imagePurposeDraft === "All colors" ? "All colors" : canonicalizeColor(imageColorDraft);
    const item = { purpose: imagePurposeDraft, color, url: value };
    setField("imageItems", [...(form.imageItems || []), item]);
    setImageUrlDraft("");
    setImageColorDraft(color === "All colors" ? "" : color);
    setError("");
    setMessage("Cloudinary image added. Save the product to keep the change.");
  }

  async function copyCloudinaryDeliveryUrlPrefix() {
    try {
      await navigator.clipboard.writeText(CLOUDINARY_DELIVERY_URL_PREFIX);
      setError("");
      setMessage("Cloudinary delivery URL prefix copied.");
    } catch {
      setError("Could not copy automatically. Select and copy the URL prefix shown above.");
    }
  }

  function addAutomaticImageOptimizations() {
    const value = imageUrlDraft.trim();
    if (!value) {
      setError("Paste a Cloudinary delivery URL first.");
      return;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || !(parsed.hostname === "cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com"))) {
        setError("Paste a secure Cloudinary delivery URL.");
        return;
      }

      const uploadPath = /\/image\/upload\/(.*)$/;
      const match = parsed.pathname.match(uploadPath);
      if (!match) {
        setError("This URL must include /image/upload/.");
        return;
      }

      const pathParts = match[1].split("/");
      const existingTransforms = new Set(pathParts.flatMap((part) => part.split(",")));
      const missingTransforms = ["f_auto", "q_auto"].filter((transform) => !existingTransforms.has(transform));
      if (missingTransforms.length > 0) {
        parsed.pathname = parsed.pathname.replace(uploadPath, `/image/upload/${missingTransforms.join("/")}/$1`);
      }

      setImageUrlDraft(parsed.toString());
      setError("");
      setMessage(missingTransforms.length ? "Added automatic format and quality optimization to the URL." : "This URL already has f_auto and q_auto.");
    } catch {
      setError("Paste a valid Cloudinary delivery URL.");
    }
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (dateValidationErrors.announceDate || dateValidationErrors.launchDate) {
      const dateLabel = dateValidationErrors.announceDate ? "Announce Date" : "Launch Date";
      const dateProblem = dateValidationErrors.announceDate || dateValidationErrors.launchDate;
      const targetId = dateValidationErrors.announceDate ? "announce-date-day" : "launch-date-day";
      setError(`Fix ${dateLabel}: ${dateProblem}`);
      setMessage("");
      requestAnimationFrame(() => {
        const field = document.getElementById(targetId);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.focus();
      });
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");

    const normalizedForm = normalizeSmartphoneHelperTerms(form) as Product;
    const canonicalDimensionValue = (value?: string) => normalizePhoneColors(value || "").map((color) => canonicalizeColor(color)).join(", ");
    const normalizedDesign = {
      ...(normalizedForm.design || {}),
      normalDimensionVariants: normalizedForm.design?.normalDimensionVariants?.map((item) => ({ ...item, color: canonicalDimensionValue(item.color) })),
      postureDimensionVariants: normalizedForm.design?.postureDimensionVariants?.map((item) => ({ ...item, color: canonicalDimensionValue(item.color) })),
    };
    const normalizedForSave = { ...normalizedForm, design: normalizedDesign };
    const imageItems = (normalizedForm.imageItems || []).filter((item) => item.url.trim()).map((item) => ({
      purpose: item.purpose || "Other",
      color: item.purpose === "All colors" || item.color.trim().toLocaleLowerCase() === "all colors" ? "All colors" : canonicalizeColor(item.color),
      url: item.url.trim(),
    }));
    const definedColors = normalizedDesign.colors || [];
    const dimensionColorFields: Array<{ path: string; label: string; color: string }> = [];
    (normalizedForm.design?.normalDimensionVariants || []).forEach((item, index) => {
      normalizePhoneColors(item.color || "").forEach((color) => dimensionColorFields.push({ path: `design.normalDimensionVariants.${index}.color`, label: `Body Size & Weight color ${index + 1}`, color }));
    });
    (normalizedForm.design?.postureDimensionVariants || []).forEach((item, index) => {
      normalizePhoneColors(item.color || "").forEach((color) => dimensionColorFields.push({ path: `design.postureDimensionVariants.${index}.color`, label: `Body Size & Weight ${item.posture || "posture"} color ${index + 1}`, color }));
    });
    const invalidDimensionColors = dimensionColorFields.filter(({ color }) => !definedColors.some((defined) => defined.trim().toLocaleLowerCase() === color.trim().toLocaleLowerCase()));
    if (invalidDimensionColors.length > 0) {
      setDimensionColorErrors(invalidDimensionColors);
      setError(`Fix ${invalidDimensionColors.length} Body Size & Weight color${invalidDimensionColors.length === 1 ? "" : "s"} before saving. Use a Smartphone Colors name.`);
      setMessage("");
      requestAnimationFrame(() => {
        const field = document.querySelector(`[data-color-path="${invalidDimensionColors[0].path}"]`);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        (field as HTMLElement | null)?.focus();
      });
      setSaving(false);
      return;
    }
    setDimensionColorErrors([]);
    const invalidImageColors = imageItems.flatMap((item, index) => {
      if (!item.color || item.color === "All colors") return [];
      const canonical = definedColors.find((color) => color.trim().toLocaleLowerCase() === item.color.toLocaleLowerCase());
      return canonical ? [] : [{ index, color: item.color }];
    });
    if (invalidImageColors.length > 0) {
      const errors = invalidImageColors.map(({ index, color }) => ({ index, color, message: `“${color}” is not in Smartphone Colors.` }));
      setImageColorErrors(errors);
      setError(`Fix ${errors.length} image color${errors.length === 1 ? "" : "s"} before saving. Add the color to Smartphone Colors or change the image row.`);
      setMessage("");
      const firstIndex = errors[0].index;
      requestAnimationFrame(() => {
        const field = document.querySelector(`[aria-label="Image ${firstIndex + 1} color"]`);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        (field as HTMLElement | null)?.focus();
      });
      setSaving(false);
      return;
    }
    setImageColorErrors([]);
    const allColorImages = imageItems.filter((item) => item.purpose === "All colors" || item.color.toLowerCase() === "all colors").map((item) => item.url);
    const variantMap = new Map<string, { color: string; images: string[] }>();
    imageItems.filter((item) => item.color && item.color.toLowerCase() !== "all colors").forEach((item) => {
      const key = item.color.trim().toLowerCase();
      const existing = variantMap.get(key);
      if (existing) existing.images.push(item.url);
      else variantMap.set(key, { color: item.color.trim(), images: [item.url] });
    });
    const normalizedName = normalizeTextToken(normalizedForm.name);
    const normalizedBrand = normalizeTextToken(normalizedForm.brand);
    const normalizedTags = normalizeCsvArray(normalizedForm.tags || []);

    const payload: Product = {
      ...normalizedForSave,
      deviceType,
      name: normalizedName,
      brand: normalizedBrand,
      slug: finalSlug,
      tags: normalizedTags,
      pros: (normalizedForm.pros || []).filter(Boolean),
      cons: (normalizedForm.cons || []).filter(Boolean),
      compareSuggestions: (normalizedForm.compareSuggestions || []).map((item) => slugify(item)).filter(Boolean),
      imageItems,
      images: imageItems.map((item) => item.url),
      allColorImages,
      imageVariants: Array.from(variantMap.values()),
      sensors: (normalizedForm.sensors || []).filter(Boolean),
      battery: {
        ...(normalizedForm.battery || {}),
        capacity: cleanText(String(normalizedForm.battery?.capacityTypical ?? "")) || cleanText(String(normalizedForm.battery?.capacity ?? "")),
      },
    };

    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to save product.");
      }

      const savedId = json.id || editingId || payload.slug;
      setEditingId(savedId);
      setForm({ ...payload, id: savedId });
      setMessage(editingId ? `${pageTitle} updated.` : `${pageTitle} created. You can now preview it.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: Product["status"]) {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Status update failed.");
  }

  async function moveToRecentlyDeleted(id?: string) {
    if (!id) return;
    if (!window.confirm(`Move this ${deviceType} to Recently Deleted?`)) return;

    setError("");
    setMessage("");

    try {
      await changeStatus(id, "recently_deleted");
      setMessage(`${pageTitle} moved to recently deleted.`);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move.");
    }
  }

  async function restoreProduct(id?: string) {
    if (!id) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "draft");
      setMessage(`${pageTitle} restored as draft.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    }
  }

  async function deletePermanently(id?: string) {
    if (!id) return;
    if (!window.confirm(`Delete this ${deviceType} permanently?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
      setMessage(`${pageTitle} deleted permanently.`);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent delete failed.");
    }
  }

  async function moveSelectedToRecentlyDeleted() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) to Recently Deleted?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "recently_deleted")));
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s moved to recently deleted.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk move failed.");
    }
  }

  async function restoreSelectedProducts() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Restore ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) as draft?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "draft")));
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s restored as draft.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk restore failed.");
    }
  }

  async function forceDeleteSelectedProducts() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) permanently?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
        })
      );
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s deleted permanently.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk permanent delete failed.");
    }
  }

  const panelSummary = `${deviceType === "smartphone" ? "Smartphone" : "Tablet"} admin editor with all main public spec fields.`;

  return (
    <main className="space-y-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {viewMode === "list" ? (
        <>
          <section className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{pageTitle}s</h2>
                <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Create {pageTitle}</h3>
                  <p className="mt-1 text-sm text-slate-600">Start editing a new {pageTitle.toLowerCase()}.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Quick Create</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="relative grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Brand</span>
                  <input
                    value={createBrand}
                    onChange={(e) => {
                      updateCreateBrand(e.target.value);
                      setShowCreateBrandSuggestions(true);
                    }}
                    onFocus={() => setShowCreateBrandSuggestions(true)}
                    onBlur={() => setShowCreateBrandSuggestions(false)}
                    placeholder="Samsung"
                    autoComplete="off"
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                  {deviceType === "smartphone" && showCreateBrandSuggestions && filteredCreateBrandSuggestions.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {filteredCreateBrandSuggestions.map((brand) => (
                        <button
                          key={`quick-create-brand-${brand}`}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectCreateBrand(brand);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Slug</span>
                  <input
                    value={createSlug}
                    onChange={(e) => {
                      setCreateSlugInput(e.target.value);
                      setCreateSlugEdited(true);
                    }}
                    placeholder={`${deviceType === "smartphone" ? "samsung-galaxy-s25" : "samsung-galaxy-tab-s10"}`}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Title ({pageTitle} Name)</span>
                  <input
                    value={createTitle}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCreateTitle(next);
                      if (!createSlugEdited) setCreateSlugInput(slugify(next));
                    }}
                    list={helperSuggestions.length ? "suggest-helper" : undefined}
                    placeholder={`${deviceType === "smartphone" ? "Samsung Galaxy S25" : "Samsung Galaxy Tab S10"}`}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Document ID</span>
                  <input value={createDocId} readOnly className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600" />
                </label>
              </div>

              <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={startCreateFromQuickForm}
                  disabled={!createTitle || !createBrand || !createSlug || isCreateDocDuplicate || quickCreating}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
                    !createTitle || !createBrand || !createSlug || isCreateDocDuplicate || quickCreating ? "cursor-not-allowed bg-slate-400" : "bg-blue-700 shadow-sm"
                  }`}
                >
                  {quickCreating ? "Creating..." : `Create New ${pageTitle}`}
                </button>
              </div>
              {isCreateDocDuplicate ? (
                <p className="mt-2 text-center text-xs font-semibold text-rose-700">
                  Slug/Document ID already exists. Please change slug to a unique value.
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{pageTitle} List</h2>
                <p className="mt-1 text-sm text-slate-600">Search and filter existing {pageTitle.toLowerCase()}s.</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search by ${pageTitle.toLowerCase()} name, brand, slug, id...`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />

              <div className="flex flex-wrap gap-2">
                {PRODUCT_STATUS_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${
                      statusFilter === item.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label} ({statusCounts.get(item.key) || 0})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBrandFilter([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${brandFilter.length === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All Brands ({rows.filter((row) => String(row.brand || "").trim()).length})
                </button>
                {brandOptions.filter((item) => item !== "all").map((item) => {
                  const selected = brandFilter.some((value) => value.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={`brand-chip-${item}`}
                      type="button"
                      onClick={() => setBrandFilter((prev) => selected ? prev.filter((value) => value.toLowerCase() !== item.toLowerCase()) : [...prev, item])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {item} ({brandCounts.get(item) || 0})
                    </button>
                  );
                })}
              </div>

              {statusFilter === "recently_deleted" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={restoreSelectedProducts}
                    disabled={selectedIds.length === 0}
                    className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                  >
                    Restore Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={forceDeleteSelectedProducts}
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
                    <th className="px-4 py-3 font-semibold">{pageTitle}</th>
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id || row.slug} className="hover:bg-slate-50/70">
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
                        <p className="text-xs text-slate-500">{row.slug || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{row.brand || "-"}</td>
                      <td className="px-4 py-3 text-slate-800">{"\u20B9"}{row.price}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={getEditHref(String(row.id || row.slug || ""))}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          {row.status === "recently_deleted" ? (
                            <>
                              <button type="button" onClick={() => restoreProduct(row.id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                                Restore
                              </button>
                              <button type="button" onClick={() => deletePermanently(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                                Delete Forever
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => moveToRecentlyDeleted(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No {pageTitle.toLowerCase()}s found for current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-4">
                  <button type="button" onClick={goToListView} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
                    &larr; Back to list
                  </button>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">{editingId ? `Edit ${pageTitle}` : `Add ${pageTitle}`}</h1>
                <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
                <p className="mt-1 text-xs text-slate-500">{panelSummary}</p>
              </div>
            </div>
          </section>

          <form onSubmit={onSubmit} className="space-y-4">
        <Section title="Basic Details" description="Core product identity, pricing, status, tags, links, and quick summary content.">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeTextToken(e.target.value);
                  if (normalized && normalized !== e.target.value) setField("name", normalized);
                }}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder={`${deviceType === "smartphone" ? "Smartphone" : "Tablet"} name`}
                required
              />
            </Field>
            <Field label="Slug">
              <TextInput value={finalSlug} readOnly className="bg-slate-50 text-slate-600" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Brand">
              <TextInput
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeTextToken(e.target.value);
                  if (normalized && normalized !== e.target.value) setField("brand", normalized);
                }}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="Brand"
                required
              />
            </Field>
            <Field label="Price">
              <TextInput
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setField("price", Number(e.target.value || 0))}
                placeholder="Price"
                required
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setField("status", e.target.value as Product["status"])}>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="recently_deleted">Recently Deleted</option>
              </Select>
            </Field>
            <Field label="Trending">
              <Select value={formatBooleanSelect(form.trending)} onChange={(e) => setField("trending", parseBooleanSelect(e.target.value) || false)}>
                <option value="">No</option>
                <option value="true">Yes</option>
              </Select>
            </Field>
          </div>

          {form.status === "scheduled" ? (
            <Field label="Scheduled At">
              <TextInput
                type="datetime-local"
                value={String(form.scheduledAt || "")}
                onChange={(e) => setField("scheduledAt", e.target.value)}
              />
            </Field>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
            <Field label="Live Price Amount">
              <TextInput
                type="number"
                min={0}
                value={form.priceLive?.amount ?? ""}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: Number(e.target.value || 0),
                    source: form.priceLive?.source || "manual",
                    updatedAt: form.priceLive?.updatedAt || "",
                  })
                }
              />
            </Field>
            <Field label="Live Price Source">
              <Select
                value={form.priceLive?.source || "manual"}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: form.priceLive?.amount || 0,
                    source: e.target.value,
                    updatedAt: form.priceLive?.updatedAt || "",
                  })
                }
              >
                <option value="manual">Manual</option>
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
              </Select>
            </Field>
            <Field label="Live Price Updated At">
              <TextInput
                type="date"
                value={String(form.priceLive?.updatedAt || "")}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: form.priceLive?.amount || 0,
                    source: form.priceLive?.source || "manual",
                    updatedAt: e.target.value,
                  })
                }
              />
            </Field>
          </div>

          <Field label="Short Description">
            <TextArea value={form.shortDescription || ""} onChange={(e) => setField("shortDescription", e.target.value)} placeholder="Short product summary" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tags">
              <TextInput
                value={formatCsv(form.tags)}
                onChange={(e) => setField("tags", splitCsv(e.target.value))}
                onBlur={(e) => setField("tags", normalizeCsvArray(splitCsv(e.target.value)))}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="new, gaming, flagship"
              />
            </Field>
            <Field label="Compare Suggestions">
              <TextInput
                value={formatCsv(form.compareSuggestions)}
                onChange={(e) => setField("compareSuggestions", splitCsv(e.target.value).map((item) => slugify(item)))}
                placeholder="product-a, product-b"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amazon Affiliate URL">
              <TextInput value={form.affiliateLinks.amazon || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, amazon: e.target.value })} />
            </Field>
            <Field label="Flipkart Affiliate URL">
              <TextInput value={form.affiliateLinks.flipkart || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, flipkart: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Flipkart Link Helper</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Normal Flipkart URL">
                <TextInput value={flipkartSourceUrl} onChange={(e) => setFlipkartSourceUrl(e.target.value)} placeholder="Paste Flipkart URL" />
              </Field>
              <Field label="Affiliate ID">
                <TextInput value={flipkartAffiliateId} onChange={(e) => setFlipkartAffiliateId(e.target.value)} placeholder="Affiliate ID (optional)" />
              </Field>
            </div>
            <button type="button" onClick={onGenerateFlipkartLink} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Generate Flipkart Link
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pros">
              <TextInput value={formatCsv(form.pros)} onChange={(e) => setField("pros", splitCsv(e.target.value))} placeholder="Fast chipset, bright display" />
            </Field>
            <Field label="Cons">
              <TextInput value={formatCsv(form.cons)} onChange={(e) => setField("cons", splitCsv(e.target.value))} placeholder="No charger, average low-light camera" />
            </Field>
          </div>

          <div>
            <button
              type="button"
              onClick={onAutoSuggestProsCons}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Auto Suggest Pros/Cons
            </button>
          </div>
        </Section>

        <Section title="Quick Specs" description="Flat spec fields used for quick summaries, filters, fallbacks, and search helpers.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Processor">
              <TextInput value={form.specs.processor || ""} onChange={(e) => updatePath(["specs", "processor"], e.target.value)} list={helperSuggestions.length ? "suggest-helper" : undefined} />
            </Field>
            <Field label="Chipset Score">
              <TextInput type="number" value={form.specs.chipsetScore ?? ""} onChange={(e) => updatePath(["specs", "chipsetScore"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="RAM">
              <TextInput value={form.specs.ram || ""} onChange={(e) => updatePath(["specs", "ram"], e.target.value)} />
            </Field>
            <Field label="RAM GB">
              <TextInput type="number" value={form.specs.ramGb ?? ""} onChange={(e) => updatePath(["specs", "ramGb"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Storage">
              <TextInput value={form.specs.storage || ""} onChange={(e) => updatePath(["specs", "storage"], e.target.value)} />
            </Field>
            <Field label="Battery">
              <TextInput value={form.specs.battery || ""} onChange={(e) => updatePath(["specs", "battery"], e.target.value)} />
            </Field>
            <Field label="Battery mAh">
              <TextInput type="number" value={form.specs.batteryMah ?? ""} onChange={(e) => updatePath(["specs", "batteryMah"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Charging">
              <TextInput value={form.specs.charging || ""} onChange={(e) => updatePath(["specs", "charging"], e.target.value)} />
            </Field>
            <Field label="Display">
              <TextInput value={form.specs.display || ""} onChange={(e) => updatePath(["specs", "display"], e.target.value)} />
            </Field>
            <Field label="Primary Display">
              <TextInput value={form.specs.primaryDisplay || ""} onChange={(e) => updatePath(["specs", "primaryDisplay"], e.target.value)} />
            </Field>
            <Field label="Secondary Display">
              <TextInput value={form.specs.secondaryDisplay || ""} onChange={(e) => updatePath(["specs", "secondaryDisplay"], e.target.value)} />
            </Field>
            <Field label="Display Size (inch)">
              <TextInput type="number" step="0.1" value={form.specs.displaySizeInch ?? ""} onChange={(e) => updatePath(["specs", "displaySizeInch"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Refresh Rate (Hz)">
              <TextInput type="number" value={form.specs.refreshRateHz ?? ""} onChange={(e) => updatePath(["specs", "refreshRateHz"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Rear Camera">
              <TextInput value={form.specs.rearCamera || ""} onChange={(e) => updatePath(["specs", "rearCamera"], e.target.value)} />
            </Field>
            <Field label="Front Camera">
              <TextInput value={form.specs.frontCamera || ""} onChange={(e) => updatePath(["specs", "frontCamera"], e.target.value)} />
            </Field>
            <Field label="Camera">
              <TextInput value={form.specs.camera || ""} onChange={(e) => updatePath(["specs", "camera"], e.target.value)} />
            </Field>
            <Field label="OS">
              <TextInput value={form.specs.os || ""} onChange={(e) => updatePath(["specs", "os"], e.target.value)} />
            </Field>
            <Field label="Network">
              <TextInput value={form.specs.network || ""} onChange={(e) => updatePath(["specs", "network"], e.target.value)} />
            </Field>
            <Field label="SIM">
              <TextInput value={form.specs.sim || ""} onChange={(e) => updatePath(["specs", "sim"], e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Ratings" description="Manual rating fields used across cards and scoring summaries.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Performance">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.performance ?? ""} onChange={(e) => updatePath(["ratings", "performance"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Camera">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.camera ?? ""} onChange={(e) => updatePath(["ratings", "camera"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Battery">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.battery ?? ""} onChange={(e) => updatePath(["ratings", "battery"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Display">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.display ?? ""} onChange={(e) => updatePath(["ratings", "display"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Overall">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.overall ?? ""} onChange={(e) => updatePath(["ratings", "overall"], parseOptionalNumber(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section
          title="Mobile Details"
          description="Single-entry container for all mobile detail sub-sections from General onward."
          titleRight={(
            <button
              type="button"
              onClick={() => setMobileDetailsVisible((prev) => !prev)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {mobileDetailsVisible ? "Hide Details" : "Show Details"}
            </button>
          )}
        >
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
              {[
                { key: "single_entry", label: "Single Entry" },
                { key: "content_json_csv", label: "Content JSON / CSV" },
                { key: "bulk_json_csv", label: "Bulk JSON / CSV" },
              ].map((item, index) => (
                <button
                  key={`mobile-details-tab-${item.key}`}
                  type="button"
                  onClick={() => setMobileDetailsView(item.key as MobileDetailsView)}
                  className={`px-4 py-2 text-sm font-semibold ${index > 0 ? "border-l border-slate-200" : ""} ${
                    mobileDetailsView === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {mobileDetailsVisible ? (
          <div className="grid gap-3">
          {mobileDetailsView === "single_entry" ? (
        <>
        <div className="sticky top-16 z-40 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Jump To Section</p>
          <div className="flex flex-wrap gap-2">
            {MOBILE_DETAIL_SECTION_LINKS.map((item) => (
              <a
                key={`mobile-section-link-${item.id}`}
                href={`#${item.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <div id="mobile-general" className="scroll-mt-40 [order:1]">
        <Section title="General" description="Launch information and box contents.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Announce Date">
              <DateTripleInput
                key={`announce-${editingId || "new"}-${form.general?.announceDate || ""}`}
                value={String(form.general?.announceDate || "")}
                onChange={(next) => updatePath(["general", "announceDate"], next)}
                onValidationChange={(error) => setDateValidationErrors((current) => ({ ...current, announceDate: error }))}
                idPrefix="announce-date"
              />
            </Field>
            <Field label="Launch Date">
              <DateTripleInput
                key={`launch-${editingId || "new"}-${form.general?.launchDate || ""}`}
                value={String(form.general?.launchDate || "")}
                onChange={(next) => updatePath(["general", "launchDate"], next)}
                onValidationChange={(error) => setDateValidationErrors((current) => ({ ...current, launchDate: error }))}
                idPrefix="launch-date"
              />
            </Field>
            <Field label="Model Number">
              <TextInput value={form.general?.modelNumber || ""} onChange={(e) => updatePath(["general", "modelNumber"], e.target.value)} />
            </Field>
            <Field label="Origin / Country">
              <HelperTermInput suggestions={originCountrySuggestions} value={formatCsv(form.general?.originCountry)} onChange={(value) => updatePath(["general", "originCountry"], splitCsv(value))} commaSeparated />
            </Field>
            <Field label="Smartphone Colors" className="sm:col-span-2">
              <TextInput
                value={smartphoneColorsDraft}
                onChange={(event) => updateSmartphoneColors(event.target.value)}
                placeholder="Dark Black, Ice Blue, Silver"
                aria-describedby="smartphone-colors-help"
                className="w-full"
              />
              <span id="smartphone-colors-help" className="text-xs text-slate-500">Enter one or more colors separated by commas. These names appear on the product page and are used by image rows.</span>
            </Field>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-sm font-extrabold text-slate-900">Package Content</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {packageBaseToggles.map((item) => (
                <label key={`package-toggle-${item.key}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={item.checked}
                    onChange={(e) => {
                      const next = packageBaseToggles.map((entry) => (entry.key === item.key ? { ...entry, checked: e.target.checked } : entry));
                      updatePackageContents(
                        buildPackageContentsFromInputs({
                          handset: (next.find((entry) => entry.key === "handset")?.checked ? next.find((entry) => entry.key === "handset")?.value : "") || "",
                          charger: form.battery?.chargerInBox?.available === true,
                          chargerLabel: `${cleanText(String(form.battery?.chargerInBox?.power ?? "")) || "22"}W In-Box Charger`,
                          cable: selectedCableValue,
                          converters: selectedConverterValues,
                          protectiveFilm: (next.find((entry) => entry.key === "protective_film")?.checked ? next.find((entry) => entry.key === "protective_film")?.value : "") || "",
                          protectiveCase: (next.find((entry) => entry.key === "protective_case")?.checked ? next.find((entry) => entry.key === "protective_case")?.value : "") || "",
                          stylusPen: (next.find((entry) => entry.key === "stylus_pen")?.checked ? next.find((entry) => entry.key === "stylus_pen")?.value : "") || "",
                          simEjectorTool: (next.find((entry) => entry.key === "sim_ejector_tool")?.checked ? next.find((entry) => entry.key === "sim_ejector_tool")?.value : "") || "",
                          other: (next.find((entry) => entry.key === "other")?.checked ? next.find((entry) => entry.key === "other")?.value : "") || "",
                          documentation: (next.find((entry) => entry.key === "documentation")?.checked ? next.find((entry) => entry.key === "documentation")?.value : "") || "",
                        })
                      );
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Cable (Select One)">
                <Select
                  value={selectedCableValue}
                  onChange={(e) =>
                    updatePackageContents(
                      buildPackageContentsFromInputs({
                        handset: packageBaseToggles.find((entry) => entry.key === "handset")?.checked ? packageBaseToggles.find((entry) => entry.key === "handset")?.value || "Handset" : "",
                        charger: form.battery?.chargerInBox?.available === true,
                        chargerLabel: `${cleanText(String(form.battery?.chargerInBox?.power ?? "")) || "22"}W In-Box Charger`,
                        cable: e.target.value,
                        converters: selectedConverterValues,
                        protectiveFilm: packageBaseToggles.find((entry) => entry.key === "protective_film")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_film")?.value || "Protective Film" : "",
                        protectiveCase: packageBaseToggles.find((entry) => entry.key === "protective_case")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_case")?.value || "Protective Case" : "",
                        stylusPen: packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.checked ? packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.value || "Stylus / S Pen" : "",
                        simEjectorTool: packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.checked ? packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.value || "SIM Ejector Tool" : "",
                        other: packageBaseToggles.find((entry) => entry.key === "other")?.checked ? packageBaseToggles.find((entry) => entry.key === "other")?.value || "Other" : "",
                        documentation: packageBaseToggles.find((entry) => entry.key === "documentation")?.checked ? packageBaseToggles.find((entry) => entry.key === "documentation")?.value || "Documentation" : "",
                      })
                    )
                  }
                >
                  <option value="">None</option>
                  {PACKAGE_CABLE_OPTIONS.map((item) => (
                    <option key={`package-cable-${item}`} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="In-Box Charger">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[
                    { label: "No", value: false },
                    { label: "Yes", value: true },
                  ].map((option, index) => (
                    <button
                      key={`package-charger-${option.label.toLowerCase()}`}
                      type="button"
                      onClick={() => {
                        updatePath(["battery", "chargerInBox", "available"], option.value);
                        updatePackageContents(
                          buildPackageContentsFromInputs({
                            handset: packageBaseToggles.find((entry) => entry.key === "handset")?.checked ? packageBaseToggles.find((entry) => entry.key === "handset")?.value || "Handset" : "",
                            charger: option.value,
                            chargerLabel: `${cleanText(String(form.battery?.chargerInBox?.power ?? "")) || "22"}W In-Box Charger`,
                            cable: selectedCableValue,
                            converters: selectedConverterValues,
                            protectiveFilm: packageBaseToggles.find((entry) => entry.key === "protective_film")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_film")?.value || "Protective Film" : "",
                            protectiveCase: packageBaseToggles.find((entry) => entry.key === "protective_case")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_case")?.value || "Protective Case" : "",
                            stylusPen: packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.checked ? packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.value || "Stylus / S Pen" : "",
                            simEjectorTool: packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.checked ? packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.value || "SIM Ejector Tool" : "",
                            other: packageBaseToggles.find((entry) => entry.key === "other")?.checked ? packageBaseToggles.find((entry) => entry.key === "other")?.value || "Other" : "",
                            documentation: packageBaseToggles.find((entry) => entry.key === "documentation")?.checked ? packageBaseToggles.find((entry) => entry.key === "documentation")?.value || "Documentation" : "",
                          })
                        );
                      }}
                      className={`inline-flex h-8 items-center justify-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.battery?.chargerInBox?.available === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              {form.battery?.chargerInBox?.available ? (
                <>
                  <Field label="Charger Power (W)">
                    <TextInput value={String(form.battery?.chargerInBox?.power ?? "")} onChange={(e) => updatePath(["battery", "chargerInBox", "power"], sanitizeDigits(e.target.value, 3))} />
                  </Field>
                  <Field label="Charger Label">
                    <TextInput value={`${cleanText(String(form.battery?.chargerInBox?.power ?? "")) || "22"}W In-Box Charger`} readOnly />
                  </Field>
                </>
              ) : null}
            </div>
            {form.general?.multimediaDetails?.audioJack35mm === false ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PACKAGE_CONVERTER_OPTIONS.map((converter) => {
                const checked = selectedConverterValues.some((item) => normalizeLookupKey(item) === normalizeLookupKey(converter));
                return (
                  <label key={`package-converter-${converter}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="package-converter"
                      checked={checked}
                      onChange={(e) => {
                        const nextConverters = e.target.checked ? [converter] : [];
                        updatePackageContents(
                          buildPackageContentsFromInputs({
                            handset: packageBaseToggles.find((entry) => entry.key === "handset")?.checked ? packageBaseToggles.find((entry) => entry.key === "handset")?.value || "Handset" : "",
                            charger: form.battery?.chargerInBox?.available === true,
                            chargerLabel: `${cleanText(String(form.battery?.chargerInBox?.power ?? "")) || "22"}W In-Box Charger`,
                            cable: selectedCableValue,
                            converters: nextConverters,
                            protectiveFilm: packageBaseToggles.find((entry) => entry.key === "protective_film")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_film")?.value || "Protective Film" : "",
                            protectiveCase: packageBaseToggles.find((entry) => entry.key === "protective_case")?.checked ? packageBaseToggles.find((entry) => entry.key === "protective_case")?.value || "Protective Case" : "",
                            stylusPen: packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.checked ? packageBaseToggles.find((entry) => entry.key === "stylus_pen")?.value || "Stylus / S Pen" : "",
                            simEjectorTool: packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.checked ? packageBaseToggles.find((entry) => entry.key === "sim_ejector_tool")?.value || "SIM Ejector Tool" : "",
                            other: packageBaseToggles.find((entry) => entry.key === "other")?.checked ? packageBaseToggles.find((entry) => entry.key === "other")?.value || "Other" : "",
                            documentation: packageBaseToggles.find((entry) => entry.key === "documentation")?.checked ? packageBaseToggles.find((entry) => entry.key === "documentation")?.value || "Documentation" : "",
                          })
                        );
                      }}
                    />
                    <span>{converter}</span>
                  </label>
                );
              })}
            </div>
            ) : null}
            <Field label="All Selected Package Contents (Public Order)">
              <div className="relative">
                <TextArea
                  value={packageContentsInput}
                  rows={1}
                  className="w-full min-h-10 resize-none overflow-hidden"
                  onInput={(e) => {
                    const textarea = e.currentTarget;
                    textarea.style.height = "auto";
                    textarea.style.height = `${textarea.scrollHeight}px`;
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPackageContentsInput(next);
                    updatePath(["general", "packageContents"], splitCsv(next));
                    setShowPackageSuggestions(true);
                  }}
                  onFocus={(e) => {
                    const textarea = e.currentTarget;
                    textarea.style.height = "auto";
                    textarea.style.height = `${textarea.scrollHeight}px`;
                    setShowPackageSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowPackageSuggestions(false), 120)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === "Tab") && showPackageSuggestions && packageContentMatches.length > 0) {
                      e.preventDefault();
                      applyPackageContentSuggestion(packageContentMatches[0]);
                    }
                  }}
                  placeholder="Handset, 22W In-Box Charger, USB Type-C to Type-C Cable, Type-C to 3.5mm Audio Jack Converter, Protective Film, Protective Case, SIM Ejector Tool, Other, Documentation"
                />
                {showPackageSuggestions && packageContentMatches.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {packageContentMatches.map((item) => (
                      <button
                        key={`package-content-suggestion-${item}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyPackageContentSuggestion(item);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Field>
            <datalist id="suggest-package-content">
              {packageContentSuggestions.map((item) => (
                <option key={`package-datalist-${item}`} value={item} />
              ))}
            </datalist>
          </div>
        </Section>
        </div>

        <div id="mobile-launch-variant" className="hidden">
        <Section title="Launch Variant" description="RAM/storage variant matrix linked with Memory & Storage plus launch and live pricing.">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-slate-900">Launch Variants</p>
              <button type="button" onClick={addLaunchVariant} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">+ Add Variant</button>
            </div>
            <div className="grid gap-3">
              {(form.general?.variants?.length ? form.general.variants : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }]).map((variant, index) => (
                <div key={`general-variant-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-[4.25rem_6.25rem_minmax(12rem,1fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_auto]">
                    <div className="flex items-end gap-1">
                      <button type="button" onClick={() => moveLaunchVariant(index, -1)} disabled={index === 0} className="h-10 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move variant up">↑</button>
                      <button type="button" onClick={() => moveLaunchVariant(index, 1)} disabled={index === (form.general?.variants?.length || 1) - 1} className="h-10 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move variant down">↓</button>
                    </div>
                    <Field label="RAM">
                      <div className="relative">
                        <TextInput className="w-full pr-14" value={sanitizeDigits(variant.ram || "", 3)} maxLength={3} onChange={(e) => {
                          const amount = sanitizeDigits(e.target.value, 3);
                          updatePath(["general", "variants", index, "ram"], amount ? `${amount}GB` : "");
                        }} />
                        <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                      </div>
                    </Field>
                    <Field label="Storage" className="min-w-0">
  <div className="flex h-10 w-full">
    {/* Storage number */}
    <TextInput
      className="min-w-0 flex-1 rounded-r-none"
      value={sanitizeDigits(variant.storage || "", 4)}
      maxLength={4}
      onChange={(e) => {
        const amount = sanitizeDigits(e.target.value, 4);
        const unit = /tb\s*$/i.test(variant.storage || "") ? "TB" : "GB";
        updatePath(
          ["general", "variants", index, "storage"],
          amount ? `${amount}${unit}` : ""
        );
      }}
    />

    {/* GB / TB Toggle */}
    <div className="flex shrink-0 overflow-hidden rounded-r-lg border border-l-0 border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => {
          const amount = sanitizeDigits(variant.storage || "", 4);
          updatePath(
            ["general", "variants", index, "storage"],
            amount ? `${amount}GB` : ""
          );
        }}
        className={`w-9 text-xs font-bold ${
          !/tb\s*$/i.test(variant.storage || "")
            ? "bg-blue-50 text-blue-700"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        GB
      </button>

      <button
        type="button"
        onClick={() => {
          const amount = sanitizeDigits(variant.storage || "", 4);
          updatePath(
            ["general", "variants", index, "storage"],
            amount ? `${amount}TB` : ""
          );
        }}
        className={`w-9 border-l border-slate-200 text-xs font-bold ${
          /tb\s*$/i.test(variant.storage || "")
            ? "bg-blue-50 text-blue-700"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        TB
      </button>
    </div>
  </div>
</Field>
                    <Field label="Launch Price" className="min-w-0">
                      <TextInput className="w-full" type="number" min={0} value={variant.launchPrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "launchPrice"], parseOptionalNumber(e.target.value))} />
                    </Field>
                    <Field label="Live Price" className="min-w-0">
                      <TextInput className="w-full" type="number" min={0} value={variant.livePrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "livePrice"], parseOptionalNumber(e.target.value))} />
                    </Field>
                    <div className="flex items-end">
                      {pendingLaunchVariantDeleteIndex === index ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => removeLaunchVariant(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                            Confirm Remove
                          </button>
                          <button type="button" onClick={() => setPendingLaunchVariantDeleteIndex(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setPendingLaunchVariantDeleteIndex(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
        </div>

        <div id="mobile-design-build" className="scroll-mt-40 [order:3]">
        <Section
          title="Design & Build"
          description="Body dimensions, weights, materials, IP ratings, colors, audio jack, and hardware design details."
          titleRight={(
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
              {FORM_FACTOR_OPTIONS.map((item, index) => (
                <button
                  key={`design-form-factor-${item.key}`}
                  type="button"
                  onClick={() => changeDesignFormFactor(item.key === "fold" ? (selectedFormFactor === "flip_fold" || selectedFormFactor === "book_fold" ? selectedFormFactor : "flip_fold") : item.key)}
                  className={`px-3 py-1.5 text-xs font-semibold ${index > 0 ? "border-l border-slate-200" : ""} ${
                    selectedFormFactorGroup === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {selectedFormFactorGroup === "fold" ? (
              <Field label="Fold Type">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[
                    { key: "flip_fold", label: "Flip" },
                    { key: "book_fold", label: "Fold" },
                  ].map((item, index) => (
                    <button
                      key={`design-fold-type-${item.key}`}
                      type="button"
                      onClick={() => changeDesignFormFactor(item.key)}
                      className={`px-3 py-2 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${
                        selectedFormFactor === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}
            <Field label="Design Style">
              <HelperTermInput suggestions={designTermSuggestions.designstyle || []} value={form.design?.designType || ""} onChange={(value) => updatePath(["design", "designType"], value)} commaSeparated placeholder="Candybar, fold, book-style" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Back Material">
              <HelperTermInput suggestions={designTermSuggestions.backmaterial || []} value={form.design?.build?.back?.material || ""} onChange={(value) => updatePath(["design", "build", "back", "material"], value)} commaSeparated />
            </Field>
            <Field label="Back Protection">
              <HelperTermInput suggestions={designTermSuggestions.backprotection || []} value={form.design?.build?.back?.protection || ""} onChange={(value) => updatePath(["design", "build", "back", "protection"], value)} commaSeparated />
            </Field>
            <Field label="Frame">
              <HelperTermInput suggestions={designTermSuggestions.frame || []} value={form.design?.build?.frame || ""} onChange={(value) => updatePath(["design", "build", "frame"], value)} commaSeparated />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="IP Rating">
              <HelperTermInput suggestions={designTermSuggestions.iprating || []} value={formatCsv(form.design?.ipRating)} onChange={(value) => updatePath(["design", "ipRating"], splitCsv(value))} commaSeparated placeholder="IP68, IP54" />
            </Field>
          </div>

          <Field label="Other Design Features">
            <HelperTermInput suggestions={designTermSuggestions.otherdesignfeatures || []} value={formatCsv(form.design?.otherFeatures)} onChange={(value) => updatePath(["design", "otherFeatures"], splitCsv(value))} commaSeparated placeholder="Stylus support, S Pen support" />
          </Field>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">{selectedFormFactor === "bar" ? "Body Size & Weight" : "Body Size & Weight by Posture"}</p>
              <div className="flex items-center gap-2">
                {selectedFormFactor === "bar" ? (
                  <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                    {[{ key: "same", label: "Same" }, { key: "variant", label: "Variant" }].map((item, index) => (
                      <button
                        key={`normal-dimension-mode-${item.key}`}
                        type="button"
                        onClick={() => changeNormalDimensionMode(item.key as "same" | "variant")}
                        className={`px-3 py-1.5 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${normalDimensionMode === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-500">Use `mm` values in this section.</p>
            {showPostureSanityWarning ? (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Check dimensions: `open` height/width is smaller than `folded`. If this is intentional, you can ignore this warning.
              </div>
            ) : null}

            {selectedFormFactor === "bar" ? (
              normalDimensionMode === "same" ? (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[980px] grid-cols-[20rem_1fr_1fr_1fr_1fr] gap-3">
                    <Field label="Color">
                      <HelperTermInput data-color-path="design.normalDimensionVariants.0.color" suggestions={form.design?.colors || []} value={String(form.design?.normalDimensionVariants?.[0]?.color || "")} onChange={(value) => setDimensionColor(["design", "normalDimensionVariants", 0, "color"], value)} placeholder="Dark Black, Ice Blue" />
                    </Field>
                    <Field label="Height">
                      <div className="relative">
                        <TextInput className="w-full pr-12" type="number" step="0.01" value={form.design?.normalDimensionVariants?.[0]?.height ?? form.design?.dimensionsByPosture?.normal?.height ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", 0, "height"], parseOptionalNumber(e.target.value))} />
                        <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                      </div>
                    </Field>
                    <Field label="Width">
                      <div className="relative">
                        <TextInput className="w-full pr-12" type="number" step="0.01" value={form.design?.normalDimensionVariants?.[0]?.width ?? form.design?.dimensionsByPosture?.normal?.width ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", 0, "width"], parseOptionalNumber(e.target.value))} />
                        <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                      </div>
                    </Field>
                    <Field label="Thickness">
                      <div className="relative">
                        <TextInput className="w-full pr-12" type="number" step="0.01" value={form.design?.normalDimensionVariants?.[0]?.depth ?? (Array.isArray(form.design?.dimensionsByPosture?.normal?.depth) ? form.design?.dimensionsByPosture?.normal?.depth?.[0] : form.design?.dimensionsByPosture?.normal?.depth) ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", 0, "depth"], parseOptionalNumber(e.target.value))} />
                        <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                      </div>
                    </Field>
                    <Field label="Weight">
                      <div className="relative">
                        <TextInput className="w-full pr-10" type="number" step="0.1" value={form.design?.normalDimensionVariants?.[0]?.weight ?? form.design?.dimensionsByPosture?.normal?.weight ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", 0, "weight"], parseOptionalNumber(e.target.value))} />
                        <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">g</span>
                      </div>
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {(Array.isArray(form.design?.normalDimensionVariants) && form.design?.normalDimensionVariants.length > 0 ? form.design.normalDimensionVariants : [createEmptyNormalDimensionVariant()]).map((item, index) => (
                    <div key={`normal-dimension-variant-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="overflow-x-auto">
                        <div className="grid min-w-[1100px] grid-cols-[2.75rem_1fr_1fr_1fr_1fr_1fr_auto] items-end gap-3">
                          <div className="flex items-end">
                            <button type="button" onClick={() => insertNormalDimensionVariantAfter(index)} className="h-10 w-10 rounded-lg border border-slate-200 bg-white text-lg font-bold leading-none text-slate-700" title="Insert new row below">
                              +
                            </button>
                          </div>
                          <Field label="Color">
                            <HelperTermInput data-color-path={`design.normalDimensionVariants.${index}.color`} suggestions={form.design?.colors || []} value={item.color || ""} onChange={(value) => setDimensionColor(["design", "normalDimensionVariants", index, "color"], value)} commaSeparated />
                          </Field>
                          <Field label="Height">
                            <div className="relative">
                              <TextInput className="w-full pr-12" type="number" step="0.01" value={item.height ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", index, "height"], parseOptionalNumber(e.target.value))} />
                              <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                            </div>
                          </Field>
                          <Field label="Width">
                            <div className="relative">
                              <TextInput className="w-full pr-12" type="number" step="0.01" value={item.width ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", index, "width"], parseOptionalNumber(e.target.value))} />
                              <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                            </div>
                          </Field>
                          <Field label="Thickness">
                            <div className="relative">
                              <TextInput className="w-full pr-12" type="number" step="0.01" value={item.depth ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", index, "depth"], parseOptionalNumber(e.target.value))} />
                              <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">mm</span>
                            </div>
                          </Field>
                          <Field label="Weight">
                            <div className="relative">
                              <TextInput className="w-full pr-10" type="number" step="0.1" value={item.weight ?? ""} onChange={(e) => updatePath(["design", "normalDimensionVariants", index, "weight"], parseOptionalNumber(e.target.value))} />
                              <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">g</span>
                            </div>
                          </Field>
                          <div className="flex items-end">
                            {pendingNormalDimensionVariantDeleteIndex === index ? (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => removeNormalDimensionVariant(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                                  Confirm Remove
                                </button>
                                <button type="button" onClick={() => setPendingNormalDimensionVariantDeleteIndex(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setPendingNormalDimensionVariantDeleteIndex(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-4">
                  {postureOptions.map((mode) => (
                    <div key={mode} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{mode.replace(/_/g, " ")}</p>
                          {postureOptions.filter((item) => item !== mode).slice(0, 1).map((source) => (
                            <button
                              key={`copy-posture-${mode}-from-${source}`}
                              type="button"
                              onClick={() => copyPostureDimensions(source, mode)}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              title={`Copy dimensions from ${source.replace(/_/g, " ")}`}
                            >
                              Copy from {source.replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                          {[{ key: "same", label: "Same" }, { key: "variant", label: "Variant" }].map((item, index) => (
                            <button
                              key={`posture-dimension-mode-${mode}-${item.key}`}
                              type="button"
                              onClick={() => changePostureDimensionMode(mode, item.key as "same" | "variant")}
                              className={`px-3 py-1.5 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${getPostureDimensionMode(mode) === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {selectedFormFactor === "tri_fold" ? (
                        <Field label="Posture Note (Optional)">
                          <HelperTermInput
                            suggestions={designTermSuggestions.posturenote || []}
                            placeholder="e.g., Outer display / Inner main display"
                            value={String(form.design?.postureNotes?.[mode] || "")}
                            onChange={(value) => updatePath(["design", "postureNotes", mode], value)}
                            commaSeparated
                          />
                        </Field>
                      ) : null}
                      {getPostureDimensionMode(mode) === "same" ? (
                        <div className="overflow-x-auto">
                          <div className="grid min-w-[980px] grid-cols-[20rem_1fr_1fr_1fr_1fr] gap-3">
                            <Field label="Color">
                              <HelperTermInput
                                data-color-path={`design.postureDimensionVariants.${getPostureVariantEntries(mode)[0]?.index ?? 0}.color`}
                                suggestions={form.design?.colors || []}
                                value={String(getPostureVariantEntries(mode)[0]?.item?.color || "")}
                                onChange={(value) => {
                                  const canonical = canonicalizeColorList(value);
                                  updateSamePostureVariantField(mode, "color", canonical);
                                  setDimensionColorErrors([]);
                                }}
                                commaSeparated
                                placeholder="Green, Yellow"
                              />
                            </Field>
                            <Field label="Height (mm)">
                              <TextInput
                                type="number"
                                step="0.01"
                                value={getPostureVariantEntries(mode)[0]?.item?.height ?? form.design?.dimensionsByPosture?.[mode]?.height ?? form.design?.dimensions?.[mode as "normal" | "folded" | "unfolded"]?.height ?? ""}
                                onChange={(e) => {
                                  const nextValue = parseOptionalNumber(e.target.value);
                                  updatePath(["design", "dimensionsByPosture", mode, "height"], nextValue);
                                  updateSamePostureVariantField(mode, "height", nextValue);
                                }}
                              />
                            </Field>
                            <Field label="Width (mm)">
                              <TextInput
                                type="number"
                                step="0.01"
                                value={getPostureVariantEntries(mode)[0]?.item?.width ?? form.design?.dimensionsByPosture?.[mode]?.width ?? form.design?.dimensions?.[mode as "normal" | "folded" | "unfolded"]?.width ?? ""}
                                onChange={(e) => {
                                  const nextValue = parseOptionalNumber(e.target.value);
                                  updatePath(["design", "dimensionsByPosture", mode, "width"], nextValue);
                                  updateSamePostureVariantField(mode, "width", nextValue);
                                }}
                              />
                            </Field>
                            <Field label="Thickness (mm)">
                              <TextInput
                                type="number"
                                step="0.01"
                                value={getPostureVariantEntries(mode)[0]?.item?.depth ?? (!Array.isArray(form.design?.dimensionsByPosture?.[mode]?.depth) ? form.design?.dimensionsByPosture?.[mode]?.depth : form.design?.dimensionsByPosture?.[mode]?.depth?.[0]) ?? ""}
                                onChange={(e) => {
                                  const nextValue = parseOptionalNumber(e.target.value);
                                  updatePath(["design", "dimensionsByPosture", mode, "depth"], nextValue);
                                  updateSamePostureVariantField(mode, "depth", nextValue);
                                }}
                              />
                            </Field>
                            <Field label="Weight (g)">
                              <TextInput
                                type="number"
                                step="0.1"
                                value={getPostureVariantEntries(mode)[0]?.item?.weight ?? form.design?.dimensionsByPosture?.[mode]?.weight ?? ""}
                                onChange={(e) => {
                                  const nextValue = parseOptionalNumber(e.target.value);
                                  updatePath(["design", "dimensionsByPosture", mode, "weight"], nextValue);
                                  updateSamePostureVariantField(mode, "weight", nextValue);
                                }}
                              />
                            </Field>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {(() => {
                            const entries = getPostureVariantEntries(mode);
                            const safeEntries = entries.length > 0 ? entries : [{ item: createEmptyPostureDimensionVariant(mode), index: -1 }];
                            return safeEntries.map(({ item, index }, itemIndex) => (
                              <div key={`posture-dimension-variant-${mode}-${itemIndex}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="overflow-x-auto">
                                  <div className="grid min-w-[1080px] grid-cols-[2.75rem_1fr_1fr_1fr_1fr_1fr_auto] items-end gap-3">
                                    <div className="flex items-end">
                                      <button type="button" onClick={() => insertPostureDimensionVariantAfterForPosture(mode, index >= 0 ? index : null)} className="h-10 w-10 rounded-lg border border-slate-200 bg-white text-lg font-bold leading-none text-slate-700" title="Insert new row below">+</button>
                                    </div>
                                    <Field label="Color">
                                      <HelperTermInput data-color-path={`design.postureDimensionVariants.${index}.color`} suggestions={form.design?.colors || []} value={item.color || ""} onChange={(value) => index >= 0 ? setDimensionColor(["design", "postureDimensionVariants", index, "color"], value) : updateSamePostureVariantField(mode, "color", canonicalizeColorList(value))} commaSeparated />
                                    </Field>
                                    <Field label="Height (mm)">
                                      <TextInput type="number" step="0.01" value={item.height ?? ""} onChange={(e) => index >= 0 ? updatePath(["design", "postureDimensionVariants", index, "height"], parseOptionalNumber(e.target.value)) : updateSamePostureVariantField(mode, "height", parseOptionalNumber(e.target.value))} />
                                    </Field>
                                    <Field label="Width (mm)">
                                      <TextInput type="number" step="0.01" value={item.width ?? ""} onChange={(e) => index >= 0 ? updatePath(["design", "postureDimensionVariants", index, "width"], parseOptionalNumber(e.target.value)) : updateSamePostureVariantField(mode, "width", parseOptionalNumber(e.target.value))} />
                                    </Field>
                                    <Field label="Thickness (mm)">
                                      <TextInput type="number" step="0.01" value={item.depth ?? ""} onChange={(e) => index >= 0 ? updatePath(["design", "postureDimensionVariants", index, "depth"], parseOptionalNumber(e.target.value)) : updateSamePostureVariantField(mode, "depth", parseOptionalNumber(e.target.value))} />
                                    </Field>
                                    <Field label="Weight (g)">
                                      <TextInput type="number" step="0.1" value={item.weight ?? ""} onChange={(e) => index >= 0 ? updatePath(["design", "postureDimensionVariants", index, "weight"], parseOptionalNumber(e.target.value)) : updateSamePostureVariantField(mode, "weight", parseOptionalNumber(e.target.value))} />
                                    </Field>
                                    <div className="flex items-end">
                                      {index >= 0 ? (
                                        pendingPostureDimensionVariantDeleteIndex === index ? (
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => removePostureDimensionVariant(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Confirm Remove</button>
                                            <button type="button" onClick={() => setPendingPostureDimensionVariantDeleteIndex(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
                                          </div>
                                        ) : (
                                          <button type="button" onClick={() => setPendingPostureDimensionVariantDeleteIndex(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Remove</button>
                                        )
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </Section>
        </div>

        <div id="mobile-display" className="scroll-mt-40 [order:4]">
        <Section title="Display" description="Primary and secondary display data plus additional display panels.">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-900">Display Form Factor</p>
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
              {DISPLAY_FORM_FACTOR_OPTIONS.map((item, index) => (
                <button
                  key={`display-form-factor-${item.key}`}
                  type="button"
                  onClick={() => updatePath(["display", "formFactor"], item.key)}
                  className={`px-3 py-1.5 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${selectedDisplayFormFactor === item.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-1">
            {displayPanelGroups.map((panelGroup, panelIndex) => {
              const panelValue = (panelGroup.key.length === 0 ? form.display || {} : getAtPath(form, panelGroup.key) || {}) as ProductDisplayPanel;
              const basePath = panelGroup.key.length === 0 ? ["display"] : panelGroup.key;
              const suggestedResolution = suggestResolutionLabel(panelValue.resolutionWidth, panelValue.resolutionHeight);
              const curvedDegree = panelValue.curvedDegree ?? (panelValue.curved ? "" : 0);
              const hasStylus = Boolean(cleanText(panelValue.stylus?.name));
              const isWidePanel = true;
              const hasAlwaysOnDisplay = (panelValue.alwaysOnDisplay || []).includes("Always-On Display");
              return (
                <div key={`${panelGroup.title}-${panelIndex}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-3 text-sm font-extrabold text-slate-900">{panelGroup.title}</p>
                  <div className={`grid gap-3 sm:grid-cols-2 ${isWidePanel ? "xl:grid-cols-4" : ""}`}>
                    <Field label="Type">
                      <HelperTermInput suggestions={displayTermSuggestions.type || []} value={panelValue.type || ""} onChange={(value) => updatePath([...basePath, "type"], value)} commaSeparated />
                    </Field>
                    <Field label="Size">
                      <div className="flex w-fit gap-1.5">
                        <TextInput type="number" min="0" step="0.01" value={String(panelValue.sizeInches ?? panelValue.size ?? "")} onChange={(e) => updatePath([...basePath, "sizeInches"], e.target.value)} placeholder="Inches" className="w-[95px] px-2" />
                        <TextInput type="number" min="0" step="0.01" value={String(panelValue.sizeCm ?? "")} onChange={(e) => updatePath([...basePath, "sizeCm"], e.target.value)} placeholder="cm" className="w-[95px] px-2" />
                      </div>
                    </Field>
                    <Field label="Resolution">
                      <div className="grid w-fit grid-cols-[95px_auto_95px] items-center gap-1.5">
                        <TextInput inputMode="numeric" value={String(panelValue.resolutionWidth ?? "")} onChange={(e) => updateDisplayResolution(basePath, "width", e.target.value)} placeholder="Width" className="px-2" />
                        <span className="font-bold text-slate-500">×</span>
                        <TextInput inputMode="numeric" value={String(panelValue.resolutionHeight ?? "")} onChange={(e) => updateDisplayResolution(basePath, "height", e.target.value)} placeholder="Height" className="px-2" />
                      </div>
                    </Field>
                    <Field label="Resolution Class">
                      <Select value={panelValue.resolutionLabel || suggestedResolution} onChange={(e) => updatePath([...basePath, "resolutionLabel"], e.target.value)}>
                        <option value="">Not specified</option>
                        {DISPLAY_RESOLUTION_LABELS.map((label) => <option key={`${panelGroup.title}-resolution-${label}`} value={label}>{label}{label === suggestedResolution ? " (suggested)" : ""}</option>)}
                      </Select>
                    </Field>
                    <Field label="Refresh Rate (Hz)">
                      <TextInput value={String(panelValue.refreshRate ?? "")} onChange={(e) => updatePath([...basePath, "refreshRate"], e.target.value)} />
                    </Field>
                    <Field label="Adaptive Refresh Rate">
                      <div className="inline-flex w-fit self-start overflow-hidden rounded-md border border-slate-300 bg-white">
                        {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => (
                          <button key={`${panelGroup.title}-adaptive-${option.label}`} type="button" onClick={() => updatePath([...basePath, "adaptive"], option.value)} className={`h-10 w-12 shrink-0 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${(panelValue.adaptive === true) === option.value ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{option.label}</button>
                        ))}
                      </div>
                    </Field>
                    {panelValue.adaptive ? <Field label="Adaptive Range (Hz)">
                      <TextInput value={String(panelValue.adaptiveRefreshRate ?? "")} onChange={(e) => updatePath([...basePath, "adaptiveRefreshRate"], e.target.value)} placeholder="1–120 or 30, 45, 60, 90, 120" />
                    </Field> : null}
                    <Field label="Touch Sampling Rate (Hz)">
                      <TextInput value={String(panelValue.touchSamplingRate ?? "")} onChange={(e) => updatePath([...basePath, "touchSamplingRate"], e.target.value)} />
                    </Field>
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                    <Field label="Brightness (nits)">
                      <div className={`grid grid-cols-2 gap-2 ${isWidePanel ? "xl:grid-cols-4" : ""}`}>
                        <TextInput value={String(panelValue.brightness?.typical ?? "")} onChange={(e) => updatePath([...basePath, "brightness", "typical"], e.target.value)} placeholder="Typical" />
                        <TextInput value={String(panelValue.brightness?.hdr ?? "")} onChange={(e) => updatePath([...basePath, "brightness", "hdr"], e.target.value)} placeholder="HDR" />
                        <TextInput value={String(panelValue.brightness?.maxRated ?? "")} onChange={(e) => updatePath([...basePath, "brightness", "maxRated"], e.target.value)} placeholder="Max rated / HBM" />
                        <TextInput value={String(panelValue.brightness?.peak ?? panelValue.peakBrightness ?? "")} onChange={(e) => updatePath([...basePath, "brightness", "peak"], e.target.value)} placeholder="Peak" />
                      </div>
                    </Field>
                    </div>
                    <Field label="Screen to Body">
                      <TextInput value={String(panelValue.screenToBody ?? "")} onChange={(e) => updatePath([...basePath, "screenToBody"], e.target.value)} />
                    </Field>
                    <Field label="Aspect Ratio">
                      <TextInput value={panelValue.aspectRatio || ""} onChange={(e) => updatePath([...basePath, "aspectRatio"], e.target.value)} />
                    </Field>
                    <Field label="Pixel Density (PPI)">
                      <TextInput value={String(panelValue.pixelDensity ?? "")} onChange={(e) => updatePath([...basePath, "pixelDensity"], e.target.value)} />
                    </Field>
                    <Field label="Curved (degrees)">
                      <TextInput type="number" min="0" step="0.1" value={String(curvedDegree)} onChange={(e) => updateCurvedDegree(basePath, e.target.value)} placeholder="0 = No" />
                    </Field>
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                    <Field label="Color Coverage by Display Mode">
                      <div className="grid gap-2">
                        {(panelValue.colorProfiles || []).map((profile, profileIndex) => (
                          <div key={`${panelGroup.title}-color-profile-${profileIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_28px]">
                            <Select value={profile.mode || ""} onChange={(e) => updatePath([...basePath, "colorProfiles", profileIndex, "mode"], e.target.value)}>
                              <option value="">All modes</option>
                              {DISPLAY_MODE_OPTIONS.map((mode) => <option key={`${panelGroup.title}-profile-mode-${profileIndex}-${mode}`} value={mode}>{mode}</option>)}
                            </Select>
                            <TextInput value={String(profile.dciP3 ?? "")} onChange={(e) => updatePath([...basePath, "colorProfiles", profileIndex, "dciP3"], e.target.value)} placeholder="DCI-P3 %" />
                            <TextInput value={String(profile.ntsc ?? "")} onChange={(e) => updatePath([...basePath, "colorProfiles", profileIndex, "ntsc"], e.target.value)} placeholder="NTSC %" />
                            <TextInput value={String(profile.sRgb ?? "")} onChange={(e) => updatePath([...basePath, "colorProfiles", profileIndex, "sRgb"], e.target.value)} placeholder="sRGB %" />
                            <button type="button" aria-label="Remove color profile" title="Remove color profile" onClick={() => removeFromPath([...basePath, "colorProfiles"], profileIndex)} className="rounded-lg border border-rose-200 p-0 text-sm font-bold text-rose-700">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => appendToPath([...basePath, "colorProfiles"], { mode: "", dciP3: "", ntsc: "", sRgb: "" })} className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">+ Add color profile</button>
                      </div>
                    </Field>
                    </div>
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Protection">
                          <HelperTermInput suggestions={displayTermSuggestions.protection || []} value={panelValue.protection || ""} onChange={(value) => updatePath([...basePath, "protection"], value)} commaSeparated placeholder="e.g. Gorilla Glass Victus 2" />
                        </Field>
                        <Field label="Always-On Display">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex w-fit self-start overflow-hidden rounded-md border border-slate-300 bg-white">
                              {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => (
                                <button key={`${panelGroup.title}-aod-${option.label}`} type="button" onClick={() => updatePath([...basePath, "alwaysOnDisplay"], option.value ? [...new Set([...(panelValue.alwaysOnDisplay || []), "Always-On Display"])] : (panelValue.alwaysOnDisplay || []).filter((feature) => feature !== "Always-On Display"))} className={`h-10 w-12 shrink-0 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${hasAlwaysOnDisplay === option.value ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{option.label}</button>
                              ))}
                            </div>
                            {hasAlwaysOnDisplay ? <TextInput type="number" min="0" step="1" value={String(panelValue.alwaysOnDisplayHz ?? "")} onChange={(e) => updatePath([...basePath, "alwaysOnDisplayHz"], e.target.value)} placeholder="Hz" className="w-20" /> : null}
                          </div>
                        </Field>
                        <Field label="HDR Support">
                          <div className="flex flex-wrap gap-2">
                            {DISPLAY_HDR_OPTIONS.map((feature) => <button key={`${panelGroup.title}-hdr-${feature}`} type="button" onClick={() => toggleTextOption([...basePath, "hdr"], feature)} className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold ${(panelValue.hdr || []).includes(feature) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{feature}</button>)}
                          </div>
                        </Field>
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Dimming</span>
                        {DISPLAY_DIMMING_OPTIONS.map((feature) => <button key={`${panelGroup.title}-dimming-${feature}`} type="button" onClick={() => toggleTextOption([...basePath, "dimming"], feature)} className={`inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-semibold ${(panelValue.dimming || []).includes(feature) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{feature === "DC dimming" ? "DC" : "PWM"}</button>)}
                      </div>
                      <HelperTermInput suggestions={displayTermSuggestions.dimming || []} value={formatCsv(panelValue.dimming)} onChange={(value) => updatePath([...basePath, "dimming"], splitCsv(value))} commaSeparated placeholder="e.g. 2,760 Hz PWM dimming" />
                    </div>
                    <Field label="Stylus / Pen">
                      <HelperTermInput suggestions={displayTermSuggestions.styluspen || []} value={panelValue.stylus?.name || ""} onChange={(value) => updatePath([...basePath, "stylus", "name"], value)} commaSeparated placeholder="No (leave blank), S Pen, Apple Pencil" />
                    </Field>
                    {hasStylus ? <>
                      <Field label="Stylus Features">
                        <TextInput value={formatCsv(panelValue.stylus?.features)} onChange={(e) => updatePath([...basePath, "stylus", "features"], splitCsv(e.target.value))} placeholder="4,096 pressure levels, low-latency stylus" />
                      </Field>
                      <Field label="Palm Rejection">
                        <div className="inline-flex w-fit self-start overflow-hidden rounded-md border border-slate-300 bg-white">
                          {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`${panelGroup.title}-palm-${option.label}`} type="button" onClick={() => updatePath([...basePath, "stylus", "palmRejection"], option.value)} className={`h-10 w-12 shrink-0 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${(panelValue.stylus?.palmRejection === true) === option.value ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{option.label}</button>)}
                        </div>
                      </Field>
                    </> : null}
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Certifications">
                          <HelperTermInput suggestions={displayTermSuggestions.certification || []} value={formatCsv(panelValue.certifications)} onChange={(value) => updatePath([...basePath, "certifications"], splitCsv(value))} commaSeparated />
                        </Field>
                        <Field label="Other Features">
                          <HelperTermInput suggestions={displayTermSuggestions.otherfeatures || []} value={formatCsv(panelValue.others)} onChange={(value) => updatePath([...basePath, "others"], splitCsv(value))} commaSeparated />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </Section>
        </div>

        <div id="mobile-multimedia" className="scroll-mt-40 [order:10]">
        <Section title="Multimedia" description="Audio/media features used for public multimedia highlights.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="3.5mm Audio Jack">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-audio-jack-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "audioJack35mm"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.audioJack35mm === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            {form.general?.multimediaDetails?.audioJack35mm === false ? (
              <Field label="Type-C Audio Jack">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                    <button key={`mm-typec-jack-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "typeCAudioJack"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.typeCAudioJack === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                  ))}
                </div>
              </Field>
            ) : null}
            {form.general?.multimediaDetails?.audioJack35mm === false ? (
              <Field label="Lightning to 3.5mm">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                    <button key={`mm-lightning-jack-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "lightningAudioJack"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.lightningAudioJack === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                  ))}
                </div>
              </Field>
            ) : null}
            <Field label="FM Radio">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-fm-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "fmRadio"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.fmRadio === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Hi-Res Audio">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-hires-audio-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "hiResAudio"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.hiResAudio === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Hi-Res Video">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-hires-video-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "hiResVideo"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.hiResVideo === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Dolby Atmos">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-atmos-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "dolbyAtmos"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.dolbyAtmos === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Dolby Vision">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-vision-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "dolbyVision"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.dolbyVision === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="DTS">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-dts-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "dts"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.dts === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Widevine Levels">
              <div className="flex gap-2">
                {["L1", "L3"].map((level) => (
                  <button
                    key={`mm-widevine-level-${level}`}
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(form.general?.multimediaDetails?.widevineLevels) ? form.general?.multimediaDetails?.widevineLevels : [];
                      const next = current.includes(level) ? current.filter((item) => item !== level) : [...current, level];
                      updatePath(["general", "multimediaDetails", "widevineLevels"], next);
                    }}
                    className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold ${(Array.isArray(form.general?.multimediaDetails?.widevineLevels) ? form.general?.multimediaDetails?.widevineLevels : []).includes(level) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700"}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Speaker Setup">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "Single Speaker", value: "single" }, { label: "Dual Stereo", value: "dual_stereo" }].map((option, index) => (
                  <button key={`mm-speaker-${option.value}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "speakerSetup"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.speakerSetup === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Spatial Sound">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option, index) => (
                  <button key={`mm-spatial-${option.label}`} type="button" onClick={() => updatePath(["general", "multimediaDetails", "spatialSound"], option.value)} className={`inline-flex h-8 items-center px-3 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.general?.multimediaDetails?.spatialSound === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>
                ))}
              </div>
            </Field>
          </div>
          <div className="grid gap-3">
            <Field label="Other Multimedia">
              <HelperTermInput suggestions={multimediaTermSuggestions.othermultimedia || []} value={formatCsv(form.general?.multimediaDetails?.otherFeatures)} onChange={(value) => updatePath(["general", "multimediaDetails", "otherFeatures"], splitCsv(value))} commaSeparated placeholder="Stereo speakers, Spatial audio" />
            </Field>
          </div>
        </Section>
        </div>

        <div id="mobile-performance" className="scroll-mt-40 [order:5]">
        <Section title="Performance" description="Chipset-driven editable performance fields with CPU structure, clocks, GPU details, NPU/AI, cooling, and additional chip notes.">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Field label="Chipset">
              <TextInput
                value={form.performance?.chipset || ""}
                onChange={(e) => updatePath(["performance", "chipset"], e.target.value)}
                list={processorNameSuggestions.length > 0 ? "processor-chipset-suggest" : undefined}
                placeholder="Snapdragon 8 Gen 3"
              />
            </Field>
            <button
              type="button"
              onClick={() => void fetchPerformanceFromProcessor()}
              disabled={processorFetchState === "loading" || !form.performance?.chipset}
              className={`h-10 rounded-lg px-4 text-sm font-semibold text-white ${processorFetchState === "loading" || !form.performance?.chipset ? "cursor-not-allowed bg-slate-400" : "bg-blue-700"}`}
            >
              {processorFetchState === "loading" ? "Fetching..." : "Fetch Processor Data"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2.4fr] lg:grid-rows-3">
            <div className="lg:col-start-1 lg:row-start-1">
              <Field label="Processor Name">
                <TextInput value={form.specs.processor || ""} onChange={(e) => updatePath(["specs", "processor"], e.target.value)} list={processorNameSuggestions.length > 0 ? "processor-chipset-suggest" : undefined} />
              </Field>
            </div>
            <div className="lg:col-start-2 lg:row-start-1">
              <Field label="Fabrication Process (Fabricated By)">
                <TextInput value={form.performance?.fabrication || ""} onChange={(e) => updatePath(["performance", "fabrication"], e.target.value)} placeholder="4nm (TSMC)" />
              </Field>
            </div>
            <div className="lg:col-start-3 lg:row-start-1">
              <Field label="No of Cores">
                <TextInput value={form.performance?.noOfCores || ""} onChange={(e) => updatePath(["performance", "noOfCores"], e.target.value)} placeholder="8" />
              </Field>
            </div>
            <div className="lg:col-start-1 lg:row-start-2">
              <Field label="GPU Name">
                <TextInput value={form.performance?.gpu || ""} onChange={(e) => updatePath(["performance", "gpu"], e.target.value)} />
              </Field>
            </div>
            <div className="lg:col-start-2 lg:row-start-2">
              <Field label="GPU Frequency">
                <TextInput value={form.performance?.gpuFrequency || ""} onChange={(e) => updatePath(["performance", "gpuFrequency"], e.target.value)} />
              </Field>
            </div>
            <div className="lg:col-start-3 lg:row-start-2">
              <Field label="GPU Flops">
                <TextInput value={form.performance?.gpuFlops || ""} onChange={(e) => updatePath(["performance", "gpuFlops"], e.target.value)} />
              </Field>
            </div>
            <div className="lg:col-start-1 lg:row-start-3">
              <Field label="Max Clock Speed">
                <TextInput value={form.performance?.cpuFrequency || ""} onChange={(e) => updatePath(["performance", "cpuFrequency"], e.target.value)} placeholder="3.3 GHz" />
              </Field>
            </div>
            <div className="lg:col-start-2 lg:row-start-3">
              <Field label="AI Engine / NPU">
                <HelperTermInput suggestions={performanceTermSuggestions.aienginenpu || []} value={form.performance?.aiEngine || ""} onChange={(value) => updatePath(["performance", "aiEngine"], value)} commaSeparated placeholder="Hexagon NPU (32 TOPS)" />
              </Field>
            </div>
            <div className="lg:col-start-3 lg:col-span-2 lg:row-start-3">
              <Field label="Other AI Features">
                <HelperTermInput suggestions={performanceTermSuggestions.otheraifeature || []} value={formatCsv(form.performance?.otherAiFeatures)} onChange={(value) => updatePath(["performance", "otherAiFeatures"], splitCsv(value))} commaSeparated />
              </Field>
            </div>
            <div className="lg:col-start-4 lg:row-start-1 lg:row-span-2">
              <Field label="CPU Structure">
                <TextArea
                  rows={architectureRows}
                  value={form.performance?.architecture || ""}
                  onChange={(e) => updatePath(["performance", "architecture"], e.target.value)}
                  placeholder={"1x Prime + 3x Performance + 4x Efficiency\nor\n2 + 6"}
                  className="min-h-[9.5rem] resize-y"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="Cooling System">
              <HelperTermInput suggestions={performanceTermSuggestions.coolingsystem || []} value={form.performance?.coolingSystem || ""} onChange={(value) => updatePath(["performance", "coolingSystem"], value)} commaSeparated />
            </Field>
            <Field label="Other Performance Features">
              <HelperTermInput suggestions={performanceTermSuggestions.otherperformancefeature || []} value={formatCsv(form.performance?.otherFeatures)} onChange={(value) => updatePath(["performance", "otherFeatures"], splitCsv(value))} commaSeparated />
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="Additional Chip Name">
              <HelperTermInput suggestions={performanceTermSuggestions.additionalchip || []} value={formatCsv(form.performance?.additionalChips)} onChange={(value) => updatePath(["performance", "additionalChips"], splitCsv(value))} commaSeparated />
            </Field>
            <Field label="Additional Chip Other Details">
              <HelperTermInput suggestions={performanceTermSuggestions.additionalchipotherfeature || []} value={formatCsv(form.performance?.additionalChipFeatures)} onChange={(value) => updatePath(["performance", "additionalChipFeatures"], splitCsv(value))} commaSeparated />
            </Field>
          </div>
        </Section>
        </div>

        <div id="mobile-benchmark-scores" className="scroll-mt-40 [order:6]">
        <Section title="Benchmark Scores" description="AnTuTu, Geekbench, 3DMark, and PCMark values.">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="AnTuTu Version">
                <TextInput value={form.performance?.benchmarks?.antutuVersion || ""} onChange={(e) => updatePath(["performance", "benchmarks", "antutuVersion"], e.target.value)} />
              </Field>
              <Field label="AnTuTu Total">
                <TextInput type="number" value={form.performance?.antutu?.total ?? ""} onChange={(e) => updatePath(["performance", "antutu", "total"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="AnTuTu CPU">
                <TextInput type="number" value={form.performance?.antutu?.cpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "cpu"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="AnTuTu GPU">
                <TextInput type="number" value={form.performance?.antutu?.gpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "gpu"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="AnTuTu Memory">
                <TextInput type="number" value={form.performance?.antutu?.memory ?? ""} onChange={(e) => updatePath(["performance", "antutu", "memory"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="AnTuTu UX">
                <TextInput type="number" value={form.performance?.antutu?.ux ?? ""} onChange={(e) => updatePath(["performance", "antutu", "ux"], parseOptionalNumber(e.target.value))} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="Geekbench Version">
                <TextInput value={form.performance?.benchmarks?.geekbenchVersion || ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchVersion"], e.target.value)} />
              </Field>
              <Field label="Geekbench Single">
                <TextInput type="number" value={form.performance?.benchmarks?.geekbenchSingle ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchSingle"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="Geekbench Multi">
                <TextInput type="number" value={form.performance?.benchmarks?.geekbenchMulti ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchMulti"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="Geekbench Compute">
                <TextInput type="number" value={form.performance?.benchmarks?.geekbenchCompute ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchCompute"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="Geekbench OpenCL">
                <TextInput type="number" value={form.performance?.benchmarks?.geekbenchOpenCl ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchOpenCl"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="Geekbench Vulkan Score">
                <TextInput type="number" value={form.performance?.benchmarks?.geekbenchVulkanScore ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "geekbenchVulkanScore"], parseOptionalNumber(e.target.value))} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="3DMark Wild Life">
                <TextInput type="number" value={form.performance?.benchmarks?.threeDMarkWildLife ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "threeDMarkWildLife"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="3DMark SLN">
                <TextInput type="number" value={form.performance?.benchmarks?.threeDMarkSteelNomadLight ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "threeDMarkSteelNomadLight"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="3DMark Solar Bay">
                <TextInput type="number" value={form.performance?.benchmarks?.threeDMarkSolarBay ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "threeDMarkSolarBay"], parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="3DMark Wild Life Extreme">
                <TextInput type="number" value={form.performance?.benchmarks?.threeDMarkWildLifeExtreme ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "threeDMarkWildLifeExtreme"], parseOptionalNumber(e.target.value))} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="PCMark">
                <TextInput type="number" value={form.performance?.benchmarks?.pcMark ?? ""} onChange={(e) => updatePath(["performance", "benchmarks", "pcMark"], parseOptionalNumber(e.target.value))} />
              </Field>
            </div>
          </div>
        </Section>
        </div>

        <div id="mobile-memory-storage" className="scroll-mt-40 [order:2]">
        <Section
          title="Storage & Variants"
          description="Device storage support and sellable RAM/storage configurations. Max VRAM is calculated from the variants."
          titleRight={
            <>
              {[
                { key: "same_both", label: "Same RAM & Storage" },
                { key: "same_ram_type", label: "Same RAM Type" },
                { key: "same_storage_type", label: "Same Storage Type" },
                { key: "different", label: "Both Different" },
              ].map((option) => (
                <label key={option.key} className="cursor-pointer">
                  <input
                    type="radio"
                    name="memory-variant-mode"
                    value={option.key}
                    checked={memoryVariantMode === option.key}
                    onChange={() => updateMemoryVariantMode(option.key as "same_both" | "same_ram_type" | "same_storage_type" | "different")}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition peer-checked:border-blue-700 peer-checked:bg-blue-700 peer-checked:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </>
          }
        >
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2">
              {(Array.isArray(form.general?.variants) && form.general.variants.length ? form.general.variants : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }]).map((variant, index) => (
                <div key={`memory-variant-group-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div>
                    <div className="grid w-full min-w-[1197px] grid-cols-[4.25rem_13rem_6.5rem_10rem_10rem_8.625rem_8.625rem_5.5rem] items-end justify-between gap-3">
                    <div className="flex items-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveLaunchVariant(index, -1)}
                        disabled={index === 0}
                        className="h-10 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                        title="Move variant up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLaunchVariant(index, 1)}
                        disabled={index === (form.general?.variants?.length || 1) - 1}
                        className="h-10 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                        title="Move variant down"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="grid min-w-0 gap-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] text-xs font-bold uppercase tracking-wide text-slate-600">
                        <span>RAM</span>
                        <span>VRAM</span>
                        <span aria-hidden="true" className="w-9" />
                      </div>
                      <div className="grid h-10 w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <TextInput
                          inputMode="numeric"
                          maxLength={2}
                          placeholder="RAM"
                          aria-label="RAM in GB"
                          value={sanitizeDigits(variant.ram || "", 2)}
                          onChange={(e) => updateMemoryVariantField(index, "ram", e.target.value)}
                          className="min-w-0 rounded-l-lg rounded-r-none"
                        />
                        <TextInput
                          inputMode="numeric"
                          maxLength={2}
                          placeholder="VRAM"
                          aria-label="VRAM"
                          value={sanitizeDigits(variant.virtualRam || "", 2)}
                          onChange={(e) => updateMemoryVariantField(index, "virtualRam", e.target.value)}
                          className="min-w-0 rounded-none border-l-2 border-blue-300"
                        />
                        <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                      </div>
                    </div>

                    <Field label="Storage" className="min-w-0">
                      <div className="flex h-10 w-full">
                        <TextInput
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="256"
                          value={sanitizeDigits(variant.storage || "", 4)}
                          onChange={(e) => {
                            const amount = sanitizeDigits(e.target.value, 4);
                            updateMemoryVariantField(index, "storage", amount ? `${amount}GB` : "");
                          }}
                          className="w-[4.25rem] shrink-0 rounded-r-none px-2"
                        />
                        <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                      </div>
                    </Field>

                    <Field label="RAM Type" className="min-w-0">
                      <Select
                        className="w-full min-w-0"
                        value={memoryVariantMode === "same_both" || memoryVariantMode === "same_ram_type" ? cleanText(form.memoryStorage?.commonRamType) : cleanText(variant.ramType)}
                        onChange={(e) => updateMemoryVariantField(index, "ramType", e.target.value)}
                      >
                        <option value="">Select</option>
                        {RAM_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Storage Type" className="min-w-0">
                      <Select
                        className="w-full min-w-0"
                        value={memoryVariantMode === "same_both" || memoryVariantMode === "same_storage_type" ? cleanText(form.memoryStorage?.commonStorageType) : cleanText(variant.storageType)}
                        onChange={(e) => updateMemoryVariantField(index, "storageType", e.target.value)}
                      >
                        <option value="">Select</option>
                        {STORAGE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Launch Price" className="min-w-0">
                      <TextInput className="w-full min-w-0" type="number" min={0} value={variant.launchPrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "launchPrice"], parseOptionalNumber(e.target.value))} />
                    </Field>

                    <Field label="Live Price" className="min-w-0">
                      <TextInput className="w-full min-w-0" type="number" min={0} value={variant.livePrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "livePrice"], parseOptionalNumber(e.target.value))} />
                    </Field>

                    <div className="flex items-end justify-start">
                      {pendingVariantDeleteIndex === index ? (
                        <>
                          <button type="button" onClick={() => removeMemoryVariant(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                            Confirm Remove
                          </button>
                          <button type="button" onClick={() => setPendingVariantDeleteIndex(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setPendingVariantDeleteIndex(index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => insertMemoryVariantAfter((form.general?.variants?.length || 1) - 1)} className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">+ Add Variant</button>
          </div>

          <div className="overflow-x-auto">
            <div className={`grid min-w-[1050px] items-end gap-2 ${showSdCardExtraFields ? "grid-cols-[8.5rem_9.5rem_9.5rem_8.5rem_9rem_11rem_13rem]" : "grid-cols-[8.5rem_9.5rem_9.5rem_8.5rem_9rem]"}`}>
              <Field label="Total Bus Width" className="order-2">
                <TextInput className="w-full bg-slate-50 text-slate-700" value={computedTotalRamBusWidthLabel} readOnly placeholder="64-bit" />
              </Field>
              <Field label="RAM Channel" className="order-3">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {RAM_CHANNEL_OPTIONS.map((option, index) => (
                    <button
                      key={`ram-channel-${option.key}`}
                      type="button"
                      onClick={() => {
                        const isSelected = cleanText(form.memoryStorage?.ramChannel).toLowerCase() === option.key;
                        updateRamChannel(isSelected ? undefined : option.key);
                      }}
                      className={`inline-flex h-7 items-center justify-center whitespace-nowrap px-1.5 py-0 text-[11px] font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                        cleanText(form.memoryStorage?.ramChannel).toLowerCase() === option.key
                          ? "bg-blue-700 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                        {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Bus Width" className="order-4">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {RAM_BIT_WIDTH_OPTIONS.map((option, index) => (
                    <button
                      key={`ram-bit-${option}`}
                      type="button"
                      onClick={() => {
                        const isSelected = Number(form.memoryStorage?.ramBitWidth || 0) === option;
                        updateRamBitWidth(isSelected ? undefined : option);
                      }}
                      className={`inline-flex h-7 items-center justify-center whitespace-nowrap px-1.5 py-0 text-[11px] font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                        Number(form.memoryStorage?.ramBitWidth || 0) === option
                          ? "bg-blue-700 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                        {option}-bit
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Max VRAM" className="order-1">
                <div className="relative">
                  <TextInput
                    inputMode="numeric"
                    maxLength={2}
                    value={sanitizeDigits(String(form.memoryStorage?.virtualRamMax ?? ""), 2)}
                    onChange={(e) => updatePath(["memoryStorage", "virtualRamMax"], sanitizeDigits(e.target.value, 2))}
                    className="w-full pr-14"
                  />
                  <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                </div>
              </Field>
              <Field label="SD Card Supported" className="order-5">
                <Select className="w-full" value={sdCardMode} onChange={(e) => updateSdCardMode(e.target.value as "" | "none" | "hybrid" | "dedicated")}>
                  <option value="">Select</option>
                  <option value="none">No</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="dedicated">Dedicated</option>
                </Select>
              </Field>
              {showSdCardExtraFields ? (
                <>
                  <Field label="SD Card Capacity" className="order-6">
                    <TextInput
                      className="w-full"
                      inputMode="decimal"
                      maxLength={7}
                      placeholder="2048.00"
                      value={sanitizeDecimal(String(form.memoryStorage?.expandableStorage?.max ?? ""), 7)}
                      onChange={(e) => updatePath(["memoryStorage", "expandableStorage", "max"], sanitizeDecimal(e.target.value, 7))}
                    />
                  </Field>
                  <Field label="SD Card Type" className="order-7">
                    <HelperTermInput suggestions={sdCardTypeSuggestions} value={formatCsv(form.memoryStorage?.expandableStorage?.types)} onChange={(value) => updatePath(["memoryStorage", "expandableStorage", "types"], splitCsv(value))} commaSeparated />
                  </Field>
                </>
              ) : null}
            </div>
          </div>

          <Field label="Other Memory Features">
            <HelperTermInput
              suggestions={memoryFeatureSuggestions}
              value={formatCsv(form.memoryStorage?.features)}
              onChange={(value) => updatePath(["memoryStorage", "features"], splitCsv(value))}
              commaSeparated
              placeholder="RAM expansion, Memory optimization"
            />
          </Field>
        </Section>
        </div>

        <div id="mobile-battery-charging" className="scroll-mt-40 [order:9]">
        <Section title="Battery & Charging" description="Battery capacity, charging support, and charging certifications.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Capacity (Typical)">
              <UnitInput
                type="text"
                inputMode="numeric"
                suffix="mAh"
                value={String(form.battery?.capacityTypical ?? "").replace(/[^0-9]/g, "")}
                onChange={(e) => {
                  updatePath(["battery", "capacityTypical"], e.target.value);
                  updatePath(["battery", "capacity"], e.target.value);
                }}
                placeholder="4000"
              />
            </Field>
            <Field label="Capacity (Rated/Min)">
              <UnitInput type="text" inputMode="numeric" suffix="mAh" value={String(form.battery?.capacityRated ?? "").replace(/[^0-9]/g, "")} onChange={(e) => updatePath(["battery", "capacityRated"], e.target.value)} placeholder="3300" />
            </Field>
            <Field label="Type">
              <HelperTermInput suggestions={batteryTermSuggestions.batterytype || batteryTypeSuggestions} value={form.battery?.type || ""} onChange={(value) => updatePath(["battery", "type"], value)} commaSeparated />
            </Field>
            <Field label="Replaceable Battery">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: false, label: "No" },
                  { value: true, label: "Yes" },
                ].map((option, index) => (
                  <button
                    key={`battery-replaceable-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      const current = form.battery?.replaceable;
                      updatePath(["battery", "replaceable"], current === option.value ? undefined : option.value);
                    }}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.battery?.replaceable === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Life Cycle">
              <HelperTermInput suggestions={batteryTermSuggestions.lifecycle || []} value={String(form.battery?.lifeCycle ?? "")} onChange={(value) => updatePath(["battery", "lifeCycle"], value)} placeholder="1600 cycles (80%)" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { key: "chargerInBox", label: "In-Box Charger", value: form.battery?.chargerInBox?.available, path: ["battery", "chargerInBox", "available"] as PathKey[] },
              { key: "wired", label: "Wired Charging Support", value: form.battery?.wired?.supported, path: ["battery", "wired", "supported"] as PathKey[] },
              { key: "reverseWired", label: "Reverse Wired Charging", value: form.battery?.reverseWired?.supported, path: ["battery", "reverseWired", "supported"] as PathKey[] },
              { key: "wireless", label: "Wireless Charging Support", value: form.battery?.wireless?.supported, path: ["battery", "wireless", "supported"] as PathKey[] },
              { key: "reverseWireless", label: "Reverse Wireless Charging Support", value: form.battery?.reverseWireless?.supported, path: ["battery", "reverseWireless", "supported"] as PathKey[] },
            ].map((item) => (
              <Field key={`battery-support-${item.key}`} label={item.label}>
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                  {[
                    { value: false, label: "No" },
                    { value: true, label: "Yes" },
                  ].map((option, index) => (
                    <button
                      key={`${item.key}-${option.label.toLowerCase()}`}
                      type="button"
                      onClick={() => updatePath(item.path, item.value === option.value ? undefined : option.value)}
                      className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                        item.value === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {form.battery?.chargerInBox?.available ? (
                <div className="grid gap-3">
                  <Field label="In-Box Power">
                    <div className="relative">
                      <TextInput value={String(form.battery?.chargerInBox?.power ?? "")} onChange={(e) => updatePath(["battery", "chargerInBox", "power"], e.target.value)} className="w-full pr-12" placeholder="18" />
                      <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">W</span>
                    </div>
                  </Field>
                  <Field label="In-Box Charger Name">
                    <HelperTermInput suggestions={batteryTermSuggestions.chargingprotocol || []} value={String(form.battery?.chargerInBox?.protocol ?? "")} onChange={(value) => updatePath(["battery", "chargerInBox", "protocol"], value)} commaSeparated placeholder="VOOC, SuperVOOC, Warp Charge" />
                  </Field>
                  <Field label="In-Box Speed">
                    <HelperTermTextArea suggestions={batteryTermSuggestions.chargingspeed || []} value={formatKeyValueLines(form.battery?.chargerInBox?.speed)} onChange={(value) => updatePath(["battery", "chargerInBox", "speed"], parseKeyValueLines(value))} placeholder={"40%: 10 min\n70%: 20 min\n100%: 40 min"} />
                  </Field>
                </div>
              ) : <p className="text-xs text-slate-500">Enable In-Box Charger to add details.</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {form.battery?.wired?.supported ? (
                <div className="grid gap-3">
                  <Field label="Wired Max Power">
                    <div className="relative">
                      <TextInput value={String(form.battery?.wired?.maxPower ?? "")} onChange={(e) => updatePath(["battery", "wired", "maxPower"], e.target.value)} className="w-full pr-12" placeholder="27" />
                      <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">W</span>
                    </div>
                  </Field>
                  <Field label="Wired Protocol / Brand">
                    <HelperTermInput suggestions={batteryTermSuggestions.chargingprotocol || []} value={String(form.battery?.wired?.protocol ?? "")} onChange={(value) => updatePath(["battery", "wired", "protocol"], value)} commaSeparated placeholder="VOOC, PD, HyperCharge" />
                  </Field>
                  <Field label="Wired Speed">
                    <HelperTermTextArea suggestions={batteryTermSuggestions.chargingspeed || []} value={formatKeyValueLines(form.battery?.wired?.speed)} onChange={(value) => updatePath(["battery", "wired", "speed"], parseKeyValueLines(value))} placeholder={"40%: 10 min\n70%: 20 min\n100%: 40 min"} />
                  </Field>
                </div>
              ) : <p className="text-xs text-slate-500">Enable Wired Charging Support to add details.</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {form.battery?.reverseWired?.supported ? (
                <div className="grid gap-3">
                  <Field label="Reverse Wired Max Power">
                    <div className="relative">
                      <TextInput value={String(form.battery?.reverseWired?.maxPower ?? "")} onChange={(e) => updatePath(["battery", "reverseWired", "maxPower"], e.target.value)} className="w-full pr-12" placeholder="10" />
                      <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">W</span>
                    </div>
                  </Field>
                  <Field label="Reverse Wired Protocol / Brand">
                    <HelperTermInput suggestions={batteryTermSuggestions.chargingprotocol || []} value={String(form.battery?.reverseWired?.protocol ?? "")} onChange={(value) => updatePath(["battery", "reverseWired", "protocol"], value)} commaSeparated placeholder="USB PD, PPS" />
                  </Field>
                  <Field label="Reverse Wired Speed">
                    <HelperTermTextArea suggestions={batteryTermSuggestions.chargingspeed || []} value={formatKeyValueLines(form.battery?.reverseWired?.speed)} onChange={(value) => updatePath(["battery", "reverseWired", "speed"], parseKeyValueLines(value))} placeholder={"20%: 30 min\n40%: 60 min"} />
                  </Field>
                </div>
              ) : <p className="text-xs text-slate-500">Enable Reverse Wired Charging to add details.</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {form.battery?.wireless?.supported ? (
                <div className="grid gap-3">
                  <Field label="Wireless Max Power">
                    <div className="relative">
                      <TextInput value={String(form.battery?.wireless?.maxPower ?? "")} onChange={(e) => updatePath(["battery", "wireless", "maxPower"], e.target.value)} className="w-full pr-12" placeholder="50" />
                      <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">W</span>
                    </div>
                  </Field>
                  <Field label="Wireless Protocol / Brand">
                    <HelperTermInput suggestions={batteryTermSuggestions.chargingprotocol || []} value={String(form.battery?.wireless?.protocol ?? "")} onChange={(value) => updatePath(["battery", "wireless", "protocol"], value)} commaSeparated placeholder="Qi, AirVOOC" />
                  </Field>
                  <Field label="Wireless Speed">
                    <HelperTermTextArea suggestions={batteryTermSuggestions.chargingspeed || []} value={formatKeyValueLines(form.battery?.wireless?.speed)} onChange={(value) => updatePath(["battery", "wireless", "speed"], parseKeyValueLines(value))} placeholder={"50%: 30 min\n100%: 70 min"} />
                  </Field>
                </div>
              ) : <p className="text-xs text-slate-500">Enable Wireless Charging Support to add details.</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {form.battery?.reverseWireless?.supported ? (
                <div className="grid gap-3">
                  <Field label="Reverse Wireless Max Power">
                    <div className="relative">
                      <TextInput value={String(form.battery?.reverseWireless?.maxPower ?? "")} onChange={(e) => updatePath(["battery", "reverseWireless", "maxPower"], e.target.value)} className="w-full pr-12" placeholder="10" />
                      <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">W</span>
                    </div>
                  </Field>
                  <Field label="Reverse Wireless Protocol / Brand">
                    <HelperTermInput suggestions={batteryTermSuggestions.chargingprotocol || []} value={String(form.battery?.reverseWireless?.protocol ?? "")} onChange={(value) => updatePath(["battery", "reverseWireless", "protocol"], value)} commaSeparated placeholder="Qi" />
                  </Field>
                  <Field label="Reverse Wireless Speed">
                    <HelperTermTextArea suggestions={batteryTermSuggestions.chargingspeed || []} value={formatKeyValueLines(form.battery?.reverseWireless?.speed)} onChange={(value) => updatePath(["battery", "reverseWireless", "speed"], parseKeyValueLines(value))} placeholder={"10%: 30 min\n20%: 60 min"} />
                  </Field>
                </div>
              ) : <p className="text-xs text-slate-500">Enable Reverse Wireless Charging to add details.</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Battery Certification">
              <HelperTermInput suggestions={batteryTermSuggestions.batterycertification || []} value={formatCsv(form.battery?.certifications)} onChange={(value) => updatePath(["battery", "certifications"], splitCsv(value))} commaSeparated placeholder="IEC 62133, BIS" />
            </Field>
            <Field label="Charging Certification">
              <HelperTermInput suggestions={batteryTermSuggestions.chargingcertification || []} value={formatCsv(form.battery?.chargingCertifications)} onChange={(value) => updatePath(["battery", "chargingCertifications"], splitCsv(value))} commaSeparated placeholder="USB PD, PPS, QC 5" />
            </Field>
            <Field label="Other Battery Features">
              <HelperTermInput suggestions={batteryTermSuggestions.otherbatteryfeatures || []} value={formatCsv(form.battery?.otherBatteryFeatures)} onChange={(value) => updatePath(["battery", "otherBatteryFeatures"], splitCsv(value))} commaSeparated />
            </Field>
            <Field label="Other Charging Features">
              <HelperTermInput suggestions={batteryTermSuggestions.otherchargingfeatures || []} value={formatCsv(form.battery?.otherChargingFeatures)} onChange={(value) => updatePath(["battery", "otherChargingFeatures"], splitCsv(value))} commaSeparated />
            </Field>
          </div>
        </Section>
        </div>

        <div id="mobile-rear-camera" className="scroll-mt-40 [order:7]">
        <Section title="Rear Camera" description="Structured rear camera setup used by public camera sections and comparison logic.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-9">
            <Field label="Flash" className="lg:col-span-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`rear-flash-${option.label}`} type="button" onClick={() => updatePath(["rearCamera", "flash", "supported"], option.value)} className={`h-10 w-12 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.rearCamera?.flash?.supported === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>)}
                </div>
              </div>
            </Field>
            <Field label="Flash Name" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.flashname || []} value={form.rearCamera?.flash?.name || ""} onChange={(value) => updatePath(["rearCamera", "flash", "name"], value)} placeholder="LED, Laser AF" /></Field>
            <Field label="OIS / EIS / AF" className="lg:col-span-1"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updatePath(["rearCamera", "ois"], !form.rearCamera?.ois)} className={`h-10 px-3 text-xs font-semibold ${form.rearCamera?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updatePath(["rearCamera", "eis"], !form.rearCamera?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.rearCamera?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updatePath(["rearCamera", "autofocus"], form.rearCamera?.autofocus ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.rearCamera?.autofocus ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button></div></Field>
            <Field label="AF Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.afdetail || []} value={form.rearCamera?.autofocus === "AF" ? "" : form.rearCamera?.autofocus || ""} onChange={(value) => updatePath(["rearCamera", "autofocus"], value || (form.rearCamera?.autofocus ? "AF" : ""))} placeholder="Dual PDAF" /></Field>
            <div className="sm:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-3">
              <Field label="Image Resolution"><div className="flex w-fit items-center gap-1"><TextInput inputMode="numeric" value={String(form.rearCamera?.imageResolutionWidth ?? "")} onChange={(e) => updateCommonCameraImageResolution("rearCamera", "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="w-16 px-2" /><span>×</span><TextInput inputMode="numeric" value={String(form.rearCamera?.imageResolutionHeight ?? "")} onChange={(e) => updateCommonCameraImageResolution("rearCamera", "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="w-16 px-2" /><span className="text-sm text-slate-500">px</span></div></Field>
              <Field label="Zoom"><div className="grid grid-cols-2 gap-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.rearCamera?.zoom?.optical || ""), 4)} onChange={(e) => updatePath(["rearCamera", "zoom", "optical"], sanitizeDecimal(e.target.value, 4))} placeholder="Optical" /><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.rearCamera?.zoom?.digital || ""), 4)} onChange={(e) => updatePath(["rearCamera", "zoom", "digital"], sanitizeDecimal(e.target.value, 4))} placeholder="Digital" /></div></Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-9"><Field label="Camera Features">
              <HelperTermInput suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(form.rearCamera?.features)} onChange={(value) => updatePath(["rearCamera", "features"], splitCsv(value))} commaSeparated />
            </Field></div>
          </div>

          <CollapsiblePanel title="Rear Camera Units" titleRight={<button type="button" onClick={() => { const count = form.rearCamera?.cameras?.length || 0; appendToPath(["rearCamera", "cameras"], { role: getCameraRoleLabel(count), purpose: count === 0 ? "Main" : "", resolution: "", type: "", sensor: {} } satisfies RearCameraUnit); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Rear Camera</button>}>
            <div className="grid gap-3">
              {(form.rearCamera?.cameras || []).map((camera, index) => (
                <div key={`rear-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{camera.role || `Camera ${index + 1}`}</p>
                    <button type="button" onClick={() => { if (window.confirm("Remove this rear camera unit? This cannot be undone.")) removeFromPath(["rearCamera", "cameras"], index); }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <Field label="Camera Name">
                      <Select value={camera.role || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "role"], e.target.value)}><option value="">Select camera</option>{CAMERA_NAME_OPTIONS.map((name) => <option key={`rear-name-${index}-${name}`} value={name}>{name}</option>)}</Select>
                    </Field>
                    <Field label="Camera Type">
                      <HelperTermInput suggestions={cameraTermSuggestions.cameratype || CAMERA_PURPOSE_OPTIONS} value={camera.cameraType || camera.purpose || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "cameraType"], value)} />
                    </Field>
                    {postureOptions.length > 1 ? <Field label="Visible Postures"><HelperTermInput suggestions={cameraTermSuggestions.visibleposture || postureOptions} value={formatCsv(camera.posturesVisible)} onChange={(value) => updatePath(["rearCamera", "cameras", index, "posturesVisible"], splitCsv(value))} commaSeparated /></Field> : null}
                    <Field label="Camera Resolution"><UnitInput value={camera.resolution || ""} onChange={(e) => updateCameraUnitAndCommon("rearCamera", index, ["resolution"], e.target.value)} suffix="MP" /></Field>
                    <div className="lg:col-span-3"><Field label="Sensor Name"><HelperTermInput suggestions={cameraTermSuggestions.sensorname || []} value={camera.sensor?.name || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "name"], value)} /></Field></div>
                    <Field label="Aperture"><UnitInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "aperture"], e.target.value)} prefix="f/" containerClassName="max-w-36" /></Field>
                    <Field label="Sensor Size"><UnitInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "size"], e.target.value)} suffix='"' containerClassName="max-w-36" /></Field>
                    <Field label="Pixel Size"><UnitInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} suffix="µm" containerClassName="max-w-36" /></Field>
                    <Field label="Focal Length"><UnitInput value={camera.sensor?.focalLength || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "focalLength"], e.target.value)} suffix="mm" containerClassName="max-w-36" /></Field>
                    <Field label="FOV"><UnitInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "fov"], e.target.value)} suffix="°" /></Field>
                    <Field label="Lens Type" className="min-w-0"><HelperTermInput suggestions={cameraTermSuggestions.lenstype || []} value={camera.sensor?.lensType || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "lensType"], value)} placeholder="6P, 7P" /></Field>
                    <Field label="Optical Zoom">
                      <UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.opticalZoom || ""), 4)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "opticalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="3" containerClassName="w-20" />
                    </Field>
                    <Field label="Digital Zoom">
                      <UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.digitalZoom || ""), 4)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "digitalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="30" containerClassName="w-20" />
                    </Field>
                    <Field label="OIS / EIS / AF"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updateCameraUnitAndCommon("rearCamera", index, ["sensor", "ois"], !camera.sensor?.ois)} className={`h-10 px-3 text-xs font-semibold ${camera.sensor?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("rearCamera", index, ["sensor", "eis"], !camera.sensor?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("rearCamera", index, ["sensor", "autofocus"], camera.sensor?.autofocus ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button></div></Field>
                    <Field label="Autofocus Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.autofocusdetail || []} value={camera.sensor?.autofocus === "AF" ? "" : camera.sensor?.autofocus || ""} onChange={(value) => updateCameraUnitAndCommon("rearCamera", index, ["sensor", "autofocus"], value || (camera.sensor?.autofocus ? "AF" : ""))} placeholder="Dual PDAF" /></Field>
                    <div className="min-w-0 lg:col-span-1"><Field label="Image Resolution"><div className="grid min-w-0 grid-cols-[64px_auto_64px_auto] items-center gap-1"><TextInput inputMode="numeric" value={String(camera.imageResolutionWidth ?? "")} onChange={(e) => updateCameraImageResolution("rearCamera", index, "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="min-w-0 w-full px-2" /><span>×</span><TextInput inputMode="numeric" value={String(camera.imageResolutionHeight ?? "")} onChange={(e) => updateCameraImageResolution("rearCamera", index, "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="min-w-0 w-full px-2" /><span className="text-sm text-slate-500">px</span></div></Field></div>
                    <div className="sm:col-span-2 lg:col-span-6"><Field label="Camera Features"><HelperTermInput suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(camera.features)} onChange={(value) => updatePath(["rearCamera", "cameras", index, "features"], splitCsv(value))} commaSeparated placeholder="Night mode, dual pixel" /></Field></div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
          <CollapsiblePanel title="Video Profiles" className="mt-4" titleRight={<button type="button" onClick={() => appendToPath(["rearCamera", "videoProfiles"], { name: "", resolution: "", fps: "", comment: "" })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Video</button>}>
            <div className="grid gap-3">
              {(form.rearCamera?.videoProfiles || []).map((profile, index) => (
                <div key={`rear-video-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-12">
                  <Field label="Video Type" className="lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.videotype || []} value={profile.name || ""} onChange={(value) => updatePath(["rearCamera", "videoProfiles", index, "name"], value)} placeholder="Ultra-wide video" /></Field>
                  <Field label="Video Resolution" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.videoresolution || VIDEO_RESOLUTION_OPTIONS} value={profile.resolution || ""} onChange={(value) => updatePath(["rearCamera", "videoProfiles", index, "resolution"], value)} /></Field>
                  <Field label="Frame Rate" className="lg:col-span-1"><UnitInput inputMode="numeric" value={profile.fps || ""} onChange={(e) => updatePath(["rearCamera", "videoProfiles", index, "fps"], e.target.value.replace(/\D/g, ""))} suffix="fps" /></Field>
                  <Field label="Comment" className="lg:col-span-5"><HelperTermInput suggestions={cameraTermSuggestions.comment || []} value={profile.comment || ""} onChange={(value) => updatePath(["rearCamera", "videoProfiles", index, "comment"], value)} placeholder="OIS + EIS" /></Field>
                  <div className="flex items-end lg:col-span-1"><button type="button" onClick={() => { if (window.confirm("Remove this video profile? This cannot be undone.")) removeFromPath(["rearCamera", "videoProfiles"], index); }} className="h-10 w-full rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white">Remove</button></div>
                </div>
              ))}
            </div>
            <div><Field label="Video Features"><HelperTermInput suggestions={cameraTermSuggestions.videofeatures || []} value={formatCsv(form.rearCamera?.video?.features)} onChange={(value) => updatePath(["rearCamera", "video", "features"], splitCsv(value))} commaSeparated placeholder="HDR10+, Dolby Vision, gyro-EIS" /></Field></div>
          </CollapsiblePanel>
        </Section>
        </div>

        <div id="mobile-front-camera" className="scroll-mt-40 [order:8]">
        <Section title="Front Camera" description="Structured front camera setup used by selfie and video sections.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-9">
            <Field label="Flash" className="lg:col-span-1"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">{[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`front-flash-${option.label}`} type="button" onClick={() => updatePath(["frontCamera", "flash", "supported"], option.value)} className={`h-10 w-12 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.frontCamera?.flash?.supported === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>)}</div></Field>
            <Field label="Flash Name" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.flashname || []} value={form.frontCamera?.flash?.name || ""} onChange={(value) => updatePath(["frontCamera", "flash", "name"], value)} placeholder="LED, Laser AF" /></Field>
            <Field label="OIS / EIS / AF" className="lg:col-span-1"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updatePath(["frontCamera", "ois"], !form.frontCamera?.ois)} className={`h-10 px-3 text-xs font-semibold ${form.frontCamera?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updatePath(["frontCamera", "eis"], !form.frontCamera?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.frontCamera?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updatePath(["frontCamera", "autofocus"], form.frontCamera?.autofocus ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.frontCamera?.autofocus ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button></div></Field>
            <Field label="AF Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.afdetail || []} value={form.frontCamera?.autofocus === "AF" ? "" : form.frontCamera?.autofocus || ""} onChange={(value) => updatePath(["frontCamera", "autofocus"], value || (form.frontCamera?.autofocus ? "AF" : ""))} placeholder="PDAF" /></Field>
            <div className="sm:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-3">
              <Field label="Image Resolution"><div className="flex w-fit items-center gap-1"><TextInput inputMode="numeric" value={String(form.frontCamera?.imageResolutionWidth ?? "")} onChange={(e) => updateCommonCameraImageResolution("frontCamera", "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="w-16 px-2" /><span>×</span><TextInput inputMode="numeric" value={String(form.frontCamera?.imageResolutionHeight ?? "")} onChange={(e) => updateCommonCameraImageResolution("frontCamera", "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="w-16 px-2" /><span className="text-sm text-slate-500">px</span></div></Field>
              <Field label="Zoom"><div className="grid grid-cols-2 gap-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.frontCamera?.zoom?.optical || ""), 4)} onChange={(e) => updatePath(["frontCamera", "zoom", "optical"], sanitizeDecimal(e.target.value, 4))} placeholder="Optical" /><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.frontCamera?.zoom?.digital || ""), 4)} onChange={(e) => updatePath(["frontCamera", "zoom", "digital"], sanitizeDecimal(e.target.value, 4))} placeholder="Digital" /></div></Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-9"><Field label="Camera Features"><HelperTermInput suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(form.frontCamera?.features)} onChange={(value) => updatePath(["frontCamera", "features"], splitCsv(value))} commaSeparated /></Field></div>
          </div>

          <CollapsiblePanel title="Front Camera Units" titleRight={<button type="button" onClick={() => { const count = form.frontCamera?.cameras?.length || 0; appendToPath(["frontCamera", "cameras"], { role: getCameraRoleLabel(count), purpose: count === 0 ? "Main" : "", resolution: "", type: "", sensor: {} } satisfies FrontCameraUnit); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Front Camera</button>}>
            <div className="grid gap-3">
              {(form.frontCamera?.cameras || []).map((camera, index) => (
                <div key={`front-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{camera.role || `Front Camera ${index + 1}`}</p>
                    <button type="button" onClick={() => { if (window.confirm("Remove this front camera unit? This cannot be undone.")) removeFromPath(["frontCamera", "cameras"], index); }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <Field label="Camera Name">
                      <Select value={camera.role || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "role"], e.target.value)}><option value="">Select camera</option>{CAMERA_NAME_OPTIONS.map((name) => <option key={`front-name-${index}-${name}`} value={name}>{name}</option>)}</Select>
                    </Field>
                    <Field label="Camera Type"><HelperTermInput suggestions={cameraTermSuggestions.cameratype || CAMERA_PURPOSE_OPTIONS} value={camera.cameraType || camera.purpose || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "cameraType"], value)} /></Field>
                    {postureOptions.length > 1 ? <Field label="Visible Postures"><HelperTermInput suggestions={cameraTermSuggestions.visibleposture || postureOptions} value={formatCsv(camera.posturesVisible)} onChange={(value) => updatePath(["frontCamera", "cameras", index, "posturesVisible"], splitCsv(value))} commaSeparated /></Field> : null}
                    <Field label="Camera Resolution"><UnitInput value={camera.resolution || ""} onChange={(e) => updateCameraUnitAndCommon("frontCamera", index, ["resolution"], e.target.value)} suffix="MP" /></Field>
                    <div className="lg:col-span-3"><Field label="Sensor Name"><HelperTermInput suggestions={cameraTermSuggestions.sensorname || []} value={camera.sensor?.name || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "sensor", "name"], value)} /></Field></div>
                    <Field label="Sensor Size"><UnitInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "size"], e.target.value)} suffix='"' /></Field>
                    <Field label="Pixel Size"><UnitInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} suffix="µm" /></Field>
                    <Field label="Sensor Aperture"><UnitInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "aperture"], e.target.value)} prefix="f/" /></Field>
                    <Field label="Focal Length"><UnitInput value={camera.sensor?.focalLength || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "focalLength"], e.target.value)} suffix="mm" /></Field>
                    <Field label="FOV"><UnitInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "fov"], e.target.value)} suffix="°" /></Field>
                    <Field label="Lens Type" className="min-w-0"><HelperTermInput suggestions={cameraTermSuggestions.lenstype || []} value={camera.sensor?.lensType || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "sensor", "lensType"], value)} placeholder="5P, 6P" /></Field>
                    <Field label="Optical Zoom"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.opticalZoom || ""), 4)} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "opticalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="2" containerClassName="w-20" /></Field>
                    <Field label="Digital Zoom"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.digitalZoom || ""), 4)} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "digitalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="10" containerClassName="w-20" /></Field>
                    <Field label="OIS / EIS / AF"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "ois"], !camera.sensor?.ois)} className={`h-10 px-3 text-xs font-semibold ${camera.sensor?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "eis"], !camera.sensor?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "autofocus"], camera.sensor?.autofocus ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button></div></Field>
                    <Field label="Autofocus Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.autofocusdetail || []} value={camera.sensor?.autofocus === "AF" ? "" : camera.sensor?.autofocus || ""} onChange={(value) => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "autofocus"], value || (camera.sensor?.autofocus ? "AF" : ""))} placeholder="PDAF" /></Field>
                    <div className="min-w-0 lg:col-span-1"><Field label="Image Resolution"><div className="grid min-w-0 grid-cols-[64px_auto_64px_auto] items-center gap-1"><TextInput inputMode="numeric" value={String(camera.imageResolutionWidth ?? "")} onChange={(e) => updateCameraImageResolution("frontCamera", index, "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="min-w-0 w-full px-2" /><span>×</span><TextInput inputMode="numeric" value={String(camera.imageResolutionHeight ?? "")} onChange={(e) => updateCameraImageResolution("frontCamera", index, "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="min-w-0 w-full px-2" /><span className="text-sm text-slate-500">px</span></div></Field></div>
                    <div className="sm:col-span-2 lg:col-span-6"><Field label="Camera Features"><HelperTermInput suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(camera.features)} onChange={(value) => updatePath(["frontCamera", "cameras", index, "features"], splitCsv(value))} commaSeparated /></Field></div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
          <CollapsiblePanel title="Video Profiles" className="mt-4" titleRight={<button type="button" onClick={() => appendToPath(["frontCamera", "videoProfiles"], { name: "", resolution: "", fps: "", comment: "" })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Video</button>}>
            <div className="grid gap-3">
              {(form.frontCamera?.videoProfiles || []).map((profile, index) => (
                <div key={`front-video-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-12">
                  <Field label="Video Type" className="lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.videotype || []} value={profile.name || ""} onChange={(value) => updatePath(["frontCamera", "videoProfiles", index, "name"], value)} placeholder="Slow motion" /></Field>
                  <Field label="Video Resolution" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.videoresolution || VIDEO_RESOLUTION_OPTIONS} value={profile.resolution || ""} onChange={(value) => updatePath(["frontCamera", "videoProfiles", index, "resolution"], value)} /></Field>
                  <Field label="Frame Rate" className="lg:col-span-1"><UnitInput inputMode="numeric" value={profile.fps || ""} onChange={(e) => updatePath(["frontCamera", "videoProfiles", index, "fps"], e.target.value.replace(/\D/g, ""))} suffix="fps" /></Field>
                  <Field label="Comment" className="lg:col-span-5"><HelperTermInput suggestions={cameraTermSuggestions.comment || []} value={profile.comment || ""} onChange={(value) => updatePath(["frontCamera", "videoProfiles", index, "comment"], value)} placeholder="EIS" /></Field>
                  <div className="flex items-end lg:col-span-1"><button type="button" onClick={() => { if (window.confirm("Remove this video profile? This cannot be undone.")) removeFromPath(["frontCamera", "videoProfiles"], index); }} className="h-10 w-full rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white">Remove</button></div>
                </div>
              ))}
            </div>
            <div><Field label="Video Features"><HelperTermInput suggestions={cameraTermSuggestions.videofeatures || []} value={formatCsv(form.frontCamera?.video?.features)} onChange={(value) => updatePath(["frontCamera", "video", "features"], splitCsv(value))} commaSeparated placeholder="HDR video, face tracking" /></Field></div>
          </CollapsiblePanel>
        </Section>
        </div>

        <div id="mobile-security-sensors" className="scroll-mt-40 [order:11]">
        <Section title="Security & Sensors" description="Fingerprint, face unlock, and sensor coverage for public spec sections and filters.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Field label="Fingerprint Scanner">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {(["yes", "no", "unknown"] as const).map((value, index) => {
                  const selected = value === "yes" ? form.security?.fingerprint?.available === true : value === "no" ? form.security?.fingerprint?.available === false : form.security?.fingerprint?.available === undefined;
                  return <button key={value} type="button" onClick={() => updateFingerprintAvailability(value)} className={`h-8 px-3 text-xs font-semibold ${index ? "border-l border-slate-300" : ""} ${selected ? "bg-blue-700 text-white" : "text-slate-600"}`}>{value === "yes" ? "Yes" : value === "no" ? "No" : "Unknown"}</button>;
                })}
              </div>
            </Field>
            {form.security?.fingerprint?.available === true ? <>
              <Field label="Fingerprint Position"><HelperTermInput suggestions={securityTermSuggestions.fingerprintposition || []} value={formatCsv(form.security?.fingerprint?.locations)} onChange={(value) => updatePath(["security", "fingerprint", "locations"], splitCsv(value))} commaSeparated /></Field>
              <Field label="Fingerprint Technology"><HelperTermInput suggestions={securityTermSuggestions.fingerprinttechnology || []} value={formatCsv(form.security?.fingerprint?.type)} onChange={(value) => updatePath(["security", "fingerprint", "type"], splitCsv(value))} commaSeparated /></Field>
            </> : null}
            <Field label="Face Unlock">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {(["yes", "no", "unknown"] as const).map((value, index) => {
                  const current = form.security?.faceUnlock?.available; const selected = value === "yes" ? current === true : value === "no" ? current === false : current === undefined;
                  return <button key={value} type="button" onClick={() => updateFaceUnlockAvailability(value)} className={`h-8 px-3 text-xs font-semibold ${index ? "border-l border-slate-300" : ""} ${selected ? "bg-blue-700 text-white" : "text-slate-600"}`}>{value === "yes" ? "Yes" : value === "no" ? "No" : "Unknown"}</button>;
                })}
              </div>
            </Field>
            {form.security?.faceUnlock?.available === true ? <Field label="Face Unlock Technology"><HelperTermInput suggestions={securityTermSuggestions.faceunlocktechnology || []} value={cleanText(form.security?.faceUnlock?.type)} onChange={updateFaceUnlockType} commaSeparated /></Field> : null}
            <Field label="Iris Scanner">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: true as boolean | undefined, label: "Yes" },
                  { value: false as boolean | undefined, label: "No" },
                  { value: undefined, label: "Unknown" },
                ].map((option, index) => (
                  <button
                    key={`iris-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      updateIrisScanner(option.value);
                    }}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.security?.irisScanner === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="NFC Sensor">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: false, label: "No" },
                  { value: true, label: "Yes" },
                ].map((option, index) => (
                  <button
                    key={`nfc-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      const current = form.network?.nfc;
                      updatePath(["network", "nfc"], current === option.value ? undefined : option.value);
                    }}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.network?.nfc === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Infrared Sensor">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: false, label: "No" },
                  { value: true, label: "Yes" },
                ].map((option, index) => (
                  <button
                    key={`infrared-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      const current = form.network?.infrared;
                      updatePath(["network", "infrared"], current === option.value ? undefined : option.value);
                    }}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.network?.infrared === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Hardware Sensors</p>
              <div className="flex flex-wrap gap-2">
                {HARDWARE_SENSOR_OPTIONS.map((sensor) => (
                  <button
                    key={`sensor-hardware-${sensor.key}`}
                    type="button"
                    onClick={() => toggleSensorChip(sensor.key, "hardware")}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                      selectedHardwareSensorKeys.has(sensor.key)
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {sensor.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Electronic / Virtual Sensors</p>
              <div className="flex flex-wrap gap-2">
                {SENSOR_BASE_OPTIONS.map((sensor) => (
                  <button
                    key={`sensor-virtual-${sensor.key}`}
                    type="button"
                    onClick={() => toggleSensorChip(sensor.key, "virtual")}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                      selectedVirtualSensorKeys.has(sensor.key)
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {sensor.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Selected Sensors</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {selectedSensorCards.length ? (
                  selectedSensorCards.map((item, index) => (
                    <div key={`selected-sensor-${item.label}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2">
                      <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                      <button type="button" onClick={() => removeSensor(item.label)} className="text-sm font-bold leading-none text-rose-600 hover:text-rose-800" aria-label={`Remove ${item.label}`} title={`Remove ${item.label}`}>×</button>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-xs text-slate-500">No sensors selected yet.</p>
                )}
              </div>
            </div>
            <Field label="Additional Sensors (comma separated)">
              <HelperTermInput
                suggestions={securityTermSuggestions.additionalsensors || []}
                value={formatCsv((form.sensors || []).filter((item) => !sensorOptionMap.has(normalizeSensorBaseKey(item))))}
                onChange={updateAdditionalSensors}
                commaSeparated
                placeholder="Laser autofocus, Color spectrum sensor"
              />
            </Field>
          </div>
        </Section>
        </div>

        <div id="mobile-network-connectivity" className="scroll-mt-40 [order:12]">
        <Section title="Network & Connectivity" description="Supported networks, SIM setup, bands, GNSS, wireless, and USB connectivity.">
          <div className="grid gap-3">
            <div className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Supported Network</p>
                <div className="flex flex-wrap gap-2">
                {SUPPORTED_NETWORK_OPTIONS.map((option) => (
                  <button
                    key={`supported-network-${option}`}
                    type="button"
                    onClick={() => toggleSupportedNetwork(option)}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                      selectedSupportedNetworks.has(option)
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
                </div>
              </div>
              <Field label="Other Network" className="min-w-0">
                <HelperTermInput
                  suggestions={otherNetworkSuggestions}
                  value={formatCsv(form.network?.otherFeatures)}
                  onChange={(value) => updatePath(["network", "otherFeatures"], splitCsv(value))}
                  commaSeparated
                  placeholder="VoLTE, VoWiFi"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className={`grid gap-2 ${simMode === "dual" ? "lg:grid-cols-[8rem_1fr_1fr_0.6fr]" : "lg:grid-cols-[8rem_minmax(0,1fr)]"}`}>
                <Field label="No. of SIM">
                  <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                    {[
                      { value: "single" as const, label: "Single" },
                      { value: "dual" as const, label: "Dual" },
                    ].map((option, index) => (
                      <button
                        key={`sim-mode-${option.value}`}
                        type="button"
                        onClick={() => updateSimMode(simMode === option.value ? "" : option.value)}
                        className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                          simMode === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {simMode === "single" ? (
                  <Field label="SIM 1 Type">
                    <div className="flex flex-wrap gap-2">
                      {SIM_SINGLE_OPTIONS.map((option) => (
                        <button
                          key={`single-sim-slot-${option}`}
                          type="button"
                          onClick={() => updateSimSlot("slot1Type", option)}
                          className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                            cleanText(form.network?.sim?.slot1Type || form.network?.sim?.config) === option
                              ? "border-blue-700 bg-blue-700 text-white"
                              : "border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </Field>
                ) : null}

                {simMode === "dual" ? (
                  <>
                    <Field label="SIM 1">
                      <div className="flex flex-wrap gap-2">
                        {SIM_SLOT_OPTIONS.map((option) => (
                          <button
                            key={`dual-sim1-${option}`}
                            type="button"
                            onClick={() => updateSimSlot("slot1Type", option)}
                            className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                              cleanText(form.network?.sim?.slot1Type) === option
                                ? "border-blue-700 bg-blue-700 text-white"
                                : "border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="SIM 2">
                      <div className="flex flex-wrap gap-2">
                        {SIM_SLOT_OPTIONS.map((option) => (
                          <button
                            key={`dual-sim2-${option}`}
                            type="button"
                            onClick={() => updateSimSlot("slot2Type", option)}
                            className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                              cleanText(form.network?.sim?.slot2Type) === option
                                ? "border-blue-700 bg-blue-700 text-white"
                                : "border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Dual SIM Config">
                      <TextInput className="w-full bg-slate-50 text-slate-700" value={form.network?.sim?.config || ""} readOnly />
                    </Field>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {has5GNetworkSelected ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-extrabold text-slate-900">5G Bands (NR)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="FDD">
                    <HelperTermInput
                      suggestions={fiveGBandSuggestions}
                      value={normalizeBandCsv(formatCsv(form.network?.bands?.["5G"]?.fdd))}
                      onChange={(value) => updatePath(["network", "bands", "5G", "fdd"], splitAndCleanList(normalizeBandCsv(value)))}
                      commaSeparated
                      placeholder="n1, n3, n28"
                    />
                  </Field>
                  <Field label="TDD">
                    <HelperTermInput
                      suggestions={fiveGBandSuggestions}
                      value={normalizeBandCsv(formatCsv(form.network?.bands?.["5G"]?.tdd))}
                      onChange={(value) => updatePath(["network", "bands", "5G", "tdd"], splitAndCleanList(normalizeBandCsv(value)))}
                      commaSeparated
                      placeholder="n40, n77, n78"
                    />
                  </Field>
                </div>
                <Field label="5G Band" className="mt-3">
                  <HelperTermInput
                    suggestions={fiveGBandSuggestions}
                    value={allBandValues(form.network?.bands?.["5G"])}
                    onChange={(value) => updatePath(["network", "bands", "5G", "all"], sortBandTokens(splitAndCleanList(value)))}
                    commaSeparated
                    placeholder="n1, n3, n28, n77"
                  />
                </Field>
              </div>
            ) : null}
            {has4GNetworkSelected ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-900">4G Bands (LTE)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="FDD">
                  <HelperTermInput
                    suggestions={fourGBandSuggestions}
                    value={normalizeBandCsv(formatCsv(form.network?.bands?.["4G"]?.fdd))}
                    onChange={(value) => updatePath(["network", "bands", "4G", "fdd"], splitAndCleanList(normalizeBandCsv(value)))}
                    commaSeparated
                    placeholder="b1, b3, b5"
                  />
                </Field>
                <Field label="TDD">
                  <HelperTermInput
                    suggestions={fourGBandSuggestions}
                    value={normalizeBandCsv(formatCsv(form.network?.bands?.["4G"]?.tdd))}
                    onChange={(value) => updatePath(["network", "bands", "4G", "tdd"], splitAndCleanList(normalizeBandCsv(value)))}
                    commaSeparated
                    placeholder="b38, b40, b41"
                  />
                </Field>
              </div>
              <Field label="4G Band" className="mt-3">
                <HelperTermInput
                  suggestions={fourGBandSuggestions}
                  value={allBandValues(form.network?.bands?.["4G"])}
                  onChange={(value) => updatePath(["network", "bands", "4G", "all"], sortBandTokens(splitAndCleanList(value)))}
                  commaSeparated
                  placeholder="b1, b3, b5, b40"
                />
              </Field>
            </div> : null}
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">GPS / GNSS</p>
              <div className="flex flex-wrap gap-2">
                {GPS_OPTIONS.map((option) => (
                  <button
                    key={`gps-${option}`}
                    type="button"
                    onClick={() => toggleTextOption(["network", "gps"], option)}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                      (form.network?.gps || []).includes(option)
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Bluetooth Version</p>
                <div className="flex flex-wrap gap-2">
                  {BLUETOOTH_VERSION_OPTIONS.map((version) => (
                    <button
                      key={`bt-version-${version}`}
                      type="button"
                      onClick={() => toggleBluetoothVersion(version)}
                      className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                        bluetoothVersionSelected === version
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {version}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Bluetooth Features</p>
                <div className="flex flex-wrap gap-2">
                  {bluetoothFeaturePool.map((feature) => (
                    <button
                      key={`bt-feature-${feature}`}
                      type="button"
                      onClick={() => toggleTextOption(["network", "bluetoothFeatures"], feature)}
                      className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                        (form.network?.bluetoothFeatures || []).some((item) => cleanText(item).toLowerCase() === feature.toLowerCase())
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {feature}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Wi-Fi Version</p>
                <div className="flex flex-wrap gap-2">
                  {WIFI_VERSION_OPTIONS.map((version) => (
                    <button
                      key={`wifi-version-${version}`}
                      type="button"
                      onClick={() => toggleWifiVersion(version)}
                      className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                        wifiVersionSelected === version
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Wi-Fi {version}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Wi-Fi Features</p>
                <div className="flex flex-wrap gap-2">
                  {wifiFeaturePool.map((feature) => (
                    <button
                      key={`wifi-feature-${feature}`}
                      type="button"
                      onClick={() => toggleTextOption(["network", "wifi", "features"], feature)}
                      className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                        (form.network?.wifi?.features || []).some((item) => cleanText(item).toLowerCase() === feature.toLowerCase())
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {feature}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-extrabold text-slate-900">USB Connectivity</p>
            <div className="relative z-30">
              <div className="grid min-w-[760px] grid-cols-[14rem_15rem_minmax(0,1fr)] items-end gap-4">
                <Field label="USB Type">
                  <HelperTermInput
                    suggestions={usbTypeSuggestions}
                    value={form.network?.usb?.type || ""}
                    onChange={(value) => updatePath(["network", "usb", "type"], titleCaseWords(value))}
                    placeholder="USB Type-C"
                  />
                </Field>
                <Field label="USB Version">
                  <div className="flex flex-wrap gap-2">
                    {USB_VERSION_OPTIONS.map((version) => (
                      <button
                        key={`usb-version-${version}`}
                        type="button"
                        onClick={() => toggleUsbVersion(version)}
                        className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                          usbVersionSelected === version
                            ? "border-blue-700 bg-blue-700 text-white"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {version}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Other USB Features">
                  <div className="flex flex-wrap gap-2">
                    {usbFeaturePool.map((feature) => (
                      <button
                        key={`usb-feature-${feature}`}
                        type="button"
                        onClick={() => toggleTextOption(["network", "usb", "features"], feature)}
                        className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0 text-xs font-semibold leading-none transition ${
                          (form.network?.usb?.features || []).some((item) => cleanText(item).toLowerCase() === feature.toLowerCase())
                            ? "border-blue-700 bg-blue-700 text-white"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {feature}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </Section>
        </div>

        <div id="mobile-software" className="scroll-mt-40 [order:13]">
        <Section title="Software" description="OS, UI, and update commitment information.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="OS">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {[
                  { key: "android" as const, label: "Android" },
                  { key: "ios" as const, label: "iOS" },
                ].map((option, index) => (
                  <button
                    key={`software-os-${option.key}`}
                    type="button"
                    onClick={() => {
                      const selected = osNameKey === option.key;
                      updateSoftwareOsName(selected ? undefined : option.key);
                    }}
                    className={`inline-flex h-8 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      osNameKey === option.key ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="OS Version">
              <TextInput
                value={normalizeOsVersion(form.software?.os?.version || "")}
                onChange={(e) => updateSoftwareOsVersion(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 18.1"
              />
            </Field>
            <Field label="Custom UI">
              <TextInput
                value={form.software?.ui || ""}
                onChange={(e) => updatePath(["software", "ui"], e.target.value)}
                list={customUiSuggestions.length ? "suggest-custom-ui" : undefined}
                placeholder="One UI 8"
              />
            </Field>
            <Field label="OS Updates">
              <div className="relative">
                <TextInput className="w-full pr-16" value={form.software?.updates?.os ?? ""} onChange={(e) => updatePath(["software", "updates", "os"], parseOptionalNumber(sanitizeDigits(e.target.value, 2)))} inputMode="numeric" maxLength={2} placeholder="3" />
                <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">Years</span>
              </div>
            </Field>
            <Field label="Security Updates">
              <div className="relative">
                <TextInput className="w-full pr-16" value={form.software?.updates?.security ?? ""} onChange={(e) => updatePath(["software", "updates", "security"], parseOptionalNumber(sanitizeDigits(e.target.value, 2)))} inputMode="numeric" maxLength={2} placeholder="4" />
                <span className="pointer-events-none absolute inset-y-1 right-1 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">Years</span>
              </div>
            </Field>
          </div>
        </Section>
        </div>

        <div id="mobile-images" className="scroll-mt-40 [order:14]">
          <Section title="Images" description="Upload product photos in Cloudinary Media Library, then add their delivery URLs here. All-colors overview appears first, followed by the selected color’s images.">
          <div className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Gallery background</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(form.imageBackground || "") ? form.imageBackground : "#ffffff"}
                  onChange={(e) => setField("imageBackground", e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1"
                  aria-label="Choose gallery background color"
                />
                Choose color
              </label>
              <button
                type="button"
                onClick={() => setField("imageBackground", "#ffffff")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${String(form.imageBackground || "#ffffff").toLowerCase() === "#ffffff" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"}`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setField("imageBackground", "transparent")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.imageBackground === "transparent" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"}`}
              >
                Transparent
              </button>
              {form.imageBackground === "transparent" ? <span className="text-xs text-slate-500">Choose a color above to return to a solid background.</span> : null}
            </div>
          </div>
          <p className="mb-2 text-xs text-slate-500">Paste delivery URLs for images uploaded in Cloudinary Media Library. Select “All colors” for an overview, or choose one of Smartphone Colors for a color-specific photo.</p>
          <div className="grid items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[170px_150px_minmax(0,1fr)_auto]">
            <Field label="Purpose">
              <select value={imagePurposeDraft} onChange={(event) => { setImagePurposeDraft(event.target.value); if (event.target.value === "All colors") setImageColorDraft("All colors"); else if (imageColorDraft === "All colors") setImageColorDraft(""); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {PRODUCT_IMAGE_PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
              </select>
            </Field>
            <Field label="Color">
              <select value={imagePurposeDraft === "All colors" ? "All colors" : imageColorDraft} disabled={imagePurposeDraft === "All colors"} onChange={(event) => setImageColorDraft(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">No color</option>
                <option value="All colors">All colors</option>
                {(form.design?.colors || []).map((color) => <option key={color} value={color}>{color}</option>)}
              </select>
            </Field>
            <Field label={<span className="flex w-full items-center justify-between gap-2"><span>Cloudinary delivery URL</span><button type="button" onClick={addAutomaticImageOptimizations} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">Add f_auto/q_auto</button></span>}>
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>(</span>
                <code className="break-all">{CLOUDINARY_DELIVERY_URL_PREFIX}</code>
                <span>)</span>
                <button type="button" onClick={copyCloudinaryDeliveryUrlPrefix} className="shrink-0 font-semibold text-blue-700 underline underline-offset-2">Copy prefix</button>
              </div>
              <TextInput className="w-full min-w-0 bg-white" value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCloudinaryImageUrl(); } }} placeholder="https://res.cloudinary.com/.../image/upload/..." />
            </Field>
            <button type="button" onClick={addCloudinaryImageUrl} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add image</button>
          </div>
          <div className="inline-flex w-fit overflow-hidden rounded-lg border border-slate-300 bg-white" role="tablist" aria-label="Image display mode">
            <button type="button" role="tab" aria-selected={imageAdminView === "list"} onClick={() => setImageAdminView("list")} className={`px-4 py-2 text-sm font-semibold ${imageAdminView === "list" ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>Image list</button>
            <button type="button" role="tab" aria-selected={imageAdminView === "preview"} onClick={() => setImageAdminView("preview")} className={`border-l border-slate-300 px-4 py-2 text-sm font-semibold ${imageAdminView === "preview" ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>Image preview</button>
          </div>
          {imageAdminView === "list" ? (
            <ProductImageItemsEditor
              items={form.imageItems || []}
              colorOptions={form.design?.colors || []}
              imageBackground={form.imageBackground || "#ffffff"}
              disabled={false}
              onChange={(items) => setField("imageItems", items)}
            />
          ) : (
            (form.imageItems || []).length > 0 ? (() => {
              const previewItems = form.imageItems || [];
              const activeIndex = Math.min(imagePreviewIndex, previewItems.length - 1);
              const activeItem = previewItems[activeIndex];
              const previewBackground = form.imageBackground === "transparent" ? "transparent" : form.imageBackground || "#ffffff";
              return (
                <div className="grid gap-3" aria-label="Preview product gallery">
                  <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
                    <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-64 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
                      {previewItems.slice(0, 8).map((item, index) => (
                        <button key={`${item.url}-${index}`} type="button" onClick={() => setImagePreviewIndex(index)} aria-pressed={activeIndex === index} aria-label={`Show image ${index + 1}`} style={{ backgroundColor: previewBackground }} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${activeIndex === index ? "border-blue-400" : "border-slate-200"}`}>
                          <Image src={item.url} alt={`${form.name || "Product"} thumbnail ${index + 1}`} fill className="object-contain p-1" unoptimized />
                        </button>
                      ))}
                    </div>
                    <div className="order-1 grid min-w-0 gap-2 sm:order-2">
                      <div style={{ backgroundColor: previewBackground }} className="relative h-64 overflow-hidden rounded-xl border border-slate-100">
                        <Image src={activeItem.url} alt={`${form.name || "Product"} image ${activeIndex + 1}`} fill className="object-contain" unoptimized />
                      </div>
                      <div className="flex flex-wrap justify-center gap-2" aria-label={`Metadata for image ${activeIndex + 1}`}>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{activeItem.purpose || "Other"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{activeItem.color || "No color"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : <p className="text-sm text-slate-500">Add an image to preview it here.</p>
          )}
          {imageColorErrors.length > 0 ? (
            <div className="grid gap-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              <strong>Image color names must match Smartphone Colors.</strong>
              {imageColorErrors.map((item) => <button key={`${item.index}-${item.color}`} type="button" className="w-fit text-left underline" onClick={() => { const field = document.querySelector(`[aria-label="Image ${item.index + 1} color"]`); field?.scrollIntoView({ behavior: "smooth", block: "center" }); (field as HTMLElement | null)?.focus(); }}>Image {item.index + 1}: {item.message} Go to row.</button>)}
            </div>
          ) : null}
          {dimensionColorErrors.length > 0 ? (
            <div className="grid gap-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              <strong>Body Size &amp; Weight colors must match Smartphone Colors.</strong>
              {dimensionColorErrors.map((item) => <button key={`${item.path}-${item.color}`} type="button" className="w-fit text-left underline" onClick={() => { const field = document.querySelector(`[data-color-path="${item.path}"]`); field?.scrollIntoView({ behavior: "smooth", block: "center" }); (field as HTMLElement | null)?.focus(); }}>{item.label}: “{item.color}” is not in Smartphone Colors. Go to field.</button>)}
            </div>
          ) : null}
        </Section>
        </div>
        </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              {mobileDetailsView === "content_json_csv"
                ? "Content JSON / CSV view will be added after single-entry flow is fully finalized."
                : "Bulk JSON / CSV view will be added after single-entry flow is fully finalized."}
            </div>
          )}
          </div>
          ) : null}
        </Section>

        <div className="pb-8">
          <div className="panel flex flex-wrap gap-2 p-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving..." : editingId ? `Update ${pageTitle}` : `Create ${pageTitle}`}
            </button>
            {editingId ? (
              <button
                type="button"

                onClick={() => {
                  resetForm();
                  goToListView();
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel Edit
              </button>
            ) : null}
            <Link
              href={editingId ? `/${deviceType === "smartphone" ? "mobile" : "tablets"}/${encodeURIComponent(finalSlug)}?preview=1&id=${encodeURIComponent(editingId)}` : "#"}
              target="_blank"
              rel="noreferrer"
              title={editingId ? "Preview saved product" : "Save the product before previewing"}
              className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${!editingId ? "opacity-60 pointer-events-none" : ""}`}
            >
              Live Preview
            </Link>
          </div>
        </div>

        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
          <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? `Update ${pageTitle}` : `Create ${pageTitle}`}
              </button>
              <Link
                href={editingId ? `/${deviceType === "smartphone" ? "mobile" : "tablets"}/${encodeURIComponent(finalSlug)}?preview=1&id=${encodeURIComponent(editingId)}` : "#"}
                target="_blank"
                rel="noreferrer"
                title={editingId ? "Preview saved product" : "Save the product before previewing"}
                className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 ${!editingId ? "opacity-60 pointer-events-none" : ""}`}
              >
                Live Preview
              </Link>
            </div>
          </div>
        </div>

        {helperSuggestions.length ? (
          <datalist id="suggest-helper">
            {helperSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ) : null}
        {processorNameSuggestions.length ? (
          <datalist id="processor-chipset-suggest">
            {processorNameSuggestions.map((item) => (
              <option key={`processor-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {filteredOsVersionSuggestions.length ? (
          <datalist id="suggest-os-version">
            {filteredOsVersionSuggestions.map((item) => (
              <option key={`os-version-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {customUiSuggestions.length ? (
          <datalist id="suggest-custom-ui">
            {customUiSuggestions.map((item) => (
              <option key={`custom-ui-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {osUpdateSuggestions.length ? (
          <datalist id="suggest-os-updates">
            {osUpdateSuggestions.map((item) => (
              <option key={`os-updates-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {securityUpdateSuggestions.length ? (
          <datalist id="suggest-security-updates">
            {securityUpdateSuggestions.map((item) => (
              <option key={`security-updates-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {batteryTypeSuggestions.length ? (
          <datalist id="suggest-battery-type">
            {batteryTypeSuggestions.map((item) => (
              <option key={`battery-type-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
        {usbTypePool.length ? (
          <datalist id="suggest-usb-type">
            {usbTypePool.map((item) => (
              <option key={`usb-type-suggest-${item}`} value={item} />
            ))}
          </datalist>
        ) : null}
      </form>
        </>
      )}
    </main>
  );
}
