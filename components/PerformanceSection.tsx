"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ProductPerformance } from "@/lib/types/content";
import AntutuModal from "@/components/AntutuModal";
import GeekbenchModal from "@/components/GeekbenchModal";

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

function renderArchitecture(value?: string) {
  const lines = String(value || "")
    .replace(/\s+(?=\d+\s*x\s+)/gi, "\n")
    .split(/[,;\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "-";
  return (
    <div className="space-y-1">
      {lines.map((line, index) => <div key={`${line}-${index}`} className="whitespace-nowrap text-[11px] font-semibold leading-5 text-slate-900 sm:text-sm sm:leading-normal">{line}</div>)}
    </div>
  );
}

export default function PerformanceSection({ performance }: PerformanceSectionProps) {
  const [antutuOpen, setAntutuOpen] = useState(false);
  const [geekbenchOpen, setGeekbenchOpen] = useState(false);
  const antutuTotal = Number(performance?.antutu?.total || 0);
  const antutuValue = antutuTotal > 0 ? `~${formatNumber(antutuTotal)}` : "-";
  const rows = useMemo(() => {
    const fabrication = String(performance?.fabrication || "").trim().replace(/\s*\([^)]*\)\s*$/, "").replace(/(\d+(?:\.\d+)?)\s*nm\b/i, "$1nm");
    const architectureBits = String(performance?.architectureBits || "").trim().replace(/(\d+)\s*-?\s*bit/i, "$1-bit");
    const architecture = [fabrication, architectureBits ? `(${architectureBits})` : ""].filter(Boolean).join(" ") || "-";
    const aiEngine = String(performance?.aiEngine || "").trim();
    const aiSpeed = String(performance?.aiSpeed || "").trim();
    const aiValue = aiEngine && aiSpeed && !/\b\d+(?:\.\d+)?\s*TOPS?\b/i.test(aiEngine)
      ? `${aiEngine} (${aiSpeed})`
      : aiEngine || aiSpeed || "-";
    const benchmarkScore = (value?: number) => Number(value) > 0 ? formatNumber(value) : "";
    const benchmarks = performance?.benchmarks;
    const items: Array<{ label: string; value: ReactNode }> = [
      { label: "Chipset", value: performance?.chipset || "-" },
      { label: "Architecture", value: architecture },
      { label: "CPU Structure", value: renderArchitecture(performance?.architecture) },
      { label: "Additional Chips", value: formatInlineList(performance?.additionalChips) },
      { label: "Additional Chip Details", value: formatInlineList(performance?.additionalChipFeatures) },
      { label: "GPU (Graphics)", value: performance?.gpu || "-" },
      { label: "GPU Frequency", value: performance?.gpuFrequency || "-" },
      { label: "Cooling System", value: performance?.coolingSystem || "-" },
      { label: "AI", value: aiValue },
      { label: "Other AI Features", value: formatInlineList(performance?.otherAiFeatures) },
      { label: "Other Features", value: formatInlineList(performance?.otherFeatures) },
      {
        label: "AnTuTu Score",
        value: antutuTotal > 0 ? (
          <div className="sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-2">
            <div className="flex flex-nowrap items-baseline gap-x-1 whitespace-nowrap">
              <p className="text-[11px] font-semibold text-slate-900 sm:text-sm">{antutuValue}</p>
              <p className="text-[10px] text-slate-500 sm:text-xs">(Higher is better)</p>
            </div>
            <button
              type="button"
              onClick={() => setAntutuOpen(true)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 sm:mt-0 sm:whitespace-nowrap sm:text-sm"
            >
              <span className="text-base leading-none">+</span>
              <span>View detailed score</span>
            </button>
          </div>
        ) : "-",
      },
    ];

    const singleCore = benchmarkScore(benchmarks?.geekbenchSingle);
    const multiCore = benchmarkScore(benchmarks?.geekbenchMulti);
    const compute = benchmarkScore(benchmarks?.geekbenchCompute);
    const openCl = benchmarkScore(benchmarks?.geekbenchOpenCl);
    const vulkan = benchmarkScore(benchmarks?.geekbenchVulkanScore);
    const geekbenchSummary = [singleCore, multiCore].filter(Boolean).join(" / ")
      || [["Compute", compute], ["OpenCL", openCl], ["Vulkan", vulkan]].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join(" • ");
    if (singleCore || multiCore || compute || openCl || vulkan) {
      items.push({
        label: benchmarks?.geekbenchVersion ? `Geekbench ${benchmarks.geekbenchVersion}` : "Geekbench",
        value: (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start sm:gap-x-2">
            <p className="text-[11px] font-semibold text-slate-900 sm:text-sm">{geekbenchSummary}</p>
            <button type="button" onClick={() => setGeekbenchOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 sm:text-sm">
              <span className="text-base leading-none">+</span>
              <span>View detailed score</span>
            </button>
          </div>
        ),
      });
    }

    return items.filter(({ value }) => !(typeof value === "string" && (!value.trim() || value.trim() === "-")));
  }, [antutuTotal, antutuValue, performance]);

  return (
    <>
      {rows.length > 0 ? <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
        {rows.map((row, index) => (
          <div
            key={`${row.label || "action"}-${index}`}
            className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5"
          >
            <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{row.label || "-"}</p>
            <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
            <div className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{row.value}</div>
          </div>
        ))}
      </div> : null}

      <AntutuModal open={antutuOpen} onClose={() => setAntutuOpen(false)} antutu={performance?.antutu} />
      <GeekbenchModal open={geekbenchOpen} onClose={() => setGeekbenchOpen(false)} benchmarks={performance?.benchmarks} />
    </>
  );
}

