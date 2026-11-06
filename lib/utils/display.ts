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

/** Formats RAM or storage for display, treating a bare number as GB. */
export function formatMemoryCapacity(value?: string | number): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)GB$/i);
  if (match) {
    const gb = Number(match[1]);
    if (Number.isFinite(gb) && gb >= 1024) {
      const tb = gb / 1024;
      return `${Number.isInteger(tb) ? tb : Number(tb.toFixed(1))}TB`;
    }
    return `${match[1]}GB`;
  }
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const gb = Number(raw);
    if (Number.isFinite(gb) && gb >= 1024) {
      const tb = gb / 1024;
      return `${Number.isInteger(tb) ? tb : Number(tb.toFixed(1))}TB`;
    }
    return `${raw}GB`;
  }
  return raw;
}

function normalizePanel(panel?: ProductDisplayPanel): ProductDisplayPanel {
  return {
    role: panel?.role,
    posturesVisible: panel?.posturesVisible,
    type: panel?.type,
    size: panel?.sizeInches ?? panel?.size,
    sizeInches: panel?.sizeInches,
    sizeCm: panel?.sizeCm,
    resolution: panel?.resolution,
    resolutionWidth: panel?.resolutionWidth,
    resolutionHeight: panel?.resolutionHeight,
    resolutionLabel: panel?.resolutionLabel,
    refreshRate: panel?.refreshRate,
    adaptiveRefreshRate: panel?.adaptiveRefreshRate,
    adaptive: panel?.adaptive,
    brightness: panel?.brightness,
    peakBrightness: panel?.peakBrightness,
    protection: panel?.protection,
    hdr: Array.isArray(panel?.hdr) ? panel.hdr : [],
    pixelDensity: panel?.pixelDensity,
    screenToBody: panel?.screenToBody,
    aspectRatio: panel?.aspectRatio,
    touchSamplingRate: panel?.touchSamplingRate,
    instantTouchSamplingRate: panel?.instantTouchSamplingRate,
    curved: panel?.curved,
    curvedDegree: panel?.curvedDegree,
    colorGamut: Array.isArray(panel?.colorGamut) ? panel.colorGamut : [],
    colorDepth: panel?.colorDepth,
    displayModes: Array.isArray(panel?.displayModes) ? panel.displayModes : [],
    colorProfiles: Array.isArray(panel?.colorProfiles) ? panel.colorProfiles : [],
    dimming: Array.isArray(panel?.dimming) ? panel.dimming : [],
    includeDimmingInOtherFeatures: panel?.includeDimmingInOtherFeatures,
    includeAlwaysOnDisplayInOtherFeatures: panel?.includeAlwaysOnDisplayInOtherFeatures,
    includePalmRejectionInOtherFeatures: panel?.includePalmRejectionInOtherFeatures,
    alwaysOnDisplay: Array.isArray(panel?.alwaysOnDisplay) ? panel.alwaysOnDisplay : [],
    alwaysOnDisplayHz: panel?.alwaysOnDisplayHz,
    stylus: panel?.stylus,
    extras: Array.isArray(panel?.extras) ? panel.extras : [],
    certifications: Array.isArray(panel?.certifications) ? panel.certifications : [],
    others: Array.isArray(panel?.others) ? panel.others : [],
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
