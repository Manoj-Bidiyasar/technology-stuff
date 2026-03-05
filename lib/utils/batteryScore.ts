import type { Product, ProductBattery } from "@/lib/types/content";

export type BatteryScorePart = {
  score: number;
  max: number;
};

export type BatteryScoreResult = {
  score: number;
  label: "Excellent" | "Very Good" | "Good" | "Average" | "Poor";
  breakdown: {
    capacity: number;
    charging: number;
    charger: number;
    wireless: number;
  };
};

const RAW_MAX = 9.5;

function toNumber(value: string | number | undefined | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score: number): BatteryScoreResult["label"] {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Very Good";
  if (score >= 7) return "Good";
  if (score >= 6) return "Average";
  return "Poor";
}

export function scoreBatteryCapacity(capacity?: string | number): BatteryScorePart {
  const value = toNumber(capacity);
  if (!value) return { score: 0, max: 4 };
  if (value < 4000) return { score: 1, max: 4 };
  if (value < 4500) return { score: 2, max: 4 };
  if (value < 5000) return { score: 3, max: 4 };
  if (value < 6000) return { score: 3.5, max: 4 };
  return { score: 4, max: 4 };
}

export function scoreBatteryCharging(charging?: string | number): BatteryScorePart {
  const value = toNumber(charging);
  if (!value) return { score: 0, max: 3 };
  if (value < 18) return { score: 0.5, max: 3 };
  if (value < 30) return { score: 1, max: 3 };
  if (value < 50) return { score: 1.5, max: 3 };
  if (value < 80) return { score: 2, max: 3 };
  if (value < 100) return { score: 2.5, max: 3 };
  return { score: 3, max: 3 };
}

export function scoreBatteryChargerInBox(available?: boolean): BatteryScorePart {
  return { score: available ? 1 : 0, max: 1 };
}

export function scoreBatteryWireless(supported?: boolean, maxPower?: string | number): BatteryScorePart {
  if (!supported) return { score: 0, max: 1.5 };

  const power = toNumber(maxPower);
  if (!power) return { score: 0.5, max: 1.5 };
  if (power < 15) return { score: 0.5, max: 1.5 };
  if (power < 30) return { score: 1, max: 1.5 };
  return { score: 1.5, max: 1.5 };
}

export function calculateBatteryScore(battery?: ProductBattery): BatteryScoreResult {
  const source = battery || {};

  const capacity = scoreBatteryCapacity(source.capacity);
  const charging = scoreBatteryCharging(source.maxChargingSupport);
  const charger = scoreBatteryChargerInBox(source.chargerInBox?.available);
  const wireless = scoreBatteryWireless(source.wireless?.supported, source.wireless?.maxPower);

  const raw = capacity.score + charging.score + charger.score + wireless.score;
  const score = round1(clamp((raw / RAW_MAX) * 10, 0, 10));

  return {
    score,
    label: scoreLabel(score),
    breakdown: {
      capacity: round1(capacity.score),
      charging: round1(charging.score),
      charger: round1(charger.score),
      wireless: round1(wireless.score),
    },
  };
}

export function fallbackBatteryFromProduct(product: Pick<Product, "specs" | "battery">): ProductBattery {
  const battery = product.battery;
  const hasBatteryData =
    Boolean(String(battery?.capacity || "").trim()) ||
    Boolean(String(battery?.type || "").trim()) ||
    Boolean(String(battery?.maxChargingSupport || "").trim()) ||
    (battery?.chargingSpeed ? Object.keys(battery.chargingSpeed).length > 0 : false) ||
    Boolean(battery?.chargerInBox?.available) ||
    Boolean(String(battery?.chargerInBox?.power || "").trim()) ||
    Boolean(battery?.wireless?.supported) ||
    Boolean(String(battery?.wireless?.maxPower || "").trim()) ||
    (battery?.wireless?.speed ? Object.keys(battery.wireless.speed).length > 0 : false) ||
    ((battery?.features || []).length > 0);

  if (hasBatteryData) return product.battery || {};

  return {
    capacity: product.specs?.battery || "",
    type: "",
    maxChargingSupport: product.specs?.charging || "",
    chargingSpeed: {},
    chargerInBox: {
      available: false,
      power: "",
    },
    wireless: {
      supported: false,
      maxPower: "",
      speed: {},
    },
    features: [],
  };
}
