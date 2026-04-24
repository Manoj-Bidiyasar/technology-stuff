import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import {
  addProcessorDiscussionReply,
  updateProcessorDiscussionReplyStatus,
  type ProcessorDiscussionStatus,
} from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = (await request.json()) as { replyId?: string; status?: ProcessorDiscussionStatus };
    if (!body.replyId) return NextResponse.json({ error: "replyId is required." }, { status: 400 });
    await updateProcessorDiscussionReplyStatus(id, body.replyId, body.status === "hidden" || body.status === "deleted" ? body.status : "visible");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = (await request.json()) as { user?: string; text?: string };
    await addProcessorDiscussionReply(id, { user: body.user || "Technology Stuff", text: body.text || "" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save reply.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "messages");
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const replyId = searchParams.get("replyId") || "";
    if (!replyId) return NextResponse.json({ error: "replyId is required." }, { status: 400 });
    await updateProcessorDiscussionReplyStatus(id, replyId, "deleted");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
