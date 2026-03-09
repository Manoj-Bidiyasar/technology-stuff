"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BlogPost, Product } from "@/lib/types/content";
import type { ProcessorAdmin } from "@/lib/firestore/processors";

type Viewer = {
  email?: string;
  role?: string;
};

type DashboardRow = {
  type: string;
  draft: number;
  published: number;
  returned: number;
  total: number;
  tint: string;
};

function statusCount(items: Array<{ status?: string }>) {
  let draft = 0;
  let published = 0;
  let returned = 0;
  items.forEach((item) => {
    const status = String(item.status || "draft").toLowerCase();
    if (status === "published") published += 1;
    else if (status === "returned") returned += 1;
    else draft += 1;
  });
  return { draft, published, returned, total: items.length };
}

export default function AdminHome() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [processors, setProcessors] = useState<ProcessorAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [profileRes, productsRes, blogsRes, processorsRes] = await Promise.all([
          fetch("/api/admin/profile", { cache: "no-store" }),
          fetch("/api/products?admin=1&all=1", { cache: "no-store" }),
          fetch("/api/blogs?admin=1", { cache: "no-store" }),
          fetch("/api/processors?admin=1", { cache: "no-store" }),
        ]);

        const [profileJson, productsJson, blogsJson, processorsJson] = await Promise.all([
          profileRes.json(),
          productsRes.json(),
          blogsRes.json(),
          processorsRes.json(),
        ]);

        if (!active) return;
        if (!profileRes.ok) throw new Error(profileJson.error || "Failed to load profile.");
        if (!productsRes.ok) throw new Error(productsJson.error || "Failed to load products.");
        if (!blogsRes.ok) throw new Error(blogsJson.error || "Failed to load blogs.");
        if (!processorsRes.ok) throw new Error(processorsJson.error || "Failed to load processors.");

        setViewer((profileJson.viewer || null) as Viewer | null);
        setProducts((productsJson.items || []) as Product[]);
        setBlogs((blogsJson.items || []) as BlogPost[]);
        setProcessors((processorsJson.items || []) as ProcessorAdmin[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo<DashboardRow[]>(() => {
    const p = statusCount(products as Array<{ status?: string }>);
    const b = statusCount(blogs as Array<{ status?: string }>);
    const pr = statusCount(processors as Array<{ status?: string }>);
    return [
      { type: "Products", ...p, tint: "bg-blue-50" },
      { type: "Blogs", ...b, tint: "bg-emerald-50" },
      { type: "Processors", ...pr, tint: "bg-amber-50" },
    ];
  }, [blogs, processors, products]);

  const searchable = useMemo(() => {
    const productRows = products.map((item) => ({
      label: item.name || "Untitled Product",
      slug: item.slug || "",
      kind: "Product",
      href: "/admin/products",
    }));
    const blogRows = blogs.map((item) => ({
      label: item.title || "Untitled Blog",
      slug: item.slug || "",
      kind: "Blog",
      href: "/admin/blogs",
    }));
    const processorRows = processors.map((item) => ({
      label: item.name || "Untitled Processor",
      slug: item.id || "",
      kind: "Processor",
      href: "/admin/processors",
    }));
    return [...productRows, ...blogRows, ...processorRows];
  }, [blogs, processors, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchable.slice(0, 8);
    return searchable
      .filter((item) => `${item.label} ${item.slug}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchable]);

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-[2rem]">Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">+ Create Product</Link>
            <Link href="/admin/blogs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">+ Create Blog</Link>
            <Link href="/admin/processors" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">+ Create Processor</Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Draft</th>
              <th className="px-4 py-3 font-bold">Published</th>
              <th className="px-4 py-3 font-bold">Returned</th>
              <th className="px-4 py-3 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type} className={`${row.tint} border-t border-slate-100`}>
                <td className="px-4 py-3 text-base font-semibold text-slate-900">{row.type}</td>
                <td className="px-4 py-3 text-base text-slate-900">{row.draft}</td>
                <td className="px-4 py-3 text-base text-slate-900">{row.published}</td>
                <td className="px-4 py-3 text-base text-slate-900">{row.returned}</td>
                <td className="px-4 py-3 text-base text-slate-900">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-3xl font-bold text-slate-900 sm:text-xl">Global Search</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or slug..."
            className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 text-base outline-none ring-blue-500 focus:ring-2"
          />
          <button type="button" className="rounded-xl bg-blue-700 px-6 py-2 text-base font-bold text-white hover:bg-blue-800">
            Search
          </button>
        </div>
        {query ? (
          <div className="mt-3 grid gap-2">
            {filtered.map((item) => (
              <Link key={`${item.kind}-${item.slug}-${item.label}`} href={item.href} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <span className="font-bold text-slate-900">{item.label}</span> <span className="text-slate-500">({item.kind})</span>
              </Link>
            ))}
            {filtered.length === 0 ? <p className="text-sm text-slate-500">No matches found.</p> : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-3xl font-bold text-slate-900 sm:text-xl">Editor Performance</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">User</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Drafts</th>
                <th className="px-4 py-3 font-bold">Published</th>
                <th className="px-4 py-3 font-bold">Submitted</th>
                <th className="px-4 py-3 font-bold">Returned</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50 border-t border-slate-100">
                <td className="px-4 py-3 text-base text-slate-900">{String(viewer?.email || "Current Admin").split("@")[0]}</td>
                <td className="px-4 py-3 text-base text-slate-900">{viewer?.role || "admin"}</td>
                <td className="px-4 py-3 text-base text-slate-900">{rows.reduce((sum, row) => sum + row.draft, 0)}</td>
                <td className="px-4 py-3 text-base text-slate-900">{rows.reduce((sum, row) => sum + row.published, 0)}</td>
                <td className="px-4 py-3 text-base text-slate-900">0</td>
                <td className="px-4 py-3 text-base text-slate-900">{rows.reduce((sum, row) => sum + row.returned, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="text-sm font-semibold text-slate-600">Loading dashboard...</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </main>
  );
}

