import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminRole } from "@/lib/admin/permissions";

const adminUsersRef = adminDb.collection("admin_users");

export type AdminUserRecord = {
  uid: string;
  email: string;
  role: AdminRole;
  status: "active" | "suspended";
  allowedDeviceIds?: string[];
  maxConcurrentSessions?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalize(input: Partial<AdminUserRecord>): AdminUserRecord {
  const role = input.role === "super_admin" || input.role === "editor" ? input.role : "admin";
  const status = input.status === "suspended" ? "suspended" : "active";
  const allowedDeviceIds = Array.isArray(input.allowedDeviceIds)
    ? input.allowedDeviceIds.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const maxConcurrentSessions = Number(input.maxConcurrentSessions || 1);

  return {
    uid: String(input.uid || "").trim(),
    email: String(input.email || "").trim(),
    role,
    status,
    allowedDeviceIds,
    maxConcurrentSessions: Number.isFinite(maxConcurrentSessions) && maxConcurrentSessions > 0 ? Math.floor(maxConcurrentSessions) : 1,
  };
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const snapshot = await adminUsersRef.limit(1000).get();
  return snapshot.docs
    .map((doc) => {
      const row = normalize({ uid: doc.id, ...(doc.data() as Partial<AdminUserRecord>) });
      return {
        ...row,
        createdAt: doc.get("createdAt"),
        updatedAt: doc.get("updatedAt"),
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function upsertAdminUser(uid: string, input: Partial<AdminUserRecord>): Promise<void> {
  const payload = normalize({ ...input, uid });
  if (!payload.uid) throw new Error("uid is required.");
  if (!payload.email) throw new Error("email is required.");

  await adminUsersRef.doc(payload.uid).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeAdminUser(uid: string): Promise<void> {
  await adminUsersRef.doc(uid).delete();
}

