import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { removeAdminUser, upsertAdminUser, type AdminUserRecord } from "@/lib/firestore/adminUsers";

type Props = {
  params: Promise<{ uid: string }>;
};

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "users");
    if (unauthorized) return unauthorized;
    const { uid } = await params;
    const body = (await request.json()) as Partial<AdminUserRecord>;
    await upsertAdminUser(uid, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "users");
    if (unauthorized) return unauthorized;
    const { uid } = await params;
    await removeAdminUser(uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

