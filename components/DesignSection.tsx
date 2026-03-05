import type { ReactNode } from "react";
import type { ProductDesign } from "@/lib/types/content";

type DesignSectionProps = {
  design?: ProductDesign;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatList(list?: string[], separator = ", "): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
}

function formatDepth(depth?: number | number[]): string {
  if (depth === undefined || depth === null) return "";
  if (Array.isArray(depth)) {
    const values = depth.filter((item) => Number.isFinite(item));
    if (values.length === 0) return "";
    if (values.length === 1) return String(values[0]);
    return `${Math.min(...values)}-${Math.max(...values)}`;
  }
  return Number.isFinite(depth) ? String(depth) : "";
}

function formatSingleDimension(d?: { height?: number; width?: number; depth?: number | number[] }): string {
  if (!d) return "";
  const h = Number.isFinite(d.height as number) ? String(d.height) : "";
  const w = Number.isFinite(d.width as number) ? String(d.width) : "";
  const dep = formatDepth(d.depth);
  if (!h || !w || !dep) return "";
  return `${h} x ${w} x ${dep} mm`;
}

function formatDimensions(design?: ProductDesign): string | { folded: string; unfolded: string } {
  const type = cleanValue(design?.type);
  if (type === "foldable") {
    return {
      folded: formatSingleDimension(design?.dimensions?.folded),
      unfolded: formatSingleDimension(design?.dimensions?.unfolded),
    };
  }
  return formatSingleDimension(design?.dimensions?.normal);
}

function formatWeight(weightArray?: ProductDesign["weight"]): string {
  if (!Array.isArray(weightArray) || weightArray.length === 0) return "-";
  const value = weightArray
    .map((item) => {
      const grams = Number(item?.value || 0);
      if (!Number.isFinite(grams) || grams <= 0) return "";
      const color = cleanValue(item?.color);
      return color ? `${grams} g (${color})` : `${grams} g`;
    })
    .filter(Boolean)
    .join(", ");
  return value || "-";
}

function formatBuild(build?: ProductDesign["build"]): string {
  if (!build) return "-";
  const backMaterial = cleanValue(build?.back?.material);
  const backProtection = cleanValue(build?.back?.protection);
  const frame = cleanValue(build?.frame);

  const back = backMaterial
    ? `${backMaterial} Back${backProtection ? ` (${backProtection})` : ""}`
    : "";
  const frameText = frame ? `${frame} Frame` : "";
  const value = [back, frameText].filter(Boolean).join(", ");
  return value || "-";
}

function formatAudioJack(audioJack?: ProductDesign["audioJack"]): string {
  if (!audioJack) return "-";
  if (audioJack.available) return "Yes";
  const type = cleanValue(audioJack.type);
  return type ? `No (${type})` : "No";
}

function row(label: string, value: ReactNode) {
  const isDashValue = typeof value === "string" && value.trim() === "-";
  return (
    <div className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-500">-</p>
      <div className="text-sm font-semibold text-slate-900">{isDashValue ? "NA" : value}</div>
    </div>
  );
}

export default function DesignSection({ design }: DesignSectionProps) {
  const dimensions = formatDimensions(design);
  const weight = formatWeight(design?.weight);
  const colors = formatList(design?.colors) || "-";
  const designType = cleanValue(design?.designType) || "-";
  const build = formatBuild(design?.build);
  const ipRating = formatList(design?.ipRating, ", ") || "-";
  const audioJack = formatAudioJack(design?.audioJack);
  const otherFeatures = formatList(design?.otherFeatures) || "-";

  const dimensionsNode =
    typeof dimensions === "object"
      ? (dimensions.folded || dimensions.unfolded) ? (
          <div className="space-y-1">
            <p><span className="font-bold">Folded</span>: {dimensions.folded || "NA"}</p>
            <p><span className="font-bold">Unfolded</span>: {dimensions.unfolded || "NA"}</p>
          </div>
        ) : "NA"
      : dimensions || "-";

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Dimensions", dimensionsNode)}
      {row("Weight", weight)}
      {row("Colors", colors)}
      {row("Design", designType)}
      {row("Build", build)}
      {row("IP Rating", ipRating)}
      {row("Audio Jack (3.5mm)", audioJack)}
      {row("Other Features", otherFeatures)}
    </div>
  );
}

