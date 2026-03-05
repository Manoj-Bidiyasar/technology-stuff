import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const feedbackRef = adminDb.collection("product_feedback");

export type ProductFeedback = {
  slug: string;
  totalVotes: number;
  valueVotes: number;
  likesVotes: number;
  valueForMoney: {
    yes: number;
    no: number;
  };
  likes: Record<string, number>;
  updatedAt?: unknown;
};

const DEFAULT_LIKE_KEYS = ["processor", "camera", "battery", "design", "display"];

function toSafeSlug(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeLikeKey(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function getProductFeedback(slugInput: string): Promise<ProductFeedback> {
  const slug = toSafeSlug(slugInput);
  if (!slug) {
    return {
      slug: "",
      totalVotes: 0,
      valueVotes: 0,
      likesVotes: 0,
      valueForMoney: { yes: 0, no: 0 },
      likes: Object.fromEntries(DEFAULT_LIKE_KEYS.map((key) => [key, 0])),
    };
  }

  const doc = await feedbackRef.doc(slug).get();
  if (!doc.exists) {
    return {
      slug,
      totalVotes: 0,
      valueVotes: 0,
      likesVotes: 0,
      valueForMoney: { yes: 0, no: 0 },
      likes: Object.fromEntries(DEFAULT_LIKE_KEYS.map((key) => [key, 0])),
    };
  }

  const data = doc.data() || {};
  const likesRaw = (data.likes || {}) as Record<string, unknown>;
  const likes = Object.fromEntries(
    Object.keys(likesRaw).map((key) => [key, Number(likesRaw[key] || 0)])
  );

  for (const key of DEFAULT_LIKE_KEYS) {
    if (!Number.isFinite(likes[key])) likes[key] = 0;
  }

  return {
    slug,
    totalVotes: Number(data.totalVotes || 0),
    valueVotes: Number(data.valueVotes || 0),
    likesVotes: Number(data.likesVotes || 0),
    valueForMoney: {
      yes: Number((data.valueForMoney || {}).yes || 0),
      no: Number((data.valueForMoney || {}).no || 0),
    },
    likes,
    updatedAt: data.updatedAt,
  };
}

export async function submitProductFeedbackVote(
  slugInput: string,
  payload: {
    valueForMoney?: "yes" | "no";
    likes?: string[];
  }
): Promise<void> {
  const slug = toSafeSlug(slugInput);
  if (!slug) {
    throw new Error("Invalid product slug.");
  }

  const vote = payload.valueForMoney === "yes" || payload.valueForMoney === "no" ? payload.valueForMoney : undefined;
  const likesInput = Array.isArray(payload.likes) ? payload.likes : [];
  const likes = Array.from(
    new Set(
      likesInput
        .map((item) => normalizeLikeKey(item))
        .filter(Boolean)
    )
  ).slice(0, 10);

  if (!vote && likes.length === 0) {
    throw new Error("No feedback payload provided.");
  }

  const updates: Record<string, unknown> = {
    slug,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  if (vote) {
    updates.totalVotes = FieldValue.increment(1);
    updates.valueVotes = FieldValue.increment(1);
    updates[`valueForMoney.${vote}`] = FieldValue.increment(1);
  }

  if (likes.length > 0) {
    updates.totalVotes = FieldValue.increment(1);
    updates.likesVotes = FieldValue.increment(1);
  }

  for (const key of likes) {
    updates[`likes.${key}`] = FieldValue.increment(1);
  }

  await feedbackRef.doc(slug).set(updates, { merge: true });
}
