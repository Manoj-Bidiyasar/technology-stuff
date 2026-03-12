"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlogPost } from "@/lib/types/content";
import { slugify } from "@/utils/slugify";

function emptyBlog(): BlogPost {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    tags: [],
    categories: [],
    status: "draft",
    seo: {
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      focusKeyword: "",
      ogImage: "",
      noIndex: false,
    },
    workflow: {
      stage: "draft",
      priority: "medium",
      assignee: "",
      dueDate: "",
      notes: "",
    },
  };
}

type SaveMode = "manual" | "autosave";

export default function AdminBlogsPage() {
  const [rows, setRows] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogPost>(emptyBlog());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string>("");
  const saveInFlightRef = useRef(false);
  const [helperAliasMap, setHelperAliasMap] = useState<Record<string, string>>({});
  const [helperSuggestions, setHelperSuggestions] = useState<string[]>([]);

  const finalSlug = useMemo(() => form.slug || slugify(form.title), [form.slug, form.title]);

  async function refresh() {
    const response = await fetch("/api/blogs?admin=1", { cache: "no-store" });
    const json = await response.json();
    setRows((json.items || []) as BlogPost[]);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load blogs."));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadHelper() {
      try {
        const response = await fetch("/api/admin/helper-terms?scope=blog", { cache: "no-store" });
        if (!response.ok) return;
        const json = (await response.json()) as { items?: { name: string; aliases?: string[]; status?: string }[] };
        if (!active) return;
        const map: Record<string, string> = {};
        const suggestions = new Set<string>();
        (json.items || []).forEach((item) => {
          if (item.status && item.status !== "approved") return;
          const canonical = String(item.name || "").trim();
          if (!canonical) return;
          suggestions.add(canonical);
          const all = [canonical, ...(item.aliases || [])];
          all.forEach((alias) => {
            const key = normalizeLookupKey(alias);
            if (key) map[key] = canonical;
          });
        });
        setHelperAliasMap(map);
        setHelperSuggestions(Array.from(suggestions).sort((a, b) => a.localeCompare(b)));
      } catch {
        // ignore
      }
    }
    loadHelper().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (editingId) return;
    try {
      const raw = window.localStorage.getItem("admin_blog_draft_new");
      if (!raw) return;
      const parsed = JSON.parse(raw) as BlogPost;
      if (!parsed || !parsed.title) return;
      setForm({ ...emptyBlog(), ...parsed });
      setMessage("Recovered unsaved local draft.");
    } catch {
      // Ignore restore errors.
    }
  }, [editingId]);

  useEffect(() => {
    const key = editingId ? `admin_blog_draft_${editingId}` : "admin_blog_draft_new";
    try {
      window.localStorage.setItem(key, JSON.stringify(form));
    } catch {
      // Ignore local storage errors.
    }
  }, [form, editingId]);

  function updateForm(next: BlogPost) {
    setForm(next);
    setDirty(true);
    setMessage("");
  }

  function setField<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    updateForm({ ...form, [key]: value });
  }

  function setSeoField<K extends keyof NonNullable<BlogPost["seo"]>>(key: K, value: NonNullable<BlogPost["seo"]>[K]) {
    updateForm({
      ...form,
      seo: {
        ...(form.seo || {}),
        [key]: value,
      },
    });
  }

  function setWorkflowField<K extends keyof NonNullable<BlogPost["workflow"]>>(
    key: K,
    value: NonNullable<BlogPost["workflow"]>[K]
  ) {
    updateForm({
      ...form,
      workflow: {
        ...(form.workflow || {}),
        [key]: value,
      },
    });
  }

  function normalizeLookupKey(value: string): string {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeTextToken(value: string): string {
    const compact = String(value || "").trim().replace(/\s+/g, " ");
    if (!compact) return "";
    const alias = helperAliasMap[normalizeLookupKey(compact)];
    return alias || compact;
  }

  function normalizeCsvArray(values: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    values.forEach((item) => {
      const normalized = normalizeTextToken(item);
      if (!normalized) return;
      const key = normalizeLookupKey(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });
    return out;
  }

  const buildPayload = useCallback((mode: SaveMode): BlogPost => {
    const normalizedTitle = normalizeTextToken(form.title);
    const normalizedTags = normalizeCsvArray(form.tags || []);
    const normalizedCategories = normalizeCsvArray(form.categories || []);
    return {
      ...form,
      title: normalizedTitle,
      slug: finalSlug,
      tags: normalizedTags,
      categories: normalizedCategories,
      status: mode === "autosave" && !editingId ? "draft" : form.status,
      workflow: {
        ...(form.workflow || {}),
        lastAutoSavedAt: mode === "autosave" ? new Date().toISOString() : form.workflow?.lastAutoSavedAt,
      },
    };
  }, [editingId, finalSlug, form, helperAliasMap]);

  const saveBlog = useCallback(async (mode: SaveMode): Promise<boolean> => {
    if (saveInFlightRef.current) return false;
    if (!form.title.trim()) return false;
    if (!finalSlug.trim()) return false;

    saveInFlightRef.current = true;
    if (mode === "manual") {
      setSaving(true);
      setError("");
    }

    try {
      const payload = buildPayload(mode);
      const endpoint = editingId ? `/api/blogs/${editingId}` : "/api/blogs";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save blog.");

      if (!editingId && json.id) {
        setEditingId(String(json.id));
      }
      const now = new Date().toLocaleTimeString();
      if (mode === "manual") {
        setLastSavedAt(now);
        setMessage(editingId ? "Blog updated." : "Blog created.");
      } else {
        setLastAutoSavedAt(now);
      }
      setDirty(false);
      await refresh();
      return true;
    } catch (err) {
      if (mode === "manual") {
        setError(err instanceof Error ? err.message : "Failed to save blog.");
      }
      return false;
    } finally {
      saveInFlightRef.current = false;
      if (mode === "manual") {
        setSaving(false);
      }
    }
  }, [buildPayload, editingId, finalSlug, form]);

  useEffect(() => {
    if (!autosaveEnabled || !dirty) return;
    const timer = window.setTimeout(() => {
      saveBlog("autosave").catch(() => undefined);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, dirty, saveBlog]);

  function editRow(row: BlogPost) {
    setEditingId(row.id || null);
    setForm({
      ...emptyBlog(),
      ...row,
      tags: row.tags || [],
      categories: row.categories || [],
      seo: { ...emptyBlog().seo, ...(row.seo || {}) },
      workflow: { ...emptyBlog().workflow, ...(row.workflow || {}) },
    });
    setDirty(false);
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyBlog());
    setDirty(false);
    setMessage("");
    setError("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await saveBlog("manual");
  }

  async function removeBlog(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this blog?")) return;
    try {
      const response = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Delete failed.");
      setMessage("Blog deleted.");
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <main className="space-y-4">
      <section className="panel p-4 sm:p-5">
        <h1 className="text-xl font-extrabold text-slate-900">{editingId ? "Edit Blog" : "Create Blog"}</h1>
        <p className="mt-1 text-sm text-slate-600">Live preview, autosave, SEO section, and workflow section.</p>
      </section>

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="panel grid gap-3 p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Basic Info</h2>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              onBlur={(e) => {
                const normalized = normalizeTextToken(e.target.value);
                if (normalized && normalized !== e.target.value) setField("title", normalized);
              }}
              list={helperSuggestions.length ? "suggest-helper" : undefined}
              placeholder="Title"
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
            <input value={form.slug} onChange={(e) => setField("slug", slugify(e.target.value))} placeholder="Slug (optional)" className="rounded-lg border border-slate-200 px-3 py-2" />
            <p className="text-xs text-slate-500">Final slug: {finalSlug || "-"}</p>
            <textarea value={form.excerpt || ""} onChange={(e) => setField("excerpt", e.target.value)} placeholder="Excerpt" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2" />
            <input value={form.featuredImage || ""} onChange={(e) => setField("featuredImage", e.target.value)} placeholder="Featured image URL" className="rounded-lg border border-slate-200 px-3 py-2" />
            <textarea value={form.content || ""} onChange={(e) => setField("content", e.target.value)} placeholder="HTML content" className="min-h-56 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
            <input
              value={(form.tags || []).join(", ")}
              onChange={(e) => setField("tags", e.target.value.split(",").map((x) => x.trim()))}
              onBlur={(e) => {
                const normalized = normalizeCsvArray(e.target.value.split(",").map((x) => x.trim()));
                setField("tags", normalized);
              }}
              list={helperSuggestions.length ? "suggest-helper" : undefined}
              placeholder="Tags (comma separated)"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              value={(form.categories || []).join(", ")}
              onChange={(e) => setField("categories", e.target.value.split(",").map((x) => x.trim()))}
              onBlur={(e) => {
                const normalized = normalizeCsvArray(e.target.value.split(",").map((x) => x.trim()));
                setField("categories", normalized);
              }}
              list={helperSuggestions.length ? "suggest-helper" : undefined}
              placeholder="Categories (comma separated)"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </section>

          <section className="panel grid gap-3 p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">SEO Section</h2>
            <input value={form.seo?.metaTitle || ""} onChange={(e) => setSeoField("metaTitle", e.target.value)} placeholder="Meta title" className="rounded-lg border border-slate-200 px-3 py-2" />
            <textarea value={form.seo?.metaDescription || ""} onChange={(e) => setSeoField("metaDescription", e.target.value)} placeholder="Meta description" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2" />
            <input value={form.seo?.canonicalUrl || ""} onChange={(e) => setSeoField("canonicalUrl", e.target.value)} placeholder="Canonical URL" className="rounded-lg border border-slate-200 px-3 py-2" />
            <input value={form.seo?.focusKeyword || ""} onChange={(e) => setSeoField("focusKeyword", e.target.value)} placeholder="Focus keyword" className="rounded-lg border border-slate-200 px-3 py-2" />
            <input value={form.seo?.ogImage || ""} onChange={(e) => setSeoField("ogImage", e.target.value)} placeholder="OG image URL" className="rounded-lg border border-slate-200 px-3 py-2" />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={Boolean(form.seo?.noIndex)} onChange={(e) => setSeoField("noIndex", e.target.checked)} />
              No index
            </label>
          </section>

          <section className="panel grid gap-3 p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Workflow Section</h2>
            <select value={form.status} onChange={(e) => setField("status", e.target.value as BlogPost["status"])} className="rounded-lg border border-slate-200 px-3 py-2">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <select
              value={form.workflow?.stage || "draft"}
              onChange={(e) => setWorkflowField("stage", e.target.value as NonNullable<BlogPost["workflow"]>["stage"])}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
            <select
              value={form.workflow?.priority || "medium"}
              onChange={(e) => setWorkflowField("priority", e.target.value as NonNullable<BlogPost["workflow"]>["priority"])}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input value={form.workflow?.assignee || ""} onChange={(e) => setWorkflowField("assignee", e.target.value)} placeholder="Assignee" className="rounded-lg border border-slate-200 px-3 py-2" />
            <input type="date" value={form.workflow?.dueDate || ""} onChange={(e) => setWorkflowField("dueDate", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
            <textarea value={form.workflow?.notes || ""} onChange={(e) => setWorkflowField("notes", e.target.value)} placeholder="Workflow notes" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2" />
          </section>
          {helperSuggestions.length ? (
            <datalist id="suggest-helper">
              {helperSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <section className="panel p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Editor State</h2>
            <p className="mt-2 text-xs text-slate-500">Dirty: {dirty ? "Yes" : "No"}</p>
            <p className="text-xs text-slate-500">Last save: {lastSavedAt || "-"}</p>
            <p className="text-xs text-slate-500">Last autosave: {lastAutoSavedAt || "-"}</p>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={autosaveEnabled} onChange={(e) => setAutosaveEnabled(e.target.checked)} />
              Enable autosave (12s)
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving..." : editingId ? "Update Blog" : "Create Blog"}
              </button>
              <button type="button" onClick={() => saveBlog("autosave")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Save Draft
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Reset
              </button>
            </div>
            {message ? <p className="mt-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          </section>

          <section className="panel p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Live Preview</h2>
            {form.featuredImage ? <img src={form.featuredImage} alt={form.title || "Preview"} className="mt-3 h-40 w-full rounded-lg object-cover" /> : null}
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">{form.title || "Untitled Post"}</h3>
            <p className="mt-1 text-sm text-slate-600">{form.excerpt || "No excerpt yet."}</p>
            <div className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-800">
              {form.content ? <div dangerouslySetInnerHTML={{ __html: form.content }} /> : <p className="text-slate-500">Live content preview will appear here.</p>}
            </div>
          </section>
        </aside>
      </form>

      <section className="panel p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">Existing Blogs</h2>
        <div className="mt-3 grid gap-3">
          {rows.map((row) => (
            <article key={row.id || row.slug} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{row.title}</p>
                <p className="text-xs text-slate-500">{row.slug} | {row.status} | {row.workflow?.stage || "draft"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => editRow(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                <button type="button" onClick={() => removeBlog(row.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Delete</button>
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No blogs yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
