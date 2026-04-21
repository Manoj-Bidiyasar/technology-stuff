import type { ProcessorDetail } from "@/lib/processors/details";

export type EfficiencyScoreInput = {
  fabricationNm?: number;
  process?: string;
  instructionSet?: string;
  architectureBits?: string;
  coreConfiguration?: string;
  cores?: string;
};

export type MemoryStorageScoreInput = {
  memoryType?: string;
  memoryTypes?: string[];
  memoryFreqMhz?: number;
  memoryFreqByType?: Record<string, number | string>;
  memoryBusWidthBits?: number;
  totalRamBusWidthBits?: number;
  storageType?: string;
  storageTypes?: string[];
  frequencyReferenceMhz?: number;
};

export type MemoryStorageScoreBreakdown = {
  score: number;
  selectedMemoryType?: string;
  selectedMemoryFrequencyMhz?: number;
  selectedStorageType?: string;
  selectedBusWidthBits?: number;
  memoryTypeScore?: number;
  memoryFrequencyScore?: number;
  storageTypeScore?: number;
  busWidthScore?: number;
};

export type GamingScoreReferences = {
  gpuFlopsReference: number;
  wildLifeReference: number;
  antutuGpuReference: number;
  memoryFrequencyReference: number;
};

export type PerformanceScoreReferences = {
  antutuReference: number;
  geekbenchSingleReference: number;
  geekbenchMultiReference: number;
  maxCpuGhzReference: number;
  memoryFrequencyReference: number;
};

export type AiScoreReferences = {
  aiBenchmarkReference: number;
  memoryFrequencyReference: number;
};

export type GamingScoreInput = {
  fabricationNm?: number;
  process?: string;
  instructionSet?: string;
  architectureBits?: string;
  coreConfiguration?: string;
  cores?: string;
  memoryType?: string;
  memoryTypes?: string[];
  memoryFreqMhz?: number;
  memoryFreqByType?: Record<string, number | string>;
  memoryBusWidthBits?: number;
  totalRamBusWidthBits?: number;
  storageType?: string;
  storageTypes?: string[];
  gpuFlops?: string;
  wildLifeScore?: number;
  antutu11GpuScore?: number;
};

export type GamingScoreBreakdown = {
  score: number;
  gpuComputeScore?: number;
  gpuBenchmarkScore?: number;
  memoryStorageScore?: number;
  efficiencyScore?: number;
  benchmarkSource?: "wild-life" | "antutu-11-gpu";
};

export type PerformanceScoreInput = {
  processorName?: string;
  antutuScore?: number;
  antutuFallbackScore?: number;
  geekbenchSingle?: number;
  geekbenchMulti?: number;
  maxCpuGhz?: number;
  fabricationNm?: number;
  process?: string;
  instructionSet?: string;
  architectureBits?: string;
  coreConfiguration?: string;
  cores?: string;
  memoryType?: string;
  memoryTypes?: string[];
  memoryFreqMhz?: number;
  memoryFreqByType?: Record<string, number | string>;
  memoryBusWidthBits?: number;
  totalRamBusWidthBits?: number;
  storageType?: string;
  storageTypes?: string[];
};

export type PerformanceScoreBreakdown = {
  score: number;
  antutuScore?: number;
  geekbenchScore?: number;
  memoryStorageScore?: number;
  efficiencyScore?: number;
  estimatedCpuScore?: number;
};

export type AiScoreInput = {
  processorName?: string;
  aiBenchmarkScore?: number;
  fabricationNm?: number;
  process?: string;
  instructionSet?: string;
  architectureBits?: string;
  coreConfiguration?: string;
  cores?: string;
  memoryType?: string;
  memoryTypes?: string[];
  memoryFreqMhz?: number;
  memoryFreqByType?: Record<string, number | string>;
  memoryBusWidthBits?: number;
  totalRamBusWidthBits?: number;
  storageType?: string;
  storageTypes?: string[];
};

export type AiScoreBreakdown = {
  score: number;
  aiBenchmarkScore?: number;
  memoryStorageScore?: number;
  efficiencyScore?: number;
  generationHintScore?: number;
};

export type TotalScoreInput = {
  performance?: number;
  gaming?: number;
  efficiency?: number;
  ai?: number;
};

export const PROCESSOR_TOTAL_SCORE_LABEL = "Technology Stuff Score";

const TOTAL_SCORE_WEIGHTS = {
  performance: 0.45,
  gaming: 0.30,
  efficiency: 0.15,
  ai: 0.10,
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizedText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeLookupKey(value: unknown): string {
  return normalizedText(value).replace(/[^a-z0-9]+/g, "");
}

function toRoundedNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

function extractNumberFromText(value: unknown): number | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const match = raw.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function splitValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[|,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function scoreFabricationEfficiency(nm?: number): number {
  if (!Number.isFinite(nm)) return 60;
  if ((nm as number) <= 2) return 100;
  if ((nm as number) <= 3) return 96;
  if ((nm as number) <= 4) return 90;
  if ((nm as number) <= 5) return 82;
  if ((nm as number) <= 6) return 74;
  if ((nm as number) <= 7) return 66;
  if ((nm as number) <= 8) return 60;
  if ((nm as number) <= 10) return 50;
  if ((nm as number) <= 14) return 40;
  return 30;
}

export function scoreArchitectureEfficiency(input: Pick<EfficiencyScoreInput, "instructionSet" | "architectureBits" | "coreConfiguration" | "cores" | "fabricationNm">): number {
  const instructionSet = normalizedText(input.instructionSet);
  if (instructionSet) {
    if (instructionSet.includes("armv9.3")) return 100;
    if (instructionSet.includes("armv9.2")) return 97;
    if (instructionSet.includes("armv9")) return 92;
    if (instructionSet.includes("armv8.6")) return 85;
    if (instructionSet.includes("armv8.2")) return 78;
    if (instructionSet.includes("armv8")) return 70;
  }

  const coreText = `${normalizedText(input.coreConfiguration)} ${normalizedText(input.cores)}`.trim();
  if (coreText) {
    if (/\bx925\b|\bx4\b|\ba725\b|\ba720\b|\ba520\b/.test(coreText)) return 98;
    if (/\bx3\b|\ba715\b|\ba510\b/.test(coreText)) return 93;
    if (/\bx2\b|\ba710\b/.test(coreText)) return 87;
    if (/\bx1\b|\ba78\b|\ba77\b|\ba76\b|\ba55\b/.test(coreText)) return 78;
  }

  if (Number.isFinite(input.fabricationNm)) {
    const nm = Number(input.fabricationNm);
    if (nm <= 3) return 95;
    if (nm <= 4) return 90;
    if (nm <= 5) return 84;
    if (nm <= 6) return 78;
    if (nm <= 7) return 72;
    return 68;
  }

  const bits = normalizedText(input.architectureBits);
  if (bits.includes("64")) return 76;
  if (bits.includes("32")) return 58;

  return 72;
}

export function calculateEfficiencyScore(input: EfficiencyScoreInput): number {
  const fabricationScore = scoreFabricationEfficiency(input.fabricationNm);
  const architectureScore = scoreArchitectureEfficiency(input);
  return clampScore(fabricationScore * 0.75 + architectureScore * 0.25);
}

function scoreClockPerformance(maxCpuGhz?: number, referenceGhz = 4.5): number | undefined {
  if (!Number.isFinite(maxCpuGhz) || (maxCpuGhz as number) <= 0) return undefined;
  const safeReference = Number.isFinite(referenceGhz) && referenceGhz > 0 ? referenceGhz : 4.5;
  return clampScore(40 + 60 * (Number(maxCpuGhz) / safeReference));
}

function scoreProcessorNameGeneration(processorName?: string): number | undefined {
  const raw = String(processorName || "").trim();
  if (!raw) return undefined;
  const text = raw.toLowerCase();

  const snapdragonEliteGenMatch = text.match(/\bsnapdragon\s+8\s+elite\b(?:\s+gen\s*(\d+))?/);
  if (snapdragonEliteGenMatch) {
    const eliteGen = Number(snapdragonEliteGenMatch[1] || 1);
    return clampScore(96 + Math.max(0, eliteGen - 1) * 1.5);
  }

  const snapdragonGenMatch = text.match(/\bsnapdragon\s+(\d+)(?:\+|s)?\s+gen\s*(\d+)\b/);
  if (snapdragonGenMatch) {
    const series = Number(snapdragonGenMatch[1] || 0);
    const gen = Number(snapdragonGenMatch[2] || 0);
    if (series >= 8) return clampScore(84 + gen * 3);
    if (series >= 7) return clampScore(76 + gen * 3);
    return clampScore(70 + gen * 2.5);
  }

  const genMatch = text.match(/\bgen\s*(\d+)\b/);
  if (genMatch?.[1]) return clampScore(70 + Number(genMatch[1]) * 4);

  const tensorMatch = text.match(/\btensor\s*g\s*(\d+)\b/);
  if (tensorMatch?.[1]) return clampScore(72 + Number(tensorMatch[1]) * 4);

  const appleMatch = text.match(/\ba(\d{2})\b/);
  if (appleMatch?.[1]) return clampScore(65 + (Number(appleMatch[1]) - 10) * 3);

  const seriesMatch = text.match(/\b(dimensity|exynos)\s*(\d{4})\b/);
  if (seriesMatch?.[2]) {
    const series = Number(seriesMatch[2]);
    const family = String(seriesMatch[1] || "");
    if (family === "dimensity") return clampScore(78 + ((series % 1000) / 50));
    return clampScore(74 + ((series % 1000) / 60));
  }

  const unisocMatch = text.match(/\bt\s*(\d{3,4})\b/);
  if (text.includes("unisoc") && unisocMatch?.[1]) {
    const series = Number(unisocMatch[1]);
    return clampScore(60 + ((series % 1000) / 12));
  }

  return undefined;
}

function scoreCpuArchitecturePerformance(input: Pick<PerformanceScoreInput, "instructionSet" | "coreConfiguration" | "cores" | "processorName">): number {
  const instructionSet = normalizedText(input.instructionSet);
  const coreText = `${normalizedText(input.coreConfiguration)} ${normalizedText(input.cores)}`.trim();
  const processorName = normalizedText(input.processorName);
  const generationHint = scoreProcessorNameGeneration(input.processorName);

  let base = 74;
  if (/\bsnapdragon\s+8\s+elite\b/.test(processorName)) base = 98;
  if (/\bx925\b/.test(coreText)) base = 100;
  else if (/\bx4\b/.test(coreText)) base = 96;
  else if (/\bx3\b/.test(coreText)) base = 91;
  else if (/\bx2\b/.test(coreText)) base = 86;
  else if (/\bx1\b/.test(coreText)) base = 81;
  else if (/\ba725\b/.test(coreText)) base = Math.max(base, 94);
  else if (/\ba720\b/.test(coreText)) base = Math.max(base, 90);
  else if (/\ba715\b/.test(coreText)) base = Math.max(base, 86);
  else if (/\ba710\b/.test(coreText)) base = Math.max(base, 82);
  else if (/\ba78\b/.test(coreText)) base = Math.max(base, 78);
  else if (/\ba77\b|\ba76\b/.test(coreText)) base = Math.max(base, 72);

  if (instructionSet.includes("armv9.3")) base = Math.max(base, 98);
  else if (instructionSet.includes("armv9.2")) base = Math.max(base, 95);
  else if (instructionSet.includes("armv9")) base = Math.max(base, 91);
  else if (instructionSet.includes("armv8.6")) base = Math.max(base, 84);
  else if (instructionSet.includes("armv8.2")) base = Math.max(base, 78);

  if (Number.isFinite(generationHint)) {
    base = Math.max(base, Number(generationHint));
  }

  return clampScore(base);
}

const MEMORY_TYPE_SCORES: Array<{ pattern: RegExp; label: string; score: number; rank: number }> = [
  { pattern: /\blpddr6\b/i, label: "LPDDR6", score: 100, rank: 7 },
  { pattern: /\blpddr5t\b/i, label: "LPDDR5T", score: 98, rank: 6 },
  { pattern: /\blpddr5x\b/i, label: "LPDDR5X", score: 95, rank: 5 },
  { pattern: /\blpddr5\b/i, label: "LPDDR5", score: 88, rank: 4 },
  { pattern: /\blpddr4x\b/i, label: "LPDDR4X", score: 76, rank: 3 },
  { pattern: /\blpddr4\b/i, label: "LPDDR4", score: 68, rank: 2 },
  { pattern: /\blpddr3\b/i, label: "LPDDR3", score: 52, rank: 1 },
];

const STORAGE_TYPE_SCORES: Array<{ pattern: RegExp; label: string; score: number; rank: number }> = [
  { pattern: /\bnvme\b/i, label: "NVMe", score: 100, rank: 9 },
  { pattern: /\bufs\s*4\.1\b/i, label: "UFS 4.1", score: 97, rank: 8 },
  { pattern: /\bufs\s*4\.0\b|\bufs\s*4\b/i, label: "UFS 4.0", score: 94, rank: 7 },
  { pattern: /\bufs\s*3\.1\b/i, label: "UFS 3.1", score: 84, rank: 6 },
  { pattern: /\bufs\s*3\.0\b|\bufs\s*3\b/i, label: "UFS 3.0", score: 78, rank: 5 },
  { pattern: /\bufs\s*2\.2\b/i, label: "UFS 2.2", score: 68, rank: 4 },
  { pattern: /\bufs\s*2\.1\b/i, label: "UFS 2.1", score: 62, rank: 3 },
  { pattern: /\bemmc\s*5\.1\b/i, label: "eMMC 5.1", score: 50, rank: 2 },
  { pattern: /\bemmc\s*5\.0\b|\bemmc\s*5\b/i, label: "eMMC 5.0", score: 45, rank: 1 },
];

function matchMemoryType(value: string): { label: string; score: number; rank: number } | undefined {
  return MEMORY_TYPE_SCORES.find((item) => item.pattern.test(value));
}

function matchStorageType(value: string): { label: string; score: number; rank: number } | undefined {
  return STORAGE_TYPE_SCORES.find((item) => item.pattern.test(value));
}

function pickBestValue(
  values: string[],
  matcher: (value: string) => { label: string; score: number; rank: number } | undefined
): { raw: string; label: string; score: number; rank: number } | undefined {
  let best: { raw: string; label: string; score: number; rank: number } | undefined;
  values.forEach((value) => {
    const match = matcher(value);
    if (!match) return;
    if (!best || match.rank > best.rank) {
      best = { raw: value, label: match.label, score: match.score, rank: match.rank };
    }
  });
  return best;
}

function getMemoryTypeCandidates(input: MemoryStorageScoreInput): string[] {
  const values = [...splitValues(input.memoryType), ...splitValues(input.memoryTypes)];
  return Array.from(new Set(values));
}

function getStorageTypeCandidates(input: MemoryStorageScoreInput): string[] {
  const values = [...splitValues(input.storageType), ...splitValues(input.storageTypes)];
  return Array.from(new Set(values));
}

function findFrequencyForMemoryType(
  selectedMemoryType: string | undefined,
  memoryFreqByType: Record<string, number | string> | undefined,
  fallbackFrequency: number | undefined
): number | undefined {
  if (!selectedMemoryType) return fallbackFrequency;
  const selectedKey = normalizeLookupKey(selectedMemoryType);
  const byTypeEntries = Object.entries(memoryFreqByType || {});
  for (const [key, value] of byTypeEntries) {
    if (normalizeLookupKey(key) === selectedKey) {
      const num = toRoundedNumber(value);
      if (num) return num;
    }
  }
  return fallbackFrequency;
}

export function calculateDynamicFrequencyReference(
  frequenciesMhz: number[],
  baselineMhz = 5333
): number {
  const values = frequenciesMhz.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (values.length === 0) return baselineMhz;
  const percentileIndex = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * 0.95) - 1));
  const percentileValue = values[percentileIndex];
  return Math.max(baselineMhz, percentileValue);
}

export function parseGpuFlopsToGflops(value?: string): number | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const num = extractNumberFromText(raw);
  if (!Number.isFinite(num)) return undefined;
  if (/tflops?/i.test(raw)) return Number(num) * 1000;
  return Number(num);
}

function calculateDynamicReference(values: number[], baseline: number): number {
  const filtered = values.filter((value) => Number.isFinite(value) && value > 0);
  if (filtered.length === 0) return baseline;
  return calculateDynamicFrequencyReference(filtered, baseline);
}

export function scoreMemoryType(value?: string): number | undefined {
  if (!value) return undefined;
  const match = matchMemoryType(value);
  if (match) return match.score;
  if (/lpddr/i.test(value)) return 72;
  return undefined;
}

export function scoreStorageType(value?: string): number | undefined {
  if (!value) return undefined;
  const match = matchStorageType(value);
  if (match) return match.score;
  if (/ufs|emmc|nvme/i.test(value)) return 60;
  return undefined;
}

export function scoreMemoryFrequency(frequencyMhz?: number, referenceMhz = 5333): number | undefined {
  if (!Number.isFinite(frequencyMhz) || (frequencyMhz as number) <= 0) return undefined;
  const safeReference = Number.isFinite(referenceMhz) && referenceMhz > 0 ? referenceMhz : 5333;
  return clampScore(40 + 60 * (Number(frequencyMhz) / safeReference));
}

export function scoreBusWidth(bits?: number): number | undefined {
  if (!Number.isFinite(bits) || (bits as number) <= 0) return undefined;
  if ((bits as number) >= 64) return 100;
  if ((bits as number) >= 32) return 80;
  if ((bits as number) >= 16) return 40;
  return 30;
}

export function calculateMemoryStorageScore(input: MemoryStorageScoreInput): MemoryStorageScoreBreakdown {
  const bestMemory = pickBestValue(getMemoryTypeCandidates(input), matchMemoryType);
  const bestStorage = pickBestValue(getStorageTypeCandidates(input), matchStorageType);
  const selectedMemoryType = bestMemory?.label;
  const selectedMemoryFrequencyMhz = findFrequencyForMemoryType(
    selectedMemoryType,
    input.memoryFreqByType,
    toRoundedNumber(input.memoryFreqMhz)
  );
  const selectedBusWidthBits = toRoundedNumber(input.totalRamBusWidthBits) || toRoundedNumber(input.memoryBusWidthBits);
  const referenceFrequencyMhz = Number.isFinite(input.frequencyReferenceMhz) && Number(input.frequencyReferenceMhz) > 0
    ? Number(input.frequencyReferenceMhz)
    : 5333;

  const componentScores: Array<{ weight: number; score?: number }> = [
    { weight: 0.4, score: bestMemory?.score ?? scoreMemoryType(selectedMemoryType) },
    { weight: 0.3, score: bestStorage?.score ?? scoreStorageType(bestStorage?.label) },
    { weight: 0.2, score: scoreMemoryFrequency(selectedMemoryFrequencyMhz, referenceFrequencyMhz) },
    { weight: 0.1, score: scoreBusWidth(selectedBusWidthBits) },
  ];

  const available = componentScores.filter((item) => Number.isFinite(item.score));
  if (available.length === 0) {
    return { score: 68 };
  }

  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = available.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / totalWeight;

  return {
    score: clampScore(weightedScore),
    selectedMemoryType,
    selectedMemoryFrequencyMhz,
    selectedStorageType: bestStorage?.label,
    selectedBusWidthBits,
    memoryTypeScore: bestMemory?.score ?? scoreMemoryType(selectedMemoryType),
    memoryFrequencyScore: scoreMemoryFrequency(selectedMemoryFrequencyMhz, referenceFrequencyMhz),
    storageTypeScore: bestStorage?.score,
    busWidthScore: scoreBusWidth(selectedBusWidthBits),
  };
}

export function calculateGamingScoreReferences(details: ProcessorDetail[]): GamingScoreReferences {
  const gpuFlops = details.map((detail) => parseGpuFlopsToGflops(detail.gpuFlops)).filter((value): value is number => Number.isFinite(value));
  const wildLife = details.map((detail) => Number(detail.benchmarks?.threeDMarkWildLife || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const antutu11Gpu = details
    .map((detail) => Number(detail.benchmarks?.antutuCalcGpu || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const memoryFrequencies = details.flatMap((detail) => {
    const values: number[] = [];
    const direct = toRoundedNumber(detail.memoryFreqMhz);
    if (direct) values.push(direct);
    Object.values(detail.memoryFreqByType || {}).forEach((value) => {
      const parsed = toRoundedNumber(value);
      if (parsed) values.push(parsed);
    });
    return values;
  });

  return {
    gpuFlopsReference: calculateDynamicReference(gpuFlops, 6000),
    wildLifeReference: calculateDynamicReference(wildLife, 20000),
    antutuGpuReference: calculateDynamicReference(antutu11Gpu, 1000000),
    memoryFrequencyReference: calculateDynamicFrequencyReference(memoryFrequencies, 5333),
  };
}

export function calculatePerformanceScoreReferences(
  details: ProcessorDetail[],
  profileAntutuScores: number[],
  profileMaxCpuGhz: number[]
): PerformanceScoreReferences {
  const antutuScores = [
    ...details.map((detail) => Number(detail.benchmarks?.antutuCalc || detail.benchmarks?.antutu || 0)),
    ...profileAntutuScores,
  ].filter((value) => Number.isFinite(value) && value > 0);
  const geekbenchSingle = details
    .map((detail) => Number(detail.benchmarks?.geekbenchSingle || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const geekbenchMulti = details
    .map((detail) => Number(detail.benchmarks?.geekbenchMulti || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxCpuGhzValues = profileMaxCpuGhz.filter((value) => Number.isFinite(value) && value > 0);
  const memoryFrequencies = details.flatMap((detail) => {
    const values: number[] = [];
    const direct = toRoundedNumber(detail.memoryFreqMhz);
    if (direct) values.push(direct);
    Object.values(detail.memoryFreqByType || {}).forEach((value) => {
      const parsed = toRoundedNumber(value);
      if (parsed) values.push(parsed);
    });
    return values;
  });

  return {
    antutuReference: calculateDynamicReference(antutuScores, 3000000),
    geekbenchSingleReference: calculateDynamicReference(geekbenchSingle, 3500),
    geekbenchMultiReference: calculateDynamicReference(geekbenchMulti, 12000),
    maxCpuGhzReference: calculateDynamicReference(maxCpuGhzValues, 4.5),
    memoryFrequencyReference: calculateDynamicFrequencyReference(memoryFrequencies, 5333),
  };
}

export function calculateAiScoreReferences(details: ProcessorDetail[]): AiScoreReferences {
  const aiBenchmarks = details
    .map((detail) => Number(detail.benchmarks?.aiScore || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const memoryFrequencies = details.flatMap((detail) => {
    const values: number[] = [];
    const direct = toRoundedNumber(detail.memoryFreqMhz);
    if (direct) values.push(direct);
    Object.values(detail.memoryFreqByType || {}).forEach((value) => {
      const parsed = toRoundedNumber(value);
      if (parsed) values.push(parsed);
    });
    return values;
  });

  return {
    aiBenchmarkReference: calculateDynamicReference(aiBenchmarks, 350000),
    memoryFrequencyReference: calculateDynamicFrequencyReference(memoryFrequencies, 5333),
  };
}

function scoreNormalizedMetric(value?: number, reference = 100): number | undefined {
  if (!Number.isFinite(value) || (value as number) <= 0) return undefined;
  const safeReference = Number.isFinite(reference) && reference > 0 ? reference : 100;
  return clampScore(40 + 60 * (Number(value) / safeReference));
}

export function calculateGamingScore(
  input: GamingScoreInput,
  references: GamingScoreReferences
): GamingScoreBreakdown {
  const gpuComputeScore = scoreNormalizedMetric(
    parseGpuFlopsToGflops(input.gpuFlops),
    references.gpuFlopsReference
  );
  const wildLifeScore = scoreNormalizedMetric(input.wildLifeScore, references.wildLifeReference);
  const antutuGpuScore = scoreNormalizedMetric(input.antutu11GpuScore, references.antutuGpuReference);
  const gpuBenchmarkScore = wildLifeScore ?? antutuGpuScore;
  const benchmarkSource = wildLifeScore ? "wild-life" : (antutuGpuScore ? "antutu-11-gpu" : undefined);
  const memoryStorageScore = calculateMemoryStorageScore({
    memoryType: input.memoryType,
    memoryTypes: input.memoryTypes,
    memoryFreqMhz: input.memoryFreqMhz,
    memoryFreqByType: input.memoryFreqByType,
    memoryBusWidthBits: input.memoryBusWidthBits,
    totalRamBusWidthBits: input.totalRamBusWidthBits,
    storageType: input.storageType,
    storageTypes: input.storageTypes,
    frequencyReferenceMhz: references.memoryFrequencyReference,
  }).score;
  const efficiencyScore = calculateEfficiencyScore({
    fabricationNm: input.fabricationNm,
    process: input.process,
    instructionSet: input.instructionSet,
    architectureBits: input.architectureBits,
    coreConfiguration: input.coreConfiguration,
    cores: input.cores,
  });

  const components: Array<{ weight: number; score?: number }> = [
    { weight: 0.4, score: gpuComputeScore },
    { weight: 0.3, score: gpuBenchmarkScore },
    { weight: 0.2, score: memoryStorageScore },
    { weight: 0.1, score: efficiencyScore },
  ];
  const available = components.filter((item) => Number.isFinite(item.score));
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight > 0
    ? clampScore(available.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / totalWeight)
    : 68;

  return {
    score,
    gpuComputeScore,
    gpuBenchmarkScore,
    memoryStorageScore,
    efficiencyScore,
    benchmarkSource,
  };
}

export function calculatePerformanceScore(
  input: PerformanceScoreInput,
  references: PerformanceScoreReferences
): PerformanceScoreBreakdown {
  const memoryStorageScore = calculateMemoryStorageScore({
    memoryType: input.memoryType,
    memoryTypes: input.memoryTypes,
    memoryFreqMhz: input.memoryFreqMhz,
    memoryFreqByType: input.memoryFreqByType,
    memoryBusWidthBits: input.memoryBusWidthBits,
    totalRamBusWidthBits: input.totalRamBusWidthBits,
    storageType: input.storageType,
    storageTypes: input.storageTypes,
    frequencyReferenceMhz: references.memoryFrequencyReference,
  }).score;
  const efficiencyScore = calculateEfficiencyScore({
    fabricationNm: input.fabricationNm,
    process: input.process,
    instructionSet: input.instructionSet,
    architectureBits: input.architectureBits,
    coreConfiguration: input.coreConfiguration,
    cores: input.cores,
  });

  const antutuRaw = Number(input.antutuScore || input.antutuFallbackScore || 0);
  const antutuScore = scoreNormalizedMetric(antutuRaw, references.antutuReference);
  const geekbenchSingleScore = scoreNormalizedMetric(input.geekbenchSingle, references.geekbenchSingleReference);
  const geekbenchMultiScore = scoreNormalizedMetric(input.geekbenchMulti, references.geekbenchMultiReference);
  const geekbenchComponents: Array<{ weight: number; score?: number }> = [
    { weight: 0.4, score: geekbenchSingleScore },
    { weight: 0.6, score: geekbenchMultiScore },
  ];
  const availableGeekbench = geekbenchComponents.filter((item) => Number.isFinite(item.score));
  const geekbenchWeight = availableGeekbench.reduce((sum, item) => sum + item.weight, 0);
  const geekbenchScore = geekbenchWeight > 0
    ? clampScore(availableGeekbench.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / geekbenchWeight)
    : undefined;

  const cpuArchitectureScore = scoreCpuArchitecturePerformance({
    instructionSet: input.instructionSet,
    coreConfiguration: input.coreConfiguration,
    cores: input.cores,
    processorName: input.processorName,
  });
  const cpuClockScore = scoreClockPerformance(input.maxCpuGhz, references.maxCpuGhzReference);
  const generationHintScore = scoreProcessorNameGeneration(input.processorName);
  const estimatedCpuComponents: Array<{ weight: number; score?: number }> = [
    { weight: 0.5, score: cpuArchitectureScore },
    { weight: 0.2, score: cpuClockScore },
    { weight: 0.15, score: generationHintScore },
    { weight: 0.15, score: efficiencyScore },
  ];
  const availableEstimatedCpu = estimatedCpuComponents.filter((item) => Number.isFinite(item.score));
  const estimatedCpuWeight = availableEstimatedCpu.reduce((sum, item) => sum + item.weight, 0);
  const estimatedCpuScore = estimatedCpuWeight > 0
    ? clampScore(availableEstimatedCpu.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / estimatedCpuWeight)
    : undefined;

  const missingBenchmarkWeight = (antutuScore ? 0 : 0.45) + (geekbenchScore ? 0 : 0.30);
  const components: Array<{ weight: number; score?: number }> = [
    { weight: 0.45, score: antutuScore },
    { weight: 0.30, score: geekbenchScore },
    { weight: 0.15, score: memoryStorageScore },
    { weight: 0.10, score: efficiencyScore },
    { weight: missingBenchmarkWeight, score: estimatedCpuScore },
  ];
  const available = components.filter((item) => Number.isFinite(item.score));
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight > 0
    ? clampScore(available.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / totalWeight)
    : 68;

  return {
    score,
    antutuScore,
    geekbenchScore,
    memoryStorageScore,
    efficiencyScore,
    estimatedCpuScore,
  };
}

export function calculateAiScore(
  input: AiScoreInput,
  references: AiScoreReferences
): AiScoreBreakdown {
  const aiBenchmarkScore = scoreNormalizedMetric(input.aiBenchmarkScore, references.aiBenchmarkReference);
  const memoryStorageScore = calculateMemoryStorageScore({
    memoryType: input.memoryType,
    memoryTypes: input.memoryTypes,
    memoryFreqMhz: input.memoryFreqMhz,
    memoryFreqByType: input.memoryFreqByType,
    memoryBusWidthBits: input.memoryBusWidthBits,
    totalRamBusWidthBits: input.totalRamBusWidthBits,
    storageType: input.storageType,
    storageTypes: input.storageTypes,
    frequencyReferenceMhz: references.memoryFrequencyReference,
  }).score;
  const efficiencyScore = calculateEfficiencyScore({
    fabricationNm: input.fabricationNm,
    process: input.process,
    instructionSet: input.instructionSet,
    architectureBits: input.architectureBits,
    coreConfiguration: input.coreConfiguration,
    cores: input.cores,
  });
  const generationHintScore = scoreProcessorNameGeneration(input.processorName);

  const fallbackComponents: Array<{ weight: number; score?: number }> = [
    { weight: 0.35, score: generationHintScore },
    { weight: 0.40, score: memoryStorageScore },
    { weight: 0.25, score: efficiencyScore },
  ];
  const availableFallback = fallbackComponents.filter((item) => Number.isFinite(item.score));
  const fallbackWeight = availableFallback.reduce((sum, item) => sum + item.weight, 0);
  const fallbackScore = fallbackWeight > 0
    ? clampScore(availableFallback.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / fallbackWeight)
    : 68;

  return {
    score: aiBenchmarkScore ?? fallbackScore,
    aiBenchmarkScore,
    memoryStorageScore,
    efficiencyScore,
    generationHintScore,
  };
}

export function calculateTotalScore(input: TotalScoreInput): number {
  const components: Array<{ weight: number; score?: number }> = [
    { weight: TOTAL_SCORE_WEIGHTS.performance, score: input.performance },
    { weight: TOTAL_SCORE_WEIGHTS.gaming, score: input.gaming },
    { weight: TOTAL_SCORE_WEIGHTS.efficiency, score: input.efficiency },
    { weight: TOTAL_SCORE_WEIGHTS.ai, score: input.ai },
  ];
  const available = components.filter((item) => Number.isFinite(item.score));
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) return 0;

  return clampScore(
    available.reduce((sum, item) => sum + ((item.score as number) * item.weight), 0) / totalWeight
  );
}
