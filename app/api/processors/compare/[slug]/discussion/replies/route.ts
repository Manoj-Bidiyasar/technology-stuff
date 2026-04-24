import { NextRequest, NextResponse } from "next/server";
import { addProcessorDiscussionReply, listProcessorCompareDiscussionPublic } from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as { discussionId?: string; user?: string; text?: string };
    if (!body.discussionId) return NextResponse.json({ error: "discussionId is required." }, { status: 400 });
    await addProcessorDiscussionReply(body.discussionId, { user: body.user || "", text: body.text || "" });
    const items = await listProcessorCompareDiscussionPublic(slug);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save reply.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
