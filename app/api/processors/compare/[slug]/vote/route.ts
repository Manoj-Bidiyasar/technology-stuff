import { NextRequest, NextResponse } from "next/server";
import { compareVoteCookieName, getProcessorCompareVotes, submitProcessorCompareVote } from "@/lib/firestore/processorCompareVotes";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const item = await getProcessorCompareVotes({
      compareSlug: slug,
      leftSlug: searchParams.get("leftSlug") || "",
      rightSlug: searchParams.get("rightSlug") || "",
      leftName: searchParams.get("leftName") || "",
      rightName: searchParams.get("rightName") || "",
    });
    return NextResponse.json({ item, hasVoted: Boolean(request.cookies.get(compareVoteCookieName(slug))?.value) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load votes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const cookieName = compareVoteCookieName(slug);
    if (request.cookies.get(cookieName)?.value) {
      return NextResponse.json({ error: "You already voted in this comparison." }, { status: 409 });
    }
    const body = (await request.json()) as {
      leftSlug?: string;
      rightSlug?: string;
      leftName?: string;
      rightName?: string;
      winner?: "left" | "right";
    };
    if (body.winner !== "left" && body.winner !== "right") {
      return NextResponse.json({ error: "winner must be left or right." }, { status: 400 });
    }
    const item = await submitProcessorCompareVote({
      compareSlug: slug,
      leftSlug: body.leftSlug || "",
      rightSlug: body.rightSlug || "",
      leftName: body.leftName || "",
      rightName: body.rightName || "",
      winner: body.winner,
    });
    const response = NextResponse.json({ ok: true, item, hasVoted: true });
    response.cookies.set({
      name: cookieName,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save vote.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
