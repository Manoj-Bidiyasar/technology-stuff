import type { ReactNode } from "react";
import type { ProductDesign } from "@/lib/types/content";

type DesignSectionProps = {
  design?: ProductDesign;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined"
    ? text.replace(/\bs[\s-]*pen\b/gi, "S Pen")
    : "";
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

function formatVariantDimensions(design?: ProductDesign): ReactNode {
  const normalVariants = Array.isArray(design?.normalDimensionVariants) ? design.normalDimensionVariants : [];
  const dimensions = normalVariants
    .map((variant) => ({ dimension: formatSingleDimension(variant), color: cleanValue(variant.color) }))
    .filter((variant) => Boolean(variant.dimension));
  if (dimensions.length > 0) {
    const unique = Array.from(new Set(dimensions.map((variant) => variant.dimension)));
    if (unique.length === 1) return unique[0];
    return (
      <div className="grid gap-1">
        {dimensions.map((variant, index) => (
          <p key={`dimension-${variant.color}-${index}`}>
            {variant.color ? <><span className="font-bold text-slate-700">{variant.color}:</span>{" "}</> : null}
            {variant.dimension}
          </p>
        ))}
      </div>
    );
  }

  const postureVariants = Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : [];
  const grouped = new Map<string, Array<{ color: string; dimension: string }>>();
  postureVariants.forEach((variant) => {
    const dimension = formatSingleDimension(variant);
    if (!dimension) return;
    const posture = cleanValue(variant.posture) || "Normal";
    const entries = grouped.get(posture) || [];
    entries.push({ color: cleanValue(variant.color), dimension });
    grouped.set(posture, entries);
  });
  if (!grouped.size) return "";
  return (
    <div className="grid gap-1.5">
      {Array.from(grouped.entries()).map(([posture, variants]) => (
        <div key={posture}>
          <p className="font-bold text-slate-700">{posture.replace(/_/g, " ")}:</p>
          {variants.map((variant, index) => (
            <p key={`${posture}-${variant.color}-${index}`}>
              {variant.color ? <><span className="font-bold text-slate-700">{variant.color}:</span>{" "}</> : null}
              {variant.dimension}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function formatVariantWeight(design?: ProductDesign): ReactNode {
  const normalVariants = isFoldableDesign(design) ? [] : (Array.isArray(design?.normalDimensionVariants) ? design.normalDimensionVariants : []);
  const normalWeights = normalVariants
    .filter((variant) => Number.isFinite(variant.weight) && Boolean(variant.weight) && (variant.weight || 0) > 0);
  if (normalWeights.length > 0) {
    const unique = Array.from(new Set(normalWeights.map((variant) => variant.weight)));
    if (unique.length === 1) return `${unique[0]} g`;
    return (
      <div className="grid gap-1">
        {normalWeights.map((variant, index) => {
          const color = cleanValue(variant.color);
          return <p key={`weight-${color}-${index}`}>{color ? <><span className="font-bold text-slate-700">{color}:</span>{" "}</> : null}{variant.weight} g</p>;
        })}
      </div>
    );
  }

  const byColor = new Map<string, { color: string; weight: number }>();
  (Array.isArray(design?.postureDimensionVariants) ? design.postureDimensionVariants : []).forEach((variant) => {
    if (!Number.isFinite(variant.weight) || !variant.weight || variant.weight <= 0) return;
    const colors = cleanValue(variant.color).split(",").map((item) => item.trim()).filter(Boolean);
    colors.forEach((color) => {
      const key = color.toLowerCase();
      if (!byColor.has(key)) byColor.set(key, { color, weight: variant.weight as number });
    });
  });
  const values = Array.from(byColor.entries());
  if (values.length === 0) return "-";
  const unique = Array.from(new Set(values.map(([, item]) => item.weight)));
  if (unique.length === 1) return `${unique[0]} g`;
  return (
    <div className="grid gap-1">
      {values.map(([key, item]) => <p key={`weight-${key}`}><span className="font-bold text-slate-700">{item.color}:</span> {item.weight} g</p>)}
    </div>
  );
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
    const postureVariants = variants
      .filter((item) => cleanValue(item.posture).toLowerCase() === posture)
      .map((item) => ({ color: cleanValue(item.color), dimension: formatSingleDimension(item) }))
      .filter((item) => item.dimension);
    const variantMode = cleanValue(design?.postureDimensionModes?.[posture]).toLowerCase() === "variant";
    if (variantMode && postureVariants.length > 0) return { posture, dimension: "", variants: postureVariants };

    const base = design?.dimensionsByPosture?.[posture];
    const variantDimensions = postureVariants.map((item) => item.dimension);
    const dimension = formatSingleDimension(base) || Array.from(new Set(variantDimensions)).join(" / ") || "-";
    return { posture, dimension, variants: [] as Array<{ color: string; dimension: string }> };
  }).filter((row) => row.dimension !== "-" || row.variants.length > 0);
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      {rows.map((row) => (
        <div key={row.posture}>
          <p className="font-bold text-slate-700">{postureLabel(row.posture)}:</p>
          {row.variants.length > 0 ? row.variants.map((variant, index) => (
            <p key={`${row.posture}-${variant.color}-${index}`}>
              {variant.color ? <><span className="font-bold text-slate-700">{variant.color}:</span>{" "}</> : null}
              {variant.dimension}
            </p>
          )) : <p>{row.dimension}</p>}
        </div>
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
  const frame = cleanValue(build?.frame);

  const back = backMaterial ? `${backMaterial} Back` : "";
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
  if (value == null || value === "" || value === "-") return null;
  return (
    <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
      <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
      <div className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</div>
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
  const protection = cleanValue(design?.build?.back?.protection) || "-";
  const ipRating = formatList(design?.ipRating, ", ") || "-";
  const audioJack = formatAudioJack(design?.audioJack);
  const otherFeatures = formatList(design?.otherFeatures) || "-";

  const dimensionsNode = postureDimensions || (foldable ? "-" : dimensions || "-");

  return (
    <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {row("Colors", colors)}
      {row(<><span>Dimensions</span><span className="block text-[10px] font-medium normal-case tracking-normal">(H × W × T)</span></>, dimensionsNode)}
      {row("Weight", weight)}
      {row("Design Style", designType)}
      {row("Build Material", build)}
      {row("Protection", protection)}
      {row("IP Rating", ipRating)}
      {row("Audio Jack (3.5mm)", audioJack)}
      {row("Other Features", otherFeatures)}
    </div>
  );
}

