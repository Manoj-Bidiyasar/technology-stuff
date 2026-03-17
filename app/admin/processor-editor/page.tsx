"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProcessorAdmin } from "@/lib/firestore/processors";
import type { ProcessorDetail } from "@/lib/processors/details";
import { getPublicSiteUrl } from "@/lib/seo/site";
import { slugify } from "@/utils/slugify";

type DetailFieldType = "text" | "number" | "csv" | "boolean" | "kv";
type DetailField = { key: string; label: string; type: DetailFieldType; placeholder?: string };
type DetailSection = { title: string; fields: DetailField[] };
type CpuCluster = { id: string; count: number; core: string; ghz: number; isMax: boolean };
type RamProfile = { id: string; type: string; freq: number | "" };
type DisplayModeProfile = { id: string; mode: string; resolution: string; rr: number | "" };
type CameraLensProfile = { id: string; value: string };
type CameraSetupProfile = { id: string; setupCount: number; lenses: CameraLensProfile[] };
type VideoRecordingProfile = { id: string; mode: string; fps: number | "" };
type PrivateFieldType = "string" | "number" | "boolean" | "array" | "timestamp";
type PrivateFieldDraft = { section: string; label: string; subField: string; value: string; type: PrivateFieldType };
type PrivateFieldEntry = {
  section: string;
  label: string;
  subField?: string;
  value: string | number | boolean | string[];
  type: PrivateFieldType;
  sourceSection?: string;
};
type PrivateFieldSimpleDraft = { section: string; label: string; value: string };
type BulkRow = { path: string; value: string; type?: string };

const BRAND_OPTIONS = ["Samsung", "Qualcomm", "MediaTek", "Apple", "Google", "Unisoc", "Huawei", "Intel", "AMD"];
const CLASS_OPTIONS = ["Ultra Flagship", "Flagship", "Upper Midrange", "Midrange", "Budget", "Entry"];
const BRAND_TITLE_HINTS: Record<string, string[]> = {
  Samsung: ["Exynos"],
  Qualcomm: ["Snapdragon"],
  MediaTek: ["Dimensity", "Helio"],
  Google: ["Tensor"],
  Apple: ["A", "M"],
  Unisoc: ["Tiger", "T"],
  Huawei: ["Kirin"],
  Intel: ["Core", "Atom"],
  AMD: ["Ryzen"],
};
const INSTRUCTION_SET_OPTIONS = [
  "ARMv8-A",
  "ARMv8.2-A",
  "ARMv9-A",
  "ARMv9.2-A",
  "x86-64",
];
const ARCHITECTURE_BITS_OPTIONS = ["64bit", "32bit"];
const CPU_CORE_OPTIONS = [
  "Arm Cortex-X5",
  "Arm Cortex-X4",
  "Arm Cortex-X3",
  "Arm Cortex-A720",
  "Arm Cortex-A715",
  "Arm Cortex-A710",
  "Arm Cortex-A78",
  "Arm Cortex-A77",
  "Arm Cortex-A55",
  "Kryo",
  "Oryon",
];
const RAM_TYPE_SUGGESTIONS = [
  "LPDDR2",
  "LPDDR3",
  "LPDDR4",
  "LPDDR4X",
  "LPDDR5",
  "LPDDR5X",
  "LPDDR5T",
  "LPDDR6",
  "LPDDR6X",
  "DDR4",
  "DDR5",
];
const STORAGE_TYPE_SUGGESTIONS = [
  "eMMC 4.5",
  "eMMC 5.0",
  "eMMC 5.1",
  "UFS 2.0",
  "UFS 2.1",
  "UFS 2.2",
  "UFS 3.0",
  "UFS 3.1",
  "UFS 4.0",
  "UFS 4.0 + MCQ",
  "UFS 4.1",
  "UFS 4.1 + MCQ",
  "NVMe",
];
const NETWORK_SUPPORT_OPTIONS = ["5G", "4G", "3G", "2G"];
const WIFI_OPTIONS = ["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"];
const BLUETOOTH_OPTIONS = ["4.2", "5.0", "5.1", "5.2", "5.3", "5.4", "6.0"];
const NAVIGATION_OPTIONS = ["GPS", "A-GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "NavIC"];
const CAMERA_SETUP_OPTIONS = [
  { label: "Single", count: 1 },
  { label: "Dual", count: 2 },
  { label: "Triple", count: 3 },
  { label: "Quad", count: 4 },
  { label: "Penta", count: 5 },
];
const VIDEO_RECORDING_MODE_OPTIONS = ["8K", "4K", "2K", "QHD", "FHD+", "FHD (1080p)", "HD (720p)", "SD (480p)"];
const DISPLAY_MODE_NAME_OPTIONS = [
  "HD",
  "HD+",
  "FHD",
  "FHD+",
  "QHD",
  "QHD+",
  "WQHD+",
  "2K",
  "4K",
  "8K",
];
const CSV_TEXT_FIELDS = [
  "cpuFeatures",
  "gpuFeatures",
  "gpuApis",
  "aiFeatures",
  "cameraFeatures",
  "videoRecordingModes",
  "videoFeatures",
  "displayFeatures",
  "audioCodecs",
  "multimediaFeatures",
  "bluetoothFeatures",
];
const SEO_CSV_FIELDS = ["seo.tags"];
const PRIVATE_SECTION_SUGGESTIONS = [
  "Basic",
  "Benchmark",
  "CPU",
  "Graphics (GPU)",
  "AI",
  "Memory",
  "Storage",
  "Camera",
  "Video",
  "Display",
  "Multimedia",
  "Connectivity",
  "Charging",
  "Source",
  "Other",
];
const FIELD_SUGGESTIONS: Record<string, string[]> = {
  cameraIsp: ["Imagiq 890", "Imagiq 1080", "Spectra ISP", "Hexagon ISP"],
  gpuName: ["Adreno 830", "Adreno 750", "Mali-G720", "Immortalis-G720"],
  gpuArchitecture: ["Adreno", "Valhall", "Immortalis", "RDNA"],
  aiEngine: ["Hexagon NPU", "MediaTek APU", "Tensor TPU", "Neural Engine"],
  modem: ["Snapdragon X75", "Snapdragon X70", "Exynos Modem 5300", "MediaTek M80"],
  wifi: ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"],
  bluetooth: ["5.0", "5.1", "5.2", "5.3", "5.4"],
  quickCharging: ["Quick Charge 5", "USB PD 3.1", "VOOC", "SuperVOOC"],
};
const NORMALIZE_ALIASES: Record<string, string> = {
  imagiq: "Imagiq",
  imagiq890: "Imagiq 890",
  imagiq1080: "Imagiq 1080",
  imigeq: "Imagiq",
  imigeq890: "Imagiq 890",
  imigeq1080: "Imagiq 1080",
  wifi7: "Wi-Fi 7",
  wifi6e: "Wi-Fi 6E",
  wifi6: "Wi-Fi 6",
  wifi5: "Wi-Fi 5",
  bluetooth50: "5.0",
  bluetooth51: "5.1",
  bluetooth52: "5.2",
  bluetooth53: "5.3",
  bluetooth54: "5.4",
};
let HELPER_ALIAS_MAP: Record<string, string> = {};
let HELPER_SUGGESTIONS: string[] = [];
let HELPER_SUGGESTIONS_BY_SECTION: Record<string, string[]> = {};

function setHelperAliasMap(next: Record<string, string>) {
  HELPER_ALIAS_MAP = next;
}

function setHelperSuggestions(next: string[]) {
  HELPER_SUGGESTIONS = next;
}
function setHelperSectionSuggestions(next: Record<string, string[]>) {
  HELPER_SUGGESTIONS_BY_SECTION = next;
}

const DETAIL_SECTIONS: DetailSection[] = [
  {
    title: "CPU / Core",
    fields: [
      { key: "coreCount", label: "Core Count", type: "number" },
      { key: "coreConfiguration", label: "Core Configuration", type: "text" },
      { key: "cores", label: "Cores (raw text)", type: "text" },
      { key: "instructionSet", label: "Instruction Set", type: "text" },
      { key: "architectureBits", label: "Architecture", type: "text" },
      { key: "process", label: "Fabrication", type: "text" },
      { key: "transistorCount", label: "Transistor Count", type: "text" },
      { key: "l2Cache", label: "L2 Cache", type: "text" },
      { key: "l3Cache", label: "L3 Cache", type: "text" },
      { key: "cpuFeatures", label: "CPU Features", type: "csv" },
      { key: "tdpW", label: "TDP (W)", type: "number" },
    ],
  },
  {
    title: "Graphics (GPU)",
    fields: [
      { key: "gpuName", label: "GPU Name", type: "text" },
      { key: "gpuArchitecture", label: "GPU Architecture", type: "text" },
      { key: "pipelines", label: "GPU Cores", type: "number" },
      { key: "gpuFrequencyMhz", label: "GPU Frequency (MHz)", type: "number" },
      { key: "gpuApis", label: "APIs", type: "csv" },
      { key: "gpuFlops", label: "FLOPS", type: "text" },
      { key: "gpuFeatures", label: "GPU Features", type: "csv" },
    ],
  },
  {
    title: "AI",
    fields: [
      { key: "aiEngine", label: "AI Engine", type: "text" },
      { key: "aiPerformanceTops", label: "AI TOPS", type: "number" },
      { key: "aiPrecision", label: "AI Precision", type: "text" },
      { key: "aiFeatures", label: "AI Features", type: "csv" },
    ],
  },
  {
    title: "Memory / Storage",
    fields: [
      { key: "memoryType", label: "RAM Type", type: "text" },
      { key: "memoryTypes", label: "Memory Types", type: "csv" },
      { key: "memoryFreqMhz", label: "Memory Frequency (MHz)", type: "number" },
      { key: "memoryFreqByType", label: "Memory Freq by Type", type: "kv", placeholder: "LPDDR5X:8533" },
      { key: "memoryChannels", label: "Memory Channels", type: "text" },
      { key: "storageChannels", label: "Storage Channels / Lanes", type: "text" },
      { key: "memoryBusWidthBits", label: "Memory Bus Width (bits)", type: "number" },
      { key: "maxMemoryGb", label: "Max Memory (GB)", type: "number" },
      { key: "storageType", label: "Storage Type", type: "text" },
      { key: "storageTypes", label: "Storage Types", type: "csv" },
      { key: "bandwidthGbps", label: "Bandwidth (GB/s)", type: "number" },
    ],
  },
  {
    title: "Display & Multimedia",
    fields: [
      { key: "maxDisplayResolution", label: "Max Display Resolution", type: "text" },
      { key: "maxRefreshRateHz", label: "Max Refresh Rate (Hz)", type: "number" },
      { key: "displayModes", label: "Display Modes", type: "csv" },
      { key: "outputDisplay", label: "Output Display", type: "text" },
      { key: "displayFeatures", label: "Display Features", type: "csv" },
      { key: "audioCodecs", label: "Audio Codecs", type: "csv" },
      { key: "multimediaFeatures", label: "Multimedia Features", type: "csv" },
    ],
  },
  {
    title: "Camera & Video",
    fields: [
      { key: "cameraIsp", label: "Camera ISP", type: "text" },
      { key: "maxCameraSupport", label: "Max Camera Support", type: "text" },
      { key: "cameraSupportModes", label: "Camera Support Modes", type: "csv" },
      { key: "cameraFeatures", label: "Camera Features", type: "csv" },
      { key: "maxVideoCapture", label: "Max Video Capture", type: "text" },
      { key: "videoCapture", label: "Video Capture", type: "text" },
      { key: "videoRecordingModes", label: "Video Recording Modes", type: "csv" },
      { key: "videoRecordingCodecs", label: "Video Recording Codecs", type: "csv" },
      { key: "videoFeatures", label: "Video Features", type: "csv" },
      { key: "videoPlayback", label: "Video Playback", type: "text" },
      { key: "videoPlaybackCodecs", label: "Video Playback Codecs", type: "csv" },
    ],
  },
  {
    title: "Connectivity",
    fields: [
      { key: "modem", label: "Modem Name", type: "text" },
      { key: "networkSupport", label: "Network Support", type: "csv" },
      { key: "downloadMbps", label: "Download Speed (Mbps)", type: "number" },
      { key: "uploadMbps", label: "Upload Speed (Mbps)", type: "number" },
      { key: "wifi", label: "Wi-Fi", type: "text" },
      { key: "bluetooth", label: "Bluetooth", type: "text" },
      { key: "bluetoothFeatures", label: "Bluetooth Features", type: "csv" },
      { key: "navigation", label: "Navigation", type: "csv" },
    ],
  },
  {
    title: "Charging & Source",
    fields: [
      { key: "quickCharging", label: "Quick Charging", type: "text" },
      { key: "chargingSpeed", label: "Charging Speed", type: "text" },
      { key: "sourceUrl", label: "Source URL", type: "text" },
    ],
  },
];

function getSectionOptions(title: string): string[] {
  if (title === "CPU / Core") return ["CPU"];
  return title
    .split(/[\/&]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePrivateSourceSection(sectionName: string): string | undefined {
  const normalized = sectionName.trim().toLowerCase();
  if (!normalized) return undefined;
  for (const section of DETAIL_SECTIONS) {
    const options = getSectionOptions(section.title);
    if (options.some((option) => option.toLowerCase() === normalized)) {
      return section.title;
    }
  }
  return undefined;
}

const SEO_FIELDS: DetailField[] = [
  { key: "seo.metaTitle", label: "SEO Title", type: "text" },
  { key: "seo.metaDescription", label: "SEO Description", type: "text" },
  { key: "seo.canonicalUrl", label: "Canonical URL", type: "text" },
  { key: "seo.summary", label: "Summary", type: "text" },
  { key: "seo.focusKeyword", label: "Focus Keyword", type: "text" },
  { key: "seo.tags", label: "Tags", type: "csv" },
  { key: "seo.ogImage", label: "OG Image URL", type: "text" },
  { key: "seo.noIndex", label: "No Index", type: "boolean" },
];


const QUALITY_FIELDS: Array<{ label: string; path: string; sectionId: string }> = [
  { label: "Launch Date", path: "announced", sectionId: "detail-basic" },
  { label: "Manufacturer", path: "manufacturer", sectionId: "detail-basic" },
  { label: "Class", path: "className", sectionId: "detail-basic" },
  { label: "Model Number", path: "model", sectionId: "detail-basic" },
  { label: "AnTuTu Version", path: "benchmarks.antutuVersion", sectionId: "detail-benchmarks" },
  { label: "AnTuTu Total", path: "benchmarks.antutu", sectionId: "detail-benchmarks" },
  { label: "Geekbench Version", path: "benchmarks.geekbenchVersion", sectionId: "detail-benchmarks" },
  { label: "Geekbench Single", path: "benchmarks.geekbenchSingle", sectionId: "detail-benchmarks" },
  { label: "Geekbench Multi", path: "benchmarks.geekbenchMulti", sectionId: "detail-benchmarks" },
  { label: "3DMark Name", path: "benchmarks.threeDMarkName", sectionId: "detail-benchmarks" },
  { label: "3DMark Score", path: "benchmarks.threeDMark", sectionId: "detail-benchmarks" },
  ...DETAIL_SECTIONS.flatMap((section) =>
    section.fields.map((field) => ({
      label: field.label,
      path: field.key,
      sectionId: `detail-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    }))
  ),
  ...SEO_FIELDS.map((field) => ({
    label: field.label,
    path: field.key,
    sectionId: "detail-seo",
  })),
];
const DETAIL_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  DETAIL_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, field.label]))
);

const FIELD_HELP: Record<string, string> = {
  "CPU / Core.coreCount": "Total cores (auto from cluster builder).",
  "CPU / Core.coreConfiguration": "Format: 1x Arm Cortex-X4 @ 3.2GHz, 3x ...",
  "CPU / Core.cores": "Optional raw note for custom layouts (example: 1+3+4).",
  "CPU / Core.instructionSet": "CPU ISA (for example: ARMv9.2-A).",
  "CPU / Core.architectureBits": "Bitness (32bit or 64bit).",
  "CPU / Core.process": "Fabrication node in nm (for example: 4nm, 3nm).",
  "CPU / Core.transistorCount": "Chip transistor count (example: 17.5 billion).",
  "CPU / Core.l2Cache": "Per-cluster or total L2 cache value.",
  "CPU / Core.l3Cache": "Total shared L3 cache value.",
  "CPU / Core.cpuFeatures": "Comma separated features (example: SMT, AV1 decode).",
  "CPU / Core.tdpW": "Thermal design power in watts.",
  "Graphics (GPU).gpuName": "GPU marketing name (example: Adreno 750).",
  "Graphics (GPU).gpuArchitecture": "GPU architecture family/gen.",
  "Graphics (GPU).pipelines": "GPU pipeline count if available.",
  "Graphics (GPU).gpuFrequencyMhz": "Peak GPU clock in MHz.",
  "Graphics (GPU).gpuApis": "Comma separated graphics APIs (Vulkan/OpenGL/DirectX/etc).",
  "Graphics (GPU).gpuFlops": "Peak GPU throughput (e.g. 5.6 TFLOPS).",
  "Graphics (GPU).gpuFeatures": "Comma separated GPU features.",
  "AI.aiEngine": "NPU/AI engine name.",
  "AI.aiPerformanceTops": "Peak AI throughput in TOPS.",
  "AI.aiPrecision": "Supported AI precision formats (INT8/FP16/etc).",
  "AI.aiFeatures": "Comma separated AI capabilities.",
  "Camera & Video.cameraIsp": "Format: Brand ISP name (dual 12-bit / triple 18-bit).",
  "Camera & Video.videoRecordingModes": "Video recording modes (what the camera can record).",
  "Camera & Video.videoPlayback": "Video playback modes (what the chip can decode).",
  "Camera & Video.videoRecordingCodecs": "Comma separated recording codecs (H.264, H.265/HEVC, AV1).",
  "Camera & Video.videoPlaybackCodecs": "Comma separated playback codecs (H.264, H.265/HEVC, AV1).",
};

const BULK_ALLOWED_FIELDS = new Set<string>([
  "seo",
  "seo.metaTitle",
  "seo.metaDescription",
  "seo.canonicalUrl",
  "seo.summary",
  "seo.focusKeyword",
  "seo.tags",
  "seo.ogImage",
  "seo.noIndex",
  "announced",
  "manufacturer",
  "className",
  "model",
  "coreCount",
  "coreConfiguration",
  "cores",
  "instructionSet",
  "architectureBits",
  "process",
  "transistorCount",
  "l2Cache",
  "l3Cache",
  "cpuFeatures",
  "tdpW",
  "gpuName",
  "gpuArchitecture",
  "pipelines",
  "gpuFrequencyMhz",
  "gpuApis",
  "gpuFlops",
  "gpuFeatures",
  "aiEngine",
  "aiPerformanceTops",
  "aiPrecision",
  "aiFeatures",
  "memoryType",
  "memoryTypes",
  "memoryFreqMhz",
  "memoryFreqByType",
  "memoryChannels",
  "storageChannels",
  "memoryBusWidthBits",
  "maxMemoryGb",
  "storageType",
  "storageTypes",
  "bandwidthGbps",
  "cameraIsp",
  "maxCameraSupport",
  "cameraSupportModes",
  "cameraFeatures",
  "maxVideoCapture",
  "videoCapture",
  "videoRecordingModes",
  "videoRecordingCodecs",
  "videoFeatures",
  "videoPlayback",
  "videoPlaybackCodecs",
  "maxDisplayResolution",
  "maxRefreshRateHz",
  "displayModes",
  "outputDisplay",
  "displayFeatures",
  "audioCodecs",
  "multimediaFeatures",
  "modem",
  "networkSupport",
  "downloadMbps",
  "uploadMbps",
  "wifi",
  "bluetooth",
  "bluetoothFeatures",
  "navigation",
  "quickCharging",
  "chargingSpeed",
  "sourceUrl",
  "benchmarks",
  "benchmarks.antutuVersion",
  "benchmarks.antutu",
  "benchmarks.antutuCpu",
  "benchmarks.antutuGpu",
  "benchmarks.antutuMemory",
  "benchmarks.antutuUx",
  "benchmarks.geekbenchVersion",
  "benchmarks.geekbenchSingle",
  "benchmarks.geekbenchMulti",
  "benchmarks.threeDMarkName",
  "benchmarks.threeDMark",
  "adminPrivateFields",
]);

const PUBLIC_SITE_URL = getPublicSiteUrl();

function parseCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatCsv(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
}

function csvInputValue(value: unknown): string {
  if (Array.isArray(value)) return formatCsv(value);
  return String(value || "");
}

function normalizeLookupKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSectionKey(value: string): string {
  return normalizeLookupKey(value || "");
}

function getAliasCorrection(value: string): string | undefined {
  const compact = String(value || "").trim().replace(/\s+/g, " ");
  if (!compact) return undefined;
  const lookup = normalizeLookupKey(compact);
  const alias = HELPER_ALIAS_MAP[lookup] ?? NORMALIZE_ALIASES[lookup];
  if (!alias) return undefined;
  return alias === compact ? undefined : alias;
}

function normalizeTextToken(value: string): string {
  const compact = String(value || "").trim().replace(/\s+/g, " ");
  if (!compact) return "";
  const lookup = normalizeLookupKey(compact);
  const alias = HELPER_ALIAS_MAP[lookup] ?? NORMALIZE_ALIASES[lookup];
  return alias || compact;
}

function normalizeCsvArray(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((item) => {
    const normalized = normalizeTextToken(item);
    if (!normalized) return;
    const key = normalizeLookupKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });
  return out;
}

function replaceLastCsvToken(value: string, nextToken: string): string {
  const parts = String(value || "").split(",").map((item) => item.trim());
  if (parts.length === 0) return nextToken;
  parts[parts.length - 1] = nextToken;
  return parts.filter(Boolean).join(", ");
}

function getLastCsvToken(value: string): string {
  const parts = String(value || "").split(",");
  return (parts[parts.length - 1] || "").trim();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function getSuggestionListId(key: string): string | undefined {
  if (FIELD_SUGGESTIONS[key]) {
    return HELPER_SUGGESTIONS.length ? `suggest-${key}-merged` : `suggest-${key}`;
  }
  return HELPER_SUGGESTIONS.length ? "suggest-helper" : undefined;
}

function getSectionSuggestionListId(section: string): string | undefined {
  const key = normalizeSectionKey(section);
  if (!key) return undefined;
  const list = HELPER_SUGGESTIONS_BY_SECTION[key];
  return list && list.length ? `suggest-helper-section-${key}` : undefined;
}

function parsePrivateFieldValue(raw: string, type: PrivateFieldType): string | number | boolean | string[] {
  const text = String(raw || "").trim();
  if (type === "number") {
    const n = Number(text);
    return Number.isFinite(n) ? n : text;
  }
  if (type === "boolean") {
    if (/^(true|1|yes)$/i.test(text)) return true;
    if (/^(false|0|no)$/i.test(text)) return false;
    return text;
  }
  if (type === "array") return parseCsv(text);
  if (type === "timestamp") return text;
  return text;
}

function formatPrivateFieldValue(value: unknown, type: PrivateFieldType): string {
  if (type === "array") return Array.isArray(value) ? value.map((x) => String(x)).join(", ") : String(value || "");
  return String(value ?? "");
}

function sectionMatches(rowSection: string, sectionTitle: string, options: string[]): boolean {
  const normalizedRow = rowSection.trim().toLowerCase();
  if (!normalizedRow) return false;
  if (options.length > 0) {
    return options.some((opt) => opt.trim().toLowerCase() === normalizedRow);
  }
  return normalizedRow === sectionTitle.trim().toLowerCase();
}

function readPrivateFields(raw: unknown): PrivateFieldEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const section = String(row.section || "").trim();
      const label = String(row.label || "").trim();
      const subField = String(row.subField || "").trim();
      const sourceSection = String(row.sourceSection || "").trim();
      const typeRaw = String(row.type || "string");
      const type: PrivateFieldType = typeRaw === "number" || typeRaw === "boolean" || typeRaw === "array" ? typeRaw : "string";
      const value = row.value;
      if (!section || !label) return null;
      return {
        section,
        label,
        subField: subField || undefined,
        value: value as PrivateFieldEntry["value"],
        type,
        sourceSection: sourceSection || undefined,
      } as PrivateFieldEntry;
    })
    .filter(Boolean) as PrivateFieldEntry[];
}

function parseKvNumber(value: string): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  value.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const [k, v] = item.split(":");
    const key = String(k || "").trim();
    const raw = String(v || "").trim();
    if (!key || !raw) return;
    const n = Number(raw);
    out[key] = Number.isFinite(n) ? n : raw;
  });
  return out;
}

function formatKvNumber(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}:${String(v)}`).join(", ");
}

function extractFabricationNm(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/(\d+(\.\d+)?)/);
  return match ? match[1] : "";
}

function parseTransistorCount(value: unknown): { amount: string; unit: string } {
  const raw = String(value || "").trim();
  if (!raw) return { amount: "", unit: "" };
  const match = raw.match(/^([\d.]+)\s*(million|billion|trillion)?/i);
  if (!match) return { amount: "", unit: "" };
  return {
    amount: String(match[1] || "").trim(),
    unit: String(match[2] || "").toLowerCase(),
  };
}

function parseCacheSize(value: unknown): { amount: string; unit: string } {
  const raw = String(value || "").trim();
  if (!raw) return { amount: "", unit: "" };
  const match = raw.match(/^([\d.]+)\s*(kb|mb|gb)?/i);
  if (!match) return { amount: "", unit: "" };
  return {
    amount: String(match[1] || "").trim(),
    unit: String(match[2] || "").toUpperCase(),
  };
}

function parseResolutionPixels(value: string): number | null {
  const raw = String(value || "").trim();
  const m = raw.match(/(\d{3,5})\s*[xX]\s*(\d{3,5})/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return w * h;
}

function formatDisplayModeRow(row: DisplayModeProfile): string {
  const mode = row.mode.trim();
  const resolution = row.resolution.trim();
  const rr = row.rr === "" ? "" : String(row.rr);
  if (!mode && !resolution && !rr) return "";
  if (mode && resolution && rr) return `${mode} (${resolution}): ${rr}Hz`;
  if (mode && resolution) return `${mode} (${resolution})`;
  if (mode && rr) return `${mode}: ${rr}Hz`;
  return mode || resolution || (rr ? `${rr}Hz` : "");
}

function parseDisplayModeString(value: string, idx: number): DisplayModeProfile {
  const raw = String(value || "").trim();
  const full = raw.match(/^(.+?)\s*\((.+?)\)\s*:\s*(\d+)\s*Hz$/i);
  if (full) {
    return { id: `d${idx + 1}`, mode: full[1].trim(), resolution: full[2].trim(), rr: Number(full[3]) };
  }
  const resolutionAndRr = raw.match(/^(\d{3,5}\s*[xX*]\s*\d{3,5})\s*:\s*(\d+)\s*Hz$/i);
  if (resolutionAndRr) {
    return { id: `d${idx + 1}`, mode: "", resolution: resolutionAndRr[1].trim(), rr: Number(resolutionAndRr[2]) };
  }
  const modeAndRr = raw.match(/^(.+?)\s*:\s*(\d+)\s*Hz$/i);
  if (modeAndRr) {
    return { id: `d${idx + 1}`, mode: modeAndRr[1].trim(), resolution: "", rr: Number(modeAndRr[2]) };
  }
  const oldAt = raw.match(/^(.+?)@(\d+)\s*Hz$/i);
  if (oldAt) {
    return { id: `d${idx + 1}`, mode: oldAt[1].trim(), resolution: "", rr: Number(oldAt[2]) };
  }
  const resolutionOnly = raw.match(/^(\d{3,5}\s*[xX*]\s*\d{3,5})$/);
  if (resolutionOnly) {
    return { id: `d${idx + 1}`, mode: "", resolution: resolutionOnly[1].trim(), rr: "" };
  }
  return { id: `d${idx + 1}`, mode: raw, resolution: "", rr: "" };
}

function parseBulkCsv(raw: string): BulkRow[] {
  const text = String(raw || "").trim();
  if (!text) return [];
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return [];
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const pathIndex = header.indexOf("path");
  const keyIndex = header.indexOf("key");
  const valueIndex = header.indexOf("value");
  const typeIndex = header.indexOf("type");
  const hasHeader = valueIndex >= 0 && (pathIndex >= 0 || keyIndex >= 0);
  const start = hasHeader ? 1 : 0;
  const pickPathIndex = pathIndex >= 0 ? pathIndex : (keyIndex >= 0 ? keyIndex : 0);
  return rows.slice(start).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const path = cols[pickPathIndex] || "";
    const value = cols[valueIndex >= 0 ? valueIndex : 1] || "";
    const type = typeIndex >= 0 ? cols[typeIndex] : "";
    return { path, value, type };
  }).filter((row) => row.path);
}

function applyBulkRows(
  rows: BulkRow[],
  mode: "insert" | "apply",
  current: Record<string, unknown>
): { detail: Record<string, unknown>; warnings: string[] } {
  const warnings: string[] = [];
  let nextDetail = { ...current };
  const isFilled = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return true;
    if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
  };

  rows.forEach((row) => {
    const path = String(row.path || "").trim();
    if (!path) return;
    const normalizedPath = path.startsWith("detail.") ? path.slice(7) : path;
    const allowed = BULK_ALLOWED_FIELDS.has(normalizedPath) || normalizedPath.startsWith("benchmarks.");
    if (!allowed) warnings.push(`Unknown field: ${normalizedPath}`);

    const currentValue = getByPath(nextDetail as Record<string, unknown>, normalizedPath);
    if (mode === "insert" && isFilled(currentValue)) return;

    const rawValue = String(row.value ?? "").trim();
    let value: unknown = rawValue;
    const type = String(row.type || "").trim().toLowerCase();
    if (type === "number") {
      const n = Number(rawValue);
      value = Number.isFinite(n) ? n : rawValue;
    } else if (type === "boolean") {
      if (/^(true|1|yes)$/i.test(rawValue)) value = true;
      else if (/^(false|0|no)$/i.test(rawValue)) value = false;
    } else if (type === "csv") {
      value = parseCsv(rawValue);
    } else if (type === "kv") {
      value = parseKvNumber(rawValue);
    } else if (normalizedPath === "memoryTypes" || normalizedPath === "storageTypes" || normalizedPath.endsWith("Features") || normalizedPath.endsWith("Modes")) {
      value = parseCsv(rawValue);
    }
    nextDetail = setByPath(nextDetail as Record<string, unknown>, normalizedPath, value);
  });

  return { detail: nextDetail as Record<string, unknown>, warnings };
}

function ramTypeRank(value: string): number {
  const t = String(value || "").toUpperCase().replace(/\s+/g, "");
  const m = t.match(/LPDDR(\d+)([A-Z]*)/);
  if (m) {
    const generation = Number(m[1] || 0);
    const suffix = String(m[2] || "");
    const boost = suffix.includes("X") ? 0.2 : suffix.includes("T") ? 0.1 : 0;
    return 1000 + generation + boost;
  }
  if (t.startsWith("DDR")) {
    const d = Number((t.match(/DDR(\d+)/)?.[1]) || 0);
    return 500 + d;
  }
  return 0;
}

function parseMaxCameraSupportNumber(value: unknown): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const match = raw.match(/([\d.]+)/);
  if (!match?.[1]) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

  function orderDetailFields(detail: Record<string, unknown>): Record<string, unknown> {
    const ordered: Record<string, unknown> = {};
    const keyOrder = [
      "seo",
      "announced",
      "manufacturer",
      "className",
      "model",
      ...DETAIL_SECTIONS.flatMap((section) => section.fields.map((field) => field.key)),
      "benchmarks",
      "adminPrivateFields",
    ];
  const seen = new Set<string>();
  keyOrder.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(detail, key)) return;
    ordered[key] = detail[key];
    seen.add(key);
  });
  Object.keys(detail).forEach((key) => {
    if (seen.has(key)) return;
    ordered[key] = detail[key];
  });
  return ordered;
}

function splitResolution(value: string): { width: string; height: string } {
  const raw = String(value || "").trim();
  if (!raw) return { width: "", height: "" };
  const normalized = raw.replace(/\s+/g, "");
  const parts = normalized.split(/[xX*]/);
  if (parts.length === 1) return { width: parts[0].replace(/[^0-9]/g, ""), height: "" };
  return {
    width: String(parts[0] || "").replace(/[^0-9]/g, ""),
    height: String(parts[1] || "").replace(/[^0-9]/g, ""),
  };
}

function setupLabelFromCount(count: number): string {
  const match = CAMERA_SETUP_OPTIONS.find((item) => item.count === count);
  return match ? match.label : "Single";
}

function setupCountFromLabel(label: string): number {
  const raw = String(label || "").trim().toLowerCase();
  if (raw === "penta") return 5;
  if (raw === "quad") return 4;
  if (raw === "triple") return 3;
  if (raw === "dual") return 2;
  return 1;
}

function sanitizeCameraLensValue(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(single|dual|triple|quad|penta)\s*camera$/i.test(raw)) return "";
  return raw;
}

function parseCameraSetupString(value: string, idx: number): CameraSetupProfile {
  const raw = String(value || "").trim();
  const simpleCamera = raw.match(/^(single|dual|triple|quad|penta)\s*camera$/i);
  if (simpleCamera) {
    const count = setupCountFromLabel(simpleCamera[1]);
    return {
      id: `csr${idx + 1}`,
      setupCount: count,
      lenses: Array.from({ length: count }, (_, i) => ({ id: `csl${idx + 1}_${i + 1}`, value: "" })),
    };
  }
  const m = raw.match(/^(single|dual|triple|quad|penta)\s*:\s*(.+)$/i);
  if (m) {
    const count = setupCountFromLabel(m[1]);
    const parts = String(m[2] || "")
      .split("+")
      .map((x) => x.trim())
      .filter(Boolean);
    const lenses = Array.from({ length: count }, (_, i) => ({ id: `csl${idx + 1}_${i + 1}`, value: sanitizeCameraLensValue(parts[i] || "") }));
    return { id: `csr${idx + 1}`, setupCount: count, lenses };
  }
  return { id: `csr${idx + 1}`, setupCount: 1, lenses: [{ id: `csl${idx + 1}_1`, value: sanitizeCameraLensValue(raw) }] };
}

function formatCameraSetupRow(row: CameraSetupProfile): string {
  const label = setupLabelFromCount(row.setupCount);
  const values = row.lenses.map((x) => x.value.trim()).filter(Boolean);
  if (!values.length) return label;
  return `${label}: ${values.join(" + ")}`;
}

function parseVideoRecordingString(value: string, idx: number): VideoRecordingProfile {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.+?)\s*@\s*(\d+)\s*fps$/i);
  if (match) return { id: `vr${idx + 1}`, mode: match[1].trim(), fps: Number(match[2]) };
  return { id: `vr${idx + 1}`, mode: raw, fps: "" };
}

function formatVideoRecordingRow(row: VideoRecordingProfile): string {
  const mode = row.mode.trim();
  const fps = row.fps === "" ? "" : String(row.fps);
  if (!mode && !fps) return "";
  if (mode && fps) return `${mode}@${fps}fps`;
  return mode || (fps ? `${fps}fps` : "");
}

function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object" || Array.isArray(acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function setByPath(source: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const nodes = path.split(".");
  const out = { ...source };
  let cursor: Record<string, unknown> = out;
  nodes.forEach((node, idx) => {
    const leaf = idx === nodes.length - 1;
    if (leaf) {
      if (value === undefined || value === null || value === "") delete cursor[node];
      else cursor[node] = value;
      return;
    }
    const existing = cursor[node];
    cursor[node] = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as Record<string, unknown>) } : {};
    cursor = cursor[node] as Record<string, unknown>;
  });
  return out;
}

function cleanObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(cleanObject).filter((item) => item !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      const cleaned = cleanObject(v);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  return value ?? undefined;
}

export default function ProcessorEditorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const existingId = String(params.get("id") || "").trim();

  const [name, setName] = useState(String(params.get("name") || ""));
  const [slugInput, setSlugInput] = useState(String(params.get("slug") || ""));
  const [vendor, setVendor] = useState(String(params.get("brand") || ""));
  const [creatorName, setCreatorName] = useState("Admin");
  const [form, setForm] = useState<ProcessorAdmin>({
    name: "",
    vendor: "",
    antutu: 0,
    detail: {},
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transistorUnitPref, setTransistorUnitPref] = useState("");
  const [l2UnitPref, setL2UnitPref] = useState("");
  const [l3UnitPref, setL3UnitPref] = useState("");
  const [ramProfiles, setRamProfiles] = useState<RamProfile[]>([{ id: "r1", type: "LPDDR5X", freq: 8533 }]);
  const [storageTypesDraft, setStorageTypesDraft] = useState<string[]>([]);
  const [selectedStorageType, setSelectedStorageType] = useState("");
  const [networkSupportDraft, setNetworkSupportDraft] = useState<string[]>([]);
  const [selectedNetworkSupport, setSelectedNetworkSupport] = useState("");
  const [navigationDraft, setNavigationDraft] = useState<string[]>([]);
  const [selectedNavigation, setSelectedNavigation] = useState("");
  const [topCollapsed, setTopCollapsed] = useState(false);
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [qualityCollapsed, setQualityCollapsed] = useState(false);
  const [seoCollapsed, setSeoCollapsed] = useState(false);
  const [topPanelTab, setTopPanelTab] = useState<"basic" | "quality">("basic");
  const [qualityBypass, setQualityBypass] = useState<Record<string, boolean>>({});
  const [cameraSetupsDraft, setCameraSetupsDraft] = useState<CameraSetupProfile[]>([
    { id: "csr1", setupCount: 1, lenses: [{ id: "csl1_1", value: "" }] },
  ]);
  const [videoRecordingDraft, setVideoRecordingDraft] = useState<VideoRecordingProfile[]>([{ id: "vr1", mode: "", fps: "" }]);
  const [videoPlaybackDraft, setVideoPlaybackDraft] = useState<VideoRecordingProfile[]>([{ id: "vp1", mode: "", fps: "" }]);
  const [displayModesDraft, setDisplayModesDraft] = useState<DisplayModeProfile[]>([{ id: "dm1", mode: "", resolution: "", rr: "" }]);
  const [outputDisplaysDraft, setOutputDisplaysDraft] = useState<DisplayModeProfile[]>([{ id: "od1", mode: "", resolution: "", rr: "" }]);
  const [csvSuggestKey, setCsvSuggestKey] = useState<string | null>(null);
  const [csvSuggestTerm, setCsvSuggestTerm] = useState("");
  const [csvSuggestOpen, setCsvSuggestOpen] = useState(false);
  const [privateFields, setPrivateFields] = useState<PrivateFieldEntry[]>([]);
  const [privateFieldDraft, setPrivateFieldDraft] = useState<PrivateFieldDraft>({ section: "", label: "", subField: "", value: "", type: "string" });
  const [privateFieldGlobalDraft, setPrivateFieldGlobalDraft] = useState<PrivateFieldSimpleDraft>({ section: "", label: "", value: "" });
  const [privateFieldInlineError, setPrivateFieldInlineError] = useState("");
  const [privateFieldGlobalError, setPrivateFieldGlobalError] = useState("");
  const [activePrivateSection, setActivePrivateSection] = useState<string | null>(null);
  const [processorDetailsCollapsed, setProcessorDetailsCollapsed] = useState(false);
  const [maxResolutionManualOverride, setMaxResolutionManualOverride] = useState(false);
  const [maxResolutionRowId, setMaxResolutionRowId] = useState("");
  const [bulkJsonInput, setBulkJsonInput] = useState("");
  const [bulkCsvInput, setBulkCsvInput] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<"single" | "bulk">("single");
  const [helperAliasVersion, setHelperAliasVersion] = useState(0);
  const topReadOnly = Boolean(existingId);
  const lastAutoCanonical = useRef<string>("");
  const lastAutoSeoTitle = useRef<string>("");
  const lastAutoSeoDescription = useRef<string>("");
  const lastAutoSeoSummary = useRef<string>("");
  const lastAutoSeoTags = useRef<string>("");
  const lastAutoSeoOgImage = useRef<string>("");
  const lastAutoSeoFocus = useRef<string>("");

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);
  const slug = useMemo(() => slugify(slugInput || suggestedSlug || name || ""), [name, slugInput, suggestedSlug]);
  const docId = existingId || slug;
  const canonicalAutoValue = useMemo(
    () => (docId ? `${PUBLIC_SITE_URL}/processors/${docId}` : ""),
    [docId]
  );
  const autoTitle = useMemo(() => {
    const base = String(name || "").trim();
    if (!base) return "";
    return `${base} - Processor Specs`;
  }, [name]);
  const autoSummary = useMemo(() => {
    const base = String(name || "").trim();
    if (!base) return "";
    const vendorName = vendor ? `${vendor} ` : "";
    return `${vendorName}${base} specs, benchmarks, GPU, camera, and connectivity summary.`;
  }, [name, vendor]);
  const autoTags = useMemo(() => {
    const tags = new Set<string>();
    if (vendor) tags.add(vendor);
    const brandHints = BRAND_TITLE_HINTS[vendor] || [];
    const lower = String(name || "").toLowerCase();
    brandHints.forEach((hint) => {
      if (lower.includes(hint.toLowerCase())) tags.add(hint);
    });
    if (String(getDetailField("className") || "").trim()) tags.add(String(getDetailField("className") || "").trim());
    return Array.from(tags).filter(Boolean);
  }, [name, vendor, form.detail]);
  const autoOgImage = useMemo(() => {
    const base = String(name || "").trim();
    if (!base) return "";
    return `${PUBLIC_SITE_URL}/api/og/processor?title=${encodeURIComponent(base)}`;
  }, [name]);
  const autoFocusKeyword = useMemo(() => {
    const parts: string[] = [];
    const base = String(name || "").trim();
    if (base) parts.push(base);
    const gpuName = String(getDetailField("gpuName") || "").trim();
    if (gpuName) parts.push(gpuName);
    const coreCount = String(getDetailField("coreCount") || "").trim();
    if (coreCount) parts.push(`${coreCount} cores`);
    const fabrication = String(getDetailField("process") || "").trim();
    if (fabrication) parts.push(`${fabrication} fabrication`);
    const memoryType = String(getDetailField("memoryType") || "").trim();
    const memoryTypes = (getDetailField("memoryTypes") as string[] | undefined) || [];
    const ram = memoryType || memoryTypes.find((item) => String(item).trim());
    if (ram) parts.push(`${ram} RAM`);
    return Array.from(new Set(parts.map((item) => item.trim()).filter(Boolean))).join(", ");
  }, [name, form.detail]);
  const titleSuggestions = useMemo(() => {
    const hints = BRAND_TITLE_HINTS[vendor] || [];
    if (!vendor || hints.length === 0) return [];
    const raw = name.trim();
    const afterBrand = raw.toLowerCase().startsWith(vendor.toLowerCase()) ? raw.slice(vendor.length).trim() : raw;
    if (!afterBrand) return hints;
    return hints.filter((item) => item.toLowerCase().startsWith(afterBrand.toLowerCase()));
  }, [name, vendor]);
  const isUpcoming = String(getDetailField("announced") || "").toLowerCase() === "upcoming";
  const antutuTotal = (getDetailField("benchmarks.antutu") ?? form.antutu) as number | string | undefined;
  const coreConfigurationRaw = String(getDetailField("coreConfiguration") || "").trim();
  const processNm = extractFabricationNm(getDetailField("process"));
  const tdpValue = String(getDetailField("tdpW") ?? "");
  const transistorRaw = String(getDetailField("transistorCount") || "");
  const transistor = parseTransistorCount(transistorRaw);
  const l2Cache = parseCacheSize(getDetailField("l2Cache"));
  const l3Cache = parseCacheSize(getDetailField("l3Cache"));
  const appliedRamSummary = (() => {
    const types = (getDetailField("memoryTypes") as string[] | undefined) || [];
    const freqMap = (getDetailField("memoryFreqByType") as Record<string, number | string> | undefined) || {};
    const fallbackType = String(getDetailField("memoryType") || "").trim();
    const list = types.length ? types : (fallbackType ? [fallbackType] : []);
    if (!list.length) return "";
    return list
      .map((type) => {
        const raw = freqMap[type];
        const n = raw === undefined ? NaN : Number(raw);
        return Number.isFinite(n) ? `${type}: ${n}MHz` : type;
      })
      .join(", ");
  })();
  const appliedDisplayModesSummary = (() => {
    const modes = (getDetailField("displayModes") as string[] | undefined) || [];
    return modes.map((item) => String(item).trim()).filter(Boolean).join(", ");
  })();
  const appliedOutputDisplaySummary = (() => {
    const raw = String(getDetailField("outputDisplay") || "").trim();
    return raw;
  })();
  const appliedCameraSetupSummary = (() => {
    const modes = (getDetailField("cameraSupportModes") as string[] | undefined) || [];
    return modes.map((item) => String(item).trim()).filter(Boolean).join(", ");
  })();
  const appliedVideoRecordingSummary = (() => {
    const modes = (getDetailField("videoRecordingModes") as string[] | undefined) || [];
    return modes.map((item) => String(item).trim()).filter(Boolean).join(", ");
  })();
  const appliedVideoPlaybackSummary = (() => String(getDetailField("videoPlayback") || "").trim())();
  const csvSuggestionPool = useMemo(() => {
    const out = new Set<string>();
    HELPER_SUGGESTIONS.forEach((item) => {
      const trimmed = String(item || "").trim();
      if (!trimmed) return;
      const parts = parseCsv(trimmed);
      if (parts.length <= 1) {
        out.add(trimmed);
        return;
      }
      parts.forEach((part) => {
        if (part) out.add(part);
      });
      out.add(trimmed);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [helperAliasVersion]);
  const helperSectionSuggestions = useMemo(() => {
    return HELPER_SUGGESTIONS_BY_SECTION;
  }, [helperAliasVersion]);
  const csvSuggestions = useMemo(() => {
    const term = csvSuggestTerm.trim().toLowerCase();
    if (!csvSuggestOpen || !term) return [];
    return csvSuggestionPool.filter((item) => item.toLowerCase().startsWith(term)).slice(0, 8);
  }, [csvSuggestTerm, csvSuggestOpen, csvSuggestionPool]);

  const renderCsvInput = (fieldKey: string, placeholder?: string) => {
    const currentValue = csvInputValue(getDetailField(fieldKey));
    return (
      <div className="relative">
        <input
          value={currentValue}
          onChange={(e) => {
            const next = e.target.value;
            setDetailField(fieldKey, next);
            setCsvSuggestKey(fieldKey);
            setCsvSuggestTerm(getLastCsvToken(next));
            setCsvSuggestOpen(true);
          }}
          onFocus={() => {
            setCsvSuggestKey(fieldKey);
            setCsvSuggestTerm(getLastCsvToken(currentValue));
            setCsvSuggestOpen(true);
          }}
          onBlur={() => setTimeout(() => setCsvSuggestOpen(false), 120)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
        {csvSuggestOpen && csvSuggestKey === fieldKey && csvSuggestions.length > 0 ? (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {csvSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const next = replaceLastCsvToken(currentValue, item);
                  setDetailField(fieldKey, next);
                  setCsvSuggestTerm("");
                  setCsvSuggestOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-700 last:border-b-0 hover:bg-blue-50"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };
  const currentCanonical = useMemo(() => String(getDetailField("seo.canonicalUrl") || "").trim(), [form.detail]);
  const currentSeoTitle = useMemo(() => String(getDetailField("seo.metaTitle") || "").trim(), [form.detail]);
  const currentSeoDescription = useMemo(() => String(getDetailField("seo.metaDescription") || "").trim(), [form.detail]);
  const currentSeoSummary = useMemo(() => String(getDetailField("seo.summary") || "").trim(), [form.detail]);
  const currentSeoFocus = useMemo(() => String(getDetailField("seo.focusKeyword") || "").trim(), [form.detail]);
  const currentSeoTags = useMemo(() => getDetailField("seo.tags"), [form.detail]);
  const currentSeoTagsKey = useMemo(() => {
    const tags = Array.isArray(currentSeoTags) ? currentSeoTags : parseCsv(String(currentSeoTags || ""));
    return tags.map((t) => String(t).trim()).filter(Boolean).join("|");
  }, [currentSeoTags]);
  const autoTagsKey = useMemo(() => autoTags.join("|"), [autoTags]);
  const currentOgImage = useMemo(() => String(getDetailField("seo.ogImage") || "").trim(), [form.detail]);
  const normalizationPreview = useMemo(() => {
    const detail = (form.detail || {}) as Record<string, unknown>;
    const rows: string[] = [];
    Object.entries(detail).forEach(([key, raw]) => {
      const label = DETAIL_FIELD_LABELS[key] || key;
      if (typeof raw === "string") {
        if (CSV_TEXT_FIELDS.includes(key)) {
          const fixes = parseCsv(raw)
            .map((item) => {
              const to = getAliasCorrection(item);
              return to ? `${item.trim()} -> ${to}` : "";
            })
            .filter(Boolean);
          if (fixes.length) rows.push(`${label}: ${fixes.join(", ")}`);
          return;
        }
        const to = getAliasCorrection(raw);
        if (to) rows.push(`${label}: ${raw.trim()} -> ${to}`);
        return;
      }
      if (Array.isArray(raw)) {
        const fixes = raw
          .map((item) => String(item))
          .map((item) => {
            const to = getAliasCorrection(item);
            return to ? `${item.trim()} -> ${to}` : "";
          })
          .filter(Boolean);
        if (fixes.length) rows.push(`${label}: ${fixes.join(", ")}`);
      }
    });
    return rows;
  }, [form.detail, helperAliasVersion]);

  useEffect(() => {
    let active = true;
    async function loadHelperAliases() {
      try {
        const response = await fetch("/api/admin/helper-terms?scope=processor", { cache: "no-store" });
        if (!response.ok) return;
        const json = (await response.json()) as { items?: { name: string; aliases?: string[]; status?: string; section?: string }[] };
        if (!active) return;
        const map: Record<string, string> = {};
        const suggestions = new Set<string>();
        const sectionMap: Record<string, Set<string>> = {};
        (json.items || []).forEach((item) => {
          if (item.status && item.status !== "approved") return;
          const canonical = String(item.name || "").trim();
          if (!canonical) return;
          suggestions.add(canonical);
          const sectionKey = normalizeSectionKey(item.section || "");
          if (sectionKey) {
            const bucket = sectionMap[sectionKey] || new Set<string>();
            bucket.add(canonical);
            sectionMap[sectionKey] = bucket;
          }
          const all = [canonical, ...(item.aliases || [])];
          all.forEach((alias) => {
            const key = normalizeLookupKey(alias);
            if (key) map[key] = canonical;
          });
        });
        setHelperAliasMap(map);
        setHelperSuggestions(Array.from(suggestions).sort((a, b) => a.localeCompare(b)));
        const sectionSuggestions = Object.fromEntries(
          Object.entries(sectionMap).map(([key, set]) => [key, Array.from(set).sort((a, b) => a.localeCompare(b))])
        );
        setHelperSectionSuggestions(sectionSuggestions);
        setHelperAliasVersion((v) => v + 1);
      } catch {
        // ignore
      }
    }
    loadHelperAliases().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canonicalAutoValue) return;
    if (!currentCanonical || currentCanonical === lastAutoCanonical.current) {
      setDetailField("seo.canonicalUrl", canonicalAutoValue);
      lastAutoCanonical.current = canonicalAutoValue;
    }
  }, [canonicalAutoValue, currentCanonical]);

  useEffect(() => {
    if (autoTitle) {
      if (!currentSeoTitle || currentSeoTitle === lastAutoSeoTitle.current) {
        setDetailField("seo.metaTitle", autoTitle);
        lastAutoSeoTitle.current = autoTitle;
      } else if (currentSeoTitle === autoTitle) {
        lastAutoSeoTitle.current = autoTitle;
      }
    }
    if (autoSummary) {
      if (!currentSeoSummary || currentSeoSummary === lastAutoSeoSummary.current) {
        setDetailField("seo.summary", autoSummary);
        lastAutoSeoSummary.current = autoSummary;
      } else if (currentSeoSummary === autoSummary) {
        lastAutoSeoSummary.current = autoSummary;
      }
    }
    if (autoSummary) {
      if (!currentSeoDescription || currentSeoDescription === lastAutoSeoDescription.current) {
        setDetailField("seo.metaDescription", autoSummary);
        lastAutoSeoDescription.current = autoSummary;
      } else if (currentSeoDescription === autoSummary) {
        lastAutoSeoDescription.current = autoSummary;
      }
    }
    if (autoOgImage) {
      if (!currentOgImage || currentOgImage === lastAutoSeoOgImage.current) {
        setDetailField("seo.ogImage", autoOgImage);
        lastAutoSeoOgImage.current = autoOgImage;
      } else if (currentOgImage === autoOgImage) {
        lastAutoSeoOgImage.current = autoOgImage;
      }
    }
    if (autoTags.length) {
      if (!currentSeoTagsKey || currentSeoTagsKey === lastAutoSeoTags.current) {
        setDetailField("seo.tags", autoTags);
        lastAutoSeoTags.current = autoTagsKey;
      } else if (currentSeoTagsKey === autoTagsKey) {
        lastAutoSeoTags.current = autoTagsKey;
      }
    }
    if (autoFocusKeyword) {
      if (!currentSeoFocus || currentSeoFocus === lastAutoSeoFocus.current) {
        setDetailField("seo.focusKeyword", autoFocusKeyword);
        lastAutoSeoFocus.current = autoFocusKeyword;
      } else if (currentSeoFocus === autoFocusKeyword) {
        lastAutoSeoFocus.current = autoFocusKeyword;
      }
    }
  }, [
    autoTitle,
    autoSummary,
    autoOgImage,
    autoTagsKey,
    autoFocusKeyword,
    currentSeoTitle,
    currentSeoDescription,
    currentSeoSummary,
    currentOgImage,
    currentSeoTagsKey,
    currentSeoFocus,
  ]);

  const missingFields = useMemo(() => {
    const detail = (form.detail || {}) as Record<string, unknown>;
    return QUALITY_FIELDS.filter((field) => isEmptyValue(getByPath(detail, field.path)));
  }, [form.detail]);
  const missingBySection = useMemo(() => {
    const map = new Map<string, { label: string; fields: typeof QUALITY_FIELDS }>();
    const labelFromSectionId = (id: string) =>
      id
        .replace(/^detail-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    missingFields.forEach((field) => {
      const entry = map.get(field.sectionId) || { label: labelFromSectionId(field.sectionId), fields: [] };
      entry.fields.push(field);
      map.set(field.sectionId, entry);
    });
    return Array.from(map.entries()).map(([sectionId, entry]) => ({
      sectionId,
      label: entry.label,
      fields: entry.fields,
      count: entry.fields.length,
    }));
  }, [missingFields]);
  const missingCount = missingFields.length;
  const [cpuClusters, setCpuClusters] = useState<CpuCluster[]>([
    { id: "c1", count: 1, core: "Arm Cortex-X4", ghz: 3.2, isMax: true },
  ]);

  useEffect(() => {
    fetch("/api/admin/profile", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        const v = json?.viewer;
        setCreatorName(String(v?.name || v?.email || v?.uid || "Admin"));
      })
      .catch(() => setCreatorName("Admin"));
  }, []);

  useEffect(() => {
    if (!existingId) {
      setForm((prev) => ({ ...prev, name, vendor: vendor || prev.vendor || "Qualcomm" }));
      return;
    }
    fetch(`/api/processors/${encodeURIComponent(existingId)}`, { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        const item = json?.item as ProcessorAdmin | undefined;
        if (!item) return;
        setName(item.name || "");
        setSlugInput(item.id || "");
        setVendor(item.vendor || "");
        setForm({
          ...item,
          detail: item.detail || {},
          status: item.status || "draft",
        });
      })
      .catch(() => undefined);
  }, [existingId, name, vendor]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, name, vendor }));
  }, [name, vendor]);

  useEffect(() => {
    const config = coreConfigurationRaw;
    if (!config) return;
    const parsed = config
      .split(",")
      .map((chunk, idx) => {
        const match = chunk.trim().match(/^(\d+)x\s+(.+?)\s*@\s*([\d.]+)\s*ghz$/i);
        if (!match) return null;
        return {
          id: `p${idx + 1}`,
          count: Number(match[1]) || 1,
          core: String(match[2] || "").trim(),
          ghz: Number(match[3]) || 1,
          isMax: idx === 0,
        } as CpuCluster;
      })
      .filter(Boolean) as CpuCluster[];
    if (parsed.length > 0) setCpuClusters(parsed);
  }, [coreConfigurationRaw]);

  useEffect(() => {
    const types = (getDetailField("memoryTypes") as string[] | undefined) || [];
    const freqMap = (getDetailField("memoryFreqByType") as Record<string, number | string> | undefined) || {};
    const fallbackType = String(getDetailField("memoryType") || "").trim();
    const fallbackFreq = getDetailField("memoryFreqMhz");
    const sourceTypes = types.length ? types : (fallbackType ? [fallbackType] : []);
    const nextRows: RamProfile[] = sourceTypes.map((type, idx) => {
      const mapped = freqMap[type];
      const mappedNumber = mapped === undefined ? undefined : Number(mapped);
      const firstFallback = idx === 0 && fallbackFreq !== undefined ? Number(fallbackFreq) : undefined;
      let freq: number | "" = "";
      if (mappedNumber !== undefined && Number.isFinite(mappedNumber)) freq = mappedNumber;
      else if (firstFallback !== undefined && Number.isFinite(firstFallback)) freq = firstFallback;
      return {
        id: `m${idx + 1}`,
        type,
        freq,
      };
    });
    if (!nextRows.length) return;
    const currentSig = JSON.stringify(ramProfiles.map((row) => ({ type: row.type, freq: row.freq })));
    const nextSig = JSON.stringify(nextRows.map((row) => ({ type: row.type, freq: row.freq })));
    if (currentSig !== nextSig) setRamProfiles(nextRows);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (getDetailField("storageTypes") as string[] | undefined) || [];
    const fallback = String(getDetailField("storageType") || "").trim();
    const next = values.length ? values : (fallback ? [fallback] : []);
    const currentSig = JSON.stringify(storageTypesDraft);
    const nextSig = JSON.stringify(next);
    if (currentSig !== nextSig) setStorageTypesDraft(next);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (getDetailField("networkSupport") as string[] | undefined) || [];
    const currentSig = JSON.stringify(networkSupportDraft);
    const nextSig = JSON.stringify(values);
    if (currentSig !== nextSig) setNetworkSupportDraft(values);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (getDetailField("navigation") as string[] | undefined) || [];
    const currentSig = JSON.stringify(navigationDraft);
    const nextSig = JSON.stringify(values);
    if (currentSig !== nextSig) setNavigationDraft(values);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (getDetailField("cameraSupportModes") as string[] | undefined) || [];
    const next = values.length ? values.map((value, idx) => parseCameraSetupString(value, idx)) : [{ id: "csr1", setupCount: 1, lenses: [{ id: "csl1_1", value: "" }] }];
    const currentSig = JSON.stringify(cameraSetupsDraft.map((row) => formatCameraSetupRow(row)));
    const nextSig = JSON.stringify(next.map((row) => formatCameraSetupRow(row)));
    if (currentSig !== nextSig) setCameraSetupsDraft(next);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (getDetailField("videoRecordingModes") as string[] | undefined) || [];
    const parsed: VideoRecordingProfile[] = values.length ? values.map((value, idx) => parseVideoRecordingString(value, idx)) : [{ id: "vr1", mode: "", fps: "" }];
    const currentSig = JSON.stringify(videoRecordingDraft.map((row) => formatVideoRecordingRow(row)));
    const nextSig = JSON.stringify(parsed.map((row) => formatVideoRecordingRow(row)));
    if (currentSig !== nextSig) setVideoRecordingDraft(parsed);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const raw = String(getDetailField("videoPlayback") || "").trim();
    const parts = raw ? raw.split(",").map((v) => v.trim()).filter(Boolean) : [];
    const parsed: VideoRecordingProfile[] = parts.length ? parts.map((value, idx) => parseVideoRecordingString(value, idx)) : [{ id: "vp1", mode: "", fps: "" }];
    const currentSig = JSON.stringify(videoPlaybackDraft.map((row) => formatVideoRecordingRow(row)));
    const nextSig = JSON.stringify(parsed.map((row) => formatVideoRecordingRow(row)));
    if (currentSig !== nextSig) setVideoPlaybackDraft(parsed);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const values = (form.detail?.displayModes as string[] | undefined) || [];
    if (!values.length) return;
    const next = values.map((item, idx) => parseDisplayModeString(item, idx));
    const currentSig = JSON.stringify(displayModesDraft.map((row) => formatDisplayModeRow(row)));
    const nextSig = JSON.stringify(next.map((row) => formatDisplayModeRow(row)));
    if (currentSig !== nextSig) setDisplayModesDraft(next);
  }, [form.detail?.displayModes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const raw = String(form.detail?.outputDisplay || "").trim();
    if (!raw) return;
    const parts = raw.split(",").map((v) => v.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = parts.map((item, idx) => parseDisplayModeString(item, idx));
    const currentSig = JSON.stringify(outputDisplaysDraft.map((row) => formatDisplayModeRow(row)));
    const nextSig = JSON.stringify(next.map((row) => formatDisplayModeRow(row)));
    if (currentSig !== nextSig) setOutputDisplaysDraft(next);
  }, [form.detail?.outputDisplay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next = readPrivateFields(getDetailField("adminPrivateFields"));
    const currentSig = JSON.stringify(privateFields);
    const nextSig = JSON.stringify(next);
    if (currentSig !== nextSig) setPrivateFields(next);
  }, [form.detail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!privateFields.length) return;
    let updated = false;
    const next = privateFields.map((item) => {
      if (item.sourceSection) return item;
      const resolved = resolvePrivateSourceSection(item.section);
      if (!resolved) return item;
      updated = true;
      return { ...item, sourceSection: resolved };
    });
    if (updated) {
      setPrivateFields(next);
      setDetailField("adminPrivateFields", next);
    }
  }, [privateFields]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bulkMode !== "bulk") return;
    const detail = form.detail || {};
    const ordered = orderDetailFields(detail);
    setBulkJsonInput(JSON.stringify(ordered, null, 2));
    const csvRows: string[] = ["path,value,type"];
    const addRow = (path: string, value: unknown) => {
      if (value === undefined || value === null) return;
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
          addRow(path ? `${path}.${k}` : k, v);
        });
        return;
      }
      const type = Array.isArray(value) ? "csv" : typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text";
      const valStr = Array.isArray(value) ? value.join('|') : String(value);
      csvRows.push(`${path},${valStr.includes(',') ? `"${valStr}"` : valStr},${type}`);
    };
    Object.entries(ordered).forEach(([key, value]) => addRow(key, value));
    setBulkCsvInput(csvRows.join("\n"));
  }, [form.detail, bulkMode]);

  useEffect(() => {
    const allRows = [...displayModesDraft, ...outputDisplaysDraft];
    const selected = displayModesDraft.find((row) => row.id === maxResolutionRowId);
    const selectedResolution = selected?.resolution?.trim() || "";
    const best = allRows.reduce<{ pixels: number; resolution: string } | null>((acc, row) => {
      const px = parseResolutionPixels(row.resolution);
      if (!px) return acc;
      if (!acc || px > acc.pixels) return { pixels: px, resolution: row.resolution.trim() };
      return acc;
    }, null);
    if (!maxResolutionManualOverride) {
      if (selectedResolution) {
        setDetailField("maxDisplayResolution", selectedResolution);
      } else if (best?.resolution) {
        setDetailField("maxDisplayResolution", best.resolution);
      }
    }
  }, [displayModesDraft, outputDisplaysDraft, maxResolutionManualOverride, maxResolutionRowId]);

  function setField<K extends keyof ProcessorAdmin>(key: K, value: ProcessorAdmin[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setDetailField(path: string, value: unknown) {
    setForm((prev) => {
      const current = (prev.detail || {}) as Record<string, unknown>;
      return { ...prev, detail: setByPath(current, path, value) as ProcessorDetail };
    });
  }

  function getDetailField(path: string): unknown {
    return getByPath((form.detail || {}) as Record<string, unknown>, path);
  }

  function applyCpuClusters(next: CpuCluster[]) {
    const cleaned = next
      .map((row) => ({
        ...row,
        count: Math.max(1, Number(row.count) || 1),
        ghz: Math.max(0.1, Number(row.ghz) || 0.1),
        core: row.core.trim(),
      }))
      .filter((row) => row.core);
    if (cleaned.length === 0) return;
    setCpuClusters(cleaned);
    const config = cleaned.map((row) => `${row.count}x ${row.core} @ ${row.ghz}GHz`).join(", ");
    const total = cleaned.reduce((sum, row) => sum + row.count, 0);
    const selected = cleaned.find((row) => row.isMax);
    const maxGhz = selected ? selected.ghz : Math.max(...cleaned.map((row) => row.ghz));
    setDetailField("coreConfiguration", config);
    setDetailField("coreCount", total);
    setField("maxCpuGhz", maxGhz);
  }


  function applyRamProfiles(next: RamProfile[]) {
    const cleaned = next
      .map((row) => ({ ...row, type: row.type.trim() }))
      .filter((row) => row.type);
    const deduped = cleaned.filter((row, idx) => cleaned.findIndex((x) => x.type.toLowerCase() === row.type.toLowerCase()) === idx);
    if (cleaned.length === 0) {
      setRamProfiles([{ id: `r${Date.now()}`, type: "", freq: "" }]);
      setForm((prev) => {
        const current = (prev.detail || {}) as Record<string, unknown>;
        let nextDetail = setByPath(current, "memoryTypes", []);
        nextDetail = setByPath(nextDetail, "memoryFreqByType", {});
        nextDetail = setByPath(nextDetail, "memoryType", "");
        nextDetail = setByPath(nextDetail, "memoryFreqMhz", undefined);
        return { ...prev, detail: nextDetail as ProcessorDetail };
      });
      setMessage("RAM types cleared from form.");
      return;
    }
    setRamProfiles(deduped);
    const memoryTypes = deduped.map((row) => row.type);
    const memoryFreqByType: Record<string, number> = {};
    deduped.forEach((row) => {
      if (row.freq !== "" && Number.isFinite(Number(row.freq))) memoryFreqByType[row.type] = Number(row.freq);
    });
    const bestRam = [...deduped].sort((a, b) => {
      const rankDiff = ramTypeRank(b.type) - ramTypeRank(a.type);
      if (rankDiff !== 0) return rankDiff;
      const freqA = a.freq === "" ? -1 : Number(a.freq);
      const freqB = b.freq === "" ? -1 : Number(b.freq);
      return freqB - freqA;
    })[0];
    const bestFreq = bestRam?.freq;
    setForm((prev) => {
      const current = (prev.detail || {}) as Record<string, unknown>;
      let nextDetail = setByPath(current, "memoryTypes", memoryTypes);
      nextDetail = setByPath(nextDetail, "memoryFreqByType", memoryFreqByType);
      nextDetail = setByPath(nextDetail, "memoryType", bestRam?.type || memoryTypes[0] || "");
      nextDetail = setByPath(nextDetail, "memoryFreqMhz", bestFreq === "" || bestFreq === undefined ? undefined : Number(bestFreq));
      return { ...prev, detail: nextDetail as ProcessorDetail };
    });
    setMessage("RAM types applied to form. Click Save to store in database.");
  }

  function applyDisplayModes(next: DisplayModeProfile[]) {
    const formatted = next.map(formatDisplayModeRow).map((v) => v.trim()).filter(Boolean);
    setDisplayModesDraft(next);
    setDetailField("displayModes", formatted);
    const maxRr = next.reduce<number | undefined>((acc, row) => {
      const n = row.rr === "" ? NaN : Number(row.rr);
      if (!Number.isFinite(n)) return acc;
      return acc === undefined ? n : Math.max(acc, n);
    }, undefined);
    setDetailField("maxRefreshRateHz", maxRr);
  }

  function applyOutputDisplays(next: DisplayModeProfile[]) {
    const formatted = next.map(formatDisplayModeRow).map((v) => v.trim()).filter(Boolean);
    setOutputDisplaysDraft(next);
    setDetailField("outputDisplay", formatted.join(", "));
  }

  function downloadTemplate(kind: "json" | "csv") {
    const filename = kind === "json" ? "processor-detail-template.json" : "processor-detail-template.csv";
    const content =
      kind === "json"
          ? JSON.stringify({
            seo: {
              metaTitle: "MediaTek Dimensity 9990 - Full Specs",
              metaDescription: "MediaTek Dimensity 9990 specs, benchmarks, GPU, camera, and connectivity.",
              canonicalUrl: "https://example.com/processors/mediatek-dimensity-9990",
              summary: "Flagship 3nm chipset with next-gen GPU and AI.",
              focusKeyword: "MediaTek Dimensity 9990",
              tags: ["flagship", "mediatek", "3nm"],
              ogImage: "https://example.com/og/mediatek-dimensity-9990.jpg",
              noIndex: false,
            },
            announced: "2026-03-10",
            manufacturer: "TSMC",
            className: "Flagship",
            model: "SM-1234",
          coreCount: 8,
          coreConfiguration: "1x Arm Cortex-X4 @ 3.2GHz, 3x Arm Cortex-A720 @ 2.8GHz, 4x Arm Cortex-A520 @ 2.0GHz",
          cores: "1+3+4",
          instructionSet: "ARMv9.2-A /* ARMv9-A | ARMv8.2-A */",
          architectureBits: "64bit /* 32bit */",
          process: "3nm",
          transistorCount: "17.5 billion",
          l2Cache: "2MB",
          l3Cache: "6MB",
          cpuFeatures: ["AV1 decode /* SMT | HDR processing */", "SMT", "HDR processing", "AI acceleration"],
          tdpW: 6,
          gpuName: "Adreno 750",
          gpuArchitecture: "Adreno",
          pipelines: 6,
          gpuFrequencyMhz: 900,
          gpuApis: ["Vulkan /* OpenGL | DirectX */", "OpenGL", "DirectX"],
          gpuFlops: "5.6 TFLOPS",
          gpuFeatures: ["Ray tracing /* Variable Rate Shading | HDR rendering */", "Variable Rate Shading", "HDR rendering"],
          aiEngine: "Hexagon NPU",
          aiPerformanceTops: 45,
          aiPrecision: "INT8/FP16 /* INT4 | FP32 */",
          aiFeatures: ["INT8 /* FP16 | INT4 */", "FP16", "INT4"],
          memoryType: "LPDDR6 /* LPDDR5X | LPDDR6X */",
          memoryTypes: ["LPDDR5X /* LPDDR6 | LPDDR6X */", "LPDDR6", "LPDDR6X"],
          memoryFreqMhz: 8533,
          memoryFreqByType: { LPDDR5X: 8533, LPDDR6: 9999, LPDDR6X: 10667 },
          memoryChannels: "Quad-channel /* Single-channel | Dual-channel */",
          storageChannels: "2-lane /* Dual channel | 4-lane | 4 channel */",
          memoryBusWidthBits: 256,
          maxMemoryGb: 32,
          storageType: "NVMe /* UFS 4.0 | UFS 4.1 */",
          storageTypes: ["UFS 4.0 /* UFS 4.1 | NVMe */", "UFS 4.1", "NVMe"],
          bandwidthGbps: 58.3,
          cameraIsp: "Imagiq 890",
          maxCameraSupport: 240,
          cameraSupportModes: ["240", "200 + 50", "64 + 32 + 12", "32 + 32 + 32 + 32"],
          cameraFeatures: ["HDR /* AI | Night mode */", "AI", "Night mode", "Multi-frame"],
          maxVideoCapture: "8K@30fps",
          videoCapture: "4K@120fps",
          videoRecordingModes: ["8K@30fps", "4K@120fps", "4K@60fps", "FHD+@240fps", "FHD@120fps"],
          videoRecordingCodecs: ["H.264 /* H.265/HEVC | AV1 */", "H.265/HEVC", "AV1"],
          videoFeatures: ["HDR10 /* EIS | 10-bit */", "EIS", "10-bit"],
          videoPlayback: "8K@60fps,4K@240fps,4K@120fps",
          videoPlaybackCodecs: ["H.264 /* H.265/HEVC | AV1 */", "H.265/HEVC", "AV1"],
          maxDisplayResolution: "3200x1440",
          maxRefreshRateHz: 144,
          displayModes: ["QHD+ (2960x3160):120Hz", "FHD+ (2160x1080):240Hz", "HD+ (1650x720):180Hz"],
          outputDisplay: "4K (2400x2160):60Hz, FHD+ (2060x1080):120Hz, FHD (1920x1080):120Hz",
          displayFeatures: ["HDR10+ /* Dolby Vision | DC dimming */", "Dolby Vision", "DC dimming"],
          audioCodecs: ["HEVC /* AAC | FLAC */", "ALC", "AAC", "FLAC"],
          multimediaFeatures: ["Dolby Vision /* Dolby Atmos */", "Dolby Atmos"],
          modem: "Snapdragon X75",
          networkSupport: ["5G /* 4G | 3G | 2G */", "4G", "3G", "2G"],
          dual5g: true,
          downloadMbps: 10000,
          uploadMbps: 3000,
          wifi: "Wi-Fi 7 /* Wi-Fi 6E | Wi-Fi 6 */",
          bluetooth: "5.4 /* 5.3 | 5.2 */",
          bluetoothFeatures: ["LE Audio /* aptX | LDAC */", "aptX", "LDAC"],
          navigation: ["GPS /* GLONASS | Galileo */", "GLONASS", "Galileo", "BeiDou"],
          quickCharging: "Quick Charge 5 /* USB PD 3.1 | SuperVOOC */",
          chargingSpeed: "120W",
          sourceUrl: "https://example.com",
          benchmarks: {
            antutuVersion: "v10",
            antutu: 2200000,
            antutuCpu: 520000,
            antutuGpu: 780000,
            antutuMemory: 420000,
            antutuUx: 380000,
            geekbenchVersion: "6",
            geekbenchSingle: 2200,
            geekbenchMulti: 7200,
            threeDMarkName: "Wild Life Extreme",
            threeDMark: 11800,
          },
        }, null, 2)
          : [
            "path,value,type",
            "seo.metaTitle,MediaTek Dimensity 9990 - Full Specs,text",
            "seo.metaDescription,MediaTek Dimensity 9990 specs, benchmarks, GPU, camera, and connectivity.,text",
            "seo.canonicalUrl,https://example.com/processors/mediatek-dimensity-9990,text",
            "seo.summary,Flagship 3nm chipset with next-gen GPU and AI.,text",
            "seo.focusKeyword,MediaTek Dimensity 9990,text",
            "seo.tags,flagship|mediatek|3nm,csv",
            "seo.ogImage,https://example.com/og/mediatek-dimensity-9990.jpg,text",
            "seo.noIndex,false,boolean",
            "announced,2026-03-10,text",
            "manufacturer,TSMC,text",
            "className,Flagship,text",
            "model,SM-1234,text",
          "coreCount,8,number",
          "coreConfiguration,1x Arm Cortex-X4 @ 3.2GHz|3x Arm Cortex-A720 @ 2.8GHz|4x Arm Cortex-A520 @ 2.0GHz,text",
          "cores,1+3+4,text",
          "instructionSet,ARMv9.2-A /* ARMv9-A | ARMv8.2-A */,text",
          "architectureBits,64bit /* 32bit */,text",
          "process,3nm,text",
          "transistorCount,17.5 billion,text",
          "l2Cache,2MB,text",
          "l3Cache,6MB,text",
          "cpuFeatures,AV1 decode /* SMT | HDR processing */|SMT|HDR processing|AI acceleration,csv",
          "tdpW,6,number",
          "gpuName,Adreno 750,text",
          "gpuArchitecture,Adreno,text",
          "pipelines,6,number",
          "gpuFrequencyMhz,900,number",
          "gpuApis,Vulkan /* OpenGL | DirectX */|OpenGL|DirectX,csv",
          "gpuFlops,5.6 TFLOPS,text",
          "gpuFeatures,Ray tracing /* Variable Rate Shading | HDR rendering */|Variable Rate Shading|HDR rendering,csv",
          "aiEngine,Hexagon NPU,text",
          "aiPerformanceTops,45,number",
          "aiPrecision,INT8/FP16 /* INT4 | FP32 */,text",
          "aiFeatures,INT8 /* FP16 | INT4 */|FP16|INT4,csv",
          "memoryType,LPDDR6 /* LPDDR5X | LPDDR6X */,text",
          "memoryTypes,LPDDR5X /* LPDDR6 | LPDDR6X */|LPDDR6|LPDDR6X,csv",
          "memoryFreqMhz,8533,number",
          "memoryFreqByType,LPDDR5X:8533|LPDDR6:9999|LPDDR6X:10667,kv",
          "memoryChannels,Quad-channel /* Single-channel | Dual-channel */,text",
          "storageChannels,2-lane /* Dual channel | 4-lane | 4 channel */,text",
          "memoryBusWidthBits,256,number",
          "maxMemoryGb,32,number",
          "storageType,NVMe /* UFS 4.0 | UFS 4.1 */,text",
          "storageTypes,UFS 4.0 /* UFS 4.1 | NVMe */|UFS 4.1|NVMe,csv",
          "bandwidthGbps,58.3,number",
          "cameraIsp,Imagiq 890,text",
          "maxCameraSupport,240,number",
          "cameraSupportModes,240|200 + 50|64 + 32 + 12|32 + 32 + 32 + 32,csv",
          "cameraFeatures,HDR /* AI | Night mode */|AI|Night mode|Multi-frame,csv",
          "maxVideoCapture,8K@30fps,text",
          "videoCapture,4K@120fps,text",
          "videoRecordingModes,8K@30fps|4K@120fps|4K@60fps|FHD+@240fps|FHD@120fps,csv",
          "videoRecordingCodecs,H.264 /* H.265/HEVC | AV1 */|H.265/HEVC|AV1,csv",
          "videoFeatures,HDR10 /* EIS | 10-bit */|EIS|10-bit,csv",
          "videoPlayback,8K@60fps|4K@240fps|4K@120fps,csv",
          "videoPlaybackCodecs,H.264 /* H.265/HEVC | AV1 */|H.265/HEVC|AV1,csv",
          "maxDisplayResolution,3200x1440,text",
          "maxRefreshRateHz,144,number",
          "displayModes,QHD+ (2960x3160):120Hz|FHD+ (2160x1080):240Hz|HD+ (1650x720):180Hz,csv",
          "outputDisplay,4K (2400x2160):60Hz|FHD+ (2060x1080):120Hz|FHD (1920x1080):120Hz,csv",
          "displayFeatures,HDR10+ /* Dolby Vision | DC dimming */|Dolby Vision|DC dimming,csv",
          "audioCodecs,HEVC /* AAC | FLAC */|ALC|AAC|FLAC,csv",
          "multimediaFeatures,Dolby Vision /* Dolby Atmos */|Dolby Atmos,csv",
          "modem,Snapdragon X75,text",
          "networkSupport,5G /* 4G | 3G | 2G */|4G|3G|2G,csv",
          "dual5g,true,boolean",
          "downloadMbps,10000,number",
          "uploadMbps,3000,number",
          "wifi,Wi-Fi 7 /* Wi-Fi 6E | Wi-Fi 6 */,text",
          "bluetooth,5.4 /* 5.3 | 5.2 */,text",
          "bluetoothFeatures,LE Audio /* aptX | LDAC */|aptX|LDAC,csv",
          "navigation,GPS /* GLONASS | Galileo */|GLONASS|Galileo|BeiDou,csv",
          "quickCharging,Quick Charge 5 /* USB PD 3.1 | SuperVOOC */,text",
          "chargingSpeed,120W,text",
          "sourceUrl,https://example.com,text",
          "benchmarks.antutuVersion,v10,text",
          "benchmarks.antutu,2200000,number",
          "benchmarks.antutuCpu,520000,number",
          "benchmarks.antutuGpu,780000,number",
          "benchmarks.antutuMemory,420000,number",
          "benchmarks.antutuUx,380000,number",
          "benchmarks.geekbenchVersion,6,text",
          "benchmarks.geekbenchSingle,2200,number",
          "benchmarks.geekbenchMulti,7200,number",
          "benchmarks.threeDMarkName,Wild Life Extreme,text",
          "benchmarks.threeDMark,11800,number",
        ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrentDetails(kind: "json" | "csv") {
    const detail = (form.detail || {}) as Record<string, unknown>;
    const normalized = orderDetailFields(detail);
    if (kind === "json") {
      const content = JSON.stringify(normalized, null, 2);
      const blob = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "processor-detail-export.json";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const rows: string[] = ["path,value,type"];
    const addRow = (path: string, value: unknown) => {
      if (value === undefined || value === null) return;
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
          addRow(path ? `${path}.${k}` : k, v);
        });
        return;
      }
      if (Array.isArray(value)) {
        rows.push(`${path},${value.map((v) => String(v)).join("|")},csv`);
        return;
      }
      if (typeof value === "number") {
        rows.push(`${path},${String(value)},number`);
        return;
      }
      if (typeof value === "boolean") {
        rows.push(`${path},${String(value)},boolean`);
        return;
      }
      rows.push(`${path},${String(value)},text`);
    };
    Object.entries(normalized).forEach(([key, value]) => addRow(key, value));
    const blob = new Blob([rows.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "processor-detail-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importDetailsFromFile(kind: "json" | "csv", file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      if (!text.trim()) return;
      if (kind === "json") {
        try {
          setBulkJsonInput(text);
          const rows = parseJsonToRows(text);
          if (!rows.length) {
            setBulkWarnings(["No rows found in JSON."]);
            setBulkMessage("Import failed.");
            return;
          }
          const { detail: nextDetail, warnings } = applyBulkRows(rows, "apply", (form.detail || {}) as Record<string, unknown>);
          setBulkWarnings(warnings);
          setForm((prev) => ({ ...prev, detail: nextDetail as ProcessorDetail }));
          setBulkMessage("Imported JSON and filled form fields.");
        } catch {
          setBulkWarnings(["Invalid JSON file."]);
          setBulkMessage("Import failed.");
        }
        return;
      }
      try {
        setBulkCsvInput(text);
        const rows = parseBulkCsv(text);
        if (!rows.length) {
          setBulkWarnings(["No rows found in CSV."]);
          setBulkMessage("Import failed.");
          return;
        }
        const { detail: nextDetail, warnings } = applyBulkRows(rows, "apply", (form.detail || {}) as Record<string, unknown>);
        setBulkWarnings(warnings);
        setForm((prev) => ({ ...prev, detail: nextDetail as ProcessorDetail }));
        setBulkMessage("Imported CSV and filled form fields.");
      } catch {
        setBulkWarnings(["Invalid CSV file."]);
        setBulkMessage("Import failed.");
      }
    };
    reader.readAsText(file);
  }

  function validateBulkRows(rows: BulkRow[]) {
    const warnings: string[] = [];
    rows.forEach((row) => {
      const path = String(row.path || "").trim();
      if (!path) return;
      const normalizedPath = path.startsWith("detail.") ? path.slice(7) : path;
      if (!BULK_ALLOWED_FIELDS.has(normalizedPath) && !normalizedPath.startsWith("benchmarks.")) {
        warnings.push(`Unknown field: ${normalizedPath}`);
      }
    });
    setBulkWarnings(warnings);
    setBulkMessage(warnings.length ? "Validation found unknown fields." : "Validation passed.");
  }

  function parseJsonToRows(rawJson: string): BulkRow[] {
    const rows: BulkRow[] = [];
    const parsed = JSON.parse(rawJson);
    const detailPayload = parsed?.detail && typeof parsed.detail === "object" ? parsed.detail : parsed;
    if (detailPayload && typeof detailPayload === "object" && !Array.isArray(detailPayload)) {
      Object.entries(detailPayload as Record<string, unknown>).forEach(([key, value]) => {
        if (key === "seo" && value && typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
            rows.push({
              path: `seo.${k}`,
              value: Array.isArray(v) ? (v as unknown[]).join("|") : String(v ?? ""),
              type: Array.isArray(v) ? "csv" : (typeof v === "number" ? "number" : (typeof v === "boolean" ? "boolean" : "")),
            });
          });
          return;
        }
        if (key === "benchmarks" && value && typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
            rows.push({ path: `benchmarks.${k}`, value: String(v ?? ""), type: typeof v === "number" ? "number" : "" });
          });
          return;
        }
        rows.push({
          path: key,
          value: Array.isArray(value) ? (value as unknown[]).join("|") : String(value ?? ""),
          type: Array.isArray(value) ? "csv" : (typeof value === "number" ? "number" : ""),
        });
      });
    }
    return rows;
  }

  function handleBulkValidate(kind: "json" | "csv") {
    try {
      const rows =
        kind === "json"
          ? parseJsonToRows(String(bulkJsonInput || "").trim())
          : parseBulkCsv(String(bulkCsvInput || "").trim());
      if (!rows.length) {
        setBulkWarnings(["No rows to validate."]);
        setBulkMessage("Validation failed.");
        return;
      }
      validateBulkRows(rows);
      const { detail: nextDetail, warnings } = applyBulkRows(rows, "apply", (form.detail || {}) as Record<string, unknown>);
      setBulkWarnings(warnings);
      setForm((prev) => ({ ...prev, detail: nextDetail as ProcessorDetail }));
      setBulkMessage("Validated and filled form fields.");
    } catch {
      setBulkWarnings([kind === "json" ? "Invalid JSON" : "Invalid CSV"]);
      setBulkMessage("Validation failed.");
    }
  }

  function handleBulkApply(mode: "insert" | "apply") {
    const rawJson = String(bulkJsonInput || "").trim();
    const rawCsv = String(bulkCsvInput || "").trim();
    let sourceRows: BulkRow[] = [];
    let isJsonSource = false;

    if (rawJson) {
      isJsonSource = true;
      try {
        sourceRows = parseJsonToRows(rawJson);
      } catch (err) {
        setBulkMessage(err instanceof Error ? err.message : "Invalid JSON.");
        return;
      }
    } else if (rawCsv) {
      try {
        sourceRows = parseBulkCsv(rawCsv);
      } catch (err) {
        setBulkMessage(err instanceof Error ? err.message : "Invalid CSV.");
        return;
      }
    }

    if (!sourceRows.length) {
      setBulkMessage("No rows to apply.");
      return;
    }

    const { detail: detailFromRows } = applyBulkRows(sourceRows, "apply", {});

    if (isJsonSource) {
      const csvRows: string[] = ["path,value,type"];
      const addRow = (path: string, value: unknown) => {
        if (value === undefined || value === null) return;
        if (typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([k, v]) => addRow(path ? `${path}.${k}` : k, v));
          return;
        }
        const type = Array.isArray(value) ? "csv" : typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text";
        const valStr = Array.isArray(value) ? value.join('|') : String(value);
        csvRows.push(`${path},${valStr.includes(',') ? `"${valStr}"` : valStr},${type}`);
      };
      Object.entries(orderDetailFields(detailFromRows)).forEach(([key, value]) => addRow(key, value));
      setBulkCsvInput(csvRows.join('\n'));
    } else {
      setBulkJsonInput(JSON.stringify(detailFromRows, null, 2));
    }

    const { detail: nextDetail, warnings } = applyBulkRows(sourceRows, mode, (form.detail || {}) as Record<string, unknown>);
    setBulkWarnings(warnings);
    setForm((prev) => ({ ...prev, detail: nextDetail as ProcessorDetail }));
    setBulkMessage(mode === "insert" ? "Inserted rows into processor details." : "Applied rows to processor details.");
  }

  function applyCameraSetups(next: CameraSetupProfile[]) {
    const normalized = next.map((row, idx) => ({
      id: row.id || `csr${idx + 1}`,
      setupCount: Math.max(1, row.setupCount || 1),
      lenses: Array.from({ length: Math.max(1, row.setupCount || 1) }, (_, i) => row.lenses[i] || { id: `csl${idx + 1}_${i + 1}`, value: "" }),
    }));
    setCameraSetupsDraft(normalized);
    const formatted = normalized.map((row) => formatCameraSetupRow(row)).map((x) => x.trim()).filter(Boolean);
    const lensMpValues = normalized
      .flatMap((row) => row.lenses.map((lens) => {
        const m = String(lens.value || "").match(/([\d.]+)\s*mp?/i);
        return m?.[1] ? Number(m[1]) : NaN;
      }))
      .filter((n) => Number.isFinite(n)) as number[];
    const maxCameraSupportValue = lensMpValues.length
      ? Math.max(...lensMpValues)
      : undefined;
    setDetailField("cameraSupportModes", formatted);
    setDetailField("maxCameraSupport", maxCameraSupportValue);
  }

  function makeCameraSetupDraft(count: number, source: CameraLensProfile[], clearValues = false): CameraLensProfile[] {
    return Array.from({ length: Math.max(1, count) }, (_, idx) => {
      const existing = source[idx];
      return {
        id: existing?.id || `cs${idx + 1}`,
        value: clearValues ? "" : (existing?.value || ""),
      };
    });
  }

  function applyVideoRecording(next: VideoRecordingProfile[]) {
    const formatted = next.map(formatVideoRecordingRow).map((v) => v.trim()).filter(Boolean);
    setVideoRecordingDraft(next);
    setDetailField("videoRecordingModes", formatted);
    setMessage("Video recording modes applied.");
  }

  function applyVideoPlayback(next: VideoRecordingProfile[]) {
    const formatted = next.map(formatVideoRecordingRow).map((v) => v.trim()).filter(Boolean);
    setVideoPlaybackDraft(next);
    setDetailField("videoPlayback", formatted.join(", "));
    setMessage("Video playback modes applied.");
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (!existingId) {
        const existsResponse = await fetch(`/api/processors/${encodeURIComponent(docId)}`, { cache: "no-store", credentials: "include" });
        if (existsResponse.ok) {
          throw new Error("Slug/Document ID already exists. Please use a unique slug.");
        }
      }

    const payload: ProcessorAdmin = {
        ...form,
        id: docId,
        name,
        vendor,
        type: "processor",
        createdBy: form.createdBy || creatorName,
        fabricationNm: (() => {
          const raw = extractFabricationNm(getDetailField("process"));
          const n = Number(raw);
          return Number.isFinite(n) ? n : undefined;
        })(),
        detail: cleanObject((() => {
          const detail = { ...(form.detail || {}) } as Record<string, unknown>;
          delete detail.cameraSupport;
          const maxCamera = parseMaxCameraSupportNumber(detail.maxCameraSupport);
          detail.maxCameraSupport = maxCamera;
          CSV_TEXT_FIELDS.forEach((key) => {
            const raw = detail[key];
            if (typeof raw === "string") detail[key] = normalizeCsvArray(parseCsv(raw));
            if (Array.isArray(raw)) detail[key] = normalizeCsvArray(raw.map((item) => String(item)));
          });
          SEO_CSV_FIELDS.forEach((key) => {
            const raw = getByPath(detail, key);
            if (typeof raw === "string") setByPath(detail, key, normalizeCsvArray(parseCsv(raw)));
            if (Array.isArray(raw)) setByPath(detail, key, normalizeCsvArray(raw.map((item) => String(item))));
          });
          Object.entries(detail).forEach(([key, raw]) => {
            if (typeof raw === "string" && key !== "sourceUrl") detail[key] = normalizeTextToken(raw);
            if (Array.isArray(raw) && key !== "cameraSupportModes") {
              const items = raw.map((item) => String(item));
              detail[key] = normalizeCsvArray(items);
            }
          });
          const ins = String(detail.instructionSet || "").trim();
          const bits = String(detail.architectureBits || "").trim();
          if (ins && bits) detail.architecture = `${ins}, ${bits}`;
          return orderDetailFields(detail);
        })()) as ProcessorDetail | undefined,
      };
      const response = await fetch(existingId ? `/api/processors/${encodeURIComponent(existingId)}` : "/api/processors", {
        method: existingId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Save failed.");
      setMessage(existingId ? "Processor updated." : "Processor created.");
      if (!existingId) router.replace(`/admin/processor-editor?id=${encodeURIComponent(docId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/processors" className="text-blue-700 hover:underline">Processors</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700">{existingId ? "Edit" : "Create"}</span>
      </div>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {normalizationPreview.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <p className="font-semibold">Normalized on save (high-confidence):</p>
          <div className="mt-1 space-y-0.5">
            {normalizationPreview.map((row) => (
              <p key={row}>{row}</p>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={onSave} className="space-y-4">
        <section className="grid gap-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,0.6fr)] lg:items-start">
          <div className="panel p-3.5 w-full max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopPanelTab("basic")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    topPanelTab === "basic" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setTopPanelTab("quality")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    topPanelTab === "quality"
                      ? "bg-blue-600 text-white"
                      : missingCount > 0
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  Quality Check{missingCount > 0 ? ` (${missingCount})` : ""}
                </button>
              </div>
              {topPanelTab === "basic" ? (
                <button
                  type="button"
                  onClick={() => setTopCollapsed((prev) => !prev)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {topCollapsed ? "Show" : "Hide"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setQualityCollapsed((prev) => !prev)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {qualityCollapsed ? "Show" : "Hide"}
                </button>
              )}
            </div>
            {topPanelTab === "basic" ? (
              <div className={`mt-3 grid gap-2.5 overflow-hidden transition-all duration-200 sm:grid-cols-[2fr_1fr_1fr] ${topCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[2000px] opacity-100"}`}>
                <label className="grid gap-1 sm:col-span-1 sm:row-start-1 sm:row-end-2 sm:col-start-1 sm:col-end-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Title (Processor Name)</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={topReadOnly}
                    className={`h-9 rounded-lg border border-slate-200 px-3 text-sm ${topReadOnly ? "bg-slate-50 text-slate-600" : ""}`}
                  />
                  {vendor && titleSuggestions.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {titleSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            const next = `${vendor} ${item}`.trim();
                            setName(next);
                            if (!existingId && (!slugInput || slugInput === suggestedSlug)) setSlugInput(slugify(next));
                          }}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Brand</span>
                  <select
                    value={vendor}
                    onChange={(e) => {
                      const nextBrand = e.target.value;
                      setVendor(nextBrand);
                      setName(nextBrand ? `${nextBrand} ` : "");
                      if (!existingId) setSlugInput("");
                    }}
                    disabled={topReadOnly}
                    className={`h-9 rounded-lg border border-slate-200 px-3 text-sm ${topReadOnly ? "bg-slate-50 text-slate-600" : ""}`}
                  >
                    <option value="">Select Brand</option>
                    {vendor && !BRAND_OPTIONS.includes(vendor) ? <option value={vendor}>{vendor}</option> : null}
                    {BRAND_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</span>
                  <input value="processor" readOnly className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
                </label>
                <label className="grid gap-1 sm:col-span-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Slug</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlugInput(e.target.value)}
                    readOnly={topReadOnly}
                    className={`h-9 rounded-lg border border-slate-200 px-3 text-sm ${topReadOnly ? "bg-slate-50 text-slate-600" : ""}`}
                  />
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document ID</span>
                  <input value={docId} readOnly className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
                </label>
              </div>
            ) : (
              <div className={`overflow-hidden transition-all duration-200 ${qualityCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[2000px] opacity-100"}`}>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{missingCount} missing</span>
                  <span>Quick view of empty fields with jump links.</span>
                </div>
                {missingCount > 0 ? (
                  <div className="mt-3 grid gap-3">
                    {missingBySection.map((section) => {
                      const bypassed = Boolean(qualityBypass[section.sectionId]);
                      const borderTone = bypassed
                        ? "border-emerald-200 bg-emerald-50"
                        : section.count > 0
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50";
                      return (
                        <div key={section.sectionId} className={`rounded-lg border p-3 ${borderTone}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {section.label} {section.count > 0 ? `(${section.count})` : ""}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(section.sectionId);
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Jump
                              </button>
                              <button
                                type="button"
                                onClick={() => setQualityBypass((prev) => ({ ...prev, [section.sectionId]: !prev[section.sectionId] }))}
                                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                  bypassed ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                {bypassed ? "Bypassed" : "Bypass"}
                              </button>
                            </div>
                          </div>
                          {!bypassed ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              {section.fields.map((field) => (
                                <div key={`${field.sectionId}-${field.path}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <span className="font-medium text-slate-700">{field.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(field.sectionId);
                                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Jump
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-emerald-700">Bypassed — this section will be ignored in quality checks.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    All tracked fields are filled.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="panel p-4 w-full max-w-[260px] lg:justify-self-end">
            <div
              className="flex items-center justify-between gap-3"
              onDoubleClick={() => setStatusCollapsed((prev) => !prev)}
            >
              <h2 className="text-base font-bold text-slate-900">Status</h2>
              <button
                type="button"
                onClick={() => setStatusCollapsed((prev) => !prev)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {statusCollapsed ? "Show" : "Hide"}
              </button>
            </div>
            <div className={`mt-3 grid gap-2 transition-all duration-200 ${statusCollapsed ? "max-h-0 opacity-0 pointer-events-none overflow-hidden" : "max-h-64 opacity-100"}`}>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</span>
                <select value={form.status || "draft"} onChange={(e) => setField("status", e.target.value as ProcessorAdmin["status"])} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </label>
            </div>
          </div>
        </section>
        <section className="panel p-4 max-w-4xl" id="detail-seo">
          <div
            className="flex items-center justify-between gap-3"
            onDoubleClick={() => setSeoCollapsed((prev) => !prev)}
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">SEO & Metadata</h2>
              <p className="mt-1 text-xs text-slate-500">These fields control title, description, canonical URL, and share previews.</p>
            </div>
            <button
              type="button"
              onClick={() => setSeoCollapsed((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {seoCollapsed ? "Show" : "Hide"}
            </button>
          </div>
          <div className={`mt-3 grid gap-3 transition-all duration-200 ${seoCollapsed ? "max-h-0 opacity-0 pointer-events-none overflow-hidden" : "max-h-[1200px] opacity-100"}`}>
            {SEO_FIELDS.map((field) => {
              const value = getDetailField(field.key);
              const isUrlField = field.key === "seo.canonicalUrl" || field.key === "seo.ogImage";
              return (
                <label key={field.key} className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{field.label}</span>
                  {field.type === "boolean" ? (
                    <select
                      value={typeof value === "boolean" ? String(value) : ""}
                      onChange={(e) => setDetailField(field.key, e.target.value === "" ? undefined : e.target.value === "true")}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    >
                      <option value="">Not set</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : isUrlField ? (
                    <input
                      value={value ? String(value) : ""}
                      onChange={(e) => setDetailField(field.key, e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  ) : (
                    <textarea
                      rows={3}
                      value={field.type === "csv" ? csvInputValue(value) : (value ? String(value) : "")}
                      onChange={(e) => setDetailField(field.key, e.target.value)}
                      placeholder={field.type === "csv" ? "Comma separated values" : undefined}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>
        <section className="panel p-4">
          <div
            className="flex items-center justify-between gap-3"
            onDoubleClick={() => setProcessorDetailsCollapsed((prev) => !prev)}
          >
            <h2 className="text-base font-bold text-slate-900">Processor Details</h2>
            <button
              type="button"
              onClick={() => setProcessorDetailsCollapsed((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {processorDetailsCollapsed ? "Show Details" : "Hide Details"}
            </button>
          </div>
          {!processorDetailsCollapsed ? (
            <div className="mt-3 space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkMode("single")}
                    className={`rounded-t-lg px-4 py-2 text-xs font-semibold ${bulkMode === "single" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                  >
                    Single Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode("bulk")}
                    className={`rounded-t-lg px-4 py-2 text-xs font-semibold ${bulkMode === "bulk" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                  >
                    JSON / CSV
                  </button>
                </div>
              </div>
              {bulkMode === "bulk" ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Processor Details: Bulk Import</h3>
                    <p className="text-xs text-slate-500">Paste JSON or CSV for processor detail fields. Use dotted paths like `benchmarks.antutu`.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">JSON Input</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => downloadTemplate("json")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                          Download JSON
                        </button>
                        <button type="button" onClick={() => exportCurrentDetails("json")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                          Export JSON
                        </button>
                        <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-blue-300 hover:text-blue-700">
                          Import JSON
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => importDetailsFromFile("json", e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={bulkJsonInput}
                      onChange={(e) => setBulkJsonInput(e.target.value)}
                      placeholder='{"memoryTypes":["LPDDR5X"],"memoryFreqByType":{"LPDDR5X":8533},"benchmarks":{"antutu":2200000}}'
                      className="min-h-[140px] rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">CSV Input</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => downloadTemplate("csv")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                          Download CSV
                        </button>
                        <button type="button" onClick={() => exportCurrentDetails("csv")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                          Export CSV
                        </button>
                        <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-blue-300 hover:text-blue-700">
                          Import CSV
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => importDetailsFromFile("csv", e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={bulkCsvInput}
                      onChange={(e) => setBulkCsvInput(e.target.value)}
                      placeholder="path,value,type&#10;memoryTypes,LPDDR5X|LPDDR6,csv&#10;memoryFreqByType,LPDDR5X:8533|LPDDR6:9999,kv&#10;benchmarks.antutu,2200000,number"
                      className="min-h-[140px] rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleBulkApply("insert")} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Insert
                  </button>
                  <button type="button" onClick={() => handleBulkApply("apply")} className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white">
                    Apply
                  </button>
                  <button type="button" onClick={() => handleBulkValidate("csv")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Validate CSV
                  </button>
                  <button type="button" onClick={() => handleBulkValidate("json")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Validate JSON
                  </button>
                </div>
                {bulkMessage ? <p className="mt-2 text-xs font-semibold text-slate-700">{bulkMessage}</p> : null}
                {bulkWarnings.length ? (
                  <div className="mt-1 text-xs text-amber-700">
                    {bulkWarnings.map((warn) => (
                      <div key={warn}>{warn}</div>
                    ))}
                  </div>
                ) : null}
              </div>
              ) : null}

        {bulkMode === "single" ? (
        <>
        <section className="grid gap-3 lg:grid-cols-3">
          <div className="panel p-4" id="detail-basic">
            <h2 className="text-base font-bold text-slate-900">Basic Information</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Launch Date</span>
                <input
                  type="date"
                  value={isUpcoming ? "" : String(getDetailField("announced") || "")}
                  onChange={(e) => setDetailField("announced", e.target.value)}
                  disabled={isUpcoming}
                  className={`h-9 rounded-lg border border-slate-200 px-3 text-sm ${isUpcoming ? "bg-slate-50 text-slate-500" : ""}`}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <input
                  type="checkbox"
                  checked={isUpcoming}
                  onChange={(e) => setDetailField("announced", e.target.checked ? "upcoming" : "")}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Upcoming
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Class</span>
                <select
                  value={String(getDetailField("className") || "")}
                  onChange={(e) => setDetailField("className", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="">Select Class</option>
                  {CLASS_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Manufacturer</span>
                <input
                  value={String(getDetailField("manufacturer") || "")}
                  onChange={(e) => setDetailField("manufacturer", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Model Number</span>
                <input
                  value={String(getDetailField("model") || "")}
                  onChange={(e) => setDetailField("model", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="panel p-4" id="detail-benchmarks">
            <h2 className="text-base font-bold text-slate-900">AnTuTu Benchmark</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">AnTuTu Version</span>
                <input
                  value={String(getDetailField("benchmarks.antutuVersion") || "")}
                  onChange={(e) => setDetailField("benchmarks.antutuVersion", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Score</span>
                <input
                  type="number"
                  step="any"
                  value={String(antutuTotal ?? "")}
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : Number(e.target.value);
                    setDetailField("benchmarks.antutu", value);
                    setField("antutu", value ?? 0);
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">CPU</span>
                <input
                  type="number"
                  step="any"
                  value={String(getDetailField("benchmarks.antutuCpu") ?? "")}
                  onChange={(e) => setDetailField("benchmarks.antutuCpu", e.target.value === "" ? undefined : Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">GPU</span>
                <input
                  type="number"
                  step="any"
                  value={String(getDetailField("benchmarks.antutuGpu") ?? "")}
                  onChange={(e) => setDetailField("benchmarks.antutuGpu", e.target.value === "" ? undefined : Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Memory</span>
                <input
                  type="number"
                  step="any"
                  value={String(getDetailField("benchmarks.antutuMemory") ?? "")}
                  onChange={(e) => setDetailField("benchmarks.antutuMemory", e.target.value === "" ? undefined : Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">UX</span>
                <input
                  type="number"
                  step="any"
                  value={String(getDetailField("benchmarks.antutuUx") ?? "")}
                  onChange={(e) => setDetailField("benchmarks.antutuUx", e.target.value === "" ? undefined : Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="panel p-4">
            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <h2 className="text-sm font-bold text-slate-900">Geekbench</h2>
                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Geekbench Version</span>
                    <input
                      value={String(getDetailField("benchmarks.geekbenchVersion") || "")}
                      onChange={(e) => setDetailField("benchmarks.geekbenchVersion", e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Single Core Score</span>
                    <input
                      type="number"
                      step="any"
                      value={String(getDetailField("benchmarks.geekbenchSingle") ?? "")}
                      onChange={(e) => setDetailField("benchmarks.geekbenchSingle", e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Multi Core Score</span>
                    <input
                      type="number"
                      step="any"
                      value={String(getDetailField("benchmarks.geekbenchMulti") ?? "")}
                      onChange={(e) => setDetailField("benchmarks.geekbenchMulti", e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h2 className="text-sm font-bold text-slate-900">3DMark</h2>
                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">3DMark Test Name</span>
                    <input
                      value={String(getDetailField("benchmarks.threeDMarkName") || "")}
                      onChange={(e) => setDetailField("benchmarks.threeDMarkName", e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">3DMark Score</span>
                    <input
                      type="number"
                      step="any"
                      value={String(getDetailField("benchmarks.threeDMark") ?? "")}
                      onChange={(e) => setDetailField("benchmarks.threeDMark", e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
        {DETAIL_SECTIONS.map((section) => {
            const sectionOptions = getSectionOptions(section.title);
            const hasSectionToggle = sectionOptions.length > 1;
            return (
            <Fragment key={section.title}>
            <section
              id={`detail-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="panel p-5"
            >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setActivePrivateSection((prev) => (prev === section.title ? null : section.title));
                  setPrivateFieldDraft((prev) => ({
                    ...prev,
                    section: hasSectionToggle ? sectionOptions[0] || section.title : section.title,
                  }));
                  setPrivateFieldInlineError("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Add Private Field
              </button>
            </div>
            {section.title === "CPU / Core" ? (
              <>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Core Cluster Builder <span className="normal-case font-medium text-slate-500">(Clock is entered in GHz. Example: 3.2 equals 3200 MHz.)</span>
                  </p>
                  <div className="mt-2 space-y-2">
                    {cpuClusters.map((row) => (
                        <div key={row.id} className="grid gap-2 sm:grid-cols-[80px_minmax(0,1fr)_110px_120px_auto]">
                          <input
                            type="number"
                            min={1}
                            value={row.count}
                            onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, count: Number(e.target.value || 1) } : item)))}
                            className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                            title="Core count"
                          />
                            <input
                              list="cpu-core-options"
                              value={row.core}
                              onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, core: e.target.value } : item)))}
                              className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                              placeholder="Arm Cortex-X4"
                            />
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min={0.1}
                              value={row.ghz}
                              onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, ghz: Number(e.target.value || 0.1) } : item)))}
                              className="h-9 w-full rounded-lg border border-slate-200 px-2 pr-12 text-sm"
                              title="Clock (GHz)"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500">GHz</span>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input
                              type="radio"
                              name="max-clock-cluster"
                              checked={row.isMax}
                            onChange={() => setCpuClusters((prev) => prev.map((item) => ({ ...item, isMax: item.id === row.id })))}
                          />
                          Max
                        </label>
                        <button
                          type="button"
                          onClick={() => setCpuClusters((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev))}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <datalist id="cpu-core-options">
                      {CPU_CORE_OPTIONS.map((item) => (
                        <option key={item} value={item} />
                      ))}
                      {HELPER_SUGGESTIONS.map((item) => (
                        <option key={`helper-${item}`} value={item} />
                      ))}
                    </datalist>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCpuClusters((prev) => [
                              ...prev,
                              { id: `c${Date.now()}`, count: 1, core: "Arm Cortex-A720", ghz: 2.8, isMax: false },
                            ])
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Add Cluster
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCpuClusters(cpuClusters)}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Apply Cluster Config
                        </button>
                      </div>
                    <div className="grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Core Configuration</span>
                        <input
                          value={String(getDetailField("coreConfiguration") || "")}
                          onChange={(e) => setDetailField("coreConfiguration", e.target.value)}
                          list={getSuggestionListId("coreConfiguration")}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cores (Raw Data)</span>
                        <input
                          value={String(getDetailField("cores") || "")}
                          onChange={(e) => setDetailField("cores", e.target.value)}
                          list={getSuggestionListId("cores")}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Core Count</span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={String(getDetailField("coreCount") ?? "")}
                          onChange={(e) => setDetailField("coreCount", e.target.value === "" ? undefined : Number(e.target.value))}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fabrication Process</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min={1}
                            value={processNm}
                            onChange={(e) => setDetailField("process", e.target.value ? `${e.target.value}nm` : "")}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-12 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">nm</span>
                        </div>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Instruction Set</span>
                        <select value={String(getDetailField("instructionSet") || "")} onChange={(e) => setDetailField("instructionSet", e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">
                          <option value="">Select Instruction Set</option>
                          {INSTRUCTION_SET_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Architecture</span>
                        <select value={String(getDetailField("architectureBits") || "")} onChange={(e) => setDetailField("architectureBits", e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">
                          <option value="">Select Bitness</option>
                          {ARCHITECTURE_BITS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">TDP</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={tdpValue}
                            onChange={(e) => setDetailField("tdpW", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">W</span>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Transistor Count</span>
                        <div className="grid grid-cols-[minmax(0,1.8fr)_86px] gap-2">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={transistor.amount}
                            onChange={(e) => {
                              const amount = e.target.value;
                              if (!amount) {
                                setDetailField("transistorCount", "");
                                return;
                              }
                              const unit = transistor.unit || transistorUnitPref;
                              setDetailField("transistorCount", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          />
                          <select
                            value={transistor.unit || transistorUnitPref}
                            onChange={(e) => {
                              const unit = e.target.value;
                              setTransistorUnitPref(unit);
                              const amount = transistor.amount;
                              if (!amount) return;
                              setDetailField("transistorCount", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                          >
                            <option value="">Unit</option>
                            <option value="million">Million</option>
                            <option value="billion">Billion</option>
                            <option value="trillion">Trillion</option>
                          </select>
                        </div>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">L2 Cache</span>
                        <div className="grid grid-cols-[minmax(0,1.8fr)_86px] gap-2">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={l2Cache.amount}
                            onChange={(e) => {
                              const amount = e.target.value;
                              if (!amount) {
                                setDetailField("l2Cache", "");
                                return;
                              }
                              const unit = l2Cache.unit || l2UnitPref;
                              setDetailField("l2Cache", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          />
                          <select
                            value={l2Cache.unit || l2UnitPref}
                            onChange={(e) => {
                              const unit = e.target.value;
                              setL2UnitPref(unit);
                              const amount = l2Cache.amount;
                              if (!amount) return;
                              setDetailField("l2Cache", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                          >
                            <option value="">Unit</option>
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                            <option value="GB">GB</option>
                          </select>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">L3 Cache</span>
                        <div className="grid grid-cols-[minmax(0,1.8fr)_86px] gap-2">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={l3Cache.amount}
                            onChange={(e) => {
                              const amount = e.target.value;
                              if (!amount) {
                                setDetailField("l3Cache", "");
                                return;
                              }
                              const unit = l3Cache.unit || l3UnitPref;
                              setDetailField("l3Cache", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          />
                          <select
                            value={l3Cache.unit || l3UnitPref}
                            onChange={(e) => {
                              const unit = e.target.value;
                              setL3UnitPref(unit);
                              const amount = l3Cache.amount;
                              if (!amount) return;
                              setDetailField("l3Cache", unit ? `${amount} ${unit}` : amount);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                          >
                            <option value="">Unit</option>
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                            <option value="GB">GB</option>
                          </select>
                        </div>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max CPU Clock Speed</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={form.maxCpuGhz ? Math.round(form.maxCpuGhz * 1000) : ""}
                            onChange={(e) => setField("maxCpuGhz", e.target.value ? Number(e.target.value) / 1000 : undefined)}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-14 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">MHz</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    CPU Features <span className="normal-case font-medium text-slate-500">(comma separated)</span>
                  </span>
                  {renderCsvInput("cpuFeatures", "Comma separated (e.g. SMT, AV1 decode)")}
                </label>
              </div>
              </>
            ) : null}
            {section.title === "Graphics (GPU)" ? (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">GPU Name</span>
                    <input
                      value={String(getDetailField("gpuName") || "")}
                      onChange={(e) => setDetailField("gpuName", e.target.value)}
                      list={getSuggestionListId("gpuName")}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Architecture</span>
                    <input
                      value={String(getDetailField("gpuArchitecture") || "")}
                      onChange={(e) => setDetailField("gpuArchitecture", e.target.value)}
                      list={getSuggestionListId("gpuArchitecture")}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">GPU Cores</span>
                    <input
                      type="number"
                      step="1"
                      min={0}
                      value={String(getDetailField("pipelines") ?? "")}
                      onChange={(e) => setDetailField("pipelines", e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">GPU Frequency</span>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={String(getDetailField("gpuFrequencyMhz") ?? "")}
                        onChange={(e) => setDetailField("gpuFrequencyMhz", e.target.value === "" ? undefined : Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-14 text-sm"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">MHz</span>
                    </div>
                  </label>
                </div>
                <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Other GPU Feature</span>
                    {renderCsvInput("gpuFeatures", "Comma separated")}
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">APIs</span>
                    {renderCsvInput("gpuApis", "Comma separated")}
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">FLOPS</span>
                    <div className="relative">
                      <input
                        value={String(getDetailField("gpuFlops") || "")}
                        onChange={(e) => setDetailField("gpuFlops", e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-24 text-sm"
                        placeholder="e.g. 5600"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">Gigaflops</span>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}
            {section.title === "AI" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <label key={field.key} className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{field.label}</span>
                    {FIELD_HELP[`AI.${field.key}`] ? (
                      <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP[`AI.${field.key}`]}</span>
                    ) : null}
                    {field.type === "csv" ? (
                      renderCsvInput(field.key, "Comma separated")
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          value={String(getDetailField(field.key) ?? "")}
                          onChange={(e) =>
                            setDetailField(
                              field.key,
                              field.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value
                            )
                          }
                          list={field.type === "text" ? getSuggestionListId(field.key) : undefined}
                          className={`h-9 w-full rounded-lg border border-slate-200 px-3 text-sm ${field.key === "aiPerformanceTops" ? "pr-14" : ""}`}
                        />
                        {field.key === "aiPerformanceTops" ? (
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500">TOPS</span>
                        ) : null}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            ) : null}
            {section.title === "Memory / Storage" ? (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">RAM Type & Frequency</p>
                    <div className="mt-2 space-y-2">
                      {ramProfiles.map((row) => (
                        <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                          <select
                            value={row.type}
                            onChange={(e) => setRamProfiles((prev) => prev.map((item) => (item.id === row.id ? { ...item, type: e.target.value } : item)))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          >
                            <option value="">Select RAM Type</option>
                            {RAM_TYPE_SUGGESTIONS.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                            {row.type && !RAM_TYPE_SUGGESTIONS.includes(row.type) ? <option value={row.type}>{row.type}</option> : null}
                          </select>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min={0}
                              value={row.freq}
                              onChange={(e) => setRamProfiles((prev) => prev.map((item) => (item.id === row.id ? { ...item, freq: e.target.value === "" ? "" : Number(e.target.value) } : item)))}
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">MHz</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRamProfiles((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev))}
                            className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setRamProfiles((prev) => [...prev, { id: `r${Date.now()}`, type: "", freq: "" }])}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Add RAM Type
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRamProfiles(ramProfiles)}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Apply RAM
                        </button>
                      </div>
                      {appliedRamSummary ? (
                        <p className="text-xs font-medium text-slate-600">{appliedRamSummary}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">RAM Specs</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max RAM Frequency</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={String(getDetailField("memoryFreqMhz") ?? "")}
                            onChange={(e) => setDetailField("memoryFreqMhz", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">MHz</span>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">RAM Channel</span>
                        <select
                          value={String(getDetailField("memoryChannels") || "")}
                          onChange={(e) => setDetailField("memoryChannels", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        >
                          <option value="">Select Channel</option>
                          <option value="Single-channel">Single-channel</option>
                          <option value="Dual-channel">Dual-channel</option>
                          <option value="Triple-channel">Triple-channel</option>
                          <option value="Quad-channel">Quad-channel</option>
                          <option value="Octa-channel">Octa-channel</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max RAM</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={String(getDetailField("maxMemoryGb") ?? "")}
                            onChange={(e) => setDetailField("maxMemoryGb", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">GB</span>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Memory/RAM Bus Width</span>
                        <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={String(getDetailField("memoryBusWidthBits") ?? "")}
                            onChange={(e) => setDetailField("memoryBusWidthBits", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          />
                          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">bit</span>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Maximum Bandwidth</span>
                        <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={String(getDetailField("bandwidthGbps") ?? "")}
                            onChange={(e) => setDetailField("bandwidthGbps", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          />
                          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">GB/s</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Storage</p>
                    <div className="mt-2 grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Storage Channels / Lanes</span>
                        <input
                          value={String(getDetailField("storageChannels") || "")}
                          onChange={(e) => setDetailField("storageChannels", e.target.value)}
                          list={getSectionSuggestionListId("storage")}
                          placeholder="e.g. 2 lane, Dual channel"
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <div className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Storage Type</span>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <select
                            value={selectedStorageType}
                            onChange={(e) => setSelectedStorageType(e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                          >
                            <option value="">Select Storage Type</option>
                            {STORAGE_TYPE_SUGGESTIONS.map((item) => (
                              <option key={item} value={item} disabled={storageTypesDraft.includes(item)}>
                                {item}
                              </option>
                            ))}
                            {selectedStorageType && !STORAGE_TYPE_SUGGESTIONS.includes(selectedStorageType) ? (
                              <option value={selectedStorageType}>{selectedStorageType}</option>
                            ) : null}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const value = selectedStorageType.trim();
                              if (!value || storageTypesDraft.includes(value)) return;
                              const next = [...storageTypesDraft, value];
                              setStorageTypesDraft(next);
                              setDetailField("storageTypes", next);
                              setDetailField("storageType", next[0] || "");
                              setSelectedStorageType("");
                            }}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {storageTypesDraft.map((item) => (
                            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                              {item}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = storageTypesDraft.filter((x) => x !== item);
                                  setStorageTypesDraft(next);
                                  setDetailField("storageTypes", next);
                                  setDetailField("storageType", next[0] || "");
                                }}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === "Camera & Video" ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Camera</p>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Camera ISP</span>
                    <input
                      value={String(getDetailField("cameraIsp") || "")}
                      onChange={(e) => setDetailField("cameraIsp", e.target.value)}
                      list={getSuggestionListId("cameraIsp")}
                      placeholder="Qualcomm Spectra ISP (dual 12-bit)"
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Camera Setup</span>
                      <div className="space-y-2">
                        {cameraSetupsDraft.map((row) => (
                          <div key={row.id} className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_76px]">
                            <select
                              value={String(row.setupCount)}
                              onChange={(e) => {
                                const count = Math.max(1, Number(e.target.value) || 1);
                                setCameraSetupsDraft((prev) => prev.map((item) => {
                                  if (item.id !== row.id) return item;
                                  return {
                                    ...item,
                                    setupCount: count,
                                    lenses: makeCameraSetupDraft(count, item.lenses),
                                  };
                                }));
                              }}
                              className="h-9 w-[140px] rounded-lg border border-slate-200 px-2 text-sm"
                            >
                              {CAMERA_SETUP_OPTIONS.map((item) => (
                                <option key={item.label} value={item.count}>{item.label}</option>
                              ))}
                            </select>
                            <div className="flex flex-wrap items-center gap-2">
                              {row.lenses.map((lens, idx) => (
                                <div key={lens.id} className="flex items-center gap-2">
                                  {idx > 0 ? <span className="text-sm font-bold text-slate-500">+</span> : null}
                                  <div className="relative">
                                    <input
                                      value={lens.value}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setCameraSetupsDraft((prev) => prev.map((item) => {
                                          if (item.id !== row.id) return item;
                                          return {
                                            ...item,
                                            lenses: item.lenses.map((x) => (x.id === lens.id ? { ...x, value } : x)),
                                          };
                                        }));
                                      }}
                                      placeholder="e.g. 50 Main"
                                      className="h-9 w-24 rounded-lg border border-slate-200 px-3 pr-8 text-sm"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-sm text-slate-500">MP</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setCameraSetupsDraft((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev))}
                              className="h-9 w-[76px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCameraSetupsDraft((prev) => [...prev, { id: `csr${Date.now()}`, setupCount: 1, lenses: [{ id: `csl${Date.now()}_1`, value: "" }] }])}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Add Camera Setup
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCameraSetups(cameraSetupsDraft)}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Apply Camera Setup
                        </button>
                      </div>
                      {appliedCameraSetupSummary ? (
                        <p className="text-xs font-medium text-slate-600">{appliedCameraSetupSummary}</p>
                      ) : null}
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Camera Support</span>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={String(parseMaxCameraSupportNumber(getDetailField("maxCameraSupport")) ?? "")}
                            onChange={(e) => setDetailField("maxCameraSupport", e.target.value === "" ? undefined : Number(e.target.value))}
                            placeholder="320"
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500">MP</span>
                        </div>
                      </label>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Other Camera Features <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                      {renderCsvInput("cameraFeatures")}
                    </label>
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Video</p>
                    <div className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Video Recording Modes</span>
                      {FIELD_HELP["Camera & Video.videoRecordingModes"] ? (
                        <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP["Camera & Video.videoRecordingModes"]}</span>
                      ) : null}
                      <div className="space-y-2">
                        {videoRecordingDraft.map((row) => (
                          <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                            <select
                              value={row.mode}
                              onChange={(e) => {
                                const mode = e.target.value;
                                const next = videoRecordingDraft.map((item) => (item.id === row.id ? { ...item, mode } : item));
                                setVideoRecordingDraft(next);
                              }}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                            >
                              <option value="">Select Mode</option>
                              {VIDEO_RECORDING_MODE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                              {row.mode && !VIDEO_RECORDING_MODE_OPTIONS.includes(row.mode) ? <option value={row.mode}>{row.mode}</option> : null}
                            </select>
                            <div className="relative">
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={row.fps}
                                onChange={(e) => {
                                  const fps: number | "" = e.target.value === "" ? "" : Number(e.target.value);
                                  const next = videoRecordingDraft.map((item) => (item.id === row.id ? { ...item, fps } : item));
                                  setVideoRecordingDraft(next);
                                }}
                                className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-12 text-sm"
                                placeholder="FPS"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">fps</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = videoRecordingDraft.length > 1 ? videoRecordingDraft.filter((item) => item.id !== row.id) : videoRecordingDraft;
                                setVideoRecordingDraft(next);
                              }}
                              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setVideoRecordingDraft((prev) => [...prev, { id: `vr${Date.now()}`, mode: "", fps: "" }])}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Add Video Mode
                          </button>
                          <button
                            type="button"
                            onClick={() => applyVideoRecording(videoRecordingDraft)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply Video Modes
                          </button>
                        </div>
                        {appliedVideoRecordingSummary ? (
                          <p className="text-xs font-medium text-slate-600">{appliedVideoRecordingSummary}</p>
                        ) : null}
                      </div>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Video Recording Codecs</span>
                      {FIELD_HELP["Camera & Video.videoRecordingCodecs"] ? (
                        <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP["Camera & Video.videoRecordingCodecs"]}</span>
                      ) : null}
                      {renderCsvInput("videoRecordingCodecs", "Comma separated (e.g. H.264, H.265/HEVC)")}
                    </label>
                    <div className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Video Playback</span>
                      {FIELD_HELP["Camera & Video.videoPlayback"] ? (
                        <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP["Camera & Video.videoPlayback"]}</span>
                      ) : null}
                      <div className="space-y-2">
                        {videoPlaybackDraft.map((row) => (
                          <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                            <select
                              value={row.mode}
                              onChange={(e) => {
                                const mode = e.target.value;
                                const next = videoPlaybackDraft.map((item) => (item.id === row.id ? { ...item, mode } : item));
                                setVideoPlaybackDraft(next);
                              }}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                            >
                              <option value="">Select Mode</option>
                              {VIDEO_RECORDING_MODE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                              {row.mode && !VIDEO_RECORDING_MODE_OPTIONS.includes(row.mode) ? <option value={row.mode}>{row.mode}</option> : null}
                            </select>
                            <div className="relative">
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={row.fps}
                                onChange={(e) => {
                                  const fps: number | "" = e.target.value === "" ? "" : Number(e.target.value);
                                  const next = videoPlaybackDraft.map((item) => (item.id === row.id ? { ...item, fps } : item));
                                  setVideoPlaybackDraft(next);
                                }}
                                className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-12 text-sm"
                                placeholder="FPS"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">fps</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = videoPlaybackDraft.length > 1 ? videoPlaybackDraft.filter((item) => item.id !== row.id) : videoPlaybackDraft;
                                setVideoPlaybackDraft(next);
                              }}
                              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setVideoPlaybackDraft((prev) => [...prev, { id: `vp${Date.now()}`, mode: "", fps: "" }])}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Add Playback Mode
                          </button>
                          <button
                            type="button"
                            onClick={() => applyVideoPlayback(videoPlaybackDraft)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply Playback Modes
                          </button>
                        </div>
                        {appliedVideoPlaybackSummary ? (
                          <p className="text-xs font-medium text-slate-600">{appliedVideoPlaybackSummary}</p>
                        ) : null}
                      </div>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Video Playback Codecs</span>
                      {FIELD_HELP["Camera & Video.videoPlaybackCodecs"] ? (
                        <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP["Camera & Video.videoPlaybackCodecs"]}</span>
                      ) : null}
                      {renderCsvInput("videoPlaybackCodecs", "Comma separated (e.g. H.264, H.265/HEVC)")}
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Other Video Features <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                      {renderCsvInput("videoFeatures")}
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === "Display & Multimedia" ? (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Display Modes (Mode, Resolution, RR)</p>
                      <div className="mt-2 space-y-2">
                        {displayModesDraft.map((row) => (
                          <div key={row.id} className="grid gap-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(110px,0.72fr)_minmax(110px,0.72fr)_minmax(160px,0.9fr)_76px_44px]">
                            <select
                              value={row.mode}
                              onChange={(e) => setDisplayModesDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, mode: e.target.value } : x)))}
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                            >
                              <option value="">No Mode</option>
                              {DISPLAY_MODE_NAME_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                              {row.mode && !DISPLAY_MODE_NAME_OPTIONS.includes(row.mode) ? <option value={row.mode}>{row.mode}</option> : null}
                            </select>
                            <div className="grid grid-cols-[minmax(0,1fr)_20px] items-center gap-1">
                              <input
                                value={splitResolution(row.resolution).width}
                                onChange={(e) => {
                                  const width = e.target.value.replace(/[^0-9]/g, "");
                                  const height = splitResolution(row.resolution).height;
                                  const resolution = width && height ? `${width}x${height}` : (width ? `${width}x` : (height ? `x${height}` : ""));
                                  setDisplayModesDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, resolution } : x)));
                                }}
                                placeholder="Width"
                                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                              />
                              <span className="text-center text-lg font-bold leading-none text-slate-500">x</span>
                            </div>
                            <input
                              value={splitResolution(row.resolution).height}
                              onChange={(e) => {
                                const height = e.target.value.replace(/[^0-9]/g, "");
                                const width = splitResolution(row.resolution).width;
                                const resolution = width && height ? `${width}x${height}` : (width ? `${width}x` : (height ? `x${height}` : ""));
                                setDisplayModesDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, resolution } : x)));
                              }}
                              placeholder="Height"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                            />
                            <div className="grid h-9 grid-cols-[minmax(0,1fr)_42px] overflow-hidden rounded-lg border border-slate-200">
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={row.rr}
                                onChange={(e) => setDisplayModesDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, rr: e.target.value === "" ? "" : Number(e.target.value) } : x)))}
                                className="h-full w-full border-0 px-3 text-sm outline-none"
                                placeholder="Refresh Rate"
                              />
                              <span className="inline-flex items-center justify-center border-l border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Hz</span>
                            </div>
                            <label className="inline-flex h-9 items-center gap-1.5 px-1 text-sm font-semibold text-slate-700">
                              <input
                                type="radio"
                                name="max-resolution-row"
                                checked={maxResolutionRowId === row.id}
                                onChange={() => setMaxResolutionRowId(row.id)}
                                className="h-4 w-4 border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                              />
                              Max
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (maxResolutionRowId === row.id) setMaxResolutionRowId("");
                                setDisplayModesDraft((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== row.id) : prev));
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-lg font-bold leading-none text-rose-600 hover:bg-rose-100"
                              aria-label="Remove row"
                            >
                              x
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDisplayModesDraft((prev) => [...prev, { id: `dm${Date.now()}`, mode: "", resolution: "", rr: "" }])}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Add Display Mode
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDisplayModes(displayModesDraft)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply Display Modes
                          </button>
                        </div>
                        {appliedDisplayModesSummary ? (
                          <p className="text-xs font-medium text-slate-600">{appliedDisplayModesSummary}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Output Display (Mode, Resolution, RR)</p>
                      <div className="mt-2 space-y-2">
                        {outputDisplaysDraft.map((row) => (
                          <div key={row.id} className="grid gap-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(110px,0.72fr)_minmax(110px,0.72fr)_minmax(160px,0.9fr)_44px]">
                            <select
                              value={row.mode}
                              onChange={(e) => setOutputDisplaysDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, mode: e.target.value } : x)))}
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                            >
                              <option value="">No Mode</option>
                              {DISPLAY_MODE_NAME_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                              {row.mode && !DISPLAY_MODE_NAME_OPTIONS.includes(row.mode) ? <option value={row.mode}>{row.mode}</option> : null}
                            </select>
                            <div className="grid grid-cols-[minmax(0,1fr)_20px] items-center gap-1">
                              <input
                                value={splitResolution(row.resolution).width}
                                onChange={(e) => {
                                  const width = e.target.value.replace(/[^0-9]/g, "");
                                  const height = splitResolution(row.resolution).height;
                                  const resolution = width && height ? `${width}x${height}` : (width ? `${width}x` : (height ? `x${height}` : ""));
                                  setOutputDisplaysDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, resolution } : x)));
                                }}
                                placeholder="Width"
                                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                              />
                              <span className="text-center text-lg font-bold leading-none text-slate-500">x</span>
                            </div>
                            <input
                              value={splitResolution(row.resolution).height}
                              onChange={(e) => {
                                const height = e.target.value.replace(/[^0-9]/g, "");
                                const width = splitResolution(row.resolution).width;
                                const resolution = width && height ? `${width}x${height}` : (width ? `${width}x` : (height ? `x${height}` : ""));
                                setOutputDisplaysDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, resolution } : x)));
                              }}
                              placeholder="Height"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                            />
                            <div className="grid h-9 grid-cols-[minmax(0,1fr)_42px] overflow-hidden rounded-lg border border-slate-200">
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={row.rr}
                                onChange={(e) => setOutputDisplaysDraft((prev) => prev.map((x) => (x.id === row.id ? { ...x, rr: e.target.value === "" ? "" : Number(e.target.value) } : x)))}
                                className="h-full w-full border-0 px-3 text-sm outline-none"
                                placeholder="Refresh Rate"
                              />
                              <span className="inline-flex items-center justify-center border-l border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Hz</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOutputDisplaysDraft((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== row.id) : prev))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-lg font-bold leading-none text-rose-600 hover:bg-rose-100"
                              aria-label="Remove row"
                            >
                              x
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setOutputDisplaysDraft((prev) => [...prev, { id: `od${Date.now()}`, mode: "", resolution: "", rr: "" }])}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Add Output Mode
                          </button>
                          <button
                            type="button"
                            onClick={() => applyOutputDisplays(outputDisplaysDraft)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply Output Modes
                          </button>
                        </div>
                        {appliedOutputDisplaySummary ? (
                          <p className="text-xs font-medium text-slate-600">{appliedOutputDisplaySummary}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="grid gap-3">
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Resolution</span>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <input
                              type="checkbox"
                              checked={maxResolutionManualOverride}
                              onChange={(e) => setMaxResolutionManualOverride(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Manual Override Max Resolution
                          </label>
                        </div>
                        <input
                          value={String(getDetailField("maxDisplayResolution") || "")}
                          onChange={(e) => setDetailField("maxDisplayResolution", e.target.value)}
                          readOnly={!maxResolutionManualOverride}
                          className={`h-9 w-full rounded-lg border border-slate-200 px-3 text-sm ${!maxResolutionManualOverride ? "bg-slate-50 text-slate-600" : ""}`}
                        />
                      </div>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Refresh Rate</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min={1}
                            value={String(getDetailField("maxRefreshRateHz") ?? "")}
                            onChange={(e) => setDetailField("maxRefreshRateHz", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">Hz</span>
                        </div>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Display Features <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                        {renderCsvInput("displayFeatures")}
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Audio Codecs <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                        {renderCsvInput("audioCodecs")}
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Multimedia Features <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                        {renderCsvInput("multimediaFeatures")}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === "Connectivity" ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[1.25fr_1.15fr_0.9fr_0.9fr_0.9fr]">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Modem Name</span>
                    <input
                      value={String(getDetailField("modem") || "")}
                      onChange={(e) => setDetailField("modem", e.target.value)}
                      list={getSuggestionListId("modem")}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Network Support</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <select
                        value={selectedNetworkSupport}
                        onChange={(e) => setSelectedNetworkSupport(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      >
                        <option value="">Select Network</option>
                        {NETWORK_SUPPORT_OPTIONS.map((item) => (
                          <option key={item} value={item} disabled={networkSupportDraft.includes(item)}>{item}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const value = selectedNetworkSupport.trim();
                          if (!value || networkSupportDraft.includes(value)) return;
                          const next = [...networkSupportDraft, value];
                          setNetworkSupportDraft(next);
                          setDetailField("networkSupport", next);
                          setSelectedNetworkSupport("");
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {networkSupportDraft.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                          {item}
                          <button
                            type="button"
                            onClick={() => {
                              const next = networkSupportDraft.filter((x) => x !== item);
                              setNetworkSupportDraft(next);
                              setDetailField("networkSupport", next);
                            }}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Wi-Fi</span>
                    <select
                      value={String(getDetailField("wifi") || "")}
                      onChange={(e) => setDetailField("wifi", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    >
                      <option value="">Select Wi-Fi</option>
                      {WIFI_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bluetooth</span>
                    <select
                      value={String(getDetailField("bluetooth") || "")}
                      onChange={(e) => setDetailField("bluetooth", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    >
                      <option value="">Select Bluetooth</option>
                      {BLUETOOTH_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bluetooth Features</span>
                    {renderCsvInput("bluetoothFeatures", "Comma separated (e.g. LE Audio, aptX)")}
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Download Speed</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={String(getDetailField("downloadMbps") ?? "")}
                        onChange={(e) => setDetailField("downloadMbps", e.target.value === "" ? undefined : Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">Mbps</span>
                    </div>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Upload Speed</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={String(getDetailField("uploadMbps") ?? "")}
                        onChange={(e) => setDetailField("uploadMbps", e.target.value === "" ? undefined : Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">Mbps</span>
                    </div>
                  </label>
                  <label className="grid gap-1 lg:col-span-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Navigation</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:max-w-md">
                      <select
                        value={selectedNavigation}
                        onChange={(e) => setSelectedNavigation(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      >
                        <option value="">Select Navigation System</option>
                        {NAVIGATION_OPTIONS.map((item) => (
                          <option key={item} value={item} disabled={navigationDraft.includes(item)}>{item}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const value = selectedNavigation.trim();
                          if (!value || navigationDraft.includes(value)) return;
                          const next = [...navigationDraft, value];
                          setNavigationDraft(next);
                          setDetailField("navigation", next);
                          setSelectedNavigation("");
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {navigationDraft.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                          {item}
                          <button
                            type="button"
                            onClick={() => {
                              const next = navigationDraft.filter((x) => x !== item);
                              setNavigationDraft(next);
                              setDetailField("navigation", next);
                            }}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </label>
                </div>
              </div>
            ) : null}
            {section.title === "Charging & Source" ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-4">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fast Charging Support</span>
                    <select
                      value={String(getDetailField("quickChargingSupport") || "")}
                      onChange={(e) => setDetailField("quickChargingSupport", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    >
                      <option value="">Not Available</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fast Charging Value</span>
                    <input
                      value={String(getDetailField("quickCharging") || "")}
                      onChange={(e) => setDetailField("quickCharging", e.target.value)}
                      list={getSuggestionListId("quickCharging")}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="e.g. Qualcomm Quick Charge 5.0, USB PD 3.1"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Charging Speed</span>
                    <input
                      value={String(getDetailField("chargingSpeed") || "")}
                      onChange={(e) => setDetailField("chargingSpeed", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="e.g. 65W, 50% in 30 min"
                    />
                  </label>
                  <label className="grid gap-1 lg:col-span-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Source URL</span>
                    <input
                      value={String(getDetailField("sourceUrl") || "")}
                      onChange={(e) => setDetailField("sourceUrl", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {section.fields.map((field) => {
                if (section.title === "AI") {
                  return null;
                }
                if (section.title === "CPU / Core" && (field.key === "coreCount" || field.key === "instructionSet" || field.key === "architectureBits" || field.key === "process" || field.key === "tdpW" || field.key === "transistorCount" || field.key === "coreConfiguration" || field.key === "cores" || field.key === "l2Cache" || field.key === "l3Cache" || field.key === "cpuFeatures")) {
                  return null;
                }
                if (section.title === "Graphics (GPU)" && (field.key === "gpuName" || field.key === "gpuArchitecture" || field.key === "pipelines" || field.key === "gpuFrequencyMhz" || field.key === "gpuFeatures" || field.key === "gpuApis" || field.key === "gpuFlops")) {
                  return null;
                }
                if (section.title === "Memory / Storage" && (field.key === "memoryType" || field.key === "memoryTypes" || field.key === "memoryFreqMhz" || field.key === "memoryFreqByType" || field.key === "memoryChannels" || field.key === "storageChannels" || field.key === "maxMemoryGb" || field.key === "memoryBusWidthBits" || field.key === "bandwidthGbps" || field.key === "storageType" || field.key === "storageTypes")) {
                  return null;
                }
                if (section.title === "Display & Multimedia" && (field.key === "displayModes" || field.key === "outputDisplay" || field.key === "maxDisplayResolution" || field.key === "maxRefreshRateHz" || field.key === "displayFeatures" || field.key === "audioCodecs" || field.key === "multimediaFeatures")) {
                  return null;
                }
                if (section.title === "Connectivity" && (field.key === "modem" || field.key === "networkSupport" || field.key === "downloadMbps" || field.key === "uploadMbps" || field.key === "wifi" || field.key === "bluetooth" || field.key === "bluetoothFeatures" || field.key === "navigation" || field.key === "dual5g")) {
                  return null;
                }
                if (section.title === "Charging & Source" && (field.key === "quickCharging" || field.key === "chargingSpeed" || field.key === "sourceUrl")) {
                  return null;
                }
                if (section.title === "Camera & Video" && (field.key === "cameraIsp" || field.key === "maxCameraSupport" || field.key === "cameraSupport" || field.key === "cameraSupportModes" || field.key === "cameraFeatures" || field.key === "maxVideoCapture" || field.key === "videoCapture" || field.key === "videoRecordingModes" || field.key === "videoRecordingCodecs" || field.key === "videoFeatures" || field.key === "videoPlayback" || field.key === "videoPlaybackCodecs")) {
                  return null;
                }
                const value = getDetailField(field.key);
                return (
                  <label key={field.key} className="grid gap-1">
                    {section.title === "AI" ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {field.label}
                        {FIELD_HELP[`${section.title}.${field.key}`] ? (
                          <span className="normal-case font-medium text-slate-500"> ({FIELD_HELP[`${section.title}.${field.key}`]})</span>
                        ) : null}
                      </span>
                    ) : section.title === "CPU / Core" && field.key === "coreCount" ? (
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{field.label}</span>
                        {FIELD_HELP[`${section.title}.${field.key}`] ? (
                          <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP[`${section.title}.${field.key}`]}</span>
                        ) : null}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{field.label}</span>
                        {section.title !== "AI" && FIELD_HELP[`${section.title}.${field.key}`] ? (
                          <span className="text-[11px] leading-4 text-slate-500">{FIELD_HELP[`${section.title}.${field.key}`]}</span>
                        ) : null}
                      </>
                    )}
                    {field.key === "instructionSet" ? (
                      <select value={value ? String(value) : ""} onChange={(e) => setDetailField(field.key, e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                        <option value="">Select Instruction Set</option>
                        {INSTRUCTION_SET_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : null}
                    {field.key === "architectureBits" ? (
                      <select value={value ? String(value) : ""} onChange={(e) => setDetailField(field.key, e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                        <option value="">Select Bitness</option>
                        {ARCHITECTURE_BITS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : null}
                    {field.key === "process" ? (
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min={1}
                          value={extractFabricationNm(value)}
                          onChange={(e) => setDetailField("process", e.target.value ? `${e.target.value}nm` : "")}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-12"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">nm</span>
                      </div>
                    ) : null}
                    {field.type === "text" && field.key !== "instructionSet" && field.key !== "architectureBits" && field.key !== "process" ? <input value={value ? String(value) : ""} onChange={(e) => setDetailField(field.key, e.target.value)} list={getSuggestionListId(field.key)} className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
                    {field.type === "number" ? <input type="number" step="any" value={value === undefined ? "" : String(value)} onChange={(e) => setDetailField(field.key, e.target.value === "" ? undefined : Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
                    {field.type === "csv" ? renderCsvInput(field.key, "Comma separated (e.g. HDR, Ray tracing)") : null}
                    {field.type === "kv" ? <input value={formatKvNumber(value)} onChange={(e) => setDetailField(field.key, parseKvNumber(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
                    {field.type === "boolean" ? (
                      <select
                        value={typeof value === "boolean" ? String(value) : ""}
                        onChange={(e) => setDetailField(field.key, e.target.value === "" ? undefined : e.target.value === "true")}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <option value="">Not set</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : null}
                  </label>
                );
              })}
            </div>
          {activePrivateSection === section.title ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-2 lg:grid-cols-[1.1fr_1.2fr_1.6fr_auto]">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
                  {hasSectionToggle ? (
                    <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-700">
                      {sectionOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setPrivateFieldDraft((prev) => ({ ...prev, section: option }));
                            setPrivateFieldInlineError("");
                          }}
                          className={`flex-1 rounded-md px-2 py-1.5 ${
                            privateFieldDraft.section === option
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        list={`private-section-options-inline-${section.title}`}
                        value={privateFieldDraft.section}
                        onChange={(e) => {
                          setPrivateFieldDraft((prev) => ({ ...prev, section: e.target.value }));
                          setPrivateFieldInlineError("");
                        }}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <datalist id={`private-section-options-inline-${section.title}`}>
                        {PRIVATE_SECTION_SUGGESTIONS.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </>
                  )}
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Label</span>
                  <input
                    value={privateFieldDraft.label}
                    onChange={(e) => {
                      setPrivateFieldDraft((prev) => ({ ...prev, label: e.target.value }));
                      setPrivateFieldInlineError("");
                    }}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="Field label"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Value</span>
                  <input
                    value={privateFieldDraft.value}
                    onChange={(e) => {
                      setPrivateFieldDraft((prev) => ({ ...prev, value: e.target.value }));
                      setPrivateFieldInlineError("");
                    }}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="Text value"
                  />
                </label>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">&nbsp;</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sectionName = privateFieldDraft.section.trim();
                        const label = privateFieldDraft.label.trim();
                      const value = privateFieldDraft.value.trim();
                      if (!sectionName || !label || !value) {
                        setPrivateFieldInlineError("Please fill Section, Label, and Value before adding.");
                        return;
                      }
                      const nextEntry: PrivateFieldEntry = {
                        section: sectionName,
                        label,
                        value,
                        type: "string",
                        sourceSection: section.title,
                      };
                      const next = [...privateFields, nextEntry];
                      setPrivateFields(next);
                      setDetailField("adminPrivateFields", next);
                      setPrivateFieldInlineError("");
                      setPrivateFieldDraft((prev) => ({ ...prev, label: "", value: "", type: "string" }));
                      setActivePrivateSection(null);
                      }}
                      className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePrivateSection(null);
                        setPrivateFieldDraft((prev) => ({ ...prev, label: "", value: "" }));
                        setPrivateFieldInlineError("");
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              {privateFieldInlineError ? (
                <p className="mt-2 text-xs font-semibold text-amber-600">{privateFieldInlineError}</p>
              ) : null}
            </div>
          ) : null}
          </section>
          {privateFields.some((row) => row.sourceSection === section.title) ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
              {privateFields
                .filter((row) => row.sourceSection === section.title)
                .map((row, idx) => {
                  const rowIndex = privateFields.indexOf(row);
                  return (
                    <div
                      key={`${row.section}-${row.label}-${rowIndex}-${idx}`}
                      className="grid items-center gap-2 px-3 py-2 text-sm text-slate-800 lg:grid-cols-[1.2fr_1.3fr_1.8fr_auto]"
                    >
                      <input
                        value={row.section}
                        onChange={(e) => {
                          const next = privateFields.map((item, i) =>
                            i === rowIndex ? { ...item, section: e.target.value, sourceSection: section.title } : item
                          );
                          setPrivateFields(next);
                          setDetailField("adminPrivateFields", next);
                        }}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800"
                        placeholder="Section"
                      />
                      <input
                        value={row.label}
                        onChange={(e) => {
                          const next = privateFields.map((item, i) =>
                            i === rowIndex ? { ...item, label: e.target.value, sourceSection: section.title } : item
                          );
                          setPrivateFields(next);
                          setDetailField("adminPrivateFields", next);
                        }}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                        placeholder="Label"
                      />
                      <input
                        value={formatPrivateFieldValue(row.value, row.type)}
                        onChange={(e) => {
                          const next = privateFields.map((item, i) =>
                            i === rowIndex
                              ? { ...item, value: e.target.value, type: item.type, sourceSection: section.title }
                              : item
                          );
                          setPrivateFields(next);
                          setDetailField("adminPrivateFields", next);
                        }}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                        placeholder="Value"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = privateFields.filter((_, i) => i !== rowIndex);
                          setPrivateFields(next);
                          setDetailField("adminPrivateFields", next);
                        }}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : null}
          </Fragment>
        );
        })}

        <section className="panel p-5">
          <h2 className="text-base font-bold text-slate-900">Private Admin Fields</h2>
          <p className="mt-1 text-xs text-slate-500">Saved in Firebase for internal use only. Not shown on public page.</p>
          {privateFields.length ? (
            <div className="mt-3 space-y-2">
              {privateFields.map((row, idx) => (
                <div key={`${row.section}-${row.label}-${idx}`} className="grid items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 lg:grid-cols-[1.3fr_1.2fr_1.8fr_auto]">
                  <input
                    value={row.section}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      const resolved = resolvePrivateSourceSection(nextValue);
                      const next = privateFields.map((item, i) =>
                        i === idx
                          ? { ...item, section: nextValue, sourceSection: resolved ?? item.sourceSection }
                          : item
                      );
                      setPrivateFields(next);
                      setDetailField("adminPrivateFields", next);
                    }}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800"
                    placeholder="Section"
                  />
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = privateFields.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item));
                      setPrivateFields(next);
                      setDetailField("adminPrivateFields", next);
                    }}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                    placeholder="Label"
                  />
                  <input
                    value={formatPrivateFieldValue(row.value, row.type)}
                    onChange={(e) => {
                      const next = privateFields.map((item, i) =>
                        i === idx ? { ...item, value: e.target.value, type: item.type } : item
                      );
                      setPrivateFields(next);
                      setDetailField("adminPrivateFields", next);
                    }}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = privateFields.filter((_, i) => i !== idx);
                      setPrivateFields(next);
                      setDetailField("adminPrivateFields", next);
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 lg:grid-cols-[1.1fr_1.2fr_1.6fr_auto]">
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
                <input
                  list="private-section-options-main"
                  value={privateFieldGlobalDraft.section}
                  onChange={(e) => {
                    setPrivateFieldGlobalDraft((prev) => ({ ...prev, section: e.target.value }));
                    setPrivateFieldGlobalError("");
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="Type section"
                />
                <datalist id="private-section-options-main">
                  {PRIVATE_SECTION_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Label</span>
                <input
                  value={privateFieldGlobalDraft.label}
                  onChange={(e) => {
                    setPrivateFieldGlobalDraft((prev) => ({ ...prev, label: e.target.value }));
                    setPrivateFieldGlobalError("");
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="Field label"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Value</span>
                <input
                  value={privateFieldGlobalDraft.value}
                  onChange={(e) => {
                    setPrivateFieldGlobalDraft((prev) => ({ ...prev, value: e.target.value }));
                    setPrivateFieldGlobalError("");
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="Text value"
                />
              </label>
              <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">&nbsp;</span>
                <button
                  type="button"
                  onClick={() => {
                    const sectionName = privateFieldGlobalDraft.section.trim();
                    const label = privateFieldGlobalDraft.label.trim();
                    const value = privateFieldGlobalDraft.value.trim();
                    if (!sectionName || !label || !value) {
                      setPrivateFieldGlobalError("Please fill Section, Label, and Value before adding.");
                      return;
                    }
                    const resolved = resolvePrivateSourceSection(sectionName);
                    const nextEntry: PrivateFieldEntry = {
                      section: sectionName,
                      label,
                      value,
                      type: "string",
                      sourceSection: resolved,
                    };
                    const next = [...privateFields, nextEntry];
                    setPrivateFields(next);
                    setDetailField("adminPrivateFields", next);
                    setPrivateFieldGlobalError("");
                    setPrivateFieldGlobalDraft({ section: "", label: "", value: "" });
                  }}
                  className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                >
                  Add
                </button>
              </div>
            </div>
            {privateFieldGlobalError ? (
              <p className="mt-2 text-xs font-semibold text-amber-600">{privateFieldGlobalError}</p>
            ) : null}
          </div>
        </section>
        </>
        ) : null}
            </div>
          ) : null}
        </section>
        {Object.entries(FIELD_SUGGESTIONS).map(([key, values]) => {
          const merged = HELPER_SUGGESTIONS.length
            ? Array.from(new Set([...values, ...HELPER_SUGGESTIONS]))
            : values;
          const id = HELPER_SUGGESTIONS.length ? `suggest-${key}-merged` : `suggest-${key}`;
          return (
            <datalist key={id} id={id}>
              {merged.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          );
        })}
        {HELPER_SUGGESTIONS.length ? (
          <datalist id="suggest-helper">
            {HELPER_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ) : null}
        {Object.entries(helperSectionSuggestions).map(([key, values]) => (
          <datalist key={key} id={`suggest-helper-section-${key}`}>
            {values.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ))}

        <div className="pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving..." : existingId ? "Update Processor" : "Create Processor"}
            </button>
            {docId ? (
              <Link
                href={`/processors/${encodeURIComponent(docId)}?preview=1&id=${encodeURIComponent(docId)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Live Preview
              </Link>
            ) : null}
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
                {saving ? "Saving..." : existingId ? "Update Processor" : "Create Processor"}
              </button>
              {docId ? (
                <Link
                  href={`/processors/${encodeURIComponent(docId)}?preview=1&id=${encodeURIComponent(docId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Live Preview
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
