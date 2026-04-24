import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { listAdminMessages } from "@/lib/firestore/adminMessages";

export async function GET(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const items = await listAdminMessages();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contact messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
