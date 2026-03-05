import type { Product, ProductRatings } from "@/lib/types/content";
import { averageRating } from "@/lib/utils/format";
import { calculateBatteryScore, fallbackBatteryFromProduct } from "@/lib/utils/batteryScore";
import { calculateDesignScore } from "@/lib/utils/designScore";
import { calculateDisplayScore } from "@/lib/utils/displayScore";
import { calculateFrontCameraScore, fallbackFrontCameraFromProduct } from "@/lib/utils/frontCameraScore";
import { calculateNetworkScore } from "@/lib/utils/networkScore";
import { calculatePerformanceScore, fallbackPerformanceFromProduct } from "@/lib/utils/performanceScore";
import { calculateRearCameraScore, fallbackRearCameraFromProduct } from "@/lib/utils/rearCameraScore";
import { calculateSecurityAndSensorScore } from "@/lib/utils/securitySensorScore";
import { calculateSoftwareScore } from "@/lib/utils/softwareScore";
import { calculateStorageScore } from "@/lib/utils/storageScore";
import { fallbackDisplayFromSpecs, toDisplayObject } from "@/lib/utils/display";
import { fallbackMemoryFromProduct } from "@/lib/utils/storage";

export function calculateOverallScore(ratings?: ProductRatings): number {
  return averageRating(ratings);
}

const OVERALL_WEIGHTS = {
  performance: 20,
  display: 15,
  battery: 8,
  rearCamera: 16,
  frontCamera: 4,
  software: 10,
  storage: 11,
  design: 10,
  network: 3,
  security: 3,
} as const;

export type OverallSectionBreakdown = {
  key: keyof typeof OVERALL_WEIGHTS;
  label: string;
  score10: number;
  weight: number;
  weighted: number;
};

export type OverallScoreBreakdown = {
  score: number;
  sections: OverallSectionBreakdown[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toWeighted(score10: number, weight: number): number {
  return round1((Math.max(0, Math.min(10, score10)) / 10) * weight);
}

export function calculateOverallBreakdown100(product: Product): OverallScoreBreakdown {
  const effectivePerformance = fallbackPerformanceFromProduct({ performance: product.performance, specs: product.specs });
  const performance = calculatePerformanceScore({ performance: effectivePerformance }).score;

  const effectiveDisplay = toDisplayObject(product.display || fallbackDisplayFromSpecs(product.specs));
  const display = calculateDisplayScore({ display: effectiveDisplay, displays: product.displays }).score;

  const effectiveBattery = fallbackBatteryFromProduct({ specs: product.specs, battery: product.battery });
  const battery = calculateBatteryScore(effectiveBattery).score;

  const effectiveRearCamera = fallbackRearCameraFromProduct({ rearCamera: product.rearCamera, camera: product.camera, specs: product.specs });
  const rearCamera = calculateRearCameraScore({ rearCamera: effectiveRearCamera }).score;

  const effectiveFrontCamera = fallbackFrontCameraFromProduct({ frontCamera: product.frontCamera, camera: product.camera, specs: product.specs });
  const frontCamera = calculateFrontCameraScore({ frontCamera: effectiveFrontCamera }).score;

  const software = calculateSoftwareScore({ software: product.software }).score;
  const storage = calculateStorageScore(fallbackMemoryFromProduct({ specs: product.specs, memoryStorage: product.memoryStorage, variants: product.variants })).score;
  const design = calculateDesignScore({ design: product.design }).score;
  const network = calculateNetworkScore({ network: product.network }).score;
  const security = calculateSecurityAndSensorScore({ security: product.security, sensors: product.sensors }).total;

  const sections: OverallSectionBreakdown[] = [
    { key: "performance", label: "Perf", score10: performance, weight: OVERALL_WEIGHTS.performance, weighted: toWeighted(performance, OVERALL_WEIGHTS.performance) },
    { key: "display", label: "Display", score10: display, weight: OVERALL_WEIGHTS.display, weighted: toWeighted(display, OVERALL_WEIGHTS.display) },
    { key: "battery", label: "Battery", score10: battery, weight: OVERALL_WEIGHTS.battery, weighted: toWeighted(battery, OVERALL_WEIGHTS.battery) },
    { key: "rearCamera", label: "Rear Cam", score10: rearCamera, weight: OVERALL_WEIGHTS.rearCamera, weighted: toWeighted(rearCamera, OVERALL_WEIGHTS.rearCamera) },
    { key: "frontCamera", label: "Front Cam", score10: frontCamera, weight: OVERALL_WEIGHTS.frontCamera, weighted: toWeighted(frontCamera, OVERALL_WEIGHTS.frontCamera) },
    { key: "software", label: "Software", score10: software, weight: OVERALL_WEIGHTS.software, weighted: toWeighted(software, OVERALL_WEIGHTS.software) },
    { key: "storage", label: "Storage", score10: storage, weight: OVERALL_WEIGHTS.storage, weighted: toWeighted(storage, OVERALL_WEIGHTS.storage) },
    { key: "design", label: "Design", score10: design, weight: OVERALL_WEIGHTS.design, weighted: toWeighted(design, OVERALL_WEIGHTS.design) },
    { key: "network", label: "Network", score10: network, weight: OVERALL_WEIGHTS.network, weighted: toWeighted(network, OVERALL_WEIGHTS.network) },
    { key: "security", label: "Security", score10: security, weight: OVERALL_WEIGHTS.security, weighted: toWeighted(security, OVERALL_WEIGHTS.security) },
  ];

  const total = round1(sections.reduce((sum, item) => sum + item.weighted, 0));
  return { score: Math.min(total, 100), sections };
}

export function calculateOverallScore100(product: Product): number {
  return calculateOverallBreakdown100(product).score;
}

export function getComparisonWinner(products: Product[]): Product | null {
  if (products.length === 0) return null;

  const scored = products.map((product) => {
    const ratings = product.ratings || {};
    const ratingScore = calculateOverallScore100(product);
    const performance = ratings.performance || 0;
    const camera = ratings.camera || 0;
    const battery = ratings.battery || 0;
    const display = ratings.display || 0;
    const priceBonus = product.price > 0 ? Math.max(0, 120 - product.price / 1000) : 0;
    const total = ratingScore + performance + camera + battery + display + priceBonus;
    return { product, total };
  });

  scored.sort((a, b) => b.total - a.total);
  return scored[0]?.product ?? null;
}
