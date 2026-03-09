"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/utils/slugify";

const BRAND_OPTIONS = ["Samsung", "Qualcomm", "MediaTek", "Apple", "Google", "Unisoc", "Huawei", "Intel", "AMD"];
const BRAND_TITLE_HINTS: Record<string, string[]> = {
  Samsung: ["Exynos"],
  Qualcomm: ["Snapdragon"],
  MediaTek: ["Dimensity", "Helio"],
  Google: ["Tensor"],
  Apple: ["A", "M"],
  Unisoc: ["Tiger", "T"],
  Huawei: ["Kirin"],
  Intel: ["Core", "Atom"],
  AMD: ["Ryzen"],
};

export default function AdminNewProcessorPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [brand, setBrand] = useState("");
  const [error, setError] = useState("");

  const suggestedSlug = useMemo(() => slugify(title || ""), [title]);
  const effectiveSlug = slugify((slugEdited ? slug : suggestedSlug) || title || "");
  const docId = effectiveSlug;
  const titleSuggestions = useMemo(() => {
    const hints = BRAND_TITLE_HINTS[brand] || [];
    if (!brand || hints.length === 0) return [];
    const raw = title.trim();
    const afterBrand = raw.toLowerCase().startsWith(brand.toLowerCase()) ? raw.slice(brand.length).trim() : raw;
    if (!afterBrand) return hints;
    return hints.filter((item) => item.toLowerCase().startsWith(afterBrand.toLowerCase()));
  }, [brand, title]);

  async function openEditor() {
    setError("");
    if (!title || !effectiveSlug) return;
    const existsResponse = await fetch(`/api/processors/${encodeURIComponent(docId)}`, { cache: "no-store", credentials: "include" });
    if (existsResponse.ok) {
      setError("Slug/Document ID already exists. Please use a unique slug.");
      return;
    }
    router.push(`/admin/processor-bootstrap?name=${encodeURIComponent(title)}&slug=${encodeURIComponent(effectiveSlug)}&brand=${encodeURIComponent(brand)}`);
  }

  return (
    <main className="space-y-4">
      <section className="panel max-w-3xl p-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Create Processor</h1>
        <p className="mt-1 text-sm text-slate-600">Set top fields first, then open full editor.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Title (Processor Name)</span>
            <input
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!slugEdited) setSlug(slugify(next));
              }}
              placeholder="Snapdragon 8 Gen 3"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            {brand && titleSuggestions.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {titleSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const next = `${brand} ${item}`.trim();
                      setTitle(next);
                      if (!slugEdited) setSlug(slugify(next));
                    }}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Brand</span>
            <select
              value={brand}
              onChange={(e) => {
                const nextBrand = e.target.value;
                setBrand(nextBrand);
                setTitle(nextBrand ? `${nextBrand} ` : "");
                setSlug("");
                setSlugEdited(false);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">Select Brand</option>
              {BRAND_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Slug</span>
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugEdited(true);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Document ID</span>
            <input value={docId} readOnly className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" />
          </label>

          <div className="pt-1 sm:col-span-2">
            <button
              type="button"
              onClick={openEditor}
              disabled={!title || !effectiveSlug}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create New Processor
            </button>
            <p className="mt-2 text-xs text-slate-500">Document will be created on first save.</p>
            {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
