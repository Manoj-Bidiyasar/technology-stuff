import type { ProductGeneral } from "@/lib/types/content";


type GeneralSectionProps = {
  general?: ProductGeneral;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined"
    ? text.replace(/\bs[\s-]*pen\b/gi, "S Pen")
    : "";
}

function formatDate(value?: string): string {
  const raw = cleanValue(value);
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatList(list?: string[], separator = ", "): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const value = list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
  return value || "-";
}

function formatMultimedia(general?: ProductGeneral): string {
  const items = (general?.multimedia || []).map((item) => cleanValue(item)).filter(Boolean);
  const hiResItems = items.filter((item) => item.toLowerCase().startsWith("hi-res audio"));
  const hasHiRes = hiResItems.length > 0 || general?.multimediaDetails?.hiResAudio === true;
  const wired = general?.multimediaDetails?.hiResAudioWired === true || hiResItems.some((item) => /wired|both/i.test(item));
  const wireless = general?.multimediaDetails?.hiResAudioWireless === true || hiResItems.some((item) => /wireless|both/i.test(item));
  const certification = hasHiRes
    ? `Hi-Res Audio Certification${wired && wireless ? " (wired + wireless)" : wired ? " (wired)" : wireless ? " (wireless)" : ""}`
    : "";
  const features = items.filter((item) => !item.toLowerCase().startsWith("hi-res audio"));
  if (certification) features.push(certification);
  return features.join(", ") || "-";
}

function row(label: string, value: string) {
  if (!value.trim() || value.trim() === "-") return null;
  return (
    <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
      <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
      <p className="relative -left-1 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</p>
    </div>
  );
}

export default function GeneralSection({ general }: GeneralSectionProps) {
  const launchDate = formatDate(general?.launchDate);
  const announceDate = formatDate(general?.announceDate);
  const modelNumber = cleanValue(general?.modelNumber) || "-";
  const packageContents = formatList(general?.packageContents, ", ");
  const multimedia = formatMultimedia(general);

  return (
    <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {row("Launch Date", launchDate)}
      {row("Announce Date", announceDate)}
      {row("Model Number", modelNumber)}
      {row("In The Box", packageContents)}
      {row("Multimedia", multimedia)}
    </div>
  );
}

