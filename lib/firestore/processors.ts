import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ProcessorProfile } from "@/lib/processors/profiles";
import type { ProcessorDetail } from "@/lib/processors/details";
import { slugify } from "@/utils/slugify";

const processorsRef = adminDb.collection("processors");
const RESERVED_PROCESSOR_KEYS = new Set([
  "name",
  "vendor",
  "type",
  "antutu",
  "fabricationNm",
  "maxCpuGhz",
  "gpu",
  "avgPhoneScore",
  "detail",
  "createdBy",
  "status",
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "id",
  "slug",
]);

export type ProcessorAdmin = {
  id?: string;
  name: string;
  vendor: string;
  type?: string;
  antutu: number;
  fabricationNm?: number;
  maxCpuGhz?: number;
  gpu?: string;
  avgPhoneScore?: number;
  detail?: ProcessorDetail;
  createdBy?: string;
  status?: "draft" | "review" | "published" | "scheduled" | "recently_deleted";
  scheduledAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const CLASS_OPTIONS = ["Flagship", "Upper Midrange", "Midrange", "Budget", "Entry"] as const;
const CLASS_ALIAS_MAP: Record<string, string> = {
  ultraflagship: "Flagship",
};
const INSTRUCTION_SET_OPTIONS = ["ARMv8-A", "ARMv8.2-A", "ARMv8.4-A", "ARMv8.5-A", "ARMv8.6-A", "ARMv9-A", "ARMv9.2-A", "ARMv9.3-A", "x86-64"] as const;
const INSTRUCTION_SET_ALIAS_MAP: Record<string, string> = {
  armv84: "ARMv8.4-A",
  armv84a: "ARMv8.4-A",
  "84a": "ARMv8.4-A",
  "84": "ARMv8.4-A",
  armv85: "ARMv8.5-A",
  armv85a: "ARMv8.5-A",
  "85a": "ARMv8.5-A",
  "85": "ARMv8.5-A",
  armv86: "ARMv8.6-A",
  armv86a: "ARMv8.6-A",
  "86a": "ARMv8.6-A",
  "86": "ARMv8.6-A",
  armv93: "ARMv9.3-A",
  armv93a: "ARMv9.3-A",
  "93a": "ARMv9.3-A",
  "93": "ARMv9.3-A",
};
const ARCHITECTURE_BITS_OPTIONS = ["64bit", "32bit"] as const;
const MEMORY_CHANNEL_OPTIONS = ["Single-channel", "Dual-channel", "Triple-channel", "Quad-channel", "Octa-channel"] as const;
const NETWORK_SUPPORT_ORDER = ["5G", "4G", "3G", "2G"] as const;
const VIDEO_CODEC_ORDER = ["H.264", "H.265/HEVC", "APV", "AV1", "VP8", "VP9", "MPEG-1/2/4", "MPEG-4", "Motion JPEG"] as const;
const VIDEO_HDR_ORDER = ["HDR", "HDR10", "HDR10+", "Ultra HDR", "HDR Vivid", "HLG", "Dolby Vision"] as const;
const NAVIGATION_ORDER = ["GPS", "A-GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "NavIC"] as const;
const GNSS_TYPE_OPTIONS = ["Single GNSS", "Dual GNSS (L1/L5)", "Triple GNSS (L1/L5/L2)", "Quad GNSS (L1/L5/L2/L6)"] as const;
const WIFI_OPTIONS = ["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"] as const;
const BLUETOOTH_OPTIONS = ["4.2", "5.0", "5.1", "5.2", "5.3", "5.4", "6.0"] as const;
const MANUFACTURER_OPTIONS = ["TSMC", "Samsung"] as const;

const VIDEO_CODEC_ALIAS_MAP: Record<string, string> = {
  h264: "H.264",
  h265: "H.265/HEVC",
  hevc: "H.265/HEVC",
  h265hevc: "H.265/HEVC",
  apv: "APV",
  av1: "AV1",
  vp8: "VP8",
  vp9: "VP9",
  mpeg: "MPEG-1/2/4",
  mpeg4: "MPEG-4",
  mpeg124: "MPEG-1/2/4",
  motionjpeg: "Motion JPEG",
  mjpeg: "Motion JPEG",
};

const VIDEO_HDR_ALIAS_MAP: Record<string, string> = {
  hdr: "HDR",
  hdr10: "HDR10",
  hdr10plus: "HDR10+",
  ultrahdr: "Ultra HDR",
  hdrvivid: "HDR Vivid",
  vivid: "HDR Vivid",
  hlg: "HLG",
  hybridloggamma: "HLG",
  dolbyvision: "Dolby Vision",
};

const NAVIGATION_ALIAS_MAP: Record<string, string> = {
  gps: "GPS",
  agps: "A-GPS",
  glonass: "GLONASS",
  galileo: "Galileo",
  beidou: "BeiDou",
  qzss: "QZSS",
  irnss: "NavIC",
  navic: "NavIC",
  navicirnss: "NavIC",
};

function normalizeLookupKey(value: unknown): string {
  return String(value || "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeWhitespace(value: unknown): string {
  return String(value || "")
    .replace(/[??]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function listFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => normalizeWhitespace(item)).filter(Boolean);
  const raw = normalizeWhitespace(value);
  if (!raw) return [];
  return raw.split(/[|,]/).map((item) => normalizeWhitespace(item)).filter(Boolean);
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((item) => {
    const key = normalizeLookupKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function normalizeChoice(value: unknown, options: readonly string[], aliases: Record<string, string> = {}): string {
  const raw = normalizeWhitespace(value);
  if (!raw) return "";
  const key = normalizeLookupKey(raw);
  const aliased = aliases[key];
  if (aliased) return aliased;
  const exact = options.find((item) => normalizeLookupKey(item) === key);
  return exact || raw;
}

function normalizeOrderedSet(value: unknown, order: readonly string[], aliases: Record<string, string> = {}): string[] {
  const known = new Set<string>();
  const custom: string[] = [];
  const seenCustom = new Set<string>();
  listFromUnknown(value).forEach((item) => {
    const normalized = normalizeChoice(item, order, aliases);
    if (!normalized) return;
    if (order.includes(normalized as never)) {
      known.add(normalized);
      return;
    }
    const key = normalizeLookupKey(normalized);
    if (!key || seenCustom.has(key)) return;
    seenCustom.add(key);
    custom.push(normalized);
  });
  return [...order.filter((item) => known.has(item)), ...custom];
}

function normalizeBenchmarkLabel(value: unknown): string {
  const raw = normalizeWhitespace(value);
  if (!raw) return "";
  const compact = normalizeLookupKey(raw);
  if (compact == "wildlife") return "Wild Life";
  if (compact == "wildlifeextreme") return "Wild Life Extreme";
  return raw;
}

function normalizeCacheSize(value: unknown): string | undefined {
  const raw = normalizeWhitespace(value);
  if (!raw) return undefined;
  const match = raw.match(/^([\d.]+)\s*(kb|mb)?/i);
  if (!match?.[1]) return raw;
  return `${match[1]}${String(match[2] || "MB").toUpperCase()}`;
}

function normalizeTransistorCount(value: unknown): string | undefined {
  const raw = normalizeWhitespace(value);
  if (!raw) return undefined;
  const match = raw.match(/^([\d.]+)\s*(million|billion|trillion)?/i);
  if (!match?.[1]) return raw;
  return `${match[1]} ${String(match[2] || "billion").toLowerCase()}`;
}

function normalizeSeo(seo: ProcessorDetail["seo"] | undefined): ProcessorDetail["seo"] | undefined {
  if (!seo || typeof seo !== "object") return undefined;
  return {
    metaTitle: normalizeWhitespace(seo.metaTitle) || undefined,
    metaDescription: normalizeWhitespace(seo.metaDescription) || undefined,
    canonicalUrl: normalizeWhitespace(seo.canonicalUrl) || undefined,
    summary: normalizeWhitespace(seo.summary) || undefined,
    focusKeyword: normalizeWhitespace(seo.focusKeyword) || undefined,
    tags: dedupeStrings(listFromUnknown(seo.tags)),
    ogImage: normalizeWhitespace(seo.ogImage) || undefined,
    noIndex: typeof seo.noIndex === "boolean" ? seo.noIndex : undefined,
  };
}

function normalizeProcessorDetail(detail: ProcessorDetail | undefined): ProcessorDetail | undefined {
  if (!detail || typeof detail !== "object") return undefined;
  const next: ProcessorDetail = { ...detail };
  next.seo = normalizeSeo(detail.seo);
  next.manufacturer = normalizeChoice(detail.manufacturer, MANUFACTURER_OPTIONS) || undefined;
  next.className = normalizeChoice(detail.className, CLASS_OPTIONS, CLASS_ALIAS_MAP) || undefined;
  next.model = normalizeWhitespace(detail.model) || undefined;
  next.announced = normalizeWhitespace(detail.announced) || undefined;
  next.coreConfiguration = normalizeWhitespace(detail.coreConfiguration) || undefined;
  next.cores = normalizeWhitespace(detail.cores) || undefined;
  next.instructionSet = normalizeChoice(detail.instructionSet, INSTRUCTION_SET_OPTIONS, INSTRUCTION_SET_ALIAS_MAP) || undefined;
  next.architectureBits = normalizeChoice(detail.architectureBits, ARCHITECTURE_BITS_OPTIONS) || undefined;
  next.process = normalizeWhitespace(detail.process) || undefined;
  next.transistorCount = normalizeTransistorCount(detail.transistorCount);
  next.l2Cache = normalizeCacheSize(detail.l2Cache);
  next.l3Cache = normalizeCacheSize(detail.l3Cache);
  next.slcCache = normalizeCacheSize(detail.slcCache);
  next.cpuFeatures = dedupeStrings(listFromUnknown(detail.cpuFeatures));
  next.memoryType = normalizeWhitespace(detail.memoryType) || undefined;
  next.memoryTypes = dedupeStrings(listFromUnknown(detail.memoryTypes));
  next.memoryChannels = normalizeChoice(detail.memoryChannels, MEMORY_CHANNEL_OPTIONS) || undefined;
  next.storageType = normalizeWhitespace(detail.storageType) || undefined;
  next.storageTypes = dedupeStrings(listFromUnknown(detail.storageTypes));
  next.storageChannels = normalizeWhitespace(detail.storageChannels) || undefined;
  next.gpuName = normalizeWhitespace(detail.gpuName) || undefined;
  next.gpuArchitecture = normalizeWhitespace(detail.gpuArchitecture) || undefined;
  next.gpuApis = dedupeStrings(listFromUnknown(detail.gpuApis));
  next.gpuFeatures = dedupeStrings(listFromUnknown(detail.gpuFeatures));
  next.aiEngine = normalizeWhitespace(detail.aiEngine) || undefined;
  next.aiPrecision = normalizeWhitespace(detail.aiPrecision) || undefined;
  next.aiFeatures = dedupeStrings(listFromUnknown(detail.aiFeatures));
  next.modem = normalizeWhitespace(detail.modem) || undefined;
  next.networkSupport = normalizeOrderedSet(detail.networkSupport, NETWORK_SUPPORT_ORDER);
  next.lteCat = normalizeWhitespace(detail.lteCat) || undefined;
  next.wifi = normalizeChoice(detail.wifi, WIFI_OPTIONS) || undefined;
  next.bluetooth = normalizeChoice(detail.bluetooth, BLUETOOTH_OPTIONS) || undefined;
  next.bluetoothFeatures = dedupeStrings(listFromUnknown(detail.bluetoothFeatures));
  next.gnssType = normalizeChoice(detail.gnssType, GNSS_TYPE_OPTIONS) || undefined;
  next.quickCharging = normalizeWhitespace(detail.quickCharging) || undefined;
  next.chargingSpeed = normalizeWhitespace(detail.chargingSpeed) || undefined;
  next.navigation = normalizeOrderedSet(detail.navigation, NAVIGATION_ORDER, NAVIGATION_ALIAS_MAP);
  next.cameraIsp = normalizeWhitespace(detail.cameraIsp) || undefined;
  next.cameraSupportModes = dedupeStrings(listFromUnknown(detail.cameraSupportModes));
  next.cameraFeatures = dedupeStrings(listFromUnknown(detail.cameraFeatures));
  next.maxVideoCapture = normalizeWhitespace(detail.maxVideoCapture) || undefined;
  next.videoCapture = normalizeWhitespace(detail.videoCapture) || undefined;
  next.videoRecordingModes = dedupeStrings(listFromUnknown(detail.videoRecordingModes));
  next.videoRecordingCodecs = normalizeOrderedSet(detail.videoRecordingCodecs, VIDEO_CODEC_ORDER, VIDEO_CODEC_ALIAS_MAP);
  next.videoRecordingHdrFormats = normalizeOrderedSet(detail.videoRecordingHdrFormats, VIDEO_HDR_ORDER, VIDEO_HDR_ALIAS_MAP);
  next.videoFeatures = dedupeStrings(listFromUnknown(detail.videoFeatures));
  next.videoPlayback = normalizeWhitespace(detail.videoPlayback) || undefined;
  next.videoPlaybackCodecs = normalizeOrderedSet(detail.videoPlaybackCodecs, VIDEO_CODEC_ORDER, VIDEO_CODEC_ALIAS_MAP);
  next.videoPlaybackHdrFormats = normalizeOrderedSet(detail.videoPlaybackHdrFormats, VIDEO_HDR_ORDER, VIDEO_HDR_ALIAS_MAP);
  next.maxDisplayResolution = normalizeWhitespace(detail.maxDisplayResolution) || undefined;
  next.displayModes = dedupeStrings(listFromUnknown(detail.displayModes));
  next.outputDisplay = normalizeWhitespace(detail.outputDisplay) || undefined;
  next.displayFeatures = dedupeStrings(listFromUnknown(detail.displayFeatures));
  next.audioCodecs = dedupeStrings(listFromUnknown(detail.audioCodecs));
  next.multimediaFeatures = dedupeStrings(listFromUnknown(detail.multimediaFeatures));
  next.sourceUrl = normalizeWhitespace(detail.sourceUrl) || undefined;
  next.benchmarks = detail.benchmarks
      ? {
        ...detail.benchmarks,
        antutuCalcVersion: normalizeWhitespace(detail.benchmarks.antutuCalcVersion) || undefined,
        antutuVersion: normalizeWhitespace(detail.benchmarks.antutuVersion) || undefined,
        geekbenchVersion: normalizeWhitespace(detail.benchmarks.geekbenchVersion) || undefined,
        threeDMarkName: normalizeBenchmarkLabel(detail.benchmarks.threeDMarkName) || undefined,
      }
    : undefined;
  return next;
}

function normalize(input: Partial<ProcessorAdmin>): ProcessorAdmin {
  const status =
    input.status === "draft" || input.status === "review" || input.status === "scheduled" || input.status === "recently_deleted"
      ? input.status
      : "published";
  const scheduledAt = status === "scheduled" ? String(input.scheduledAt || "").trim() : "";

  return {
    name: String(input.name || "").trim(),
    vendor: String(input.vendor || "").trim() || "Other",
    type: String(input.type || "processor").trim() || "processor",
    antutu: Number(input.antutu || 0),
    fabricationNm: Number.isFinite(Number(input.fabricationNm)) && Number(input.fabricationNm) > 0 ? Number(input.fabricationNm) : undefined,
    maxCpuGhz: Number.isFinite(Number(input.maxCpuGhz)) && Number(input.maxCpuGhz) > 0 ? Number(input.maxCpuGhz) : undefined,
    gpu: String(input.gpu || "").trim() || undefined,
    avgPhoneScore: Number.isFinite(Number(input.avgPhoneScore)) ? Number(input.avgPhoneScore) : 0,
    detail: normalizeProcessorDetail(input.detail && typeof input.detail === "object" ? (input.detail as ProcessorDetail) : undefined),
    createdBy: String(input.createdBy || "").trim() || undefined,
    status,
    scheduledAt: scheduledAt || undefined,
  };
}

function stripUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .map(([key, value]) => [key, stripUndefinedDeep(value)])
        .filter(([, value]) => value !== undefined)
    ) as T;
  }
  return input;
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return stripUndefinedDeep(input) as Partial<T>;
}

function extractNm(text?: string): number | undefined {
  const raw = String(text || "");
  const match = raw.match(/(\d+(\.\d+)?)\s*nm/i);
  if (match) {
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : undefined;
  }
  const numericOnly = raw.trim();
  if (/^\d+(\.\d+)?$/.test(numericOnly)) {
    const n = Number(numericOnly);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function hydrate(id: string, input: Partial<ProcessorAdmin>): ProcessorAdmin {
  const row = normalize(input);
  return {
    id,
    ...row,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export async function listAllProcessorsAdmin(): Promise<ProcessorAdmin[]> {
  const snapshot = await processorsRef.limit(1000).get();
  return snapshot.docs
    .map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorAdmin>))
    .sort((a, b) => (b.antutu || 0) - (a.antutu || 0));
}

export async function createProcessor(data: ProcessorAdmin): Promise<string> {
  const payload = normalize(data);
  if (!payload.name) throw new Error("Processor name is required.");
  const explicitId = String(data.id || "").trim();
  const writePayload = {
    ...stripUndefined(payload as unknown as Record<string, unknown>),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (explicitId) {
    const ref = processorsRef.doc(explicitId);
    const existing = await ref.get();
    if (existing.exists) throw new Error("Processor with same Document ID already exists.");
    await ref.set(writePayload);
    return explicitId;
  }
  const created = await processorsRef.add(writePayload);
  return created.id;
}

export async function updateProcessor(id: string, data: Partial<ProcessorAdmin>): Promise<void> {
  const ref = processorsRef.doc(id);
  const existingSnap = await ref.get();
  if (!existingSnap.exists) throw new Error("Processor not found.");

  const existingRaw = (existingSnap.data() || {}) as Partial<ProcessorAdmin> & { createdAt?: unknown };
  const hasDetail = Object.prototype.hasOwnProperty.call(data, "detail");
  const mergedInput: Partial<ProcessorAdmin> = {
    ...existingRaw,
    ...data,
    detail: hasDetail ? data.detail : existingRaw.detail,
  };

  const payload = normalize(mergedInput);
  if (!payload.name) throw new Error("Processor name is required.");
  await ref.set(
    {
      ...stripUndefined(payload as unknown as Record<string, unknown>),
      createdAt: existingRaw.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false }
  );
}

export async function deleteProcessor(id: string): Promise<void> {
  await processorsRef.doc(id).delete();
}

export async function normalizeAllProcessorsAdminData(): Promise<{ processed: number }> {
  const snapshot = await processorsRef.limit(1000).get();
  let processed = 0;
  let batch = adminDb.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const raw = (doc.data() || {}) as Partial<ProcessorAdmin> & { createdAt?: unknown };
    const payload = normalize(raw);
    batch.set(
      doc.ref,
      {
        ...stripUndefined(payload as unknown as Record<string, unknown>),
        createdAt: raw.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false }
    );
    processed += 1;
    batchCount += 1;
    if (batchCount >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  return { processed };
}

export async function getProcessorAdminById(id: string): Promise<ProcessorAdmin | null> {
  const snap = await processorsRef.doc(id).get();
  if (!snap.exists) return null;
  return hydrate(snap.id, snap.data() as Partial<ProcessorAdmin>);
}

export async function listPublishedCustomProcessorProfiles(): Promise<ProcessorProfile[]> {
  const snapshot = await processorsRef.where("status", "==", "published").limit(1000).get();
  return snapshot.docs
    .map((doc) => {
      const raw = (doc.data() || {}) as Partial<ProcessorAdmin> & Record<string, unknown>;
      const row = hydrate(doc.id, raw);
      const nestedDetail = (raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail))
        ? (raw.detail as Record<string, unknown>)
        : {};
      const topLevelDetail = Object.fromEntries(
        Object.entries(raw).filter(([key]) => !RESERVED_PROCESSOR_KEYS.has(key))
      );
      const detail = {
        ...topLevelDetail,
        ...nestedDetail,
      } as Record<string, unknown>;
      const processRaw = String(detail.process ?? raw.process ?? row.detail?.process ?? "").trim();
      const fabricationNm = row.fabricationNm ?? extractNm(processRaw);
      const benchmarks =
        detail.benchmarks && typeof detail.benchmarks === "object" && !Array.isArray(detail.benchmarks)
          ? (detail.benchmarks as Record<string, unknown>)
          : {};
      const normalAntutu = Number(benchmarks.antutu || 0);
      const fallbackAntutu = Number(row.antutu || 0);
      return {
        slug: slugify(String(row.id || row.name || "")),
        name: row.name,
        vendor: row.vendor,
        antutu: normalAntutu > 0 ? normalAntutu : fallbackAntutu,
        fabricationNm,
        process: processRaw || undefined,
        maxCpuGhz: row.maxCpuGhz,
        gpu: row.gpu,
        phoneCount: 0,
        avgPhoneScore: Number(row.avgPhoneScore || 0),
        topPhones: [],
      };
    })
    .filter((row) => Boolean(row.name))
    .sort((a, b) => (b.antutu || 0) - (a.antutu || 0));
}

export async function listPublishedCustomProcessorDetailsBySlug(): Promise<Record<string, ProcessorDetail>> {
  const snapshot = await processorsRef.where("status", "==", "published").limit(1000).get();
  const out: Record<string, ProcessorDetail> = {};
  snapshot.docs.forEach((doc) => {
    const raw = (doc.data() || {}) as Record<string, unknown>;
    const row = hydrate(doc.id, raw as Partial<ProcessorAdmin>);

    const nestedDetail =
      raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail)
        ? (raw.detail as Record<string, unknown>)
        : {};
    const topLevelDetail = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !RESERVED_PROCESSOR_KEYS.has(key))
    );
    const mergedDetail = {
      ...topLevelDetail,
      ...nestedDetail,
    } as ProcessorDetail;

    if (!mergedDetail || typeof mergedDetail !== "object" || Object.keys(mergedDetail as Record<string, unknown>).length === 0) return;

    const keys = new Set<string>([
      slugify(String(row.name || "")),
      slugify(String(row.id || "")),
      slugify(String(raw.slug || "")),
    ]);
    keys.forEach((key) => {
      if (!key) return;
      out[key] = mergedDetail;
    });
  });
  return out;
}






