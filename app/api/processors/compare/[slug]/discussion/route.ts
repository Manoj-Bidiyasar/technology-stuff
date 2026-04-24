import { NextRequest, NextResponse } from "next/server";
import { createProcessorCompareDiscussion, listProcessorCompareDiscussionPublic } from "@/lib/firestore/processorDiscussion";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const items = await listProcessorCompareDiscussionPublic(slug);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load comparison discussion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as {
      compareLeftSlug?: string;
      compareRightSlug?: string;
      compareLeftName?: string;
      compareRightName?: string;
      user?: string;
      text?: string;
    };
    const discussionId = await createProcessorCompareDiscussion({
      compareSlug: slug,
      compareLeftSlug: body.compareLeftSlug || "",
      compareRightSlug: body.compareRightSlug || "",
      compareLeftName: body.compareLeftName || "",
      compareRightName: body.compareRightName || "",
      user: body.user || "",
      text: body.text || "",
    });
    const items = await listProcessorCompareDiscussionPublic(slug);
    return NextResponse.json({ id: discussionId, items }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save comparison discussion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
