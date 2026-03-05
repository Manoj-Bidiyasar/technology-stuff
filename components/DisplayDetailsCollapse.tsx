"use client";

import { useState } from "react";
import Tag from "@/components/Tag";
import type { ProductDisplay } from "@/lib/types/content";
import { formatBoolean, toDisplayObject } from "@/lib/utils/display";

type DisplayDetailsCollapseProps = {
  display?: ProductDisplay;
};

function formatWithUnit(value: string | number | undefined, unit: string): string {
  if (value === undefined || value === null || value === "") return "-";
  const text = String(value).trim();
  return text.toLowerCase().includes(unit.toLowerCase()) ? text : `${text} ${unit}`;
}

function DetailsTagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length > 0 ? values.map((item) => <Tag key={`${title}-${item}`}>{item}</Tag>) : <Tag>-</Tag>}
      </div>
    </div>
  );
}

export default function DisplayDetailsCollapse({ display }: DisplayDetailsCollapseProps) {
  const safe = toDisplayObject(display);
  const [open, setOpen] = useState(false);

  const basicRows: Array<[string, string]> = [
    ["Protection", safe.protection || "-"],
    ["HDR Support", safe.hdr && safe.hdr.length > 0 ? safe.hdr.join(", ") : "-"],
    ["Pixel Density", formatWithUnit(safe.pixelDensity, "ppi")],
    ["Screen-to-body Ratio", formatWithUnit(safe.screenToBody, "%")],
    ["Touch Sampling Rate", formatWithUnit(safe.touchSamplingRate, "Hz")],
    ["Curved Display", formatBoolean(safe.curved)],
  ];

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-3 text-left"
      >
        <h4 className="text-sm font-bold text-slate-900">Display Details</h4>
        <span className="text-xs font-semibold text-blue-700">{open ? "Hide" : "Show"}</span>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 px-3 py-3">
            <div className="rounded-lg border border-slate-200">
              {basicRows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <DetailsTagGroup title="Extras" values={safe.extras || []} />
            <DetailsTagGroup title="Certifications" values={safe.certifications || []} />
            <DetailsTagGroup title="Other Features" values={safe.others || []} />
          </div>
        </div>
      </div>
    </section>
  );
}

