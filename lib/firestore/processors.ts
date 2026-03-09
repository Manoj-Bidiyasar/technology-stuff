import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ProcessorProfile } from "@/lib/processors/profiles";
import type { ProcessorDetail } from "@/lib/processors/details";
import { slugify } from "@/utils/slugify";

const processorsRef = adminDb.collection("processors");

export type ProcessorAdmin = {
  id?: string;
  name: string;
  vendor: string;
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
  const payload = normalize(data);
  if (!payload.name) throw new Error("Processor name is required.");
  await processorsRef.doc(id).set(
    {
      ...stripUndefined(payload as unknown as Record<string, unknown>),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
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
    .map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorAdmin>))
    .filter((row) => Boolean(row.name))
    .map((row) => ({
      slug: "",
      name: row.name,
      vendor: row.vendor,
      antutu: Number(row.antutu || 0),
      fabricationNm: row.fabricationNm,
      maxCpuGhz: row.maxCpuGhz,
      gpu: row.gpu,
      phoneCount: 0,
      avgPhoneScore: Number(row.avgPhoneScore || 0),
      topPhones: [],
    }))
    .sort((a, b) => (b.antutu || 0) - (a.antutu || 0));
}

export async function listPublishedCustomProcessorDetailsBySlug(): Promise<Record<string, ProcessorDetail>> {
  const snapshot = await processorsRef.where("status", "==", "published").limit(1000).get();
  const out: Record<string, ProcessorDetail> = {};
  snapshot.docs
    .map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorAdmin>))
    .forEach((row) => {
      const key = slugify(String(row.name || ""));
      if (!key || !row.detail || typeof row.detail !== "object") return;
      out[key] = row.detail;
    });
  return out;
}
