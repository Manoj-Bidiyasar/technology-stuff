"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PRODUCT_QUICK_SPECS,
  type FrontCameraUnit,
  type MemoryVariant,
  type ProductGeneralVariant,
  type Product,
  type ProductImageItem,
  type ProductDisplayPanel,
  type RearCameraUnit,
  type ProductQuickSpecKey,
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
const QUICK_SPEC_LABELS: Array<{ key: ProductQuickSpecKey; label: string }> = [
  { key: "processor", label: "Processor" },
  { key: "chipset-score", label: "Chipset Score" },
  { key: "display", label: "Display" },
  { key: "primary-display", label: "Primary Display" },
  { key: "secondary-display", label: "Secondary Display" },
  { key: "refresh-rate", label: "Refresh Rate" },
  { key: "ram-storage", label: "RAM / Storage" },
  { key: "rear", label: "Rear Camera" },
  { key: "front", label: "Front Camera" },
  { key: "battery", label: "Battery / Charger" },
  { key: "security", label: "Fingerprint / Face Unlock" },
  { key: "software", label: "Android / UI" },
  { key: "updates", label: "OS Updates" },
];
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
const VIBRATION_MOTOR_OPTIONS = ["X-Axis Vibration Motor", "X-Axis Linear Vibration Motor", "Z-Axis Vibration Motor", "Z-Axis Linear Vibration Motor", "ERM Vibration Motor", "Dual Linear Vibration Motors"] as const;
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
  { key: "irblaster", label: "IR Blaster" },
  { key: "nfc", label: "NFC" },
  { key: "hallsensor", label: "Hall Sensor" },
  { key: "stepsensor", label: "Step Sensor" },
  { key: "irsensor", label: "IR Sensor" },
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
const PACKAGE_CABLE_OPTIONS = ["Type-C Cable", "Type-C to Type-C Cable", "Type-A to Type-C Cable", "Micro USB Cable", "Type-C to Lightning Cable"] as const;
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
const HARDWARE_SENSOR_OPTIONS = SENSOR_BASE_OPTIONS.filter((sensor) => sensor.key !== "ecompass" && sensor.key !== "nfc");
const MULTIMEDIA_FEATURE_OPTIONS = ["FM Radio", "Hi-Res Audio Certification", "Hi-Res Video", "Dolby Atmos", "Dolby Vision", "DTS Sound", "Widevine L1", "Widevine L3", "Spatial Sound", "Single Speaker", "Single Stereo Speaker", "Dual Speaker", "Dual Stereo Speaker", "Dual Mic Noise Cancellation"] as const;
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
const CAMERA_NAME_OPTIONS = ["Primary Camera", "Secondary Camera", "Tertiary Camera", "Fourth Camera", "Fifth Camera"] as const;
const CAMERA_TYPE_OPTIONS = ["Main", "Wide", "Wide-angle", "Ultra-wide", "Telephoto", "Periscope", "Macro", "Depth", "Monochrome", "ToF", "Other"] as const;
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

function sortCameraUnitsWithIndices<T extends { role?: string }>(cameras: T[]) {
  const order = ["primary", "main", "secondary", "tertiary", "fourth", "fifth"];
  return cameras.map((camera, index) => ({ camera, index })).sort((left, right) => {
    const roleKey = (camera: T) => cleanText(camera.role).toLowerCase().replace(/\s+camera$/, "");
    const leftRole = roleKey(left.camera);
    const rightRole = roleKey(right.camera);
    const leftRank = order.findIndex((role) => leftRole === role || leftRole.startsWith(`${role} `));
    const rightRank = order.findIndex((role) => rightRole === role || rightRole.startsWith(`${role} `));
    return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank) || left.index - right.index;
  });
}

function getCameraUnitSummary(camera: RearCameraUnit | FrontCameraUnit): string[] {
  const sensor = camera.sensor || {};
  const imageResolution = camera.imageResolutionWidth && camera.imageResolutionHeight
    ? `${camera.imageResolutionWidth} × ${camera.imageResolutionHeight} px`
    : camera.imageResolution;
  const autofocus = sensor.autofocus || ("autofocus" in camera ? camera.autofocus : "");
  const values = [
    ["Type", camera.cameraType || camera.purpose || camera.type],
    ["Resolution", camera.resolution ? `${camera.resolution} MP` : ""],
    ["Image", imageResolution],
    ["Sensor", sensor.name],
    ["Aperture", sensor.aperture ? `f/${sensor.aperture}` : ""],
    ["Sensor size", sensor.size ? `${sensor.size} inch` : ""],
    ["Pixel size", sensor.pixelSize ? `${sensor.pixelSize} µm` : ""],
    ["Focal length", sensor.focalLength ? `${sensor.focalLength} mm` : ""],
    ["FOV", sensor.fov ? `${sensor.fov}°` : ""],
    ["Lens", sensor.lensType],
    ["Optical zoom", sensor.opticalZoom ? `${sensor.opticalZoom}×` : ""],
    ["Digital zoom", sensor.digitalZoom ? `${sensor.digitalZoom}×` : ""],
    ["Focus", autofocus === "AF" || autofocus === "FF" ? autofocus : autofocus ? `AF (${autofocus})` : ""],
    ["Stabilization", [sensor.ois ? "OIS" : "", sensor.eis ? "EIS" : ""].filter(Boolean).join(" + ")],
    ["Binning resolution", sensor.binnedResolution ? `${sensor.binnedResolution} MP` : ""],
    ["Binned pixel size", sensor.binnedPixelSize ? `${sensor.binnedPixelSize} µm` : ""],
    ["Binning", sensor.binningDetails || (sensor.binningSupported ? "Supported" : "")],
    ["Postures", camera.posturesVisible?.join(", ")],
    ["Features", camera.features?.join(", ")],
  ] as const;
  return values.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "").map(([label, value]) => `${label}: ${value}`);
}

function getBinningDetailsInputValue(pixelSize?: string, details?: string): string {
  const extraDetails = cleanText(details).replace(/^\s*\d+(?:\.\d+)?\s*(?:µm|um)\s*/i, "").trim();
  return [pixelSize ? `${pixelSize} µm` : "", extraDetails].filter(Boolean).join(" ");
}

function getBinningDetailsExtraValue(value: string, pixelSize?: string): string {
  if (!pixelSize) return value.trim();
  const prefix = `${pixelSize} µm`;
  return value.startsWith(prefix) ? value.slice(prefix.length).trim() : value.trim();
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
    seo: {},
    images: [],
    imageItems: [],
    allColorImages: [],
    imageVariants: [],
    imageBackground: "#ffffff",
    quickSpecs: [...DEFAULT_PRODUCT_QUICK_SPECS],
    quickSpecsVersion: 2,
    quickSpecOverrides: {},
    specs: {},
    performance: {},
    camera: {},
    frontCamera: {},
    rearCamera: {},
    security: {},
    sensors: [],
    network: { supported: ["5G", "4G", "3G", "2G"] },
    software: {},
    design: {},
    general: {},
    memoryStorage: {
      showOnlyMaxRamStorageTypes: true,
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
    .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1\u0000")
    .split(",")
    .map((item) => item.replace(/\u0000/g, ",").trim())
    .filter(Boolean);
}

function splitStylusFeatures(value: string): string[] {
  return splitCsv(value.replace(/\n/g, ","));
}

function cameraAfModes(value: string | undefined): string[] {
  return splitCsv(value || "").filter((item) => ["AF", "FF"].includes(item.toUpperCase()));
}

function cameraAfDetails(value: string | undefined): string[] {
  return splitCsv(value || "").filter((item) => !["AF", "FF"].includes(item.toUpperCase()));
}

function toggleCameraAfMode(value: string | undefined, mode: "AF" | "FF"): string {
  const modes = cameraAfModes(value);
  const nextModes = modes.includes(mode) ? modes.filter((item) => item !== mode) : [...modes, mode];
  return [...nextModes, ...cameraAfDetails(value)].join(", ");
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

function selectedDisplayFeatureValues(panel: ProductDisplayPanel): string[] {
  const values: string[] = [];
  if (panel.includeDimmingInOtherFeatures) values.push(...(panel.dimming || []));
  if (panel.includeAlwaysOnDisplayInOtherFeatures && (panel.alwaysOnDisplay || []).some((feature) => /always-on display/i.test(feature))) {
    const hz = String(panel.alwaysOnDisplayHz ?? "").trim();
    const formattedHz = hz ? (/hz$/i.test(hz) ? hz.replace(/\s*hz$/i, "Hz") : `${hz}Hz`) : "";
    values.push(formattedHz ? `${formattedHz} (Always-On Display)` : "Always-On Display");
  }
  if (panel.includePalmRejectionInOtherFeatures && panel.stylus?.palmRejection === true) {
    values.push("Palm Rejection: Yes");
  }
  return values;
}

type CameraVideoProfile = {
  name?: string;
  resolution?: string;
  fps?: string;
  comment?: string;
  camera?: string;
  modes?: string[];
  recording?: string[];
  features?: string[];
};

type CameraVideoProfileEntry = {
  profile: string;
  comment: string;
};

type CameraVideoProfileGroup = {
  name: string;
  profiles: string;
  comment: string;
  entries?: CameraVideoProfileEntry[];
  camera?: string;
  modes?: string[];
  features?: string[];
};

function normalizeVideoProfileList(value: string): string {
  const grouped = new Map<string, { resolution: string; rates: Set<string>; details: string }>();
  splitAndCleanList(value).forEach((entry) => {
    const match = entry.match(/^(.*?)\s*@\s*([\d./]+)\s*(?:fps)?(?:\s+(.+))?$/i);
    const resolution = (match?.[1] || entry).trim().replace(/(\d+)P\b/gi, "$1p");
    const details = (match?.[3] || "").trim();
    if (!resolution) return;
    const key = `${resolution.toLowerCase()}|${details.toLowerCase()}`;
    const current = grouped.get(key) || { resolution, rates: new Set<string>(), details };
    String(match?.[2] || "").split(/[/.]/).filter(Boolean).forEach((rate) => current.rates.add(rate));
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).map(({ resolution, rates, details }) => {
    const orderedRates = Array.from(rates).sort((left, right) => Number(left) - Number(right));
    const profile = orderedRates.length ? `${resolution}@${orderedRates.join("/")}fps` : resolution;
    return details ? `${profile} ${details}` : profile;
  }).join(", ");
}

function groupCameraVideoProfiles(profiles?: CameraVideoProfile[]): CameraVideoProfileGroup[] {
  const groups = new Map<string, { group: CameraVideoProfileGroup; entries: CameraVideoProfileEntry[] }>();
  (profiles || []).forEach((profile) => {
    const name = cleanText(profile.name);
    const key = name ? normalizeLookupKey(name) : "empty";
    const group = groups.get(key) || {
      group: { name, profiles: "", comment: "", entries: [], camera: profile.camera, modes: profile.modes, features: profile.features },
      entries: [],
    };
    const rates = String(profile.fps || "").split(/[/.]/).filter(Boolean);
    const resolutions = [profile.resolution, ...(profile.recording || [])].filter(Boolean) as string[];
    resolutions.forEach((value) => splitAndCleanList(value).forEach((resolution, resolutionIndex) => {
      const rate = rates[resolutionIndex] || rates[0];
      const entry = rate && !/@/.test(resolution) ? `${resolution}@${rate}` : resolution;
      group.entries.push({ profile: normalizeVideoProfileList(entry), comment: cleanText(profile.comment) });
    }));
    if (profile.features?.length) group.group.features = Array.from(new Set([...(group.group.features || []), ...profile.features]));
    groups.set(key, group);
  });
  return Array.from(groups.values()).map(({ group, entries }) => ({
    ...group,
    entries,
    profiles: entries.map((entry) => entry.profile).join(", "),
  }));
}

function CameraVideoProfilesEditor({
  camera,
  profiles,
  suggestions,
  videoFeatures,
  videoFeaturesLabel,
  onChangeProfiles,
  onChangeVideoFeatures,
}: {
  camera: "rearCamera" | "frontCamera";
  profiles?: CameraVideoProfile[];
  suggestions: Record<string, string[]>;
  videoFeatures: string;
  videoFeaturesLabel: string;
  onChangeProfiles: (groups: CameraVideoProfileGroup[]) => void;
  onChangeVideoFeatures: (value: string) => void;
}) {
  const groups = groupCameraVideoProfiles(profiles);
  const [draft, setDraft] = useState<CameraVideoProfileGroup>({ name: "", profiles: "", comment: "" });
  const [editingEntry, setEditingEntry] = useState<{ groupIndex: number; entryIndex: number } | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const entryKey = (groupIndex: number, entryIndex: number) => `${groupIndex}:${entryIndex}`;

  function resetDraft() {
    setDraft({ name: "", profiles: "", comment: "" });
    setEditingEntry(null);
  }

  function saveDraft() {
    const next = [...groups];
    const normalizedProfile = normalizeVideoProfileList(draft.profiles);
    const profileEntries = splitAndCleanList(normalizedProfile);
    if (profileEntries.length === 0) return;

    if (editingEntry) {
      const source = next[editingEntry.groupIndex];
      const sourceEntries = [...(source?.entries || [])];
      sourceEntries.splice(editingEntry.entryIndex, 1);
      if (source) next[editingEntry.groupIndex] = { ...source, entries: sourceEntries, profiles: sourceEntries.map((entry) => entry.profile).join(", ") };
    }

    const targetKey = draft.name.trim() ? normalizeLookupKey(draft.name) : "empty";
    const targetIndex = next.findIndex((group) => (group.name.trim() ? normalizeLookupKey(group.name) : "empty") === targetKey);
    const newEntries = profileEntries.map((profile) => ({ profile, comment: draft.comment.trim() }));
    if (targetIndex >= 0) {
      const target = next[targetIndex];
      const entries = [...(target.entries || []), ...newEntries];
      next[targetIndex] = {
        ...target,
        name: draft.name,
        entries,
        profiles: entries.map((entry) => entry.profile).join(", "),
      };
    } else {
      next.push({ ...draft, entries: newEntries, profiles: newEntries.map((entry) => entry.profile).join(", ") });
    }
    onChangeProfiles(next.filter((group) => group.entries?.length));
    resetDraft();
  }

  function deleteSelectedEntries() {
    if (selectedEntries.size === 0) return;
    const descriptions = Array.from(selectedEntries).map((key) => {
      const [groupIndex, entryIndex] = key.split(":").map(Number);
      const group = groups[groupIndex];
      const profileEntry = group?.entries?.[entryIndex];
      const profile = profileEntry?.profile;
      const detail = profileEntry?.comment;
      return [group?.name, profile, detail].filter(Boolean).join(": ") || "Video profile";
    });
    const preview = descriptions.slice(0, 5).map((item) => `- ${item}`).join("\n");
    const remaining = descriptions.length > 5 ? `\n- and ${descriptions.length - 5} more` : "";
    if (!window.confirm(`Delete ${descriptions.length} selected video profile${descriptions.length === 1 ? "" : "s"}?\n\n${preview}${remaining}`)) return;

    const next = groups.map((group, groupIndex) => ({
      ...group,
      entries: (group.entries || []).filter((_, entryIndex) => !selectedEntries.has(entryKey(groupIndex, entryIndex))),
    })).map((group) => ({ ...group, profiles: (group.entries || []).map((entry) => entry.profile).join(", ") })).filter((group) => group.entries?.length);
    onChangeProfiles(next);
    setSelectedEntries(new Set());
    setDeleteMode(false);
    if (editingEntry && selectedEntries.has(entryKey(editingEntry.groupIndex, editingEntry.entryIndex))) resetDraft();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-slate-900">Video Profiles</p>
        {deleteMode ? (
          <div className="flex gap-2">
            <button type="button" onClick={deleteSelectedEntries} disabled={!selectedEntries.size} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Delete selected ({selectedEntries.size})</button>
            <button type="button" onClick={() => { setDeleteMode(false); setSelectedEntries(new Set()); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setDeleteMode(true)} disabled={!groups.some((group) => splitAndCleanList(group.profiles).length)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Delete profiles</button>
          </div>
        )}
        <button type="button" onClick={() => setIsCollapsed((current) => !current)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={!isCollapsed}>{isCollapsed ? "Show" : "Hide"}</button>
      </div>
      {!isCollapsed ? <div className="mt-3 grid gap-3">
      <p className="text-xs text-slate-500">Profiles with the same video type are grouped together.</p>
      {groups.map((group, groupIndex) => {
        const entries = group.entries || [];
        if (entries.length === 0) return null;
        return (
          <div key={`${camera}-video-group-${groupIndex}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {group.name ? <span className="text-xs font-bold text-slate-700">{group.name}</span> : null}
            {entries.map((entry, entryIndex) => {
                const key = entryKey(groupIndex, entryIndex);
                const selected = selectedEntries.has(key);
                return (
                  <div key={key} className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 ${selected ? "border-rose-400 bg-rose-50" : "border-blue-200 bg-white"}`}>
                    {deleteMode ? (
                      <button type="button" onClick={() => setSelectedEntries((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${selected ? "border-rose-600 bg-rose-600 text-white" : "border-slate-400 bg-white text-rose-700"}`} aria-label={`${selected ? "Deselect" : "Select"} ${entry.profile}`} aria-pressed={selected}>
                        {selected ? <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg> : null}
                      </button>
                    ) : null}
                    <span className="whitespace-nowrap text-xs font-semibold text-blue-800">{normalizeVideoProfileList(entry.profile)}</span>
                    {entry.comment ? <span className="whitespace-nowrap text-[11px] text-slate-500">{entry.comment}</span> : null}
                    {!deleteMode ? <button type="button" onClick={() => { setDraft({ ...group, profiles: entry.profile, comment: entry.comment }); setEditingEntry({ groupIndex, entryIndex }); }} className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${entry.profile}`} title="Edit">
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m13.8 3.2 3 3M3 17l3.8-.8L16.6 6.4a2.12 2.12 0 0 0-3-3L3.8 13.2 3 17Z" /></svg>
                    </button> : null}
                  </div>
                );
              })}
          </div>
        );
      })}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.75fr)_minmax(0,5.5fr)_minmax(0,2.75fr)_minmax(0,1fr)]">
        <Field label="Video Type"><HelperTermInput suggestions={suggestions.videotype || []} value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="Video Recording" /></Field>
        <Field label={<><span>Video Profile (e.g. 720p@30/60 or 720p@30)</span> <span className="text-rose-600">Do not use 720p/1080p@30</span></>}><TextInput value={draft.profiles} onChange={(event) => setDraft((current) => ({ ...current, profiles: event.target.value }))} placeholder="720p@30/60" /></Field>
        <div className="grid gap-1">
          <div className="flex min-h-5 flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-600">Comment</span>
            {["OIS", "EIS", "OIS + EIS"].map((comment) => (
              <button key={comment} type="button" onClick={() => setDraft((current) => ({ ...current, comment }))} aria-pressed={draft.comment === comment} className={`rounded-full border px-1.5 py-0 text-[9px] font-semibold leading-4 ${draft.comment === comment ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`}>{comment}</button>
            ))}
          </div>
          <HelperTermInput suggestions={suggestions.comment || []} value={draft.comment} onChange={(value) => setDraft((current) => ({ ...current, comment: value }))} placeholder="OIS, EIS, or other detail" />
        </div>
        <div className="flex items-end gap-2">
          <button type="button" onClick={saveDraft} disabled={!draft.profiles.trim()} className="h-10 w-full rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{editingEntry ? "Update" : "Save"}</button>
          {editingEntry ? <button type="button" onClick={resetDraft} className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700">Cancel</button> : null}
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-500">Save one resolution and frame-rate profile per chip. Add EIS/OIS or other details in Comment. Matching video types are grouped together.</p>
      <Field label={videoFeaturesLabel}><HelperTermInput multiline suggestions={suggestions.videofeatures || []} value={videoFeatures} onChange={onChangeVideoFeatures} commaSeparated placeholder={camera === "rearCamera" ? "HDR10+, Dolby Vision, gyro-EIS" : "HDR video, face tracking"} /></Field>
      </div> : null}
    </div>
  );
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
  const nextVirtualRamMax = derivedVirtualRamMax || currentVirtualRamMax || "";
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

function formatAuditTimestamp(value: unknown): string {
  if (!value) return "Set when saved";
  let date: Date | undefined;
  if (value instanceof Date) date = value;
  else if (typeof value === "object" && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof timestamp.toDate === "function") date = timestamp.toDate();
    else if (typeof timestamp.seconds === "number") date = new Date(timestamp.seconds * 1000);
  } else {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Set when saved";
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
  onClear,
  clearLabel = "Clear section",
  children,
}: {
  title: string;
  description?: string;
  titleRight?: React.ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseStorageKey = `technology-stuff:admin-section-collapsed:${title}`;

  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(collapseStorageKey);
      if (savedState !== null) setIsCollapsed(savedState === "true");
    } catch {
      // Keep the section usable when browser storage is unavailable.
    }
  }, [collapseStorageKey]);

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(collapseStorageKey, String(next));
      } catch {
        // The current view still updates if browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <button type="button" onClick={toggleCollapsed} aria-expanded={!isCollapsed} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left hover:text-blue-800">
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className={`inline-block h-0 w-0 border-x-[5px] border-x-transparent ${isCollapsed ? "border-b-[6px] border-b-slate-500" : "border-t-[6px] border-t-slate-500"}`} />
            <span>
              <span className="block text-base font-extrabold text-slate-900">{title}</span>
              {description ? <span className="mt-0.5 block text-xs font-normal text-slate-500">{description}</span> : null}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {onClear ? <button type="button" onClick={onClear} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">{clearLabel}</button> : null}
          {titleRight}
        </div>
      </div>
      {!isCollapsed ? <div className="grid gap-3 p-4">{children}</div> : null}
    </section>
  );
}

function PerformanceSubsection({ title, onClear, children }: { title: string; onClear: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <button type="button" onClick={onClear} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">Clear all</button>
      </div>
      {children}
    </div>
  );
}

function HiddenSectionFeatures({
  label,
  value,
  suggestions,
  onChange,
}: {
  label: string;
  value?: string[];
  suggestions: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="w-full rounded-lg border border-violet-200 bg-violet-50 p-3">
      <Field label={label}>
        <HelperTermInput
          multiline
          suggestions={suggestions}
          value={formatCsv(value)}
          onChange={(next) => onChange(splitCsv(next))}
          commaSeparated
          placeholder="Admin-only smartphone details; not shown publicly"
        />
      </Field>
    </div>
  );
}

function ReorderArrow({ direction }: { direction: "up" | "down" }) {
  return <span aria-hidden="true" className={`relative inline-block h-4 w-4 after:absolute after:left-1/2 after:h-2.5 after:w-[2px] after:-translate-x-1/2 after:rounded-full after:bg-current ${direction === "up" ? "after:bottom-0 after:rotate-180 before:absolute before:left-1/2 before:top-0 before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-45 before:border-l-2 before:border-t-2 before:border-current" : "after:top-0 before:absolute before:bottom-0 before:left-1/2 before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-[225deg] before:border-l-2 before:border-t-2 before:border-current"}`} />;
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
  label: React.ReactNode;
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

function isImageKitDeliveryUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && (parsed.hostname === "imagekit.io" || parsed.hostname.endsWith(".imagekit.io"));
  } catch {
    return false;
  }
}

function isSupportedImageDeliveryUrl(value: string): boolean {
  return isCloudinaryDeliveryUrl(value) || isImageKitDeliveryUrl(value);
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
  label: React.ReactNode;
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
          <span className="cursor-grab select-none text-center text-lg text-slate-400" aria-label={`Drag to reorder ${label} ${index + 1}`} title="Drag to reorder">â‹®â‹®</span>
          <div className="relative h-12 w-12 overflow-hidden rounded border border-slate-100 bg-slate-50">
            <Image src={url} alt={`${label} ${index + 1}`} fill className="object-contain" unoptimized />
          </div>
          <TextInput value={url} disabled={disabled} onChange={(event) => onChange(images.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="w-full min-w-0 text-xs" aria-label={`${label} URL ${index + 1}`} />
          <div className="flex items-center gap-1">
          <button type="button" onClick={() => moveImage(index, index - 1)} disabled={disabled || index === 0} aria-label={`Move ${label} ${index + 1} up`} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-700 disabled:opacity-40"><ReorderArrow direction="up" /></button>
            <button type="button" onClick={() => moveImage(index, index + 1)} disabled={disabled || index === images.length - 1} aria-label={`Move ${label} ${index + 1} down`} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-700 disabled:opacity-40"><ReorderArrow direction="down" /></button>
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
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const normalizedSelectedColors = selectedColors.map((color) => color.trim().replace(/\s+/g, " ").toLocaleLowerCase());
  const showCompleteList = normalizedSelectedColors.length === 0 || normalizedSelectedColors.length === colorOptions.length;
  const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) =>
    showCompleteList || normalizedSelectedColors.includes(item.color.trim().replace(/\s+/g, " ").toLocaleLowerCase()),
  );

  function toggleColor(color: string) {
    setSelectedColors((current) => current.some((value) => value.toLocaleLowerCase() === color.toLocaleLowerCase())
      ? current.filter((value) => value.toLocaleLowerCase() !== color.toLocaleLowerCase())
      : [...current, color]);
  }

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
      {colorOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2" aria-label="Filter image list by color">
          <span className="mr-1 text-xs font-semibold text-slate-600">Filter colors:</span>
          {colorOptions.map((color) => {
            const selected = normalizedSelectedColors.includes(color.trim().replace(/\s+/g, " ").toLocaleLowerCase());
            return <button key={color} type="button" aria-pressed={selected} onClick={() => toggleColor(color)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}>{color}</button>;
          })}
          {normalizedSelectedColors.length > 0 && normalizedSelectedColors.length < colorOptions.length ? <button type="button" onClick={() => setSelectedColors([])} className="rounded-full px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">Show all</button> : null}
          <span className="ml-auto text-[11px] text-slate-500">{showCompleteList ? "Complete public order" : `${visibleItems.length} image${visibleItems.length === 1 ? "" : "s"}`}</span>
        </div>
      ) : null}
      {visibleItems.map(({ item, index }) => (
        <div
          key={`${item.url}-${index}`}
          onDragOver={(event) => { if (!disabled && showCompleteList) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); if (!disabled && showCompleteList && draggingIndex !== null) moveImage(draggingIndex, index); setDraggingIndex(null); }}
          onDragEnd={() => setDraggingIndex(null)}
          className={`grid min-w-0 grid-cols-[24px_120px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-white p-3 ${draggingIndex === index ? "border-blue-400 opacity-60" : "border-slate-200"}`}
        >
          <span draggable={!disabled} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggingIndex(index); }} className="cursor-grab select-none text-center text-lg text-slate-400 active:cursor-grabbing" title="Drag to reorder" aria-label={`Drag image ${index + 1} to reorder`}>â ¿</span>
          <div style={{ backgroundColor: imageBackground === "transparent" ? "transparent" : imageBackground || "#ffffff" }} className="relative h-[120px] w-[120px] overflow-hidden rounded border border-slate-100">
            <Image src={item.url} alt={`Product image ${index + 1}`} fill className="object-contain" unoptimized />
          </div>
          <div className="grid min-w-0 gap-2">
            <TextInput aria-label={`Image ${index + 1} delivery URL`} value={item.url} readOnly disabled={disabled} draggable={false} onDragStart={(event) => event.preventDefault()} className="w-full min-w-0 select-text text-xs" />
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
      {visibleItems.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No images are assigned to the selected colors.</p> : null}
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
  suggestions, value, onChange, commaSeparated = true, multiline = false, ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  suggestions: string[]; value: string; onChange: (value: string) => void; commaSeparated?: boolean; multiline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [inputElement, setInputElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const inputValue = commaSeparated ? draft : value;
  useEffect(() => {
    if (multiline && inputElement instanceof HTMLTextAreaElement) {
      inputElement.style.height = "auto";
      inputElement.style.height = `${inputElement.scrollHeight}px`;
    }
  }, [inputElement, inputValue, multiline]);
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
    {multiline ? <textarea {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} ref={setInputElement} rows={1} wrap="soft" className={`min-h-10 w-full resize-none overflow-hidden rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} value={inputValue} autoComplete="off" onInput={(event) => {
      event.currentTarget.style.height = "auto";
      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
    }} onChange={(event) => {
      const next = event.target.value;
      if (commaSeparated) setDraft(next);
      else onChange(next);
      setOpen(true);
    }} onFocus={() => setOpen(true)} onBlur={() => {
      if (commaSeparated) onChange(draft);
      setTimeout(() => setOpen(false), 120);
    }} /> : <TextInput {...(props as React.InputHTMLAttributes<HTMLInputElement>)} ref={setInputElement as React.Ref<HTMLInputElement>} className={`w-full ${props.className || ""}`.trim()} value={inputValue} autoComplete="off" onChange={(event) => {
      const next = event.target.value;
      if (commaSeparated) setDraft(next);
      else onChange(next);
      setOpen(true);
    }} onFocus={() => setOpen(true)} onBlur={() => {
      if (commaSeparated) onChange(draft);
      setTimeout(() => setOpen(false), 120);
    }} />}
    {open && matches.length > 0 && inputElement ? <div style={menuStyle} className="z-[1000] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
      {matches.map((item) => <button key={item} type="button" onMouseDown={(event) => { event.preventDefault(); selectSuggestion(item); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50">{item}</button>)}
    </div> : null}
  </div>;
}

function StylusFeaturesInput({ value, onChange }: { value: string; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(value);
  }, [value]);

  return (
    <TextInput
      ref={inputRef}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        onChange(splitStylusFeatures(next));
      }}
      placeholder="4096 PPI, advanced stylus features"
    />
  );
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
  const [quickSpecsEditorOpen, setQuickSpecsEditorOpen] = useState(false);
  const [quickSpecsPreviewVisible, setQuickSpecsPreviewVisible] = useState(true);
  const [quickSpecsOrderVisible, setQuickSpecsOrderVisible] = useState(true);
  const [showRamStorageConfiguration, setShowRamStorageConfiguration] = useState(false);
  const [ramStorageSettingLoading, setRamStorageSettingLoading] = useState(true);
  const [ramStorageSettingSaving, setRamStorageSettingSaving] = useState(false);
  const [ramStorageSettingError, setRamStorageSettingError] = useState("");
  const [draggedQuickSpecKey, setDraggedQuickSpecKey] = useState<ProductQuickSpecKey | null>(null);
  const [draggedSensorIndex, setDraggedSensorIndex] = useState<number | null>(null);
  const [quickSpecsSaving, setQuickSpecsSaving] = useState(false);
  const [quickSpecsSaveMessage, setQuickSpecsSaveMessage] = useState("");
  const [quickSpecsSaveError, setQuickSpecsSaveError] = useState("");
  const [coolingSystemManual, setCoolingSystemManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [imagePurposeDraft, setImagePurposeDraft] = useState("Main image");
  const [imageColorDraft, setImageColorDraft] = useState("");
  const [imageAdminView, setImageAdminView] = useState<"list" | "preview">("list");
  const [imagePreviewIndex, setImagePreviewIndex] = useState(0);
  useEffect(() => {
    if (imageAdminView !== "preview") return;
    const imageCount = form.imageItems?.length || 0;
    if (imageCount < 2) return;
    const handlePreviewArrowKeys = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setImagePreviewIndex((current) => (current - 1 + imageCount) % imageCount);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setImagePreviewIndex((current) => (current + 1) % imageCount);
      }
    };
    window.addEventListener("keydown", handlePreviewArrowKeys);
    return () => window.removeEventListener("keydown", handlePreviewArrowKeys);
  }, [form.imageItems?.length, imageAdminView]);
  const [smartphoneColorsDraft, setSmartphoneColorsDraft] = useState("");
  const [imageColorErrors, setImageColorErrors] = useState<Array<{ index: number; color: string; message: string }>>([]);
  const [dimensionColorErrors, setDimensionColorErrors] = useState<Array<{ path: string; label: string; color: string }>>([]);
  const [flipkartSourceUrl, setFlipkartSourceUrl] = useState("");
  const [flipkartAffiliateId, setFlipkartAffiliateId] = useState(DEFAULT_FLIPKART_AFFILIATE_ID);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminViewer, setAdminViewer] = useState<{ email?: string; role?: string } | null>(null);
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
  const [relatedProductToAdd, setRelatedProductToAdd] = useState("");
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
  const [editingCameraUnit, setEditingCameraUnit] = useState<{ section: "rearCamera" | "frontCamera"; index: number } | null>(null);
  const [mobileDetailsVisible, setMobileDetailsVisible] = useState(true);

  useEffect(() => {
    if (deviceType !== "smartphone") return;
    let active = true;
    fetch("/api/products/site-settings/smartphone-quick-specs", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { showRamStorageConfiguration?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "Failed to load the public quick-spec setting.");
        if (active) setShowRamStorageConfiguration(result.showRamStorageConfiguration === true);
      })
      .catch((loadError) => {
        if (active) setRamStorageSettingError(loadError instanceof Error ? loadError.message : "Failed to load the public quick-spec setting.");
      })
      .finally(() => { if (active) setRamStorageSettingLoading(false); });
    return () => { active = false; };
  }, [deviceType]);

  async function updateRamStorageConfigurationSetting(show: boolean) {
    setRamStorageSettingSaving(true);
    setRamStorageSettingError("");
    try {
      const response = await fetch("/api/products/site-settings/smartphone-quick-specs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showRamStorageConfiguration: show }),
      });
      const result = await response.json() as { showRamStorageConfiguration?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Failed to save the public quick-spec setting.");
      setShowRamStorageConfiguration(result.showRamStorageConfiguration === true);
    } catch (saveError) {
      setRamStorageSettingError(saveError instanceof Error ? saveError.message : "Failed to save the public quick-spec setting.");
    } finally {
      setRamStorageSettingSaving(false);
    }
  }

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
  const architectureText = useMemo(
    () => String(form.performance?.architecture || "").replace(/[,;]\s*/g, "\n").replace(/\s+(?=\d+\s*x\s+)/gi, "\n"),
    [form.performance?.architecture]
  );
  const architectureRows = useMemo(() => {
    const lines = architectureText.split("\n").filter(Boolean).length;
    return Math.max(3, Math.min(8, lines || 3));
  }, [architectureText]);
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
    if (form.network?.nfc) keys.add("nfc");
    if (form.network?.infrared) keys.add("irblaster");
    (form.sensors || []).forEach((item) => {
      const key = normalizeSensorBaseKey(item);
      if (!key || !sensorOptionMap.has(key) || isVirtualSensorLabel(item)) return;
      keys.add(key);
    });
    return keys;
  }, [form.sensors, form.network?.nfc, form.network?.infrared, sensorOptionMap]);
  const selectedVirtualSensorKeys = useMemo(() => {
    const keys = new Set<string>();
    (form.sensors || []).forEach((item) => {
      const key = normalizeSensorBaseKey(item);
      if (!key || !sensorOptionMap.has(key) || !isVirtualSensorLabel(item)) return;
      keys.add(key);
    });
    return keys;
  }, [form.sensors, sensorOptionMap]);
  const selectedSensorCards = useMemo(() => {
    const entries = (form.sensors || [])
      .map((item) => ({ label: cleanText(item) }))
      .filter((item) => item.label && !/\bnfc\b|near[-\s]?field communication/i.test(item.label));
    const existingHardwareKeys = new Set(entries
      .filter((item) => !isVirtualSensorLabel(item.label))
      .map((item) => normalizeSensorBaseKey(item.label)));
    for (const sensor of HARDWARE_SENSOR_OPTIONS) {
      if (selectedHardwareSensorKeys.has(sensor.key) && !existingHardwareKeys.has(sensor.key)) {
        entries.push({ label: sensor.label });
        existingHardwareKeys.add(sensor.key);
      }
    }
    return entries;
  }, [form.sensors, selectedHardwareSensorKeys]);
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
  const autoFiveGBandCount = sortBandTokens([
    ...(form.network?.bands?.["5G"]?.fdd || []),
    ...(form.network?.bands?.["5G"]?.tdd || []),
    ...(form.network?.bands?.["5G"]?.all || []),
  ]).length;
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
    fetch("/api/admin/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const json = (await response.json()) as { viewer?: { email?: string; role?: string } };
        return json.viewer || null;
      })
      .then((viewer) => { if (active) setAdminViewer(viewer); })
      .catch(() => { if (active) setAdminViewer(null); });
    return () => { active = false; };
  }, []);

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
      general: {
        ...(previous.general || {}),
        variants: previous.general?.variants?.map((variant) => ({
          ...variant,
          ...(Array.isArray(variant.colors) ? { colors: variant.colors.flatMap((color) => {
            const canonical = colorMap.get(color.trim().toLocaleLowerCase());
            return canonical ? [canonical] : [];
          }) } : {}),
        })),
      },
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

  function updateVariantAvailableColor(variantIndex: number, color: string, checked: boolean) {
    setForm((previous) => {
      const masterColors = previous.design?.colors || [];
      const currentVariants: ProductGeneralVariant[] = Array.isArray(previous.general?.variants) && previous.general.variants.length > 0
        ? [...previous.general.variants]
        : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }];
      const variants = currentVariants.map((variant) => ({
        ...variant,
        colors: Array.isArray(variant.colors)
          ? [...variant.colors]
          : [...masterColors],
      }));
      const selected = variants[variantIndex];
      if (!selected) return previous;
      const selectedColors = selected.colors || [];
      const hasColor = selectedColors.some((entry) => entry.toLocaleLowerCase() === color.toLocaleLowerCase());
      selected.colors = checked
        ? hasColor ? selectedColors : [...selectedColors, color]
        : selectedColors.filter((entry) => entry.toLocaleLowerCase() !== color.toLocaleLowerCase());
      return setAtPath(previous, ["general", "variants"], variants);
    });
  }

  function updatePath(path: PathKey[], value: unknown) {
    setForm((prev) => setAtPath(prev, path, value));
  }

  function updateCameraLocation(camera: "rearCamera" | "frontCamera", index: number, location: string) {
    setForm((previous) => {
      const cameras = [...((getAtPath(previous, [camera, "cameras"]) || []) as Array<RearCameraUnit | FrontCameraUnit>)];
      const current = cameras[index];
      if (!current) return previous;
      const existingIndex = cameras.findIndex((unit, unitIndex) => unitIndex !== index && normalizeLookupKey(unit.role || "") === normalizeLookupKey(location));
      cameras[index] = { ...current, role: location };
      if (existingIndex >= 0) cameras[existingIndex] = { ...cameras[existingIndex], role: current.role || "" };
      return setAtPath(previous, [camera, "cameras"], cameras);
    });
  }

  function moveCameraUnit(camera: "rearCamera" | "frontCamera", index: number, direction: -1 | 1) {
    setForm((previous) => {
      const cameras = [...((getAtPath(previous, [camera, "cameras"]) || []) as Array<RearCameraUnit | FrontCameraUnit>)];
      const ordered = sortCameraUnitsWithIndices(cameras);
      const position = ordered.findIndex((unit) => unit.index === index);
      const target = position + direction;
      if (position < 0 || target < 0 || target >= ordered.length) return previous;
      const [moved] = ordered.splice(position, 1);
      ordered.splice(target, 0, moved);
      ordered.forEach((unit, roleIndex) => {
        cameras[unit.index] = { ...unit.camera, role: getCameraRoleLabel(roleIndex) };
      });
      return setAtPath(previous, [camera, "cameras"], cameras);
    });
  }

  function clearCameraUnit(camera: "rearCamera" | "frontCamera", index: number, role?: string) {
    if (!window.confirm("Clear all data for this camera? Its location will be kept.")) return;
    const current = getAtPath(form, [camera, "cameras", index]) as RearCameraUnit | FrontCameraUnit | undefined;
    if (!current) return;
    updatePath([camera, "cameras", index], { role: role || current.role || "", purpose: "", resolution: "", type: "", cameraType: "", features: [], posturesVisible: [], imageResolutionWidth: undefined, imageResolutionHeight: undefined, sensor: {} });
  }

  function deleteCameraUnit(camera: "rearCamera" | "frontCamera", index: number) {
    if (!window.confirm("Delete this camera? This cannot be undone.")) return;
    removeFromPath([camera, "cameras"], index);
    setEditingCameraUnit((current) => {
      if (current?.section !== camera) return current;
      if (current.index === index) return null;
      return current.index > index ? { ...current, index: current.index - 1 } : current;
    });
  }

  function updateCameraVideoProfileGroups(camera: "rearCamera" | "frontCamera", groups: CameraVideoProfileGroup[], normalizeProfiles = false) {
    setForm((prev) => setAtPath(prev, [camera, "videoProfiles"], groups.flatMap((group) => {
      const entries = group.entries || splitAndCleanList(group.profiles).map((profile) => ({ profile, comment: group.comment }));
      return entries.map((entry) => ({
        name: group.name,
        resolution: normalizeProfiles ? normalizeVideoProfileList(entry.profile) : entry.profile.replace(/(\d+)P\b/gi, "$1p"),
        fps: "",
        comment: entry.comment,
        camera: group.camera,
        modes: group.modes,
        features: group.features,
      }));
    })));
  }

  function clearMobileSection(section: string) {
    const sectionLabel = section === "quick-summary"
      ? "Quick Summary"
      : MOBILE_DETAIL_SECTION_LINKS.find((item) => item.id === section)?.label || "this section";
    if (!window.confirm(`Clear all data in ${sectionLabel}? This cannot be undone.`)) return;
    const resets: Record<string, () => void> = {
      "mobile-general": () => {
        updatePath(["general"], {});
        updatePath(["battery", "chargerInBox"], undefined);
        setSmartphoneColorsDraft("");
        setPackageContentsInput("");
        setDateValidationErrors({ announceDate: "", launchDate: "" });
      },
      "mobile-memory-storage": () => { updatePath(["memoryStorage"], {}); updatePath(["variants"], []); updatePath(["general", "variants"], []); },
      "mobile-design-build": () => { updatePath(["design"], {}); updatePath(["specs", "build"], undefined); setSmartphoneColorsDraft(""); },
      "mobile-display": () => { updatePath(["display"], {}); updatePath(["displays"], []); },
      "mobile-performance": () => { updatePath(["performance"], {}); updatePath(["specs", "chipset"], undefined); updatePath(["specs", "chipsetScore"], undefined); },
      "mobile-benchmark-scores": () => { updatePath(["performance", "antutu"], { total: null, cpu: null, gpu: null, memory: null, ux: null }); updatePath(["performance", "benchmarks"], undefined); updatePath(["specs", "chipsetScore"], null); },
      "mobile-rear-camera": () => { updatePath(["rearCamera"], undefined); updatePath(["camera", "rear"], []); updatePath(["camera", "flash"], []); updatePath(["camera", "video", "rear"], []); },
      "mobile-front-camera": () => { updatePath(["frontCamera"], undefined); updatePath(["camera", "front"], []); updatePath(["camera", "video", "front"], []); },
      "mobile-battery-charging": () => { updatePath(["battery"], {}); updatePath(["specs", "battery"], undefined); },
      "mobile-multimedia": () => { updatePath(["general", "multimedia"], []); updatePath(["general", "multimediaDetails"], {}); },
      "mobile-security-sensors": () => { updatePath(["security"], {}); updatePath(["sensors"], []); updatePath(["sensorHiddenFeatures"], []); },
      "mobile-network-connectivity": () => { updatePath(["network"], {}); updatePath(["specs", "network"], undefined); },
      "mobile-software": () => { updatePath(["software"], {}); updatePath(["specs", "os"], undefined); updatePath(["specs", "ui"], undefined); },
      "mobile-images": () => { setField("images", []); setField("imageItems", []); setField("allColorImages", []); setField("imageVariants", []); setImageUrlDraft(""); setImageColorDraft(""); },
      "quick-summary": () => updatePath(["specs"], {}),
    };
    resets[section]?.();
  }

  function mobileSectionProps(section: string) {
    return { onClear: () => clearMobileSection(section) };
  }

  function updateAntutuTotal(value: number | undefined) {
    setForm((prev) => {
      const score = value ?? null;
      let next = setAtPath(prev, ["performance", "antutu", "total"], score);
      next = setAtPath(next, ["specs", "chipsetScore"], score);
      return next;
    });
  }

  function updateDisplayResolution(basePath: PathKey[], dimension: "width" | "height", value: string) {
    setForm((prev) => {
      const panel = (getAtPath(prev, basePath) || {}) as ProductDisplayPanel;
      const width = dimension === "width" ? value : String(panel.resolutionWidth ?? "");
      const height = dimension === "height" ? value : String(panel.resolutionHeight ?? "");
      const resolution = width && height ? `${height} \u00d7 ${width}` : "";
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
      if (cameraType === "rearCamera") {
        next = setAtPath(next, [cameraType, "autofocus"], autofocus);
        next = setAtPath(next, [cameraType, "ois"], ois || undefined);
        next = setAtPath(next, [cameraType, "eis"], eis || undefined);
      }
      next = setAtPath(next, [cameraType, "maxCameraResolution"], maxCameraResolution);
      if (cameraType === "rearCamera") {
        next = setAtPath(next, [cameraType, "imageResolution"], highestResolutionCamera?.imageResolution || "");
      }
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
      next = setAtPath(next, [cameraType, "cameras", index, "imageResolution"], width && height ? `${width} Ã— ${height} px` : "");
      return next;
    });
  }

  function updateCommonCameraImageResolution(cameraType: "rearCamera" | "frontCamera", dimension: "width" | "height", value: string) {
    setForm((prev) => {
      const camera = (getAtPath(prev, [cameraType]) || {}) as Product["rearCamera"];
      const width = dimension === "width" ? value : String(camera?.imageResolutionWidth ?? "");
      const height = dimension === "height" ? value : String(camera?.imageResolutionHeight ?? "");
      let next = setAtPath(prev, [cameraType, dimension === "width" ? "imageResolutionWidth" : "imageResolutionHeight"], value);
      next = setAtPath(next, [cameraType, "imageResolution"], width && height ? `${width} Ã— ${height} px` : "");
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
      const aiTops = detail.aiPerformanceTops !== undefined && Number.isFinite(Number(detail.aiPerformanceTops))
        ? `${Number(detail.aiPerformanceTops)} TOPS`
        : "";
      const architectureValue = String(detail.coreConfiguration || detail.cores || "").split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean).join("\n");
      const noOfCoresValue = deriveCoreCountText(detail);

      setForm((prev) => ({
        ...prev,
        specs: {
          ...prev.specs,
          processor: String(processor.name || prev.specs?.processor || "").trim(),
          chipsetScore: Number(benchmarks.antutu || benchmarks.antutuCalc || 0) || prev.specs?.chipsetScore,
        },
        performance: {
          ...prev.performance,
          chipset: String(processor.name || prev.performance?.chipset || chipsetInput).trim(),
          fabrication: fabricationLabel || String(prev.performance?.fabrication || "").trim(),
          noOfCores: noOfCoresValue || String(prev.performance?.noOfCores || "").trim(),
          architectureBits: String(detail.architectureBits || prev.performance?.architectureBits || "").trim(),
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
          aiEngine: aiEngineName || String(prev.performance?.aiEngine || "").trim(),
          aiSpeed: aiTops || String(prev.performance?.aiSpeed || "").trim(),
          otherAiFeatures: Array.isArray(detail.aiFeatures) && detail.aiFeatures.length > 0 ? detail.aiFeatures : (prev.performance?.otherAiFeatures || []),
          coolingSystem: String(detail.coolingSystem || prev.performance?.coolingSystem || "").trim(),
          coolingAreaMm2: Array.isArray(detail.coolingAreaMm2) && detail.coolingAreaMm2.length > 0 ? detail.coolingAreaMm2 : (prev.performance?.coolingAreaMm2 || []),
          additionalChips: Array.isArray(detail.additionalChips) && detail.additionalChips.length > 0 ? detail.additionalChips : (prev.performance?.additionalChips || []),
          additionalChipFeatures: Array.isArray(detail.additionalChipFeatures) && detail.additionalChipFeatures.length > 0 ? detail.additionalChipFeatures : (prev.performance?.additionalChipFeatures || []),
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
        rearCamera: {
          ...prev.rearCamera,
          cameraIsp: String(detail.cameraIsp || prev.rearCamera?.cameraIsp || prev.performance?.cameraIsp || "").trim(),
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

  function updateFingerprintAvailability(next?: boolean) {
    setForm((prev) => {
      let nextForm = setAtPath(prev, ["security", "fingerprint", "available"], next);
      if (next === true) {
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

  function updateFaceUnlockAvailability(next?: boolean) {
    setForm((prev) => {
      let nextForm = setAtPath(prev, ["security", "faceUnlock", "available"], next);
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

      current.forEach((item) => {
        const key = normalizeSensorBaseKey(item);
        if (!key || !sensorOptionMap.has(key)) return;
        if (isVirtualSensorLabel(item)) virtual.add(key);
        else hardware.add(key);
      });
      if (prev.network?.nfc && !hardware.has("nfc")) hardware.add("nfc");
      if (prev.network?.infrared && !hardware.has("irblaster") && !hardware.has("irsensor")) hardware.add("irblaster");

      const target = mode === "virtual" ? virtual : hardware;
      const wasSelected = target.has(sensorKey);
      target.has(sensorKey) ? target.delete(sensorKey) : target.add(sensorKey);
      const nextSensors = current.filter((item) => {
        const key = normalizeSensorBaseKey(item);
        if (key !== sensorKey) return true;
        return mode === "virtual" ? !isVirtualSensorLabel(item) : isVirtualSensorLabel(item);
      });
      if (!wasSelected) {
        const option = SENSOR_BASE_OPTIONS.find((item) => item.key === sensorKey);
        if (option) nextSensors.push(mode === "virtual" && option.key !== "ecompass" ? `Virtual ${option.label}` : option.label);
      }
      let nextForm = { ...prev, sensors: nextSensors };
      if (mode === "hardware") {
        if (sensorKey === "nfc") nextForm = setAtPath(nextForm, ["network", "nfc"], hardware.has("nfc"));
        if (sensorKey === "irblaster" || sensorKey === "irsensor") nextForm = setAtPath(nextForm, ["network", "infrared"], hardware.has("irblaster") || hardware.has("irsensor"));
      }
      return {
        ...nextForm,
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

  function getSelectedMultimediaFeatures(): string[] {
    const details = form.general?.multimediaDetails;
    const legacyFeatures = (form.general?.multimedia || []).map((item) => cleanText(item)).filter(Boolean).map((item) =>
      item.startsWith("Hi-Res Audio") ? "Hi-Res Audio Certification" : item === "Dual Stereo" ? "Dual Stereo Speaker" : item === "DTS" ? "DTS Sound" : item
    );
    const normalizedDetails = [
      ...(details?.fmRadio ? ["FM Radio"] : []),
      ...(details?.hiResAudio && !legacyFeatures.includes("Hi-Res Audio Certification") ? ["Hi-Res Audio Certification"] : []),
      ...(details?.hiResVideo ? ["Hi-Res Video"] : []),
      ...(details?.dolbyAtmos ? ["Dolby Atmos"] : []),
      ...(details?.dolbyVision ? ["Dolby Vision"] : []),
      ...(details?.dts ? ["DTS Sound"] : []),
      ...(details?.widevineLevels || []).map((level) => `Widevine ${level}`),
      ...(details?.speakerSetup === "single" ? ["Single Speaker"] : []),
      ...(details?.speakerSetup === "dual_stereo" && !form.general?.multimedia?.some((item) => item.startsWith("Dual Speaker")) ? ["Dual Stereo Speaker"] : []),
      ...(details?.spatialSound ? ["Spatial Sound"] : []),
    ];
    return Array.from(new Set([...legacyFeatures, ...normalizedDetails]));
  }

  function toggleMultimediaFeature(feature: string) {
    const selected = getSelectedMultimediaFeatures();
    const details = form.general?.multimediaDetails || {};
    if (feature === "Hi-Res Audio Wired" || feature === "Hi-Res Audio Wireless") {
      const stored = form.general?.multimedia || [];
      const wiredCurrent = Boolean(details.hiResAudioWired) || stored.includes("Hi-Res Audio Wired") || stored.includes("Hi-Res Audio Both");
      const wirelessCurrent = Boolean(details.hiResAudioWireless) || stored.includes("Hi-Res Audio Wireless") || stored.includes("Hi-Res Audio Both");
      const wired = feature === "Hi-Res Audio Wired" ? !wiredCurrent : wiredCurrent;
      const wireless = feature === "Hi-Res Audio Wireless" ? !wirelessCurrent : wirelessCurrent;
      const legacy = (form.general?.multimedia || []).filter((item) => !item.startsWith("Hi-Res Audio"));
      updatePath(["general", "multimedia"], selected.includes("Hi-Res Audio Certification") ? legacy : [...legacy, "Hi-Res Audio Certification"]);
      updatePath(["general", "multimediaDetails"], { ...details, hiResAudio: true, hiResAudioWired: wired, hiResAudioWireless: wireless });
      return;
    }
    if (feature === "Hi-Res Audio Certification") {
      const enable = !selected.includes(feature);
      const legacy = (form.general?.multimedia || []).filter((item) => !item.startsWith("Hi-Res Audio"));
      updatePath(["general", "multimedia"], enable ? [...legacy, feature] : legacy);
      updatePath(["general", "multimediaDetails"], { ...details, hiResAudio: enable, hiResAudioWired: false, hiResAudioWireless: false });
      return;
    }
    let next = selected.includes(feature) ? selected.filter((item) => item !== feature) : [...selected, feature];
    const has = (item: string) => next.includes(item);
    if (feature === "Single Speaker" && has("Single Speaker")) {
      const withoutDual = next.filter((item) => item !== "Dual Speaker" && item !== "Dual Stereo Speaker");
      updatePath(["general", "multimedia"], withoutDual);
      updatePath(["general", "multimediaDetails", "speakerSetup"], "single");
      return;
    }
    if ((feature === "Dual Speaker" || feature === "Dual Stereo Speaker") && has(feature)) {
      const withoutSingle = next.filter((item) => item !== "Single Speaker");
      updatePath(["general", "multimedia"], withoutSingle);
      updatePath(["general", "multimediaDetails", "speakerSetup"], "dual_stereo");
      return;
    }
    if (feature === "Single Speaker" && has("Single Speaker")) next = next.filter((item) => item !== "Dual Speaker" && item !== "Dual Stereo Speaker");
    if ((feature === "Dual Speaker" || feature === "Dual Stereo Speaker") && has(feature)) next = next.filter((item) => item !== "Single Speaker");
    updatePath(["general", "multimedia"], next);
    updatePath(["general", "multimediaDetails"], {
      ...form.general?.multimediaDetails,
      fmRadio: has("FM Radio"),
      hiResAudio: has("Hi-Res Audio Certification"),
      hiResVideo: has("Hi-Res Video"),
      dolbyAtmos: has("Dolby Atmos"),
      dolbyVision: has("Dolby Vision"),
      dts: has("DTS Sound"),
      widevineLevels: ["L1", "L3"].filter((level) => has(`Widevine ${level}`)),
      speakerSetup: has("Dual Stereo Speaker") || has("Dual Speaker") ? "dual_stereo" : has("Single Speaker") ? "single" : undefined,
      spatialSound: has("Spatial Sound"),
      features: next,
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
        nextForm = setAtPath(nextForm, ["network", "fiveGBandCount"], undefined);
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
    setForm((prev) => {
      const sensors = (prev.sensors || []).filter((item) => cleanText(item).toLowerCase() !== cleanText(sensorLabel).toLowerCase());
      const key = normalizeSensorBaseKey(sensorLabel);
      let next = { ...prev, sensors };
      if (key === "nfc") next = setAtPath(next, ["network", "nfc"], false);
      if (key === "irblaster") next = setAtPath(next, ["network", "infrared"], sensors.some((item) => normalizeSensorBaseKey(item) === "irsensor"));
      return next;
    });
  }

  function reorderSensors(fromIndex: number, toIndex: number) {
    setForm((prev) => {
      const sensors = selectedSensorCards.map((item) => item.label);
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= sensors.length || toIndex >= sensors.length || fromIndex === toIndex) return prev;
      const [moved] = sensors.splice(fromIndex, 1);
      sensors.splice(toIndex, 0, moved);
      return { ...prev, sensors };
    });
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
    setCoolingSystemManual(Boolean(cleanText(row.performance?.coolingSystem)));
    setEditingId(row.id || null);
    setDateValidationErrors({ announceDate: "", launchDate: "" });
    setPendingVariantDeleteIndex(null);
    setSmartphoneColorsDraft((row.design?.colors || []).join(", "));
    setForm({
      ...emptyProduct(deviceType),
      ...row,
      deviceType,
      slug: row.slug,
      seo: row.seo || {},
      images: row.images || [],
      imageItems: getProductImageItems(row),
      allColorImages: Array.isArray(row.allColorImages) ? row.allColorImages : [],
      imageVariants: Array.isArray(row.imageVariants) ? row.imageVariants : [],
      quickSpecs: Array.from(new Set([
        ...(Array.isArray(row.quickSpecs) ? row.quickSpecs : DEFAULT_PRODUCT_QUICK_SPECS),
        ...(Number(row.quickSpecsVersion || 0) < 2 ? ["chipset-score", "primary-display", "secondary-display", "refresh-rate"] as ProductQuickSpecKey[] : []),
      ])),
      quickSpecsVersion: 2,
      specs: row.specs || {},
      performance: {
        ...(row.performance || {}),
        coolingSystem: cleanText(row.performance?.coolingSystem)
          || (Number(row.performance?.coolingAreaMm2?.[0]) > 0 ? `${row.performance?.coolingAreaMm2?.[0]} mm\u00B2` : row.performance?.coolingSystem),
      },
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
    setForm((prev) => {
      const specs = { ...prev.specs };
      const assignText = (key: keyof Product["specs"], value: unknown) => {
        const text = cleanText(value);
        if (text) Object.assign(specs, { [key]: text });
      };
      const firstDisplay = prev.display?.primary || prev.display || prev.displays?.[0];
      const secondDisplay = prev.display?.secondary || prev.displays?.[1];
      const displaySummary = (panel: typeof firstDisplay) => {
        if (!panel) return "";
        const size = cleanText(panel.sizeInches ?? panel.size);
        const resolution = cleanText(panel.resolutionLabel || panel.resolution || (panel.resolutionWidth && panel.resolutionHeight ? `${panel.resolutionWidth} Ã— ${panel.resolutionHeight}` : ""));
        const parts = [size ? `${size} inch` : "", cleanText(panel.type), resolution, panel.refreshRate ? `${panel.refreshRate} Hz` : ""].filter(Boolean);
        return parts.join(", ");
      };
      const cameraSummary = (cameras: Array<{ resolution?: string; role?: string; type?: string }> | undefined, fallback?: unknown) => {
        const entries = (cameras || []).map((camera) => {
          const resolution = cleanText(camera.resolution);
          const role = cleanText(camera.role || camera.type);
          return resolution ? `${resolution}MP${role ? ` (${role})` : ""}` : role;
        }).filter(Boolean);
        return entries.length ? entries.join(" + ") : cleanText(fallback);
      };
      assignText("processor", prev.performance?.chipset);
      const batteryCapacity = prev.battery?.capacityTypical ?? prev.battery?.capacityRated ?? prev.battery?.capacity;
      if (batteryCapacity !== undefined && batteryCapacity !== null && String(batteryCapacity).trim()) {
        assignText("battery", `${batteryCapacity} mAh`);
        const parsed = Number(String(batteryCapacity).replace(/[^\d.]/g, ""));
        if (Number.isFinite(parsed) && parsed > 0) specs.batteryMah = parsed;
      }
      const chargeParts = [
        prev.battery?.wired?.maxPower ? `${prev.battery.wired.maxPower}W wired` : "",
        prev.battery?.wireless?.supported && prev.battery.wireless.maxPower ? `${prev.battery.wireless.maxPower}W wireless` : "",
      ].filter(Boolean);
      assignText("charging", chargeParts.join(", "));
      const primaryDisplaySummary = displaySummary(firstDisplay);
      const secondaryDisplaySummary = displaySummary(secondDisplay);
      assignText("primaryDisplay", primaryDisplaySummary);
      assignText("secondaryDisplay", secondaryDisplaySummary);
      assignText("display", [primaryDisplaySummary, secondaryDisplaySummary].filter(Boolean).join(" | "));
      if (firstDisplay?.sizeInches ?? firstDisplay?.size) {
        const size = Number(firstDisplay.sizeInches ?? firstDisplay.size);
        if (Number.isFinite(size) && size > 0) specs.displaySizeInch = size;
      }
      if (firstDisplay?.refreshRate) {
        const refreshRate = Number(String(firstDisplay.refreshRate).replace(/[^\d.]/g, ""));
        if (Number.isFinite(refreshRate) && refreshRate > 0) specs.refreshRateHz = refreshRate;
      }
      const rearSummary = cameraSummary(prev.rearCamera?.cameras, prev.rearCamera?.maxCameraResolution || prev.rearCamera?.imageResolution);
      const frontSummary = cameraSummary(prev.frontCamera?.cameras, prev.frontCamera?.maxCameraResolution || prev.frontCamera?.imageResolution);
      assignText("rearCamera", rearSummary);
      assignText("frontCamera", frontSummary);
      assignText("camera", [rearSummary ? `Rear: ${rearSummary}` : "", frontSummary ? `Front: ${frontSummary}` : ""].filter(Boolean).join("; "));
      const osName = cleanText(prev.software?.os?.name);
      const osVersion = cleanText(prev.software?.os?.version);
      assignText("os", [osName, osVersion].filter(Boolean).join(" "));
      assignText("network", (prev.network?.supported || []).map(cleanText).filter(Boolean).join(", "));
      const sim = prev.network?.sim;
      assignText("sim", [cleanText(sim?.type), cleanText(sim?.config || [sim?.slot1Type, sim?.slot2Type].filter(Boolean).join(" + "))].filter(Boolean).join(": "));
      return JSON.stringify(specs) === JSON.stringify(prev.specs) ? prev : { ...prev, specs };
    });
  }, [form.performance?.chipset, form.battery?.capacity, form.battery?.capacityTypical, form.battery?.capacityRated, form.battery?.wired?.maxPower, form.battery?.wireless?.supported, form.battery?.wireless?.maxPower, form.display, form.displays, form.rearCamera?.cameras, form.rearCamera?.maxCameraResolution, form.rearCamera?.imageResolution, form.frontCamera?.cameras, form.frontCamera?.maxCameraResolution, form.frontCamera?.imageResolution, form.software?.os?.name, form.software?.os?.version, form.network?.supported, form.network?.sim]);

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

  function addImageDeliveryUrl() {
    const value = imageUrlDraft.trim();
    if (!value) {
      setError("Paste a secure Cloudinary or ImageKit delivery URL.");
      return;
    }
    if (!isSupportedImageDeliveryUrl(value)) {
      setError("Paste a secure Cloudinary or ImageKit delivery URL.");
      return;
    }
    const color = imagePurposeDraft === "All colors" ? "All colors" : canonicalizeColor(imageColorDraft);
    const item = { purpose: imagePurposeDraft, color, url: value };
    setField("imageItems", [...(form.imageItems || []), item]);
    setImageUrlDraft("");
    setImageColorDraft(color === "All colors" ? "" : color);
    setError("");
    setMessage(`${isCloudinaryDeliveryUrl(value) ? "Cloudinary" : "ImageKit"} image added. Save the product to keep the change.`);
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
      setError("Paste a Cloudinary or ImageKit delivery URL first.");
      return;
    }

    try {
      const parsed = new URL(value);
      if (!isSupportedImageDeliveryUrl(value)) {
        setError("Paste a secure Cloudinary or ImageKit delivery URL.");
        return;
      }

      if (isCloudinaryDeliveryUrl(value)) {
        const uploadPath = /\/image\/upload\/(.*)$/;
        const match = parsed.pathname.match(uploadPath);
        if (!match) {
          setError("This Cloudinary URL must include /image/upload/.");
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
        setMessage(missingTransforms.length ? "Added automatic format and quality optimization to the Cloudinary URL." : "This Cloudinary URL already has f_auto and q_auto.");
        return;
      }

      // ImageKit accepts URL transformations in the `tr` query parameter too.
      // This preserves the existing delivery path and any unrelated query values.
      const current = parsed.searchParams.get("tr") || "";
      const transforms = current.split(",").map((item) => item.trim()).filter(Boolean);
      const existingTransforms = new Set(transforms);
      const missingTransforms = ["f-auto", "q-auto"].filter((transform) => !existingTransforms.has(transform));
      if (missingTransforms.length > 0) {
        parsed.searchParams.set("tr", [...transforms, ...missingTransforms].join(","));
      }
      setImageUrlDraft(parsed.toString());
      setError("");
      setMessage(missingTransforms.length ? "Added automatic format and quality optimization to the ImageKit URL." : "This ImageKit URL already has f-auto and q-auto.");
    } catch {
      setError("Paste a valid Cloudinary or ImageKit delivery URL.");
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
    const imageItems = (normalizedForm.imageItems || []).filter((item) => item.url.trim()).map((item) => ({
      purpose: item.purpose || "Other",
      color: item.purpose === "All colors" || item.color.trim().toLocaleLowerCase() === "all colors" ? "All colors" : canonicalizeColor(item.color),
      url: item.url.trim(),
    }));
    const definedColors = normalizedDesign.colors || [];
    const normalizedGeneral = normalizedForm.general ? {
      ...normalizedForm.general,
      variants: normalizedForm.general.variants?.map((variant) => {
        if (!Array.isArray(variant.colors)) return variant;
        const canonicalColors = variant.colors.flatMap((color) => {
          const canonical = definedColors.find((defined) => defined.trim().toLocaleLowerCase() === color.trim().toLocaleLowerCase());
          return canonical ? [canonical] : [];
        });
        return { ...variant, colors: Array.from(new Set(canonicalColors)) };
      }),
    } : normalizedForm.general;
    const normalizeCameraProfiles = (profiles?: CameraVideoProfile[]) => profiles?.map((profile) => ({
      ...profile,
      resolution: normalizeVideoProfileList(profile.resolution || ""),
    }));
    const normalizedForSave = {
      ...normalizedForm,
      general: normalizedGeneral,
      design: normalizedDesign,
      rearCamera: normalizedForm.rearCamera ? { ...normalizedForm.rearCamera, videoProfiles: normalizeCameraProfiles(normalizedForm.rearCamera.videoProfiles) } : normalizedForm.rearCamera,
      frontCamera: normalizedForm.frontCamera ? { ...normalizedForm.frontCamera, videoProfiles: normalizeCameraProfiles(normalizedForm.frontCamera.videoProfiles) } : normalizedForm.frontCamera,
    };
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
      const errors = invalidImageColors.map(({ index, color }) => ({ index, color, message: `â€œ${color}â€ is not in Smartphone Colors.` }));
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
      const json = (await response.json()) as { error?: string; id?: string; createdBy?: string; updatedBy?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to save product.");
      }

      const savedId = json.id || editingId || payload.slug;
      setEditingId(savedId);
      setForm({ ...payload, id: savedId, createdBy: json.createdBy || payload.createdBy, updatedBy: json.updatedBy || payload.updatedBy });
      setMessage(editingId ? `${pageTitle} updated.` : `${pageTitle} created. You can now preview it.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraftFromWorkflow() {
    setForm((current) => ({ ...current, status: "draft" }));
    requestAnimationFrame(() => {
      const formElement = document.querySelector<HTMLFormElement>('form[data-product-editor="true"]');
      if (formElement) formElement.requestSubmit();
    });
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

          <form data-product-editor="true" onSubmit={onSubmit} className="space-y-4">
        {deviceType === "smartphone" && quickSpecsEditorOpen ? (
          <section className={`fixed bottom-48 right-4 top-20 z-50 w-[calc(100vw-2rem)] overflow-y-auto panel p-4 shadow-2xl sm:right-6 sm:p-5 ${quickSpecsPreviewVisible && quickSpecsOrderVisible ? "lg:w-[min(1350px,calc((100vw-20rem)*0.9))]" : "lg:w-[min(675px,calc((100vw-20rem)*0.45))]"}`} aria-label="Quick specs configuration">
            <div className="mb-3">
              <h2 className="text-base font-extrabold text-slate-900">Public Quick Specs</h2>
              <p className="mt-1 text-sm text-slate-600">Choose which summaries appear on the public smartphone page and arrange their order.</p>
              {(!quickSpecsPreviewVisible || !quickSpecsOrderVisible) ? <div className="mt-2 flex flex-wrap gap-2">
                {!quickSpecsPreviewVisible ? <button type="button" onClick={() => setQuickSpecsPreviewVisible(true)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Show Preview</button> : null}
                {!quickSpecsOrderVisible ? <button type="button" onClick={() => setQuickSpecsOrderVisible(true)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Show Spec List</button> : null}
              </div> : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Show RAM / storage configuration on all smartphone pages</p>
                  <p className="mt-0.5 text-xs text-slate-500">This global setting hides or shows the subsection without deleting variants.</p>
                </div>
                <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                  <button type="button" disabled={ramStorageSettingLoading || ramStorageSettingSaving} onClick={() => updateRamStorageConfigurationSetting(true)} aria-pressed={showRamStorageConfiguration} className={`px-3 py-1.5 text-xs font-semibold ${showRamStorageConfiguration ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{ramStorageSettingLoading ? "Loading…" : "Yes"}</button>
                  <button type="button" disabled={ramStorageSettingLoading || ramStorageSettingSaving} onClick={() => updateRamStorageConfigurationSetting(false)} aria-pressed={!showRamStorageConfiguration} className={`border-l border-slate-300 px-3 py-1.5 text-xs font-semibold ${!showRamStorageConfiguration && !ramStorageSettingLoading ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>No</button>
                </div>
                {ramStorageSettingError ? <p className="w-full text-xs font-semibold text-rose-700" role="alert">{ramStorageSettingError}</p> : null}
              </div>
            </div>
            {(() => {
              const selected = form.quickSpecs || [...DEFAULT_PRODUCT_QUICK_SPECS];
              const updateSelected = (next: ProductQuickSpecKey[]) => {
                setField("quickSpecs", next);
                setField("quickSpecsVersion", 2);
                setQuickSpecsSaveMessage("");
                setQuickSpecsSaveError("");
              };
              const saveQuickSpecs = async () => {
                if (!editingId) {
                  setQuickSpecsSaveError("Save this smartphone first, then save its public Quick Specs.");
                  return;
                }
                setQuickSpecsSaving(true);
                setQuickSpecsSaveMessage("");
                setQuickSpecsSaveError("");
                try {
                  const response = await fetch(`/api/products/${encodeURIComponent(editingId)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ quickSpecs: selected, quickSpecsVersion: 2, quickSpecOverrides: form.quickSpecOverrides || {} }),
                  });
                  const result = await response.json() as { error?: string };
                  if (!response.ok) throw new Error(result.error || "Failed to save public Quick Specs.");
                  setQuickSpecsSaveMessage("Public Quick Specs saved.");
                  await refresh();
                } catch (saveError) {
                  setQuickSpecsSaveError(saveError instanceof Error ? saveError.message : "Failed to save public Quick Specs.");
                } finally {
                  setQuickSpecsSaving(false);
                }
              };
              const displayPanel = form.display?.primary || form.display || form.displays?.[0];
              const secondaryDisplayPanel = form.display?.secondary || form.displays?.[1];
              const formatDisplayPanel = (panel: typeof displayPanel) => panel ? [
                panel.sizeInches ?? panel.size ? `${String(panel.sizeInches ?? panel.size).replace(/\s*(inches|inch|in|\")$/i, "")}"` : "",
                cleanText(panel.resolutionLabel || panel.resolution || (panel.resolutionWidth && panel.resolutionHeight ? `${panel.resolutionWidth} × ${panel.resolutionHeight}` : "")),
                panel.curved ? "Curved" : "",
                cleanText(panel.type),
                "Display",
              ].filter(Boolean).join(" ") : "";
              const displayText = cleanText(form.display?.quickSpecText) || formatDisplayPanel(displayPanel) || cleanText(form.specs.display);
              const formatMp = (value: unknown) => {
                const text = cleanText(value);
                return text && /^\d+(\.\d+)?$/.test(text) ? `${text}MP` : text;
              };
              const rearText = (form.rearCamera?.cameras || []).map((camera) => formatMp(camera.resolution || camera.imageResolution)).filter(Boolean).join(" + ") || formatMp(form.specs.rearCamera || form.specs.camera);
              const frontText = (form.frontCamera?.cameras || []).map((camera) => formatMp(camera.resolution || camera.imageResolution)).filter(Boolean).join(" + ") || formatMp(form.frontCamera?.maxCameraResolution || form.specs.frontCamera);
              const batteryCapacity = cleanText(form.battery?.capacityTypical || form.battery?.capacity || form.specs.battery);
              const chargerPower = cleanText(form.battery?.chargerInBox?.power || form.battery?.wired?.maxPower || form.specs.charging);
              const formatUnit = (value: string, unit: string) => value && /^\d+(\.\d+)?$/.test(value) ? `${value}${unit === "mAh" ? " " : ""}${unit}` : value;
              const securityLocation = cleanText(form.security?.fingerprint?.locations?.[0]);
              const securityText = form.security?.fingerprint?.available && securityLocation
                ? `${securityLocation} Fingerprint`
                : form.security?.faceUnlock?.available ? cleanText(form.security.faceUnlock.type) || "Face Unlock" : "";
              const osName = cleanText(form.software?.os?.name);
              const normalizedOs = osName.toLowerCase() === "android" ? "Android" : osName.toLowerCase() === "ios" ? "iOS" : osName;
              const softwareText = [[normalizedOs, cleanText(form.software?.os?.version)].filter(Boolean).join(" "), cleanText(form.software?.ui)].filter(Boolean).join(" + ");
              const updateText = [
                form.software?.updates?.os ? `${form.software.updates.os} years OS updates` : "",
              ].filter(Boolean).join(" · ");
              const capacityCandidates = [
                ...(form.memoryStorage?.ram || []),
                ...(form.general?.variants || []).map((variant) => cleanText(variant.ram)),
                cleanText(form.specs.ram),
              ];
              const storageCandidates = [
                ...(form.memoryStorage?.internalStorage || []),
                ...(form.general?.variants || []).map((variant) => cleanText(variant.storage)),
                cleanText(form.specs.storage),
              ];
              const capacityGb = (value: unknown) => {
                const text = cleanText(value).toUpperCase();
                const match = text.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/);
                if (!match) {
                  const bareAmount = Number(text);
                  return Number.isFinite(bareAmount) && bareAmount > 0 ? bareAmount : 0;
                }
                const amount = Number(match[1]);
                return match[2] === "TB" ? amount * 1024 : amount;
              };
              const formatCapacity = (amount: number) => amount >= 1024
                ? `${Number.isInteger(amount / 1024) ? amount / 1024 : (amount / 1024).toFixed(1)}TB`
                : amount > 0 ? `${Math.round(amount)}GB` : "";
              const formatVariantCapacity = (value: unknown) => {
                const raw = cleanText(value);
                const match = raw.match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?$/i);
                if (!match) return raw;
                const amount = Number(match[1]);
                const unit = match[2]?.toUpperCase();
                if (unit === "TB") return `${amount}TB`;
                if (unit === "GB" || amount < 1024) return `${amount}GB`;
                return `${amount / 1024}TB`;
              };
              const ramText = formatCapacity(Math.max(0, ...capacityCandidates.map(capacityGb)));
              const storageText = formatCapacity(Math.max(0, ...storageCandidates.map(capacityGb)));
              const ramTypeCandidates = [
                cleanText(form.memoryStorage?.commonRamType),
                ...(form.memoryStorage?.ramType || []).map(cleanText),
                ...(form.memoryStorage?.variantGroups || []).map((variant) => cleanText(variant.ramType)),
                ...(form.general?.variants || []).map((variant) => cleanText(variant.ramType)),
              ].filter(Boolean);
              const storageTypeCandidates = [
                cleanText(form.memoryStorage?.commonStorageType),
                ...(form.memoryStorage?.storageType || []).map(cleanText),
                ...(form.memoryStorage?.variantGroups || []).map((variant) => cleanText(variant.storageType)),
                ...(form.general?.variants || []).map((variant) => cleanText(variant.storageType)),
              ].filter(Boolean);
              const memoryTypeRank = (value: string) => {
                const match = value.match(/(\d+(?:\.\d+)?)([A-Z])?/i);
                if (!match) return 0;
                const suffixRank = match[2]?.toUpperCase() === "T" ? 0.02 : match[2]?.toUpperCase() === "X" ? 0.01 : 0;
                return Number(match[1]) + suffixRank;
              };
              const highestType = (candidates: string[]) => [...new Set(candidates)].sort((a, b) => memoryTypeRank(a) - memoryTypeRank(b)).pop() || "";
              const ramType = highestType(ramTypeCandidates);
              const storageType = highestType(storageTypeCandidates);
              const supported = (form.network?.supported || []).map((value) => cleanText(value).toUpperCase());
              const networkText = ["5G", "4G", "3G"].find((value) => supported.includes(value)) || "";
              const wifiRaw = cleanText(form.network?.wifi?.version);
              const wifiMatch = wifiRaw.match(/(6E|\d+)/i);
              const wifiText = wifiMatch?.[1] || "";
              const bluetoothText = cleanText(form.network?.bluetooth);
              const connectivityText = [networkText, wifiText ? `Wi-Fi ${wifiText}` : "", bluetoothText ? `Bluetooth ${bluetoothText}` : ""].filter(Boolean).join("  ·  ");
              const previewValues: Record<ProductQuickSpecKey, string> = {
                processor: cleanText(form.performance?.chipset || form.specs.processor),
                "chipset-score": form.specs.chipsetScore ? `${form.specs.chipsetScore} Chipset Score` : "",
                display: displayText,
                "primary-display": formatDisplayPanel(displayPanel) || cleanText(form.specs.primaryDisplay),
                "secondary-display": formatDisplayPanel(secondaryDisplayPanel) || cleanText(form.specs.secondaryDisplay),
                "refresh-rate": displayPanel?.refreshRate ? `${displayPanel.refreshRate}Hz Refresh Rate` : form.specs.refreshRateHz ? `${form.specs.refreshRateHz}Hz Refresh Rate` : "",
                "ram-storage": [ramText ? `${ramText}${ramType ? ` ${ramType}` : ""} RAM` : "", storageText ? `${storageText}${storageType ? ` ${storageType}` : ""} Storage` : ""].filter(Boolean).join(" · "),
                rear: rearText ? `${rearText} Rear Camera` : "",
                front: frontText ? `${frontText} Front Camera` : "",
                battery: [batteryCapacity ? `${formatUnit(batteryCapacity, "mAh")} Battery` : "", chargerPower ? `${formatUnit(chargerPower, "W")} Charger` : ""].filter(Boolean).join(" · "),
                security: securityText,
                software: softwareText,
                updates: updateText,
              };
              const publicValue = (key: ProductQuickSpecKey) => form.quickSpecOverrides && Object.prototype.hasOwnProperty.call(form.quickSpecOverrides, key)
                ? form.quickSpecOverrides[key] || ""
                : previewValues[key];
              return (
                <div className={`grid gap-4 ${quickSpecsPreviewVisible && quickSpecsOrderVisible ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "grid-cols-1"}`}>
                  {quickSpecsPreviewVisible ? <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Quick spec fields</h3>
                      <button type="button" onClick={() => setQuickSpecsPreviewVisible(false)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Hide</button>
                    </div>
                    <div className="grid gap-2">
                      {QUICK_SPEC_LABELS.map(({ key, label }) => {
                        const value = publicValue(key);
                        const isSelected = selected.includes(key);
                        return (
                          <div key={key} className="flex items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0">
                            <div className="grid min-w-0 flex-1 gap-1">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                              <TextInput
                                value={form.quickSpecOverrides?.[key] ?? value}
                                onChange={(event) => {
                                  setField("quickSpecOverrides", { ...(form.quickSpecOverrides || {}), [key]: event.target.value });
                                  setQuickSpecsSaveMessage("");
                                }}
                                placeholder={`Enter ${label} details`}
                                aria-label={`Public ${label} text`}
                                className="w-full bg-white text-sm font-semibold text-slate-900"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={isSelected}
                              onClick={() => updateSelected([...selected, key])}
                              aria-label={isSelected ? `${label} is already selected` : `Add ${label} to public specs`}
                              title={isSelected ? "Already added to public specs" : `Add ${label}`}
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-lg font-bold ${isSelected ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300" : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"}`}
                            >+</button>
                          </div>
                        );
                      })}
                    </div>
                  </div> : null}
                  {quickSpecsOrderVisible ? <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Public specs order</h3>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateSelected([...DEFAULT_PRODUCT_QUICK_SPECS.filter((key) => selected.includes(key)), ...selected.filter((key) => !DEFAULT_PRODUCT_QUICK_SPECS.includes(key))])} className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Default Order</button>
                        <button type="button" onClick={() => setQuickSpecsOrderVisible(false)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Hide</button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {selected.map((key, index) => {
                        const item = QUICK_SPEC_LABELS.find((option) => option.key === key);
                        if (!item) return null;
                        return (
                          <div
                            key={`${key}-${index}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              const draggedKey = draggedQuickSpecKey || event.dataTransfer.getData("text/plain") as ProductQuickSpecKey;
                              const fromIndex = selected.indexOf(draggedKey);
                              if (fromIndex >= 0 && fromIndex !== index) {
                                const next = [...selected];
                                const [moved] = next.splice(fromIndex, 1);
                                next.splice(index, 0, moved);
                                updateSelected(next);
                              }
                              setDraggedQuickSpecKey(null);
                            }}
                            className={`flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-2 py-2 ${draggedQuickSpecKey === key ? "opacity-50" : ""}`}
                          >
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                setDraggedQuickSpecKey(key);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", key);
                              }}
                              onDragEnd={() => setDraggedQuickSpecKey(null)}
                              aria-label={`Drag to reorder ${item.label}`}
                              title="Drag to reorder"
                              className="cursor-grab select-none touch-none px-1 text-lg leading-none text-slate-500 active:cursor-grabbing"
                            >
                              ⠿
                            </button>
                            <TextInput
                              value={form.quickSpecOverrides?.[key] ?? previewValues[key]}
                              onChange={(event) => {
                                setField("quickSpecOverrides", { ...(form.quickSpecOverrides || {}), [key]: event.target.value });
                                setQuickSpecsSaveMessage("");
                              }}
                              placeholder={item.label}
                              aria-label={`Public ${item.label} text`}
                              className="min-w-0 flex-1 bg-white text-sm font-semibold text-slate-900"
                            />
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateSelected(selected.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.label}`} className="grid h-8 w-8 place-items-center rounded border border-rose-200 bg-white text-lg font-bold text-rose-700">−</button>
                            </div>
                          </div>
                        );
                      })}
                      {selected.length === 0 ? <p className="text-sm text-slate-500">Add fields from the left to include them on the public page.</p> : null}
                      <div className="grid gap-1 border-t border-slate-200 px-2 pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Connectivity</span>
                        <span className="text-xs font-extrabold text-blue-800">{connectivityText || "No connectivity details added"}</span>
                      </div>
                      <div className="grid gap-2 border-t border-slate-200 px-2 pt-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="RAM and storage options preview">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:col-span-2 xl:col-span-3">RAM / storage configuration</span>
                        {(form.general?.variants || []).length > 0
                          ? (form.general?.variants || []).map((variant, index) => <div key={`${variant.ram}-${variant.storage}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">{[formatVariantCapacity(variant.ram), formatVariantCapacity(variant.storage)].filter(Boolean).join(" + ") || `Variant ${index + 1}`}</div>)
                          : <span className="text-xs text-slate-500 sm:col-span-2 xl:col-span-3">No RAM/storage variants added</span>}
                      </div>
                      <div className="mt-2 border-t border-slate-200 pt-3">
                        {quickSpecsSaveError ? <p className="mb-2 text-xs font-semibold text-rose-700" role="alert">{quickSpecsSaveError}</p> : null}
                        {quickSpecsSaveMessage ? <p className="mb-2 text-xs font-semibold text-emerald-700" role="status">{quickSpecsSaveMessage}</p> : null}
                        <button type="button" onClick={saveQuickSpecs} disabled={quickSpecsSaving || !editingId} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{quickSpecsSaving ? "Saving…" : "Save public Quick Specs"}</button>
                      </div>
                    </div>
                  </div> : null}
                </div>
              );
            })()}
          </section>
        ) : null}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]">
          <div className="grid content-start gap-4">
        <Section title="Basic Information" description="Core product identity and quick summary content.">
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
            <Field label="Trending">
              <Select value={formatBooleanSelect(form.trending)} onChange={(e) => setField("trending", parseBooleanSelect(e.target.value) || false)}>
                <option value="">No</option>
                <option value="true">Yes</option>
              </Select>
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



        <Section title="SEO & Meta" description="Search metadata used by smartphone product pages and previews.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SEO Title">
              <TextInput value={form.seo?.metaTitle || ""} onChange={(e) => updatePath(["seo", "metaTitle"], e.target.value)} placeholder={form.name ? `${form.name} Specifications and Price` : "Search engine title"} />
            </Field>
            <Field label="Canonical URL">
              <TextInput value={form.seo?.canonicalUrl || ""} onChange={(e) => updatePath(["seo", "canonicalUrl"], e.target.value)} placeholder={`/mobile/${finalSlug}`} />
            </Field>
            <Field label="Keywords (comma separated)">
              <TextInput value={formatCsv(form.seo?.keywords)} onChange={(e) => updatePath(["seo", "keywords"], splitCsv(e.target.value))} placeholder="phone name, brand phone, smartphone price" />
            </Field>
            <Field label="News Keywords (comma separated)">
              <TextInput value={formatCsv(form.seo?.newsKeywords)} onChange={(e) => updatePath(["seo", "newsKeywords"], splitCsv(e.target.value))} placeholder="launch, smartphone, brand" />
            </Field>
          </div>
          <Field label="SEO Description">
            <TextArea value={form.seo?.metaDescription || ""} onChange={(e) => updatePath(["seo", "metaDescription"], e.target.value)} placeholder={form.shortDescription || "Description shown in search results"} />
          </Field>
        </Section>

          </div>
          <div className="grid content-start gap-4">
        <Section title="Workflow" titleRight={<span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">{form.status.replaceAll("_", " ")}</span>}>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">Workflow &amp; Audit Information</h3>
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Creator</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{form.createdBy || (adminViewer?.email ? adminViewer.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : editingId ? "Unknown" : "Recorded when saved")}</p>
                  {adminViewer?.role ? <span className="rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">{adminViewer.role.replaceAll("_", " ").toUpperCase()}</span> : null}
                </div>
                {adminViewer?.email ? <p className="mt-1 text-sm text-slate-600">{adminViewer.email}</p> : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Last Updated</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{form.updatedBy || (adminViewer?.email ? adminViewer.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : editingId ? "Unknown" : "Recorded when saved")}</p>
                  {adminViewer?.role ? <span className="rounded-full border border-slate-300 bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">{adminViewer.role.replaceAll("_", " ").toUpperCase()}</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">{formatAuditTimestamp(form.updatedAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => setField("status", e.target.value as Product["status"])}>
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="recently_deleted">Recently Deleted</option>
                  </Select>
                </Field>
                {form.status === "scheduled" ? <Field label="Scheduled At"><TextInput type="datetime-local" value={String(form.scheduledAt || "")} onChange={(e) => setField("scheduledAt", e.target.value)} /></Field> : null}
              </div>
              <p className="text-xs text-slate-500">Created {formatAuditTimestamp(form.createdAt)}</p>
              <div className="flex justify-center">
                <button type="button" disabled={saving} onClick={saveDraftFromWorkflow} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Save Draft"}</button>
              </div>
            </div>
          </div>
        </Section>

          </div>
        </div>

        {deviceType === "smartphone" ? <>
        <Section title="Related Content" description="Choose products to recommend alongside this phone.">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">Auto Suggestions</p>
              <span className="text-xs text-slate-500">Same brand</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.filter((item) => item.status === "published" && item.slug !== finalSlug && item.brand.toLowerCase() === form.brand.trim().toLowerCase() && !(form.compareSuggestions || []).includes(item.slug)).slice(0, 3).map((item) => (
                <button key={`related-suggestion-${item.slug}`} type="button" onClick={() => setField("compareSuggestions", [...(form.compareSuggestions || []), item.slug])} className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-400">
                  <span className="block text-xs font-bold text-slate-800">{item.brand} {item.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.slug}</span>
                </button>
              ))}
              {!rows.some((item) => item.status === "published" && item.slug !== finalSlug && item.brand.toLowerCase() === form.brand.trim().toLowerCase() && !(form.compareSuggestions || []).includes(item.slug)) ? <p className="text-xs text-slate-500">No same-brand suggestions available.</p> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select value={relatedProductToAdd} onChange={(e) => setRelatedProductToAdd(e.target.value)}>
              <option value="">Select a published smartphone</option>
              {rows.filter((item) => item.status === "published" && item.slug !== finalSlug && !(form.compareSuggestions || []).includes(item.slug)).map((item) => <option key={`related-option-${item.slug}`} value={item.slug}>{item.brand} {item.name} â€” {item.slug}</option>)}
            </Select>
            <button type="button" disabled={!relatedProductToAdd} onClick={() => {
              if (!relatedProductToAdd) return;
              setField("compareSuggestions", [...(form.compareSuggestions || []), relatedProductToAdd]);
              setRelatedProductToAdd("");
            }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">+ Add</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(form.compareSuggestions || []).map((slug) => {
              const item = rows.find((candidate) => candidate.slug === slug);
              return <div key={`related-selected-${slug}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{item ? `${item.brand} ${item.name}` : slug}</p><p className="truncate text-xs text-slate-500">{slug}</p></div>
                <button type="button" onClick={() => setField("compareSuggestions", (form.compareSuggestions || []).filter((value) => value !== slug))} className="rounded border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700">Remove</button>
              </div>;
            })}
            {!form.compareSuggestions?.length ? <p className="text-xs text-slate-500">No related products selected.</p> : null}
          </div>
        </Section>

        </> : null}

        {deviceType === "tablet" ? <Section title="Quick Summary" description="Tablet specifications and settings." {...mobileSectionProps("quick-summary")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Processor">
              <TextInput value={form.specs.processor || ""} onChange={(e) => updatePath(["specs", "processor"], e.target.value)} list={helperSuggestions.length ? "suggest-helper" : undefined} />
            </Field>
            <Field label="Chipset Score">
              <TextInput type="number" value={form.specs.chipsetScore ?? ""} onChange={(e) => updateAntutuTotal(parseOptionalNumber(e.target.value))} />
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
        </Section> : null}

        <Section title="Pricing & Affiliate Links" description="Product price details and affiliate purchase links.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
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
        <Section title="General" description="Launch information and box contents." {...mobileSectionProps("mobile-general")}>
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
          {deviceType === "smartphone" ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-3 text-sm font-extrabold text-slate-900">Safety</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Head SAR (W/kg)">
                  <TextInput type="number" min="0" step="any" inputMode="decimal" value={form.general?.headSarWkg ?? ""} onChange={(event) => updatePath(["general", "headSarWkg"], parseOptionalNumber(event.target.value))} placeholder="e.g. 0.72" />
                </Field>
                <Field label="Body SAR (W/kg)">
                  <TextInput type="number" min="0" step="any" inputMode="decimal" value={form.general?.bodySarWkg ?? ""} onChange={(event) => updatePath(["general", "bodySarWkg"], parseOptionalNumber(event.target.value))} placeholder="e.g. 0.89" />
                </Field>
              </div>
              <p className="mt-2 text-xs text-slate-500">Optional. Enter the manufacturerâ€™s published values in W/kg.</p>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-sm font-extrabold text-slate-900">Package Content</p>
            <div className="flex flex-wrap gap-2">
              {packageBaseToggles.map((item) => (
                <button key={`package-toggle-${item.key}`} type="button" aria-pressed={item.checked} className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold transition ${item.checked ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`} onClick={() => {
                      const next = packageBaseToggles.map((entry) => (entry.key === item.key ? { ...entry, checked: !entry.checked } : entry));
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
                    }}>{item.label}</button>
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

          <HiddenSectionFeatures
            label="Hidden General Other Features"
            value={form?.general?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["general", "hiddenFeatures"], value)}
          />
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
                      <button type="button" onClick={() => moveLaunchVariant(index, -1)} disabled={index === 0} className="inline-flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move variant up"><ReorderArrow direction="up" /></button>
                      <button type="button" onClick={() => moveLaunchVariant(index, 1)} disabled={index === (form.general?.variants?.length || 1) - 1} className="inline-flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move variant down"><ReorderArrow direction="down" /></button>
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
          description="Body dimensions, weights, materials, IP ratings, colors, audio jack, and hardware design details." {...mobileSectionProps("mobile-design-build")}
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


          <HiddenSectionFeatures
            label="Hidden Design Other Features"
            value={form?.design?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["design", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-display" className="scroll-mt-40 [order:4]">
        <Section title="Display" description="Primary and secondary display data plus additional display panels." {...mobileSectionProps("mobile-display")}>
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
                    <Field label="Size (inches, cm)">
                      <div className="flex w-fit gap-1.5">
                        <TextInput type="number" min="0" step="0.01" value={String(panelValue.sizeInches ?? panelValue.size ?? "")} onChange={(e) => updatePath([...basePath, "sizeInches"], e.target.value)} placeholder="Inches" className="w-[95px] px-2" />
                        <TextInput type="number" min="0" step="0.01" value={String(panelValue.sizeCm ?? "")} onChange={(e) => updatePath([...basePath, "sizeCm"], e.target.value)} placeholder="cm" className="w-[95px] px-2" />
                      </div>
                    </Field>
                    <Field label={<>Resolution (height {"\u00d7"} width)</>}>
                      <div className="grid w-fit grid-cols-[95px_auto_95px] items-center gap-1.5">
                        <TextInput inputMode="numeric" value={String(panelValue.resolutionHeight ?? "")} onChange={(e) => updateDisplayResolution(basePath, "height", e.target.value)} placeholder="Height" className="px-2" />
                        <span className="font-bold text-slate-500">{"\u00d7"}</span>
                        <TextInput inputMode="numeric" value={String(panelValue.resolutionWidth ?? "")} onChange={(e) => updateDisplayResolution(basePath, "width", e.target.value)} placeholder="Width" className="px-2" />
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
                      <TextInput value={String(panelValue.adaptiveRefreshRate ?? "")} onChange={(e) => updatePath([...basePath, "adaptiveRefreshRate"], e.target.value)} placeholder="1â€“120 or 30, 45, 60, 90, 120" />
                    </Field> : null}
                    <Field label="Touch Sampling Rate (Hz)">
                      <TextInput value={String(panelValue.touchSamplingRate ?? "")} onChange={(e) => updatePath([...basePath, "touchSamplingRate"], e.target.value)} />
                    </Field>
                    <Field label="Instant Touch Sampling Rate (Hz)">
                      <TextInput value={String(panelValue.instantTouchSamplingRate ?? "")} onChange={(e) => updatePath([...basePath, "instantTouchSamplingRate"], e.target.value)} placeholder="Instant TSR" />
                    </Field>
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                    <Field label="Brightness (typical, HDR, max rated, peak; nits)">
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
                    <Field label="Color Depth / Colors">
                      {(() => {
                        const current = String(panelValue.colorDepth || "").trim();
                        const match = current.match(/^([\d.,]+)\s*(million|millions|billion|billions)(?:\s+colors?)?$/i);
                        const amount = match?.[1] || "";
                        const unit = /^billion/i.test(match?.[2] || "") ? "billion" : "million";
                        return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <TextInput type="number" min="0" step="any" value={amount} onChange={(e) => updatePath([...basePath, "colorDepth"], e.target.value ? `${e.target.value} ${unit} colors` : "")} placeholder="e.g. 16.7" />
                          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                            {["million", "billion"].map((option, optionIndex) => <button key={option} type="button" onClick={() => {
                              const value = amount ? `${amount} ${option} colors` : "";
                              updatePath([...basePath, "colorDepth"], value);
                            }} className={`h-10 px-3 text-xs font-semibold capitalize ${optionIndex ? "border-l border-slate-300" : ""} ${unit === option && match ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{option}</button>)}
                          </div>
                          {!match && current ? <p className="col-span-2 text-xs text-slate-500">Saved value: {current}. Enter a number and choose a unit to replace it.</p> : null}
                        </div>;
                      })()}
                    </Field>
                    <Field label="Curved (degrees)">
                      <TextInput type="number" min="0" step="0.1" value={String(curvedDegree)} onChange={(e) => updateCurvedDegree(basePath, e.target.value)} placeholder="0 = No" />
                    </Field>
                    {panelGroup.key.length === 0 ? <div className="sm:col-span-2 xl:col-span-4">
                      <Field label="Quick Specs Display Text (optional)">
                        <span className="text-xs text-slate-500">Overrides the automatically assembled display summary on the public smartphone page.</span>
                        <TextInput value={String(form.display?.quickSpecText || "")} onChange={(e) => updatePath(["display", "quickSpecText"], e.target.value)} placeholder='e.g. 6.7&quot; FHD+ Curved Super AMOLED Display' />
                      </Field>
                    </div> : null}
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                    <Field label="Color Coverage">
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
                            <button type="button" aria-label="Remove color profile" title="Remove color profile" onClick={() => removeFromPath([...basePath, "colorProfiles"], profileIndex)} className="rounded-lg border border-rose-200 p-0 text-sm font-bold text-rose-700">Ã—</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => appendToPath([...basePath, "colorProfiles"], { mode: "", dciP3: "", ntsc: "", sRgb: "" })} className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">+ Add color profile</button>
                      </div>
                    </Field>
                    </div>
                    <div className={isWidePanel ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2"}>
                      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        <Field label="Protection" className="xl:col-span-2">
                          <HelperTermInput multiline suggestions={displayTermSuggestions.protection || []} value={panelValue.protection || ""} onChange={(value) => updatePath([...basePath, "protection"], value)} commaSeparated placeholder="e.g. Gorilla Glass Victus 2" />
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
                        <Field label="HDR Support" className="xl:justify-self-end">
                          <div className="flex flex-wrap justify-end gap-2">
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
                        <StylusFeaturesInput value={formatCsv(panelValue.stylus?.features)} onChange={(value) => updatePath([...basePath, "stylus", "features"], value)} />
                      </Field>
                      <Field label="Palm Rejection">
                        <div className="inline-flex w-fit self-start overflow-hidden rounded-md border border-slate-300 bg-white">
                          {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`${panelGroup.title}-palm-${option.label}`} type="button" onClick={() => updatePath([...basePath, "stylus", "palmRejection"], option.value)} className={`h-10 w-12 shrink-0 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${(panelValue.stylus?.palmRejection === true) === option.value ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{option.label}</button>)}
                        </div>
                      </Field>
                    </> : null}
                    <div className="col-span-full w-full min-w-0">
                      <Field label="Certifications" className="w-full">
                        <HelperTermInput multiline suggestions={displayTermSuggestions.certification || []} value={formatCsv(panelValue.certifications)} onChange={(value) => updatePath([...basePath, "certifications"], splitCsv(value))} commaSeparated />
                      </Field>
                    </div>
                    <div className="col-span-full w-full min-w-0">
                      <Field label="Other Features" className="w-full">
                          <HelperTermInput
                            multiline
                            suggestions={displayTermSuggestions.otherfeatures || []}
                            value={formatCsv([...new Set([...(panelValue.others || []), ...selectedDisplayFeatureValues(panelValue)])])}
                            onChange={(value) => {
                              const generated = new Set(selectedDisplayFeatureValues(panelValue).map((item) => item.toLocaleLowerCase()));
                              updatePath([...basePath, "others"], splitCsv(value).filter((item) => !generated.has(item.toLocaleLowerCase())));
                            }}
                            commaSeparated
                          />
                      </Field>
                    </div>
                    <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Include selected display details in public Other Features</p>
                      <p className="mb-2 text-xs text-slate-500">These details will not have separate public rows. Select which populated values to add to Other Features.</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={panelValue.includeDimmingInOtherFeatures === true} onChange={(event) => updatePath([...basePath, "includeDimmingInOtherFeatures"], event.target.checked)} /> Dimming</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={panelValue.includeAlwaysOnDisplayInOtherFeatures === true} onChange={(event) => updatePath([...basePath, "includeAlwaysOnDisplayInOtherFeatures"], event.target.checked)} /> Always-On Display</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={panelValue.includePalmRejectionInOtherFeatures === true} onChange={(event) => updatePath([...basePath, "includePalmRejectionInOtherFeatures"], event.target.checked)} /> Palm Rejection</label>
                        </div>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>


          <HiddenSectionFeatures
            label="Hidden Display Other Features"
            value={form?.display?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["display", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-multimedia" className="scroll-mt-40 [order:10]">
        <Section title="Multimedia" description="Audio/media features used for public multimedia highlights." {...mobileSectionProps("mobile-multimedia")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Audio Jacks" className="sm:col-span-2 lg:col-span-5">
              <div className="flex flex-wrap gap-2">
                {(["3.5mm Audio Jack", "Type-C Audio Jack", "Lightning to 3.5mm"] as const).map((jack) => {
                  const selected = jack === "3.5mm Audio Jack"
                    ? form.general?.multimediaDetails?.audioJack35mm === true
                    : jack === "Type-C Audio Jack"
                      ? form.general?.multimediaDetails?.typeCAudioJack === true
                      : form.general?.multimediaDetails?.lightningAudioJack === true;
                  return <button key={`mm-jack-${jack}`} type="button" onClick={() => {
                    const path = jack === "3.5mm Audio Jack" ? "audioJack35mm" : jack === "Type-C Audio Jack" ? "typeCAudioJack" : "lightningAudioJack";
                    updatePath(["general", "multimediaDetails", path], !selected);
                  }} className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-semibold ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{jack}</button>;
                })}
              </div>
            </Field>
            <Field label="Multimedia Features" className="sm:col-span-2 lg:col-span-5">
              <div className="flex flex-wrap items-center gap-2">
                {MULTIMEDIA_FEATURE_OPTIONS.map((feature) => {
                  const selected = getSelectedMultimediaFeatures().includes(feature);
                  return <Fragment key={`mm-feature-${feature}`}>
                    <button type="button" onClick={() => toggleMultimediaFeature(feature)} className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-semibold ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{feature}</button>
                    {feature === "Hi-Res Audio Certification" && selected ? (
                      <div className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 p-1">
                        {([{ label: "Wired", key: "Hi-Res Audio Wired", active: Boolean(form.general?.multimediaDetails?.hiResAudioWired) || (form.general?.multimedia || []).includes("Hi-Res Audio Wired") || (form.general?.multimedia || []).includes("Hi-Res Audio Both") }, { label: "Wireless", key: "Hi-Res Audio Wireless", active: Boolean(form.general?.multimediaDetails?.hiResAudioWireless) || (form.general?.multimedia || []).includes("Hi-Res Audio Wireless") || (form.general?.multimedia || []).includes("Hi-Res Audio Both") }] as const).map((option) => (
                          <button key={option.key} type="button" aria-pressed={option.active} onClick={() => toggleMultimediaFeature(option.key)} className={`inline-flex h-7 items-center rounded border px-2 text-xs font-semibold ${option.active ? "border-blue-700 bg-blue-700 text-white" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-100"}`}>{option.label}</button>
                        ))}
                      </div>
                    ) : null}
                  </Fragment>;
                })}
              </div>
            </Field>
          </div>
          <div className="grid gap-3">
            <Field label="Other Multimedia">
              <HelperTermInput suggestions={multimediaTermSuggestions.othermultimedia || []} value={formatCsv(form.general?.multimediaDetails?.otherFeatures)} onChange={(value) => updatePath(["general", "multimediaDetails", "otherFeatures"], splitCsv(value))} commaSeparated placeholder="Stereo speakers, Spatial audio" />
            </Field>
          </div>

          <HiddenSectionFeatures
            label="Hidden Multimedia Other Features"
            value={form?.general?.multimediaDetails?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["general", "multimediaDetails", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-performance" className="scroll-mt-40 [order:5]">
        <Section title="Performance" description="Chipset-driven editable performance fields with CPU structure, clocks, GPU details, NPU/AI, cooling, and additional chip notes." {...mobileSectionProps("mobile-performance")}>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.1fr] lg:grid-rows-3">
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
              <Field label="No of Cores / Architecture Bits">
                <div className="grid grid-cols-[4.5rem_5.5rem] gap-2">
                  <TextInput value={form.performance?.noOfCores || ""} onChange={(e) => updatePath(["performance", "noOfCores"], e.target.value)} placeholder="8" aria-label="Number of cores" />
                  <div className="flex h-10 min-w-0">
                    <TextInput
                      inputMode="numeric"
                      value={String(form.performance?.architectureBits || "").replace(/\D/g, "")}
                      onChange={(event) => updatePath(["performance", "architectureBits"], event.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="64"
                      aria-label="Processor architecture bit width"
                      className="min-w-0 rounded-r-none px-2"
                    />
                    <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-600">bit</span>
                  </div>
                </div>
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
            <div className="lg:col-start-4 lg:row-start-1 lg:row-span-2">
              <Field label="CPU Structure">
                <TextArea
                  rows={architectureRows}
                  value={architectureText}
                  onChange={(e) => updatePath(["performance", "architecture"], e.target.value)}
                  placeholder={"1x Prime + 3x Performance + 4x Efficiency\nor\n2 + 6"}
                  className="min-h-[9.5rem] resize-y"
                />
              </Field>
            </div>
          </div>

          <PerformanceSubsection title="AI Engine / NPU" onClear={() => { updatePath(["performance", "aiEngine"], ""); updatePath(["performance", "aiSpeed"], ""); updatePath(["performance", "otherAiFeatures"], []); }}>
            <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_2fr]">
              <Field label="AI Engine / NPU">
                <HelperTermInput suggestions={performanceTermSuggestions.aienginenpu || []} value={form.performance?.aiEngine || ""} onChange={(value) => updatePath(["performance", "aiEngine"], value)} commaSeparated placeholder="Hexagon NPU" />
              </Field>
              <Field label="AI Speed">
                <TextInput value={form.performance?.aiSpeed || ""} onChange={(event) => updatePath(["performance", "aiSpeed"], event.target.value)} placeholder="32 TOPS" />
              </Field>
              <Field label="Other AI Features">
                <HelperTermInput suggestions={performanceTermSuggestions.otheraifeature || []} value={formatCsv(form.performance?.otherAiFeatures)} onChange={(value) => updatePath(["performance", "otherAiFeatures"], splitCsv(value))} commaSeparated />
              </Field>
            </div>
          </PerformanceSubsection>

          <PerformanceSubsection title="Cooling" onClear={() => { setCoolingSystemManual(false); updatePath(["performance", "coolingAreaMm2"], []); updatePath(["performance", "coolingSystem"], ""); }}>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Field label="Cooling Area (up to 7 values)">
                <div className="flex h-10">
                  <TextInput
                    inputMode="decimal"
                    value={(form.performance?.coolingAreaMm2 || []).map(String).join(", ")}
                    onChange={(event) => {
                      const areas = splitAndCleanList(event.target.value).slice(0, 7).map((value) => Number(sanitizeDecimal(value, 7))).filter(Number.isFinite);
                      updatePath(["performance", "coolingAreaMm2"], areas);
                      if (!coolingSystemManual) {
                        updatePath(["performance", "coolingSystem"], areas[0] > 0 ? `${areas[0]} mm\u00B2` : "");
                      }
                    }}
                    placeholder="e.g. 3500, 4200.5"
                    className="min-w-0 flex-1 rounded-r-none"
                    aria-label="Cooling area values in square millimeters, up to seven comma-separated values"
                  />
                  <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">mm²</span>
                </div>
              </Field>
              <Field label="Cooling Details">
                <HelperTermInput suggestions={performanceTermSuggestions.coolingsystem || []} value={form.performance?.coolingSystem || ""} onChange={(value) => { setCoolingSystemManual(true); updatePath(["performance", "coolingSystem"], value); }} placeholder="Vapor chamber cooling" />
              </Field>
            </div>
          </PerformanceSubsection>

          <PerformanceSubsection title="Additional Chip" onClear={() => { updatePath(["performance", "additionalChips"], []); updatePath(["performance", "additionalChipFeatures"], []); }}>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Field label="Additional Chip Name">
                <HelperTermInput suggestions={performanceTermSuggestions.additionalchip || []} value={formatCsv(form.performance?.additionalChips)} onChange={(value) => updatePath(["performance", "additionalChips"], splitCsv(value))} commaSeparated />
              </Field>
              <Field label="Additional Chip Other Details">
                <HelperTermInput suggestions={performanceTermSuggestions.additionalchipotherfeature || []} value={formatCsv(form.performance?.additionalChipFeatures)} onChange={(value) => updatePath(["performance", "additionalChipFeatures"], splitCsv(value))} commaSeparated />
              </Field>
            </div>
          </PerformanceSubsection>

          <Field label="Other Performance Features">
            <HelperTermInput suggestions={performanceTermSuggestions.otherperformancefeature || []} value={formatCsv(form.performance?.otherFeatures)} onChange={(value) => updatePath(["performance", "otherFeatures"], splitCsv(value))} commaSeparated />
          </Field>

          <div id="mobile-benchmark-scores" className="scroll-mt-40">
            <PerformanceSubsection title="Benchmark Scores" onClear={() => { updatePath(["performance", "antutu"], { total: null, cpu: null, gpu: null, memory: null, ux: null }); updatePath(["performance", "benchmarks"], undefined); updatePath(["specs", "chipsetScore"], null); }}>
<div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="AnTuTu Version">
                <TextInput value={form.performance?.benchmarks?.antutuVersion || ""} onChange={(e) => updatePath(["performance", "benchmarks", "antutuVersion"], e.target.value)} />
              </Field>
              <Field label="AnTuTu Total">
                <TextInput type="number" value={form.performance?.antutu?.total ?? ""} onChange={(e) => updateAntutuTotal(parseOptionalNumber(e.target.value))} />
              </Field>
              <Field label="AnTuTu CPU">
              <TextInput type="number" value={form.performance?.antutu?.cpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "cpu"], parseOptionalNumber(e.target.value) ?? null)} />
              </Field>
              <Field label="AnTuTu GPU">
              <TextInput type="number" value={form.performance?.antutu?.gpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "gpu"], parseOptionalNumber(e.target.value) ?? null)} />
              </Field>
              <Field label="AnTuTu Memory">
              <TextInput type="number" value={form.performance?.antutu?.memory ?? ""} onChange={(e) => updatePath(["performance", "antutu", "memory"], parseOptionalNumber(e.target.value) ?? null)} />
              </Field>
              <Field label="AnTuTu UX">
              <TextInput type="number" value={form.performance?.antutu?.ux ?? ""} onChange={(e) => updatePath(["performance", "antutu", "ux"], parseOptionalNumber(e.target.value) ?? null)} />
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
            </PerformanceSubsection>
          </div>

          <HiddenSectionFeatures
            label="Hidden Performance Other Features"
            value={form?.performance?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["performance", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-memory-storage" className="scroll-mt-40 [order:2]">
        <Section
          title="Storage & Variants"
          description="Device storage support and sellable RAM/storage configurations." {...mobileSectionProps("mobile-memory-storage")}
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
            <label className="mb-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={form.memoryStorage?.showOnlyMaxRamStorageTypes !== false}
                onChange={(event) => updatePath(["memoryStorage", "showOnlyMaxRamStorageTypes"], event.target.checked)}
                className="mt-0.5 accent-blue-700"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Show only maximum RAM/storage type</span>
                <span className="mt-0.5 block text-xs text-slate-500">When off, show each memory type with its associated capacities.</span>
              </span>
            </label>
            {deviceType === "smartphone" ? <p className="mb-3 text-xs text-slate-500">Choose which Smartphone Colors are sold with each RAM/storage configuration. Existing variants start with all colors selected. Storage capacity uses GB; 1 TB = 1024 GB.</p> : null}
            <div className="grid gap-2">
              {(Array.isArray(form.general?.variants) && form.general.variants.length ? form.general.variants : [{ ram: "", storage: "", launchPrice: undefined, livePrice: undefined }]).map((variant, index) => (
                <div key={`memory-variant-group-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div>
                    <div className="overflow-x-auto">
                    <div className="grid w-full min-w-[1190px] grid-cols-[4.25rem_13rem_8.625rem_10rem_10rem_8.625rem_7rem_6rem] items-end justify-between gap-2">
                    <div className="flex items-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveLaunchVariant(index, -1)}
                        disabled={index === 0}
                        className="inline-flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                        title="Move variant up"
                      >
                        <ReorderArrow direction="up" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLaunchVariant(index, 1)}
                        disabled={index === (form.general?.variants?.length || 1) - 1}
                        className="inline-flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                        title="Move variant down"
                      >
                        <ReorderArrow direction="down" />
                      </button>
                    </div>

                    <Field label="RAM / Storage" className="min-w-0">
                      <div className="flex h-10 w-full max-w-[10rem]">
                        <TextInput
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="RAM"
                          aria-label="RAM in GB"
                          value={sanitizeDigits(variant.ram || "", 4)}
                          onChange={(e) => updateMemoryVariantField(index, "ram", e.target.value)}
                          className="w-[4.25rem] shrink-0 rounded-r-none px-2"
                        />
                        <TextInput
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="256"
                          value={sanitizeDigits(variant.storage || "", 4)}
                          onChange={(e) => {
                            const amount = sanitizeDigits(e.target.value, 4);
                            updateMemoryVariantField(index, "storage", amount ? `${amount}GB` : "");
                          }}
                          aria-label="Storage in GB"
                          className="w-[4.25rem] shrink-0 rounded-none border-l-2 border-blue-300 px-2"
                        />
                        <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                      </div>
                    </Field>

                    <Field label="Launch Price" className="min-w-0">
                      <TextInput className="w-full min-w-0" type="number" min={0} value={variant.launchPrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "launchPrice"], parseOptionalNumber(e.target.value))} />
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

                    <Field label="Live Price" className="min-w-0">
                      <TextInput className="w-full min-w-0" type="number" min={0} value={variant.livePrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "livePrice"], parseOptionalNumber(e.target.value))} />
                    </Field>

                    <Field label="VRAM" className="min-w-0">
                      <div className="flex h-10 w-full">
                        <TextInput
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="VRAM"
                          aria-label="VRAM"
                          value={sanitizeDecimal(String(variant.virtualRam || ""), 4)}
                          onChange={(e) => updateMemoryVariantField(index, "virtualRam", sanitizeDecimal(e.target.value, 4))}
                          className="w-[4.25rem] shrink-0 rounded-r-none px-2"
                        />
                        <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700">GB</span>
                      </div>
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
                  {deviceType === "smartphone" ? <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">Available colors</p>
                    {(form.design?.colors || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(form.design?.colors || []).map((color) => {
                          const savedVariant = form.general?.variants?.[index];
                          const selectedColors = Array.isArray(savedVariant?.colors) ? savedVariant.colors : form.design?.colors || [];
                          const checked = selectedColors.some((entry) => entry.toLocaleLowerCase() === color.toLocaleLowerCase());
                          return (
                            <label key={`${index}-${color}`} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${checked ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}>
                              <input type="checkbox" checked={checked} onChange={(event) => updateVariantAvailableColor(index, color, event.target.checked)} className="accent-blue-700" />
                              {color}
                            </label>
                          );
                        })}
                      </div>
                    ) : <p className="text-xs text-slate-500">Add colors in the General section first.</p>}
                  </div> : null}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => insertMemoryVariantAfter((form.general?.variants?.length || 1) - 1)} className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">+ Add Variant</button>
          </div>

          <div className="overflow-x-auto">
            <div className={`grid min-w-[1050px] items-end gap-2 ${showSdCardExtraFields ? "grid-cols-[8.5rem_9.5rem_9.5rem_8.5rem_9rem_11rem_13rem]" : "grid-cols-[8.5rem_9.5rem_9.5rem_8.5rem_9rem]"}`}>
              <Field label="Total Bus Width" className="order-5">
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

          <HiddenSectionFeatures
            label="Hidden RAM & Storage Other Features"
            value={form?.memoryStorage?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["memoryStorage", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-battery-charging" className="scroll-mt-40 [order:9]">
        <Section title="Battery & Charging" description="Battery capacity, charging support, and charging certifications." {...mobileSectionProps("mobile-battery-charging")}>
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
              { key: "wired", label: "Max Wired Charging", value: form.battery?.wired?.supported, path: ["battery", "wired", "supported"] as PathKey[] },
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
              ) : <p className="text-xs text-slate-500">Enable Max Wired Charging to add details.</p>}
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
            <Field label={<>Battery Certification <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500">(Not shown on the public page.)</span></>}>
              <HelperTermInput suggestions={batteryTermSuggestions.batterycertification || []} value={formatCsv(form.battery?.certifications)} onChange={(value) => updatePath(["battery", "certifications"], splitCsv(value))} commaSeparated placeholder="IEC 62133, BIS" />
            </Field>
            <Field label={<>Charging Certification <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500">(Not shown on the public page.)</span></>}>
              <HelperTermInput suggestions={batteryTermSuggestions.chargingcertification || []} value={formatCsv(form.battery?.chargingCertifications)} onChange={(value) => updatePath(["battery", "chargingCertifications"], splitCsv(value))} commaSeparated placeholder="USB PD, PPS, QC 5" />
            </Field>
            <Field className="sm:col-span-2" label={<>Other Battery & Charging Features <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500">(Copy battery and charging certifications here because they will show on the public page.)</span></>}>
              <HelperTermInput
                suggestions={[...new Set([...(batteryTermSuggestions.otherbatteryfeatures || []), ...(batteryTermSuggestions.otherchargingfeatures || [])])]}
                value={formatCsv([...new Set([...(form.battery?.otherBatteryFeatures || []), ...(form.battery?.otherChargingFeatures || [])])])}
                onChange={(value) => {
                  const features = splitCsv(value);
                  updatePath(["battery", "otherBatteryFeatures"], features);
                  updatePath(["battery", "otherChargingFeatures"], features);
                }}
                commaSeparated
                placeholder="Vapor chamber, bypass charging"
              />
            </Field>
          </div>

          <HiddenSectionFeatures
            label="Hidden Battery & Charging Other Features"
            value={form?.battery?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["battery", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-rear-camera" className="scroll-mt-40 [order:7]">
        <Section title="📷 Rear Camera" description="Configure the rear camera setup, sensors, features, and video recording." {...mobileSectionProps("mobile-rear-camera")}>
          <CollapsiblePanel title="Rear Camera Details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <Field label="Flash" className="lg:col-span-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                  {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`rear-flash-${option.label}`} type="button" onClick={() => updatePath(["rearCamera", "flash", "supported"], option.value)} className={`h-10 w-12 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.rearCamera?.flash?.supported === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>)}
                </div>
              </div>
            </Field>
            <Field label="Flash Name" className="lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.flashname || []} value={form.rearCamera?.flash?.name || ""} onChange={(value) => updatePath(["rearCamera", "flash", "name"], value)} placeholder="LED, Laser AF" /></Field>
            <Field label="OIS / EIS / AF / FF" className="lg:col-span-2"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updatePath(["rearCamera", "ois"], !form.rearCamera?.ois)} className={`h-10 px-3 text-xs font-semibold ${form.rearCamera?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updatePath(["rearCamera", "eis"], !form.rearCamera?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.rearCamera?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updatePath(["rearCamera", "autofocus"], form.rearCamera?.autofocus === "AF" ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.rearCamera?.autofocus === "AF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button><button type="button" title="Fixed focus" onClick={() => updatePath(["rearCamera", "autofocus"], form.rearCamera?.autofocus === "FF" ? "" : "FF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.rearCamera?.autofocus === "FF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>FF</button></div></Field>
            <Field label="AF Detail" className="lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.afdetail || []} value={form.rearCamera?.autofocus === "AF" || form.rearCamera?.autofocus === "FF" ? "" : form.rearCamera?.autofocus || ""} onChange={(value) => updatePath(["rearCamera", "autofocus"], value || (form.rearCamera?.autofocus === "FF" ? "FF" : form.rearCamera?.autofocus ? "AF" : ""))} placeholder="Dual PDAF" /></Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Image Resolution (H x W)"><div className="flex w-fit items-center gap-1"><TextInput inputMode="numeric" value={String(form.rearCamera?.imageResolutionWidth ?? "")} onChange={(e) => updateCommonCameraImageResolution("rearCamera", "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="w-16 px-2" /><span>Ã—</span><TextInput inputMode="numeric" value={String(form.rearCamera?.imageResolutionHeight ?? "")} onChange={(e) => updateCommonCameraImageResolution("rearCamera", "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="w-16 px-2" /><span className="text-sm text-slate-500">px</span></div></Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <Field label="Camera ISP" className="lg:col-span-4">
                <TextInput value={form.rearCamera?.cameraIsp || ""} onChange={(e) => updatePath(["rearCamera", "cameraIsp"], e.target.value)} placeholder="e.g. Qualcomm Spectra ISP" />
              </Field>
              <Field label="Camera ISP Public Visibility" className="lg:col-span-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={form.rearCamera?.cameraIspVisible === true} onClick={() => updatePath(["rearCamera", "cameraIspVisible"], form.rearCamera?.cameraIspVisible === true ? undefined : true)} className={`inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold ${form.rearCamera?.cameraIspVisible === true ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>Show on Public</button>
                </div>
              </Field>
              <Field label="Zoom" className="lg:col-span-4"><div className="grid grid-cols-2 gap-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.rearCamera?.zoom?.optical || ""), 4)} onChange={(e) => updatePath(["rearCamera", "zoom", "optical"], sanitizeDecimal(e.target.value, 4))} placeholder="Optical" /><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.rearCamera?.zoom?.digital || ""), 4)} onChange={(e) => updatePath(["rearCamera", "zoom", "digital"], sanitizeDecimal(e.target.value, 4))} placeholder="Digital" /></div></Field>
            </div>
            <div className="sm:col-span-2 min-w-0 lg:col-span-12"><Field label="Rear Camera Features" className="min-w-0">
              <HelperTermInput multiline suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(form.rearCamera?.features)} onChange={(value) => updatePath(["rearCamera", "features"], splitCsv(value))} commaSeparated />
            </Field></div>
          </div>
          </CollapsiblePanel>

          <CollapsiblePanel title="Rear Camera Units" titleRight={<div className="flex items-center gap-2"><button type="button" onClick={() => { const count = form.rearCamera?.cameras?.length || 0; appendToPath(["rearCamera", "cameras"], { role: getCameraRoleLabel(count), purpose: count === 0 ? "Main" : "", resolution: "", type: "", sensor: {} } satisfies RearCameraUnit); setEditingCameraUnit({ section: "rearCamera", index: count }); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Rear Camera</button></div>}>
            <div className="grid gap-3">
              <div className="grid gap-2">
                {sortCameraUnitsWithIndices(form.rearCamera?.cameras || []).map(({ camera, index }, position, ordered) => editingCameraUnit?.section === "rearCamera" && editingCameraUnit.index === index ? null : <div key={`rear-camera-chip-${index}`} className="flex w-full min-w-0 flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">{camera.role || getCameraRoleLabel(position)}</span><span className="text-xs font-semibold text-slate-600">Rear camera</span></div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">{getCameraUnitSummary(camera).map((detail) => <span key={detail} className="max-w-full break-words">{detail}</span>)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <button type="button" onClick={() => setEditingCameraUnit({ section: "rearCamera", index })} className="text-xs font-semibold text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteCameraUnit("rearCamera", index)} className="text-xs font-semibold text-rose-700">Delete</button>
                    <button type="button" disabled={position === 0} aria-label="Move camera up" onClick={() => moveCameraUnit("rearCamera", index, -1)} className="rounded border px-1.5 text-slate-600 disabled:opacity-40">↑</button>
                    <button type="button" disabled={position === ordered.length - 1} aria-label="Move camera down" onClick={() => moveCameraUnit("rearCamera", index, 1)} className="rounded border px-1.5 text-slate-600 disabled:opacity-40">↓</button>
                  </div>
                </div>)}
              </div>
              {sortCameraUnitsWithIndices(form.rearCamera?.cameras || []).filter(({ index }) => editingCameraUnit?.section === "rearCamera" && editingCameraUnit.index === index).map(({ camera, index }) => (
                <div key={`rear-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="max-w-40 truncate rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900 ring-1 ring-inset ring-blue-200">{camera.role || "Select location"}</span>
                      <span className="relative grid h-7 w-7 shrink-0 place-items-center text-slate-500 hover:text-blue-700">
                        <Select aria-label={`Rear camera ${index + 1} location`} value={camera.role || ""} onChange={(e) => updateCameraLocation("rearCamera", index, e.target.value)} className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent opacity-0"><option value="">Select camera location</option>{CAMERA_NAME_OPTIONS.map((name) => <option key={`rear-name-${index}-${name}`} value={name}>{name}</option>)}</Select>
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                      </span>
                    </div>
                    <div className="flex flex-1 justify-center">
                      <button type="button" aria-label="Toggle rear camera pixel binning" aria-expanded={camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)} onClick={() => updatePath(["rearCamera", "cameras", index, "sensor", "binningSupported"], !(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails) ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-600"}`}>Binning {(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)) ? "On" : "Off"}</button>
                    </div>
                    <button type="button" onClick={() => clearCameraUnit("rearCamera", index, camera.role)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Clear all</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                    {postureOptions.length > 1 ? <Field label="Visible Postures" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.visibleposture || postureOptions} value={formatCsv(camera.posturesVisible)} onChange={(value) => updatePath(["rearCamera", "cameras", index, "posturesVisible"], splitCsv(value))} commaSeparated /></Field> : null}
                    <Field label="Camera Type" className="lg:col-span-2"><HelperTermInput suggestions={Array.from(new Set([...(cameraTermSuggestions.cameratype || []), ...CAMERA_TYPE_OPTIONS]))} value={camera.cameraType || camera.purpose || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "cameraType"], value)} placeholder="Wide, Ultra-wide, Macro" /></Field>
                    <Field label="Camera Resolution" className="lg:col-span-2"><UnitInput containerClassName="max-w-36" value={camera.resolution || ""} onChange={(e) => updateCameraUnitAndCommon("rearCamera", index, ["resolution"], e.target.value)} suffix="MP" /></Field>
                    <div className="lg:col-span-5"><Field label="Sensor Name"><HelperTermInput suggestions={cameraTermSuggestions.sensorname || []} value={camera.sensor?.name || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "name"], value)} /></Field></div>
                    <div className="min-w-0 lg:col-span-2"><Field label="Image Resolution (H x W)"><div className="grid min-w-0 grid-cols-[64px_auto_64px_auto] items-center gap-1"><TextInput inputMode="numeric" value={String(camera.imageResolutionWidth ?? "")} onChange={(e) => updateCameraImageResolution("rearCamera", index, "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="min-w-0 w-full px-2" /><span>Ã—</span><TextInput inputMode="numeric" value={String(camera.imageResolutionHeight ?? "")} onChange={(e) => updateCameraImageResolution("rearCamera", index, "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="min-w-0 w-full px-2" /><span className="text-sm text-slate-500">px</span></div></Field></div>
                    <Field label="Aperture" className="lg:col-span-2"><UnitInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "aperture"], e.target.value)} prefix="f/" containerClassName="max-w-36" /></Field>
                    <Field label="Sensor Size" className="lg:col-span-2"><UnitInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "size"], e.target.value)} suffix='"' containerClassName="max-w-36" /></Field>
                    <Field label="Pixel Size" className="lg:col-span-2"><UnitInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} suffix="Âµm" containerClassName="max-w-36" /></Field>
                    <Field label="Focal Length" className="lg:col-span-3"><UnitInput value={camera.sensor?.focalLength || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "focalLength"], e.target.value)} suffix="mm" placeholder="e.g. 24 or 24-70" /></Field>
                    <Field label="FOV" className="lg:col-span-1"><UnitInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "fov"], e.target.value)} suffix="Â°" containerClassName="max-w-36" /></Field>
                    <Field label="Lens Type (5P, 6P)" className="min-w-0 lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.lenstype || []} value={camera.sensor?.lensType || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "lensType"], value)} placeholder="6P, 7P" /></Field>
                    <Field label="Optical Zoom" className="lg:col-span-2">
                      <UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.opticalZoom || ""), 4)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "opticalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="3" containerClassName="w-20" />
                    </Field>
                    <Field label="Digital Zoom" className="lg:col-span-2">
                      <UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.digitalZoom || ""), 4)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "digitalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="30" containerClassName="w-20" />
                    </Field>
                    <Field label="OIS / EIS / AF / FF" className="lg:col-span-2"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updatePath(["rearCamera", "cameras", index, "sensor", "ois"], !camera.sensor?.ois)} className={`h-10 px-3 text-xs font-semibold ${camera.sensor?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updatePath(["rearCamera", "cameras", index, "sensor", "eis"], !camera.sensor?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updatePath(["rearCamera", "cameras", index, "sensor", "autofocus"], camera.sensor?.autofocus === "AF" ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus === "AF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button><button type="button" title="Fixed focus" onClick={() => updatePath(["rearCamera", "cameras", index, "sensor", "autofocus"], camera.sensor?.autofocus === "FF" ? "" : "FF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus === "FF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>FF</button></div></Field>
                    <Field label="Autofocus Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.autofocusdetail || []} value={camera.sensor?.autofocus === "AF" || camera.sensor?.autofocus === "FF" ? "" : camera.sensor?.autofocus || ""} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "autofocus"], value || (camera.sensor?.autofocus === "FF" ? "FF" : camera.sensor?.autofocus ? "AF" : ""))} placeholder="Dual PDAF" /></Field>

{(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)) ? <div className="sm:col-span-2 lg:col-span-12 rounded-lg border border-slate-200 bg-white p-3"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Pixel Binning</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="Binned Resolution"><UnitInput value={camera.sensor?.binnedResolution || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "binnedResolution"], e.target.value)} suffix="MP" placeholder="e.g. 16" /></Field>
                      <Field label="Binned Pixel Size"><UnitInput value={camera.sensor?.binnedPixelSize || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "binnedPixelSize"], e.target.value)} suffix="µm" placeholder="e.g. 1.2" /></Field>
                      <div className="sm:col-span-2 lg:col-span-3"><Field label="Binning Details (shown publicly)"><HelperTermInput suggestions={cameraTermSuggestions.binningdetails || []} value={getBinningDetailsInputValue(camera.sensor?.binnedPixelSize, camera.sensor?.binningDetails)} onChange={(value) => updatePath(["rearCamera", "cameras", index, "sensor", "binningDetails"], getBinningDetailsExtraValue(value, camera.sensor?.binnedPixelSize))} placeholder="4-in-1 pixel binning" /></Field></div>
                    </div></div> : null}
                    <div className="sm:col-span-2 lg:col-span-12"><div className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(8rem,1fr)] lg:items-end"><Field label="Rear Camera Features"><HelperTermInput multiline suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(camera.features)} onChange={(value) => updatePath(["rearCamera", "cameras", index, "features"], splitCsv(value))} commaSeparated placeholder="Night mode, dual pixel" /></Field><button type="button" onClick={() => setEditingCameraUnit(null)} className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">Save</button></div></div>
                  </div>
                </div>
              ))}
            </div>
          <div className="mt-4">
            <CameraVideoProfilesEditor
              camera="rearCamera"
              profiles={form.rearCamera?.videoProfiles}
              suggestions={cameraTermSuggestions}
              videoFeatures={formatCsv(form.rearCamera?.video?.features)}
              videoFeaturesLabel="Rear Camera Video Features"
              onChangeProfiles={(groups) => updateCameraVideoProfileGroups("rearCamera", groups, true)}
              onChangeVideoFeatures={(value) => updatePath(["rearCamera", "video", "features"], splitCsv(value))}
            />
          </div>
          </CollapsiblePanel>

          <HiddenSectionFeatures
            label="Hidden Rear Camera Other Features"
            value={form?.rearCamera?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["rearCamera", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-front-camera" className="scroll-mt-40 [order:8]">
        <Section title="🤳 Front Camera" description="Configure the front camera setup, sensors, features, and video recording." {...mobileSectionProps("mobile-front-camera")}>
          <CollapsiblePanel title="Front Camera Details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <Field label="Flash" className="min-w-0 lg:col-span-1"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">{[{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => <button key={`front-flash-${option.label}`} type="button" onClick={() => updatePath(["frontCamera", "flash", "supported"], option.value)} className={`h-10 w-12 text-xs font-semibold ${index > 0 ? "border-l border-slate-300" : ""} ${form.frontCamera?.flash?.supported === option.value ? "bg-blue-700 text-white" : "text-slate-700"}`}>{option.label}</button>)}</div></Field>
            <Field label="Flash Name" className="min-w-0 lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.flashname || []} value={form.frontCamera?.flash?.name || ""} onChange={(value) => updatePath(["frontCamera", "flash", "name"], value)} placeholder="LED, Laser AF" /></Field>
            <Field label="OIS / EIS / AF / FF" className="min-w-0 lg:col-span-2"><div className="inline-flex w-fit max-w-full overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updatePath(["frontCamera", "ois"], !form.frontCamera?.ois)} className={`h-10 px-3 text-xs font-semibold ${form.frontCamera?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updatePath(["frontCamera", "eis"], !form.frontCamera?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${form.frontCamera?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updatePath(["frontCamera", "autofocus"], toggleCameraAfMode(form.frontCamera?.autofocus, "AF"))} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${cameraAfModes(form.frontCamera?.autofocus).includes("AF") ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button><button type="button" title="Fixed focus" onClick={() => updatePath(["frontCamera", "autofocus"], toggleCameraAfMode(form.frontCamera?.autofocus, "FF"))} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${cameraAfModes(form.frontCamera?.autofocus).includes("FF") ? "bg-blue-700 text-white" : "text-slate-700"}`}>FF</button></div></Field>
            <Field label="AF Detail" className="min-w-0 lg:col-span-3"><HelperTermInput suggestions={cameraTermSuggestions.afdetail || []} value={formatCsv(cameraAfDetails(form.frontCamera?.autofocus))} onChange={(value) => updatePath(["frontCamera", "autofocus"], [...cameraAfModes(form.frontCamera?.autofocus), ...splitCsv(value)].join(", "))} placeholder="PDAF" /></Field>
            <div className="sm:col-span-2 min-w-0 lg:col-span-3">
              <Field label="Image Resolution (H x W)"><div className="flex w-fit items-center gap-1"><TextInput inputMode="numeric" value={String(form.frontCamera?.imageResolutionWidth ?? "")} onChange={(e) => updateCommonCameraImageResolution("frontCamera", "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="w-16 px-2" /><span>Ã—</span><TextInput inputMode="numeric" value={String(form.frontCamera?.imageResolutionHeight ?? "")} onChange={(e) => updateCommonCameraImageResolution("frontCamera", "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="w-16 px-2" /><span className="text-sm text-slate-500">px</span></div></Field>
            </div>
            <Field label="Zoom" className="sm:col-span-2 lg:col-span-4"><div className="grid grid-cols-2 gap-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.frontCamera?.zoom?.optical || ""), 4)} onChange={(e) => updatePath(["frontCamera", "zoom", "optical"], sanitizeDecimal(e.target.value, 4))} placeholder="Optical" /><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(form.frontCamera?.zoom?.digital || ""), 4)} onChange={(e) => updatePath(["frontCamera", "zoom", "digital"], sanitizeDecimal(e.target.value, 4))} placeholder="Digital" /></div></Field>
            <div className="sm:col-span-2 min-w-0 lg:col-span-12"><Field label="Front Camera Features"><HelperTermInput multiline suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(form.frontCamera?.features)} onChange={(value) => updatePath(["frontCamera", "features"], splitCsv(value))} commaSeparated /></Field></div>
          </div>
          </CollapsiblePanel>

          <CollapsiblePanel title="Front Camera Units" titleRight={<div className="flex items-center gap-2"><button type="button" onClick={() => { const count = form.frontCamera?.cameras?.length || 0; appendToPath(["frontCamera", "cameras"], { role: getCameraRoleLabel(count), purpose: count === 0 ? "Main" : "", resolution: "", type: "", sensor: {} } satisfies FrontCameraUnit); setEditingCameraUnit({ section: "frontCamera", index: count }); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Front Camera</button></div>}>
            <div className="grid gap-3">
              <div className="grid gap-2">
                {sortCameraUnitsWithIndices(form.frontCamera?.cameras || []).map(({ camera, index }, position, ordered) => editingCameraUnit?.section === "frontCamera" && editingCameraUnit.index === index ? null : <div key={`front-camera-chip-${index}`} className="flex w-full min-w-0 items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">{camera.role || getCameraRoleLabel(position)}</span><span className="text-xs font-semibold text-slate-600">Front camera</span></div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">{getCameraUnitSummary(camera).map((detail) => <span key={detail}>{detail}</span>)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setEditingCameraUnit({ section: "frontCamera", index })} className="text-xs font-semibold text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteCameraUnit("frontCamera", index)} className="text-xs font-semibold text-rose-700">Delete</button>
                    <button type="button" disabled={position === 0} aria-label="Move camera up" onClick={() => moveCameraUnit("frontCamera", index, -1)} className="rounded border px-1.5 text-slate-600 disabled:opacity-40">↑</button>
                    <button type="button" disabled={position === ordered.length - 1} aria-label="Move camera down" onClick={() => moveCameraUnit("frontCamera", index, 1)} className="rounded border px-1.5 text-slate-600 disabled:opacity-40">↓</button>
                  </div>
                </div>)}
              </div>
              {sortCameraUnitsWithIndices(form.frontCamera?.cameras || []).filter(({ index }) => editingCameraUnit?.section === "frontCamera" && editingCameraUnit.index === index).map(({ camera, index }) => (
                <div key={`front-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="max-w-40 truncate rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900 ring-1 ring-inset ring-blue-200">{camera.role || "Select location"}</span>
                      <span className="relative grid h-7 w-7 shrink-0 place-items-center text-slate-500 hover:text-blue-700">
                        <Select aria-label={`Front camera ${index + 1} location`} value={camera.role || ""} onChange={(e) => updateCameraLocation("frontCamera", index, e.target.value)} className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent opacity-0"><option value="">Select camera location</option>{CAMERA_NAME_OPTIONS.map((name) => <option key={`front-name-${index}-${name}`} value={name}>{name}</option>)}</Select>
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                      </span>
                    </div>
                    <div className="flex flex-1 justify-center">
                      <button type="button" aria-label="Toggle front camera pixel binning" aria-expanded={camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)} onClick={() => updatePath(["frontCamera", "cameras", index, "sensor", "binningSupported"], !(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails) ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-600"}`}>Binning {(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)) ? "On" : "Off"}</button>
                    </div>
                    <button type="button" onClick={() => clearCameraUnit("frontCamera", index, camera.role)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Clear all</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                    {postureOptions.length > 1 ? <Field label="Visible Postures" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.visibleposture || postureOptions} value={formatCsv(camera.posturesVisible)} onChange={(value) => updatePath(["frontCamera", "cameras", index, "posturesVisible"], splitCsv(value))} commaSeparated /></Field> : null}
                    <Field label="Camera Type" className="lg:col-span-2"><HelperTermInput suggestions={Array.from(new Set([...(cameraTermSuggestions.cameratype || []), ...CAMERA_TYPE_OPTIONS]))} value={camera.cameraType || camera.purpose || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "cameraType"], value)} placeholder="Wide, Ultra-wide, Macro" /></Field>
                    <Field label="Camera Resolution" className="lg:col-span-2"><UnitInput containerClassName="max-w-36" value={camera.resolution || ""} onChange={(e) => updateCameraUnitAndCommon("frontCamera", index, ["resolution"], e.target.value)} suffix="MP" /></Field>
                    <div className="lg:col-span-5"><Field label="Sensor Name"><HelperTermInput suggestions={cameraTermSuggestions.sensorname || []} value={camera.sensor?.name || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "sensor", "name"], value)} /></Field></div>
                    <Field label="Sensor Size" className="lg:col-span-2"><UnitInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "size"], e.target.value)} suffix='"' /></Field>
                    <Field label="Pixel Size" className="lg:col-span-2"><UnitInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} suffix="Âµm" /></Field>
                    <div className="min-w-0 lg:col-span-2"><Field label="Image Resolution (H x W)"><div className="grid min-w-0 grid-cols-[64px_auto_64px_auto] items-center gap-1"><TextInput inputMode="numeric" value={String(camera.imageResolutionWidth ?? "")} onChange={(e) => updateCameraImageResolution("frontCamera", index, "width", e.target.value.replace(/\D/g, ""))} placeholder="8140" className="min-w-0 w-full px-2" /><span>Ã—</span><TextInput inputMode="numeric" value={String(camera.imageResolutionHeight ?? "")} onChange={(e) => updateCameraImageResolution("frontCamera", index, "height", e.target.value.replace(/\D/g, ""))} placeholder="7878" className="min-w-0 w-full px-2" /><span className="text-sm text-slate-500">px</span></div></Field></div>
                    <Field label="Sensor Aperture" className="lg:col-span-2"><UnitInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "aperture"], e.target.value)} prefix="f/" /></Field>
                    <Field label="Focal Length" className="lg:col-span-3"><UnitInput value={camera.sensor?.focalLength || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "focalLength"], e.target.value)} suffix="mm" placeholder="e.g. 24 or 24-70" /></Field>
                    <Field label="FOV" className="lg:col-span-1"><UnitInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "fov"], e.target.value)} suffix="Â°" containerClassName="max-w-36" /></Field>
                    <Field label="Lens Type (5P, 6P)" className="min-w-0 lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.lenstype || []} value={camera.sensor?.lensType || ""} onChange={(value) => updatePath(["frontCamera", "cameras", index, "sensor", "lensType"], value)} placeholder="5P, 6P" /></Field>
                    <Field label="Optical Zoom" className="lg:col-span-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.opticalZoom || ""), 4)} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "opticalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="2" containerClassName="w-20" /></Field>
                    <Field label="Digital Zoom" className="lg:col-span-2"><UnitInput inputMode="decimal" suffix="x" value={sanitizeDecimal(String(camera.sensor?.digitalZoom || ""), 4)} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "digitalZoom"], sanitizeDecimal(e.target.value, 4))} placeholder="10" containerClassName="w-20" /></Field>
                    <Field label="OIS / EIS / AF / FF" className="lg:col-span-2"><div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white"><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "ois"], !camera.sensor?.ois)} className={`h-10 px-3 text-xs font-semibold ${camera.sensor?.ois ? "bg-blue-700 text-white" : "text-slate-700"}`}>OIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "eis"], !camera.sensor?.eis)} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.eis ? "bg-blue-700 text-white" : "text-slate-700"}`}>EIS</button><button type="button" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "autofocus"], camera.sensor?.autofocus === "AF" ? "" : "AF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus === "AF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>AF</button><button type="button" title="Fixed focus" onClick={() => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "autofocus"], camera.sensor?.autofocus === "FF" ? "" : "FF")} className={`h-10 border-l border-slate-300 px-3 text-xs font-semibold ${camera.sensor?.autofocus === "FF" ? "bg-blue-700 text-white" : "text-slate-700"}`}>FF</button></div></Field>
                    <Field label="Autofocus Detail" className="lg:col-span-2"><HelperTermInput suggestions={cameraTermSuggestions.autofocusdetail || []} value={camera.sensor?.autofocus === "AF" || camera.sensor?.autofocus === "FF" ? "" : camera.sensor?.autofocus || ""} onChange={(value) => updateCameraUnitAndCommon("frontCamera", index, ["sensor", "autofocus"], value || (camera.sensor?.autofocus === "FF" ? "FF" : camera.sensor?.autofocus ? "AF" : ""))} placeholder="PDAF" /></Field>

{(camera.sensor?.binningSupported ?? Boolean(camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize || camera.sensor?.binningDetails)) ? <div className="sm:col-span-2 lg:col-span-12 rounded-lg border border-slate-200 bg-white p-3"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Pixel Binning</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="Binned Resolution"><UnitInput value={camera.sensor?.binnedResolution || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "binnedResolution"], e.target.value)} suffix="MP" placeholder="e.g. 16" /></Field>
                      <Field label="Binned Pixel Size"><UnitInput value={camera.sensor?.binnedPixelSize || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "binnedPixelSize"], e.target.value)} suffix="µm" placeholder="e.g. 1.2" /></Field>
                      <div className="sm:col-span-2 lg:col-span-3"><Field label="Binning Details (shown publicly)"><HelperTermInput suggestions={cameraTermSuggestions.binningdetails || []} value={getBinningDetailsInputValue(camera.sensor?.binnedPixelSize, camera.sensor?.binningDetails)} onChange={(value) => updatePath(["frontCamera", "cameras", index, "sensor", "binningDetails"], getBinningDetailsExtraValue(value, camera.sensor?.binnedPixelSize))} placeholder="4-in-1 pixel binning" /></Field></div>
                    </div></div> : null}
                    <div className="sm:col-span-2 lg:col-span-12"><div className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(8rem,1fr)] lg:items-end"><Field label="Front Camera Features"><HelperTermInput multiline suggestions={cameraTermSuggestions.camerafeatures || []} value={formatCsv(camera.features)} onChange={(value) => updatePath(["frontCamera", "cameras", index, "features"], splitCsv(value))} commaSeparated /></Field><button type="button" onClick={() => setEditingCameraUnit(null)} className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">Save</button></div></div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
          <div className="mt-4">
            <CameraVideoProfilesEditor
              camera="frontCamera"
              profiles={form.frontCamera?.videoProfiles}
              suggestions={cameraTermSuggestions}
              videoFeatures={formatCsv(form.frontCamera?.video?.features)}
              videoFeaturesLabel="Front Camera Video Features"
              onChangeProfiles={(groups) => updateCameraVideoProfileGroups("frontCamera", groups, true)}
              onChangeVideoFeatures={(value) => updatePath(["frontCamera", "video", "features"], splitCsv(value))}
            />
          </div>

          <HiddenSectionFeatures
            label="Hidden Front Camera Other Features"
            value={form?.frontCamera?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["frontCamera", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-security-sensors" className="scroll-mt-40 [order:11]">
        <Section title="Security & Sensors" description="Fingerprint, face unlock, and sensor coverage for public spec sections and filters." {...mobileSectionProps("mobile-security-sensors")}>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <Field label="Fingerprint" className="w-fit shrink-0">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {(["yes", "no"] as const).map((value, index) => {
                  const selected = value === "yes" ? form.security?.fingerprint?.available === true : form.security?.fingerprint?.available === false;
                  const availability = value === "yes";
                  return <button key={value} type="button" onClick={() => updateFingerprintAvailability(form.security?.fingerprint?.available === availability ? undefined : availability)} className={`h-10 px-3 text-xs font-semibold ${index ? "border-l border-slate-300" : ""} ${selected ? "bg-blue-700 text-white" : "text-slate-600"}`}>{value === "yes" ? "Yes" : "No"}</button>;
                })}
              </div>
            </Field>
            {form.security?.fingerprint?.available === true ? <>
              <Field label="Fingerprint Position" className="min-w-48 flex-1"><HelperTermInput suggestions={securityTermSuggestions.fingerprintposition || []} value={formatCsv(form.security?.fingerprint?.locations)} onChange={(value) => updatePath(["security", "fingerprint", "locations"], splitCsv(value))} commaSeparated /></Field>
              <Field label="Fingerprint Technology" className="min-w-48 flex-1"><HelperTermInput suggestions={securityTermSuggestions.fingerprinttechnology || []} value={formatCsv(form.security?.fingerprint?.type)} onChange={(value) => updatePath(["security", "fingerprint", "type"], splitCsv(value))} commaSeparated /></Field>
            </> : null}
            <Field label="Face Unlock" className="w-fit shrink-0">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                {(["yes", "no"] as const).map((value, index) => {
                  const current = form.security?.faceUnlock?.available; const selected = value === "yes" ? current === true : current === false;
                  const availability = value === "yes";
                  return <button key={value} type="button" onClick={() => updateFaceUnlockAvailability(current === availability ? undefined : availability)} className={`h-10 px-3 text-xs font-semibold ${index ? "border-l border-slate-300" : ""} ${selected ? "bg-blue-700 text-white" : "text-slate-600"}`}>{value === "yes" ? "Yes" : "No"}</button>;
                })}
              </div>
            </Field>
            {form.security?.faceUnlock?.available === true ? <Field label="Face Unlock Technology" className="min-w-48 flex-1"><HelperTermInput suggestions={securityTermSuggestions.faceunlocktechnology || []} value={cleanText(form.security?.faceUnlock?.type)} onChange={updateFaceUnlockType} commaSeparated /></Field> : null}
            <Field label="Iris Scanner" className="w-fit shrink-0">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((option, index) => (
                  <button
                    key={`iris-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      updateIrisScanner(form.security?.irisScanner === option.value ? undefined : option.value);
                    }}
                    className={`inline-flex h-10 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.security?.irisScanner === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="NFC" className="w-fit shrink-0">
              <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300 bg-slate-100">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((option, index) => (
                  <button
                    key={`nfc-${option.label.toLowerCase()}`}
                    type="button"
                    onClick={() => updatePath(["network", "nfc"], form.network?.nfc === option.value ? undefined : option.value)}
                    className={`inline-flex h-10 items-center justify-center whitespace-nowrap px-3 py-0 text-xs font-semibold leading-none transition ${index > 0 ? "border-l border-slate-300" : ""} ${
                      form.network?.nfc === option.value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
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
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Vibration Motor</p>
              <div className="flex flex-wrap gap-2">
                {VIBRATION_MOTOR_OPTIONS.map((motor) => (
                  <button key={`vibration-motor-${motor}`} type="button" onClick={() => toggleTextOption(["security", "vibrationMotors"], motor)} className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-semibold ${(form.security?.vibrationMotors || []).includes(motor) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{motor}</button>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Other Vibration Motor Types">
                  <HelperTermInput suggestions={securityTermSuggestions.additionalsensors || []} value={formatCsv((form.security?.vibrationMotors || []).filter((item) => !(VIBRATION_MOTOR_OPTIONS as readonly string[]).includes(item)))} onChange={(value) => {
                    const custom = splitCsv(value);
                    const selected = (form.security?.vibrationMotors || []).filter((item) => (VIBRATION_MOTOR_OPTIONS as readonly string[]).includes(item));
                    updatePath(["security", "vibrationMotors"], [...selected, ...custom]);
                  }} commaSeparated placeholder="e.g. Dual X-axis linear motors" />
                </Field>
              </div>
            </div>
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
                {SENSOR_BASE_OPTIONS.filter((sensor) => sensor.key !== "nfc").map((sensor) => (
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
                    <div
                      key={`selected-sensor-${item.label}-${index}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = draggedSensorIndex ?? Number(event.dataTransfer.getData("text/plain"));
                        if (Number.isFinite(fromIndex)) reorderSensors(fromIndex, index);
                        setDraggedSensorIndex(null);
                      }}
                      className={`flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 ${draggedSensorIndex === index ? "opacity-50" : ""}`}
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          setDraggedSensorIndex(index);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                        }}
                        onDragEnd={() => setDraggedSensorIndex(null)}
                        className="cursor-grab select-none touch-none text-lg leading-none text-slate-400 active:cursor-grabbing"
                        aria-label={`Drag to reorder ${item.label}`}
                        title="Drag to reorder"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><circle cx="5" cy="3" r="1.2" /><circle cx="11" cy="3" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="5" cy="13" r="1.2" /><circle cx="11" cy="13" r="1.2" /></svg>
                      </button>
                      <p className="min-w-0 flex-1 text-xs font-semibold text-slate-900">{item.label}</p>
                      <button type="button" onClick={() => removeSensor(item.label)} className="text-sm font-bold leading-none text-rose-600 hover:text-rose-800" aria-label={`Remove ${item.label}`} title={`Remove ${item.label}`}>Ã—</button>
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

          <HiddenSectionFeatures
            label="Hidden Security & Sensors Other Features"
            value={[...(form.security?.hiddenFeatures || []), ...(form.sensorHiddenFeatures || [])]}
            suggestions={helperSuggestions}
            onChange={(value) => { updatePath(["security", "hiddenFeatures"], value); updatePath(["sensorHiddenFeatures"], []); }}
          />
</Section>
        </div>

        <div id="mobile-network-connectivity" className="scroll-mt-40 [order:12]">
        <Section title="Network & Connectivity" description="Supported networks, SIM setup, bands, GNSS, wireless, and USB connectivity." {...mobileSectionProps("mobile-network-connectivity")}>
          <div className="grid gap-3">
            <div className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[18rem_9rem_minmax(0,1fr)] lg:items-end">
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
              <Field label="No. of 5G Bands" className="min-w-0">
                <TextInput
                  type="number"
                  min="0"
                  step="1"
                  disabled={!has5GNetworkSelected}
                  value={has5GNetworkSelected ? form.network?.fiveGBandCount ?? autoFiveGBandCount : ""}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    updatePath(["network", "fiveGBandCount"], rawValue === "" ? undefined : Math.max(0, Math.floor(Number(rawValue))));
                  }}
                  placeholder={has5GNetworkSelected ? String(autoFiveGBandCount) : "Select 5G"}
                  className="w-full disabled:bg-slate-100 disabled:text-slate-400"
                />
              </Field>
              <Field label="Calling Features" className="min-w-0">
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

          <HiddenSectionFeatures
            label="Hidden Network Other Features"
            value={form?.network?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["network", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-software" className="scroll-mt-40 [order:13]">
        <Section title="Software" description="OS, UI, and update commitment information." {...mobileSectionProps("mobile-software")}>
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

          <HiddenSectionFeatures
            label="Hidden Software Other Features"
            value={form?.software?.hiddenFeatures}
            suggestions={helperSuggestions}
            onChange={(value) => updatePath(["software", "hiddenFeatures"], value)}
          />
</Section>
        </div>

        <div id="mobile-images" className="scroll-mt-40 [order:14]">
          <Section title="Images" description="Add delivery URLs for images stored in Cloudinary or ImageKit. All-colors overview appears first, followed by the selected colorâ€™s images.">
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
          <p className="mb-2 text-xs text-slate-500">Paste a secure Cloudinary or ImageKit delivery URL. Cloudinary format and quality options are available for Cloudinary images. Select â€œAll colorsâ€ for an overview, or choose one of Smartphone Colors for a color-specific photo.</p>
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
            <Field label={<span className="flex w-full items-center justify-between gap-2"><span>Cloudinary or ImageKit delivery URL</span><button type="button" disabled={!isSupportedImageDeliveryUrl(imageUrlDraft)} onClick={addAutomaticImageOptimizations} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">Add auto format/quality</button></span>}>
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>(</span>
                <code className="break-all">{CLOUDINARY_DELIVERY_URL_PREFIX}</code>
                <span>)</span>
                <button type="button" onClick={copyCloudinaryDeliveryUrlPrefix} className="shrink-0 font-semibold text-blue-700 underline underline-offset-2">Copy prefix</button>
              </div>
              <TextInput className="w-full min-w-0 bg-white" value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addImageDeliveryUrl(); } }} placeholder="Cloudinary: https://res.cloudinary.com/...  |  ImageKit: https://ik.imagekit.io/..." />
            </Field>
            <button type="button" onClick={addImageDeliveryUrl} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add image</button>
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
                      {previewItems.map((item, index) => (
                        <button key={`${item.url}-${index}`} type="button" onClick={() => setImagePreviewIndex(index)} aria-pressed={activeIndex === index} aria-label={`Show image ${index + 1}`} style={{ backgroundColor: previewBackground }} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${activeIndex === index ? "border-blue-400" : "border-slate-200"}`}>
                          <Image src={item.url} alt={`${form.name || "Product"} thumbnail ${index + 1}`} fill className="object-contain p-1" unoptimized />
                        </button>
                      ))}
                    </div>
                    <div className="order-1 grid min-w-0 gap-2 sm:order-2">
                      <div style={{ backgroundColor: previewBackground }} className="relative h-64 overflow-hidden rounded-xl border border-slate-100">
                        <Image src={activeItem.url} alt={`${form.name || "Product"} image ${activeIndex + 1}`} fill className="object-contain" unoptimized />
                        {previewItems.length > 1 ? <>
                          <button type="button" onClick={() => setImagePreviewIndex((current) => (current - 1 + previewItems.length) % previewItems.length)} aria-label="Previous image" title="Previous image (←)" className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-800 shadow hover:bg-white">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <button type="button" onClick={() => setImagePreviewIndex((current) => (current + 1) % previewItems.length)} aria-label="Next image" title="Next image (→)" className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-800 shadow hover:bg-white">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </> : null}
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
              {dimensionColorErrors.map((item) => <button key={`${item.path}-${item.color}`} type="button" className="w-fit text-left underline" onClick={() => { const field = document.querySelector(`[data-color-path="${item.path}"]`); field?.scrollIntoView({ behavior: "smooth", block: "center" }); (field as HTMLElement | null)?.focus(); }}>{item.label}: â€œ{item.color}â€ is not in Smartphone Colors. Go to field.</button>)}
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
            {deviceType === "smartphone" ? <button type="button" onClick={() => setQuickSpecsEditorOpen((open) => !open)} aria-expanded={quickSpecsEditorOpen} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${quickSpecsEditorOpen ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>Quick Specs</button> : null}
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
              {deviceType === "smartphone" ? <button type="button" onClick={() => setQuickSpecsEditorOpen((open) => !open)} aria-expanded={quickSpecsEditorOpen} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${quickSpecsEditorOpen ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>Quick Specs</button> : null}
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
