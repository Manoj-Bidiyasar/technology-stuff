import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const discussionRef = adminDb.collection("processor_discussions");

export type ProcessorDiscussionStatus = "visible" | "hidden" | "deleted";
type PlainTimestamp = { seconds: number; nanoseconds: number } | string | undefined;
export type ProcessorDiscussionScope = "processor" | "compare";

export type ProcessorDiscussionReply = {
  id: string;
  user: string;
  text: string;
  at?: string;
  status: ProcessorDiscussionStatus;
  createdAt?: PlainTimestamp;
  updatedAt?: PlainTimestamp;
};

export type ProcessorDiscussionThread = {
  id: string;
  scope: ProcessorDiscussionScope;
  processorSlug: string;
  processorName: string;
  compareSlug?: string;
  compareLeftSlug?: string;
  compareRightSlug?: string;
  compareLeftName?: string;
  compareRightName?: string;
  user: string;
  text: string;
  at?: string;
  score: number;
  status: ProcessorDiscussionStatus;
  replies: ProcessorDiscussionReply[];
  createdAt?: PlainTimestamp;
  updatedAt?: PlainTimestamp;
};

function cleanText(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function nowLabel(): string {
  return new Date().toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTimestamp(value: unknown): PlainTimestamp {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const stamp = value as {
      seconds?: unknown;
      nanoseconds?: unknown;
      _seconds?: unknown;
      _nanoseconds?: unknown;
      toDate?: () => Date;
      toMillis?: () => number;
    };
    const seconds = Number(stamp.seconds ?? stamp._seconds);
    const nanoseconds = Number(stamp.nanoseconds ?? stamp._nanoseconds);
    if (Number.isFinite(seconds)) {
      return {
        seconds,
        nanoseconds: Number.isFinite(nanoseconds) ? nanoseconds : 0,
      };
    }
    if (typeof stamp.toDate === "function") return stamp.toDate().toISOString();
    if (typeof stamp.toMillis === "function") return new Date(stamp.toMillis()).toISOString();
  }
  return undefined;
}

function timestampToMillis(value: PlainTimestamp): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
  return (Number(value.seconds || 0) * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1_000_000);
}

function hydrate(id: string, data: Partial<ProcessorDiscussionThread>): ProcessorDiscussionThread {
  return {
    id,
    scope: data.scope === "compare" ? "compare" : "processor",
    processorSlug: cleanText(data.processorSlug),
    processorName: cleanText(data.processorName),
    compareSlug: cleanText(data.compareSlug) || undefined,
    compareLeftSlug: cleanText(data.compareLeftSlug) || undefined,
    compareRightSlug: cleanText(data.compareRightSlug) || undefined,
    compareLeftName: cleanText(data.compareLeftName) || undefined,
    compareRightName: cleanText(data.compareRightName) || undefined,
    user: cleanText(data.user),
    text: cleanText(data.text),
    at: cleanText(data.at),
    score: Number(data.score || 0),
    status: data.status === "hidden" || data.status === "deleted" ? data.status : "visible",
    replies: Array.isArray(data.replies)
      ? data.replies.map((reply, index) => ({
          id: cleanText(reply.id) || `${index + 1}`,
          user: cleanText(reply.user),
          text: cleanText(reply.text),
          at: cleanText(reply.at),
          score: 0,
          status: reply.status === "hidden" || reply.status === "deleted" ? reply.status : "visible",
          createdAt: normalizeTimestamp(reply.createdAt),
          updatedAt: normalizeTimestamp(reply.updatedAt),
        }))
      : [],
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

export async function listProcessorDiscussionPublic(processorSlug: string): Promise<ProcessorDiscussionThread[]> {
  const snapshot = await discussionRef.where("processorSlug", "==", processorSlug).limit(300).get();
  const items = snapshot.docs
    .map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorDiscussionThread>))
    .filter((item) => item.scope === "processor")
    .filter((item) => item.status === "visible")
    .map((item) => ({
      ...item,
      replies: item.replies.filter((reply) => reply.status === "visible"),
    }));
  items.sort((a, b) => {
    return timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt);
  });
  return items;
}

export async function listProcessorCompareDiscussionPublic(compareSlug: string): Promise<ProcessorDiscussionThread[]> {
  const snapshot = await discussionRef
    .where("scope", "==", "compare")
    .where("compareSlug", "==", compareSlug)
    .limit(300)
    .get();
  const items = snapshot.docs
    .map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorDiscussionThread>))
    .filter((item) => item.status === "visible")
    .map((item) => ({
      ...item,
      replies: item.replies.filter((reply) => reply.status === "visible"),
    }));
  items.sort((a, b) => {
    return timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt);
  });
  return items;
}

export async function listProcessorDiscussionAdmin(): Promise<ProcessorDiscussionThread[]> {
  const snapshot = await discussionRef.limit(1000).get();
  const items = snapshot.docs.map((doc) => hydrate(doc.id, doc.data() as Partial<ProcessorDiscussionThread>));
  items.sort((a, b) => {
    return timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt);
  });
  return items;
}

export async function createProcessorDiscussion(input: {
  processorSlug: string;
  processorName: string;
  user: string;
  text: string;
}): Promise<string> {
  const payload = {
    scope: "processor" as ProcessorDiscussionScope,
    processorSlug: cleanText(input.processorSlug),
    processorName: cleanText(input.processorName),
    user: cleanText(input.user),
    text: cleanText(input.text),
    at: nowLabel(),
    score: 0,
    status: "visible" as ProcessorDiscussionStatus,
    replies: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!payload.processorSlug || !payload.processorName || !payload.user || !payload.text) {
    throw new Error("processor, name, and message are required.");
  }
  const doc = await discussionRef.add(payload);
  return doc.id;
}

export async function createProcessorCompareDiscussion(input: {
  compareSlug: string;
  compareLeftSlug: string;
  compareRightSlug: string;
  compareLeftName: string;
  compareRightName: string;
  user: string;
  text: string;
}): Promise<string> {
  const payload = {
    scope: "compare" as ProcessorDiscussionScope,
    processorSlug: cleanText(input.compareSlug),
    processorName: cleanText(`${input.compareLeftName} vs ${input.compareRightName}`),
    compareSlug: cleanText(input.compareSlug),
    compareLeftSlug: cleanText(input.compareLeftSlug),
    compareRightSlug: cleanText(input.compareRightSlug),
    compareLeftName: cleanText(input.compareLeftName),
    compareRightName: cleanText(input.compareRightName),
    user: cleanText(input.user),
    text: cleanText(input.text),
    at: nowLabel(),
    score: 0,
    status: "visible" as ProcessorDiscussionStatus,
    replies: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!payload.compareSlug || !payload.compareLeftName || !payload.compareRightName || !payload.user || !payload.text) {
    throw new Error("comparison, name, and message are required.");
  }
  const doc = await discussionRef.add(payload);
  return doc.id;
}

export async function addProcessorDiscussionReply(id: string, input: { user: string; text: string }): Promise<void> {
  const ref = discussionRef.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Discussion message not found.");
  const item = hydrate(snap.id, snap.data() as Partial<ProcessorDiscussionThread>);
  const reply: ProcessorDiscussionReply = {
    id: `${Date.now()}`,
    user: cleanText(input.user),
    text: cleanText(input.text),
    at: nowLabel(),
    status: "visible",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!reply.user || !reply.text) throw new Error("name and reply are required.");
  await ref.set({ replies: [...item.replies, reply], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function updateProcessorDiscussionStatus(id: string, status: ProcessorDiscussionStatus): Promise<void> {
  await discussionRef.doc(id).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function updateProcessorDiscussionReplyStatus(id: string, replyId: string, status: ProcessorDiscussionStatus): Promise<void> {
  const ref = discussionRef.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Discussion message not found.");
  const item = hydrate(snap.id, snap.data() as Partial<ProcessorDiscussionThread>);
  await ref.set({
    replies: item.replies.map((reply) => reply.id === replyId ? { ...reply, status, updatedAt: new Date().toISOString() } : reply),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function deleteProcessorDiscussion(id: string): Promise<void> {
  await discussionRef.doc(id).delete();
}

export async function deleteProcessorDiscussionReply(id: string, replyId: string): Promise<void> {
  const ref = discussionRef.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Discussion message not found.");
  const item = hydrate(snap.id, snap.data() as Partial<ProcessorDiscussionThread>);
  await ref.set({
    replies: item.replies.filter((reply) => reply.id !== replyId),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
