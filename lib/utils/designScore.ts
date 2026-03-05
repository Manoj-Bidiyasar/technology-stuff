import type { ProductDesign } from "@/lib/types/content";

type DesignScoreResult = {
  score: number;
  breakdown: {
    build: number;
    thicknessWeight: number;
    ip: number;
    designType: number;
    features: number;
    finish: number;
  };
};

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function getBuildScore(build?: ProductDesign["build"]): number {
  if (!build) return 0;

  const back = normalize(build?.back?.material);
  const frame = normalize(build?.frame);
  const protection = String(build?.back?.protection || "").trim();
  let score = 0;

  if (back.includes("glass") && frame.includes("aluminum")) score = 3.0;
  else if (back.includes("glass")) score = 2.5;
  else if (frame.includes("aluminum")) score = 2.3;
  else score = 1.8;

  if (protection) score += 0.2;
  return Math.min(score, 3.0);
}

function getThicknessScore(depth?: number | number[]): number {
  if (depth === undefined || depth === null) return 0.5;
  const d = Array.isArray(depth) ? Math.max(...depth) : depth;
  if (!Number.isFinite(d)) return 0.5;
  if (d <= 7.5) return 1.0;
  if (d <= 8.5) return 0.8;
  if (d <= 9.5) return 0.6;
  return 0.4;
}

function getWeightScore(weightArray?: ProductDesign["weight"]): number {
  if (!Array.isArray(weightArray) || weightArray.length === 0) return 0.5;
  const values = weightArray.map((item) => Number(item?.value || 0)).filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return 0.5;
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
  if (avg <= 180) return 1.0;
  if (avg <= 200) return 0.8;
  if (avg <= 220) return 0.6;
  return 0.4;
}

function getTypeAwareThicknessWeightScore(design: ProductDesign): number {
  const type = normalize(design.type);
  const isFoldable = type === "foldable";
  const isFlip = type.includes("flip");

  const depth = isFoldable
    ? design?.dimensions?.unfolded?.depth
    : design?.dimensions?.normal?.depth;

  const thicknessScore = getThicknessScore(depth);
  const weightScore = getWeightScore(design.weight);

  if (isFoldable) {
    const hasDualState = Boolean(design?.dimensions?.folded && design?.dimensions?.unfolded);
    const foldBonus = hasDualState ? 0.4 : 0.2;
    return Math.min((thicknessScore * 1.4) + (weightScore * 0.2) + foldBonus, 2.0);
  }

  if (isFlip) {
    const flipBonus = 0.2;
    return Math.min((thicknessScore * 1.1) + (weightScore * 0.7) + flipBonus, 2.0);
  }

  return Math.min(thicknessScore + weightScore, 2.0);
}

function getIPScore(ipList?: string[]): number {
  if (!Array.isArray(ipList) || ipList.length === 0) return 0;
  const normalized = ipList.map((item) => normalize(item));
  if (normalized.includes("ip69") || normalized.includes("ip68")) return 2.0;
  if (normalized.includes("ipx8")) return 1.9;
  if (normalized.includes("ip67")) return 1.6;
  if (normalized.some((item) => item.startsWith("ip5"))) return 1.2;
  return 0;
}

function getDesignTypeScore(type?: string): number {
  const t = normalize(type);
  if (!t) return 0.5;
  if (t.includes("center punch")) return 1.5;
  if (t.includes("dual")) return 1.4;
  if (t.includes("notch")) return 1.0;
  if (t.includes("waterdrop")) return 0.8;
  return 0.6;
}

function getFeatureScore(features: string[] = []): number {
  let score = 0;
  const normalized = features.map((item) => normalize(item));
  if (normalized.includes("alert slider")) score += 0.4;
  if (normalized.includes("rgb light")) score += 0.3;
  if (normalized.includes("gaming trigger")) score += 0.3;
  return Math.min(score, 1.0);
}

function getFinishScore(colors: string[] = []): number {
  const premiumKeywords = ["vegan", "leather", "matte", "ceramic"];
  const hasPremium = colors.some((color) => premiumKeywords.some((key) => normalize(color).includes(key)));
  return hasPremium ? 0.5 : 0;
}

export function calculateDesignScore(data: { design?: ProductDesign }): DesignScoreResult {
  const design = data?.design || {};
  const buildScore = getBuildScore(design.build);
  const thicknessWeightScore = getTypeAwareThicknessWeightScore(design);
  const ipScore = getIPScore(design.ipRating);
  const designTypeScore = getDesignTypeScore(design.designType);
  const featureScore = getFeatureScore(design.otherFeatures || []);
  const finishScore = getFinishScore(design.colors || []);

  const total = Math.min(
    buildScore + thicknessWeightScore + ipScore + designTypeScore + featureScore + finishScore,
    10,
  );

  return {
    score: round2(total),
    breakdown: {
      build: round2(buildScore),
      thicknessWeight: round2(thicknessWeightScore),
      ip: round2(ipScore),
      designType: round2(designTypeScore),
      features: round2(featureScore),
      finish: round2(finishScore),
    },
  };
}
