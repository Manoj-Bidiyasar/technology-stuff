import { NextRequest, NextResponse } from "next/server";
import { addProcessorDiscussionReply, listProcessorDiscussionPublic } from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: processorSlug } = await params;
    const body = (await request.json()) as { discussionId?: string; user?: string; text?: string };
    if (!body.discussionId) return NextResponse.json({ error: "discussionId is required." }, { status: 400 });
    await addProcessorDiscussionReply(body.discussionId, { user: body.user || "", text: body.text || "" });
    const items = await listProcessorDiscussionPublic(processorSlug);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save reply.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
