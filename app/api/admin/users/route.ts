import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { listAdminUsers, upsertAdminUser, type AdminUserRecord } from "@/lib/firestore/adminUsers";

export async function GET(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "users");
    if (unauthorized) return unauthorized;
    const items = await listAdminUsers();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "users");
    if (unauthorized) return unauthorized;
    const body = (await request.json()) as Partial<AdminUserRecord>;
    const uid = String(body.uid || "").trim();
    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }
    await upsertAdminUser(uid, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

