"use client";

import { useState } from "react";
import Tag from "@/components/Tag";
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
            <div className="grid grid-cols-[160px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Wireless Charging</p>
              <p className="text-sm font-semibold text-slate-500">-</p>
              <p className="text-sm font-semibold text-slate-900">{wirelessRow}</p>
            </div>

            <div className="grid grid-cols-[160px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Wireless Speed</p>
              <p className="text-sm font-semibold text-slate-500">-</p>
              <div className="space-y-1 text-sm font-semibold text-slate-900">
                {wirelessSpeed.length > 0 ? wirelessSpeed.map(([k, v]) => <p key={k}>{k}: {v}</p>) : <p>-</p>}
              </div>
            </div>

            <div className="grid grid-cols-[160px_16px_minmax(0,1fr)] items-center gap-3 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Other Features</p>
              <p className="text-sm font-semibold text-slate-500">-</p>
              <div className="flex flex-wrap gap-2">
                {(source.features || []).length > 0 ? (source.features || []).map((item) => <Tag key={item}>{item}</Tag>) : <Tag>-</Tag>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

