"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type HelperScope = "processor" | "smartphone" | "tablet" | "blog";
type HelperTerm = {
  section: string;
  field?: string;
  name: string;
  aliases?: string[];
  status?: "pending" | "approved";
  createdAt?: string;
  updatedAt?: string;
};

const SCOPE_ROUTES: Record<HelperScope, { label: string; slug: string }> = {
  processor: { label: "Processor Terms", slug: "processor-terms" },
  smartphone: { label: "Smartphone Terms", slug: "smartphone-terms" },
  tablet: { label: "Tablet Terms", slug: "tablet-terms" },
  blog: { label: "Blog Terms", slug: "blog-terms" },
};

const SECTION_SUGGESTIONS = [
  "Basic",
  "Benchmark",
  "CPU",
  "Graphics (GPU)",
  "AI",
  "Memory",
  "Storage",
  "Camera",
  "Video",
  "Display",
  "Multimedia",
  "Connectivity",
  "Charging",
  "Source",
  "Other",
];

const PROCESSOR_FIELD_SUGGESTIONS: Record<string, string[]> = {
  Basic: ["announced", "manufacturer", "className", "model"],
  Benchmark: ["benchmarks.antutuVersion", "benchmarks.antutu", "benchmarks.geekbenchVersion", "benchmarks.geekbenchSingle", "benchmarks.geekbenchMulti", "benchmarks.threeDMarkName", "benchmarks.threeDMark"],
  CPU: ["cpuCoreName", "coreCount", "coreConfiguration", "cores", "instructionSet", "architectureBits", "process", "transistorCount", "l2Cache", "l3Cache", "slcCache", "tdpW", "cpuFeatures"],
  "Graphics (GPU)": ["gpuName", "gpuArchitecture", "pipelines", "shadingUnits", "gpuFrequencyMhz", "vulkanVersion", "openclVersion", "directxVersion", "gpuFeatures", "gpuApis", "gpuFlops"],
  AI: ["aiEngine", "aiPerformanceTops", "aiPrecision", "aiFeatures"],
  Memory: ["memoryType", "memoryTypes", "memoryFreqMhz", "memoryFreqByType", "memoryChannels", "memoryBusWidthBits", "maxMemoryGb", "bandwidthGbps"],
  Storage: ["storageChannels", "storageType", "storageTypes"],
  Camera: ["cameraIsp", "maxCameraSupport", "cameraSupportModes", "cameraFeatures"],
  Video: ["maxVideoCapture", "videoCapture", "videoRecordingModes", "videoRecordingCodecs", "videoPlaybackCodecs", "videoRecordingHdrFormats", "videoPlaybackHdrFormats", "videoFeatures", "videoPlayback"],
  Display: ["maxDisplayResolution", "maxRefreshRateHz", "displayModes", "outputDisplay", "displayFeatures"],
  Multimedia: ["audioCodecs", "multimediaFeatures"],
  Connectivity: ["modem", "networkSupport", "dual5g", "downloadMbps", "uploadMbps", "wifi", "bluetooth", "bluetoothFeatures", "navigation", "gnssType"],
  Charging: ["quickCharging", "chargingSpeed"],
  Source: ["sourceUrl"],
  Other: ["seo.metaTitle", "seo.metaDescription", "seo.canonicalUrl", "seo.summary", "seo.focusKeyword", "seo.tags", "seo.ogImage", "seo.noIndex"],
};

function getFieldSuggestions(scope: HelperScope, section: string): string[] {
  if (scope !== "processor") return [];
  return PROCESSOR_FIELD_SUGGESTIONS[section] || [];
}


function resolveScopeFromSlug(slug: string | undefined): HelperScope {
  const value = String(slug || "").toLowerCase();
  if (value.includes("smartphone")) return "smartphone";
  if (value.includes("tablet")) return "tablet";
  if (value.includes("blog")) return "blog";
  return "processor";
}

export default function AdminHelperPage() {
  const params = useParams();
  const scope = resolveScopeFromSlug(String(params?.scope || ""));
  const [items, setItems] = useState<HelperTerm[]>([]);
  const [draft, setDraft] = useState<{ section: string; field: string; name: string }>({
    section: "",
    field: "",
    name: "",
  });
  const [showFile, setShowFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastSavedItems, setLastSavedItems] = useState<HelperTerm[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const helperTitle = useMemo(() => SCOPE_ROUTES[scope].label, [scope]);
  const helperFileJson = useMemo(() => JSON.stringify({ scope, items }, null, 2), [scope, items]);
  const savedKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    lastSavedItems.forEach((item) => {
      const section = String(item.section || "").trim().toLowerCase();
      const field = String(item.field || "").trim().toLowerCase();
      const name = String(item.name || "").trim().toLowerCase();
      if (!section || !name) return;
      const key = `${section}::${field}::${name}`;
      map.set(key, String(item.name || ""));
    });
    return map;
  }, [lastSavedItems]);
  const sectionOptions = useMemo(() => {
    const fromItems = items.map((item) => item.section).filter(Boolean);
    const merged = new Set([...SECTION_SUGGESTIONS, ...fromItems]);
    return Array.from(merged);
  }, [items]);
  const fieldOptions = useMemo(() => getFieldSuggestions(scope, draft.section.trim()), [scope, draft.section]);
  const groupedItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (!term) return true;
        return item.name.toLowerCase().includes(term) || item.section.toLowerCase().includes(term) || String(item.field || "").toLowerCase().includes(term);
      });
    const map = new Map<string, Array<{ item: HelperTerm; index: number }>>();
    for (const row of rows) {
      const section = row.item.section || "Other";
      const list = map.get(section) || [];
      list.push(row);
      map.set(section, list);
    }
    const orderedSections = sectionOptions
      .filter((section) => map.has(section))
      .concat(Array.from(map.keys()).filter((section) => !sectionOptions.includes(section)));
    return orderedSections.map((section) => ({ section, rows: map.get(section) || [] }));
  }, [items, searchTerm, sectionOptions]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setMessage("Loading...");
        const res = await fetch(`/api/admin/helper-terms?scope=${scope}`, { cache: "no-store" });
        const json = (await res.json()) as { items?: HelperTerm[] };
        if (!active) return;
        const normalized = (json.items || []).map((item) => ({
          ...item,
          status: item.status || "approved",
        }));
        setItems(normalized);
        setLastSavedItems(normalized);
        setMessage("");
      } catch {
        if (!active) return;
        setMessage("");
        setError("Failed to load helper terms.");
      }
    }
    load().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [scope]);

  async function save() {
    try {
      setError("");
      setMessage("Saving...");
      const res = await fetch("/api/admin/helper-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, items }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved.");
      setLastSavedItems(items);
      setTimeout(() => setMessage(""), 1200);
    } catch (err) {
      setMessage("");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <main className="space-y-4">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{helperTitle}</h1>
            <p className="mt-1 text-xs text-slate-500">Manage canonical names.</p>
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <div className="inline-flex w-full max-w-[520px] rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold text-slate-700">
            {Object.entries(SCOPE_ROUTES).map(([key, value]) => (
              <Link
                key={key}
                href={`/admin/helper/${value.slug}`}
                className={`flex-1 rounded-md px-3 py-2 text-center ${
                  scope === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {value.label.replace(" Terms", "")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">{helperTitle}</h2>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-3">
          <button
            type="button"
            onDoubleClick={() => setShowFile((prev) => !prev)}
            className={`group flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-semibold transition ${
              showFile ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"
            }`}
            title="Double click to open"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              showFile ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  d="M6 2h7l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                  fill="currentColor"
                  opacity="0.2"
                />
                <path
                  d="M13 2v5h5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 12h8M8 16h8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-center text-[11px] font-semibold leading-tight">{helperTitle}</span>
          </button>
        </div>

        {showFile ? (
          <>
            <div className="mt-4 grid gap-3">
              <div className="flex items-end gap-3 overflow-x-auto">
                <label className="grid w-full min-w-[240px] gap-1 sm:w-[50%] sm:min-w-[360px]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Search</span>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 appearance-none rounded-lg border border-slate-200 px-3 text-sm [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden"
                    placeholder="Search by section or name"
                  />
                </label>
                <div className="ml-auto flex shrink-0 items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm((prev) => !prev)}
                    className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                  >
                    Add New Entries
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([helperFileJson], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `helper-terms-${scope}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download File
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Save to File
                  </button>
                </div>
              </div>

              {showAddForm ? (
                <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1.6fr_auto]">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
                    <input
                      list="helper-section-options"
                      value={draft.section}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, section: e.target.value }));
                        setError("");
                      }}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Select section"
                    />
                    <datalist id="helper-section-options">
                      {sectionOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Field Name</span>
                    <input
                      list="helper-field-options"
                      value={draft.field}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, field: e.target.value }));
                        setError("");
                      }}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Optional field key"
                    />
                    <datalist id="helper-field-options">
                      {fieldOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Name</span>
                    <input
                      value={draft.name}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, name: e.target.value }));
                        setError("");
                      }}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Canonical name"
                    />
                  </label>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">&nbsp;</span>
                    <button
                      type="button"
                      onClick={() => {
                        const section = draft.section.trim();
                        const name = draft.name.trim();
                        if (!section || !name) {
                          setError("Please fill Section and Name before adding.");
                          return;
                        }
                        const next: HelperTerm = {
                          section,
                          field: draft.field.trim() || undefined,
                          name,
                          aliases: [],
                          status: "approved",
                          createdAt: new Date().toISOString(),
                        };
                        setItems((prev) => [next, ...prev]);
                        setDraft({ section: "", field: "", name: "" });
                        setSearchTerm("");
                        setMessage(`Added "${name}" to ${section}.`);
                        setError("");
                      }}
                      className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}

              {groupedItems.map(({ section, rows }) => (
                <div key={section} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{section}</p>
                    <span className="text-xs font-semibold text-slate-500">{rows.length}</span>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <div className="grid min-w-[920px] gap-2 lg:grid-cols-2">
                    {rows.map(({ item, index }) => {
                      const isSaved = savedKeyMap.has(`${String(item.section || "").trim().toLowerCase()}::${String(item.field || "").trim().toLowerCase()}::${String(item.name || "").trim().toLowerCase()}`);
                      const rowFieldOptions = getFieldSuggestions(scope, item.section || section);
                      return (
                      <div
                        key={`term-${item.section}-${item.field || "none"}-${item.name}-${index}`}
                        className={`relative grid gap-2 rounded-md border p-2 ${isSaved ? "border-slate-200 bg-slate-50 grid-cols-[120px_minmax(0,1fr)_auto]" : "border-rose-300 lg:grid-cols-[1fr_1.1fr_1.6fr_auto] lg:col-span-2"}`}
                      >
                        {!isSaved ? (
                          <span className="absolute -top-2 left-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                            Not saved
                          </span>
                        ) : null}
                        {!isSaved ? (
                          <>
                            <input
                              value={item.section}
                              list={`helper-section-options-${section}-${index}`}
                              onChange={(e) => {
                                const nextSection = e.target.value;
                                setItems((prev) =>
                                  prev.map((entry, idx) => (idx === index ? { ...entry, section: nextSection } : entry)),
                                );
                              }}
                              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900"
                            />
                            <datalist id={`helper-section-options-${section}-${index}`}>
                              {sectionOptions.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </>
                        ) : null}
                        {isSaved ? (
                          <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">
                            {item.field || "-"}
                          </div>
                        ) : (
                          <>
                            <input
                              value={item.field || ""}
                              list={`helper-field-options-${section}-${index}`}
                              onChange={(e) => {
                                const nextField = e.target.value;
                                setItems((prev) =>
                                  prev.map((entry, idx) => (idx === index ? { ...entry, field: nextField || undefined } : entry)),
                                );
                              }}
                              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900"
                              placeholder="Optional field key"
                            />
                            <datalist id={`helper-field-options-${section}-${index}`}>
                              {rowFieldOptions.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </>
                        )}
                        {isSaved ? (
                          <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900">
                            {item.name}
                          </div>
                        ) : (
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const nextName = e.target.value;
                              setItems((prev) =>
                                prev.map((entry, idx) => (idx === index ? { ...entry, name: nextName } : entry)),
                              );
                            }}
                            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const ok = window.confirm(`Delete "${item.name}"?`);
                            if (!ok) return;
                            setItems((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Delete"
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    );})}
                    {rows.length === 0 ? (
                      <p className="text-xs text-slate-500">No terms in this section.</p>
                    ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {groupedItems.length === 0 ? (
                <p className="text-xs text-slate-500">No matching terms.</p>
              ) : null}
            </div>

            {error ? <p className="mt-2 text-xs font-semibold text-amber-600">{error}</p> : null}
            {message ? <p className="mt-2 text-xs font-semibold text-slate-600">{message}</p> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
