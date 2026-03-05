import type { MemoryStorage, MemoryVariant } from "@/lib/types/content";

function toNumber(value: string | number | undefined | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function maxFrom(values: Array<string | undefined>): number | null {
  const nums = values
    .map((value) => toNumber(value))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

function bestFrom<T extends string>(values: T[], rankMap: Record<string, number>): T | "" {
  let best: T | "" = "";
  let bestRank = -1;

  values.forEach((value) => {
    const key = String(value || "").toLowerCase();
    const rank = rankMap[key] ?? -1;
    if (rank > bestRank) {
      bestRank = rank;
      best = value;
    }
  });

  return best;
}

export function calculateStorageScore(input: { memoryStorage?: MemoryStorage; variants?: MemoryVariant[] }) {
  const variants = Array.isArray(input.variants) ? input.variants : [];
  const memoryStorage = input.memoryStorage || {};

  const variantRam = variants.map((variant) => variant.ram || "");
  const variantStorage = variants.map((variant) => variant.storage || "");
  const variantRamTypes = variants.map((variant) => variant.ramType || "").filter(Boolean);
  const variantStorageTypes = variants.map((variant) => variant.storageType || "").filter(Boolean);

  const ramValues = variantRam.length > 0 ? variantRam : (memoryStorage.ram || []);
  const storageValues = variantStorage.length > 0 ? variantStorage : (memoryStorage.internalStorage || []);
  const ramTypes = variantRamTypes.length > 0 ? variantRamTypes : (memoryStorage.ramType || []);
  const storageTypes = variantStorageTypes.length > 0 ? variantStorageTypes : (memoryStorage.storageType || []);

  const maxRam = maxFrom(ramValues) || 0;
  const maxStorage = maxFrom(storageValues) || 0;

  let ramScore = 0;
  if (maxRam <= 4 && maxRam > 0) ramScore = 0.5;
  else if (maxRam === 6) ramScore = 1;
  else if (maxRam === 8) ramScore = 2;
  else if (maxRam === 12) ramScore = 2.5;
  else if (maxRam >= 16) ramScore = 3;

  const ramTypeRank: Record<string, number> = {
    "lpddr4x": 1,
    "lpddr5": 1.5,
    "lpddr5x": 2,
  };
  const bestRamType = bestFrom(ramTypes, ramTypeRank);
  const ramTypeScore = ramTypeRank[String(bestRamType).toLowerCase()] || 0;

  let storageScore = 0;
  if (maxStorage >= 512) storageScore = 3;
  else if (maxStorage >= 256) storageScore = 2.5;
  else if (maxStorage >= 128) storageScore = 1.5;
  else if (maxStorage >= 64) storageScore = 0.5;

  const storageTypeRank: Record<string, number> = {
    "emmc 5.1": 0.5,
    "ufs 2.2": 1,
    "ufs 3.1": 1.5,
    "ufs 4.0": 2,
  };
  const bestStorageType = bestFrom(storageTypes, storageTypeRank);
  const storageTypeScore = storageTypeRank[String(bestStorageType).toLowerCase()] || 0;

  const total = ramScore + ramTypeScore + storageScore + storageTypeScore;

  return {
    score: Math.max(0, Math.min(10, Math.round(total * 10) / 10)),
    breakdown: {
      ram: ramScore,
      ramType: ramTypeScore,
      storage: storageScore,
      storageType: storageTypeScore,
    },
  };
}
