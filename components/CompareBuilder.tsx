"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type CompareItem = {
  slug: string;
  name: string;
  brand: string;
  image?: string;
};

type CompareBuilderProps = {
  initialSelected?: CompareItem[];
};

export default function CompareBuilder({ initialSelected = [] }: CompareBuilderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<CompareItem[]>(initialSelected.slice(0, 3));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompareItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&deviceType=smartphone`, { cache: "no-store" });
        const data = (await res.json()) as { items?: CompareItem[] };
        if (!mounted) return;
        const next = (data.items || []).filter((item) => !selected.some((s) => s.slug === item.slug));
        setResults(next);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 180);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, selected]);

  const canCompare = selected.length >= 2;
  const selectedSlugs = useMemo(() => selected.map((item) => item.slug).slice(0, 3), [selected]);

  function addPhone(item: CompareItem) {
    if (selected.length >= 3) return;
    if (selected.some((row) => row.slug === item.slug)) return;
    setSelected((prev) => [...prev, item].slice(0, 3));
    setQuery("");
    setResults([]);
  }

  function removePhone(slug: string) {
    setSelected((prev) => prev.filter((item) => item.slug !== slug));
  }

  function startCompare() {
    if (!canCompare) return;
    router.push(`/compare/${selectedSlugs.join("-vs-")}`);
  }

  if (!open) {
    return (
      <section className="panel p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
        >
          Open Compare Builder
        </button>
      </section>
    );
  }

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-slate-900">Compare</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-extrabold text-slate-700"
          aria-label="Close compare builder"
        >
          x
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selected.map((item) => (
          <span key={item.slug} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            {item.name}
            <button type="button" onClick={() => removePhone(item.slug)} className="text-sm leading-none text-blue-700">
              x
            </button>
          </span>
        ))}
        {selected.length === 0 ? <span className="text-xs font-semibold text-slate-500">No phones selected yet.</span> : null}
      </div>

      <div className="mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add phone (e.g. Samsung, Galaxy F, F17, 17...)"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500/30 focus:ring"
        />

        {query.trim() ? (
          <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white">
            {loading ? <p className="px-3 py-2 text-sm text-slate-500">Searching...</p> : null}
            {!loading && results.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">Mobile not available</p> : null}
            {!loading
              ? results.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => addPhone(item)}
                    disabled={selected.length >= 3}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-800 last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Image
                        src={item.image || "https://placehold.co/40x40?text=P"}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded border border-slate-200 object-contain"
                        unoptimized
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{item.brand}</span>
                  </button>
                ))
              : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">Select 2 to 3 phones</p>
        <button
          type="button"
          onClick={startCompare}
          disabled={!canCompare}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Compare
        </button>
      </div>
    </section>
  );
}
