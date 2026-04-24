import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { updateProcessorDiscussionStatus, type ProcessorDiscussionStatus } from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = (await request.json()) as { status?: ProcessorDiscussionStatus };
    const status = body.status === "hidden" || body.status === "deleted" ? body.status : "visible";
    await updateProcessorDiscussionStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update discussion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    await updateProcessorDiscussionStatus(id, "deleted");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete discussion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
