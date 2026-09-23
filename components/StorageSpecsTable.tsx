import type { MemoryStorage, MemoryVariant } from "@/lib/types/content";

type StorageSpecsTableProps = {
  memoryStorage?: MemoryStorage;
  variants?: MemoryVariant[];
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

  if (normalized.endsWith("TB")) return raw.toUpperCase();
  if (normalized.endsWith("GB") && numeric && numeric >= 1024) {
    const tb = numeric / 1024;
    return `${Number.isInteger(tb) ? tb.toFixed(0) : tb.toFixed(1).replace(/\.0$/, "")}TB`;
  }
  if (/^\d+(\.\d+)?$/.test(normalized) && numeric && numeric >= 1024) {
    const tb = numeric / 1024;
    return `${Number.isInteger(tb) ? tb.toFixed(0) : tb.toFixed(1).replace(/\.0$/, "")}TB`;
  }
  if (/^\d+(\.\d+)?$/.test(normalized) && numeric) return `${numeric}GB`;
  return raw.toUpperCase();
}

function formatVirtualRamDisplay(value: unknown): string {
  const raw = cleanValue(value);
  if (!raw) return "";
  if (/up to/i.test(raw)) return raw;
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

function getMappedValue(
  variants: MemoryVariant[],
  valueKey: keyof MemoryVariant,
  attachKey: keyof MemoryVariant
): string {
  if (!variants || variants.length === 0) return "";

  const values = variants.map((variant) => String(variant[valueKey] || "").trim()).filter(Boolean);
  const unique = Array.from(new Set(values));
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];

  return variants
    .map((variant) => {
      const value = String(variant[valueKey] || "").trim();
      const attach = String(variant[attachKey] || "").trim();
      if (!value) return "";
      return attach ? `${value} (${attach})` : value;
    })
    .filter(Boolean)
    .join(", ");
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

export default function StorageSpecsTable({ memoryStorage, variants }: StorageSpecsTableProps) {
  const safeMemory = memoryStorage || {};
  const safeVariants = normalizeVariants(safeMemory, Array.isArray(variants) ? variants : []);

  const ramAndStorage = getVariantDisplay(safeVariants);
  const ramType = getMappedValue(safeVariants, "ramType", "ram");
  const storageType = getMappedValue(safeVariants, "storageType", "storage");

  const vramValues = safeVariants.map((variant) => variant.virtualRam || "").filter(Boolean);
  const maxVirtualRam = getMaxValue(vramValues);
  const virtualRamDisplay = cleanValue(safeMemory.virtualRamMax)
    ? formatVirtualRamDisplay(safeMemory.virtualRamMax)
    : maxVirtualRam > 0
      ? `Up to ${maxVirtualRam}GB`
      : "";

  const expandable = safeMemory.expandableStorage?.supported;
  const expandableStorage = expandable
    ? `Yes${safeMemory.expandableStorage?.max ? ` (up to ${formatStorageLimit(safeMemory.expandableStorage.max)})` : ""}`
    : "No";

  const cardSlot = expandable
    ? [cleanValue(safeMemory.expandableStorage?.slotType), ...(safeMemory.expandableStorage?.types || []).map((item) => cleanValue(item)).filter(Boolean)]
        .filter(Boolean)
        .join(", ")
    : "";

  const rows: Array<[string, string]> = [
    ["RAM & Storage", ramAndStorage],
    ["RAM Type", ramType],
    ["Storage Type", storageType],
    ["Virtual RAM (VRAM)", virtualRamDisplay],
    ["Expandable Storage", expandableStorage],
    ...(expandable ? [["Card Slot", cardSlot] as [string, string]] : []),
    ["Other Features", (safeMemory.features || []).join(", ")],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[180px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-sm font-semibold text-slate-500">-</p>
          <p className="text-sm font-semibold text-slate-900">{value || "NA"}</p>
        </div>
      ))}
    </div>
  );
}

