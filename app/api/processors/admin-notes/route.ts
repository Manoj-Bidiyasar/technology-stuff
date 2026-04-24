import { NextRequest, NextResponse } from "next/server";
import { listProcessorAdminNotes, type ProcessorAdminNoteGroup, upsertProcessorAdminNoteGroup } from "@/lib/firestore/processorAdminNotes";
import { requireAdminCapability } from "@/lib/auth/adminApi";

export async function GET(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const items = await listProcessorAdminNotes();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch processor admin notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as Partial<ProcessorAdminNoteGroup>;
    const id = await upsertProcessorAdminNoteGroup(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save processor admin notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
