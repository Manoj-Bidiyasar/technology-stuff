"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProcessorAdmin } from "@/lib/firestore/processors";
import { slugify } from "@/utils/slugify";

type StatusFilter = "all" | "draft" | "review" | "published" | "scheduled" | "recently_deleted";
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

export default function AdminProcessorsPage() {
  const [rows, setRows] = useState<ProcessorAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [createTitle, setCreateTitle] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createSlugInput, setCreateSlugInput] = useState("");
  const [createSlugEdited, setCreateSlugEdited] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const suggestedSlug = useMemo(() => slugify(createTitle || ""), [createTitle]);
  const createSlug = useMemo(
    () => slugify((createSlugEdited ? createSlugInput : suggestedSlug) || createTitle || ""),
    [createSlugEdited, createSlugInput, suggestedSlug, createTitle]
  );
  const createDocId = createSlug;
  const createTitleSuggestions = useMemo(() => {
    const hints = BRAND_TITLE_HINTS[createBrand] || [];
    if (!createBrand || hints.length === 0) return [];
    const raw = createTitle.trim();
    const afterBrand = raw.toLowerCase().startsWith(createBrand.toLowerCase()) ? raw.slice(createBrand.length).trim() : raw;
    if (!afterBrand) return hints;
    return hints.filter((item) => item.toLowerCase().startsWith(afterBrand.toLowerCase()));
  }, [createBrand, createTitle]);
  const isCreateDocDuplicate = useMemo(
    () => Boolean(createDocId) && rows.some((row) => String(row.id || "").toLowerCase() === createDocId.toLowerCase()),
    [createDocId, rows]
  );

  async function refresh() {
    const response = await fetch("/api/processors?admin=1", { cache: "no-store", credentials: "include" });
    const json = await response.json();
    setRows((json.items || []) as ProcessorAdmin[]);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load processors."));
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && (row.status || "published") !== statusFilter) return false;
      if (vendorFilter !== "all" && String(row.vendor || "").toLowerCase() !== vendorFilter.toLowerCase()) return false;
      const rowClass = String(row.detail?.className || "").trim().toLowerCase();
      if (classFilter !== "all" && rowClass !== classFilter.toLowerCase()) return false;
      if (!q) return true;
      const hay = [row.name, row.vendor, row.id, row.gpu, row.status].map((v) => String(v || "").toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }, [classFilter, query, rows, statusFilter, vendorFilter]);

  const vendorOptions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => String(row.vendor || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [rows]
  );

  const classOptions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => String(row.detail?.className || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [rows]
  );

  async function changeStatus(id: string, status: ProcessorAdmin["status"]) {
    const response = await fetch(`/api/processors/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Status update failed.");
  }

  async function moveToRecentlyDeleted(id?: string) {
    if (!id) return;
    if (!window.confirm("Move this processor to Recently Deleted?")) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "recently_deleted");
      setMessage("Processor moved to recently deleted.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move.");
    }
  }

  async function restoreProcessor(id?: string) {
    if (!id) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "draft");
      setMessage("Processor restored as draft.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    }
  }

  async function deletePermanently(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this processor permanently?")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/processors/${id}`, { method: "DELETE", credentials: "include" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
      setMessage("Processor deleted permanently.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent delete failed.");
    }
  }

  async function moveSelectedToRecentlyDeleted() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} selected processor(s) to Recently Deleted?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "recently_deleted")));
      setSelectedIds([]);
      setMessage("Selected processors moved to recently deleted.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk move failed.");
    }
  }

  return (
    <main className="space-y-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Processors</h2>
            <p className="mt-1 text-sm text-slate-600">Manage processor entries and publish status.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Create Processor</h3>
              <p className="mt-1 text-sm text-slate-600">Set top fields first, then open full editor.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Quick Create</span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Brand</span>
              <select
                value={createBrand}
                onChange={(e) => {
                  const nextBrand = e.target.value;
                  setCreateBrand(nextBrand);
                  setCreateTitle(nextBrand ? `${nextBrand} ` : "");
                  setCreateSlugInput("");
                  setCreateSlugEdited(false);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
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
                value={createSlug}
                onChange={(e) => {
                  setCreateSlugInput(e.target.value);
                  setCreateSlugEdited(true);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">Title (Processor Name)</span>
                {createBrand && createTitleSuggestions.length > 0 ? (
                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    {createTitleSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const next = `${createBrand} ${item}`.trim();
                          setCreateTitle(next);
                          if (!createSlugEdited) setCreateSlugInput(slugify(next));
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {item}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
              <input
                value={createTitle}
                onChange={(e) => {
                  const next = e.target.value;
                  setCreateTitle(next);
                  if (!createSlugEdited) setCreateSlugInput(slugify(next));
                }}
                placeholder="Samsung Exynos 2400"
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Document ID</span>
              <input value={createDocId} readOnly className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600" />
            </label>
          </div>

          <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
            <Link
              href={
                createTitle && createSlug && !isCreateDocDuplicate
                  ? `/admin/processor-bootstrap?name=${encodeURIComponent(createTitle)}&slug=${encodeURIComponent(createSlug)}&brand=${encodeURIComponent(createBrand)}`
                  : "/admin/processors"
              }
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
                !createTitle || !createSlug || isCreateDocDuplicate ? "pointer-events-none bg-slate-400" : "bg-blue-700 shadow-sm"
              }`}
            >
              Create New Processor
            </Link>
          </div>
          {isCreateDocDuplicate ? (
            <p className="mt-2 text-center text-xs font-semibold text-rose-700">
              Slug/Document ID already exists. Please change slug to a unique value.
            </p>
          ) : null}
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <h3 className="text-lg font-bold text-slate-900">Processor List</h3>
        <div className="mt-3 grid gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by processor name, vendor, id..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "draft", label: "Draft" },
                { key: "review", label: "Review" },
                { key: "published", label: "Published" },
                { key: "scheduled", label: "Scheduled" },
                { key: "recently_deleted", label: "Recently Deleted" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as StatusFilter)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${
                    statusFilter === item.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {vendorOptions.map((item) => (
                  <option key={`vendor-${item}`} value={item}>
                    {item === "all" ? "All Vendors" : item}
                  </option>
                ))}
              </select>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {classOptions.map((item) => (
                  <option key={`class-${item}`} value={item}>
                    {item === "all" ? "All Classes" : item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={moveSelectedToRecentlyDeleted}
            disabled={selectedIds.length === 0}
            className="w-fit rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            Move Selected to Recently Deleted ({selectedIds.length})
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Select</th>
                <th className="px-4 py-3 font-semibold">Processor</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">AnTuTu</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Creator</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id || row.name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    {row.id ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) =>
                            e.target.checked ? [...prev, row.id as string] : prev.filter((id) => id !== row.id)
                          )
                        }
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{row.name || "-"}</p>
                    <p className="text-xs text-slate-500">{row.id || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{row.vendor || "-"}</td>
                  <td className="px-4 py-3 text-slate-800">{row.antutu ? `~${Math.round(row.antutu).toLocaleString("en-IN")}` : "NA"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        (row.status || "published") === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "draft"
                            ? "bg-amber-100 text-amber-800"
                            : row.status === "recently_deleted"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {row.status || "published"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{row.createdBy || "Admin"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={row.id ? `/admin/processor-editor?id=${encodeURIComponent(row.id)}` : "/admin/processor-create"}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Edit
                      </Link>
                      {row.status === "recently_deleted" ? (
                        <>
                          <button type="button" onClick={() => restoreProcessor(row.id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Restore
                          </button>
                          <button type="button" onClick={() => deletePermanently(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                            Delete Forever
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => moveToRecentlyDeleted(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No processors found for current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
