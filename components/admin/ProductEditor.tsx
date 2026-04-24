"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinary/upload";
import type {
  FrontCameraUnit,
  MemoryVariant,
  Product,
  ProductCameraSensor,
  ProductDisplayPanel,
  ProductGeneralVariant,
  RearCameraUnit,
} from "@/lib/types/content";
import { buildAutoProsCons } from "@/lib/utils/prosCons";
import { slugify } from "@/utils/slugify";

type DeviceType = "smartphone" | "tablet";
type ProductStatusFilter = "all" | Product["status"];
type PathKey = string | number;

type ProductEditorProps = {
  deviceType: DeviceType;
  pageTitle: string;
  pageDescription: string;
};

const DEFAULT_FLIPKART_AFFILIATE_ID = process.env.NEXT_PUBLIC_FLIPKART_AFFILIATE_ID || "";
const PRODUCT_STATUS_FILTERS: Array<{ key: ProductStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "published", label: "Published" },
  { key: "scheduled", label: "Scheduled" },
  { key: "recently_deleted", label: "Recently Deleted" },
];

function emptyProduct(deviceType: DeviceType): Product {
  return {
    deviceType,
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
    scheduledAt: "",
    shortDescription: "",
    images: [],
    specs: {},
    performance: {},
    camera: {},
    frontCamera: {},
    rearCamera: {},
    security: {},
    sensors: [],
    network: {},
    software: {},
    design: {},
    general: {},
    memoryStorage: {},
    variants: [],
    battery: {},
    display: {},
    displays: [],
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
  if (affId) parsed.searchParams.set("affid", affId);
  return parsed.toString();
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCsv(values?: string[]): string {
  return Array.isArray(values) ? values.join(", ") : "";
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBooleanSelect(value: string): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function formatBooleanSelect(value?: boolean): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function formatKeyValueLines(record?: Record<string, string>): string {
  if (!record) return "";
  return Object.entries(record)
    .filter(([key, value]) => key.trim() && String(value || "").trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function parseKeyValueLines(value: string): Record<string, string> {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawKey, ...rest] = line.split(":");
      return [rawKey?.trim() || "", rest.join(":").trim()] as const;
    })
    .filter(([key, entryValue]) => key && entryValue);

  return Object.fromEntries(entries);
}

function cloneNode<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  if (value && typeof value === "object") {
    return { ...(value as Record<string, unknown>) } as T;
  }
  return value;
}

function getAtPath(source: unknown, path: PathKey[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setAtPath<T>(source: T, path: PathKey[], value: unknown): T {
  const root = cloneNode(source);
  let cursor = root as Record<string, unknown>;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const nextKey = path[index + 1];
    const existing = cursor[key as keyof typeof cursor];
    const fallback = typeof nextKey === "number" ? [] : {};
    const next = cloneNode((existing ?? fallback) as unknown);
    cursor[key as keyof typeof cursor] = next;
    cursor = next as Record<string, unknown>;
  }

  cursor[path[path.length - 1] as keyof typeof cursor] = value as never;
  return root;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`rounded-lg border border-slate-200 px-3 py-2 ${props.className || ""}`.trim()} />;
}

function ProductEditorNav({ deviceType }: { deviceType: DeviceType }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
      <Link
        href="/admin/products/smartphones"
        className={`rounded-lg px-3 py-2 ${deviceType === "smartphone" ? "bg-blue-700 text-white" : "text-slate-700"}`}
      >
        Smartphones
      </Link>
      <Link
        href="/admin/products/tablets"
        className={`rounded-lg px-3 py-2 ${deviceType === "tablet" ? "bg-blue-700 text-white" : "text-slate-700"}`}
      >
        Tablets
      </Link>
    </div>
  );
}

export default function ProductEditor({ deviceType, pageTitle, pageDescription }: ProductEditorProps) {
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(emptyProduct(deviceType));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flipkartSourceUrl, setFlipkartSourceUrl] = useState("");
  const [flipkartAffiliateId, setFlipkartAffiliateId] = useState(DEFAULT_FLIPKART_AFFILIATE_ID);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [helperAliasMap, setHelperAliasMap] = useState<Record<string, string>>({});
  const [helperSuggestions, setHelperSuggestions] = useState<string[]>([]);
  const [createTitle, setCreateTitle] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createSlugInput, setCreateSlugInput] = useState("");
  const [createSlugEdited, setCreateSlugEdited] = useState(false);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const rowStatus = row.status || "published";
        if (statusFilter === "all" && rowStatus === "recently_deleted") return false;
        if (statusFilter !== "all" && rowStatus !== statusFilter) return false;
        if (brandFilter.length > 0 && !brandFilter.some((item) => item.toLowerCase() === String(row.brand || "").toLowerCase())) return false;
        if (!q) return true;
        const hay = [row.name, row.brand, row.slug, row.id, row.status].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [brandFilter, query, rows, statusFilter]);

  const brandOptions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => String(row.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [rows]
  );
  
  const statusCounts = useMemo(() => {
    const counts = new Map<ProductStatusFilter, number>(PRODUCT_STATUS_FILTERS.map((item) => [item.key, 0]));
    rows.forEach((row) => {
      const status = row.status || "published";
      counts.set(status, (counts.get(status) || 0) + 1);
      if (status !== "recently_deleted") counts.set("all", (counts.get("all") || 0) + 1);
    });
    return counts;
  }, [rows]);
  
  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const brand = String(row.brand || "").trim();
      if (!brand) return;
      counts.set(brand, (counts.get(brand) || 0) + 1);
    });
    return counts;
  }, [rows]);

  const suggestedCreateSlug = useMemo(() => slugify(createTitle || ""), [createTitle]);
  const createSlug = useMemo(
    () => slugify((createSlugEdited ? createSlugInput : suggestedCreateSlug) || createTitle || ""),
    [createSlugEdited, createSlugInput, suggestedCreateSlug, createTitle]
  );
  const createDocId = createSlug;
  const isCreateDocDuplicate = useMemo(
    () => Boolean(createDocId) && rows.some((row) => String(row.id || row.slug || "").toLowerCase() === createDocId.toLowerCase()),
    [createDocId, rows]
  );

  const finalSlug = useMemo(() => slugify(form.slug || form.name), [form.name, form.slug]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/products?admin=1&deviceType=${deviceType}`, { cache: "no-store" });
    const json = (await response.json()) as { items?: Product[]; error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load products.");
    }
    setRows((json.items || []) as Product[]);
  }, [deviceType]);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));
  }, [refresh]);

  useEffect(() => {
    let active = true;
    async function loadHelper() {
      try {
        const response = await fetch(`/api/admin/helper-terms?scope=${deviceType}`, { cache: "no-store" });
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
          [canonical, ...(item.aliases || [])].forEach((alias) => {
            const key = normalizeLookupKey(alias);
            if (key) map[key] = canonical;
          });
        });

        setHelperAliasMap(map);
        setHelperSuggestions(Array.from(suggestions).sort((left, right) => left.localeCompare(right)));
      } catch {
        // ignore helper fetch issues
      }
    }

    loadHelper().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [deviceType]);

  function setField<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePath(path: PathKey[], value: unknown) {
    setForm((prev) => setAtPath(prev, path, value));
  }

  function appendToPath(path: PathKey[], value: unknown) {
    setForm((prev) => {
      const current = getAtPath(prev, path);
      const next = Array.isArray(current) ? [...current, value] : [value];
      return setAtPath(prev, path, next);
    });
  }

  function removeFromPath(path: PathKey[], index: number) {
    setForm((prev) => {
      const current = getAtPath(prev, path);
      const next = Array.isArray(current) ? current.filter((_, itemIndex) => itemIndex !== index) : [];
      return setAtPath(prev, path, next);
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
    const output: string[] = [];
    const seen = new Set<string>();

    values.forEach((item) => {
      const normalized = normalizeTextToken(item);
      if (!normalized) return;
      const key = normalizeLookupKey(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      output.push(normalized);
    });

    return output;
  }

  function editRow(row: Product) {
    setEditingId(row.id || null);
    setForm({
      ...emptyProduct(deviceType),
      ...row,
      deviceType,
      slug: row.slug,
      images: row.images || [],
      specs: row.specs || {},
      performance: row.performance || {},
      camera: row.camera || {},
      frontCamera: row.frontCamera || {},
      rearCamera: row.rearCamera || {},
      security: row.security || {},
      sensors: row.sensors || [],
      network: row.network || {},
      software: row.software || {},
      design: row.design || {},
      general: row.general || {},
      memoryStorage: row.memoryStorage || {},
      variants: row.variants || [],
      battery: row.battery || {},
      display: row.display || {},
      displays: row.displays || [],
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
    setForm(emptyProduct(deviceType));
    setFlipkartSourceUrl("");
    setMessage("");
    setError("");
  }

  function startCreateFromQuickForm() {
    setEditingId(null);
    setForm({
      ...emptyProduct(deviceType),
      deviceType,
      name: createTitle,
      brand: createBrand,
      slug: createSlug,
    });
    setFlipkartSourceUrl("");
    setMessage("");
    setError("");
    setViewMode("editor");
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
    setMessage("Auto suggestions applied. You can edit them before saving.");
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

    const normalizedName = normalizeTextToken(form.name);
    const normalizedBrand = normalizeTextToken(form.brand);
    const normalizedTags = normalizeCsvArray(form.tags || []);

    const payload: Product = {
      ...form,
      deviceType,
      name: normalizedName,
      brand: normalizedBrand,
      slug: finalSlug,
      tags: normalizedTags,
      pros: (form.pros || []).filter(Boolean),
      cons: (form.cons || []).filter(Boolean),
      compareSuggestions: (form.compareSuggestions || []).map((item) => slugify(item)).filter(Boolean),
      images: (form.images || []).filter(Boolean),
      sensors: (form.sensors || []).filter(Boolean),
    };

    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to save product.");
      }

      setMessage(editingId ? `${pageTitle} updated.` : `${pageTitle} created.`);
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: Product["status"]) {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || "Status update failed.");
  }

  async function moveToRecentlyDeleted(id?: string) {
    if (!id) return;
    if (!window.confirm(`Move this ${deviceType} to Recently Deleted?`)) return;

    setError("");
    setMessage("");

    try {
      await changeStatus(id, "recently_deleted");
      setMessage(`${pageTitle} moved to recently deleted.`);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move.");
    }
  }

  async function restoreProduct(id?: string) {
    if (!id) return;
    setError("");
    setMessage("");
    try {
      await changeStatus(id, "draft");
      setMessage(`${pageTitle} restored as draft.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    }
  }

  async function deletePermanently(id?: string) {
    if (!id) return;
    if (!window.confirm(`Delete this ${deviceType} permanently?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
      setMessage(`${pageTitle} deleted permanently.`);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent delete failed.");
    }
  }

  async function moveSelectedToRecentlyDeleted() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) to Recently Deleted?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "recently_deleted")));
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s moved to recently deleted.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk move failed.");
    }
  }

  async function restoreSelectedProducts() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Restore ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) as draft?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedIds.map((id) => changeStatus(id, "draft")));
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s restored as draft.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk restore failed.");
    }
  }

  async function forceDeleteSelectedProducts() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected ${pageTitle.toLowerCase()}(s) permanently?`)) return;
    setError("");
    setMessage("");
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(json.error || "Permanent delete failed.");
        })
      );
      setSelectedIds([]);
      setMessage(`Selected ${pageTitle.toLowerCase()}s deleted permanently.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk permanent delete failed.");
    }
  }

  const panelSummary = `${deviceType === "smartphone" ? "Smartphone" : "Tablet"} admin editor with all main public spec fields.`;

  return (
    <main className="space-y-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {viewMode === "list" ? (
        <>
          <section className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{pageTitle}s</h2>
                <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Create {pageTitle}</h3>
                  <p className="mt-1 text-sm text-slate-600">Start editing a new {pageTitle.toLowerCase()}.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Quick Create</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Brand</span>
                  <input
                    value={createBrand}
                    onChange={(e) => setCreateBrand(e.target.value)}
                    list={helperSuggestions.length ? "suggest-helper" : undefined}
                    placeholder="Samsung"
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Slug</span>
                  <input
                    value={createSlug}
                    onChange={(e) => {
                      setCreateSlugInput(e.target.value);
                      setCreateSlugEdited(true);
                    }}
                    placeholder={`${deviceType === "smartphone" ? "samsung-galaxy-s25" : "samsung-galaxy-tab-s10"}`}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Title ({pageTitle} Name)</span>
                  <input
                    value={createTitle}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCreateTitle(next);
                      if (!createSlugEdited) setCreateSlugInput(slugify(next));
                    }}
                    list={helperSuggestions.length ? "suggest-helper" : undefined}
                    placeholder={`${deviceType === "smartphone" ? "Samsung Galaxy S25" : "Samsung Galaxy Tab S10"}`}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-800">Document ID</span>
                  <input value={createDocId} readOnly className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600" />
                </label>
              </div>

              <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={startCreateFromQuickForm}
                  disabled={!createTitle || !createBrand || !createSlug || isCreateDocDuplicate}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
                    !createTitle || !createBrand || !createSlug || isCreateDocDuplicate ? "cursor-not-allowed bg-slate-400" : "bg-blue-700 shadow-sm"
                  }`}
                >
                  Create New {pageTitle}
                </button>
              </div>
              {isCreateDocDuplicate ? (
                <p className="mt-2 text-center text-xs font-semibold text-rose-700">
                  Slug/Document ID already exists. Please change slug to a unique value.
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{pageTitle} List</h2>
                <p className="mt-1 text-sm text-slate-600">Search and filter existing {pageTitle.toLowerCase()}s.</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search by ${pageTitle.toLowerCase()} name, brand, slug, id...`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />

              <div className="flex flex-wrap gap-2">
                {PRODUCT_STATUS_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${
                      statusFilter === item.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label} ({statusCounts.get(item.key) || 0})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBrandFilter([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${brandFilter.length === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All Brands ({rows.filter((row) => String(row.brand || "").trim()).length})
                </button>
                {brandOptions.filter((item) => item !== "all").map((item) => {
                  const selected = brandFilter.some((value) => value.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={`brand-chip-${item}`}
                      type="button"
                      onClick={() => setBrandFilter((prev) => selected ? prev.filter((value) => value.toLowerCase() !== item.toLowerCase()) : [...prev, item])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {item} ({brandCounts.get(item) || 0})
                    </button>
                  );
                })}
              </div>

              {statusFilter === "recently_deleted" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={restoreSelectedProducts}
                    disabled={selectedIds.length === 0}
                    className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                  >
                    Restore Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={forceDeleteSelectedProducts}
                    disabled={selectedIds.length === 0}
                    className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                  >
                    Force Delete Selected ({selectedIds.length})
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={moveSelectedToRecentlyDeleted}
                  disabled={selectedIds.length === 0}
                  className={`w-fit rounded-md border px-3 py-2 text-xs font-semibold transition ${selectedIds.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"}`}
                >
                  Move Selected to Recently Deleted ({selectedIds.length})
                </button>
              )}
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3 font-semibold">Select</th>
                    <th className="px-4 py-3 font-semibold">{pageTitle}</th>
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id || row.slug} className="hover:bg-slate-50/70">
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
                        <p className="text-xs text-slate-500">{row.slug || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{row.brand || "-"}</td>
                      <td className="px-4 py-3 text-slate-800">{"\u20B9"}{row.price}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              editRow(row);
                              setViewMode("editor");
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {row.status === "recently_deleted" ? (
                            <>
                              <button type="button" onClick={() => restoreProduct(row.id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                                Restore
                              </button>
                              <button type="button" onClick={() => deletePermanently(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                                Delete Forever
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => moveToRecentlyDeleted(row.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No {pageTitle.toLowerCase()}s found for current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-4">
                  <button type="button" onClick={() => setViewMode("list")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
                    &larr; Back to list
                  </button>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">{editingId ? `Edit ${pageTitle}` : `Add ${pageTitle}`}</h1>
                <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
                <p className="mt-1 text-xs text-slate-500">{panelSummary}</p>
              </div>
            </div>
          </section>

          <form onSubmit={onSubmit} className="space-y-4">
        <Section title="Basic Details" description="Core product identity, pricing, status, tags, links, and quick summary content.">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeTextToken(e.target.value);
                  if (normalized && normalized !== e.target.value) setField("name", normalized);
                }}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder={`${deviceType === "smartphone" ? "Smartphone" : "Tablet"} name`}
                required
              />
            </Field>
            <Field label="Slug">
              <TextInput value={finalSlug} readOnly className="bg-slate-50 text-slate-600" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Brand">
              <TextInput
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeTextToken(e.target.value);
                  if (normalized && normalized !== e.target.value) setField("brand", normalized);
                }}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="Brand"
                required
              />
            </Field>
            <Field label="Price">
              <TextInput
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setField("price", Number(e.target.value || 0))}
                placeholder="Price"
                required
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setField("status", e.target.value as Product["status"])}>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="recently_deleted">Recently Deleted</option>
              </Select>
            </Field>
            <Field label="Trending">
              <Select value={formatBooleanSelect(form.trending)} onChange={(e) => setField("trending", parseBooleanSelect(e.target.value) || false)}>
                <option value="">No</option>
                <option value="true">Yes</option>
              </Select>
            </Field>
          </div>

          {form.status === "scheduled" ? (
            <Field label="Scheduled At">
              <TextInput
                type="datetime-local"
                value={String(form.scheduledAt || "")}
                onChange={(e) => setField("scheduledAt", e.target.value)}
              />
            </Field>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Live Price Amount">
              <TextInput
                type="number"
                min={0}
                value={form.priceLive?.amount ?? ""}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: Number(e.target.value || 0),
                    source: form.priceLive?.source || "manual",
                    updatedAt: form.priceLive?.updatedAt || "",
                  })
                }
              />
            </Field>
            <Field label="Live Price Source">
              <Select
                value={form.priceLive?.source || "manual"}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: form.priceLive?.amount || 0,
                    source: e.target.value,
                    updatedAt: form.priceLive?.updatedAt || "",
                  })
                }
              >
                <option value="manual">Manual</option>
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
              </Select>
            </Field>
            <Field label="Live Price Updated At">
              <TextInput
                type="date"
                value={String(form.priceLive?.updatedAt || "")}
                onChange={(e) =>
                  setField("priceLive", {
                    amount: form.priceLive?.amount || 0,
                    source: form.priceLive?.source || "manual",
                    updatedAt: e.target.value,
                  })
                }
              />
            </Field>
          </div>

          <Field label="Short Description">
            <TextArea value={form.shortDescription || ""} onChange={(e) => setField("shortDescription", e.target.value)} placeholder="Short product summary" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tags">
              <TextInput
                value={formatCsv(form.tags)}
                onChange={(e) => setField("tags", splitCsv(e.target.value))}
                onBlur={(e) => setField("tags", normalizeCsvArray(splitCsv(e.target.value)))}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="new, gaming, flagship"
              />
            </Field>
            <Field label="Compare Suggestions">
              <TextInput
                value={formatCsv(form.compareSuggestions)}
                onChange={(e) => setField("compareSuggestions", splitCsv(e.target.value).map((item) => slugify(item)))}
                placeholder="product-a, product-b"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amazon Affiliate URL">
              <TextInput value={form.affiliateLinks.amazon || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, amazon: e.target.value })} />
            </Field>
            <Field label="Flipkart Affiliate URL">
              <TextInput value={form.affiliateLinks.flipkart || ""} onChange={(e) => setField("affiliateLinks", { ...form.affiliateLinks, flipkart: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Flipkart Link Helper</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Normal Flipkart URL">
                <TextInput value={flipkartSourceUrl} onChange={(e) => setFlipkartSourceUrl(e.target.value)} placeholder="Paste Flipkart URL" />
              </Field>
              <Field label="Affiliate ID">
                <TextInput value={flipkartAffiliateId} onChange={(e) => setFlipkartAffiliateId(e.target.value)} placeholder="Affiliate ID (optional)" />
              </Field>
            </div>
            <button type="button" onClick={onGenerateFlipkartLink} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Generate Flipkart Link
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pros">
              <TextInput value={formatCsv(form.pros)} onChange={(e) => setField("pros", splitCsv(e.target.value))} placeholder="Fast chipset, bright display" />
            </Field>
            <Field label="Cons">
              <TextInput value={formatCsv(form.cons)} onChange={(e) => setField("cons", splitCsv(e.target.value))} placeholder="No charger, average low-light camera" />
            </Field>
          </div>

          <div>
            <button
              type="button"
              onClick={onAutoSuggestProsCons}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Auto Suggest Pros/Cons
            </button>
          </div>
        </Section>

        <Section title="Quick Specs" description="Flat spec fields used for quick summaries, filters, fallbacks, and search helpers.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Processor">
              <TextInput value={form.specs.processor || ""} onChange={(e) => updatePath(["specs", "processor"], e.target.value)} list={helperSuggestions.length ? "suggest-helper" : undefined} />
            </Field>
            <Field label="Chipset Score">
              <TextInput type="number" value={form.specs.chipsetScore ?? ""} onChange={(e) => updatePath(["specs", "chipsetScore"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="RAM">
              <TextInput value={form.specs.ram || ""} onChange={(e) => updatePath(["specs", "ram"], e.target.value)} />
            </Field>
            <Field label="RAM GB">
              <TextInput type="number" value={form.specs.ramGb ?? ""} onChange={(e) => updatePath(["specs", "ramGb"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Storage">
              <TextInput value={form.specs.storage || ""} onChange={(e) => updatePath(["specs", "storage"], e.target.value)} />
            </Field>
            <Field label="Battery">
              <TextInput value={form.specs.battery || ""} onChange={(e) => updatePath(["specs", "battery"], e.target.value)} />
            </Field>
            <Field label="Battery mAh">
              <TextInput type="number" value={form.specs.batteryMah ?? ""} onChange={(e) => updatePath(["specs", "batteryMah"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Charging">
              <TextInput value={form.specs.charging || ""} onChange={(e) => updatePath(["specs", "charging"], e.target.value)} />
            </Field>
            <Field label="Display">
              <TextInput value={form.specs.display || ""} onChange={(e) => updatePath(["specs", "display"], e.target.value)} />
            </Field>
            <Field label="Primary Display">
              <TextInput value={form.specs.primaryDisplay || ""} onChange={(e) => updatePath(["specs", "primaryDisplay"], e.target.value)} />
            </Field>
            <Field label="Secondary Display">
              <TextInput value={form.specs.secondaryDisplay || ""} onChange={(e) => updatePath(["specs", "secondaryDisplay"], e.target.value)} />
            </Field>
            <Field label="Display Size (inch)">
              <TextInput type="number" step="0.1" value={form.specs.displaySizeInch ?? ""} onChange={(e) => updatePath(["specs", "displaySizeInch"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Refresh Rate (Hz)">
              <TextInput type="number" value={form.specs.refreshRateHz ?? ""} onChange={(e) => updatePath(["specs", "refreshRateHz"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Rear Camera">
              <TextInput value={form.specs.rearCamera || ""} onChange={(e) => updatePath(["specs", "rearCamera"], e.target.value)} />
            </Field>
            <Field label="Front Camera">
              <TextInput value={form.specs.frontCamera || ""} onChange={(e) => updatePath(["specs", "frontCamera"], e.target.value)} />
            </Field>
            <Field label="Camera">
              <TextInput value={form.specs.camera || ""} onChange={(e) => updatePath(["specs", "camera"], e.target.value)} />
            </Field>
            <Field label="OS">
              <TextInput value={form.specs.os || ""} onChange={(e) => updatePath(["specs", "os"], e.target.value)} />
            </Field>
            <Field label="Network">
              <TextInput value={form.specs.network || ""} onChange={(e) => updatePath(["specs", "network"], e.target.value)} />
            </Field>
            <Field label="SIM">
              <TextInput value={form.specs.sim || ""} onChange={(e) => updatePath(["specs", "sim"], e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Ratings" description="Manual rating fields used across cards and scoring summaries.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Performance">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.performance ?? ""} onChange={(e) => updatePath(["ratings", "performance"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Camera">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.camera ?? ""} onChange={(e) => updatePath(["ratings", "camera"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Battery">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.battery ?? ""} onChange={(e) => updatePath(["ratings", "battery"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Display">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.display ?? ""} onChange={(e) => updatePath(["ratings", "display"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Overall">
              <TextInput type="number" min={0} max={10} step="0.1" value={form.ratings.overall ?? ""} onChange={(e) => updatePath(["ratings", "overall"], parseOptionalNumber(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section title="General" description="Launch information, box contents, market variants, and multimedia details.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Launch Date">
              <TextInput type="date" value={String(form.general?.launchDate || "")} onChange={(e) => updatePath(["general", "launchDate"], e.target.value)} />
            </Field>
            <Field label="Model Number">
              <TextInput value={form.general?.modelNumber || ""} onChange={(e) => updatePath(["general", "modelNumber"], e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Package Contents">
              <TextInput value={formatCsv(form.general?.packageContents)} onChange={(e) => updatePath(["general", "packageContents"], splitCsv(e.target.value))} placeholder="Phone, cable, SIM tool" />
            </Field>
            <Field label="Multimedia">
              <TextInput value={formatCsv(form.general?.multimedia)} onChange={(e) => updatePath(["general", "multimedia"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Launch Variants</p>
              <button
                type="button"
                onClick={() => appendToPath(["general", "variants"], { ram: "", storage: "", launchPrice: undefined } satisfies ProductGeneralVariant)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Launch Variant
              </button>
            </div>
            <div className="grid gap-3">
              {(form.general?.variants || []).map((variant, index) => (
                <div key={`general-variant-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="RAM">
                      <TextInput value={variant.ram || ""} onChange={(e) => updatePath(["general", "variants", index, "ram"], e.target.value)} />
                    </Field>
                    <Field label="Storage">
                      <TextInput value={variant.storage || ""} onChange={(e) => updatePath(["general", "variants", index, "storage"], e.target.value)} />
                    </Field>
                    <Field label="Launch Price">
                      <TextInput type="number" min={0} value={variant.launchPrice ?? ""} onChange={(e) => updatePath(["general", "variants", index, "launchPrice"], parseOptionalNumber(e.target.value))} />
                    </Field>
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeFromPath(["general", "variants"], index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Design & Build" description="Body dimensions, weights, materials, IP ratings, colors, audio jack, and hardware design details.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Design Type">
              <Select value={form.design?.type || ""} onChange={(e) => updatePath(["design", "type"], e.target.value)}>
                <option value="">Select type</option>
                <option value="normal">Normal</option>
                <option value="foldable">Foldable</option>
              </Select>
            </Field>
            <Field label="Design Style">
              <TextInput value={form.design?.designType || ""} onChange={(e) => updatePath(["design", "designType"], e.target.value)} placeholder="Candybar, fold, book-style" />
            </Field>
            <Field label="Colors">
              <TextInput value={formatCsv(form.design?.colors)} onChange={(e) => updatePath(["design", "colors"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Back Material">
              <TextInput value={form.design?.build?.back?.material || ""} onChange={(e) => updatePath(["design", "build", "back", "material"], e.target.value)} />
            </Field>
            <Field label="Back Protection">
              <TextInput value={form.design?.build?.back?.protection || ""} onChange={(e) => updatePath(["design", "build", "back", "protection"], e.target.value)} />
            </Field>
            <Field label="Frame">
              <TextInput value={form.design?.build?.frame || ""} onChange={(e) => updatePath(["design", "build", "frame"], e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="IP Rating">
              <TextInput value={formatCsv(form.design?.ipRating)} onChange={(e) => updatePath(["design", "ipRating"], splitCsv(e.target.value))} placeholder="IP68, IP54" />
            </Field>
            <Field label="Audio Jack Available">
              <Select value={formatBooleanSelect(form.design?.audioJack?.available)} onChange={(e) => updatePath(["design", "audioJack", "available"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Audio Jack Type">
              <TextInput value={form.design?.audioJack?.type || ""} onChange={(e) => updatePath(["design", "audioJack", "type"], e.target.value)} />
            </Field>
          </div>

          <Field label="Other Design Features">
            <TextInput value={formatCsv(form.design?.otherFeatures)} onChange={(e) => updatePath(["design", "otherFeatures"], splitCsv(e.target.value))} />
          </Field>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-sm font-extrabold text-slate-900">Dimensions</p>
            <div className="grid gap-4 lg:grid-cols-3">
              {(["normal", "folded", "unfolded"] as const).map((mode) => (
                <div key={mode} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{mode}</p>
                  <div className="grid gap-3">
                    <Field label="Height (mm)">
                      <TextInput type="number" step="0.01" value={form.design?.dimensions?.[mode]?.height ?? ""} onChange={(e) => updatePath(["design", "dimensions", mode, "height"], parseOptionalNumber(e.target.value))} />
                    </Field>
                    <Field label="Width (mm)">
                      <TextInput type="number" step="0.01" value={form.design?.dimensions?.[mode]?.width ?? ""} onChange={(e) => updatePath(["design", "dimensions", mode, "width"], parseOptionalNumber(e.target.value))} />
                    </Field>
                    <Field label="Depth (single or comma separated)">
                      <TextInput
                        value={Array.isArray(form.design?.dimensions?.[mode]?.depth) ? form.design?.dimensions?.[mode]?.depth?.join(", ") : String(form.design?.dimensions?.[mode]?.depth ?? "")}
                        onChange={(e) => {
                          const values = splitCsv(e.target.value).map((item) => parseOptionalNumber(item)).filter((item): item is number => item !== undefined);
                          const raw = e.target.value.trim();
                          updatePath(["design", "dimensions", mode, "depth"], values.length > 1 ? values : parseOptionalNumber(raw));
                        }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Weight Variants</p>
              <button
                type="button"
                onClick={() => appendToPath(["design", "weight"], { color: "", value: undefined })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Weight
              </button>
            </div>
            <div className="grid gap-3">
              {(form.design?.weight || []).map((weight, index) => (
                <div key={`design-weight-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                  <Field label="Color">
                    <TextInput value={weight.color || ""} onChange={(e) => updatePath(["design", "weight", index, "color"], e.target.value)} />
                  </Field>
                  <Field label="Weight (g)">
                    <TextInput type="number" step="0.1" value={weight.value ?? ""} onChange={(e) => updatePath(["design", "weight", index, "value"], parseOptionalNumber(e.target.value))} />
                  </Field>
                  <div className="flex items-end">
                    <button type="button" onClick={() => removeFromPath(["design", "weight"], index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Display" description="Primary and secondary display data plus additional display panels.">
          <div className="grid gap-4 xl:grid-cols-3">
            {([
              { key: [] as PathKey[], title: "Main Display", value: form.display || {} },
              { key: ["display", "primary"] as PathKey[], title: "Primary Display", value: form.display?.primary || {} },
              { key: ["display", "secondary"] as PathKey[], title: "Secondary Display", value: form.display?.secondary || {} },
            ] as const).map((panelGroup, panelIndex) => {
              const basePath = panelGroup.key.length === 0 ? ["display"] : panelGroup.key;
              return (
                <div key={`${panelGroup.title}-${panelIndex}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-sm font-extrabold text-slate-900">{panelGroup.title}</p>
                  <div className="grid gap-3">
                    <Field label="Type">
                      <TextInput value={panelGroup.value.type || ""} onChange={(e) => updatePath([...basePath, "type"], e.target.value)} />
                    </Field>
                    <Field label="Size">
                      <TextInput value={String(panelGroup.value.size ?? "")} onChange={(e) => updatePath([...basePath, "size"], e.target.value)} />
                    </Field>
                    <Field label="Resolution">
                      <TextInput value={panelGroup.value.resolution || ""} onChange={(e) => updatePath([...basePath, "resolution"], e.target.value)} />
                    </Field>
                    <Field label="Refresh Rate">
                      <TextInput value={String(panelGroup.value.refreshRate ?? "")} onChange={(e) => updatePath([...basePath, "refreshRate"], e.target.value)} />
                    </Field>
                    <Field label="Adaptive">
                      <Select value={formatBooleanSelect(panelGroup.value.adaptive)} onChange={(e) => updatePath([...basePath, "adaptive"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="Peak Brightness">
                      <TextInput value={String(panelGroup.value.peakBrightness ?? "")} onChange={(e) => updatePath([...basePath, "peakBrightness"], e.target.value)} />
                    </Field>
                    <Field label="Protection">
                      <TextInput value={panelGroup.value.protection || ""} onChange={(e) => updatePath([...basePath, "protection"], e.target.value)} />
                    </Field>
                    <Field label="HDR">
                      <TextInput value={formatCsv(panelGroup.value.hdr)} onChange={(e) => updatePath([...basePath, "hdr"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Pixel Density">
                      <TextInput value={String(panelGroup.value.pixelDensity ?? "")} onChange={(e) => updatePath([...basePath, "pixelDensity"], e.target.value)} />
                    </Field>
                    <Field label="Screen to Body">
                      <TextInput value={String(panelGroup.value.screenToBody ?? "")} onChange={(e) => updatePath([...basePath, "screenToBody"], e.target.value)} />
                    </Field>
                    <Field label="Aspect Ratio">
                      <TextInput value={panelGroup.value.aspectRatio || ""} onChange={(e) => updatePath([...basePath, "aspectRatio"], e.target.value)} />
                    </Field>
                    <Field label="Touch Sampling Rate">
                      <TextInput value={String(panelGroup.value.touchSamplingRate ?? "")} onChange={(e) => updatePath([...basePath, "touchSamplingRate"], e.target.value)} />
                    </Field>
                    <Field label="Curved">
                      <Select value={formatBooleanSelect(panelGroup.value.curved)} onChange={(e) => updatePath([...basePath, "curved"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="Extras">
                      <TextInput value={formatCsv(panelGroup.value.extras)} onChange={(e) => updatePath([...basePath, "extras"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Certifications">
                      <TextInput value={formatCsv(panelGroup.value.certifications)} onChange={(e) => updatePath([...basePath, "certifications"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Others">
                      <TextInput value={formatCsv(panelGroup.value.others)} onChange={(e) => updatePath([...basePath, "others"], splitCsv(e.target.value))} />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Additional Displays</p>
              <button
                type="button"
                onClick={() => appendToPath(["displays"], {} satisfies ProductDisplayPanel)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Display Panel
              </button>
            </div>
            <div className="grid gap-3">
              {(form.displays || []).map((panel, index) => (
                <div key={`display-panel-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Panel {index + 1}</p>
                    <button type="button" onClick={() => removeFromPath(["displays"], index)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Type">
                      <TextInput value={panel.type || ""} onChange={(e) => updatePath(["displays", index, "type"], e.target.value)} />
                    </Field>
                    <Field label="Size">
                      <TextInput value={String(panel.size ?? "")} onChange={(e) => updatePath(["displays", index, "size"], e.target.value)} />
                    </Field>
                    <Field label="Resolution">
                      <TextInput value={panel.resolution || ""} onChange={(e) => updatePath(["displays", index, "resolution"], e.target.value)} />
                    </Field>
                    <Field label="Refresh Rate">
                      <TextInput value={String(panel.refreshRate ?? "")} onChange={(e) => updatePath(["displays", index, "refreshRate"], e.target.value)} />
                    </Field>
                    <Field label="Peak Brightness">
                      <TextInput value={String(panel.peakBrightness ?? "")} onChange={(e) => updatePath(["displays", index, "peakBrightness"], e.target.value)} />
                    </Field>
                    <Field label="Protection">
                      <TextInput value={panel.protection || ""} onChange={(e) => updatePath(["displays", index, "protection"], e.target.value)} />
                    </Field>
                    <Field label="Adaptive">
                      <Select value={formatBooleanSelect(panel.adaptive)} onChange={(e) => updatePath(["displays", index, "adaptive"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="Curved">
                      <Select value={formatBooleanSelect(panel.curved)} onChange={(e) => updatePath(["displays", index, "curved"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="HDR">
                      <TextInput value={formatCsv(panel.hdr)} onChange={(e) => updatePath(["displays", index, "hdr"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Extras">
                      <TextInput value={formatCsv(panel.extras)} onChange={(e) => updatePath(["displays", index, "extras"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Certifications">
                      <TextInput value={formatCsv(panel.certifications)} onChange={(e) => updatePath(["displays", index, "certifications"], splitCsv(e.target.value))} />
                    </Field>
                    <Field label="Others">
                      <TextInput value={formatCsv(panel.others)} onChange={(e) => updatePath(["displays", index, "others"], splitCsv(e.target.value))} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Performance" description="Chipset, CPU/GPU, cooling, extra chips, and AnTuTu breakdown.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Chipset">
              <TextInput value={form.performance?.chipset || ""} onChange={(e) => updatePath(["performance", "chipset"], e.target.value)} />
            </Field>
            <Field label="Additional Chips">
              <TextInput value={formatCsv(form.performance?.additionalChips)} onChange={(e) => updatePath(["performance", "additionalChips"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Fabrication">
              <TextInput value={form.performance?.fabrication || ""} onChange={(e) => updatePath(["performance", "fabrication"], e.target.value)} />
            </Field>
            <Field label="Architecture">
              <TextInput value={form.performance?.architecture || ""} onChange={(e) => updatePath(["performance", "architecture"], e.target.value)} />
            </Field>
            <Field label="CPU">
              <TextInput value={formatCsv(form.performance?.cpu)} onChange={(e) => updatePath(["performance", "cpu"], splitCsv(e.target.value))} />
            </Field>
            <Field label="GPU">
              <TextInput value={form.performance?.gpu || ""} onChange={(e) => updatePath(["performance", "gpu"], e.target.value)} />
            </Field>
            <Field label="GPU Frequency">
              <TextInput value={form.performance?.gpuFrequency || ""} onChange={(e) => updatePath(["performance", "gpuFrequency"], e.target.value)} />
            </Field>
            <Field label="Cooling System">
              <TextInput value={form.performance?.coolingSystem || ""} onChange={(e) => updatePath(["performance", "coolingSystem"], e.target.value)} />
            </Field>
          </div>

          <Field label="Other Performance Features">
            <TextInput value={formatCsv(form.performance?.otherFeatures)} onChange={(e) => updatePath(["performance", "otherFeatures"], splitCsv(e.target.value))} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="AnTuTu Total">
              <TextInput type="number" value={form.performance?.antutu?.total ?? ""} onChange={(e) => updatePath(["performance", "antutu", "total"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="AnTuTu CPU">
              <TextInput type="number" value={form.performance?.antutu?.cpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "cpu"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="AnTuTu GPU">
              <TextInput type="number" value={form.performance?.antutu?.gpu ?? ""} onChange={(e) => updatePath(["performance", "antutu", "gpu"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="AnTuTu Memory">
              <TextInput type="number" value={form.performance?.antutu?.memory ?? ""} onChange={(e) => updatePath(["performance", "antutu", "memory"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="AnTuTu UX">
              <TextInput type="number" value={form.performance?.antutu?.ux ?? ""} onChange={(e) => updatePath(["performance", "antutu", "ux"], parseOptionalNumber(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section title="Storage & Memory" description="Memory/storage overview, expandable storage, and market variants used on public spec pages.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="RAM Options">
              <TextInput value={formatCsv(form.memoryStorage?.ram)} onChange={(e) => updatePath(["memoryStorage", "ram"], splitCsv(e.target.value))} />
            </Field>
            <Field label="RAM Type">
              <TextInput value={formatCsv(form.memoryStorage?.ramType)} onChange={(e) => updatePath(["memoryStorage", "ramType"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Internal Storage">
              <TextInput value={formatCsv(form.memoryStorage?.internalStorage)} onChange={(e) => updatePath(["memoryStorage", "internalStorage"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Storage Type">
              <TextInput value={formatCsv(form.memoryStorage?.storageType)} onChange={(e) => updatePath(["memoryStorage", "storageType"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Virtual RAM">
              <TextInput value={formatCsv(form.memoryStorage?.virtualRam)} onChange={(e) => updatePath(["memoryStorage", "virtualRam"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Features">
              <TextInput value={formatCsv(form.memoryStorage?.features)} onChange={(e) => updatePath(["memoryStorage", "features"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Expandable Storage Supported">
              <Select value={formatBooleanSelect(form.memoryStorage?.expandableStorage?.supported)} onChange={(e) => updatePath(["memoryStorage", "expandableStorage", "supported"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Expandable Storage Max">
              <TextInput value={String(form.memoryStorage?.expandableStorage?.max ?? "")} onChange={(e) => updatePath(["memoryStorage", "expandableStorage", "max"], e.target.value)} />
            </Field>
            <Field label="Expandable Storage Types">
              <TextInput value={formatCsv(form.memoryStorage?.expandableStorage?.types)} onChange={(e) => updatePath(["memoryStorage", "expandableStorage", "types"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Variants</p>
              <button
                type="button"
                onClick={() => appendToPath(["variants"], { ram: "", ramType: "", storage: "", storageType: "", virtualRam: "" } satisfies MemoryVariant)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Variant
              </button>
            </div>
            <div className="grid gap-3">
              {(form.variants || []).map((variant, index) => (
                <div key={`variant-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <Field label="RAM">
                      <TextInput value={variant.ram || ""} onChange={(e) => updatePath(["variants", index, "ram"], e.target.value)} />
                    </Field>
                    <Field label="RAM Type">
                      <TextInput value={variant.ramType || ""} onChange={(e) => updatePath(["variants", index, "ramType"], e.target.value)} />
                    </Field>
                    <Field label="Storage">
                      <TextInput value={variant.storage || ""} onChange={(e) => updatePath(["variants", index, "storage"], e.target.value)} />
                    </Field>
                    <Field label="Storage Type">
                      <TextInput value={variant.storageType || ""} onChange={(e) => updatePath(["variants", index, "storageType"], e.target.value)} />
                    </Field>
                    <Field label="Virtual RAM">
                      <TextInput value={variant.virtualRam || ""} onChange={(e) => updatePath(["variants", index, "virtualRam"], e.target.value)} />
                    </Field>
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeFromPath(["variants"], index)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Battery & Charging" description="Battery capacity, charger details, wireless charging, and charging profiles.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Capacity">
              <TextInput value={String(form.battery?.capacity ?? "")} onChange={(e) => updatePath(["battery", "capacity"], e.target.value)} />
            </Field>
            <Field label="Type">
              <TextInput value={form.battery?.type || ""} onChange={(e) => updatePath(["battery", "type"], e.target.value)} />
            </Field>
            <Field label="Max Charging Support">
              <TextInput value={String(form.battery?.maxChargingSupport ?? "")} onChange={(e) => updatePath(["battery", "maxChargingSupport"], e.target.value)} />
            </Field>
            <Field label="Features">
              <TextInput value={formatCsv(form.battery?.features)} onChange={(e) => updatePath(["battery", "features"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-900">Charging Speed Map</p>
              <TextArea value={formatKeyValueLines(form.battery?.chargingSpeed)} onChange={(e) => updatePath(["battery", "chargingSpeed"], parseKeyValueLines(e.target.value))} placeholder={"wired: 80W\npd: 65W"} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-900">Wireless Speed Map</p>
              <TextArea value={formatKeyValueLines(form.battery?.wireless?.speed)} onChange={(e) => updatePath(["battery", "wireless", "speed"], parseKeyValueLines(e.target.value))} placeholder={"wireless: 50W\nreverse: 10W"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Charger In Box">
              <Select value={formatBooleanSelect(form.battery?.chargerInBox?.available)} onChange={(e) => updatePath(["battery", "chargerInBox", "available"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Charger Power">
              <TextInput value={String(form.battery?.chargerInBox?.power ?? "")} onChange={(e) => updatePath(["battery", "chargerInBox", "power"], e.target.value)} />
            </Field>
            <Field label="Wireless Supported">
              <Select value={formatBooleanSelect(form.battery?.wireless?.supported)} onChange={(e) => updatePath(["battery", "wireless", "supported"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Wireless Max Power">
              <TextInput value={String(form.battery?.wireless?.maxPower ?? "")} onChange={(e) => updatePath(["battery", "wireless", "maxPower"], e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Rear Camera" description="Structured rear camera setup used by public camera sections and comparison logic.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Features">
              <TextInput value={formatCsv(form.rearCamera?.features)} onChange={(e) => updatePath(["rearCamera", "features"], splitCsv(e.target.value))} />
            </Field>
            <Field label="AI Features">
              <TextInput value={formatCsv(form.rearCamera?.aiFeatures)} onChange={(e) => updatePath(["rearCamera", "aiFeatures"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Zoom">
              <TextInput
                value={[form.rearCamera?.zoom?.optical, form.rearCamera?.zoom?.digital].filter(Boolean).join(" | ")}
                onChange={(e) => {
                  const [optical = "", digital = ""] = e.target.value.split("|").map((item) => item.trim());
                  updatePath(["rearCamera", "zoom", "optical"], optical);
                  updatePath(["rearCamera", "zoom", "digital"], digital);
                }}
                placeholder="optical | digital"
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Video Recording">
              <TextInput value={formatCsv(form.rearCamera?.video?.recording)} onChange={(e) => updatePath(["rearCamera", "video", "recording"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Slow Motion">
              <TextInput value={formatCsv(form.rearCamera?.video?.slowMotion)} onChange={(e) => updatePath(["rearCamera", "video", "slowMotion"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Video Features">
              <TextInput value={formatCsv(form.rearCamera?.video?.features)} onChange={(e) => updatePath(["rearCamera", "video", "features"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Rear Camera Units</p>
              <button
                type="button"
                onClick={() => appendToPath(["rearCamera", "cameras"], { role: "", resolution: "", type: "", sensor: {} } satisfies RearCameraUnit)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Rear Camera
              </button>
            </div>
            <div className="grid gap-3">
              {(form.rearCamera?.cameras || []).map((camera, index) => (
                <div key={`rear-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Camera {index + 1}</p>
                    <button type="button" onClick={() => removeFromPath(["rearCamera", "cameras"], index)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Role">
                      <TextInput value={camera.role || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "role"], e.target.value)} />
                    </Field>
                    <Field label="Resolution">
                      <TextInput value={camera.resolution || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "resolution"], e.target.value)} />
                    </Field>
                    <Field label="Type">
                      <TextInput value={camera.type || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "type"], e.target.value)} />
                    </Field>
                    <Field label="Sensor Name">
                      <TextInput value={camera.sensor?.name || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "name"], e.target.value)} />
                    </Field>
                    <Field label="Aperture">
                      <TextInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "aperture"], e.target.value)} />
                    </Field>
                    <Field label="Sensor Size">
                      <TextInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "size"], e.target.value)} />
                    </Field>
                    <Field label="Pixel Size">
                      <TextInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} />
                    </Field>
                    <Field label="Focal Length">
                      <TextInput value={camera.sensor?.focalLength || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "focalLength"], e.target.value)} />
                    </Field>
                    <Field label="FOV">
                      <TextInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "fov"], e.target.value)} />
                    </Field>
                    <Field label="Zoom">
                      <TextInput value={camera.sensor?.zoom || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "zoom"], e.target.value)} />
                    </Field>
                    <Field label="Autofocus">
                      <TextInput value={camera.sensor?.autofocus || ""} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "autofocus"], e.target.value)} />
                    </Field>
                    <Field label="OIS">
                      <Select value={formatBooleanSelect(camera.sensor?.ois)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "ois"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="EIS">
                      <Select value={formatBooleanSelect(camera.sensor?.eis)} onChange={(e) => updatePath(["rearCamera", "cameras", index, "sensor", "eis"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Front Camera" description="Structured front camera setup used by selfie and video sections.">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Features">
              <TextInput value={formatCsv(form.frontCamera?.features)} onChange={(e) => updatePath(["frontCamera", "features"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Video Features">
              <TextInput value={formatCsv(form.frontCamera?.video?.features)} onChange={(e) => updatePath(["frontCamera", "video", "features"], splitCsv(e.target.value))} />
            </Field>
          </div>
          <Field label="Video Recording">
            <TextInput value={formatCsv(form.frontCamera?.video?.recording)} onChange={(e) => updatePath(["frontCamera", "video", "recording"], splitCsv(e.target.value))} />
          </Field>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Front Camera Units</p>
              <button
                type="button"
                onClick={() => appendToPath(["frontCamera", "cameras"], { role: "", resolution: "", type: "", autofocus: undefined, aperture: "", sensor: {} } satisfies FrontCameraUnit)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Front Camera
              </button>
            </div>
            <div className="grid gap-3">
              {(form.frontCamera?.cameras || []).map((camera, index) => (
                <div key={`front-camera-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Camera {index + 1}</p>
                    <button type="button" onClick={() => removeFromPath(["frontCamera", "cameras"], index)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Role">
                      <TextInput value={camera.role || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "role"], e.target.value)} />
                    </Field>
                    <Field label="Resolution">
                      <TextInput value={camera.resolution || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "resolution"], e.target.value)} />
                    </Field>
                    <Field label="Type">
                      <TextInput value={camera.type || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "type"], e.target.value)} />
                    </Field>
                    <Field label="Autofocus">
                      <Select value={formatBooleanSelect(camera.autofocus)} onChange={(e) => updatePath(["frontCamera", "cameras", index, "autofocus"], parseBooleanSelect(e.target.value))}>
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </Field>
                    <Field label="Aperture">
                      <TextInput value={camera.aperture || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "aperture"], e.target.value)} />
                    </Field>
                    <Field label="Sensor Name">
                      <TextInput value={camera.sensor?.name || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "name"], e.target.value)} />
                    </Field>
                    <Field label="Sensor Size">
                      <TextInput value={camera.sensor?.size || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "size"], e.target.value)} />
                    </Field>
                    <Field label="Pixel Size">
                      <TextInput value={camera.sensor?.pixelSize || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "pixelSize"], e.target.value)} />
                    </Field>
                    <Field label="Sensor Aperture">
                      <TextInput value={camera.sensor?.aperture || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "aperture"], e.target.value)} />
                    </Field>
                    <Field label="FOV">
                      <TextInput value={camera.sensor?.fov || ""} onChange={(e) => updatePath(["frontCamera", "cameras", index, "sensor", "fov"], e.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Legacy Camera Data" description="Fallback camera sensor data used by some score and comparison helpers.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Flash">
              <TextInput value={formatCsv(form.camera?.flash)} onChange={(e) => updatePath(["camera", "flash"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Features">
              <TextInput value={formatCsv(form.camera?.features)} onChange={(e) => updatePath(["camera", "features"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Other Features">
              <TextInput value={formatCsv(form.camera?.otherFeatures)} onChange={(e) => updatePath(["camera", "otherFeatures"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Rear Video">
              <TextInput value={formatCsv(form.camera?.video?.rear)} onChange={(e) => updatePath(["camera", "video", "rear"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Front Video">
              <TextInput value={formatCsv(form.camera?.video?.front)} onChange={(e) => updatePath(["camera", "video", "front"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Slow Motion">
              <TextInput value={formatCsv(form.camera?.video?.slowMotion)} onChange={(e) => updatePath(["camera", "video", "slowMotion"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Video Features">
              <TextInput value={formatCsv(form.camera?.video?.features)} onChange={(e) => updatePath(["camera", "video", "features"], splitCsv(e.target.value))} />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {([
              { title: "Legacy Rear Sensors", path: ["camera", "rear"] as PathKey[], items: form.camera?.rear || [] },
              { title: "Legacy Front Sensors", path: ["camera", "front"] as PathKey[], items: form.camera?.front || [] },
            ] as const).map((group) => (
              <div key={group.title} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900">{group.title}</p>
                  <button
                    type="button"
                    onClick={() =>
                      appendToPath(group.path, {
                        name: "",
                        resolution: "",
                        sensorSize: "",
                        sensorType: "",
                        aperture: "",
                        focalLength: "",
                        pixelSize: "",
                        eis: undefined,
                        ois: undefined,
                        autofocus: "",
                        zoom: "",
                      } satisfies ProductCameraSensor)
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    + Add Sensor
                  </button>
                </div>
                <div className="grid gap-3">
                  {group.items.map((sensor, index) => (
                    <div key={`${group.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">Sensor {index + 1}</p>
                        <button type="button" onClick={() => removeFromPath(group.path, index)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Name">
                          <TextInput value={sensor.name || ""} onChange={(e) => updatePath([...group.path, index, "name"], e.target.value)} />
                        </Field>
                        <Field label="Resolution">
                          <TextInput value={sensor.resolution || ""} onChange={(e) => updatePath([...group.path, index, "resolution"], e.target.value)} />
                        </Field>
                        <Field label="Sensor Size">
                          <TextInput value={sensor.sensorSize || ""} onChange={(e) => updatePath([...group.path, index, "sensorSize"], e.target.value)} />
                        </Field>
                        <Field label="Sensor Type">
                          <TextInput value={sensor.sensorType || ""} onChange={(e) => updatePath([...group.path, index, "sensorType"], e.target.value)} />
                        </Field>
                        <Field label="Aperture">
                          <TextInput value={sensor.aperture || ""} onChange={(e) => updatePath([...group.path, index, "aperture"], e.target.value)} />
                        </Field>
                        <Field label="Focal Length">
                          <TextInput value={sensor.focalLength || ""} onChange={(e) => updatePath([...group.path, index, "focalLength"], e.target.value)} />
                        </Field>
                        <Field label="Pixel Size">
                          <TextInput value={sensor.pixelSize || ""} onChange={(e) => updatePath([...group.path, index, "pixelSize"], e.target.value)} />
                        </Field>
                        <Field label="Autofocus">
                          <TextInput value={String(sensor.autofocus || "")} onChange={(e) => updatePath([...group.path, index, "autofocus"], e.target.value)} />
                        </Field>
                        <Field label="Zoom">
                          <TextInput value={sensor.zoom || ""} onChange={(e) => updatePath([...group.path, index, "zoom"], e.target.value)} />
                        </Field>
                        <Field label="OIS">
                          <Select value={formatBooleanSelect(sensor.ois)} onChange={(e) => updatePath([...group.path, index, "ois"], parseBooleanSelect(e.target.value))}>
                            <option value="">Unknown</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </Field>
                        <Field label="EIS">
                          <Select value={formatBooleanSelect(sensor.eis)} onChange={(e) => updatePath([...group.path, index, "eis"], parseBooleanSelect(e.target.value))}>
                            <option value="">Unknown</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Security & Sensors" description="Fingerprint, face unlock, and sensor coverage for public spec sections and filters.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Fingerprint Available">
              <Select value={formatBooleanSelect(form.security?.fingerprint?.available)} onChange={(e) => updatePath(["security", "fingerprint", "available"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Fingerprint Locations">
              <TextInput value={formatCsv(form.security?.fingerprint?.locations)} onChange={(e) => updatePath(["security", "fingerprint", "locations"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Fingerprint Types">
              <TextInput value={formatCsv(form.security?.fingerprint?.type)} onChange={(e) => updatePath(["security", "fingerprint", "type"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Face Unlock Type">
              <TextInput value={form.security?.faceUnlock?.type || ""} onChange={(e) => updatePath(["security", "faceUnlock", "type"], e.target.value)} />
            </Field>
          </div>

          <Field label="Sensors">
            <TextInput value={formatCsv(form.sensors)} onChange={(e) => setField("sensors", splitCsv(e.target.value))} placeholder="Accelerometer, gyro, compass" />
          </Field>
        </Section>

        <Section title="Network" description="Supported networks, bands, SIM behavior, Wi-Fi, Bluetooth, GPS, NFC, and infrared.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Supported Networks">
              <TextInput value={formatCsv(form.network?.supported)} onChange={(e) => updatePath(["network", "supported"], splitCsv(e.target.value))} placeholder="5G, 4G, 3G, 2G" />
            </Field>
            <Field label="SIM Type">
              <TextInput value={form.network?.sim?.type || ""} onChange={(e) => updatePath(["network", "sim", "type"], e.target.value)} />
            </Field>
            <Field label="SIM Config">
              <TextInput value={form.network?.sim?.config || ""} onChange={(e) => updatePath(["network", "sim", "config"], e.target.value)} />
            </Field>
            <Field label="SIM Hybrid">
              <Select value={formatBooleanSelect(form.network?.sim?.hybrid)} onChange={(e) => updatePath(["network", "sim", "hybrid"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Wi-Fi Version">
              <TextInput value={form.network?.wifi?.version || ""} onChange={(e) => updatePath(["network", "wifi", "version"], e.target.value)} />
            </Field>
            <Field label="Wi-Fi Standards">
              <TextInput value={formatCsv(form.network?.wifi?.standards)} onChange={(e) => updatePath(["network", "wifi", "standards"], splitCsv(e.target.value))} />
            </Field>
            <Field label="Wi-Fi Dual Band">
              <Select value={formatBooleanSelect(form.network?.wifi?.dualBand)} onChange={(e) => updatePath(["network", "wifi", "dualBand"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Bluetooth">
              <TextInput value={form.network?.bluetooth || ""} onChange={(e) => updatePath(["network", "bluetooth"], e.target.value)} />
            </Field>
            <Field label="GPS">
              <TextInput value={formatCsv(form.network?.gps)} onChange={(e) => updatePath(["network", "gps"], splitCsv(e.target.value))} />
            </Field>
            <Field label="NFC">
              <Select value={formatBooleanSelect(form.network?.nfc)} onChange={(e) => updatePath(["network", "nfc"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
            <Field label="Infrared">
              <Select value={formatBooleanSelect(form.network?.infrared)} onChange={(e) => updatePath(["network", "infrared"], parseBooleanSelect(e.target.value))}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-900">5G Bands</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="FDD">
                  <TextInput value={formatCsv(form.network?.bands?.["5G"]?.fdd)} onChange={(e) => updatePath(["network", "bands", "5G", "fdd"], splitCsv(e.target.value))} />
                </Field>
                <Field label="TDD">
                  <TextInput value={formatCsv(form.network?.bands?.["5G"]?.tdd)} onChange={(e) => updatePath(["network", "bands", "5G", "tdd"], splitCsv(e.target.value))} />
                </Field>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-900">4G Bands</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="FDD">
                  <TextInput value={formatCsv(form.network?.bands?.["4G"]?.fdd)} onChange={(e) => updatePath(["network", "bands", "4G", "fdd"], splitCsv(e.target.value))} />
                </Field>
                <Field label="TDD">
                  <TextInput value={formatCsv(form.network?.bands?.["4G"]?.tdd)} onChange={(e) => updatePath(["network", "bands", "4G", "tdd"], splitCsv(e.target.value))} />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Software" description="OS, UI, and update commitment information.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="OS Name">
              <TextInput value={form.software?.os?.name || ""} onChange={(e) => updatePath(["software", "os", "name"], e.target.value)} />
            </Field>
            <Field label="OS Version">
              <TextInput value={form.software?.os?.version || ""} onChange={(e) => updatePath(["software", "os", "version"], e.target.value)} />
            </Field>
            <Field label="UI">
              <TextInput value={form.software?.ui || ""} onChange={(e) => updatePath(["software", "ui"], e.target.value)} />
            </Field>
            <Field label="OS Updates">
              <TextInput type="number" value={form.software?.updates?.os ?? ""} onChange={(e) => updatePath(["software", "updates", "os"], parseOptionalNumber(e.target.value))} />
            </Field>
            <Field label="Security Updates">
              <TextInput type="number" value={form.software?.updates?.security ?? ""} onChange={(e) => updatePath(["software", "updates", "security"], parseOptionalNumber(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section title="Images" description="Upload and manage all product image URLs used across listing and detail pages.">
          <Field label="Upload image to Cloudinary">
            <TextInput type="file" accept="image/*" onChange={(e) => uploadImage(e.currentTarget.files?.[0] || null)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {(form.images || []).map((image, index) => (
              <div key={`${image}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                <div className="relative h-14 w-20 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                  <Image src={image} alt="Product" fill className="object-cover" unoptimized />
                </div>
                <div className="grid flex-1 gap-2">
                  <TextInput
                    value={image}
                    onChange={(e) => {
                      const next = [...(form.images || [])];
                      next[index] = e.target.value;
                      setField("images", next);
                    }}
                    className="text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setField("images", (form.images || []).filter((_, itemIndex) => itemIndex !== index))}
                    className="w-fit rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="pb-8">
          <div className="panel flex flex-wrap gap-2 p-4">
            <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving..." : editingId ? `Update ${pageTitle}` : `Create ${pageTitle}`}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel Edit
              </button>
            ) : null}
            <Link
              href={(editingId || finalSlug) ? `/${deviceType === "smartphone" ? "mobile" : "tablets"}/${encodeURIComponent(finalSlug)}?preview=1&id=${encodeURIComponent(editingId || finalSlug)}` : "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${!(editingId || finalSlug) ? "opacity-60 pointer-events-none" : ""}`}
            >
              Live Preview
            </Link>
          </div>
        </div>

        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
          <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? `Update ${pageTitle}` : `Create ${pageTitle}`}
              </button>
              <Link
                href={(editingId || finalSlug) ? `/${deviceType === "smartphone" ? "mobile" : "tablets"}/${encodeURIComponent(finalSlug)}?preview=1&id=${encodeURIComponent(editingId || finalSlug)}` : "#"}
                target="_blank"
                rel="noreferrer"
                className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 ${!(editingId || finalSlug) ? "opacity-60 pointer-events-none" : ""}`}
              >
                Live Preview
              </Link>
            </div>
          </div>
        </div>

        {helperSuggestions.length ? (
          <datalist id="suggest-helper">
            {helperSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ) : null}
      </form>
        </>
      )}
    </main>
  );
}
