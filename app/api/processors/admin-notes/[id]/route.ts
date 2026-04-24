import { NextRequest, NextResponse } from "next/server";
import { deleteProcessorAdminNoteGroup } from "@/lib/firestore/processorAdminNotes";
import { requireAdminCapability } from "@/lib/auth/adminApi";

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await deleteProcessorAdminNoteGroup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete processor admin notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
