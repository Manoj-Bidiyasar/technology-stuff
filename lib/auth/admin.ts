import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { permissionsByRole, type AdminRole } from "@/lib/admin/permissions";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

const ADMIN_SESSIONS_COLLECTION = "admin_sessions";
const ADMIN_USERS_COLLECTION = "admin_users";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type CreateAdminSessionInput = {
  idToken: string;
  deviceId?: string;
  userAgent?: string;
};

type CreateAdminSessionResult =
  | { ok: true; sessionToken: string }
  | { ok: false; error: string };

export type AdminViewer = {
  uid: string;
  email: string;
  role: AdminRole;
  status: string;
};

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeAllowedDeviceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value || "").trim()).filter(Boolean);
}

function getMaxConcurrentSessions(userData: Record<string, unknown>): number {
  const base = userData.maxConcurrentSessions;
  const policy = userData.sessionPolicy as { maxConcurrentSessions?: unknown } | undefined;
  const raw = Number(base ?? policy?.maxConcurrentSessions ?? 1);
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  if (raw >= 5) return 5;
  return Math.floor(raw);
}

function isValidRole(value: unknown): value is AdminRole {
  return typeof value === "string" && value in permissionsByRole;
}

export function getAdminSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}

export async function createAdminSessionFromIdToken(input: CreateAdminSessionInput): Promise<CreateAdminSessionResult> {
  const idToken = String(input.idToken || "").trim();
  const deviceId = String(input.deviceId || "").trim();
  const userAgent = String(input.userAgent || "").trim() || "unknown";
  if (!idToken) return { ok: false, error: "missing-token" };

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = String(decoded.uid || "");
    if (!uid) return { ok: false, error: "invalid-token" };

    const userRef = adminDb.collection(ADMIN_USERS_COLLECTION).doc(uid);
    let userSnap = await userRef.get();
    if (!userSnap.exists) {
      const anyAdmin = await adminDb.collection(ADMIN_USERS_COLLECTION).limit(1).get();
      if (anyAdmin.empty) {
        await userRef.set({
          uid,
          email: String(decoded.email || ""),
          role: "super_admin",
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        userSnap = await userRef.get();
      }
    }
    if (!userSnap.exists) return { ok: false, error: "user-profile-missing" };
    const userData = (userSnap.data() || {}) as Record<string, unknown>;

    const status = String(userData.status || "active").toLowerCase();
    if (status !== "active") return { ok: false, error: "user-not-active" };

    const role = String(userData.role || "");
    if (!isValidRole(role)) return { ok: false, error: "user-role-not-allowed" };

    const allowedDeviceIds = normalizeAllowedDeviceIds(userData.allowedDeviceIds);
    if (allowedDeviceIds.length > 0 && (!deviceId || !allowedDeviceIds.includes(deviceId))) {
      return { ok: false, error: "session/device-not-allowed" };
    }

    const sessionsRef = userRef.collection("sessions");
    const activeSnap = await sessionsRef.where("revoked", "==", false).get();
    const activeSessions = activeSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        createdAt: data.createdAt,
      };
    });
    activeSessions.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    const maxSessions = getMaxConcurrentSessions(userData);
    const toRevokeCount = Math.max(0, activeSessions.length - (maxSessions - 1));

    const sessionToken = randomBytes(32).toString("hex");
    const now = Date.now();
    const batch = adminDb.batch();
    for (let i = 0; i < toRevokeCount; i += 1) {
      const old = activeSessions[i];
      batch.set(
        sessionsRef.doc(old.id),
        {
          revoked: true,
          revokedReason: "replaced_by_new_login",
          revokedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    batch.set(adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(sessionToken), {
      uid,
      email: String(decoded.email || ""),
      role,
      deviceId: deviceId || "",
      userAgent,
      revoked: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAtMs: now + SESSION_MAX_AGE_SECONDS * 1000,
    });

    batch.set(sessionsRef.doc(sessionToken), {
      uid,
      deviceId: deviceId || "",
      userAgent,
      revoked: false,
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      expiresAtMs: now + SESSION_MAX_AGE_SECONDS * 1000,
    });

    await batch.commit();
    return { ok: true, sessionToken };
  } catch {
    return { ok: false, error: "admin-session-start-failed" };
  }
}

export async function destroyAdminSession(sessionToken: string): Promise<void> {
  const token = String(sessionToken || "").trim();
  if (!token) return;
  try {
    const ref = adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(token);
    const snap = await ref.get();
    const uid = String(snap.get("uid") || "");
    await ref.delete();
    if (uid) {
      await adminDb
        .collection(ADMIN_USERS_COLLECTION)
        .doc(uid)
        .collection("sessions")
        .doc(token)
        .set(
          {
            revoked: true,
            revokedReason: "logout",
            revokedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }
  } catch {
    // Ignore delete failures on logout.
  }
}

export async function isAdminAuthenticatedRequest(request: NextRequest): Promise<boolean> {
  return Boolean(await getAdminViewerFromRequest(request));
}

export async function getAdminViewerFromRequest(request: NextRequest): Promise<AdminViewer | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!token) return null;

  try {
    const doc = await adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(token).get();
    if (!doc.exists) return null;
    if (Boolean(doc.get("revoked"))) return null;
    const expiresAtMs = Number(doc.get("expiresAtMs") || 0);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
      await destroyAdminSession(token);
      return null;
    }

    const uid = String(doc.get("uid") || "");
    if (!uid) return null;
    const userSnap = await adminDb.collection(ADMIN_USERS_COLLECTION).doc(uid).get();
    if (!userSnap.exists) return null;
    const status = String(userSnap.get("status") || "active").toLowerCase();
    const role = String(userSnap.get("role") || "");
    if (!isValidRole(role)) return null;
    if (status !== "active") return null;
    return {
      uid,
      email: String(userSnap.get("email") || doc.get("email") || ""),
      role,
      status,
    };
  } catch {
    return null;
  }
}
