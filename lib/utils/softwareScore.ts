import type { ProductSoftware } from "@/lib/types/content";

type SoftwareScoreResult = {
  score: number;
  breakdown: {
    osUpdates: number;
    securityUpdates: number;
    osVersion: number;
    ui: number;
  };
};

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function parseVersion(value?: string): number {
  const match = String(value || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function getOSUpdateScore(years?: number): number {
  if (!years) return 0;
  if (years >= 5) return 4;
  if (years === 4) return 3.5;
  if (years === 3) return 3;
  if (years === 2) return 2;
  if (years === 1) return 1;
  return 0;
}

function getSecurityUpdateScore(years?: number): number {
  if (!years) return 0;
  if (years >= 5) return 3;
  if (years === 4) return 2.5;
  if (years === 3) return 2;
  if (years === 2) return 1.5;
  if (years === 1) return 1;
  return 0;
}

function getOSVersionScore(currentVersion: number, latestVersion: number): number {
  if (!currentVersion || !latestVersion) return 0.5;
  const diff = latestVersion - currentVersion;
  if (diff <= 0) return 2;
  if (diff === 1) return 1.5;
  if (diff === 2) return 1;
  return 0.5;
}

function getUIScore(ui?: string | null, osName?: string): number {
  const os = normalize(osName);
  if (os === "ios") return 1;

  const value = String(ui || "").trim();
  if (!value) return 0.5;
  const lower = normalize(value);

  const cleanUI = ["pixel ui", "oxygenos", "nothing os"];
  const balancedUI = ["one ui"];
  const heavyUI = ["miui", "coloros", "funtouch os"];

  if (cleanUI.some((item) => lower.includes(item))) return 1;
  if (balancedUI.some((item) => lower.includes(item))) return 0.8;
  if (heavyUI.some((item) => lower.includes(item))) return 0.6;
  return 0.7;
}

export function calculateSoftwareScore(data: { software?: ProductSoftware }): SoftwareScoreResult {
  const software = data?.software || {};
  const osYears = software?.updates?.os;
  const secYears = software?.updates?.security;
  const osNameRaw = software?.os?.name || "";
  const osName = normalize(osNameRaw) === "ios" ? "iOS" : normalize(osNameRaw) === "android" ? "Android" : osNameRaw;
  const currentVersion = parseVersion(software?.os?.version);
  const ui = software?.ui;

  const latestVersions: Record<string, number> = {
    Android: 16,
    iOS: 18,
  };

  const latestVersion = latestVersions[osName] || currentVersion;
  const osUpdateScore = getOSUpdateScore(osYears);
  const securityScore = getSecurityUpdateScore(secYears);
  const versionScore = getOSVersionScore(currentVersion, latestVersion);
  const uiScore = getUIScore(ui, osName);
  const total = osUpdateScore + securityScore + versionScore + uiScore;

  return {
    score: round2(total),
    breakdown: {
      osUpdates: round2(osUpdateScore),
      securityUpdates: round2(securityScore),
      osVersion: round2(versionScore),
      ui: round2(uiScore),
    },
  };
}
