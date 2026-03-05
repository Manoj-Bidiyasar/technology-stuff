"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinary/upload";
import type { Product } from "@/lib/types/content";
import { buildAutoProsCons } from "@/lib/utils/prosCons";
import { slugify } from "@/utils/slugify";

const DEFAULT_FLIPKART_AFFILIATE_ID = process.env.NEXT_PUBLIC_FLIPKART_AFFILIATE_ID || "";

function emptyProduct(): Product {
  return {
    deviceType: "smartphone",
    name: "",
    slug: "",
    brand: "",
    price: 0,
    priceLive: {
      amount: 0,
      source: "manual",
      updatedAt: "",
    },
    status: "draft",
    shortDescription: "",
    images: [],
    specs: {},
    ratings: {},
    affiliateLinks: {},
    compareSuggestions: [],
    pros: [],
    cons: [],
    tags: [],
    trending: false,
  };
}

function buildFlipkartAffiliateUrl(rawUrl: string, affiliateId?: string): string {
  const value = rawUrl.trim();
  if (!value) return "";
  const parsed = new URL(value);
  const affId = (affiliateId || "").trim();
  if (affId) {
    parsed.searchParams.set("affid", affId);
  }
  return parsed.toString();
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [listDeviceType, setListDeviceType] = useState<"smartphone" | "tablet" | "all">("smartphone");
  const [form, setForm] = useState<Product>(emptyProduct());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flipkartSourceUrl, setFlipkartSourceUrl] = useState("");
  const [flipkartAffiliateId, setFlipkartAffiliateId] = useState(DEFAULT_FLIPKART_AFFILIATE_ID);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const finalSlug = useMemo(() => slugify(form.name), [form.name]);

  const refresh = useCallback(async (type: "smartphone" | "tablet" | "all" = listDeviceType) => {
    const suffix = type === "all" ? "&all=1" : "";
    const response = await fetch(`/api/products?admin=1&deviceType=${type}${suffix}`, { cache: "no-store" });
    const json = await response.json();
    setRows((json.items || []) as Product[]);
  }, [listDeviceType]);

  useEffect(() => {
    refresh(listDeviceType).catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));
  }, [listDeviceType, refresh]);

  function setField<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editRow(row: Product) {
    setEditingId(row.id || null);
    setForm({
      ...emptyProduct(),
      ...row,
      deviceType: row.deviceType || "smartphone",
      slug: row.slug,
      images: row.images || [],
      specs: row.specs || {},
      priceLive: row.priceLive || { amount: 0, source: "manual", updatedAt: "" },
      ratings: row.ratings || {},
      affiliateLinks: row.affiliateLinks || {},
      compareSuggestions: row.compareSuggestions || [],
      pros: row.pros || [],
      cons: row.cons || [],
      tags: row.tags || [],
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyProduct());
    setFlipkartSourceUrl("");
  }

  function onGenerateFlipkartLink() {
    setError("");
    setMessage("");
    try {
      const generated = buildFlipkartAffiliateUrl(flipkartSourceUrl, flipkartAffiliateId);
      if (!generated) {
        setError("Enter a Flipkart product URL first.");
        return;
      }
      setField("affiliateLinks", { ...form.affiliateLinks, flipkart: generated });
      setMessage("Flipkart affiliate link generated.");
    } catch {
      setError("Invalid Flipkart URL.");
    }
  }

  function onAutoSuggestProsCons() {
    const suggested = buildAutoProsCons(form);
    setField("pros", suggested.pros);
    setField("cons", suggested.cons);
    setMessage("Auto suggestions applied. You can edit/delete before saving.");
    setError("");
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const url = await uploadImageToCloudinary(file);
      setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
      setMessage("Image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload: Product = {
      ...form,
      deviceType: form.deviceType || "smartphone",
      slug: finalSlug,
      pros: form.pros?.filter(Boolean) || [],
      cons: form.cons?.filter(Boolean) || [],
      tags: form.tags?.filter(Boolean) || [],
      images: form.images?.filter(Boolean) || [],
    };

    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to save product.");
      }

      setMessage(editingId ? "Product updated." : "Product created.");
      resetForm();
      await refresh(listDeviceType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this product?")) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Delete failed.");
      setMessage("Product deleted.");
      if (editingId === id) resetForm();
      await refresh(listDeviceType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <main className="space-y-4">
      <section className="panel p-4 sm:p-5">
        <h1 className="text-xl font-extrabold text-slate-900">{editingId ? "Edit Product" : "Add Product"}</h1>
        <p className="mt-1 text-sm text-slate-600">Slug auto-generates from name. Add specs/ratings and publish when ready.</p>
      </section>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-4 sm:p-5">
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Name" className="rounded-lg border border-slate-200 px-3 py-2" required />
        <input value={finalSlug} readOnly placeholder="Slug" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" />
        <p className="text-xs text-slate-500">Final slug: {finalSlug || "-"}</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <select value={form.deviceType || "smartphone"} onChange={(e) => setField("deviceType", e.target.value as Product["deviceType"])} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="smartphone">Smartphone</option>
            <option value="tablet">Tablet</option>
          </select>
          <input value={form.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="Brand" className="rounded-lg border border-slate-200 px-3 py-2" required />
          <input type="number" min={0} value={form.price} onChange={(e) => setField("price", Number(e.target.value || 0))} placeholder="Price" className="rounded-lg border border-slate-200 px-3 py-2" required />
          <select value={form.status} onChange={(e) => setField("status", e.target.value as Product["status"])} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            min={0}
            value={form.priceLive?.amount || ""}
            onChange={(e) =>
              setField("priceLive", {
                amount: Number(e.target.value || 0),
                source: form.priceLive?.source || "manual",
                updatedAt: form.priceLive?.updatedAt || "",
              })
            }
            placeholder="Live price"
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <select
            value={form.priceLive?.source || "manual"}
            onChange={(e) =>
              setField("priceLive", {
                amount: form.priceLive?.amount || 0,
                source: e.target.value,
                updatedAt: form.priceLive?.updatedAt || "",
              })
            }
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="manual">Manual</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
          </select>
          <input
            type="date"
            value={String(form.priceLive?.updatedAt || "")}
            onChange={(e) =>
              setField("priceLive", {
                amount: form.priceLive?.amount || 0,
                source: form.priceLive?.source || "manual",
                updatedAt: e.target.value,
              })
            }
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>

        <textarea value={form.shortDescription || ""} onChange={(e) => setField("shortDescription", e.target.value)} placeholder="Short description" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2" />

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.specs.processor || ""} onChange={(e) => setField("specs", { ...form.specs, processor: e.target.value })} placeholder="Processor" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.specs.ram || ""} onChange={(e) => setField("specs", { ...form.specs, ram: e.target.value })} placeholder="RAM (e.g. 8 GB)" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.specs.storage || ""} onChange={(e) => setField("specs", { ...form.specs, storage: e.target.value })} placeholder="Storage" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.specs.battery || ""} onChange={(e) => setField("specs", { ...form.specs, battery: e.target.value })} placeholder="Battery" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.specs.display || ""} onChange={(e) => setField("specs", { ...form.specs, display: e.target.value })} placeholder="Display" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.specs.camera || ""} onChange={(e) => setField("specs", { ...form.specs, camera: e.target.value })} placeholder="Camera" className="rounded-lg border border-slate-200 px-3 py-2" />
        </div>
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Performance (Advanced)</p>
          <input
            value={form.performance?.coolingSystem || ""}
            onChange={(e) =>
              setField("performance", {
                ...(form.performance || {}),
                coolingSystem: e.target.value,
              })
            }
            placeholder="Cooling System (e.g. VC Liquid Cooling)"
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <input
            value={(form.performance?.additionalChips || []).join(", ")}
            onChange={(e) =>
              setField("performance", {
                ...(form.performance || {}),
                additionalChips: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
              })
            }
            placeholder="Additional Chips (comma separated, e.g. X1, V3)"
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <input
            value={(form.performance?.otherFeatures || []).join(", ")}
            onChange={(e) =>
              setField("performance", {
                ...(form.performance || {}),
                otherFeatures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
              })
            }
            placeholder="Other Features (comma separated)"
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input type="number" min={0} max={10} step="0.1" value={form.ratings.performance || ""} onChange={(e) => setField("ratings", { ...form.ratings, performance: Number(e.target.value) })} placeholder="Performance rating" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="number" min={0} max={10} step="0.1" value={form.ratings.camera || ""} onChange={(e) => setField("ratings", { ...form.ratings, camera: Number(e.target.value) })} placeholder="Camera rating" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="number" min={0} max={10} step="0.1" value={form.ratings.battery || ""} onChange={(e) => setField("ratings", { ...form.ratings, battery: Number(e.target.value) })} placeholder="Battery rating" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="number" min={0} max={10} step="0.1" value={form.ratings.display || ""} onChange={(e) => setField("ratings", { ...form.ratings, display: Number(e.target.value) })} placeholder="Display rating" className="rounded-lg border border-slate-200 px-3 py-2" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.affiliateLinks.amazon || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, amazon: e.target.value })} placeholder="Amazon affiliate URL" className="rounded-lg border border-slate-200 px-3 py-2" />
          <input value={form.affiliateLinks.flipkart || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, flipkart: e.target.value })} placeholder="Flipkart affiliate URL" className="rounded-lg border border-slate-200 px-3 py-2" />
        </div>
        <input
          value={(form.compareSuggestions || []).join(", ")}
          onChange={(e) => setField("compareSuggestions", e.target.value.split(",").map((x) => slugify(x.trim())).filter(Boolean))}
          placeholder="Compare suggestions slugs (comma separated)"
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Flipkart Link Helper</p>
          <input
            value={flipkartSourceUrl}
            onChange={(e) => setFlipkartSourceUrl(e.target.value)}
            placeholder="Paste normal Flipkart product URL"
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={flipkartAffiliateId}
              onChange={(e) => setFlipkartAffiliateId(e.target.value)}
              placeholder="Affiliate ID (optional)"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <button
              type="button"
              onClick={onGenerateFlipkartLink}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Generate
            </button>
          </div>
        </div>

        <input value={(form.pros || []).join(", ")} onChange={(e) => setField("pros", e.target.value.split(",").map((x) => x.trim()))} placeholder="Pros (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input value={(form.cons || []).join(", ")} onChange={(e) => setField("cons", e.target.value.split(",").map((x) => x.trim()))} placeholder="Cons (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2" />
        <div>
          <button
            type="button"
            onClick={onAutoSuggestProsCons}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            Auto Suggest Pros/Cons
          </button>
        </div>
        <input value={(form.tags || []).join(", ")} onChange={(e) => setField("tags", e.target.value.split(",").map((x) => x.trim()))} placeholder="Tags (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2" />

        <label className="text-sm font-semibold text-slate-700">Upload image to Cloudinary</label>
        <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0] || null)} className="rounded-lg border border-slate-200 px-3 py-2" />

        <div className="grid gap-2 sm:grid-cols-2">
          {(form.images || []).map((image, index) => (
            <div key={`${image}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
              <div className="relative h-14 w-20 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                <Image src={image} alt="Product" fill className="object-cover" unoptimized />
              </div>
              <input
                value={image}
                onChange={(e) => {
                  const next = [...(form.images || [])];
                  next[index] = e.target.value;
                  setField("images", next);
                }}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Existing Products</h2>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setListDeviceType("smartphone")}
              className={`rounded-md px-2.5 py-1 ${listDeviceType === "smartphone" ? "bg-blue-700 text-white" : "text-slate-700"}`}
            >
              Smartphones
            </button>
            <button
              type="button"
              onClick={() => setListDeviceType("tablet")}
              className={`rounded-md px-2.5 py-1 ${listDeviceType === "tablet" ? "bg-blue-700 text-white" : "text-slate-700"}`}
            >
              Tablets
            </button>
            <button
              type="button"
              onClick={() => setListDeviceType("all")}
              className={`rounded-md px-2.5 py-1 ${listDeviceType === "all" ? "bg-blue-700 text-white" : "text-slate-700"}`}
            >
              All
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3">
          {rows.map((row) => (
            <article key={row.id || row.slug} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">{(row.deviceType || "smartphone").toUpperCase()} | {row.brand} | {row.slug} | {"\u20B9"}{row.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => editRow(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                <button type="button" onClick={() => removeProduct(row.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Delete</button>
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No products yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
