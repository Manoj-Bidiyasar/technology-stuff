import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { updateAdminMessage, type AdminMessage } from "@/lib/firestore/adminMessages";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = (await request.json()) as Partial<AdminMessage>;
    await updateAdminMessage(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    await updateAdminMessage(id, { status: "deleted" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
