"use client";

import { useEffect, useMemo, useState } from "react";
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
  };
}

export default function AdminBlogsPage() {
  const [rows, setRows] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogPost>(emptyBlog());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const finalSlug = useMemo(() => form.slug || slugify(form.title), [form.slug, form.title]);

  async function refresh() {
    const response = await fetch("/api/blogs?admin=1", { cache: "no-store" });
    const json = await response.json();
    setRows((json.items || []) as BlogPost[]);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load blogs."));
  }, []);

  function setField<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editRow(row: BlogPost) {
    setEditingId(row.id || null);
    setForm({
      ...emptyBlog(),
      ...row,
      slug: row.slug,
      tags: row.tags || [],
      categories: row.categories || [],
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyBlog());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload: BlogPost = {
      ...form,
      slug: finalSlug,
      tags: form.tags?.filter(Boolean) || [],
      categories: form.categories?.filter(Boolean) || [],
    };

    try {
      const response = await fetch(editingId ? `/api/blogs/${editingId}` : "/api/blogs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save blog.");

      setMessage(editingId ? "Blog updated." : "Blog created.");
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog.");
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-xl font-extrabold text-slate-900">{editingId ? "Edit Blog" : "Add Blog"}</h1>
        <p className="mt-1 text-sm text-slate-600">Add HTML content, tags, categories, and publishing status.</p>
      </section>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-4 sm:p-5">
        <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Title" className="rounded-lg border border-slate-200 px-3 py-2" required />
        <input value={form.slug} onChange={(e) => setField("slug", slugify(e.target.value))} placeholder="Slug" className="rounded-lg border border-slate-200 px-3 py-2" />
        <p className="text-xs text-slate-500">Final slug: {finalSlug || "-"}</p>

        <textarea value={form.excerpt || ""} onChange={(e) => setField("excerpt", e.target.value)} placeholder="Excerpt" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2" />
        <input value={form.featuredImage || ""} onChange={(e) => setField("featuredImage", e.target.value)} placeholder="Featured image URL" className="rounded-lg border border-slate-200 px-3 py-2" />
        <textarea value={form.content || ""} onChange={(e) => setField("content", e.target.value)} placeholder="HTML content" className="min-h-48 rounded-lg border border-slate-200 px-3 py-2" />

        <input value={(form.tags || []).join(", ")} onChange={(e) => setField("tags", e.target.value.split(",").map((x) => x.trim()))} placeholder="Tags (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input value={(form.categories || []).join(", ")} onChange={(e) => setField("categories", e.target.value.split(",").map((x) => x.trim()))} placeholder="Categories (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2" />

        <select value={form.status} onChange={(e) => setField("status", e.target.value as BlogPost["status"])} className="rounded-lg border border-slate-200 px-3 py-2">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Update Blog" : "Create Blog"}
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
        <h2 className="text-lg font-bold text-slate-900">Existing Blogs</h2>
        <div className="mt-3 grid gap-3">
          {rows.map((row) => (
            <article key={row.id || row.slug} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{row.title}</p>
                <p className="text-xs text-slate-500">{row.slug} | {row.status}</p>
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
