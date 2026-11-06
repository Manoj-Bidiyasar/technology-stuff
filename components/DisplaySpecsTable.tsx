"use client";

import { useMemo, useState } from "react";
import type { ProductDisplay, ProductDisplayPanel } from "@/lib/types/content";
import { formatBoolean, formatRefreshRate, formatResolution, toDisplayObject } from "@/lib/utils/display";

type DisplaySpecsTableProps = {
  display?: ProductDisplay;
  displays?: ProductDisplayPanel[];
};

function withUnit(value: string | number | undefined, unit: string): string {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  return text.toLowerCase().includes(unit.toLowerCase()) ? text : `${text} ${unit}`;
}

function formatPanelResolution(panel: ProductDisplayPanel): string {
  const height = panel.resolutionHeight;
  const width = panel.resolutionWidth;
  const dimensions = height !== undefined && height !== "" && width !== undefined && width !== ""
    ? `${height} x ${width}`
    : String(panel.resolution || "").trim();
  const dimensionText = dimensions.replace(/\s*\u00d7\s*/g, " x ");
  const formatted = formatResolution(dimensionText);
  const selectedClass = panel.resolutionLabel?.trim();
  const inferredClass = formatted.match(/\(([^)]+)\)$/)?.[1];
  const resolutionClass = selectedClass || inferredClass;
  const rawDimensions = dimensionText.replace(/\s+\([^)]+\)$/, "").trim();
  if (resolutionClass && rawDimensions) return `${resolutionClass} (${rawDimensions})`;
  if (resolutionClass) return resolutionClass;
  return dimensionText || formatted;
}

function formatAdaptiveRange(value?: string | number): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const values = text.split(/[\/,]/).map((item) => item.trim()).filter(Boolean);
  if (values.length > 1) return `${values.join("/")} Hz`;
  const range = text.match(/^(\d+(?:\.\d+)?)\s*[-\u2013\u2014]\s*(\d+(?:\.\d+)?)(?:\s*Hz)?$/i);
  if (range) return `${range[1]}-${range[2]} Hz`;
  return /Hz$/i.test(text) ? text : `${text} Hz`;
}

function formatSamplingRate(value?: string | number): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /Hz$/i.test(text) ? text.replace(/\s+Hz$/i, "Hz") : `${text}Hz`;
}

function formatRefreshRateRow(panel: ProductDisplayPanel): string {
  return formatRefreshRate(panel.refreshRate, false).replace(/(\d)Hz\b/g, "$1 Hz");
}

function hasPanelData(panel?: ProductDisplayPanel): boolean {
  if (!panel) return false;
  return Object.values(panel).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function listValue(value?: string[]): string {
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean).join(", ") : "";
}

function formatBrightness(panel: ProductDisplayPanel): string {
  const brightness = panel.brightness;
  const values = [
    ["Typical", withUnit(brightness?.typical, "nits")],
    ["HDR", withUnit(brightness?.hdr, "nits")],
    ["Max rated", withUnit(brightness?.maxRated, "nits")],
    ["Peak", withUnit(brightness?.peak ?? panel.peakBrightness, "nits")],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
  return values.map(([label, value]) => `${label}: ${value}`).join(" \u00b7 ");
}

function formatColorCoverage(panel: ProductDisplayPanel): string {
  return (panel.colorProfiles || []).map((profile) => {
    const label = profile.mode || profile.colorSpace || "Coverage";
    const values = [
      profile.coverage !== undefined && profile.coverage !== "" ? withUnit(profile.coverage, "%") : "",
      profile.dciP3 !== undefined && profile.dciP3 !== "" ? `DCI-P3 ${withUnit(profile.dciP3, "%")}` : "",
      profile.ntsc !== undefined && profile.ntsc !== "" ? `NTSC ${withUnit(profile.ntsc, "%")}` : "",
      profile.sRgb !== undefined && profile.sRgb !== "" ? `sRGB ${withUnit(profile.sRgb, "%")}` : "",
    ].filter(Boolean);
    return values.length ? `${label}: ${values.join(", ")}` : "";
  }).filter(Boolean).join(" \u00b7 ");
}

function formatCurvedDisplay(panel: ProductDisplayPanel): string {
  if (panel.curved !== true) return typeof panel.curved === "boolean" ? formatBoolean(panel.curved) : "";
  const degree = panel.curvedDegree === undefined || panel.curvedDegree === null || panel.curvedDegree === ""
    ? ""
    : withUnit(panel.curvedDegree, "\u00b0");
  return degree ? `Yes, ${degree} curved panel` : "Yes, Curved panel";
}

function formatOtherFeatures(panel: ProductDisplayPanel): string {
  const values = [...(panel.others || [])];
  if (panel.includeDimmingInOtherFeatures) values.push(...(panel.dimming || []));
  if (panel.includeAlwaysOnDisplayInOtherFeatures) {
    const hasAlwaysOnDisplay = (panel.alwaysOnDisplay || []).some((feature) => /always-on display/i.test(feature));
    if (hasAlwaysOnDisplay) {
      const hz = String(panel.alwaysOnDisplayHz ?? "").trim();
      const formattedHz = hz ? (/hz$/i.test(hz) ? hz.replace(/\s*hz$/i, "Hz") : `${hz}Hz`) : "";
      values.push(formattedHz ? `${formattedHz} (Always-On Display)` : "Always-On Display");
    }
  }
  if (panel.includePalmRejectionInOtherFeatures && panel.stylus?.palmRejection === true) {
    values.push("Palm Rejection: Yes");
  }
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(", ");
}

function formatStylusSupport(panel: ProductDisplayPanel): string {
  const name = String(panel.stylus?.name || "").trim();
  const support = name && !/\bsupport\b/i.test(name) ? `${name} support` : name;
  const features = (panel.stylus?.features || []).map((feature) => feature.trim()).filter(Boolean).join(", ");
  if (support && features) return `${support}\n${features}`;
  return support || features;
}

function getStylusSupportParts(panel: ProductDisplayPanel): { support: string; features: string } {
  const name = String(panel.stylus?.name || "").trim();
  return {
    support: name && !/\bsupport\b/i.test(name) ? `${name} support` : name,
    features: (panel.stylus?.features || []).map((feature) => feature.trim()).filter(Boolean).join(", "),
  };
}

function DisplayPanelTable({
  panel,
  open,
  onToggle,
}: {
  panel: ProductDisplayPanel;
  open: boolean;
  onToggle: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["Display Type", panel.type?.trim() || ""],
    ["Display Size", withUnit(panel.sizeInches ?? panel.size, "inches")],
    ["Resolution", formatPanelResolution(panel)],
    ["Refresh Rate (RR)", formatRefreshRateRow(panel)],
    ["Adaptive RR", panel.adaptive ? formatAdaptiveRange(panel.adaptiveRefreshRate) : ""],
    ["Touch Sampling Rate (TSR)", formatSamplingRate(panel.touchSamplingRate)],
    ["Instant TSR", formatSamplingRate(panel.instantTouchSamplingRate)],
    ["Brightness", formatBrightness(panel)],
    ["Curved Display", formatCurvedDisplay(panel)],
  ];

  const detailRows: Array<[string, string]> = [
    ["Protection", panel.protection || ""],
    ["Color Depth", panel.colorDepth || ""],
    ["Screen-to-body Ratio", withUnit(panel.screenToBody, "%")],
    ["Aspect Ratio", panel.aspectRatio || ""],
    ["Pixel Density", withUnit(panel.pixelDensity, "ppi")],
    ["Color Gamut", listValue(panel.colorGamut)],
    ["Color Coverage", formatColorCoverage(panel)],
    ["Display Modes", listValue(panel.displayModes)],
    ["Display Features", listValue(panel.extras)],
    ["Stylus / Pen", formatStylusSupport(panel)],
    ["HDR Support", listValue(panel.hdr)],
    ["Certifications", listValue(panel.certifications)],
    ["Other Features", formatOtherFeatures(panel)],
  ];

  return (
      <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {rows.filter(([, value]) => Boolean(String(value || "").trim()) && String(value).trim() !== "-").map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5"
        >
          <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
          <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
          <div className={`relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm ${label === "Stylus / Pen" ? "" : "whitespace-pre-line"}`}>
            {label === "Stylus / Pen" ? (() => {
              const { support, features } = getStylusSupportParts(panel);
              return support && features ? <>
                <span className="flex flex-col sm:flex-row">
                  <span>{support}</span>
                  <span className="hidden sm:inline">{", "}</span>
                  <span>{features}</span>
                </span>
              </> : support || features;
            })() : value}
          </div>
        </div>
      ))}

      {!open ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-end border-b border-slate-100 px-3 py-2.5 text-left"
        >
          <span className="text-xs font-semibold text-blue-700">Show more {"\u203a"}</span>
        </button>
      ) : null}

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div>
            {detailRows.filter(([, value]) => Boolean(String(value || "").trim()) && String(value).trim() !== "-").map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5"
              >
                <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
                <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
                <p className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">
                  {label === "Certifications" ? <>
                    <span className="sm:hidden">{(panel.certifications || []).map((item) => <span key={item} className="block">{item}</span>)}</span>
                    <span className="hidden sm:inline">{value}</span>
                  </> : value}
                </p>
              </div>
            ))}

            <button
              type="button"
              onClick={onToggle}
              className="flex w-full items-center justify-end px-3 py-2.5 text-xs font-semibold text-blue-700"
            >
              Show less {"\u2039"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisplaySpecsTable({ display, displays }: DisplaySpecsTableProps) {
  const safe = toDisplayObject(display);
  const [singleOpen, setSingleOpen] = useState(false);
  const [primaryOpen, setPrimaryOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"primary" | "secondary">("primary");

  const panels = useMemo(() => {
    if (hasPanelData(safe.primary) || hasPanelData(safe.secondary)) {
      return [safe.primary, safe.secondary].filter((panel): panel is ProductDisplayPanel => Boolean(panel && hasPanelData(panel)));
    }

    if (hasPanelData(safe)) {
      return [safe as ProductDisplayPanel];
    }

    return Array.isArray(displays) ? displays.filter((panel) => hasPanelData(panel)) : [];
  }, [displays, safe]);

  const hasDual = panels.length >= 2;
  const primaryPanel = panels[0] || (safe as ProductDisplayPanel);
  const secondaryPanel = panels[1] || {};

  const showingPrimary = activePanel === "primary";
  const currentPanel = showingPrimary ? primaryPanel : secondaryPanel;
  const currentOpen = showingPrimary ? primaryOpen : secondaryOpen;
  const handleToggle = () => {
    if (hasDual) {
      if (showingPrimary) setPrimaryOpen((prev) => !prev);
      else setSecondaryOpen((prev) => !prev);
      return;
    }
    setSingleOpen((prev) => !prev);
  };

  return (
    <div className="space-y-3">
      {hasDual ? (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActivePanel("primary")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              showingPrimary ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${showingPrimary ? "bg-emerald-300" : "bg-slate-400"}`} />
              Primary Display
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActivePanel("secondary")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              !showingPrimary ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${!showingPrimary ? "bg-emerald-300" : "bg-slate-400"}`} />
              Secondary Display
            </span>
          </button>
        </div>
      ) : null}

      <DisplayPanelTable
        panel={hasDual ? currentPanel : primaryPanel}
        open={hasDual ? currentOpen : singleOpen}
        onToggle={handleToggle}
      />
    </div>
  );
}

