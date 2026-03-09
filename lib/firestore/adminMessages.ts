import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const messagesRef = adminDb.collection("admin_messages");

export type AdminMessage = {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "resolved";
  source?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalize(input: Partial<AdminMessage>): AdminMessage {
  const status = input.status === "read" || input.status === "resolved" ? input.status : "new";
  return {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim(),
    subject: String(input.subject || "").trim(),
    message: String(input.message || "").trim(),
    status,
    source: String(input.source || "").trim() || undefined,
  };
}

export async function listAdminMessages(): Promise<AdminMessage[]> {
  const snapshot = await messagesRef.limit(1000).get();
  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as AdminMessage),
  }));
  items.sort((a, b) => {
    const left = Number((a.createdAt as { seconds?: number } | undefined)?.seconds || 0);
    const right = Number((b.createdAt as { seconds?: number } | undefined)?.seconds || 0);
    return right - left;
  });
  return items;
}

export async function createAdminMessage(input: AdminMessage): Promise<string> {
  const payload = normalize(input);
  if (!payload.message) throw new Error("message is required.");
  const doc = await messagesRef.add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return doc.id;
}

export async function updateAdminMessage(id: string, input: Partial<AdminMessage>): Promise<void> {
  const payload = normalize(input);
  await messagesRef.doc(id).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteAdminMessage(id: string): Promise<void> {
  await messagesRef.doc(id).delete();
}

