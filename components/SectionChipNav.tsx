"use client";

import { useEffect, useRef, useState } from "react";

type SectionChip = {
  id: string;
  label: string;
};

type SectionChipNavProps = {
  items: SectionChip[];
  className?: string;
};

export default function SectionChipNav({ items, className = "" }: SectionChipNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || "");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function updateScrollButtons() {
    const track = trackRef.current;
    if (!track) return;
    const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    setCanScrollLeft(track.scrollLeft > 2);
    setCanScrollRight(track.scrollLeft < maxLeft - 2);
  }

  useEffect(() => {
    if (!items.length) return;

    const ids = items.map((item) => item.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const id = visible[0].target.id;
        if (id) setActiveId(id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (!activeId) return;
    chipRefs.current[activeId]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  useEffect(() => {
    updateScrollButtons();
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => updateScrollButtons();
    const onResize = () => updateScrollButtons();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [items]);

  function scrollTrack(amount: number) {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  function jumpTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  if (!items.length) return null;

  return (
    <section className={`panel sticky top-0 z-40 mt-4 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/90 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollTrack(-260)}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 ${
            canScrollLeft ? "" : "invisible pointer-events-none"
          }`}
          aria-label="Scroll chips left"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={trackRef}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  chipRefs.current[item.id] = node;
                }}
                type="button"
                onClick={() => jumpTo(item.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
                aria-current={active ? "true" : "false"}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollTrack(260)}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 ${
            canScrollRight ? "" : "invisible pointer-events-none"
          }`}
          aria-label="Scroll chips right"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
