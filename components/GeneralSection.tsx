import type { ProductGeneral, ProductSpecs } from "@/lib/types/content";

import { formatMemoryCapacity } from "@/lib/utils/display";

type GeneralSectionProps = {
  general?: ProductGeneral;
  specs?: ProductSpecs;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatDate(value?: string): string {
  const raw = cleanValue(value);
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatList(list?: string[], separator = ", "): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const value = list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
  return value || "-";
}

function formatPrice(value?: number): string {
  if (!value || value <= 0) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function variantAmount(value: unknown): number {
  const text = String(value ?? "").trim();
  const parsed = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return Number.MAX_SAFE_INTEGER;
  return /\btb\b/i.test(text) ? parsed * 1024 : parsed;
}

function formatVariants(general?: ProductGeneral, specs?: ProductSpecs): string {
  if (Array.isArray(general?.variants) && general.variants.length > 0) {
    const items = general.variants
      .map((variant, index) => ({ variant, index }))
      .sort((left, right) => {
        const ramDifference = variantAmount(left.variant.ram) - variantAmount(right.variant.ram);
        if (ramDifference !== 0) return ramDifference;
        const storageDifference = variantAmount(left.variant.storage) - variantAmount(right.variant.storage);
        return storageDifference !== 0 ? storageDifference : left.index - right.index;
      })
      .map(({ variant }) => variant)
      .map((variant) => {
        const ram = formatMemoryCapacity(cleanValue(variant.ram));
        const storage = formatMemoryCapacity(cleanValue(variant.storage));
        const base = [ram, storage].filter(Boolean).join(" + ");
        const launch = formatPrice(variant.launchPrice);
        if (base && launch) return `${base} - ${launch}`;
        return base || launch;
      })
      .filter(Boolean);
    return items.length > 0 ? items.join(" | ") : "-";
  }

  const fallback = [formatMemoryCapacity(cleanValue(specs?.ram)), formatMemoryCapacity(cleanValue(specs?.storage))].filter(Boolean).join(" + ");
  return fallback || "-";
}

function row(label: string, value: string) {
  const isDashValue = value.trim() === "-";
  return (
    <div className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-500">-</p>
      <p className="text-sm font-semibold text-slate-900">{isDashValue ? "NA" : value}</p>
    </div>
  );
}

export default function GeneralSection({ general, specs }: GeneralSectionProps) {
  const launchDate = formatDate(general?.launchDate);
  const announceDate = formatDate(general?.announceDate);
  const modelNumber = cleanValue(general?.modelNumber) || "-";
  const packageContents = formatList(general?.packageContents, ", ");
  const variants = formatVariants(general, specs);
  const multimedia = formatList(general?.multimedia, ", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Launch Date", launchDate)}
      {row("Announce Date", announceDate)}
      {row("Model Number", modelNumber)}
      {row("Package Contents", packageContents)}
      {row("Variants", variants)}
      {row("Multimedia", multimedia)}
    </div>
  );
}

