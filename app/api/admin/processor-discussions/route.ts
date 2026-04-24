import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { listProcessorDiscussionAdmin } from "@/lib/firestore/processorDiscussion";

export async function GET(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const items = await listProcessorDiscussionAdmin();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load processor discussions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
