"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinary/upload";
import type { BlogPost, TimestampLike } from "@/lib/types/content";
import { slugify } from "@/utils/slugify";

type SaveMode = "manual" | "autosave";
type UploadTarget = "featuredImage" | "ogImage";
type PreviewMode = "reader" | "seo" | "outline";
type LibrarySort = "updated-desc" | "updated-asc" | "title-asc" | "title-desc" | "priority" | "status";
type BulkAction = "publish" | "draft" | "delete";

type RevisionSnapshot = {
  id: string;
  label: string;
  createdAt: string;
  form: BlogPost;
};

type HeadingItem = {
  level: 2 | 3;
  text: string;
};

type ChecklistItem = {
  label: string;
  passed: boolean;
  helper?: string;
};

const REVISION_LIMIT = 8;

const CONTENT_SNIPPETS = [
  { label: "H2", value: "<h2>{{selected}}</h2>" },
  { label: "H3", value: "<h3>{{selected}}</h3>" },
  { label: "Paragraph", value: "<p>{{selected}}</p>" },
  {
    label: "Hero Intro",
    value:
      "<section><p><strong>Quick take:</strong> {{selected}}</p><p>Summarize why this topic matters and what readers will learn.</p></section>",
  },
  {
    label: "Pros & Cons",
    value:
      '<section class="pros-cons"><div><h3>Pros</h3><ul><li>Point one</li><li>Point two</li></ul></div><div><h3>Cons</h3><ul><li>Point one</li><li>Point two</li></ul></div></section>',
  },
  {
    label: "Specs Table",
    value:
      "<table><thead><tr><th>Feature</th><th>Details</th></tr></thead><tbody><tr><td>Chipset</td><td>Example</td></tr><tr><td>Battery</td><td>Example</td></tr></tbody></table>",
  },
  {
    label: "FAQ",
    value:
      "<section><h2>FAQs</h2><h3>Question 1</h3><p>Answer 1</p><h3>Question 2</h3><p>Answer 2</p></section>",
  },
  {
    label: "CTA Button",
    value:
      '<p><a href="#" class="inline-block rounded-lg bg-blue-700 px-4 py-2 text-white">Read more</a></p>',
  },
  {
    label: "Image",
    value: '<figure><img src="" alt="Describe image" /><figcaption>Optional caption</figcaption></figure>',
  },
  {
    label: "Quote",
    value: "<blockquote><p>{{selected}}</p><cite>Source</cite></blockquote>",
  },
];

const EDITOR_TEMPLATES = [
  {
    label: "Review",
    helper: "Product review format",
    value: `<section>
  <p><strong>Quick verdict:</strong> Explain the main takeaway for readers.</p>
  <h2>Design and Build</h2>
  <p>Explain materials, feel in hand, size, weight, and design highlights.</p>
  <h2>Display Quality</h2>
  <p>Talk about panel type, resolution, refresh rate, brightness, and real usage.</p>
  <h2>Performance and Software</h2>
  <p>Cover chipset, RAM, thermals, gaming, and software experience.</p>
  <h2>Camera Experience</h2>
  <p>Discuss daylight, low-light, portraits, video, and selfie quality.</p>
  <h2>Battery and Charging</h2>
  <p>Explain endurance, charging speed, and standby behavior.</p>
  <h2>Should You Buy It?</h2>
  <p>Conclude with buying advice and target audience.</p>
</section>`,
  },
  {
    label: "Comparison",
    helper: "Versus article structure",
    value: `<section>
  <p><strong>Comparison summary:</strong> Mention which device is better for which audience.</p>
  <h2>Price and Variants</h2>
  <p>Compare current prices and value for money.</p>
  <h2>Design and Display</h2>
  <p>Compare size, ergonomics, durability, and screen quality.</p>
  <h2>Performance</h2>
  <p>Compare chipset, RAM, gaming, and thermal behavior.</p>
  <h2>Cameras</h2>
  <p>Compare rear cameras, selfies, video, and consistency.</p>
  <h2>Battery</h2>
  <p>Compare battery life and charging convenience.</p>
  <h2>Final Verdict</h2>
  <p>Give a clear winner for different buyer needs.</p>
</section>`,
  },
  {
    label: "News / Launch",
    helper: "Fast publishing layout",
    value: `<section>
  <p><strong>Headline summary:</strong> Share the most important news in one sentence.</p>
  <h2>What is New?</h2>
  <p>Explain the announcement or launch details.</p>
  <h2>Key Highlights</h2>
  <ul>
    <li>Main feature one</li>
    <li>Main feature two</li>
    <li>Main feature three</li>
  </ul>
  <h2>Price and Availability</h2>
  <p>Share launch pricing, regions, and sale dates.</p>
  <h2>Why it Matters</h2>
  <p>Explain why readers should care.</p>
</section>`,
  },
];

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

function normalizeLookupKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCsv(values?: string[]): string {
  return Array.isArray(values) ? values.join(", ") : "";
}

function stripHtml(value: string): string {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimatedReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDateTime(value?: TimestampLike): string {
  if (!value) return "-";
  if (typeof value === "string") {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? value : asDate.toLocaleString();
  }
  if (typeof value === "number") {
    return new Date(value).toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate().toLocaleString();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toLocaleString();
  }
  return "-";
}

function timestampToMs(value?: TimestampLike): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.seconds === "number") return value.seconds * 1000;
  }
  return 0;
}

function buildStorageDraftKey(editingId: string | null): string {
  return editingId ? `admin_blog_draft_${editingId}` : "admin_blog_draft_new";
}

function buildStorageRevisionKey(editingId: string | null): string {
  return editingId ? `admin_blog_revisions_${editingId}` : "admin_blog_revisions_new";
}

function createExcerptFromContent(content: string): string {
  const text = stripHtml(content);
  if (!text) return "";
  return text.slice(0, 160).trim();
}

function createMetaDescription(form: BlogPost): string {
  const raw = (form.seo?.metaDescription || "").trim() || (form.excerpt || "").trim() || createExcerptFromContent(form.content || "");
  return raw.slice(0, 160).trim();
}

function createMetaTitle(form: BlogPost): string {
  const raw = (form.seo?.metaTitle || "").trim() || (form.title || "").trim();
  return raw.slice(0, 65).trim();
}

function extractHeadings(content: string): HeadingItem[] {
  const matches = Array.from(content.matchAll(/<h([23])[^>]*>(.*?)<\/h\1>/gim));
  return matches
    .map((match) => {
      const level: HeadingItem["level"] = match[1] === "2" ? 2 : 3;
      return {
        level,
        text: stripHtml(match[2] || ""),
      };
    })
    .filter((item) => item.text);
}

function insertAtCursor(
  source: string,
  textarea: HTMLTextAreaElement | null,
  snippet: string
): { nextValue: string; nextCursor: number } {
  if (!textarea) {
    const nextValue = `${source}${source ? "\n\n" : ""}${snippet}`;
    return { nextValue, nextCursor: nextValue.length };
  }

  const start = textarea.selectionStart ?? source.length;
  const end = textarea.selectionEnd ?? source.length;
  const before = source.slice(0, start);
  const selected = source.slice(start, end);
  const after = source.slice(end);
  const valueToInsert = snippet.includes("{{selected}}")
    ? snippet.replace(/\{\{selected\}\}/g, selected || "Write here")
    : snippet;

  const nextValue = `${before}${valueToInsert}${after}`;
  const nextCursor = before.length + valueToInsert.length;
  return { nextValue, nextCursor };
}

function scorePublishReadiness(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  const passed = items.filter((item) => item.passed).length;
  return Math.round((passed / items.length) * 100);
}

function priorityRank(value?: NonNullable<BlogPost["workflow"]>["priority"]): number {
  if (value === "high") return 0;
  if (value === "medium") return 1;
  return 2;
}

function statusRank(value?: BlogPost["status"]): number {
  return value === "published" ? 0 : 1;
}

function AdminStatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  actions,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "info" | "neutral" | "danger";
}) {
  const tones = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-slate-100 text-slate-700",
    danger: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{label}</span>;
}

export default function AdminBlogsPage() {
  const [rows, setRows] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogPost>(emptyBlog());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("reader");
  const [listQuery, setListQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogPost["status"]>("all");
  const [stageFilter, setStageFilter] = useState<"all" | NonNullable<BlogPost["workflow"]>["stage"]>("all");
  const [sortBy, setSortBy] = useState<LibrarySort>("updated-desc");
  const [helperAliasMap, setHelperAliasMap] = useState<Record<string, string>>({});
  const [helperSuggestions, setHelperSuggestions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const saveInFlightRef = useRef(false);

  const finalSlug = useMemo(() => form.slug || slugify(form.title), [form.slug, form.title]);
  const plainTextContent = useMemo(() => stripHtml(form.content || ""), [form.content]);
  const headings = useMemo(() => extractHeadings(form.content || ""), [form.content]);
  const wordCount = useMemo(
    () => (plainTextContent ? plainTextContent.split(/\s+/).filter(Boolean).length : 0),
    [plainTextContent]
  );
  const readingMinutes = useMemo(() => estimatedReadingMinutes(plainTextContent), [plainTextContent]);

  const metaTitleLength = (form.seo?.metaTitle || "").trim().length;
  const metaDescriptionLength = (form.seo?.metaDescription || "").trim().length;
  const excerptLength = (form.excerpt || "").trim().length;

  const duplicateSlugRow = useMemo(() => {
    if (!finalSlug) return null;
    return rows.find((row) => row.slug === finalSlug && row.id !== editingId) || null;
  }, [editingId, finalSlug, rows]);

  const duplicateTitleRow = useMemo(() => {
    const normalizedTitle = normalizeLookupKey(form.title);
    if (!normalizedTitle) return null;
    return (
      rows.find((row) => normalizeLookupKey(row.title) === normalizedTitle && row.id !== editingId) || null
    );
  }, [editingId, form.title, rows]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/blogs?admin=1", { cache: "no-store" });
    const json = (await response.json()) as { items?: BlogPost[]; error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load blogs.");
    }
    setRows(Array.isArray(json.items) ? json.items : []);
  }, []);

  const loadRevisions = useCallback((id: string | null) => {
    try {
      const raw = window.localStorage.getItem(buildStorageRevisionKey(id));
      const parsed = raw ? (JSON.parse(raw) as RevisionSnapshot[]) : [];
      setRevisions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRevisions([]);
    }
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load blogs.");
    });
  }, [refresh]);

  useEffect(() => {
    let active = true;

    async function loadHelper() {
      try {
        const response = await fetch("/api/admin/helper-terms?scope=blog", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as {
          items?: { name: string; aliases?: string[]; status?: string }[];
        };

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
        setHelperSuggestions(Array.from(suggestions).sort((a, b) => a.localeCompare(b)));
      } catch {
        // ignore helper load failures
      }
    }

    loadHelper().catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (editingId) {
      loadRevisions(editingId);
      return;
    }

    try {
      const raw = window.localStorage.getItem(buildStorageDraftKey(null));
      if (raw) {
        const parsed = JSON.parse(raw) as BlogPost;
        if (parsed && parsed.title) {
          setForm({ ...emptyBlog(), ...parsed });
          setMessage("Recovered unsaved local draft.");
        }
      }
    } catch {
      // ignore
    }

    loadRevisions(null);
  }, [editingId, loadRevisions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(buildStorageDraftKey(editingId), JSON.stringify(form));
    } catch {
      // ignore local storage errors
    }
  }, [editingId, form]);

  useEffect(() => {
    if (!autosaveEnabled || !dirty || !form.title.trim()) return;
    const timer = window.setTimeout(() => {
      saveBlog("autosave").catch(() => undefined);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, dirty, form, saveBlog]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSave) return;
      event.preventDefault();
      saveBlog("manual").catch(() => undefined);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveBlog]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const normalizeTextToken = useCallback(
    (value: string): string => {
      const compact = String(value || "").trim().replace(/\s+/g, " ");
      if (!compact) return "";
      const alias = helperAliasMap[normalizeLookupKey(compact)];
      return alias || compact;
    },
    [helperAliasMap]
  );

  const normalizeCsvArray = useCallback(
    (values: string[]): string[] => {
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
    },
    [normalizeTextToken]
  );

  const buildPayload = useCallback(
    (mode: SaveMode): BlogPost => {
      const normalizedTitle = normalizeTextToken(form.title);
      const normalizedTags = normalizeCsvArray(form.tags || []);
      const normalizedCategories = normalizeCsvArray(form.categories || []);
      const nextStage =
        form.status === "published" || form.workflow?.stage === "published"
          ? "published"
          : form.workflow?.stage || "draft";

      return {
        ...form,
        title: normalizedTitle,
        slug: finalSlug,
        excerpt: (form.excerpt || "").trim(),
        content: form.content || "",
        featuredImage: (form.featuredImage || "").trim(),
        tags: normalizedTags,
        categories: normalizedCategories,
        status: mode === "autosave" && !editingId ? "draft" : form.status,
        seo: {
          ...(form.seo || {}),
          metaTitle: (form.seo?.metaTitle || "").trim(),
          metaDescription: (form.seo?.metaDescription || "").trim(),
          canonicalUrl: (form.seo?.canonicalUrl || "").trim(),
          focusKeyword: (form.seo?.focusKeyword || "").trim(),
          ogImage: (form.seo?.ogImage || "").trim(),
          noIndex: Boolean(form.seo?.noIndex),
        },
        workflow: {
          ...(form.workflow || {}),
          stage: nextStage,
          priority: form.workflow?.priority || "medium",
          assignee: (form.workflow?.assignee || "").trim(),
          dueDate: form.workflow?.dueDate || "",
          notes: form.workflow?.notes || "",
          lastAutoSavedAt: mode === "autosave" ? new Date().toISOString() : form.workflow?.lastAutoSavedAt,
        },
      };
    },
    [editingId, finalSlug, form, normalizeCsvArray, normalizeTextToken]
  );

  const createRevision = useCallback(
    (label: string, blog: BlogPost, idOverride?: string | null) => {
      const key = buildStorageRevisionKey(idOverride ?? editingId);
      const nextRevision: RevisionSnapshot = {
        id: `${Date.now()}`,
        label,
        createdAt: new Date().toISOString(),
        form: blog,
      };

      try {
        const current = (() => {
          const raw = window.localStorage.getItem(key);
          const parsed = raw ? (JSON.parse(raw) as RevisionSnapshot[]) : [];
          return Array.isArray(parsed) ? parsed : [];
        })();

        const next = [nextRevision, ...current].slice(0, REVISION_LIMIT);
        window.localStorage.setItem(key, JSON.stringify(next));
        setRevisions(next);
      } catch {
        // ignore local revision failures
      }
    },
    [editingId]
  );

  async function saveBlog(mode: SaveMode): Promise<boolean> {
    if (saveInFlightRef.current) return false;
    if (!form.title.trim()) {
      if (mode === "manual") setError("Title is required.");
      return false;
    }
    if (!finalSlug.trim()) {
      if (mode === "manual") setError("Slug is required.");
      return false;
    }

    saveInFlightRef.current = true;
    if (mode === "manual") {
      setSaving(true);
      setError("");
      setMessage("");
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

      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(json.error || "Failed to save blog.");

      const nextId = editingId || (json.id ? String(json.id) : null);
      if (!editingId && json.id) {
        setEditingId(String(json.id));
      }

      const now = new Date().toLocaleTimeString();
      if (mode === "manual") {
        setLastSavedAt(now);
        setMessage(editingId ? "Blog updated successfully." : "Blog created successfully.");
        createRevision(editingId ? "Manual save" : "Created", payload, nextId);
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
  }

  const counts = useMemo(() => {
    const total = rows.length;
    const published = rows.filter((row) => row.status === "published").length;
    const draft = rows.filter((row) => row.status !== "published").length;
    const review = rows.filter((row) => row.workflow?.stage === "review").length;
    const highPriority = rows.filter((row) => row.workflow?.priority === "high").length;
    return { total, published, draft, review, highPriority };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = listQuery.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const haystack = [
        row.title,
        row.slug,
        row.excerpt,
        ...(row.tags || []),
        ...(row.categories || []),
        row.workflow?.assignee || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const stage = row.workflow?.stage || "draft";
      const matchesStage = stageFilter === "all" || stage === stageFilter;

      return matchesQuery && matchesStatus && matchesStage;
    });

    filtered.sort((left, right) => {
      if (sortBy === "updated-desc") return timestampToMs(right.updatedAt) - timestampToMs(left.updatedAt);
      if (sortBy === "updated-asc") return timestampToMs(left.updatedAt) - timestampToMs(right.updatedAt);
      if (sortBy === "title-asc") return left.title.localeCompare(right.title);
      if (sortBy === "title-desc") return right.title.localeCompare(left.title);
      if (sortBy === "priority") {
        return priorityRank(left.workflow?.priority) - priorityRank(right.workflow?.priority);
      }
      return statusRank(left.status) - statusRank(right.status);
    });

    return filtered;
  }, [listQuery, rows, sortBy, stageFilter, statusFilter]);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => row.id && selectedIds.includes(row.id)),
    [filteredRows, selectedIds]
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    const hasH2 = headings.some((item) => item.level === 2);
    const canonicalUrl = (form.seo?.canonicalUrl || "").trim();
    const focusKeyword = (form.seo?.focusKeyword || "").trim();

    return [
      {
        label: "Strong title",
        passed: form.title.trim().length >= 20 && form.title.trim().length <= 85,
        helper: "Aim for 20–85 characters.",
      },
      {
        label: "Unique slug",
        passed: Boolean(finalSlug.trim()) && !duplicateSlugRow,
        helper: duplicateSlugRow ? `Conflicts with "${duplicateSlugRow.title}"` : "No duplicate slug found.",
      },
      {
        label: "Excerpt ready",
        passed: excerptLength >= 90 && excerptLength <= 220,
        helper: "Best when concise and useful.",
      },
      {
        label: "Featured image added",
        passed: Boolean((form.featuredImage || "").trim()),
      },
      {
        label: "Meta title optimized",
        passed: metaTitleLength >= 40 && metaTitleLength <= 65,
        helper: `${metaTitleLength} characters`,
      },
      {
        label: "Meta description optimized",
        passed: metaDescriptionLength >= 120 && metaDescriptionLength <= 160,
        helper: `${metaDescriptionLength} characters`,
      },
      {
        label: "Focus keyword set",
        passed: Boolean(focusKeyword),
      },
      {
        label: "Enough content depth",
        passed: wordCount >= 450,
        helper: `${wordCount} words`,
      },
      {
        label: "Article structure present",
        passed: hasH2 && headings.length >= 3,
        helper: `${headings.length} headings found`,
      },
      {
        label: "Taxonomy attached",
        passed: Boolean((form.tags || []).length) && Boolean((form.categories || []).length),
        helper: "Use both tags and categories.",
      },
      {
        label: "Canonical or clean default URL",
        passed: Boolean(canonicalUrl) || Boolean(finalSlug),
        helper: canonicalUrl || `/blog/${finalSlug || "your-slug"}`,
      },
    ];
  }, [
    duplicateSlugRow,
    excerptLength,
    finalSlug,
    form.categories,
    form.featuredImage,
    form.seo?.canonicalUrl,
    form.seo?.focusKeyword,
    form.tags,
    form.title,
    headings,
    metaDescriptionLength,
    metaTitleLength,
    wordCount,
  ]);

  const publishReadiness = useMemo(() => scorePublishReadiness(checklist), [checklist]);

  const seoScore = useMemo(() => {
    let score = 0;
    if (form.title.trim()) score += 15;
    if ((form.excerpt || "").trim()) score += 10;
    if ((form.featuredImage || "").trim()) score += 10;
    if ((form.seo?.metaTitle || "").trim()) score += 15;
    if ((form.seo?.metaDescription || "").trim()) score += 15;
    if ((form.seo?.focusKeyword || "").trim()) score += 10;
    if ((form.seo?.canonicalUrl || "").trim() || finalSlug.trim()) score += 5;
    if ((form.tags || []).length) score += 5;
    if ((form.categories || []).length) score += 5;
    if (headings.length >= 3) score += 5;
    if (wordCount >= 450) score += 5;
    return score;
  }, [finalSlug, form, headings.length, wordCount]);

  function updateForm(next: BlogPost) {
    setForm(next);
    setDirty(true);
    setMessage("");
  }

  function setField<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    updateForm({ ...form, [key]: value });
  }

  function setSeoField<K extends keyof NonNullable<BlogPost["seo"]>>(
    key: K,
    value: NonNullable<BlogPost["seo"]>[K]
  ) {
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
    setPreviewMode("reader");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyBlog());
    setDirty(false);
    setMessage("");
    setError("");
    setPreviewMode("reader");
    loadRevisions(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await saveBlog("manual");
  }

  async function removeBlog(id?: string) {
    if (!id) return;
    if (!window.confirm("Delete this blog?")) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Delete failed.");

      setMessage("Blog deleted.");
      if (editingId === id) resetForm();
      setSelectedIds((current) => current.filter((item) => item !== id));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function uploadImage(file: File | null, target: UploadTarget) {
    if (!file) return;

    setUploadingTarget(target);
    setError("");
    setMessage("");

    try {
      const url = await uploadImageToCloudinary(file);
      if (target === "featuredImage") {
        setField("featuredImage", url);
      } else {
        setSeoField("ogImage", url);
      }
      setMessage(target === "featuredImage" ? "Featured image uploaded." : "OG image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingTarget(null);
    }
  }

  function insertSnippet(snippet: string) {
    const { nextValue, nextCursor } = insertAtCursor(form.content || "", contentRef.current, snippet);
    setField("content", nextValue);

    window.setTimeout(() => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      contentRef.current.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }

  function applyTemplate(template: string) {
    if ((form.content || "").trim() && !window.confirm("Replace the current content with this template?")) {
      return;
    }
    setField("content", template);
    setMessage("Template applied.");
  }

  function generateSmartFields() {
    const keywordSeed =
      (form.seo?.focusKeyword || "").trim() ||
      (form.tags || [])[0] ||
      (form.categories || [])[0] ||
      form.title.trim();

    const nextExcerpt = (form.excerpt || "").trim() || createExcerptFromContent(form.content || "");
    const nextMetaTitle = createMetaTitle(form);
    const nextMetaDescription = createMetaDescription({
      ...form,
      excerpt: nextExcerpt,
    });

    updateForm({
      ...form,
      excerpt: nextExcerpt,
      seo: {
        ...(form.seo || {}),
        metaTitle: nextMetaTitle,
        metaDescription: nextMetaDescription,
        focusKeyword: keywordSeed.slice(0, 60),
        canonicalUrl: (form.seo?.canonicalUrl || "").trim() || `/blog/${finalSlug || slugify(form.title)}`,
      },
    });

    setMessage("Excerpt and SEO fields generated from content.");
  }

  function captureManualSnapshot() {
    createRevision(editingId ? "Snapshot" : "Draft snapshot", form);
    setMessage("Snapshot saved to local revisions.");
  }

  function restoreRevision(revision: RevisionSnapshot) {
    if (!window.confirm(`Restore snapshot "${revision.label}" from ${formatDateTime(revision.createdAt)}?`)) {
      return;
    }

    setForm({
      ...emptyBlog(),
      ...revision.form,
      seo: { ...emptyBlog().seo, ...(revision.form.seo || {}) },
      workflow: { ...emptyBlog().workflow, ...(revision.form.workflow || {}) },
      tags: revision.form.tags || [],
      categories: revision.form.categories || [],
    });
    setDirty(true);
    setMessage("Snapshot restored into the editor.");
    setError("");
  }

  function deleteRevision(revisionId: string) {
    const next = revisions.filter((item) => item.id !== revisionId);
    setRevisions(next);
    try {
      window.localStorage.setItem(buildStorageRevisionKey(editingId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function quickPublish() {
    updateForm({
      ...form,
      status: "published",
      workflow: {
        ...(form.workflow || {}),
        stage: "published",
      },
    });

    window.setTimeout(() => {
      saveBlog("manual").catch(() => undefined);
    }, 0);
  }

  function duplicateCurrentToNew() {
    const next = {
      ...form,
      title: form.title ? `${form.title} Copy` : "Untitled Copy",
      slug: "",
      status: "draft" as const,
      workflow: {
        ...(form.workflow || {}),
        stage: "draft" as const,
      },
    };
    setEditingId(null);
    setForm(next);
    setDirty(true);
    setMessage("Cloned current blog into a new draft.");
    setError("");
    loadRevisions(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateRow(row: BlogPost) {
    setEditingId(null);
    setForm({
      ...emptyBlog(),
      ...row,
      title: row.title ? `${row.title} Copy` : "Untitled Copy",
      slug: "",
      status: "draft",
      seo: { ...emptyBlog().seo, ...(row.seo || {}) },
      workflow: {
        ...emptyBlog().workflow,
        ...(row.workflow || {}),
        stage: "draft",
      },
      tags: row.tags || [],
      categories: row.categories || [],
    });
    setDirty(true);
    setMessage("Blog duplicated into the editor as a new draft.");
    setError("");
    loadRevisions(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function quickToggleRowStatus(row: BlogPost) {
    if (!row.id) return;

    const nextStatus: BlogPost["status"] = row.status === "published" ? "draft" : "published";
    const payload: BlogPost = {
      ...emptyBlog(),
      ...row,
      status: nextStatus,
      seo: { ...emptyBlog().seo, ...(row.seo || {}) },
      workflow: {
        ...emptyBlog().workflow,
        ...(row.workflow || {}),
        stage: nextStatus === "published" ? "published" : row.workflow?.stage === "published" ? "draft" : row.workflow?.stage || "draft",
      },
      tags: row.tags || [],
      categories: row.categories || [],
    };

    try {
      const response = await fetch(`/api/blogs/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Failed to update status.");

      setMessage(nextStatus === "published" ? "Blog published." : "Blog moved back to draft.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  async function runBulkAction(action: BulkAction) {
    if (!selectedRows.length) return;

    const confirmMessage =
      action === "delete"
        ? `Delete ${selectedRows.length} selected blog(s)?`
        : action === "publish"
          ? `Publish ${selectedRows.length} selected blog(s)?`
          : `Move ${selectedRows.length} selected blog(s) to draft?`;

    if (!window.confirm(confirmMessage)) return;

    setError("");
    setMessage("");

    try {
      for (const row of selectedRows) {
        if (!row.id) continue;

        if (action === "delete") {
          const response = await fetch(`/api/blogs/${row.id}`, { method: "DELETE" });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(json.error || `Failed to delete "${row.title}".`);
          continue;
        }

        const nextStatus: BlogPost["status"] = action === "publish" ? "published" : "draft";
        const payload: BlogPost = {
          ...emptyBlog(),
          ...row,
          status: nextStatus,
          seo: { ...emptyBlog().seo, ...(row.seo || {}) },
          workflow: {
            ...emptyBlog().workflow,
            ...(row.workflow || {}),
            stage:
              action === "publish"
                ? "published"
                : row.workflow?.stage === "published"
                  ? "draft"
                  : row.workflow?.stage || "draft",
          },
          tags: row.tags || [],
          categories: row.categories || [],
        };

        const response = await fetch(`/api/blogs/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(json.error || `Failed to update "${row.title}".`);
      }

      setMessage(
        action === "delete"
          ? "Selected blogs deleted."
          : action === "publish"
            ? "Selected blogs published."
            : "Selected blogs moved to draft."
      );
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    }
  }

  function copyPublicUrl(slug: string = finalSlug) {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setMessage("Public blog URL copied to clipboard."))
      .catch(() => setError("Failed to copy the URL."));
  }

  function copyEditorJson() {
    navigator.clipboard
      .writeText(JSON.stringify(buildPayload("manual"), null, 2))
      .then(() => setMessage("Blog JSON copied to clipboard."))
      .catch(() => setError("Failed to copy blog JSON."));
  }

  async function importBlogJson(file: File | null) {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BlogPost>;

      setForm({
        ...emptyBlog(),
        ...parsed,
        seo: { ...emptyBlog().seo, ...(parsed.seo || {}) },
        workflow: { ...emptyBlog().workflow, ...(parsed.workflow || {}) },
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        status: parsed.status || "draft",
      });

      setEditingId(null);
      setDirty(true);
      setMessage("Blog JSON imported into a new draft.");
      setError("");
      loadRevisions(null);
    } catch {
      setError("Invalid JSON file.");
    } finally {
      if (importRef.current) {
        importRef.current.value = "";
      }
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleSelectAllFiltered() {
    const visibleIds = filteredRows.map((row) => row.id).filter(Boolean) as string[];
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
  }

  const publicUrl = useMemo(() => `/blog/${finalSlug || "your-slug"}`, [finalSlug]);

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-200">Admin Blog Studio</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              {editingId ? "Advanced Blog Editor" : "Create a Modern Blog Post"}
            </h1>
            <p className="mt-2 text-sm text-slate-200">
              Feature-rich admin workflow with templates, autosave, SEO scoring, publish checklist, revision
              snapshots, smart content generation, bulk management, and live previews.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge
                label={dirty ? "Unsaved changes" : "Saved state"}
                tone={dirty ? "warning" : "success"}
              />
              <StatusBadge
                label={duplicateSlugRow ? "Duplicate slug found" : "Slug available"}
                tone={duplicateSlugRow ? "danger" : "info"}
              />
              <StatusBadge
                label={`Publish readiness ${publishReadiness}%`}
                tone={publishReadiness >= 80 ? "success" : publishReadiness >= 50 ? "warning" : "danger"}
              />
              <StatusBadge label={`${readingMinutes} min read`} tone="neutral" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Posts" value={counts.total} helper="All blog entries" />
            <AdminStatCard label="Published" value={counts.published} helper="Live on site" tone="success" />
            <AdminStatCard label="Review" value={counts.review} helper="Awaiting approval" tone="accent" />
            <AdminStatCard label="High Priority" value={counts.highPriority} helper="Needs attention" tone="warning" />
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className={`grid gap-4 ${focusMode ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1.45fr)_430px]"}`}>
        <div className="space-y-4">
          <Panel
            title="Command Bar"
            description="Fast actions for drafting, saving, cloning, importing, and publishing."
            actions={
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewMode("reader")}
                  className={`rounded-lg px-3 py-2 ${previewMode === "reader" ? "bg-blue-700 text-white" : "text-slate-700"}`}
                >
                  Reader
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("seo")}
                  className={`rounded-lg px-3 py-2 ${previewMode === "seo" ? "bg-blue-700 text-white" : "text-slate-700"}`}
                >
                  SEO
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("outline")}
                  className={`rounded-lg px-3 py-2 ${previewMode === "outline" ? "bg-blue-700 text-white" : "text-slate-700"}`}
                >
                  Outline
                </button>
              </div>
            }
          >
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="submit"
                disabled={saving || uploadingTarget !== null}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Blog" : "Create Blog"}
              </button>
              <button
                type="button"
                onClick={() => saveBlog("autosave")}
                disabled={uploadingTarget !== null}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Save Draft Now
              </button>
              <button
                type="button"
                onClick={quickPublish}
                disabled={saving || uploadingTarget !== null}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset Editor
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={generateSmartFields}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Generate SEO + Excerpt
              </button>
              <button
                type="button"
                onClick={duplicateCurrentToNew}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Clone as New Draft
              </button>
              <button
                type="button"
                onClick={captureManualSnapshot}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Save Snapshot
              </button>
              <button
                type="button"
                onClick={() => setFocusMode((current) => !current)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {focusMode ? "Exit Focus Mode" : "Focus Mode"}
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => copyPublicUrl()}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Copy Public URL
              </button>
              <button
                type="button"
                onClick={copyEditorJson}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Import JSON
              </button>
              <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autosaveEnabled}
                  onChange={(e) => setAutosaveEnabled(e.target.checked)}
                />
                Autosave every 12s
              </label>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => importBlogJson(e.currentTarget.files?.[0] || null)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dirty State</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {dirty ? "Unsaved changes" : "All changes saved"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last Manual Save</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{lastSavedAt || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last Autosave</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{lastAutoSavedAt || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shortcut</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Ctrl/Cmd + S</p>
              </div>
            </div>

            {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          </Panel>

          <Panel
            title="Templates and Quick Inserts"
            description="Start faster with editorial templates and reusable HTML blocks."
          >
            <div className="grid gap-3 lg:grid-cols-3">
              {EDITOR_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyTemplate(template.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-sm font-bold text-slate-900">{template.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{template.helper}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {CONTENT_SNIPPETS.map((snippet) => (
                <button
                  key={snippet.label}
                  type="button"
                  onClick={() => insertSnippet(snippet.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + {snippet.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Basic Details" description="Core blog identity, taxonomy, and publishing metadata.">
            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeTextToken(e.target.value);
                  if (normalized && normalized !== e.target.value) setField("title", normalized);
                }}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="Blog title"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
                required
              />
              <input
                value={form.slug}
                onChange={(e) => setField("slug", slugify(e.target.value))}
                placeholder="Custom slug (optional)"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <div className={`rounded-xl border px-3 py-2.5 ${duplicateSlugRow ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Final Slug</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{finalSlug || "-"}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${duplicateTitleRow ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Title Check</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {duplicateTitleRow ? "Similar title already exists" : "Looks unique"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Word Count</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{wordCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reading Time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{readingMinutes} min read</p>
              </div>
            </div>

            <textarea
              value={form.excerpt || ""}
              onChange={(e) => setField("excerpt", e.target.value)}
              placeholder="Short excerpt / summary"
              className="min-h-24 rounded-xl border border-slate-200 px-3 py-2.5"
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                value={form.featuredImage || ""}
                onChange={(e) => setField("featuredImage", e.target.value)}
                placeholder="Featured image URL"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploadingTarget === "featuredImage" ? "Uploading..." : "Upload Featured"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage(e.currentTarget.files?.[0] || null, "featuredImage")}
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={joinCsv(form.tags)}
                onChange={(e) => setField("tags", splitCsv(e.target.value))}
                onBlur={(e) => setField("tags", normalizeCsvArray(splitCsv(e.target.value)))}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="Tags (comma separated)"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
              <input
                value={joinCsv(form.categories)}
                onChange={(e) => setField("categories", splitCsv(e.target.value))}
                onBlur={(e) => setField("categories", normalizeCsvArray(splitCsv(e.target.value)))}
                list={helperSuggestions.length ? "suggest-helper" : undefined}
                placeholder="Categories (comma separated)"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>
          </Panel>

          <Panel title="Content Editor" description="Write clean HTML content with structure-aware guidance.">
            <textarea
              ref={contentRef}
              value={form.content || ""}
              onChange={(e) => setField("content", e.target.value)}
              placeholder="Write blog HTML content..."
              className="min-h-[520px] rounded-xl border border-slate-200 px-3 py-3 font-mono text-sm"
            />

            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Characters</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{(form.content || "").length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Plain Text Length</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{plainTextContent.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Heading Count</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{headings.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Content Quality</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {wordCount >= 900 ? "Excellent" : wordCount >= 500 ? "Strong" : wordCount >= 250 ? "Good" : "Needs more depth"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="SEO" description="Metadata, social previews, and discoverability controls.">
            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={form.seo?.metaTitle || ""}
                onChange={(e) => setSeoField("metaTitle", e.target.value)}
                placeholder="Meta title"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
              <input
                value={form.seo?.focusKeyword || ""}
                onChange={(e) => setSeoField("focusKeyword", e.target.value)}
                placeholder="Focus keyword"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>

            <textarea
              value={form.seo?.metaDescription || ""}
              onChange={(e) => setSeoField("metaDescription", e.target.value)}
              placeholder="Meta description"
              className="min-h-24 rounded-xl border border-slate-200 px-3 py-2.5"
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={form.seo?.canonicalUrl || ""}
                onChange={(e) => setSeoField("canonicalUrl", e.target.value)}
                placeholder="Canonical URL"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
              <input
                value={form.seo?.ogImage || ""}
                onChange={(e) => setSeoField("ogImage", e.target.value)}
                placeholder="OG image URL"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploadingTarget === "ogImage" ? "Uploading..." : "Upload OG Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage(e.currentTarget.files?.[0] || null, "ogImage")}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.seo?.noIndex)}
                  onChange={(e) => setSeoField("noIndex", e.target.checked)}
                />
                No index this page
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SEO Score</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{seoScore}/100</p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${metaTitleLength >= 40 && metaTitleLength <= 65 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Meta Title Length</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{metaTitleLength} chars</p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${metaDescriptionLength >= 120 && metaDescriptionLength <= 160 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Meta Description</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{metaDescriptionLength} chars</p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${excerptLength >= 90 && excerptLength <= 220 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Excerpt Length</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{excerptLength} chars</p>
              </div>
            </div>
          </Panel>

          <Panel title="Publishing Workflow" description="Editorial process, priority, ownership, and notes.">
            <div className="grid gap-3 lg:grid-cols-3">
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value as BlogPost["status"])}
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>

              <select
                value={form.workflow?.stage || "draft"}
                onChange={(e) => setWorkflowField("stage", e.target.value as NonNullable<BlogPost["workflow"]>["stage"])}
                className="rounded-xl border border-slate-200 px-3 py-2.5"
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
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={form.workflow?.assignee || ""}
                onChange={(e) => setWorkflowField("assignee", e.target.value)}
                placeholder="Assignee"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
              <input
                type="date"
                value={form.workflow?.dueDate || ""}
                onChange={(e) => setWorkflowField("dueDate", e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>

            <textarea
              value={form.workflow?.notes || ""}
              onChange={(e) => setWorkflowField("notes", e.target.value)}
              placeholder="Editorial notes, review comments, internal plan..."
              className="min-h-24 rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </Panel>

          {helperSuggestions.length ? (
            <datalist id="suggest-helper">
              {helperSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          ) : null}
        </div>

        {!focusMode ? (
          <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
            <Panel title="Live Preview" description="Reader, search result, and outline preview modes.">
              {previewMode === "reader" ? (
                <div className="space-y-3">
                  {form.featuredImage ? (
                    <img
                      src={form.featuredImage}
                      alt={form.title || "Preview"}
                      className="h-52 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                      Featured image preview
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={form.status} tone={form.status === "published" ? "success" : "warning"} />
                      <StatusBadge label={form.workflow?.stage || "draft"} tone="info" />
                      <StatusBadge label={form.workflow?.priority || "medium"} tone="neutral" />
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold text-slate-900">{form.title || "Untitled Post"}</h3>
                    <p className="mt-2 text-sm text-slate-600">{form.excerpt || "No excerpt yet."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(form.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 text-sm leading-6 text-slate-800">
                    {form.content ? (
                      <div dangerouslySetInnerHTML={{ __html: form.content }} />
                    ) : (
                      <p className="text-slate-500">Content preview will appear here.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {previewMode === "seo" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-emerald-700">
                      {form.seo?.canonicalUrl || `${window.location.origin}${publicUrl}`}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-blue-700">
                      {form.seo?.metaTitle || form.title || "Meta title preview"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {form.seo?.metaDescription || form.excerpt || "Meta description preview will appear here."}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Focus Keyword</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{form.seo?.focusKeyword || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Indexing</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {form.seo?.noIndex ? "No Index" : "Index Allowed"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Public Path</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-900">{publicUrl}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {previewMode === "outline" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Outline Map</p>
                    {headings.length ? (
                      <div className="mt-2 space-y-2">
                        {headings.map((heading, index) => (
                          <div
                            key={`${heading.text}-${index}`}
                            className={`rounded-lg px-3 py-2 text-sm ${heading.level === 2 ? "bg-white font-semibold text-slate-900" : "ml-4 bg-slate-100 text-slate-700"}`}
                          >
                            {heading.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No H2/H3 headings detected yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Workflow Snapshot</p>
                    <div className="mt-2 grid gap-2 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Status:</span> {form.status}</p>
                      <p><span className="font-semibold text-slate-900">Stage:</span> {form.workflow?.stage || "draft"}</p>
                      <p><span className="font-semibold text-slate-900">Priority:</span> {form.workflow?.priority || "medium"}</p>
                      <p><span className="font-semibold text-slate-900">Assignee:</span> {form.workflow?.assignee || "-"}</p>
                      <p><span className="font-semibold text-slate-900">Due Date:</span> {form.workflow?.dueDate || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel title="Publish Checklist" description="Checks that help the post feel complete and ready.">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Readiness</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{publishReadiness}%</p>
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${publishReadiness >= 80 ? "bg-emerald-500" : publishReadiness >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${publishReadiness}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-3 py-2.5 ${item.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {item.passed ? "✓" : "•"} {item.label}
                    </p>
                    {item.helper ? <p className="mt-1 text-xs text-slate-600">{item.helper}</p> : null}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Local Revisions" description="Recent manual snapshots stored in your browser.">
              {revisions.length ? (
                <div className="grid gap-2">
                  {revisions.map((revision) => (
                    <div key={revision.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{revision.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(revision.createdAt)}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => restoreRevision(revision)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRevision(revision.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No local revisions yet. Save a snapshot to keep a restore point.</p>
              )}
            </Panel>
          </aside>
        ) : null}
      </form>

      <Panel
        title="Blog Library"
        description="Search, filter, bulk manage, edit, duplicate, publish, and clean up existing blog posts."
        actions={
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Search blogs..."
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | BlogPost["status"])}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as "all" | NonNullable<BlogPost["workflow"]>["stage"])}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All stages</option>
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LibrarySort)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="updated-asc">Oldest updated</option>
              <option value="title-asc">Title A → Z</option>
              <option value="title-desc">Title Z → A</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              Toggle Select All
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <span className="text-sm font-semibold text-slate-700">{selectedRows.length} selected</span>
          <button
            type="button"
            onClick={() => runBulkAction("publish")}
            disabled={!selectedRows.length}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
          >
            Bulk Publish
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("draft")}
            disabled={!selectedRows.length}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-50"
          >
            Bulk Draft
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("delete")}
            disabled={!selectedRows.length}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
          >
            Bulk Delete
          </button>
        </div>

        <div className="grid gap-3">
          {filteredRows.map((row) => {
            const rowId = row.id || row.slug;
            const isSelected = row.id ? selectedIds.includes(row.id) : false;

            return (
              <article
                key={rowId}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <div className="pt-1">
                  {row.id ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(row.id!)}
                      className="h-4 w-4"
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-extrabold text-slate-900">{row.title}</p>
                    <StatusBadge
                      label={row.status}
                      tone={row.status === "published" ? "success" : "warning"}
                    />
                    <StatusBadge label={row.workflow?.stage || "draft"} tone="info" />
                    <StatusBadge label={row.workflow?.priority || "medium"} tone="neutral" />
                  </div>

                  <p className="text-sm text-slate-600">{row.excerpt || "No excerpt available."}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Slug: {row.slug}</span>
                    <span>Updated: {formatDateTime(row.updatedAt)}</span>
                    <span>Created: {formatDateTime(row.createdAt)}</span>
                    <span>Autosaved: {formatDateTime(row.workflow?.lastAutoSavedAt)}</span>
                  </div>

                  {(row.tags || []).length || (row.categories || []).length ? (
                    <div className="flex flex-wrap gap-2">
                      {(row.tags || []).slice(0, 4).map((tag) => (
                        <span
                          key={`tag-${rowId}-${tag}`}
                          className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          #{tag}
                        </span>
                      ))}
                      {(row.categories || []).slice(0, 3).map((category) => (
                        <span
                          key={`category-${rowId}-${category}`}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:w-[170px] lg:flex-col lg:justify-center">
                  <button
                    type="button"
                    onClick={() => editRow(row)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateRow(row)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => quickToggleRowStatus(row)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${row.status === "published" ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                  >
                    {row.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`/blog/${row.slug}`, "_blank", "noopener,noreferrer")}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    View Live
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlog(row.id)}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}

          {filteredRows.length === 0 ? (
            <p className="text-sm text-slate-500">No blogs matched the current search and filters.</p>
          ) : null}
        </div>
      </Panel>
    </main>
  );
}
