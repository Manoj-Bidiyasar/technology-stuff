import type { ProductDisplay, ProductDisplayPanel } from "@/lib/types/content";

export function formatResolution(resolution?: string): string {
  const raw = String(resolution || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/(\d{3,4})[x*](\d{3,4})/);
  if (!match) return raw;

  const width = Number(match[1]);
  const height = Number(match[2]);
  const maxEdge = Math.max(width, height);

  let label = "";
  if (maxEdge >= 3800) label = "UHD+";
  else if (maxEdge >= 3000) label = "QHD+";
  else if (maxEdge >= 2300) label = "FHD+";

  return label ? `${raw} (${label})` : raw;
}

export function formatRefreshRate(value?: string | number, adaptive?: boolean): string {
  if (value === undefined || value === null || value === "") return "";

  const text = String(value).trim();
  if (!text) return "";

  if (/^\d+\s*-\s*\d+$/.test(text)) {
    const [min, max] = text.split("-").map((item) => item.trim());
    return `${min}\u2013${max}Hz (Adaptive)`;
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return adaptive ? `${numeric}Hz (Adaptive)` : `${numeric}Hz`;
  }

  return adaptive ? `${text} (Adaptive)` : text;
}

export function formatBoolean(value?: boolean): string {
  return value ? "Yes" : "No";
}

function normalizePanel(panel?: ProductDisplayPanel): ProductDisplayPanel {
  return {
    type: panel?.type,
    size: panel?.size,
    resolution: panel?.resolution,
    refreshRate: panel?.refreshRate,
    adaptive: panel?.adaptive,
    peakBrightness: panel?.peakBrightness,
    protection: panel?.protection,
    hdr: Array.isArray(panel?.hdr) ? panel?.hdr : [],
    pixelDensity: panel?.pixelDensity,
    screenToBody: panel?.screenToBody,
    aspectRatio: panel?.aspectRatio,
    touchSamplingRate: panel?.touchSamplingRate,
    curved: panel?.curved,
    extras: Array.isArray(panel?.extras) ? panel?.extras : [],
    certifications: Array.isArray(panel?.certifications) ? panel?.certifications : [],
    others: Array.isArray(panel?.others) ? panel?.others : [],
  };
}

export function toDisplayObject(display?: ProductDisplay): ProductDisplay {
  return {
    ...normalizePanel(display),
    primary: display?.primary ? normalizePanel(display.primary) : undefined,
    secondary: display?.secondary ? normalizePanel(display.secondary) : undefined,
  };
}

export function fallbackDisplayFromSpecs(specs: {
  display?: string;
  primaryDisplay?: string;
  secondaryDisplay?: string;
  displaySizeInch?: number;
  refreshRateHz?: number;
}): ProductDisplay {
  const splitDisplay = String(specs.display || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const primaryDisplay = specs.primaryDisplay || splitDisplay[0];
  const secondaryDisplay = specs.secondaryDisplay || splitDisplay[1];

  return {
    type: specs.display,
    size: specs.displaySizeInch,
    refreshRate: specs.refreshRateHz,
    primary: primaryDisplay
      ? {
          type: primaryDisplay,
          size: specs.displaySizeInch,
          refreshRate: specs.refreshRateHz,
        }
      : undefined,
    secondary: secondaryDisplay
      ? {
          type: secondaryDisplay,
          refreshRate: specs.refreshRateHz,
        }
      : undefined,
  };
}
