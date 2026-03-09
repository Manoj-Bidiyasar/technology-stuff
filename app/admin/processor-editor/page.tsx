"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProcessorAdmin } from "@/lib/firestore/processors";
import type { ProcessorDetail } from "@/lib/processors/details";
import { slugify } from "@/utils/slugify";

type DetailFieldType = "text" | "number" | "csv" | "boolean" | "kv";
type DetailField = { key: string; label: string; type: DetailFieldType; placeholder?: string };
type DetailSection = { title: string; fields: DetailField[] };
type CpuCluster = { id: string; count: number; core: string; ghz: number; isMax: boolean };
type RamProfile = { id: string; type: string; freq: number | "" };
type DisplayModeProfile = { id: string; mode: string; resolution: string; rr: number | "" };
type PrivateFieldType = "string" | "number" | "boolean" | "array" | "timestamp";
type PrivateFieldDraft = { section: string; label: string; subField: string; value: string; type: PrivateFieldType };
type PrivateFieldEntry = { section: string; label: string; subField?: string; value: string | number | boolean | string[]; type: PrivateFieldType };

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
  "UFS 4.1",
  "NVMe",
];
const NETWORK_SUPPORT_OPTIONS = ["5G", "4G", "3G", "2G"];
const WIFI_OPTIONS = ["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"];
const BLUETOOTH_OPTIONS = ["4.2", "5.0", "5.1", "5.2", "5.3", "5.4", "6.0"];
const NAVIGATION_OPTIONS = ["GPS", "A-GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "NavIC"];
const CAMERA_MODE_OPTIONS = ["Single Camera", "Dual Camera", "Triple Camera", "Quad Camera"];
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
];
const CSV_TEXT_FIELDS = [
  "cpuFeatures",
  "gpuFeatures",
  "aiFeatures",
  "cameraFeatures",
  "videoRecordingModes",
  "videoFeatures",
  "displayFeatures",
  "audioCodecs",
  "multimediaFeatures",
  "bluetoothFeatures",
];
const PRIVATE_SECTION_SUGGESTIONS = [
  "Basic",
  "Benchmark",
  "CPU",
  "GPU",
  "AI",
  "Memory",
  "Storage",
  "Camera",
  "Video",
  "Display",
  "Multimedia",
  "Connectivity",
  "Charging",
  "Battery",
  "Security",
  "Sensors",
  "Software",
];

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
      { key: "shadingUnits", label: "GPU Shading Units", type: "number" },
      { key: "gpuFrequencyMhz", label: "GPU Frequency (MHz)", type: "number" },
      { key: "vulkanVersion", label: "Vulkan", type: "text" },
      { key: "openclVersion", label: "OpenCL", type: "text" },
      { key: "directxVersion", label: "DirectX", type: "text" },
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
      { key: "memoryBusWidthBits", label: "Memory Bus Width (bits)", type: "number" },
      { key: "maxMemoryGb", label: "Max Memory (GB)", type: "number" },
      { key: "storageType", label: "Storage Type", type: "text" },
      { key: "storageTypes", label: "Storage Types", type: "csv" },
      { key: "bandwidthGbps", label: "Bandwidth (GB/s)", type: "number" },
    ],
  },
  {
    title: "Camera & Video",
    fields: [
      { key: "cameraIsp", label: "Camera ISP", type: "text" },
      { key: "maxCameraSupport", label: "Max Camera Support", type: "text" },
      { key: "cameraSupport", label: "Camera Support", type: "text" },
      { key: "cameraSupportModes", label: "Camera Support Modes", type: "csv" },
      { key: "cameraFeatures", label: "Camera Features", type: "csv" },
      { key: "maxVideoCapture", label: "Max Video Capture", type: "text" },
      { key: "videoCapture", label: "Video Capture", type: "text" },
      { key: "videoRecordingModes", label: "Video Recording Modes", type: "csv" },
      { key: "videoFeatures", label: "Video Features", type: "csv" },
      { key: "videoPlayback", label: "Video Playback", type: "text" },
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
  "Graphics (GPU).shadingUnits": "Total shader/shading units.",
  "Graphics (GPU).gpuFrequencyMhz": "Peak GPU clock in MHz.",
  "Graphics (GPU).vulkanVersion": "Supported Vulkan API version.",
  "Graphics (GPU).openclVersion": "Supported OpenCL version.",
  "Graphics (GPU).directxVersion": "Supported DirectX feature level/version.",
  "Graphics (GPU).gpuFeatures": "Comma separated GPU features.",
  "AI.aiEngine": "NPU/AI engine name.",
  "AI.aiPerformanceTops": "Peak AI throughput in TOPS.",
  "AI.aiPrecision": "Supported AI precision formats (INT8/FP16/etc).",
  "AI.aiFeatures": "Comma separated AI capabilities.",
};

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

function readPrivateFields(raw: unknown): PrivateFieldEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const section = String(row.section || "").trim();
      const label = String(row.label || "").trim();
      const subField = String(row.subField || "").trim();
      const typeRaw = String(row.type || "string");
      const type: PrivateFieldType = typeRaw === "number" || typeRaw === "boolean" || typeRaw === "array" ? typeRaw : "string";
      const value = row.value;
      if (!section || !label) return null;
      return { section, label, subField: subField || undefined, value: value as PrivateFieldEntry["value"], type } as PrivateFieldEntry;
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
  const [cameraSupportModesDraft, setCameraSupportModesDraft] = useState<string[]>([]);
  const [selectedCameraSupportMode, setSelectedCameraSupportMode] = useState("");
  const [displayModesDraft, setDisplayModesDraft] = useState<DisplayModeProfile[]>([{ id: "dm1", mode: "", resolution: "", rr: "" }]);
  const [outputDisplaysDraft, setOutputDisplaysDraft] = useState<DisplayModeProfile[]>([{ id: "od1", mode: "", resolution: "", rr: "" }]);
  const [privateFields, setPrivateFields] = useState<PrivateFieldEntry[]>([]);
  const [privateFieldDraft, setPrivateFieldDraft] = useState<PrivateFieldDraft>({ section: "", label: "", subField: "", value: "", type: "string" });
  const [processorDetailsCollapsed, setProcessorDetailsCollapsed] = useState(false);
  const [maxResolutionManualOverride, setMaxResolutionManualOverride] = useState(false);
  const [maxResolutionRowId, setMaxResolutionRowId] = useState("");
  const topReadOnly = Boolean(existingId);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);
  const slug = useMemo(() => slugify(slugInput || suggestedSlug || name || ""), [name, slugInput, suggestedSlug]);
  const docId = existingId || slug;
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
    const currentSig = JSON.stringify(cameraSupportModesDraft);
    const nextSig = JSON.stringify(values);
    if (currentSig !== nextSig) setCameraSupportModesDraft(values);
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
      .map((row) => ({ ...row, count: Math.max(1, Number(row.count) || 1), ghz: Math.max(0.1, Number(row.ghz) || 0.1), core: row.core.trim() }))
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
    const firstFreq = deduped[0]?.freq;
    setForm((prev) => {
      const current = (prev.detail || {}) as Record<string, unknown>;
      let nextDetail = setByPath(current, "memoryTypes", memoryTypes);
      nextDetail = setByPath(nextDetail, "memoryFreqByType", memoryFreqByType);
      nextDetail = setByPath(nextDetail, "memoryType", memoryTypes[0] || "");
      nextDetail = setByPath(nextDetail, "memoryFreqMhz", firstFreq === "" ? undefined : Number(firstFreq));
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
        createdBy: form.createdBy || creatorName,
        detail: cleanObject((() => {
          const detail = { ...(form.detail || {}) } as Record<string, unknown>;
          CSV_TEXT_FIELDS.forEach((key) => {
            const raw = detail[key];
            if (typeof raw === "string") detail[key] = parseCsv(raw);
          });
          const ins = String(detail.instructionSet || "").trim();
          const bits = String(detail.architectureBits || "").trim();
          if (ins && bits) detail.architecture = `${ins}, ${bits}`;
          return detail;
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

      <form onSubmit={onSave} className="space-y-4">
        <section className="panel p-3.5">
          <h1 className="text-base font-bold text-slate-900">{existingId ? "Edit Processor" : "Create Processor"}</h1>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="grid gap-1">
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Slug</span>
              <input
                value={slug}
                onChange={(e) => setSlugInput(e.target.value)}
                readOnly={topReadOnly}
                className={`h-9 rounded-lg border border-slate-200 px-3 text-sm ${topReadOnly ? "bg-slate-50 text-slate-600" : ""}`}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document ID</span>
              <input value={docId} readOnly className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
            </label>
          </div>
        </section>
        <section className="panel p-4">
          <div className="grid gap-2 sm:max-w-xs">
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

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="panel p-4">
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

          <div className="panel p-4">
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
        {DETAIL_SECTIONS.map((section) => (
          <section key={section.title} className="panel p-5">
            <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
            {section.title === "CPU / Core" ? (
              <>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Core Cluster Builder <span className="normal-case font-medium text-slate-500">(Clock is entered in GHz. Example: 3.2 equals 3200 MHz.)</span>
                  </p>
                  <div className="mt-2 space-y-2">
                    {cpuClusters.map((row) => (
                      <div key={row.id} className="grid gap-2 sm:grid-cols-[70px_minmax(0,1fr)_120px_88px_auto]">
                        <input
                          type="number"
                          min={1}
                          value={row.count}
                          onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, count: Number(e.target.value || 1) } : item)))}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                          title="Core count"
                        />
                        <input
                          list="cpu-core-options"
                          value={row.core}
                          onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, core: e.target.value } : item)))}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                          placeholder="Arm Cortex-X4"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min={0.1}
                          value={row.ghz}
                          onChange={(e) => setCpuClusters((prev) => prev.map((item) => (item.id === row.id ? { ...item, ghz: Number(e.target.value || 0.1) } : item)))}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                          title="Clock (GHz)"
                        />
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
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cores (Raw Data)</span>
                        <input
                          value={String(getDetailField("cores") || "")}
                          onChange={(e) => setDetailField("cores", e.target.value)}
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
                  <input
                    value={csvInputValue(getDetailField("cpuFeatures"))}
                    onChange={(e) => setDetailField("cpuFeatures", e.target.value)}
                    placeholder="Comma separated (e.g. SMT, AV1 decode)"
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  />
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
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Architecture</span>
                    <input
                      value={String(getDetailField("gpuArchitecture") || "")}
                      onChange={(e) => setDetailField("gpuArchitecture", e.target.value)}
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
                <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Other GPU Feature</span>
                    <input
                      value={csvInputValue(getDetailField("gpuFeatures"))}
                      onChange={(e) => setDetailField("gpuFeatures", e.target.value)}
                      placeholder="Comma separated"
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Vulkan</span>
                    <input
                      value={String(getDetailField("vulkanVersion") || "")}
                      onChange={(e) => setDetailField("vulkanVersion", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">OpenCL</span>
                    <input
                      value={String(getDetailField("openclVersion") || "")}
                      onChange={(e) => setDetailField("openclVersion", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">DirectX</span>
                    <input
                      value={String(getDetailField("directxVersion") || "")}
                      onChange={(e) => setDetailField("directxVersion", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            ) : null}
            {section.title === "Memory / Storage" ? (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-1">
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
                  <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
                    <div className="grid gap-3 lg:grid-cols-3">
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
                        <input
                          value={csvInputValue(getDetailField("displayFeatures"))}
                          onChange={(e) => setDetailField("displayFeatures", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Audio Codecs <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                        <input
                          value={csvInputValue(getDetailField("audioCodecs"))}
                          onChange={(e) => setDetailField("audioCodecs", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Multimedia Features <span className="normal-case tracking-normal text-slate-500">(comma separated)</span></span>
                        <input
                          value={csvInputValue(getDetailField("multimediaFeatures"))}
                          onChange={(e) => setDetailField("multimediaFeatures", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
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
                    <input
                      value={csvInputValue(getDetailField("bluetoothFeatures"))}
                      onChange={(e) => setDetailField("bluetoothFeatures", e.target.value)}
                      placeholder="Comma separated (e.g. LE Audio, aptX)"
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    />
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
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Wireless Charging Support</span>
                    <select
                      value={String(getDetailField("wirelessChargingSupport") || "")}
                      onChange={(e) => setDetailField("wirelessChargingSupport", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    >
                      <option value="">Not Available</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Wireless Charging Value</span>
                    <input
                      value={String(getDetailField("wirelessCharging") || "")}
                      onChange={(e) => setDetailField("wirelessCharging", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="e.g. 15W, 50% in 45 min"
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
                if (section.title === "CPU / Core" && (field.key === "coreCount" || field.key === "instructionSet" || field.key === "architectureBits" || field.key === "process" || field.key === "tdpW" || field.key === "transistorCount" || field.key === "coreConfiguration" || field.key === "cores" || field.key === "l2Cache" || field.key === "l3Cache" || field.key === "cpuFeatures")) {
                  return null;
                }
                if (section.title === "Graphics (GPU)" && (field.key === "gpuName" || field.key === "gpuArchitecture" || field.key === "pipelines" || field.key === "gpuFrequencyMhz" || field.key === "gpuFeatures" || field.key === "vulkanVersion" || field.key === "openclVersion" || field.key === "directxVersion")) {
                  return null;
                }
                if (section.title === "Memory / Storage" && (field.key === "memoryType" || field.key === "memoryTypes" || field.key === "memoryFreqMhz" || field.key === "memoryFreqByType" || field.key === "memoryChannels" || field.key === "maxMemoryGb" || field.key === "memoryBusWidthBits" || field.key === "bandwidthGbps" || field.key === "storageType" || field.key === "storageTypes")) {
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
                    {field.key === "maxCameraSupport" ? (
                      <select
                        value={value ? String(value) : ""}
                        onChange={(e) => setDetailField(field.key, e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <option value="">Select Camera Support</option>
                        {CAMERA_MODE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : null}
                    {field.key === "cameraSupportModes" ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <select
                            value={selectedCameraSupportMode}
                            onChange={(e) => setSelectedCameraSupportMode(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                          >
                            <option value="">Select Camera Mode</option>
                            {CAMERA_MODE_OPTIONS.map((item) => (
                              <option key={item} value={item} disabled={cameraSupportModesDraft.includes(item)}>
                                {item}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const value = selectedCameraSupportMode.trim();
                              if (!value || cameraSupportModesDraft.includes(value)) return;
                              const next = [...cameraSupportModesDraft, value];
                              setCameraSupportModesDraft(next);
                              setDetailField("cameraSupportModes", next);
                              setSelectedCameraSupportMode("");
                            }}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cameraSupportModesDraft.map((item) => (
                            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                              {item}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = cameraSupportModesDraft.filter((x) => x !== item);
                                  setCameraSupportModesDraft(next);
                                  setDetailField("cameraSupportModes", next);
                                }}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {field.type === "text" && field.key !== "instructionSet" && field.key !== "architectureBits" && field.key !== "process" && field.key !== "maxCameraSupport" ? <input value={value ? String(value) : ""} onChange={(e) => setDetailField(field.key, e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
                    {field.type === "number" ? <input type="number" step="any" value={value === undefined ? "" : String(value)} onChange={(e) => setDetailField(field.key, e.target.value === "" ? undefined : Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
                    {field.type === "csv" && field.key !== "cameraSupportModes" ? <input value={csvInputValue(value)} onChange={(e) => setDetailField(field.key, e.target.value)} placeholder="Comma separated (e.g. HDR, Ray tracing)" className="rounded-lg border border-slate-200 px-3 py-2" /> : null}
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
          </section>
        ))}

        <section className="panel p-5">
          <h2 className="text-base font-bold text-slate-900">Private Admin Fields</h2>
          <p className="mt-1 text-xs text-slate-500">Saved in Firebase for internal use only. Not shown on public page.</p>
          {privateFields.length ? (
            <div className="mt-3 space-y-2">
              {privateFields.map((row, idx) => (
                <div key={`${row.section}-${row.label}-${idx}`} className="grid items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 lg:grid-cols-[1.15fr_1fr_1fr_0.95fr_1.6fr]">
                  <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-800">{idx + 1}. {row.section || ""}</span>
                  <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800">{row.label || ""}</span>
                  <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800">{row.subField || ""}</span>
                  <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 capitalize">{row.type}</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800">{formatPrivateFieldValue(row.value, row.type)}</span>
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
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-[1.15fr_1fr_1fr_0.95fr_1.6fr]">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
              <input
                list="private-section-options"
                value={privateFieldDraft.section}
                onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, section: e.target.value }))}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Type section"
              />
              <datalist id="private-section-options">
                {PRIVATE_SECTION_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Label</span>
              <input
                value={privateFieldDraft.label}
                onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, label: e.target.value }))}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Field label"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Sub Field</span>
              <input
                value={privateFieldDraft.subField}
                onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, subField: e.target.value }))}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</span>
                <select
                  value={privateFieldDraft.type}
                  onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, type: e.target.value as PrivateFieldType, value: "" }))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                  <option value="timestamp">Timestamp</option>
                </select>
            </label>
            <div className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Value</span>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                {privateFieldDraft.type === "boolean" ? (
                  <select
                    value={privateFieldDraft.value}
                    onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, value: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : privateFieldDraft.type === "timestamp" ? (
                  <input
                    type="date"
                    value={privateFieldDraft.value}
                    onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, value: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                ) : (
                  <input
                    value={privateFieldDraft.value}
                    onChange={(e) => setPrivateFieldDraft((prev) => ({ ...prev, value: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder={privateFieldDraft.type === "array" ? "Comma separated values" : privateFieldDraft.type === "number" ? "Number value" : "Text value"}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const section = privateFieldDraft.section.trim();
                    const label = privateFieldDraft.label.trim();
                    if (!section || !label) return;
                    const nextEntry: PrivateFieldEntry = {
                      section,
                      label,
                      subField: privateFieldDraft.subField.trim() || undefined,
                      value: parsePrivateFieldValue(privateFieldDraft.value, privateFieldDraft.type),
                      type: privateFieldDraft.type,
                    };
                    const next = [...privateFields, nextEntry];
                    setPrivateFields(next);
                    setDetailField("adminPrivateFields", next);
                    setPrivateFieldDraft((prev) => ({ ...prev, label: "", subField: "", value: "", type: "string" }));
                  }}
                  className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>
            </div>
          ) : null}
        </section>

        <div className="pb-8">
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : existingId ? "Update Processor" : "Create Processor"}
          </button>
        </div>
      </form>
    </main>
  );
}
