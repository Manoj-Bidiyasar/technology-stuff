import type { Product } from "@/lib/types/content";
import { calculateOverallBreakdown100 } from "@/lib/utils/score";

function strokeColor(percent: number): string {
  if (percent >= 85) return "#059669";
  if (percent >= 70) return "#2563eb";
  if (percent >= 55) return "#d97706";
  return "#64748b";
}

function formatScoreValue(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function ScoreCircle({ value, max }: { value: number; max: number }) {
  const safeMax = max > 0 ? max : 10;
  const normalized = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const percent = (normalized / safeMax) * 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (percent / 100) * circumference;

  return (
    <div className="relative h-14 w-14">
      <svg viewBox="0 0 50 50" className="h-14 w-14 -rotate-90">
        <circle cx="25" cy="25" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke={strokeColor(percent)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${Math.max(circumference - progress, 0)}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-900">
        {formatScoreValue(normalized)}
      </div>
    </div>
  );
}

export default function ScoreCard({ product }: { product: Product }) {
  const breakdown = calculateOverallBreakdown100(product);
  const sections = breakdown.sections;
  const byKey = Object.fromEntries(sections.map((item) => [item.key, item])) as Record<string, (typeof sections)[number]>;

  const performance = byKey.performance?.score10 || 0;
  const display = byKey.display?.score10 || 0;
  const battery = byKey.battery?.score10 || 0;
  const rear = byKey.rearCamera?.score10 || 0;
  const front = byKey.frontCamera?.score10 || 0;
  const camera = Math.round((((rear * 16 + front * 4) / 20) || 0) * 10) / 10;

  const items = [
    { label: "Performance", value: performance, max: 10 },
    { label: "Camera", value: camera, max: 10 },
    { label: "Battery", value: battery, max: 10 },
    { label: "Display", value: display, max: 10 },
  ];
  const overall = { label: "Overall", value: breakdown.score, max: 100 };

  return (
    <section className="panel p-4">
      <h2 className="text-base font-bold text-slate-900">Ratings</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <div className="mt-2 flex items-center justify-center">
              <ScoreCircle value={item.value} max={item.max} />
            </div>
          </article>
        ))}
        <div className="col-span-2 flex justify-center">
          <article className="w-full max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{overall.label}</p>
            <div className="mt-2 flex items-center justify-center">
              <ScoreCircle value={overall.value} max={overall.max} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
