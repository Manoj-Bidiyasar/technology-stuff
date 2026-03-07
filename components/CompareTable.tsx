"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product, ProductDisplayPanel } from "@/lib/types/content";
import { formatPrice } from "@/lib/utils/format";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { fallbackPerformanceFromProduct } from "@/lib/utils/performanceScore";

type CompareTableProps = {
  products: Product[];
  compareBasePath?: string;
  specBasePath?: string;
  deviceType?: "smartphone" | "tablet";
};

type RowDef = {
  label: string;
  values: string[];
  subheading?: boolean;
};

type SectionDef = {
  title: string;
  rows: RowDef[];
};

function asText(value: unknown): string {
  const text = String(value ?? "").trim();
  return text ? text : "N/A";
}

function formatDate(value: unknown): string {
  const raw = asText(value);
  if (raw === "N/A") return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function buildCompareSlug(items: Product[]): string {
  return items.map((item) => item.slug).join("-vs-");
}

function padToThree(values: string[]): string[] {
  return [values[0] || "N/A", values[1] || "N/A", values[2] || "N/A"];
}

function joinList(list?: string[], separator = ", "): string {
  if (!Array.isArray(list) || list.length === 0) return "N/A";
  const cleaned = list.map((item) => String(item || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(separator) : "N/A";
}

function yesNo(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "N/A";
}

function maxNetworkType(supported?: string[]): string {
  if (!Array.isArray(supported) || supported.length === 0) return "N/A";
  const set = new Set(supported.map((item) => String(item || "").trim().toUpperCase()));
  if (set.has("5G")) return "5G";
  if (set.has("4G")) return "4G";
  if (set.has("3G")) return "3G";
  if (set.has("2G")) return "2G";
  return "N/A";
}

function parseLargeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return 0;
  const clean = raw.replace(/,/g, "");
  const m = clean.match(/^(\d+(\.\d+)?)(m|k)?$/);
  if (!m) {
    const direct = Number(clean);
    return Number.isFinite(direct) ? direct : 0;
  }
  const base = Number(m[1]);
  const unit = m[3] || "";
  if (unit === "m") return Math.round(base * 1_000_000);
  if (unit === "k") return Math.round(base * 1_000);
  return Math.round(base);
}

function formatAntutuValue(product: Product, field: "total" | "cpu" | "gpu" | "memory" | "ux"): string {
  const perf = fallbackPerformanceFromProduct({ performance: product.performance, specs: product.specs });
  const nested = parseLargeNumber(perf?.antutu?.[field]);
  if (nested > 0) return String(nested);
  const legacyPerf = parseLargeNumber((product as Product & { performance?: Record<string, unknown> }).performance?.[`antutu${field[0].toUpperCase()}${field.slice(1)}`]);
  if (legacyPerf > 0) return String(legacyPerf);
  const legacySpecs = parseLargeNumber((product.specs as Record<string, unknown> | undefined)?.[`antutu${field[0].toUpperCase()}${field.slice(1)}`]);
  if (legacySpecs > 0) return String(legacySpecs);
  if (field === "total") {
    const altTotal = parseLargeNumber((product as Product & { performance?: Record<string, unknown> }).performance?.antutuScore);
    if (altTotal > 0) return String(altTotal);
  }
  return "N/A";
}

function formatDimensions(p: Product): string {
  const toBlock = (value?: { height?: number; width?: number; depth?: number | number[] }): string => {
    if (!value) return "";
    const h = value.height;
    const w = value.width;
    const d = Array.isArray(value.depth) ? value.depth.join("-") : value.depth;
    if (!h || !w || !d) return "";
    return `${h} x ${w} x ${d} mm`;
  };

  const normal = p.design?.dimensions?.normal;
  const folded = p.design?.dimensions?.folded;
  const unfolded = p.design?.dimensions?.unfolded;

  const normalText = toBlock(normal);
  if (normalText) return normalText;

  const foldedText = toBlock(folded);
  const unfoldedText = toBlock(unfolded);
  const type = String(p.design?.type || "").toLowerCase();
  const foldedLabel = type.includes("flip") ? "Flipped" : "Folded";
  const unfoldedLabel = type.includes("flip") ? "Open" : "Unfolded";
  if (foldedText && unfoldedText) return `${foldedLabel}: ${foldedText}\n${unfoldedLabel}: ${unfoldedText}`;
  if (foldedText) return `${foldedLabel}: ${foldedText}`;
  if (unfoldedText) return `${unfoldedLabel}: ${unfoldedText}`;
  return "N/A";
}

function cleanWiredCharging(value: unknown): string {
  const text = asText(value);
  if (text === "N/A") return text;
  const lower = text.toLowerCase();
  if (lower.includes("wireless")) return "N/A";
  return text;
}

function getPrimaryDisplay(p: Product): ProductDisplayPanel {
  if (p.display?.primary) return p.display.primary;
  if (Array.isArray(p.displays) && p.displays.length > 0) return p.displays[0] || {};
  return p.display || {};
}

function getSecondaryDisplay(p: Product): ProductDisplayPanel | null {
  if (p.display?.secondary) return p.display.secondary;
  if (Array.isArray(p.displays) && p.displays.length > 1) return p.displays[1] || null;
  return null;
}

function formatRearSetup(p: Product): string {
  const cams = p.rearCamera?.cameras || [];
  if (!cams.length) {
    const legacyRear = p.camera?.rear || [];
    if (legacyRear.length > 0) {
      const legacy = legacyRear
        .map((cam) => [asText(cam.resolution), asText(cam.sensorType)].filter((x) => x !== "N/A").join(" "))
        .filter(Boolean)
        .join(" + ");
      if (legacy) return legacy;
    }
    return asText(p.specs?.rearCamera || p.specs?.camera);
  }
  const setup = cams
    .map((cam) => {
      const res = asText(cam.resolution);
      const type = asText(cam.type || cam.role);
      if (res === "N/A" && type === "N/A") return "";
      if (res !== "N/A" && type !== "N/A") return `${res} (${type})`;
      return res !== "N/A" ? res : type;
    })
    .filter(Boolean)
    .join(" + ");
  return setup || asText(p.specs?.rearCamera || p.specs?.camera);
}

function formatRearSensors(p: Product): string {
  const cams = p.rearCamera?.cameras || [];
  if (!cams.length) {
    const legacyRear = p.camera?.rear || [];
    if (!legacyRear.length) return "N/A";
    const details = legacyRear
      .map((cam) =>
        [
          asText(cam.resolution),
          asText(cam.sensorType),
          asText(cam.aperture),
          asText(cam.sensorSize),
          asText(cam.pixelSize),
          asText(cam.focalLength),
          asText(cam.zoom),
          typeof cam.autofocus === "string" ? cam.autofocus : cam.autofocus ? "Autofocus" : "N/A",
          cam.ois ? "OIS" : "N/A",
          cam.eis ? "EIS" : "N/A",
        ]
          .filter((x) => x !== "N/A")
          .join(", ")
      )
      .filter(Boolean);
    return details.length ? details.join(" | ") : "N/A";
  }
  const details = cams
    .map((cam) => {
      const parts = [
        asText(cam.resolution),
        asText(cam.type || cam.role),
        asText(cam.sensor?.name),
        asText(cam.sensor?.aperture),
        asText(cam.sensor?.size),
        asText(cam.sensor?.pixelSize),
        asText(cam.sensor?.focalLength),
        asText(cam.sensor?.fov),
        asText(cam.sensor?.zoom),
        asText(cam.sensor?.autofocus),
        cam.sensor?.ois === true ? "OIS" : "N/A",
        cam.sensor?.eis === true ? "EIS" : "N/A",
      ].filter((x) => x !== "N/A");
      return parts.join(", ");
    })
    .filter(Boolean);
  return details.length ? details.join(" | ") : "N/A";
}

function formatFrontSetup(p: Product): string {
  const cams = p.frontCamera?.cameras || [];
  if (!cams.length) {
    const legacyFront = p.camera?.front || [];
    if (legacyFront.length > 0) {
      const legacy = legacyFront
        .map((cam) => [asText(cam.resolution), asText(cam.sensorType)].filter((x) => x !== "N/A").join(" "))
        .filter(Boolean)
        .join(" + ");
      if (legacy) return legacy;
    }
    return asText(p.specs?.frontCamera);
  }
  const setup = cams
    .map((cam) => {
      const res = asText(cam.resolution);
      const type = asText(cam.type || cam.role);
      if (res === "N/A" && type === "N/A") return "";
      if (res !== "N/A" && type !== "N/A") return `${res} (${type})`;
      return res !== "N/A" ? res : type;
    })
    .filter(Boolean)
    .join(" + ");
  return setup || asText(p.specs?.frontCamera);
}

function formatFrontSensors(p: Product): string {
  const cams = p.frontCamera?.cameras || [];
  if (!cams.length) {
    const legacyFront = p.camera?.front || [];
    if (!legacyFront.length) return "N/A";
    const details = legacyFront
      .map((cam) =>
        [
          asText(cam.resolution),
          asText(cam.sensorType),
          asText(cam.aperture),
          asText(cam.sensorSize),
          asText(cam.pixelSize),
          asText(cam.focalLength),
          asText(cam.zoom),
          typeof cam.autofocus === "string" ? cam.autofocus : cam.autofocus ? "Autofocus" : "N/A",
          cam.ois ? "OIS" : "N/A",
          cam.eis ? "EIS" : "N/A",
        ]
          .filter((x) => x !== "N/A")
          .join(", ")
      )
      .filter(Boolean);
    return details.length ? details.join(" | ") : "N/A";
  }
  const details = cams
    .map((cam) => {
      const parts = [
        asText(cam.resolution),
        asText(cam.type || cam.role),
        asText(cam.sensor?.name),
        asText(cam.sensor?.aperture || cam.aperture),
        asText(cam.sensor?.size),
        asText(cam.sensor?.pixelSize),
        asText(cam.sensor?.fov),
        cam.autofocus === true ? "Autofocus" : "N/A",
      ].filter((x) => x !== "N/A");
      return parts.join(", ");
    })
    .filter(Boolean);
  return details.length ? details.join(" | ") : "N/A";
}

export default function CompareTable({
  products,
  compareBasePath = "/compare",
  specBasePath = "/mobile",
  deviceType = "smartphone",
}: CompareTableProps) {
  const router = useRouter();
  const [imageIndexBySlug, setImageIndexBySlug] = useState<Record<string, number>>({});
  const [showAddSlotPicker, setShowAddSlotPicker] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addResults, setAddResults] = useState<Array<{ slug: string; name: string; brand: string; image?: string }>>([]);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceResults, setReplaceResults] = useState<Array<{ slug: string; name: string; brand: string; image?: string }>>([]);

  const slots =
    products.length === 2 && !showAddSlotPicker
      ? [products[0] || null, null, products[1] || null]
      : [products[0] || null, products[1] || null, products[2] || null];
  const titleSlug = buildCompareSlug(products);
  const twoPhoneIdle = products.length === 2 && !showAddSlotPicker;
  const showThirdSpecsColumn = products.length === 3 || showAddSlotPicker;
  const specsGridClass = showThirdSpecsColumn ? "md:grid-cols-3" : "md:grid-cols-2";
  const visibleValueCount = showThirdSpecsColumn ? 3 : 2;
  const itemLabel = deviceType === "tablet" ? "tablet" : "phone";
  const itemLabelCap = deviceType === "tablet" ? "Tablet" : "Phone";

  useEffect(() => {
    let mounted = true;
    const q = addQuery.trim();
    if (!q) {
      setAddResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAddLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&deviceType=${deviceType}`, { cache: "no-store" });
        const data = (await res.json()) as { items?: Array<{ slug: string; name: string; brand: string; image?: string }> };
        if (!mounted) return;
        const taken = new Set(products.map((item) => item.slug));
        setAddResults((data.items || []).filter((item) => !taken.has(item.slug)).slice(0, 8));
      } finally {
        if (mounted) setAddLoading(false);
      }
    }, 180);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [addQuery, deviceType, products]);

  useEffect(() => {
    let mounted = true;
    const q = replaceQuery.trim();
    if (!replaceTarget || !q) {
      setReplaceResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setReplaceLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&deviceType=${deviceType}`, { cache: "no-store" });
        const data = (await res.json()) as { items?: Array<{ slug: string; name: string; brand: string; image?: string }> };
        if (!mounted) return;
        const taken = new Set(products.map((item) => item.slug).filter((slug) => slug !== replaceTarget));
        setReplaceResults((data.items || []).filter((item) => !taken.has(item.slug)).slice(0, 8));
      } finally {
        if (mounted) setReplaceLoading(false);
      }
    }, 180);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [deviceType, replaceQuery, replaceTarget, products]);

  function addPhone(slug: string) {
    if (!slug || products.length >= 3) return;
    const next = [...products.map((item) => item.slug), slug].slice(0, 3);
    setShowAddSlotPicker(false);
    router.push(`${compareBasePath}/${next.join("-vs-")}`);
  }

  function movePhone(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const slugs = products.map((item) => item.slug);
    if (fromIndex < 0 || fromIndex >= slugs.length) return;
    if (toIndex < 0 || toIndex >= slugs.length) return;
    const next = [...slugs];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    router.push(`${compareBasePath}/${next.join("-vs-")}`);
  }

  function replacePhone(oldSlug: string, newSlug: string) {
    if (!oldSlug || !newSlug || oldSlug === newSlug) return;
    const next = products.map((item) => (item.slug === oldSlug ? newSlug : item.slug));
    router.push(`${compareBasePath}/${next.join("-vs-")}`);
    setReplaceTarget(null);
    setReplaceQuery("");
    setReplaceResults([]);
  }

  function currentImageIndex(product: Product): number {
    const total = product.images?.length || 0;
    if (total <= 1) return 0;
    const raw = imageIndexBySlug[product.slug] ?? 0;
    if (raw < 0) return 0;
    if (raw >= total) return total - 1;
    return raw;
  }

  function slideImage(product: Product, direction: "prev" | "next") {
    const total = product.images?.length || 0;
    if (total <= 1) return;
    setImageIndexBySlug((prev) => {
      const current = prev[product.slug] ?? 0;
      const nextIndex = direction === "next" ? (current + 1) % total : (current - 1 + total) % total;
      return { ...prev, [product.slug]: nextIndex };
    });
  }

  function jumpToImage(product: Product, index: number) {
    const total = product.images?.length || 0;
    if (total <= 1) return;
    const safe = Math.max(0, Math.min(index, total - 1));
    setImageIndexBySlug((prev) => ({ ...prev, [product.slug]: safe }));
  }

  const sections = useMemo<SectionDef[]>(() => {
    const hasSecondaryDisplay = products.some((p) => Boolean(getSecondaryDisplay(p)));
    const rows: SectionDef[] = [
      {
        title: "General",
        rows: [
          { label: "Launch Date", values: padToThree(products.map((p) => formatDate(p.general?.launchDate))) },
          { label: "Model Number", values: padToThree(products.map((p) => asText(p.general?.modelNumber))) },
          { label: "Variants", values: padToThree(products.map((p) => asText((p.general?.variants || []).map((v) => `${v.ram || ""} + ${v.storage || ""}`.trim()).filter(Boolean).join(" | ")))) },
          { label: "Package Contents", values: padToThree(products.map((p) => joinList(p.general?.packageContents))) },
          { label: "Multimedia", values: padToThree(products.map((p) => joinList(p.general?.multimedia))) },
        ],
      },
      {
        title: "Design",
        rows: [
          { label: "Dimensions (Height x Width x Thickness)", values: padToThree(products.map((p) => formatDimensions(p))) },
          { label: "Weight", values: padToThree(products.map((p) => asText((p.design?.weight || []).map((w) => (w.value ? `${w.value} g${w.color ? ` (${w.color})` : ""}` : "")).filter(Boolean).join(", ")))) },
          { label: "Build", values: padToThree(products.map((p) => asText(`${p.design?.build?.back?.material ? `${p.design.build.back.material} Back` : ""}${p.design?.build?.frame ? `, ${p.design.build.frame} Frame` : ""}`))) },
          { label: "IP Rating", values: padToThree(products.map((p) => joinList(p.design?.ipRating))) },
          { label: "Audio Jack", values: padToThree(products.map((p) => (p.design?.audioJack?.available === true ? "Yes" : p.design?.audioJack?.available === false ? `No${p.design.audioJack.type ? ` (${p.design.audioJack.type})` : ""}` : "N/A"))) },
          { label: "Colors", values: padToThree(products.map((p) => joinList(p.design?.colors))) },
          { label: "Design Type", values: padToThree(products.map((p) => asText(p.design?.designType))) },
          { label: "Other Features", values: padToThree(products.map((p) => joinList(p.design?.otherFeatures))) },
        ],
      },
      {
        title: "Display",
        rows: [
          { label: "Primary Display", values: ["", "", ""], subheading: true },
          { label: "Primary Summary", values: padToThree(products.map((p) => asText(p.specs?.display))) },
          { label: "Primary Type", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.type))) },
          { label: "Primary Size", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.size))) },
          { label: "Primary Resolution", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.resolution))) },
          { label: "Primary Refresh Rate", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.refreshRate))) },
          { label: "Primary Peak Brightness", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.peakBrightness))) },
          { label: "Primary Protection", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.protection))) },
          { label: "Primary HDR Support", values: padToThree(products.map((p) => joinList(getPrimaryDisplay(p)?.hdr))) },
          { label: "Primary Pixel Density", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.pixelDensity))) },
          { label: "Primary Screen-to-body", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.screenToBody))) },
          { label: "Primary Aspect Ratio", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.aspectRatio))) },
          { label: "Primary Touch Sampling", values: padToThree(products.map((p) => asText(getPrimaryDisplay(p)?.touchSamplingRate))) },
          { label: "Primary Curved", values: padToThree(products.map((p) => yesNo(getPrimaryDisplay(p)?.curved))) },
          { label: "Primary Certifications", values: padToThree(products.map((p) => joinList(getPrimaryDisplay(p)?.certifications))) },
          { label: "Primary Other Features", values: padToThree(products.map((p) => joinList(getPrimaryDisplay(p)?.others))) },
          ...(hasSecondaryDisplay
            ? [
                { label: "Secondary Display", values: ["", "", ""], subheading: true },
                { label: "Secondary Summary", values: padToThree(products.map((p) => (getSecondaryDisplay(p) ? "Available" : "N/A"))) },
                { label: "Secondary Type", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.type))) },
                { label: "Secondary Size", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.size))) },
                { label: "Secondary Resolution", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.resolution))) },
                { label: "Secondary Refresh Rate", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.refreshRate))) },
                { label: "Secondary Peak Brightness", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.peakBrightness))) },
                { label: "Secondary Protection", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.protection))) },
                { label: "Secondary HDR Support", values: padToThree(products.map((p) => joinList(getSecondaryDisplay(p)?.hdr))) },
                { label: "Secondary Pixel Density", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.pixelDensity))) },
                { label: "Secondary Screen-to-body", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.screenToBody))) },
                { label: "Secondary Aspect Ratio", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.aspectRatio))) },
                { label: "Secondary Touch Sampling", values: padToThree(products.map((p) => asText(getSecondaryDisplay(p)?.touchSamplingRate))) },
                { label: "Secondary Curved", values: padToThree(products.map((p) => yesNo(getSecondaryDisplay(p)?.curved))) },
                { label: "Secondary Certifications", values: padToThree(products.map((p) => joinList(getSecondaryDisplay(p)?.certifications))) },
                { label: "Secondary Other Features", values: padToThree(products.map((p) => joinList(getSecondaryDisplay(p)?.others))) },
              ]
            : []),
        ],
      },
      {
        title: "Performance",
        rows: [
          { label: "Chipset", values: padToThree(products.map((p) => asText(p.performance?.chipset || p.specs?.processor))) },
          { label: "Fabrication", values: padToThree(products.map((p) => asText(p.performance?.fabrication))) },
          { label: "Architecture", values: padToThree(products.map((p) => asText(p.performance?.architecture))) },
          { label: "CPU", values: padToThree(products.map((p) => asText((p.performance?.cpu || []).join(", ")))) },
          { label: "GPU", values: padToThree(products.map((p) => asText(p.performance?.gpu))) },
          { label: "GPU Frequency", values: padToThree(products.map((p) => asText(p.performance?.gpuFrequency))) },
          { label: "AnTuTu Total", values: padToThree(products.map((p) => formatAntutuValue(p, "total"))) },
          { label: "AnTuTu CPU", values: padToThree(products.map((p) => formatAntutuValue(p, "cpu"))) },
          { label: "AnTuTu GPU", values: padToThree(products.map((p) => formatAntutuValue(p, "gpu"))) },
          { label: "AnTuTu Memory", values: padToThree(products.map((p) => formatAntutuValue(p, "memory"))) },
          { label: "AnTuTu UX", values: padToThree(products.map((p) => formatAntutuValue(p, "ux"))) },
          { label: "Cooling System", values: padToThree(products.map((p) => asText(p.performance?.coolingSystem))) },
          { label: "Additional Chips", values: padToThree(products.map((p) => joinList(p.performance?.additionalChips))) },
          { label: "Other Features", values: padToThree(products.map((p) => joinList(p.performance?.otherFeatures))) },
          { label: "RAM", values: padToThree(products.map((p) => asText(p.specs?.ram))) },
        ],
      },
      {
        title: "Storage",
        rows: [
          { label: "RAM & Storage", values: padToThree(products.map((p) => asText((p.variants || []).map((v) => `${v.ram || ""} + ${v.storage || ""}`.trim()).filter(Boolean).join(" | ") || p.specs?.storage))) },
          { label: "RAM Type", values: padToThree(products.map((p) => joinList(p.memoryStorage?.ramType))) },
          { label: "Storage Type", values: padToThree(products.map((p) => joinList(p.memoryStorage?.storageType))) },
          { label: "Virtual RAM", values: padToThree(products.map((p) => joinList(p.memoryStorage?.virtualRam))) },
          {
            label: "Expandable Storage",
            values: padToThree(
              products.map((p) =>
                p.memoryStorage?.expandableStorage?.supported
                  ? `Yes${p.memoryStorage?.expandableStorage?.max ? ` (up to ${p.memoryStorage.expandableStorage.max})` : ""}`
                  : p.memoryStorage?.expandableStorage?.supported === false
                    ? "No"
                    : "N/A"
              )
            ),
          },
          { label: "Storage Features", values: padToThree(products.map((p) => joinList(p.memoryStorage?.features))) },
        ],
      },
      {
        title: "Software",
        rows: [
          {
            label: "Operating System",
            values: padToThree(
              products.map((p) => {
                const osName = asText(p.software?.os?.name);
                const osVersion = asText(p.software?.os?.version);
                const ui = asText(p.software?.ui);
                if (osName !== "N/A" || osVersion !== "N/A") {
                  const base = `${osName !== "N/A" ? osName : ""}${osVersion !== "N/A" ? ` ${osVersion}` : ""}`.trim();
                  return ui !== "N/A" ? `${base}, ${ui}` : base || "N/A";
                }
                const fallback = asText(p.specs?.os);
                if (fallback !== "N/A") return fallback;
                return ui !== "N/A" ? ui : "N/A";
              })
            ),
          },
          { label: "OS Updates", values: padToThree(products.map((p) => (p.software?.updates?.os ? `${p.software.updates.os} Years` : "N/A"))) },
          { label: "Security Updates", values: padToThree(products.map((p) => (p.software?.updates?.security ? `${p.software.updates.security} Years` : "N/A"))) },
        ],
      },
      {
        title: "Rear Camera",
        rows: [
          { label: "Rear Camera Setup", values: padToThree(products.map((p) => formatRearSetup(p))) },
          { label: "Rear Sensor Details", values: padToThree(products.map((p) => formatRearSensors(p))) },
          { label: "Rear Flash", values: padToThree(products.map((p) => joinList(p.camera?.flash))) },
          { label: "Rear Features", values: padToThree(products.map((p) => joinList(p.rearCamera?.features))) },
          { label: "Camera Features", values: padToThree(products.map((p) => joinList(p.camera?.features))) },
          { label: "Camera Other Features", values: padToThree(products.map((p) => joinList(p.camera?.otherFeatures))) },
          { label: "Rear AI Features", values: padToThree(products.map((p) => joinList(p.rearCamera?.aiFeatures))) },
          { label: "Rear Video Recording", values: padToThree(products.map((p) => joinList(p.rearCamera?.video?.recording))) },
          { label: "Rear Video (Legacy)", values: padToThree(products.map((p) => joinList(p.camera?.video?.rear))) },
          { label: "Rear Video Features", values: padToThree(products.map((p) => joinList(p.rearCamera?.video?.features))) },
          { label: "Rear Slow Motion", values: padToThree(products.map((p) => joinList(p.rearCamera?.video?.slowMotion))) },
          { label: "Slow Motion (Legacy)", values: padToThree(products.map((p) => joinList(p.camera?.video?.slowMotion))) },
          { label: "Rear Optical Zoom", values: padToThree(products.map((p) => asText(p.rearCamera?.zoom?.optical))) },
          { label: "Rear Digital Zoom", values: padToThree(products.map((p) => asText(p.rearCamera?.zoom?.digital))) },
        ],
      },
      {
        title: "Front Camera",
        rows: [
          { label: "Front Camera Setup", values: padToThree(products.map((p) => formatFrontSetup(p))) },
          { label: "Front Sensor Details", values: padToThree(products.map((p) => formatFrontSensors(p))) },
          { label: "Front Features", values: padToThree(products.map((p) => joinList(p.frontCamera?.features))) },
          { label: "Front Video Recording", values: padToThree(products.map((p) => joinList(p.frontCamera?.video?.recording))) },
          { label: "Front Video (Legacy)", values: padToThree(products.map((p) => joinList(p.camera?.video?.front))) },
          { label: "Front Video Features", values: padToThree(products.map((p) => joinList(p.frontCamera?.video?.features))) },
        ],
      },
      {
        title: "Battery & Charger",
        rows: [
          {
            label: "Battery Capacity & Type",
            values: padToThree(
              products.map((p) => {
                const capacity = asText(p.battery?.capacity || p.specs?.battery);
                const type = asText(p.battery?.type);
                if (capacity === "N/A" && type === "N/A") return "N/A";
                if (capacity !== "N/A" && type !== "N/A") return `${capacity}, ${type}`;
                return capacity !== "N/A" ? capacity : type;
              })
            ),
          },
          {
            label: "Wired Charging",
            values: padToThree(
              products.map((p) => {
                const maxWired = cleanWiredCharging(p.battery?.maxChargingSupport);
                if (maxWired !== "N/A") return maxWired;
                return cleanWiredCharging(p.specs?.charging);
              })
            ),
          },
          {
            label: "Charging Speed",
            values: padToThree(
              products.map((p) => {
                const speed = p.battery?.chargingSpeed || {};
                const entries = Object.entries(speed)
                  .map(([k, v]) => `${k}%: ${v}`)
                  .filter((x) => !x.includes("undefined"));
                return entries.length ? entries.join(" | ") : "N/A";
              })
            ),
          },
          {
            label: "Charger in Box",
            values: padToThree(
              products.map((p) =>
                p.battery?.chargerInBox?.available
                  ? `Yes${p.battery?.chargerInBox?.power ? ` (${p.battery.chargerInBox.power}W)` : ""}`
                  : p.battery?.chargerInBox?.available === false
                    ? "No"
                    : "N/A"
              )
            ),
          },
          {
            label: "Wireless Charging",
            values: padToThree(
              products.map((p) =>
                p.battery?.wireless?.supported
                  ? `Yes${p.battery?.wireless?.maxPower ? ` (${p.battery.wireless.maxPower}W)` : ""}`
                  : p.battery?.wireless?.supported === false
                    ? "No"
                    : "N/A"
              )
            ),
          },
          {
            label: "Wireless Speed",
            values: padToThree(
              products.map((p) => {
                const speed = p.battery?.wireless?.speed || {};
                const entries = Object.entries(speed)
                  .map(([k, v]) => `${k}%: ${v}`)
                  .filter((x) => !x.includes("undefined"));
                return entries.length ? entries.join(" | ") : "N/A";
              })
            ),
          },
          { label: "Battery Features", values: padToThree(products.map((p) => joinList(p.battery?.features))) },
        ],
      },
      {
        title: "Security & Sensors",
        rows: [
          {
            label: "Fingerprint",
            values: padToThree(
              products.map((p) =>
                p.security?.fingerprint?.available
                  ? `Yes${p.security?.fingerprint?.locations?.length ? ` (${p.security.fingerprint.locations.join(", ")})` : ""}`
                  : p.security?.fingerprint?.available === false
                    ? "No"
                    : "N/A"
              )
            ),
          },
          { label: "Fingerprint Type", values: padToThree(products.map((p) => joinList(p.security?.fingerprint?.type))) },
          { label: "Face Unlock", values: padToThree(products.map((p) => asText(p.security?.faceUnlock?.type))) },
          { label: "Sensors", values: padToThree(products.map((p) => joinList(p.sensors))) },
        ],
      },
      {
        title: "Network",
        rows: [
          { label: "Network", values: padToThree(products.map((p) => maxNetworkType(p.network?.supported))) },
          { label: "SIM", values: padToThree(products.map((p) => asText(`${p.network?.sim?.type || ""}${p.network?.sim?.config ? ` (${p.network.sim.config})` : ""}`))) },
          { label: "Wi-Fi", values: padToThree(products.map((p) => asText(p.network?.wifi?.version))) },
          { label: "Bluetooth", values: padToThree(products.map((p) => asText(p.network?.bluetooth))) },
          { label: "NFC", values: padToThree(products.map((p) => yesNo(p.network?.nfc))) },
          { label: "Infrared", values: padToThree(products.map((p) => yesNo(p.network?.infrared))) },
        ],
      },
    ];

    return rows;
  }, [products]);

  const specsBlocks = (
    <>
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="bg-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-800">
          Technology Stuff Specs Score (Max 100)
        </div>
        <div className={`grid grid-cols-1 bg-white ${specsGridClass}`}>
          {(showThirdSpecsColumn ? slots : slots.slice(0, 2)).map((product, idx) => (
            <div
              key={`spec-score-${idx}`}
              className="border-r border-slate-200 px-3 py-2 text-center text-sm font-extrabold text-blue-700 last:border-r-0"
            >
              {product ? (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-400 bg-white text-sm font-extrabold leading-none tracking-tight text-blue-700 shadow-[0_1px_2px_rgba(29,78,216,0.18)]">
                  {Math.round(calculateOverallScore100(product))}
                </span>
              ) : (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold leading-none tracking-tight text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                  N/A
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {sections.map((section) => (
        <details key={section.title} open className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-900">
            {section.title}
          </summary>
          <div>
            {section.rows.map((row) => (
              <div
                key={`${section.title}-${row.label}`}
                className={`${row.subheading ? "border-y border-slate-300 bg-slate-50" : "border-b border-slate-200"} last:border-b-0`}
              >
                {row.subheading ? (
                  <div className="px-4 py-2">
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blue-700">
                      {row.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                      {section.title === "Display"
                        ? row.label.replace(/^Primary\s+/, "").replace(/^Secondary\s+/, "")
                        : row.label}
                    </div>
                    <div className={`grid grid-cols-1 bg-white ${specsGridClass}`}>
                      {row.values.slice(0, visibleValueCount).map((value, idx) => (
                        <div
                          key={`${row.label}-${idx}`}
                          className={`whitespace-pre-line border-r border-slate-200 px-3 py-2 text-center text-xs sm:text-sm last:border-r-0 ${
                            asText(value) === "N/A" ? "font-medium text-slate-400" : "font-semibold text-slate-900"
                          }`}
                        >
                          {asText(value)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </details>
      ))}
    </>
  );

  return (
    <section
      className="panel"
      style={
        twoPhoneIdle
          ? {
              borderRightWidth: 0,
              borderTopWidth: 0,
            }
          : undefined
      }
    >
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        {twoPhoneIdle ? (
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-2.5 md:w-2/3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-base font-extrabold text-slate-900">
                  {products.map((p, idx) => (
                    <span key={p.slug} className="inline-flex items-center gap-2">
                      <span>{p.name}</span>
                      {idx < products.length - 1 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">vs</span>
                      ) : null}
                    </span>
                  ))}
                </div>
                <Link
                  href={`${compareBasePath}/${titleSlug}`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  Share Link
                </Link>
              </div>
          </div>
        ) : (
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-base font-extrabold text-slate-900">
                {products.map((p, idx) => (
                  <span key={p.slug} className="inline-flex items-center gap-2">
                    <span>{p.name}</span>
                    {idx < products.length - 1 ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">vs</span>
                    ) : null}
                  </span>
                ))}
              </div>
              <Link
                href={`${compareBasePath}/${titleSlug}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                Share Link
              </Link>
            </div>
          </div>
        )}

        <div className={`grid ${twoPhoneIdle ? "grid-cols-[1fr_52px_1fr]" : "grid-cols-1 md:grid-cols-3"} ${twoPhoneIdle ? "" : "border-b border-slate-200"}`}>
        {slots.map((product, slotIndex) => {
          if (!product) {
            if (twoPhoneIdle && slotIndex === 1) {
              return (
                <article key="mobile-vs-center" className="flex items-center justify-center bg-slate-50">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-extrabold text-white">
                    VS
                  </span>
                </article>
              );
            }
            const plainThirdSlot = twoPhoneIdle;
            return (
            <article
              key={`empty-${slotIndex}`}
              className={`relative px-2 pt-1.5 pb-1 ${
                plainThirdSlot ? "bg-transparent" : "border-r border-slate-200 bg-white last:border-r-0"
              }`}
            >
                <div className={`flex h-[188px] flex-col items-center justify-center px-2 py-1.5 text-center ${plainThirdSlot ? "bg-transparent" : "bg-white"}`}>
                  {!showAddSlotPicker ? (
                    <button
                      type="button"
                      onClick={() => setShowAddSlotPicker(true)}
                      className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Compare
                    </button>
                  ) : (
                    <div className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSlotPicker(false)}
                        className="ml-auto block rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600"
                      >
                        Close
                      </button>
                      <p className="text-sm font-semibold text-slate-500">Add another {itemLabel}</p>
                      <div className="mt-3 w-full max-w-[280px] px-3 text-left">
                        <input
                          value={addQuery}
                          onChange={(e) => setAddQuery(e.target.value)}
                          placeholder={`Search ${itemLabel} to add`}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500/30 focus:ring"
                        />
                        {addQuery.trim() ? (
                          <div className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-200 bg-white">
                            {addLoading ? <p className="px-3 py-2 text-xs text-slate-500">Searching...</p> : null}
                            {!addLoading && addResults.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-slate-500">{itemLabelCap} not available</p>
                            ) : null}
                            {!addLoading
                              ? addResults.map((item) => (
                                  <button
                                    key={item.slug}
                                    type="button"
                                    onClick={() => addPhone(item.slug)}
                                    className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-800 last:border-b-0 hover:bg-slate-50"
                                  >
                                    <span className="flex min-w-0 items-center gap-2 pr-2">
                                      <Image
                                        src={item.image || "https://placehold.co/40x40?text=P"}
                                        alt={item.name}
                                        width={24}
                                        height={24}
                                        className="h-6 w-6 rounded border border-slate-200 object-contain"
                                        unoptimized
                                      />
                                      <span className="truncate">{item.name}</span>
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">{item.brand}</span>
                                  </button>
                                ))
                              : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          }

          const removeItems = products.filter((item) => item.slug !== product.slug);
          const removeHref =
            removeItems.length === 0
              ? compareBasePath
              : removeItems.length === 1
                ? `${compareBasePath}?phones=${removeItems[0].slug}`
                : `${compareBasePath}/${buildCompareSlug(removeItems)}`;

          const currentIndex = products.findIndex((item) => item.slug === product.slug);
          const canMoveLeft = currentIndex > 0;
          const canMoveRight = currentIndex >= 0 && currentIndex < products.length - 1;
          const addBottomBorder = false;

          return (
            <article
              key={product.slug}
              className={`relative bg-white px-2 pt-1.5 pb-0.5 ${
                "border-r border-slate-200"
              } ${addBottomBorder ? "border-b border-slate-200" : ""} last:border-r-0`}
            >
              <Link
                href={removeHref}
                className="absolute right-3 top-2 text-2xl leading-none text-slate-500 hover:text-slate-700"
                aria-label={`Remove ${product.name}`}
              >
                x
              </Link>
              <div className="relative mx-auto h-[104px] max-w-[116px]">
                <Link href={`${specBasePath}/${product.slug}`} className="block h-full w-full" title={`Open ${product.name} specifications`}>
                  <Image
                    src={(product.images?.length ? product.images[currentImageIndex(product)] : `https://placehold.co/360x360?text=${itemLabelCap}`) || `https://placehold.co/360x360?text=${itemLabelCap}`}
                    alt={product.name}
                    width={140}
                    height={140}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </Link>
                {(product.images?.length || 0) > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => slideImage(product, "prev")}
                      className="absolute left-[-16px] top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white px-1 text-[11px] font-extrabold text-slate-700 shadow-sm"
                      aria-label={`Previous image for ${product.name}`}
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={() => slideImage(product, "next")}
                      className="absolute right-[-16px] top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white px-1 text-[11px] font-extrabold text-slate-700 shadow-sm"
                      aria-label={`Next image for ${product.name}`}
                    >
                      {">"}
                    </button>
                  </>
                ) : null}
              </div>
              {(product.images?.length || 0) > 1 ? (
                <div className="mt-1 flex items-center justify-center gap-1">
                  {product.images.slice(0, 6).map((_, dotIndex) => {
                    const active = currentImageIndex(product) === dotIndex;
                    return (
                      <button
                        key={`${product.slug}-dot-${dotIndex}`}
                        type="button"
                        onClick={() => jumpToImage(product, dotIndex)}
                        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-orange-500" : "bg-slate-300"}`}
                        aria-label={`Go to image ${dotIndex + 1} for ${product.name}`}
                      />
                    );
                  })}
                </div>
              ) : null}

              <h3 className="mt-1 text-center text-base font-bold text-slate-900">
                <Link href={`${specBasePath}/${product.slug}`} className="hover:text-blue-700" title={`Open ${product.name} specifications`}>
                  {product.name}
                </Link>
              </h3>
              <p className="mt-0.5 text-center text-lg font-extrabold text-slate-900">{product.price > 0 ? formatPrice(product.price) : "N/A"}</p>
              {(product.affiliateLinks?.amazon || product.affiliateLinks?.flipkart) ? (
                <p className="mt-0 text-center text-[11px] font-bold text-orange-600">
                  {product.affiliateLinks?.amazon ? "@ Amazon" : "@ Flipkart"}
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-1.5">
                <button
                  type="button"
                  onClick={() => movePhone(currentIndex, currentIndex - 1)}
                  disabled={!canMoveLeft}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Move Left
                </button>
                <button
                  type="button"
                  onClick={() => movePhone(currentIndex, currentIndex + 1)}
                  disabled={!canMoveRight}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Move Right
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceTarget((prev) => (prev === product.slug ? null : product.slug));
                    setReplaceQuery("");
                    setReplaceResults([]);
                  }}
                  className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"
                >
                  Replace
                </button>
              </div>
              {replaceTarget === product.slug ? (
                <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                  <input
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder={`Search ${itemLabel} to replace`}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none ring-blue-500/30 focus:ring"
                  />
                  {replaceQuery.trim() ? (
                    <div className="mt-1.5 max-h-36 overflow-auto rounded-md border border-slate-200 bg-white">
                      {replaceLoading ? <p className="px-2 py-1.5 text-[11px] text-slate-500">Searching...</p> : null}
                      {!replaceLoading && replaceResults.length === 0 ? (
                        <p className="px-2 py-1.5 text-[11px] text-slate-500">{itemLabelCap} not available</p>
                      ) : null}
                      {!replaceLoading
                        ? replaceResults.map((item) => (
                            <button
                              key={`${product.slug}-${item.slug}`}
                              type="button"
                              onClick={() => replacePhone(product.slug, item.slug)}
                              className="flex w-full items-center justify-between border-b border-slate-100 px-2 py-1.5 text-left text-[11px] text-slate-800 last:border-b-0 hover:bg-slate-50"
                            >
                              <span className="flex min-w-0 items-center gap-2 pr-2">
                                <Image
                                  src={item.image || "https://placehold.co/40x40?text=P"}
                                  alt={item.name}
                                  width={22}
                                  height={22}
                                  className="h-[22px] w-[22px] rounded border border-slate-200 object-contain"
                                  unoptimized
                                />
                                <span className="truncate">{item.name}</span>
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold text-slate-500">{item.brand}</span>
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
        </div>
      </div>

      <div className="bg-slate-50 p-3">
        {products.length === 2 && !showAddSlotPicker ? (
          <div className="space-y-3 md:w-2/3">{specsBlocks}</div>
        ) : (
          <div className="space-y-3">{specsBlocks}</div>
        )}
      </div>

    </section>
  );
}
