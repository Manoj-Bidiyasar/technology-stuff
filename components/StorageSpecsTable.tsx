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

function getVariantDisplay(variants: MemoryVariant[]): string {
  if (!variants || variants.length === 0) return "";

  const values = variants
    .map((variant) => {
      const ram = variant.ram || "";
      const storage = variant.storage || "";
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
  if (variants.length > 0) return variants;

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
  const virtualRamDisplay = maxVirtualRam > 0 ? `Up to ${maxVirtualRam}GB` : "";

  const expandable = safeMemory.expandableStorage?.supported;
  const expandableStorage = expandable
    ? `Yes${safeMemory.expandableStorage?.max ? ` (up to ${safeMemory.expandableStorage.max})` : ""}`
    : "No";

  const cardSlot = expandable ? (safeMemory.expandableStorage?.types || []).join(", ") : "";

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

