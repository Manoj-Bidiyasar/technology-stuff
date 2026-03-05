import type { Product, ProductDisplay, ProductDisplayPanel } from "@/lib/types/content";

export type DisplayScorePart = {
  score: number;
  max: number;
};

export type DisplayScoreBreakdown = {
  type: number;
  refresh: number;
  brightness: number;
  resolution: number;
  hdr: number;
  extras: number;
};

export type DisplayScoreResult = {
  score: number;
  label: "Excellent" | "Very Good" | "Good" | "Average" | "Poor";
  breakdown: DisplayScoreBreakdown;
};

const RAW_MAX = 11;

function toNumber(value: string | number | undefined | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreToLabel(score: number): DisplayScoreResult["label"] {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Very Good";
  if (score >= 7) return "Good";
  if (score >= 6) return "Average";
  return "Poor";
}

function normalizePart(value: DisplayScorePart): DisplayScorePart {
  return {
    max: value.max,
    score: round1(clamp(value.score, 0, value.max)),
  };
}

export function scoreType(type?: string): DisplayScorePart {
  const text = String(type || "").toLowerCase();
  if (!text) return { score: 0, max: 3 };

  if (text.includes("ltpo") && (text.includes("amoled") || text.includes("oled"))) {
    return { score: 3, max: 3 };
  }

  if (text.includes("amoled") || text.includes("oled")) {
    return { score: 2.5, max: 3 };
  }

  if (text.includes("ips")) {
    return { score: 1.5, max: 3 };
  }

  return { score: 1, max: 3 };
}

export function scoreRefreshRate(refreshRate?: string | number, adaptive?: boolean): DisplayScorePart {
  const text = String(refreshRate || "").trim().toLowerCase();
  if (!text) return { score: 0, max: 2.5 };

  let hz = toNumber(text) || 0;
  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) hz = Number(range[2]);

  let score = 0;
  if (hz >= 144) score = 2.5;
  else if (hz >= 120) score = 2;
  else if (hz >= 90) score = 1;
  else if (hz >= 60) score = 0.5;

  const isAdaptive = Boolean(adaptive) || Boolean(range) || text.includes("adaptive");
  if (isAdaptive) score += 0.3;

  return normalizePart({ score, max: 2.5 });
}

export function scoreBrightness(peakBrightness?: string | number): DisplayScorePart {
  const nits = toNumber(peakBrightness);
  if (!nits) return { score: 0, max: 2 };

  if (nits < 800) return { score: 0.5, max: 2 };
  if (nits < 1500) return { score: 1, max: 2 };
  if (nits < 2500) return { score: 1.5, max: 2 };
  return { score: 2, max: 2 };
}

export function scoreResolution(resolution?: string): DisplayScorePart {
  const text = String(resolution || "").toLowerCase();
  if (!text) return { score: 0, max: 2 };

  if (text.includes("4k") || text.includes("uhd")) return { score: 2, max: 2 };
  if (text.includes("qhd")) return { score: 1.5, max: 2 };
  if (text.includes("fhd")) return { score: 1, max: 2 };
  if (text.includes("hd")) return { score: 0.5, max: 2 };

  const match = text.match(/(\d{3,4})\s*[x*]\s*(\d{3,4})/);
  if (!match) return { score: 0, max: 2 };
  const maxEdge = Math.max(Number(match[1]), Number(match[2]));

  if (maxEdge >= 3800) return { score: 2, max: 2 };
  if (maxEdge >= 3000) return { score: 1.5, max: 2 };
  if (maxEdge >= 2200) return { score: 1, max: 2 };
  return { score: 0.5, max: 2 };
}

export function scoreHDR(hdr?: string[]): DisplayScorePart {
  const list = (hdr || []).map((item) => String(item || "").toLowerCase());
  if (list.length === 0) return { score: 0, max: 1 };

  if (list.some((item) => item.includes("dolby vision") || item.includes("hdr10+"))) {
    return { score: 1, max: 1 };
  }

  if (list.some((item) => item.includes("hdr10") || item.includes("hdr"))) {
    return { score: 0.5, max: 1 };
  }

  return { score: 0, max: 1 };
}

export function scoreExtras(extras?: string[]): DisplayScorePart {
  const list = (extras || []).map((item) => String(item || "").toLowerCase().trim()).filter(Boolean);
  if (list.length === 0) return { score: 0, max: 0.5 };

  const allowedTokens = ["10-bit", "dolby vision", "dci-p3"];
  const blockedTokens = ["ltpo", "amoled", "oled", "hz", "refresh", "pro xdr", "ips"];

  let validCount = 0;
  for (const entry of list) {
    if (blockedTokens.some((token) => entry.includes(token))) continue;
    if (allowedTokens.some((token) => entry.includes(token))) validCount += 1;
  }

  return normalizePart({ score: validCount * 0.2, max: 0.5 });
}

function panelHasData(panel?: ProductDisplayPanel): boolean {
  if (!panel) return false;
  return Object.values(panel).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function extractPanels(product: Pick<Product, "display" | "displays">): ProductDisplayPanel[] {
  if (Array.isArray(product.displays) && product.displays.length > 0) {
    return product.displays.filter(panelHasData);
  }

  const display = (product.display || {}) as ProductDisplay;
  if (panelHasData(display.primary) || panelHasData(display.secondary)) {
    return [display.primary || {}, display.secondary || {}].filter(panelHasData);
  }

  return panelHasData(display) ? [display] : [];
}

function normalizeFinal(raw: number): number {
  return round1(clamp((raw / RAW_MAX) * 10, 0, 10));
}

export function calculateSingleDisplayScore(display: ProductDisplayPanel): DisplayScoreResult {
  const type = scoreType(display?.type);
  const refresh = scoreRefreshRate(display?.refreshRate, display?.adaptive);
  const brightness = scoreBrightness(display?.peakBrightness);
  const resolution = scoreResolution(display?.resolution);
  const hdr = scoreHDR(display?.hdr);
  const extras = scoreExtras(display?.extras);

  const rawScore = type.score + refresh.score + brightness.score + resolution.score + hdr.score + extras.score;
  const score = normalizeFinal(rawScore);

  return {
    score,
    label: scoreToLabel(score),
    breakdown: {
      type: round1(type.score),
      refresh: round1(refresh.score),
      brightness: round1(brightness.score),
      resolution: round1(resolution.score),
      hdr: round1(hdr.score),
      extras: round1(extras.score),
    },
  };
}

export function calculateDisplayScore(product: Pick<Product, "display" | "displays">): DisplayScoreResult {
  const panels = extractPanels(product);
  if (panels.length === 0) {
    return {
      score: 0,
      label: "Poor",
      breakdown: { type: 0, refresh: 0, brightness: 0, resolution: 0, hdr: 0, extras: 0 },
    };
  }

  const scoredPanels = panels.map((panel) => calculateSingleDisplayScore(panel));

  // Very important fix: single-display must never be weighted/penalized.
  if (scoredPanels.length === 1) {
    return scoredPanels[0];
  }

  const main = scoredPanels[0];
  const secondary = scoredPanels[1];
  const score = round1(clamp(main.score * 0.8 + secondary.score * 0.2 + 0.2, 0, 10));

  return {
    score,
    label: scoreToLabel(score),
    breakdown: {
      type: round1(main.breakdown.type * 0.8 + secondary.breakdown.type * 0.2),
      refresh: round1(main.breakdown.refresh * 0.8 + secondary.breakdown.refresh * 0.2),
      brightness: round1(main.breakdown.brightness * 0.8 + secondary.breakdown.brightness * 0.2),
      resolution: round1(main.breakdown.resolution * 0.8 + secondary.breakdown.resolution * 0.2),
      hdr: round1(main.breakdown.hdr * 0.8 + secondary.breakdown.hdr * 0.2),
      extras: round1(main.breakdown.extras * 0.8 + secondary.breakdown.extras * 0.2),
    },
  };
}
