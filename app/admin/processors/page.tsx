"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProcessorAdmin } from "@/lib/firestore/processors";

function emptyProcessor(): ProcessorAdmin {
  return {
    name: "",
    vendor: "Qualcomm",
    antutu: 0,
    fabricationNm: undefined,
    maxCpuGhz: undefined,
    gpu: "",
    avgPhoneScore: 0,
    status: "published",
    scheduledAt: "",
  };
}

export default function AdminProcessorsPage() {
  const [rows, setRows] = useState<ProcessorAdmin[]>([]);
  const [form, setForm] = useState<ProcessorAdmin>(emptyProcessor());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = useMemo(() => rows.length, [rows]);

  async function refresh() {
    const response = await fetch("/api/processors?admin=1", { cache: "no-store" });
    const json = await response.json();
    setRows((json.items || []) as ProcessorAdmin[]);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load processors."));
  }, []);

  function setField<K extends keyof ProcessorAdmin>(key: K, value: ProcessorAdmin[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editRow(row: ProcessorAdmin) {
    setEditingId(row.id || null);
    setForm({
      ...emptyProcessor(),
      ...row,
      status: row.status || "published",
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyProcessor());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(editingId ? `/api/processors/${editingId}` : "/api/processors", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save processor.");

      setMessage(editingId ? "Processor updated." : "Processor created.");
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save processor.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProcessor(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this processor?")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/processors/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Delete failed.");
      setMessage("Processor deleted.");
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <main className="space-y-4">
      <section className="panel p-4 sm:p-5">
        <h1 className="text-xl font-extrabold text-slate-900">{editingId ? "Edit Processor" : "Create Processor"}</h1>
        <p className="mt-1 text-sm text-slate-600">Create independent processor entries directly from this panel.</p>
      </section>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Processor Name</span>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Tensor G2"
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Vendor</span>
            <input
              value={form.vendor}
              onChange={(e) => setField("vendor", e.target.value)}
              placeholder="e.g. Google"
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">AnTuTu Score</span>
            <input
              type="number"
              min={0}
              value={form.antutu || 0}
              onChange={(e) => setField("antutu", Number(e.target.value || 0))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fabrication (nm)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.fabricationNm ?? ""}
              onChange={(e) => setField("fabricationNm", e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max CPU (GHz)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.maxCpuGhz ?? ""}
              onChange={(e) => setField("maxCpuGhz", e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">GPU</span>
            <input
              value={form.gpu || ""}
              onChange={(e) => setField("gpu", e.target.value)}
              placeholder="e.g. Mali-G710 MP7"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Score / 10</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={form.avgPhoneScore ?? 0}
              onChange={(e) => setField("avgPhoneScore", Number(e.target.value || 0))}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</span>
            <select
              value={form.status || "published"}
              onChange={(e) => {
                const nextStatus = e.target.value as ProcessorAdmin["status"];
                setField("status", nextStatus);
                if (nextStatus !== "scheduled") setField("scheduledAt", "");
              }}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>

          {form.status === "scheduled" ? (
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Scheduled Date & Time</span>
              <input
                type="datetime-local"
                value={form.scheduledAt || ""}
                onChange={(e) => setField("scheduledAt", e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Update Processor" : "Create Processor"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      <section className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Existing Processors</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{total}</span>
        </div>
        <div className="mt-3 grid gap-3">
          {rows.map((row) => (
            <article key={row.id || row.name} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.vendor} | {row.status || "published"} | AnTuTu: {row.antutu ? `~${Math.round(row.antutu).toLocaleString("en-IN")}` : "NA"}
                </p>
                {row.status === "scheduled" && row.scheduledAt ? (
                  <p className="text-xs text-amber-700">Scheduled: {new Date(row.scheduledAt).toLocaleString()}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => editRow(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Edit
                </button>
                <button type="button" onClick={() => removeProcessor(row.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No processors yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
