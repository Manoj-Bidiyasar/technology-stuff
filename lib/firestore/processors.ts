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
    detail: input.detail && typeof input.detail === "object" ? (input.detail as ProcessorDetail) : undefined,
    createdBy: String(input.createdBy || "").trim() || undefined,
    status,
    scheduledAt: scheduledAt || undefined,
  };
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
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
      const detail = (raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail))
        ? (raw.detail as Record<string, unknown>)
        : {};
      const processRaw = String(detail.process ?? raw.process ?? row.detail?.process ?? "").trim();
      const fabricationNm = row.fabricationNm ?? extractNm(processRaw);
      return {
        slug: slugify(String(row.id || row.name || "")),
        name: row.name,
        vendor: row.vendor,
        antutu: Number(row.antutu || 0),
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
