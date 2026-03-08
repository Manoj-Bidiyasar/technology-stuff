import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
});

type SnapdragonTier = "elite" | "series8" | "series7gen" | "series7legacy" | "series6" | "series4" | "series2" | "other" | "none";

type ChipTileMeta = {
  brand: string;
  series?: string;
  tone: string;
  edge: string;
};

type ChipSeriesInfo = {
  line1: string;
  line2?: string;
  isPremium?: boolean;
};

function getSnapdragonSuffix(name: string): string {
  const raw = String(name || "").trim();
  const m = raw.match(/snapdragon\s+(.+)$/i);
  return String(m?.[1] || "").trim();
}

function normalizeSnapdragonSuffix(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/^8sgen\s*(\d+)/i, "8s gen $1")
    .replace(/^8gen\s*(\d+)/i, "8 gen $1")
    .replace(/^7sgen\s*(\d+)/i, "7s gen $1")
    .replace(/^7gen\s*(\d+)/i, "7 gen $1")
    .trim();
}

function getSnapdragonTier(name: string, vendor: string): SnapdragonTier {
  const rawName = String(name || "");
  const isSnapdragon = /snapdragon/i.test(rawName) || /qualcomm/i.test(vendor);
  if (!isSnapdragon) return "none";
  const suffix = normalizeSnapdragonSuffix(getSnapdragonSuffix(rawName)).toLowerCase();
  if (!suffix) return "other";
  if (/\belite\b/.test(suffix)) return "elite";
  if (/^8s?(?:\b|gen|\+)/.test(suffix) || /^8\d{2}\b/.test(suffix)) return "series8";
  if (/^7s?(?:\+)?\s*gen\b|^7s?gen\b/.test(suffix)) return "series7gen";
  if (/^7\d{2}\b/.test(suffix) || /\b7\d{2}g?\b/.test(suffix)) return "series7legacy";
  if (/^6(?:\b|gen|\+)/.test(suffix) || /^6\d{2}\b/.test(suffix)) return "series6";
  if (/^4(?:\b|gen|\+)/.test(suffix) || /^4\d{2}\b/.test(suffix)) return "series4";
  if (/^2(?:\b|gen|\+)/.test(suffix) || /^2\d{2}\b/.test(suffix)) return "series2";
  return "other";
}

function getChipTileMeta(name: string, vendor: string): ChipTileMeta {
  const lower = String(name || "").toLowerCase();
  const tier = getSnapdragonTier(name, vendor);
  if (tier === "elite") {
    return {
      brand: "SNAPDRAGON",
      series: "ELITE",
      tone: "bg-gradient-to-br from-[#090d14] via-[#171b24] to-[#2a2f3a] text-[#ffe8b2]",
      edge: "shadow-[0_0_0_1px_rgba(210,160,70,0.98),0_8px_16px_rgba(16,24,40,0.24)]",
    };
  }
  if (tier === "series8") {
    return {
      brand: "SNAPDRAGON",
      series: "8 SERIES",
      tone: "bg-gradient-to-br from-[#101726] via-[#1f2b40] to-[#2b3444] text-[#f7e2b5]",
      edge: "shadow-[0_0_0_1px_rgba(210,160,70,0.98),0_8px_16px_rgba(16,24,40,0.24)]",
    };
  }
  if (tier === "series7gen") {
    return {
      brand: "SNAPDRAGON",
      series: "7 GEN",
      tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
      edge: "shadow-[0_0_0_1px_rgba(236,242,255,0.9),0_8px_16px_rgba(16,24,40,0.22)]",
    };
  }
  if (tier === "series7legacy") {
    return {
      brand: "SNAPDRAGON",
      series: "7 SERIES",
      tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
      edge: "shadow-[0_0_0_1px_rgba(236,242,255,0.9),0_8px_16px_rgba(16,24,40,0.22)]",
    };
  }
  if (tier === "series6" || tier === "series4" || tier === "series2" || tier === "other") {
    return {
      brand: "SNAPDRAGON",
      series: tier === "series6" ? "6 SERIES" : tier === "series4" ? "4 SERIES" : tier === "series2" ? "2 SERIES" : "OTHER",
      tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
      edge: "shadow-[0_0_0_1px_rgba(236,242,255,0.9),0_8px_16px_rgba(16,24,40,0.22)]",
    };
  }
  if (/samsung/i.test(vendor) || /exynos/i.test(lower)) {
    return {
      brand: "SAMSUNG",
      series: "EXYNOS",
      tone: "bg-gradient-to-br from-[#070d1b] via-[#101b33] to-[#0c1324] text-[#dbeafe]",
      edge: "shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_18px_rgba(37,99,235,0.35),0_0_32px_rgba(59,130,246,0.25)]",
    };
  }
  if (/google/i.test(vendor) || /tensor/i.test(lower)) {
    return {
      brand: "GOOGLE",
      tone: "bg-gradient-to-br from-[#0b1020] via-[#1a2442] to-[#2b3f70] text-[#eef4ff]",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.65),0_0_16px_rgba(59,130,246,0.2)]",
    };
  }
  if (/apple/i.test(vendor) || /^apple\s+/i.test(lower)) {
    return {
      brand: "APPLE",
      tone: "bg-gradient-to-br from-[#0b1020] via-[#1a2442] to-[#2b3f70] text-[#e5eefc]",
      edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.7),0_0_18px_rgba(59,130,246,0.28),0_0_30px_rgba(148,163,184,0.2)]",
    };
  }
  if (/mediatek/i.test(vendor) || /dimensity|helio/i.test(lower)) {
    return {
      brand: "MEDIATEK",
      series: /dimensity/i.test(lower) ? "DIMENSITY" : "HELIO",
      tone: "bg-gradient-to-br from-[#060b14] via-[#0a1322] to-[#12294a] text-[#f8e9c2]",
      edge: "shadow-[0_0_0_1px_rgba(245,188,96,0.75),0_0_18px_rgba(255,170,82,0.45),0_0_32px_rgba(59,130,246,0.35)]",
    };
  }
  if (/unisoc/i.test(vendor) || /unisoc|tiger/i.test(lower)) {
    return {
      brand: "UNISOC",
      series: "UNISOC",
      tone: "bg-gradient-to-br from-[#0b1d1a] via-[#10302a] to-[#1f4e45] text-[#d1fae5]",
      edge: "shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_16px_rgba(16,185,129,0.3),0_0_28px_rgba(20,184,166,0.22)]",
    };
  }
  return {
    brand: String(vendor || "").toUpperCase(),
    tone: "bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100",
    edge: "shadow-[0_0_0_1px_rgba(148,163,184,0.55),0_0_18px_rgba(100,116,139,0.2)]",
  };
}

function getChipSeriesInfo(name: string, vendor: string): ChipSeriesInfo | null {
  const n = String(name || "").trim();
  if (/snapdragon/i.test(n) || /qualcomm/i.test(vendor)) {
    const suffix = normalizeSnapdragonSuffix(getSnapdragonSuffix(n));
    if (!suffix) return { line1: "SNAPDRAGON" };
    const clean = suffix.replace(/\s+/g, " ").trim();
    const displayHead = (value: string) => value.replace(/\s*\+\s*/g, "+").replace(/\belite\b/gi, "Elite").trim();
    const genMatch = clean.match(/^(.*?)(?:\s+)?gen\s*(\d+)$/i);
    if (genMatch) {
      const rawHead = String(genMatch[1] || "").trim();
      return {
        line1: rawHead ? displayHead(rawHead) : "Snapdragon",
        line2: `GEN ${Number(genMatch[2])}`,
        isPremium: /\belite\b/i.test(rawHead),
      };
    }
    const single = displayHead(clean);
    return { line1: single, isPremium: /\belite\b/i.test(single) };
  }
  if (/exynos/i.test(n) || /samsung/i.test(vendor)) {
    const ex = n.match(/exynos\s+(.+)$/i);
    return ex?.[1] ? { line1: "Exynos", line2: ex[1].trim() } : { line1: "Exynos" };
  }
  if (/tensor/i.test(n) || /google/i.test(vendor)) {
    const g = n.match(/(?:google\s+)?tensor\s+(.+)$/i);
    return g?.[1] ? { line1: `Tensor ${g[1].trim()}` } : { line1: "Tensor" };
  }
  if (/apple/i.test(vendor) || /^apple\s+/i.test(n)) {
    const ap = n.match(/^apple\s+(.+)$/i);
    return ap?.[1] ? { line1: ap[1].trim(), isPremium: true } : { line1: "A-Series", isPremium: true };
  }
  if (/mediatek/i.test(vendor) || /dimensity|helio/i.test(n)) {
    const d = n.match(/dimensity\s+(.+)$/i);
    if (d?.[1]) return { line1: "Dimensity", line2: d[1].trim() };
    const h = n.match(/helio\s+(.+)$/i);
    if (h?.[1]) {
      const parts = h[1].trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 1) return { line1: `Helio ${parts[0] || ""}`.trim() };
      return { line1: `Helio ${parts[0]}`, line2: parts.slice(1).join(" ") };
    }
    return { line1: "MediaTek" };
  }
  if (/unisoc/i.test(vendor) || /unisoc|tiger/i.test(n)) {
    const uni = n.match(/(?:unisoc|tiger)\s+(.+)$/i);
    return uni?.[1] ? { line1: uni[1].trim() } : { line1: "Unisoc" };
  }
  return null;
}

function brandLabel(brand: string): string {
  if (brand === "SNAPDRAGON") return "Snapdragon";
  if (brand === "MEDIATEK") return "MediaTek";
  if (brand === "SAMSUNG") return "Samsung";
  if (brand === "APPLE") return "Apple";
  if (brand === "GOOGLE") return "Google";
  return brand;
}

export default function ProcessorChipVisual({
  name,
  vendor,
  className = "h-28 w-28",
  networkBadge,
}: {
  name: string;
  vendor: string;
  className?: string;
  networkBadge?: string;
}) {
  const tile = getChipTileMeta(name, vendor);
  const series = getChipSeriesInfo(name, vendor);
  const brand = tile.brand;
  const isSnapdragon = brand === "SNAPDRAGON";
  const isSamsung = brand === "SAMSUNG";
  const isGoogle = brand === "GOOGLE";
  const isApple = brand === "APPLE";
  const isMediaTek = brand === "MEDIATEK";
  const isUnisoc = brand === "UNISOC";
  const isMediaTekDimensity = isMediaTek && String(series?.line1 || "").toLowerCase() === "dimensity";
  const isMediaTekHelio = isMediaTek && /^helio/i.test(String(series?.line1 || ""));

  const brandWidth = isApple ? "w-[85%] max-w-[85%]" : "w-[90%] max-w-[90%]";
  const brandClass = isSnapdragon
    ? "bg-none text-white"
    : isGoogle
      ? "bg-none text-[#eef4ff]"
      : isApple
        ? "bg-none text-[#f3f7ff]"
      : isSamsung
        ? "bg-none text-white"
        : isUnisoc
          ? "bg-none text-[#d1fae5]"
          : "bg-gradient-to-r from-[#ffe6a7] via-[#ffd37a] to-[#f5b35c] text-transparent";
  const brandStyle = isSnapdragon
    ? { fontSize: "clamp(8px, 11.5cqw, 18px)" }
    : isGoogle
      ? { fontSize: "clamp(12px, 16cqw, 26px)" }
      : isApple
        ? { fontSize: "clamp(14px, 18cqw, 30px)" }
        : isSamsung
          ? { fontSize: "clamp(11px, 15cqw, 24px)" }
          : isMediaTek
            ? { fontSize: "clamp(10px, 14.5cqw, 22px)" }
            : isUnisoc
              ? { fontSize: "clamp(10px, 13cqw, 20px)" }
              : undefined;

  const seriesPos = isSnapdragon
    ? "right-2 max-w-[52%] text-left"
    : isSamsung
      ? "right-2 max-w-[62%] text-right"
      : isMediaTekDimensity
        ? "right-2 max-w-[62%] text-right"
        : isMediaTekHelio
          ? "right-2 max-w-[62%] text-left"
          : isUnisoc
            ? "right-2 max-w-[58%] text-right"
            : "right-2 max-w-[60%] text-right";
  const seriesWrap = isSnapdragon || isMediaTekHelio ? "flex flex-col items-start gap-0.5 text-left" : isSamsung || isMediaTekDimensity ? "flex flex-col items-end gap-0.5 text-right" : "";

  const line1Style = isSnapdragon
    ? { fontSize: "clamp(7px, 7.4cqw, 14px)" }
    : isGoogle || isApple || isMediaTek
      ? { fontSize: "clamp(8px, 9cqw, 15px)" }
      : isUnisoc
        ? { fontSize: "clamp(7px, 8cqw, 13px)" }
        : isSamsung
          ? { fontSize: "clamp(7px, 8.4cqw, 14px)" }
          : undefined;
  const line2Style = isSnapdragon
    ? { fontSize: "clamp(6px, 6cqw, 11px)" }
    : isSamsung
      ? { fontSize: "clamp(6px, 7.1cqw, 12px)" }
      : isGoogle || isApple || isUnisoc || isMediaTek
        ? { fontSize: "clamp(6px, 6.2cqw, 10px)" }
        : undefined;
  const brandY = isSnapdragon ? "top-[44%]" : "top-1/2";

  return (
    <div className={`relative overflow-hidden rounded-md border border-white/10 [container-type:inline-size] ${className} ${tile.tone} ${tile.edge}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.15),transparent_36%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_15%,rgba(255,255,255,0.06)_35%,transparent_60%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0%,transparent_42%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0.12)_48%,transparent_48%,transparent_100%)]" />

      <div className="relative h-full p-2">
        {networkBadge ? (
          <div className="absolute right-0 top-2 inline-flex min-w-[2.2rem] items-center justify-center text-[10px] font-black uppercase tracking-[0.08em] text-white/95">
            {networkBadge}
          </div>
        ) : null}

        <div
          style={brandStyle}
          className={`absolute left-1/2 ${brandY} -translate-x-1/2 -translate-y-1/2 ${brandWidth} ${isSnapdragon || isGoogle ? "overflow-visible" : "overflow-hidden"} whitespace-nowrap bg-clip-text text-center ${isSnapdragon || isMediaTek ? "font-semibold" : "font-black"} ${isSnapdragon || isApple || isGoogle || isMediaTek ? "" : "uppercase"} ${poppins.className} tracking-[0.02em] leading-[1.08] ${brandClass}`}
        >
          {brandLabel(brand)}
        </div>

        {series ? (
          <div className={`absolute bottom-2 ${seriesPos} leading-tight ${seriesWrap}`}>
            <div style={line1Style} className={`truncate ${poppins.className} ${isSnapdragon ? "font-semibold text-white" : "font-semibold text-slate-100"}`}>
              {series.line1}
            </div>
            {series.line2 ? (
              <div style={line2Style} className={`truncate ${poppins.className} ${isSnapdragon ? "font-bold uppercase text-[#f2f6ff]" : "font-bold text-white"}`}>
                {series.line2}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
