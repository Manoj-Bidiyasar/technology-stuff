import type { Product } from "@/lib/types/content";
import { calculateOverallBreakdown100 } from "@/lib/utils/score";

type ProsCons = {
  pros: string[];
  cons: string[];
};

function toNumber(value: unknown): number {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function buildAutoProsCons(product: Product): ProsCons {
  const result = calculateOverallBreakdown100(product);
  const byKey = Object.fromEntries(result.sections.map((item) => [item.key, item.score10])) as Record<string, number>;

  const performance = byKey.performance || 0;
  const display = byKey.display || 0;
  const batteryScore = byKey.battery || 0;
  const rearCamera = byKey.rearCamera || 0;
  const software = byKey.software || 0;

  const batteryCapacity =
    toNumber(product?.battery?.capacity) ||
    toNumber(product?.specs?.battery);
  const chargingWatt =
    toNumber(product?.battery?.maxChargingSupport) ||
    toNumber(product?.specs?.charging);
  const hasChargerInBox = Boolean(product?.battery?.chargerInBox?.available);
  const price = Number(product?.price || 0);
  const osUpdates = Number(product?.software?.updates?.os || 0);

  const pros: string[] = [];
  const cons: string[] = [];

  if (display >= 8) pros.push("Great display quality for media and daily use");
  if (performance >= 8) pros.push("Strong performance for multitasking and gaming");
  if (rearCamera >= 8) pros.push("Reliable rear camera performance");
  if (batteryScore >= 8 || batteryCapacity >= 5000) pros.push("Good battery backup");
  if (software >= 8 || osUpdates >= 4) pros.push("Long software update support");
  if (chargingWatt >= 80) pros.push("Very fast charging support");

  if (price >= 80000) cons.push("Premium pricing");
  if (chargingWatt > 0 && chargingWatt < 45) cons.push("Charging speed could be faster");
  if (!hasChargerInBox) cons.push("No charger in the box");
  if (batteryCapacity > 0 && batteryCapacity < 4500) cons.push("Battery capacity is average for heavy users");
  if (software < 6 && osUpdates > 0 && osUpdates <= 2) cons.push("Short software support cycle");

  const finalPros = unique(pros).slice(0, 5);
  const finalCons = unique(cons).slice(0, 5);

  if (finalPros.length === 0) finalPros.push("Balanced overall experience");
  if (finalCons.length === 0) finalCons.push("No major drawbacks found");

  return { pros: finalPros, cons: finalCons };
}

