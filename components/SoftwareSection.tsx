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

function formatOSAndUI(software?: ProductSoftware): string {
  const os = formatOS(software?.os);
  const ui = cleanValue(software?.ui);
  if (os !== "-" && ui) return `${os}, ${ui}`;
  return os;
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

export default function SoftwareSection({ software }: SoftwareSectionProps) {
  const osAndUI = formatOSAndUI(software);
  const osUpdates = formatYears(software?.updates?.os);
  const securityUpdates = formatYears(software?.updates?.security);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Operating System", osAndUI)}
      {row("OS Updates", osUpdates)}
      {row("Security Updates", securityUpdates)}
    </div>
  );
}

