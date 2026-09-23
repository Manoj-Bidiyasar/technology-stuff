import type { ReactNode } from "react";
import type { ProductDesign } from "@/lib/types/content";

type DesignSectionProps = {
  design?: ProductDesign;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function isFoldableDesign(design?: ProductDesign): boolean {
  const factor = cleanValue(design?.formFactor);
  return factor === "flip_fold" || factor === "book_fold" || factor === "tri_fold";
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

function formatVariantDimensions(design?: ProductDesign): string {
  const normalVariants = Array.isArray(design?.normalDimensionVariants) ? design.normalDimensionVariants : [];
  const dimensions = normalVariants
    .map((variant) => {
      const dimension = formatSingleDimension(variant);
      return { dimension, color: cleanValue(variant.color) };
    })
    .filter((variant) => Boolean(variant.dimension));
  if (dimensions.length > 0) {
    const unique = Array.from(new Set(dimensions.map((variant) => variant.dimension)));
    if (unique.length === 1) return unique[0];
    return dimensions.map((variant) => variant.color ? `${variant.color}: ${variant.dimension}` : variant.dimension).join(" | ");
  }

  const postureVariants = Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : [];
  const grouped = new Map<string, string[]>();
  postureVariants.forEach((variant) => {
    const dimension = formatSingleDimension(variant);
    if (!dimension) return;
    const posture = cleanValue(variant.posture) || "Normal";
    const color = cleanValue(variant.color);
    const entries = grouped.get(posture) || [];
    entries.push(color ? `${color}: ${dimension}` : dimension);
    grouped.set(posture, entries);
  });
  return Array.from(grouped.entries())
    .map(([posture, values]) => `${posture.replace(/_/g, " ")}: ${values.join(" | ")}`)
    .join(" | ");
}

function formatVariantWeight(design?: ProductDesign): string {
  const normalVariants = isFoldableDesign(design) ? [] : (Array.isArray(design?.normalDimensionVariants) ? design.normalDimensionVariants : []);
  const normalWeights = normalVariants
    .filter((variant) => Number.isFinite(variant.weight) && Boolean(variant.weight) && (variant.weight || 0) > 0);
  if (normalWeights.length > 0) {
    const unique = Array.from(new Set(normalWeights.map((variant) => variant.weight)));
    if (unique.length === 1) return `${unique[0]} g`;
    return normalWeights.map((variant) => {
      const color = cleanValue(variant.color);
      return color ? `${variant.weight} g (${color})` : `${variant.weight} g`;
    }).join(", ");
  }

  const byColor = new Map<string, number>();
  (Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : []).forEach((variant) => {
    if (!Number.isFinite(variant.weight) || !variant.weight || variant.weight <= 0) return;
    const colors = cleanValue(variant.color).split(",").map((item) => item.trim()).filter(Boolean);
    colors.forEach((color) => {
      const key = color.toLowerCase();
      if (!byColor.has(key)) byColor.set(key, variant.weight as number);
    });
  });
  const values = Array.from(byColor.entries());
  if (values.length === 0) return "-";
  const unique = Array.from(new Set(values.map(([, weight]) => weight)));
  if (unique.length === 1) return `${unique[0]} g`;
  return values.map(([color, weight]) => `${weight} g (${color})`).join(", ");
}

function postureLabel(posture: string): string {
  return posture.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function postureDimensionNode(design?: ProductDesign): ReactNode | null {
  const factor = cleanValue(design?.formFactor);
  const postures = factor === "tri_fold" ? ["folded", "half_open", "open"] : ["folded", "open"];
  const isFoldable = factor === "flip_fold" || factor === "book_fold" || factor === "tri_fold";
  if (!isFoldable) return null;
  const variants = Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : [];
  const rows = postures.map((posture) => {
    const base = design?.dimensionsByPosture?.[posture];
    const variantDimensions = variants.map((item) => cleanValue(item.posture).toLowerCase() === posture ? formatSingleDimension(item) : "").filter(Boolean);
    const dimension = formatSingleDimension(base) || Array.from(new Set(variantDimensions)).join(" / ") || "-";
    return { posture, dimension };
  }).filter((row) => row.dimension !== "-");
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      {rows.map((row) => (
        <p key={row.posture}>
          <span className="font-bold text-slate-700">{postureLabel(row.posture)}:</span>{" "}
          <span>{row.dimension}</span>
        </p>
      ))}
    </div>
  );
}

function formatVariantColors(design?: ProductDesign): string {
  const values = (isFoldableDesign(design)
    ? (Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : [])
    : (Array.isArray(design?.normalDimensionVariants) ? design.normalDimensionVariants : [])
  )
    .map((variant) => cleanValue(variant.color))
    .filter(Boolean);
  return Array.from(new Set(values)).join(", ") || "-";
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

function row(label: ReactNode, value: ReactNode) {
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
  const dimensions = formatVariantDimensions(design);
  const postureDimensions = postureDimensionNode(design);
  const foldable = isFoldableDesign(design);
  const weight = formatVariantWeight(design);
  const colors = formatVariantColors(design);
  const designType = cleanValue(design?.designType) || "-";
  const build = formatBuild(design?.build);
  const ipRating = formatList(design?.ipRating, ", ") || "-";
  const audioJack = formatAudioJack(design?.audioJack);
  const otherFeatures = formatList(design?.otherFeatures) || "-";

  const dimensionsNode = postureDimensions || (foldable ? "-" : dimensions || "-");

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row(<><span>Dimensions</span><span className="block text-[10px] font-medium normal-case tracking-normal">(H × W × T)</span></>, dimensionsNode)}
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

