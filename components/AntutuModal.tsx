"use client";

import { useEffect } from "react";

type AntutuBreakdown = {
  total?: number;
  cpu?: number;
  gpu?: number;
  memory?: number;
  ux?: number;
};

type AntutuModalProps = {
  open: boolean;
  onClose: () => void;
  antutu?: AntutuBreakdown;
};

function formatNumber(value?: number): string {
  if (!value || value <= 0) return "-";
  return Number(value).toLocaleString("en-IN");
}

export default function AntutuModal({ open, onClose, antutu }: AntutuModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="AnTuTu Benchmark"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">AnTuTu Benchmark</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close benchmark modal"
          >
            &times;
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          {[
            ["Total", formatNumber(antutu?.total)],
            ["CPU", formatNumber(antutu?.cpu)],
            ["GPU", formatNumber(antutu?.gpu)],
            ["Memory", formatNumber(antutu?.memory)],
            ["UX (UI)", formatNumber(antutu?.ux)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0"
            >
              <p className="font-semibold text-slate-600">{label}</p>
              <p className="text-right font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
