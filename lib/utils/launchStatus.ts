import type { ProductGeneral } from "@/lib/types/content";

export type LaunchState = "upcoming" | "launched" | "unknown";

function clean(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

export function parseLaunchDate(value?: string): Date | null {
  const raw = clean(value);
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const normalized = raw
    .replace(/\(.*?\)/g, "")
    .replace(/expected|official|launch|date|tba/gi, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatLaunchDate(value?: string): string {
  const date = parseLaunchDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLaunchState(general?: ProductGeneral, tags?: string[]): LaunchState {
  const tagSet = new Set((tags || []).map((tag) => clean(tag).toLowerCase()));
  const launchRaw = clean(general?.launchDate).toLowerCase();
  const launchDate = parseLaunchDate(general?.launchDate);

  if (launchDate) {
    return launchDate.getTime() > Date.now() ? "upcoming" : "launched";
  }

  if (tagSet.has("upcoming") || tagSet.has("expected")) return "upcoming";
  if (tagSet.has("launched")) return "launched";
  if (launchRaw.includes("upcoming") || launchRaw.includes("expected")) return "upcoming";
  return "unknown";
}

