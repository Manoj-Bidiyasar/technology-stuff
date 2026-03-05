import type { Product, ProductPerformance } from "@/lib/types/content";

export type PerformanceScoreResult = {
  score: number;
  breakdown: {
    chipset: number;
    gpu: number;
    antutu: number;
    fabrication: number;
  };
};

const exactChipsetMap: Record<string, number> = {
  "snapdragon 8 gen 3": 4,
  "dimensity 9300": 4,
  "snapdragon 8 gen 2": 3.5,
  "dimensity 9200": 3.5,
};

const tierRules: Array<{ pattern: string; score: number }> = [
  { pattern: "snapdragon 8 gen", score: 4 },
  { pattern: "dimensity 9", score: 4 },
  { pattern: "snapdragon 7+", score: 3 },
  { pattern: "dimensity 8", score: 3 },
  { pattern: "snapdragon 6", score: 2 },
  { pattern: "helio g", score: 1.5 },
];

const gpuMap: Record<string, number> = {
  "adreno 750": 2,
  "immortalis-g720": 2,
  "adreno 740": 1.5,
  "mali-g710": 1.5,
  "adreno 660": 1,
  "mali-g610": 1,
};

const chipsetGpuMap: Record<string, number> = {
  "snapdragon 8 gen 3": 2,
  "dimensity 9300": 2,
  "snapdragon 8 gen 2": 1.8,
  "dimensity 8200": 1.5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseNumber(value?: string | number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalize(text?: string): string {
  return String(text || "").trim().toLowerCase();
}

function scoreAntutuValue(antutu?: number): number {
  if (!antutu || antutu <= 0) return 0;
  if (antutu >= 2500000) return 3;
  if (antutu >= 2000000) return 2.6;
  if (antutu >= 1500000) return 2.2;
  if (antutu >= 1000000) return 1.8;
  if (antutu >= 500000) return 1.5;
  return 1;
}

function scoreChipsetValue(chipset?: string, antutu?: number): number {
  const key = normalize(chipset);
  if (key && exactChipsetMap[key] !== undefined) return exactChipsetMap[key];

  for (const rule of tierRules) {
    if (key.includes(rule.pattern.toLowerCase())) {
      return rule.score;
    }
  }

  if (antutu && antutu > 0) {
    if (antutu >= 2500000) return 4;
    if (antutu >= 2000000) return 3.5;
    if (antutu >= 1500000) return 3;
    if (antutu >= 1000000) return 2.5;
    if (antutu >= 500000) return 2;
    return 1;
  }

  return key ? 1 : 0;
}

function scoreGpuValue(gpu?: string, chipset?: string, antutu?: number): number {
  const gpuKey = normalize(gpu);
  if (gpuKey && gpuMap[gpuKey] !== undefined) return gpuMap[gpuKey];

  const chipsetKey = normalize(chipset);
  if (chipsetKey && chipsetGpuMap[chipsetKey] !== undefined) return chipsetGpuMap[chipsetKey];

  if (antutu && antutu > 0) {
    if (antutu >= 2500000) return 2;
    if (antutu >= 2000000) return 1.8;
    if (antutu >= 1500000) return 1.5;
    if (antutu >= 1000000) return 1.2;
    return 0.8;
  }

  return gpuKey || chipsetKey ? 0.8 : 0;
}

function scoreFabricationValue(fabrication?: string): number {
  const nm = parseNumber(fabrication);
  if (!nm || nm <= 0) return 0;
  if (nm <= 3) return 1;
  if (nm <= 4) return 0.9;
  if (nm <= 5) return 0.8;
  if (nm <= 6) return 0.6;
  return 0.4;
}

export function calculatePerformanceScore(input: { performance?: ProductPerformance }): PerformanceScoreResult {
  const performance = input.performance || {};
  const antutuTotal = parseNumber(performance.antutu?.total) || 0;

  const chipsetScore = scoreChipsetValue(performance.chipset, antutuTotal);
  const gpuScore = scoreGpuValue(performance.gpu, performance.chipset, antutuTotal);
  const fabricationScore = scoreFabricationValue(performance.fabrication);
  const antutuScore = antutuTotal > 0 ? scoreAntutuValue(antutuTotal) : (chipsetScore / 4) * 3;

  const raw = chipsetScore + gpuScore + antutuScore + fabricationScore;
  const score = round1(clamp(raw, 0, 10));

  return {
    score,
    breakdown: {
      chipset: round1(clamp(chipsetScore, 0, 4)),
      gpu: round1(clamp(gpuScore, 0, 2)),
      antutu: round1(clamp(antutuScore, 0, 3)),
      fabrication: round1(clamp(fabricationScore, 0, 1)),
    },
  };
}

export function fallbackPerformanceFromProduct(product: Pick<Product, "performance" | "specs">): ProductPerformance {
  const p = product.performance;
  const hasText =
    Boolean(String(p?.chipset || "").trim()) ||
    Boolean(String(p?.fabrication || "").trim()) ||
    Boolean(String(p?.architecture || "").trim()) ||
    Boolean(String(p?.gpu || "").trim()) ||
    Boolean(String(p?.gpuFrequency || "").trim());
  const hasCpu = Array.isArray(p?.cpu) && p!.cpu!.some((item) => String(item || "").trim());
  const hasAntutu = Boolean(
    (p?.antutu?.total && p.antutu.total > 0) ||
      (p?.antutu?.cpu && p.antutu.cpu > 0) ||
      (p?.antutu?.gpu && p.antutu.gpu > 0) ||
      (p?.antutu?.memory && p.antutu.memory > 0) ||
      (p?.antutu?.ux && p.antutu.ux > 0),
  );

  if (p && (hasText || hasCpu || hasAntutu)) {
    return product.performance;
  }

  return {
    chipset: product.specs?.processor || "",
    additionalChips: [],
    fabrication: "",
    architecture: "",
    cpu: [],
    gpu: "",
    gpuFrequency: "",
    coolingSystem: "",
    otherFeatures: [],
    antutu: {
      total: parseNumber(product.specs?.chipsetScore) || 0,
      cpu: 0,
      gpu: 0,
      memory: 0,
      ux: 0,
    },
  };
}
