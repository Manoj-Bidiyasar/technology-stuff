"use client";

export type CompareSelectionItem = {
  slug: string;
  name: string;
  image?: string;
  price?: number;
};

const COMPARE_SELECTION_KEY = "ts.compare.selection.v1";
const COMPARE_SELECTION_EVENT = "ts-compare-selection-updated";
const MAX_COMPARE_ITEMS = 3;

function keyFor(namespace = "smartphone"): string {
  return `${COMPARE_SELECTION_KEY}.${namespace}`;
}

function eventFor(namespace = "smartphone"): string {
  return `${COMPARE_SELECTION_EVENT}.${namespace}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sanitize(items: CompareSelectionItem[]): CompareSelectionItem[] {
  const seen = new Set<string>();
  const cleaned: CompareSelectionItem[] = [];
  for (const item of items) {
    const slug = String(item?.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    cleaned.push({
      slug,
      name: String(item?.name || slug).trim(),
      image: typeof item?.image === "string" ? item.image : undefined,
      price: typeof item?.price === "number" && Number.isFinite(item.price) ? item.price : undefined,
    });
    if (cleaned.length >= MAX_COMPARE_ITEMS) break;
  }
  return cleaned;
}

export function getCompareSelection(namespace = "smartphone"): CompareSelectionItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(namespace));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareSelectionItem[];
    if (!Array.isArray(parsed)) return [];
    return sanitize(parsed);
  } catch {
    return [];
  }
}

export function setCompareSelection(items: CompareSelectionItem[], namespace = "smartphone"): CompareSelectionItem[] {
  const next = sanitize(items);
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(keyFor(namespace), JSON.stringify(next));
    window.dispatchEvent(new Event(eventFor(namespace)));
  } catch {
    return next;
  }
  return next;
}

export function addToCompareSelection(item: CompareSelectionItem, namespace = "smartphone"): CompareSelectionItem[] {
  const current = getCompareSelection(namespace);
  const exists = current.some((entry) => entry.slug === item.slug);
  if (exists) return current;
  return setCompareSelection([...current, item], namespace);
}

export function removeFromCompareSelection(slug: string, namespace = "smartphone"): CompareSelectionItem[] {
  return setCompareSelection(getCompareSelection(namespace).filter((item) => item.slug !== slug), namespace);
}

export function clearCompareSelection(namespace = "smartphone"): CompareSelectionItem[] {
  return setCompareSelection([], namespace);
}

export function isInCompareSelection(slug: string, namespace = "smartphone"): boolean {
  return getCompareSelection(namespace).some((item) => item.slug === slug);
}

export function getCompareSelectionEventName(namespace = "smartphone"): string {
  return eventFor(namespace);
}
