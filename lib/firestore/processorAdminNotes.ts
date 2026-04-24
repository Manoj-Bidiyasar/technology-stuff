import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { slugify } from "@/utils/slugify";

const processorAdminNotesRef = adminDb.collection("processor_admin_notes");

export type ProcessorAdminNoteGroup = {
  id?: string;
  processorName: string;
  vendor?: string;
  items: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalizeLine(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function dedupeItems(values: unknown): string[] {
  const list = Array.isArray(values) ? values : [];
  const out: string[] = [];
  const seen = new Set<string>();
  list.forEach((item) => {
    const normalized = normalizeLine(item);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });
  return out;
}

function normalize(input: Partial<ProcessorAdminNoteGroup>): ProcessorAdminNoteGroup {
  return {
    processorName: normalizeLine(input.processorName),
    vendor: normalizeLine(input.vendor) || undefined,
    items: dedupeItems(input.items),
  };
}

function hydrate(id: string, input: Partial<ProcessorAdminNoteGroup>): ProcessorAdminNoteGroup {
  const row = normalize(input);
  return {
    id,
    ...row,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export async function listProcessorAdminNotes(): Promise<ProcessorAdminNoteGroup[]> {
  const snapshot = await processorAdminNotesRef.limit(2000).get();
  return snapshot.docs.map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorAdminNoteGroup>));
}

export async function upsertProcessorAdminNoteGroup(data: Partial<ProcessorAdminNoteGroup>): Promise<string> {
  const payload = normalize(data);
  if (!payload.processorName) throw new Error("Processor name is required.");
  if (!payload.items.length) throw new Error("At least one note point is required.");

  const id = slugify(payload.processorName);
  const ref = processorAdminNotesRef.doc(id);
  const existing = await ref.get();
  await ref.set(
    {
      ...payload,
      createdAt: existing.exists ? existing.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false }
  );
  return id;
}

export async function deleteProcessorAdminNoteGroup(id: string): Promise<void> {
  await processorAdminNotesRef.doc(id).delete();
}
