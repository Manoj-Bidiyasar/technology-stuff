"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FeedbackState = {
  slug: string;
  totalVotes: number;
  valueVotes: number;
  likesVotes: number;
  valueForMoney: { yes: number; no: number };
  likes: Record<string, number>;
};

type UserFeedbackSectionProps = {
  slug: string;
  name: string;
};

const LIKE_OPTIONS = [
  { key: "processor", label: "Fast Performance" },
  { key: "camera", label: "Camera Quality" },
  { key: "battery", label: "Battery Life" },
  { key: "design", label: "Design & Build" },
  { key: "display", label: "Display Quality" },
];

function percent(value: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function emptyFeedback(slug: string): FeedbackState {
  return {
    slug,
    totalVotes: 0,
    valueVotes: 0,
    likesVotes: 0,
    valueForMoney: { yes: 0, no: 0 },
    likes: {},
  };
}

function mergeFeedbackPreferHigher(current: FeedbackState | null, incoming: FeedbackState | undefined, slug: string): FeedbackState {
  const base = current || emptyFeedback(slug);
  if (!incoming) return base;

  const mergedLikes: Record<string, number> = { ...(base.likes || {}) };
  for (const [key, value] of Object.entries(incoming.likes || {})) {
    mergedLikes[key] = Math.max(Number(mergedLikes[key] || 0), Number(value || 0));
  }

  return {
    slug: incoming.slug || base.slug || slug,
    totalVotes: Math.max(Number(base.totalVotes || 0), Number(incoming.totalVotes || 0)),
    valueVotes: Math.max(Number(base.valueVotes || 0), Number(incoming.valueVotes || 0)),
    likesVotes: Math.max(Number(base.likesVotes || 0), Number(incoming.likesVotes || 0)),
    valueForMoney: {
      yes: Math.max(Number(base.valueForMoney?.yes || 0), Number(incoming.valueForMoney?.yes || 0)),
      no: Math.max(Number(base.valueForMoney?.no || 0), Number(incoming.valueForMoney?.no || 0)),
    },
    likes: mergedLikes,
  };
}

export default function UserFeedbackSection({ slug, name }: UserFeedbackSectionProps) {
  const hasLocalUpdateRef = useRef(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [vote, setVote] = useState<"yes" | "no" | "">("");
  const [likes, setLikes] = useState<string[]>([]);
  const [showValueResults, setShowValueResults] = useState(false);
  const [showLikesResults, setShowLikesResults] = useState(false);
  const [savingValue, setSavingValue] = useState(false);
  const [savingLikes, setSavingLikes] = useState(false);

  const valueStorageKey = `feedback_value_voted_${slug}`;
  const likesStorageKey = `feedback_likes_voted_${slug}`;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}/feedback`, { cache: "no-store" });
        const data = (await res.json()) as { feedback?: FeedbackState };
        if (mounted && data.feedback && !hasLocalUpdateRef.current) {
          setFeedback((prev) => mergeFeedbackPreferHigher(prev, data.feedback, slug));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    const valueVoted = typeof window !== "undefined" ? localStorage.getItem(valueStorageKey) : null;
    const likesVoted = typeof window !== "undefined" ? localStorage.getItem(likesStorageKey) : null;
    if (valueVoted === "1") setShowValueResults(true);
    if (likesVoted === "1") setShowLikesResults(true);
    return () => {
      mounted = false;
    };
  }, [slug, valueStorageKey, likesStorageKey]);

  const totalValueVotes = useMemo(() => {
    return Number(feedback?.valueForMoney.yes || 0) + Number(feedback?.valueForMoney.no || 0);
  }, [feedback]);

  if (loading) {
    return (
      <section className="mt-6 panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400" />
          <h2 className="text-xl font-extrabold text-slate-900">Community Feedback</h2>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const canSubmitLikes = likes.length > 0 && !savingLikes && !showLikesResults;

  async function submitValueVote(selectedVote?: "yes" | "no") {
    const voteToSend = selectedVote || (vote as "yes" | "no" | "");
    if (!voteToSend || savingValue || showValueResults) return;
    setSavingValue(true);
    hasLocalUpdateRef.current = true;
    setShowValueResults(true);
    setFeedback((prev) => {
      const base = prev || emptyFeedback(slug);
      return {
        ...base,
        totalVotes: Number(base.totalVotes || 0) + 1,
        valueVotes: Number(base.valueVotes || 0) + 1,
        valueForMoney: {
          yes: Number(base.valueForMoney?.yes || 0) + (voteToSend === "yes" ? 1 : 0),
          no: Number(base.valueForMoney?.no || 0) + (voteToSend === "no" ? 1 : 0),
        },
      };
    });
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valueForMoney: voteToSend }),
      });
      const data = (await res.json()) as { feedback?: FeedbackState };
      if (res.ok && data.feedback) {
        setFeedback((prev) => mergeFeedbackPreferHigher(prev, data.feedback, slug));
      }
      if (typeof window !== "undefined") localStorage.setItem(valueStorageKey, "1");
    } finally {
      setSavingValue(false);
    }
  }

  async function submitLikesVote() {
    if (!canSubmitLikes) return;
    setSavingLikes(true);
    hasLocalUpdateRef.current = true;
    setShowLikesResults(true);
    setFeedback((prev) => {
      const base = prev || emptyFeedback(slug);
      const nextLikes = { ...(base.likes || {}) };
      for (const key of likes) {
        nextLikes[key] = Number(nextLikes[key] || 0) + 1;
      }
      return {
        ...base,
        totalVotes: Number(base.totalVotes || 0) + 1,
        likesVotes: Number(base.likesVotes || 0) + 1,
        likes: nextLikes,
      };
    });
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes }),
      });
      const data = (await res.json()) as { feedback?: FeedbackState };
      if (res.ok && data.feedback) {
        setFeedback((prev) => mergeFeedbackPreferHigher(prev, data.feedback, slug));
      }
      if (typeof window !== "undefined") localStorage.setItem(likesStorageKey, "1");
    } finally {
      setSavingLikes(false);
    }
  }

  function toggleLike(key: string) {
    if (showLikesResults) return;
    setLikes((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }

  function handleValueSelect(next: "yes" | "no") {
    if (showValueResults || savingValue) return;
    setVote(next);
    void submitValueVote(next);
  }

  return (
    <section className="mt-6 panel p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400" />
        <h2 className="text-xl font-extrabold text-slate-900">Community Feedback</h2>
      </div>

      <div className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <h3 className="text-lg font-bold text-slate-900">Is {name} worth the price?</h3>
          {!showValueResults ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleValueSelect("yes")}
                disabled={savingValue}
                className={`rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                  vote === "yes" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleValueSelect("no")}
                disabled={savingValue}
                className={`rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                  vote === "no" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                No
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Yes</span>
                  <span>{percent(Number(feedback?.valueForMoney.yes || 0), totalValueVotes)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${percent(Number(feedback?.valueForMoney.yes || 0), totalValueVotes)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>No</span>
                  <span>{percent(Number(feedback?.valueForMoney.no || 0), totalValueVotes)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${percent(Number(feedback?.valueForMoney.no || 0), totalValueVotes)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {!showValueResults && savingValue ? <p className="mt-3 text-right text-xs font-semibold text-slate-500">Saving your vote...</p> : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <h3 className="text-lg font-bold text-slate-900">What do you like most?</h3>
          {!showLikesResults ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {LIKE_OPTIONS.map((item) => {
                const active = likes.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleLike(item.key)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {LIKE_OPTIONS.map((item) => {
                const raw = Number(feedback?.likes?.[item.key] || 0);
                const p = percent(raw, Number(feedback?.likesVotes || 0));
                return (
                  <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-2">
                    <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>{item.label}</span>
                      <span>{p}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!showLikesResults ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={submitLikesVote}
                disabled={!canSubmitLikes}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {savingLikes ? "Saving..." : "Submit Vote"}
              </button>
            </div>
          ) : null}
        </article>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {Number(feedback?.valueVotes || 0)} value votes • {Number(feedback?.likesVotes || 0)} preference votes
        </p>
        {showValueResults || showLikesResults ? <p className="text-sm font-bold text-emerald-700">Thanks for your feedback</p> : null}
      </div>
    </section>
  );
}
