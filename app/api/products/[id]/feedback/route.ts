import { NextRequest, NextResponse } from "next/server";
import { getProductFeedback, submitProductFeedbackVote } from "@/lib/firestore/feedback";

type FeedbackRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: FeedbackRouteProps) {
  try {
    const { id } = await params;
    const feedback = await getProductFeedback(id);
    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: FeedbackRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { valueForMoney?: string; likes?: string[] };
    const vote = String(body.valueForMoney || "").toLowerCase();
    const safeVote = vote === "yes" || vote === "no" ? vote : undefined;
    const likes = Array.isArray(body.likes) ? body.likes : [];

    if (!safeVote && likes.length === 0) {
      return NextResponse.json({ error: "Provide valueForMoney or likes." }, { status: 400 });
    }

    await submitProductFeedbackVote(id, { valueForMoney: safeVote as "yes" | "no" | undefined, likes });
    const feedback = await getProductFeedback(id);
    return NextResponse.json({ ok: true, feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
