"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminMessage } from "@/lib/firestore/adminMessages";
import type { ProcessorDiscussionReply, ProcessorDiscussionThread } from "@/lib/firestore/processorDiscussion";

type FilterKey = "all" | "new" | "read" | "replied" | "archived" | "hidden" | "deleted";
type ScopeKey = "all" | "contact" | "processor" | "compare";
type CombinedMessage =
  | { kind: "contact"; scope: ScopeKey; id?: string; status: FilterKey; sortTime: number; item: AdminMessage }
  | { kind: "processor"; scope: ScopeKey; id?: string; status: FilterKey; sortTime: number; item: ProcessorDiscussionThread };

const ADMIN_REPLY_NAME = "Technology Stuff";
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
  { key: "hidden", label: "Hidden" },
  { key: "deleted", label: "Deleted" },
];
const SCOPES: Array<{ key: ScopeKey; label: string }> = [
  { key: "all", label: "All Messages" },
  { key: "processor", label: "Processor Specs" },
  { key: "compare", label: "Processor Compare" },
  { key: "contact", label: "Contact" },
];

function normalizeStatus(status: AdminMessage["status"] | undefined): FilterKey {
  if (status === "read" || status === "replied" || status === "archived" || status === "deleted") return status;
  if (status === "resolved") return "replied";
  return "new";
}

function statusClass(status: FilterKey) {
  if (status === "deleted") return "text-rose-700";
  if (status === "hidden") return "text-amber-700";
  if (status === "replied") return "text-emerald-700";
  if (status === "archived") return "text-slate-500";
  if (status === "read") return "text-blue-700";
  return "text-red-600";
}

function isAdminReply(reply: ProcessorDiscussionReply) {
  const name = reply.user.trim().toLowerCase();
  return name === ADMIN_REPLY_NAME.toLowerCase() || name === "admin";
}

function cleanProcessorName(name: string) {
  const raw = String(name || "").trim().replace(/\s+/g, " ");
  const lower = raw.toLowerCase();
  if (!raw) return "";
  if (lower.startsWith("qualcomm snapdragon ")) return `Snapdragon ${raw.slice("Qualcomm Snapdragon ".length).trim()}`.trim();
  if (lower.startsWith("samsung exynos ")) return `Exynos ${raw.slice("Samsung Exynos ".length).trim()}`.trim();
  if (lower.startsWith("mediatek dimensity ")) return `Dimensity ${raw.slice("MediaTek Dimensity ".length).trim()}`.trim();
  if (lower.startsWith("mediatek helio ")) return `Helio ${raw.slice("MediaTek Helio ".length).trim()}`.trim();
  return raw;
}

export default function AdminMessagesPage() {
  const [contactItems, setContactItems] = useState<AdminMessage[]>([]);
  const [processorItems, setProcessorItems] = useState<ProcessorDiscussionThread[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [scope, setScope] = useState<ScopeKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [replyTarget, setReplyTarget] = useState("");
  const [replyText, setReplyText] = useState("");

  const refresh = useCallback(async () => {
    const [contactRes, processorRes] = await Promise.all([
      fetch("/api/admin/messages", { cache: "no-store" }),
      fetch("/api/admin/processor-discussions", { cache: "no-store" }),
    ]);
    const [contactJson, processorJson] = await Promise.all([
      contactRes.json() as Promise<{ items?: AdminMessage[]; error?: string }>,
      processorRes.json() as Promise<{ items?: ProcessorDiscussionThread[]; error?: string }>,
    ]);
    if (!contactRes.ok) throw new Error(contactJson.error || "Failed to load contact messages.");
    if (!processorRes.ok) throw new Error(processorJson.error || "Failed to load processor discussions.");
    setContactItems(contactJson.items || []);
    setProcessorItems(processorJson.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
      setLoading(false);
    });
  }, [refresh]);

  const combined = useMemo<CombinedMessage[]>(() => {
    const contacts: CombinedMessage[] = contactItems.map((item) => {
      const status = normalizeStatus(item.status);
      return {
        kind: "contact",
        scope: "contact",
        id: item.id,
        status: status === "deleted" || status === "archived" ? status : item.reply ? "replied" : status,
        sortTime: Number((item.createdAt as { seconds?: number } | undefined)?.seconds || 0),
        item,
      };
    });
    const processors: CombinedMessage[] = processorItems.map((item) => ({
      kind: "processor",
      scope: item.scope === "compare" ? "compare" : "processor",
      id: item.id,
      status:
        item.status === "deleted"
          ? "deleted"
          : item.status === "hidden"
            ? "hidden"
            : item.replies.some((reply) => reply.status !== "deleted" && isAdminReply(reply))
              ? "replied"
              : "new",
      sortTime: Number((item.createdAt as { seconds?: number } | undefined)?.seconds || 0),
      item,
    }));
    return [...contacts, ...processors].sort((a, b) => b.sortTime - a.sortTime);
  }, [contactItems, processorItems]);

  const filtered = useMemo(() => {
    const scoped = scope === "all" ? combined : combined.filter((item) => item.scope === scope);
    if (filter === "all") return scoped;
    return scoped.filter((item) => item.status === filter);
  }, [combined, filter, scope]);

  const counts = useMemo(() => {
    const map = new Map<FilterKey, number>(FILTERS.map((item) => [item.key, 0]));
    combined.forEach((item) => {
      map.set("all", (map.get("all") || 0) + 1);
      map.set(item.status, (map.get(item.status) || 0) + 1);
    });
    return map;
  }, [combined]);

  function openReply(target: string, initialValue = "") {
    setReplyTarget(replyTarget === target ? "" : target);
    setReplyText(replyTarget === target ? "" : initialValue);
    setError("");
    setMessage("");
  }

  async function setContactStatus(id: string | undefined, status: Exclude<FilterKey, "all">) {
    if (!id) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to update contact message.");
    setMessage("Message updated.");
    await refresh();
  }

  async function sendContactReply(id: string | undefined) {
    if (!id || !replyText.trim()) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText.trim(), status: "replied", repliedAt: new Date().toISOString() }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to save reply.");
    setReplyTarget("");
    setReplyText("");
    setMessage("Reply saved.");
    await refresh();
  }

  async function deleteContact(id: string | undefined) {
    if (!id) return;
    if (!window.confirm("Move this contact message to deleted?")) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to delete contact message.");
    setMessage("Message deleted.");
    await refresh();
  }

  async function setThreadStatus(id: string | undefined, status: "visible" | "hidden" | "deleted") {
    if (!id) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/processor-discussions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to update message.");
    setMessage(status === "hidden" ? "Message hidden from public page." : status === "deleted" ? "Message moved to deleted." : "Message restored.");
    await refresh();
  }

  async function sendProcessorReply(id: string | undefined) {
    if (!id || !replyText.trim()) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/processor-discussions/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: ADMIN_REPLY_NAME, text: replyText.trim() }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to save reply.");
    setReplyTarget("");
    setReplyText("");
    setMessage("Reply posted.");
    await refresh();
  }

  async function deleteThread(id: string | undefined) {
    if (!id) return;
    if (!window.confirm("Move this discussion message to deleted?")) return;
    await setThreadStatus(id, "deleted");
  }

  async function setReplyStatus(threadId: string | undefined, replyId: string | undefined, status: "visible" | "hidden" | "deleted") {
    if (!threadId || !replyId) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/processor-discussions/${encodeURIComponent(threadId)}/replies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyId, status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Failed to update reply.");
    setMessage(status === "hidden" ? "Reply hidden from public page." : status === "deleted" ? "Reply moved to deleted." : "Reply restored.");
    await refresh();
  }

  async function deleteReply(threadId: string | undefined, replyId: string | undefined) {
    if (!threadId || !replyId) return;
    if (!window.confirm("Move this reply to deleted?")) return;
    await setReplyStatus(threadId, replyId, "deleted");
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-950">Messages</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          {SCOPES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={`rounded-full border px-5 py-2 text-sm font-extrabold transition ${
                scope === item.key
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-950 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-5 py-2 text-sm font-extrabold transition ${
                filter === item.key
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-950 hover:border-slate-300"
              }`}
            >
              {item.label}
              <span className="ml-1 text-xs opacity-70">{counts.get(item.key) || 0}</span>
            </button>
          ))}
        </div>
      </header>

      {message ? <p className="text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      {loading ? <p className="rounded-lg bg-white p-4 text-sm text-slate-600">Loading messages...</p> : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          if (row.kind === "contact") {
            const item = row.item;
            const target = `contact-${row.id || ""}`;
            return (
              <article key={target} className="flex min-h-[210px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold text-slate-950">{item.name || "Anonymous"}</h2>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {item.email || "-"}
                      {item.source ? ` | ${item.source}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 overflow-x-auto text-sm font-extrabold whitespace-nowrap">
                    <span className={statusClass(row.status)}>{row.status.toUpperCase()}</span>
                    <button type="button" onClick={() => openReply(target, item.reply || "")} className="text-blue-700 hover:underline">
                      Reply
                    </button>
                    {row.status === "deleted" || row.status === "archived" ? (
                      <button type="button" onClick={() => void run(() => setContactStatus(item.id, item.reply ? "replied" : "new"))} className="text-emerald-700 hover:underline">
                        Restore
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => void run(() => setContactStatus(item.id, "archived"))} className="text-slate-500 hover:text-slate-900">
                          Archive
                        </button>
                        <button type="button" onClick={() => void run(() => deleteContact(item.id))} className="text-rose-600 hover:underline">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {item.subject ? <p className="mt-5 text-base font-bold text-slate-900">{item.subject}</p> : null}
                <p className="mt-3 whitespace-pre-wrap text-base text-slate-950">{item.message}</p>

                {item.reply ? (
                  <div className="mt-5 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-extrabold text-slate-500">Your Reply</p>
                    <p className="mt-2 whitespace-pre-wrap text-base text-slate-950">{item.reply}</p>
                  </div>
                ) : null}

                {replyTarget === target ? (
                  <div className="mt-5 space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="Write your reply"
                    />
                    <button type="button" onClick={() => void run(() => sendContactReply(item.id))} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-extrabold text-white">
                      Save Reply
                    </button>
                  </div>
                ) : null}
              </article>
            );
          }

          const item = row.item;
          const target = `processor-${row.id || ""}`;
          const adminReplies = item.replies.filter(isAdminReply);
          const otherReplies = item.replies.filter((reply) => !isAdminReply(reply));
          return (
              <article key={target} className="flex min-h-[210px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-slate-950">{item.user || "Anonymous"}</h2>
                </div>
                <div className="flex items-center justify-end gap-3 overflow-x-auto text-sm font-extrabold whitespace-nowrap">
                  <span className={statusClass(row.status)}>{row.status.toUpperCase()}</span>
                  <button type="button" onClick={() => openReply(target)} className="text-blue-700 hover:underline">
                    Reply
                  </button>
                  {item.status === "deleted" ? (
                    <button type="button" onClick={() => void run(() => setThreadStatus(item.id, "visible"))} className="text-emerald-700 hover:underline">
                      Restore
                    </button>
                  ) : item.status === "hidden" ? (
                    <button type="button" onClick={() => void run(() => setThreadStatus(item.id, "visible"))} className="text-emerald-700 hover:underline">
                      Restore
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => void run(() => setThreadStatus(item.id, "hidden"))} className="text-slate-500 hover:text-slate-900">
                        Hide
                      </button>
                      <button type="button" onClick={() => void run(() => deleteThread(item.id))} className="text-rose-600 hover:underline">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-5 whitespace-pre-wrap text-base text-slate-950">{item.text}</p>

              {item.scope === "compare" ? (
                <div className="mt-auto flex justify-center pt-4">
                  <Link
                    href={`/processors/compare/${item.compareSlug || item.processorSlug}`}
                    className="inline-flex max-w-full items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-100"
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-center">
                      {`${cleanProcessorName(item.compareLeftName || "")} vs ${cleanProcessorName(item.compareRightName || "")}`}
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="mt-auto flex justify-end pt-4">
                  <Link
                    href={`/processors/${item.processorSlug}`}
                    className="inline-flex max-w-full items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                      {cleanProcessorName(item.processorName) || item.processorSlug}
                    </span>
                  </Link>
                </div>
              )}

              {adminReplies.map((reply) => (
                <div key={reply.id || reply.at} className="mt-5 rounded-lg bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-extrabold text-slate-500">Your Reply</p>
                    <div className="flex items-center gap-3 overflow-x-auto text-xs font-bold whitespace-nowrap">
                      <span className={statusClass(reply.status === "deleted" ? "deleted" : reply.status === "hidden" ? "hidden" : "replied")}>
                        {(reply.status || "visible").toUpperCase()}
                      </span>
                      {reply.status === "deleted" ? (
                        <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "visible"))} className="text-emerald-700 hover:underline">
                          Restore
                        </button>
                      ) : reply.status === "hidden" ? (
                        <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "visible"))} className="text-emerald-700 hover:underline">
                          Restore
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "hidden"))} className="text-slate-500 hover:text-slate-900">
                            Hide
                          </button>
                          <button type="button" onClick={() => void run(() => deleteReply(item.id, reply.id))} className="text-rose-600 hover:underline">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-base text-slate-950">{reply.text}</p>
                </div>
              ))}

              {otherReplies.length ? (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  {otherReplies.map((reply) => (
                    <div key={reply.id || reply.at}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-extrabold text-slate-700">{reply.user || "Anonymous"}</p>
                        <div className="flex items-center gap-3 overflow-x-auto text-xs font-bold whitespace-nowrap">
                          <span className={statusClass(reply.status === "deleted" ? "deleted" : reply.status === "hidden" ? "hidden" : "read")}>
                            {(reply.status || "visible").toUpperCase()}
                          </span>
                          {reply.status === "deleted" ? (
                            <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "visible"))} className="text-emerald-700 hover:underline">
                              Restore
                            </button>
                          ) : reply.status === "hidden" ? (
                            <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "visible"))} className="text-emerald-700 hover:underline">
                              Restore
                            </button>
                          ) : (
                            <>
                              <button type="button" onClick={() => void run(() => setReplyStatus(item.id, reply.id, "hidden"))} className="text-slate-500 hover:text-slate-900">
                                Hide
                              </button>
                              <button type="button" onClick={() => void run(() => deleteReply(item.id, reply.id))} className="text-rose-600 hover:underline">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{reply.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {replyTarget === target ? (
                <div className="mt-5 space-y-3">
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Write your reply"
                  />
                  <button type="button" onClick={() => void run(() => sendProcessorReply(item.id))} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-extrabold text-white">
                    Post Reply
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {!loading && filtered.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-center text-sm text-slate-500">No messages found.</p>
      ) : null}
    </main>
  );
}
