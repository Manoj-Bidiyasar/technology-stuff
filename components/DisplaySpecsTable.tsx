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

function hasPanelData(panel?: ProductDisplayPanel): boolean {
  if (!panel) return false;
  return Object.values(panel).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
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
    ["Display Size", withUnit(panel.size, "inches")],
    ["Resolution", formatResolution(panel.resolution)],
    ["Refresh Rate", formatRefreshRate(panel.refreshRate, panel.adaptive)],
    ["Peak Brightness", withUnit(panel.peakBrightness, "nits")],
  ];

  const detailRows: Array<[string, string]> = [
    ["Protection", panel.protection || ""],
    ["HDR Support", panel.hdr && panel.hdr.length > 0 ? panel.hdr.join(", ") : ""],
    ["Pixel Density", withUnit(panel.pixelDensity, "ppi")],
    ["Screen-to-body Ratio", withUnit(panel.screenToBody, "%")],
    ["Aspect Ratio", panel.aspectRatio || ""],
    ["Touch Sampling Rate", withUnit(panel.touchSamplingRate, "Hz")],
    ["Curved Display", panel.curved ? "Yes, Curved panel" : formatBoolean(panel.curved)],
    ["Certifications", panel.certifications && panel.certifications.length > 0 ? panel.certifications.join(", ") : ""],
    ["Other Features", panel.others && panel.others.length > 0 ? panel.others.join(", ") : ""],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:grid-cols-[180px_16px_minmax(0,1fr)]"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-sm font-semibold text-slate-500">-</p>
          <p className="text-sm font-semibold text-slate-900">{value || "NA"}</p>
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
            {detailRows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:grid-cols-[180px_16px_minmax(0,1fr)]"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-500">-</p>
                <p className="text-sm font-semibold text-slate-900">{value || "NA"}</p>
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
    if (Array.isArray(displays) && displays.length > 0) {
      return displays.filter((panel) => hasPanelData(panel));
    }

    if (hasPanelData(safe.primary) || hasPanelData(safe.secondary)) {
      return [safe.primary || {}, safe.secondary || {}].filter((panel) => hasPanelData(panel));
    }

    return hasPanelData(safe) ? [safe as ProductDisplayPanel] : [];
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

