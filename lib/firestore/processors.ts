import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ProcessorProfile } from "@/lib/processors/profiles";

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
  status?: "draft" | "published" | "scheduled";
  scheduledAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalize(input: Partial<ProcessorAdmin>): ProcessorAdmin {
  const status = input.status === "draft" || input.status === "scheduled" ? input.status : "published";
  const scheduledAt = status === "scheduled" ? String(input.scheduledAt || "").trim() : "";

  return {
    name: String(input.name || "").trim(),
    vendor: String(input.vendor || "").trim() || "Other",
    antutu: Number(input.antutu || 0),
    fabricationNm: Number.isFinite(Number(input.fabricationNm)) && Number(input.fabricationNm) > 0 ? Number(input.fabricationNm) : undefined,
    maxCpuGhz: Number.isFinite(Number(input.maxCpuGhz)) && Number(input.maxCpuGhz) > 0 ? Number(input.maxCpuGhz) : undefined,
    gpu: String(input.gpu || "").trim() || undefined,
    avgPhoneScore: Number.isFinite(Number(input.avgPhoneScore)) ? Number(input.avgPhoneScore) : 0,
    status,
    scheduledAt: scheduledAt || undefined,
  };
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
  const created = await processorsRef.add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return created.id;
}

export async function updateProcessor(id: string, data: Partial<ProcessorAdmin>): Promise<void> {
  const payload = normalize(data);
  if (!payload.name) throw new Error("Processor name is required.");
  await processorsRef.doc(id).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteProcessor(id: string): Promise<void> {
  await processorsRef.doc(id).delete();
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
