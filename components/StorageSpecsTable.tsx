import type { MemoryStorage, MemoryVariant } from "@/lib/types/content";

import type { ProductGeneral } from "@/lib/types/content";
import { formatMemoryCapacity } from "@/lib/utils/display";

type StorageSpecsTableProps = {
  memoryStorage?: MemoryStorage;
  variants?: MemoryVariant[];
  general?: ProductGeneral;
};

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatStorageLimit(value: unknown): string {
  const raw = cleanValue(value);
  if (!raw) return "";
  const normalized = raw.replace(/\s+/g, "").toUpperCase();
  const numeric = toNumber(raw);

  if (normalized.endsWith("TB")) return raw.replace(/\bup to\b/i, "Up to");
  if (normalized.endsWith("GB") && numeric && numeric >= 1024) {
    const tb = numeric / 1024;
    return `${Number.isInteger(tb) ? tb.toFixed(0) : tb.toFixed(1).replace(/\.0$/, "")}TB`;
  }
  if (/^\d+(\.\d+)?$/.test(normalized) && numeric && numeric >= 1024) {
    const tb = numeric / 1024;
    return `${Number.isInteger(tb) ? tb.toFixed(0) : tb.toFixed(1).replace(/\.0$/, "")}TB`;
  }
  if (/^\d+(\.\d+)?$/.test(normalized) && numeric) return `${numeric}GB`;
  return raw.replace(/\bup to\b/i, "Up to");
}

function formatVirtualRamDisplay(value: unknown): string {
  const raw = cleanValue(value);
  if (!raw) return "";
  if (/up to/i.test(raw)) return raw.replace(/\bup to\b/i, "Up to");
  const normalized = raw.replace(/\s+/g, "").toUpperCase();
  if (normalized.endsWith("GB")) return `Up to ${normalized}`;
  const numeric = toNumber(raw);
  return numeric ? `Up to ${numeric}GB` : raw;
}

function getVariantDisplay(variants: MemoryVariant[]): string {
  if (!variants || variants.length === 0) return "";

  const values = variants
    .map((variant) => {
      const ram = variant.ram || "";
      const rawStorage = variant.storage || "";
      const storageAmount = toNumber(rawStorage);
      const storage = storageAmount !== null && /gb\s*$/i.test(rawStorage) && storageAmount >= 1024
        ? `${Number.isInteger(storageAmount / 1024) ? storageAmount / 1024 : Number((storageAmount / 1024).toFixed(1))}TB`
        : rawStorage;
      if (!ram && !storage) return "";
      if (!ram) return storage;
      if (!storage) return ram;
      return `${ram} + ${storage}`;
    })
    .filter(Boolean);

  return values.join(" • ");
}

function formatTypeCapacities(
  variants: MemoryVariant[],
  typeKey: "ramType" | "storageType",
  capacityKey: "ram" | "storage",
  onlyMax: boolean
): string {
  const entries = variants.flatMap((variant) => {
    const type = String(variant[typeKey] || "").trim().replace(/\s*\+\s*/g, " + ");
    if (!type) return [];
    const rawCapacity = String(variant[capacityKey] || "").trim();
    const capacity = formatMemoryCapacity(rawCapacity);
    const numeric = toNumber(rawCapacity);
    const amount = numeric === null ? 0 : /tb/i.test(rawCapacity) ? numeric * 1024 : numeric;
    return [{ type, capacity, amount }];
  });
  if (entries.length === 0) return "";

  const maxAmount = onlyMax ? Math.max(...entries.map((entry) => entry.amount)) : 0;
  const groups = new Map<string, { type: string; capacities: string[] }>();
  entries.forEach(({ type, capacity, amount }) => {
    if (onlyMax && amount < maxAmount) return;
    const key = type.toLocaleLowerCase();
    const group = groups.get(key) || { type, capacities: [] };
    if (capacity && !group.capacities.some((item) => item.toLocaleLowerCase() === capacity.toLocaleLowerCase())) group.capacities.push(capacity);
    groups.set(key, group);
  });

  return Array.from(groups.values()).map(({ type, capacities }) => {
    if (onlyMax) return type;
    return capacities.length ? `${type} (${capacities.join(", ")})` : type;
  }).join(", ");
}

function getMaxValue(values: string[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const nums = values
    .map((value) => toNumber(value))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (nums.length === 0) return 0;
  return Math.max(...nums);
}

function normalizeVariants(memoryStorage: MemoryStorage, variants: MemoryVariant[]): MemoryVariant[] {
  if (variants.length > 0) {
    return variants.map((variant) => ({
      ...variant,
      ramType: variant.ramType || memoryStorage.ramType?.[0] || "",
      storageType: variant.storageType || memoryStorage.storageType?.[0] || "",
      virtualRam: variant.virtualRam || memoryStorage.virtualRam?.[0] || "",
    }));
  }

  const ram = memoryStorage.ram || [];
  const ramType = memoryStorage.ramType || [];
  const storage = memoryStorage.internalStorage || [];
  const storageType = memoryStorage.storageType || [];
  const virtualRam = memoryStorage.virtualRam || [];

  const count = Math.max(ram.length, storage.length, ramType.length, storageType.length, virtualRam.length);
  if (count === 0) return [];

  return Array.from({ length: count }).map((_, index) => ({
    ram: ram[index] || ram[0] || "",
    ramType: ramType[index] || ramType[0] || "",
    storage: storage[index] || storage[0] || "",
    storageType: storageType[index] || storageType[0] || "",
    virtualRam: virtualRam[index] || virtualRam[0] || "",
  }));
}

export default function StorageSpecsTable({ memoryStorage, variants, general }: StorageSpecsTableProps) {
  const safeMemory = memoryStorage || {};
  const safeVariants = normalizeVariants(safeMemory, Array.isArray(variants) ? variants : []);

  const ramAndStorage = getVariantDisplay(safeVariants);
  const productVariants = (general?.variants || [])
    .map((variant) => [formatMemoryCapacity(cleanValue(variant.ram)), formatMemoryCapacity(cleanValue(variant.storage))].filter(Boolean).join(" + "))
    .filter(Boolean)
    .join(" • ");
  const variantDisplay = productVariants || ramAndStorage;
  const onlyMaxTypes = safeMemory.showOnlyMaxRamStorageTypes !== false;
  const ramType = formatTypeCapacities(safeVariants, "ramType", "ram", onlyMaxTypes);
  const storageType = formatTypeCapacities(safeVariants, "storageType", "storage", onlyMaxTypes);

  const vramValues = safeVariants.map((variant) => variant.virtualRam || "").filter(Boolean);
  const maxVirtualRam = getMaxValue(vramValues);
  const virtualRamDisplay = cleanValue(safeMemory.virtualRamMax)
    ? formatVirtualRamDisplay(safeMemory.virtualRamMax)
    : maxVirtualRam > 0
      ? `Up to ${maxVirtualRam}GB`
      : "";

  const expandable = safeMemory.expandableStorage?.supported;
  const expandableLimit = formatStorageLimit(safeMemory.expandableStorage?.max);
  const expandableStorage = expandable
    ? `Yes${expandableLimit ? ` (${/^up to\b/i.test(expandableLimit) ? expandableLimit : `Up to ${expandableLimit}`})` : ""}`
    : "No";

  const slotType = cleanValue(safeMemory.expandableStorage?.slotType).replace(/^\w/, (letter) => letter.toUpperCase());
  const cardTypes = (safeMemory.expandableStorage?.types || []).map((item) => cleanValue(item)).filter(Boolean);
  const cardSlot = expandable
    ? `${[slotType, cardTypes.join(" / ")].filter(Boolean).join(" ")} Card Slot`.trim()
    : "";

  const rows: Array<[string, string]> = [
    ["Variants", variantDisplay],
    ["RAM Type", ramType],
    ["Storage Type", storageType],
    ["Virtual RAM (VRAM)", virtualRamDisplay],
    ["Expandable Storage", expandableStorage],
    ...(expandable ? [["Card Slot", cardSlot] as [string, string]] : []),
    ["Other Features", (safeMemory.features || []).join(", ")],
  ];

  return (
    <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {rows.filter(([, value]) => Boolean(String(value || "").trim()) && String(value).trim() !== "-").map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5"
        >
          <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
          <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
          <p className="relative -left-1 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}

