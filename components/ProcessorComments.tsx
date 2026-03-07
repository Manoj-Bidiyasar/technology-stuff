"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

type CommentItem = {
  user: string;
  at: string;
  text: string;
  score: number;
};

type CommentThread = CommentItem & {
  id: string;
  replies: CommentItem[];
};

type Props = {
  processorName: string;
  initialComments: CommentItem[];
};

function nowLabel(): string {
  return new Date().toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProcessorComments({ processorName, initialComments }: Props) {
  const [comments, setComments] = useState<CommentThread[]>(
    initialComments.map((item, idx) => ({ ...item, id: `${idx + 1}`, replies: [] })),
  );
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const mainBoxRef = useRef<HTMLTextAreaElement | null>(null);
  const replyBoxRef = useRef<HTMLTextAreaElement | null>(null);

  const sorted = useMemo(() => comments, [comments]);

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function submitMain(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    const newItem: CommentThread = {
      id: `${Date.now()}`,
      user: name.trim(),
      at: nowLabel(),
      text: message.trim(),
      score: 0,
      replies: [],
    };
    setComments((prev) => [newItem, ...prev]);
    setName("");
    setMessage("");
    if (mainBoxRef.current) {
      mainBoxRef.current.style.height = "auto";
    }
  }

  function submitReply(e: FormEvent, id: string) {
    e.preventDefault();
    if (!replyName.trim() || !replyMessage.trim()) return;
    const entry: CommentItem = {
      user: replyName.trim(),
      at: nowLabel(),
      text: replyMessage.trim(),
      score: 0,
    };
    setComments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, replies: [...item.replies, entry] } : item)),
    );
    setReplyName("");
    setReplyMessage("");
    setOpenReplyId(null);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-xl font-bold text-slate-900">Community Discussion</h2>
      </div>

      <div className="divide-y divide-slate-200">
        {sorted.map((row) => (
          <article key={row.id} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" fill="currentColor" />
                  <path d="M4 20a8 8 0 0 1 16 0" fill="currentColor" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-bold text-slate-900">{row.user}</p>
                  <p className="text-xs text-slate-500">{row.at}</p>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-800">{row.text}</p>
                <div className="mt-2.5 flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-700">{row.score > 0 ? `+${row.score}` : row.score}</span>
                  <button
                    type="button"
                    onClick={() => setOpenReplyId((prev) => (prev === row.id ? null : row.id))}
                    className="text-slate-700 hover:text-blue-700"
                  >
                    Reply
                  </button>
                </div>

                {row.replies.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {row.replies.map((rep, idx) => (
                      <div key={`${row.id}-reply-${idx}`} className="text-sm">
                        <span className="font-semibold text-slate-900">{rep.user}</span>
                        <span className="ml-2 text-xs text-slate-500">{rep.at}</span>
                        <p className="mt-1 text-slate-700">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {openReplyId === row.id ? (
                  <form onSubmit={(e) => submitReply(e, row.id)} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
                    <input
                      value={replyName}
                      onChange={(e) => setReplyName(e.target.value)}
                      placeholder="Name"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <textarea
                      ref={replyBoxRef}
                      rows={2}
                      value={replyMessage}
                      onChange={(e) => {
                        setReplyMessage(e.target.value);
                        autoResize(e.currentTarget);
                      }}
                      placeholder="Write your reply"
                      className="w-full resize-none overflow-hidden rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="flex items-center gap-2">
                      <button type="submit" className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800">
                        Post Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenReplyId(null)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">Share your message</p>
        <form onSubmit={submitMain} className="space-y-3">
          <div>
            <label htmlFor="comment-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              id="comment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="comment-message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
            <textarea
              id="comment-message"
              ref={mainBoxRef}
              rows={2}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                autoResize(e.currentTarget);
              }}
              placeholder={`Share your view about ${processorName}`}
              className="w-full resize-none overflow-hidden rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
