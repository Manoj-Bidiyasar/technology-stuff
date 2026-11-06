"use client";

import { useState } from "react";
import type { ProductBattery } from "@/lib/types/content";

type BatteryDetailsCollapseProps = {
  battery?: ProductBattery;
};

function mapRows(speed: Record<string, string> | undefined): Array<[string, string]> {
  if (!speed) return [];
  return Object.entries(speed)
    .filter(([k, v]) => k && v)
    .map(([k, v]) => [`${k}%`, v]);
}

export default function BatteryDetailsCollapse({ battery }: BatteryDetailsCollapseProps) {
  const source = battery || {};
  const [open, setOpen] = useState(false);

  const wirelessRow = source.wireless?.supported
    ? `Supported${source.wireless?.maxPower ? ` (${source.wireless.maxPower}W)` : ""}`
    : "Not Supported";

  const wirelessSpeed = mapRows(source.wireless?.speed);
  const reverseWirelessRow = source.reverseWireless?.supported
    ? `Supported${source.reverseWireless?.maxPower ? ` (${source.reverseWireless.maxPower}W)` : ""}`
    : "Not Supported";
  const reverseWiredRow = source.reverseWired?.supported
    ? `Supported${source.reverseWired?.maxPower ? ` (${source.reverseWired.maxPower}W)` : ""}`
    : "Not Supported";

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-end px-3 py-2.5"
      >
        <span className="text-xs font-semibold text-blue-700">{open ? "Show less ?" : "Show more ?"}</span>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100">
            <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
              <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">Wireless Charging</p>
              <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
              <p className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{wirelessRow}</p>
            </div>

            <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
              <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">Wireless Speed</p>
              <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
              <div className="space-y-1 relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">
                {wirelessSpeed.length > 0 ? wirelessSpeed.map(([k, v]) => <p key={k}>{k}: {v}</p>) : <p>-</p>}
              </div>
            </div>

            <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
              <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">Reverse Wireless</p>
              <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
              <p className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{reverseWirelessRow}</p>
            </div>

            <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 px-2 py-2 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
              <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">Reverse Wired</p>
              <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
              <p className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{reverseWiredRow}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

