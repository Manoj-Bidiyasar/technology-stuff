import { NextRequest, NextResponse } from "next/server";
import { createProcessorDiscussion, listProcessorDiscussionPublic } from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const items = await listProcessorDiscussionPublic(id);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load discussion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { processorName?: string; user?: string; text?: string };
    const discussionId = await createProcessorDiscussion({
      processorSlug: id,
      processorName: body.processorName || id,
      user: body.user || "",
      text: body.text || "",
    });
    const items = await listProcessorDiscussionPublic(id);
    return NextResponse.json({ id: discussionId, items }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save discussion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
