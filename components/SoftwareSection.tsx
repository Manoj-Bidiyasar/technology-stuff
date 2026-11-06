import type { ProductSoftware } from "@/lib/types/content";

type SoftwareSectionProps = {
  software?: ProductSoftware;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatOS(os?: ProductSoftware["os"]): string {
  const nameRaw = cleanValue(os?.name);
  const version = cleanValue(os?.version);
  const name = nameRaw.toLowerCase() === "ios" ? "iOS" : nameRaw.toLowerCase() === "android" ? "Android" : nameRaw;
  if (name && version) return `${name} ${version}`;
  return name || version || "-";
}

function formatYears(value?: number): string {
  if (!value || value <= 0) return "-";
  return `${value} Years`;
}

function row(label: string, value: string) {
  if (!value.trim() || value.trim() === "-") return null;
  return (
    <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
      <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
      <p className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</p>
    </div>
  );
}

export default function SoftwareSection({ software }: SoftwareSectionProps) {
  const osVersion = formatOS(software?.os);
  const osName = cleanValue(software?.os?.name).toLowerCase();
  const osVersionLabel = osName === "ios" ? "iOS Version" : osName === "android" ? "Android Version" : "";
  const customUI = cleanValue(software?.ui) || "-";
  const majorUpdates = formatYears(software?.updates?.os);
  const securityUpdates = formatYears(software?.updates?.security);
  return (
    <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {osVersionLabel ? row(osVersionLabel, osVersion) : null}
      {row("Custom UI", customUI)}
      {row("Major OS Updates", majorUpdates)}
      {row("Security Updates", securityUpdates)}
    </div>
  );
}

