import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const compareVotesRef = adminDb.collection("processor_compare_votes");

export type ProcessorCompareVoteRecord = {
  compareSlug: string;
  leftSlug: string;
  rightSlug: string;
  leftName: string;
  rightName: string;
  leftVotes: number;
  rightVotes: number;
  totalVotes: number;
  updatedAt?: string;
  createdAt?: string;
};

function clean(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function compareVoteCookieName(compareSlug: string): string {
  const safe = clean(compareSlug).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `compare_vote_${safe}`;
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const stamp = value as {
      seconds?: unknown;
      _seconds?: unknown;
      nanoseconds?: unknown;
      _nanoseconds?: unknown;
      toDate?: () => Date;
      toMillis?: () => number;
    };
    const seconds = Number(stamp.seconds ?? stamp._seconds);
    const nanoseconds = Number(stamp.nanoseconds ?? stamp._nanoseconds);
    if (Number.isFinite(seconds)) {
      return new Date((seconds * 1000) + Math.floor((Number.isFinite(nanoseconds) ? nanoseconds : 0) / 1_000_000)).toISOString();
    }
    if (typeof stamp.toDate === "function") return stamp.toDate().toISOString();
    if (typeof stamp.toMillis === "function") return new Date(stamp.toMillis()).toISOString();
  }
  return undefined;
}

function hydrate(compareSlug: string, data: Partial<ProcessorCompareVoteRecord>): ProcessorCompareVoteRecord {
  const leftVotes = Math.max(0, Number(data.leftVotes || 0));
  const rightVotes = Math.max(0, Number(data.rightVotes || 0));
  return {
    compareSlug: clean(data.compareSlug) || compareSlug,
    leftSlug: clean(data.leftSlug),
    rightSlug: clean(data.rightSlug),
    leftName: clean(data.leftName),
    rightName: clean(data.rightName),
    leftVotes,
    rightVotes,
    totalVotes: leftVotes + rightVotes,
    updatedAt: toIso(data.updatedAt),
    createdAt: toIso(data.createdAt),
  };
}

export async function getProcessorCompareVotes(input: {
  compareSlug: string;
  leftSlug: string;
  rightSlug: string;
  leftName: string;
  rightName: string;
}): Promise<ProcessorCompareVoteRecord> {
  const ref = compareVotesRef.doc(input.compareSlug);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      compareSlug: input.compareSlug,
      leftSlug: input.leftSlug,
      rightSlug: input.rightSlug,
      leftName: input.leftName,
      rightName: input.rightName,
      leftVotes: 0,
      rightVotes: 0,
      totalVotes: 0,
    };
  }
  return hydrate(snap.id, snap.data() as Partial<ProcessorCompareVoteRecord>);
}

export async function submitProcessorCompareVote(input: {
  compareSlug: string;
  leftSlug: string;
  rightSlug: string;
  leftName: string;
  rightName: string;
  winner: "left" | "right";
}): Promise<ProcessorCompareVoteRecord> {
  const ref = compareVotesRef.doc(input.compareSlug);
  await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? hydrate(snap.id, snap.data() as Partial<ProcessorCompareVoteRecord>) : {
      compareSlug: input.compareSlug,
      leftSlug: input.leftSlug,
      rightSlug: input.rightSlug,
      leftName: input.leftName,
      rightName: input.rightName,
      leftVotes: 0,
      rightVotes: 0,
      totalVotes: 0,
    };
    transaction.set(ref, {
      compareSlug: input.compareSlug,
      leftSlug: input.leftSlug,
      rightSlug: input.rightSlug,
      leftName: input.leftName,
      rightName: input.rightName,
      leftVotes: current.leftVotes + (input.winner === "left" ? 1 : 0),
      rightVotes: current.rightVotes + (input.winner === "right" ? 1 : 0),
      createdAt: snap.exists ? (snap.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return getProcessorCompareVotes(input);
}
