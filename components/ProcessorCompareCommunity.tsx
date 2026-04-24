"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

type CommentItem = {
  user: string;
  at?: string;
  text: string;
  score?: number;
  status?: "visible" | "hidden" | "deleted";
};

type CommentThread = CommentItem & {
  id: string;
  replies: Array<CommentItem & { id?: string }>;
};

type VoteState = {
  compareSlug: string;
  leftSlug: string;
  rightSlug: string;
  leftName: string;
  rightName: string;
  leftVotes: number;
  rightVotes: number;
  totalVotes: number;
};

type Props = {
  compareSlug: string;
  leftSlug: string;
  rightSlug: string;
  leftName: string;
  rightName: string;
  initialComments: CommentThread[];
  initialVotes: VoteState;
  initialHasVoted: boolean;
};

function percent(value: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function optionTone(selected: boolean) {
  return selected
    ? "border-blue-500 bg-blue-50 text-blue-900 shadow-[0_10px_30px_rgba(59,130,246,0.12)]"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300";
}

export default function ProcessorCompareCommunity({
  compareSlug,
  leftSlug,
  rightSlug,
  leftName,
  rightName,
  initialComments,
  initialVotes,
  initialHasVoted,
}: Props) {
  const [comments, setComments] = useState<CommentThread[]>(() => initialComments);
  const [votes, setVotes] = useState<VoteState>(() => initialVotes);
  const [selectedVote, setSelectedVote] = useState<"left" | "right" | "">("");
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const mainBoxRef = useRef<HTMLTextAreaElement | null>(null);
  const replyBoxRef = useRef<HTMLTextAreaElement | null>(null);

  const sorted = useMemo(() => comments, [comments]);
  const leftPercent = percent(votes.leftVotes, votes.totalVotes);
  const rightPercent = percent(votes.rightVotes, votes.totalVotes);

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function submitVote() {
    if (!selectedVote || voteLoading || hasVoted) return;
    setVoteLoading(true);
    setVoteMessage("");
    try {
      const response = await fetch(`/api/processors/compare/${encodeURIComponent(compareSlug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compareSlug,
          leftSlug,
          rightSlug,
          leftName,
          rightName,
          winner: selectedVote,
        }),
      });
      const json = (await response.json()) as { item?: VoteState; error?: string };
      if (!response.ok) throw new Error(json.error || "Failed to save vote.");
      if (json.item) setVotes(json.item);
      setHasVoted(true);
      setVoteMessage("Your vote has been saved.");
    } catch (error) {
      setVoteMessage(error instanceof Error ? error.message : "Vote failed.");
    } finally {
      setVoteLoading(false);
    }
  }

  async function submitMain(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    const response = await fetch(`/api/processors/compare/${encodeURIComponent(compareSlug)}/discussion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compareSlug,
        compareLeftSlug: leftSlug,
        compareRightSlug: rightSlug,
        compareLeftName: leftName,
        compareRightName: rightName,
        user: name.trim(),
        text: message.trim(),
      }),
    });
    const json = (await response.json()) as { items?: CommentThread[] };
    if (response.ok) {
      setComments(json.items || []);
      setName("");
      setMessage("");
      if (mainBoxRef.current) mainBoxRef.current.style.height = "auto";
    }
  }

  async function submitReply(e: FormEvent, id: string) {
    e.preventDefault();
    if (!replyName.trim() || !replyMessage.trim()) return;
    const response = await fetch(`/api/processors/compare/${encodeURIComponent(compareSlug)}/discussion/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discussionId: id, user: replyName.trim(), text: replyMessage.trim() }),
    });
    const json = (await response.json()) as { items?: CommentThread[] };
    if (response.ok) {
      setComments(json.items || []);
      setReplyName("");
      setReplyMessage("");
      setOpenReplyId(null);
    }
  }

  return (
    <section className="mt-5 space-y-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M8 7h8M8 12h5M6 4h12a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Community Pick</h2>
              <p className="text-sm text-slate-600">Pick one option, then submit your vote.</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="grid gap-2.5 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                if (!hasVoted) setSelectedVote("left");
              }}
              className={`w-full rounded-xl border p-3 text-left transition sm:p-4 ${optionTone(selectedVote === "left")}`}
              disabled={hasVoted}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selectedVote === "left" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}>
                      {selectedVote === "left" ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    <p className="text-sm font-bold leading-5 sm:text-base">{leftName}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">{votes.leftVotes} votes</p>
                </div>
                <span className="text-xs font-bold text-slate-500 sm:text-sm">{leftPercent}%</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mt-3 sm:h-2">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${leftPercent}%` }} />
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasVoted) setSelectedVote("right");
              }}
              className={`w-full rounded-xl border p-3 text-left transition sm:p-4 ${optionTone(selectedVote === "right")}`}
              disabled={hasVoted}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selectedVote === "right" ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}>
                      {selectedVote === "right" ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    <p className="text-sm font-bold leading-5 sm:text-base">{rightName}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">{votes.rightVotes} votes</p>
                </div>
                <span className="text-xs font-bold text-slate-500 sm:text-sm">{rightPercent}%</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mt-3 sm:h-2">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${rightPercent}%` }} />
              </div>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mt-4 sm:p-4">
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                disabled={!selectedVote || voteLoading || hasVoted}
                onClick={() => void submitVote()}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                {voteLoading ? "Submitting..." : hasVoted ? "Vote Submitted" : "Submit Vote"}
              </button>
              {voteMessage ? <p className="text-xs font-semibold text-slate-600">{voteMessage}</p> : null}
              {!voteMessage && hasVoted ? <p className="text-xs font-semibold text-slate-600">You already voted in this comparison.</p> : null}
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-900 sm:text-2xl">{votes.totalVotes}</p>
              <p className="text-xs font-semibold text-slate-500 sm:text-sm">total votes</p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-xl font-bold text-slate-900">Comparison Discussion</h2>
        </div>

        <div className="divide-y divide-slate-200">
          {sorted.map((row) => (
            <article key={row.id} className="px-4 py-4">
              <div className="flex items-start gap-2 sm:gap-3">
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
                  <p className="mt-1.5 hidden text-sm leading-6 text-slate-800 sm:block">{row.text}</p>
                  <div className="mt-2.5 hidden items-center gap-4 text-xs font-bold sm:flex">
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
                        placeholder={`Reply about ${leftName} vs ${rightName}`}
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
              <p className="mt-1.5 text-sm leading-6 text-slate-800 sm:hidden">{row.text}</p>
              <div className="mt-2 flex items-center gap-4 text-xs font-bold sm:hidden">
                <button
                  type="button"
                  onClick={() => setOpenReplyId((prev) => (prev === row.id ? null : row.id))}
                  className="text-slate-700 hover:text-blue-700"
                >
                  Reply
                </button>
              </div>
            </article>
          ))}
          {!sorted.length ? <div className="px-4 py-6 text-sm text-slate-500">Be the first to share which side wins for you.</div> : null}
        </div>

        <div className="border-t border-slate-200 px-4 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">Share your view on this matchup</p>
          <form onSubmit={submitMain} className="space-y-3">
            <div>
              <label htmlFor="compare-comment-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                id="compare-comment-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="compare-comment-message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
              <textarea
                id="compare-comment-message"
                ref={mainBoxRef}
                rows={2}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  autoResize(e.currentTarget);
                }}
                placeholder={`Share your take on ${leftName} vs ${rightName}`}
                className="w-full resize-none overflow-hidden rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              Send
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}
