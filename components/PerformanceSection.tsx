"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ProductPerformance } from "@/lib/types/content";
import AntutuModal from "@/components/AntutuModal";

type PerformanceSectionProps = {
  performance?: ProductPerformance;
};

function formatNumber(num?: number): string {
  if (!num || num <= 0) return "-";
  return Number(num).toLocaleString("en-IN");
}

function formatInlineList(items?: string[]): string {
  if (!Array.isArray(items) || items.length === 0) return "-";
  return items.map((item) => String(item || "").trim()).filter(Boolean).join(" • ") || "-";
}

function renderCPU(cpuArray?: string[]) {
  if (!Array.isArray(cpuArray) || cpuArray.length === 0) return "-";
  return (
    <div className="space-y-1">
      {cpuArray.map((line, index) => (
        <div key={`${line}-${index}`} className="text-sm font-semibold text-slate-900">
          {line}
        </div>
      ))}
    </div>
  );
}

export default function PerformanceSection({ performance }: PerformanceSectionProps) {
  const [open, setOpen] = useState(false);
  const antutuTotal = Number(performance?.antutu?.total || 0);
  const antutuValue = antutuTotal > 0 ? `~${formatNumber(antutuTotal)}` : "-";
  const rows = useMemo(() => {
    const items: Array<{ label: string; value: ReactNode }> = [
      { label: "Chipset", value: performance?.chipset || "-" },
      { label: "Additional Chips", value: formatInlineList(performance?.additionalChips) },
      { label: "Fabrication", value: performance?.fabrication || "-" },
      { label: "Architecture", value: performance?.architecture || "-" },
      { label: "CPU", value: renderCPU(performance?.cpu) },
      { label: "GPU (Graphics)", value: performance?.gpu || "-" },
      { label: "Cooling System", value: performance?.coolingSystem || "-" },
      { label: "GPU Frequency", value: performance?.gpuFrequency || "-" },
      { label: "Other Features", value: formatInlineList(performance?.otherFeatures) },
      {
        label: "AnTuTu Score",
        value: antutuTotal > 0 ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">{antutuValue}</p>
            <p className="text-xs text-slate-500">Higher is better</p>
          </div>
        ) : "-",
      },
    ];

    if (antutuTotal > 0) {
      items.push({
        label: "",
        value: (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <span className="text-base leading-none">+</span>
            <span>View detailed score</span>
          </button>
        ),
      });
    }

    return items;
  }, [antutuTotal, antutuValue, performance]);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map((row, index) => (
          <div
            key={`${row.label || "action"}-${index}`}
            className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{row.label || "-"}</p>
            <div>{typeof row.value === "string" && row.value.trim() === "-" ? "NA" : row.value}</div>
          </div>
        ))}
      </div>

      <AntutuModal open={open} onClose={() => setOpen(false)} antutu={performance?.antutu} />
    </>
  );
}

