"use client";

import { useEffect } from "react";
import type { ProductBenchmarks } from "@/lib/types/content";

type GeekbenchModalProps = {
  open: boolean;
  onClose: () => void;
  benchmarks?: ProductBenchmarks;
};

function formatNumber(value?: number): string {
  if (!value || value <= 0) return "-";
  return Number(value).toLocaleString("en-IN");
}

export default function GeekbenchModal({ open, onClose, benchmarks }: GeekbenchModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const rows = ([
    ["Single-core", benchmarks?.geekbenchSingle],
    ["Multi-core", benchmarks?.geekbenchMulti],
    ["Compute", benchmarks?.geekbenchCompute],
    ["OpenCL", benchmarks?.geekbenchOpenCl],
    ["Vulkan", benchmarks?.geekbenchVulkanScore],
  ] satisfies Array<[string, number | undefined]>).filter(([, score]) => Number(score) > 0);
  const title = `Geekbench${benchmarks?.geekbenchVersion ? ` ${benchmarks.geekbenchVersion}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${title} scores`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title} Scores</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close benchmark modal">&times;</button>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {rows.map(([label, score]) => (
            <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0">
              <p className="font-semibold text-slate-600">{label}</p>
              <p className="text-right font-bold text-slate-900">{formatNumber(score)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
