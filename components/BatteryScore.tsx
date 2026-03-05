import type { BatteryScoreResult } from "@/lib/utils/batteryScore";

type BatteryScoreProps = {
  score: BatteryScoreResult;
};

export default function BatteryScore({ score }: BatteryScoreProps) {
  const rows: Array<[string, string]> = [
    ["Capacity", `${score.breakdown.capacity.toFixed(1)} / 4`],
    ["Charging", `${score.breakdown.charging.toFixed(1)} / 3`],
    ["Charger", `${score.breakdown.charger.toFixed(1)} / 1`],
    ["Wireless", `${score.breakdown.wireless.toFixed(1)} / 1.5`],
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-900">Battery Score: {score.score.toFixed(1)} / 10</p>
      <p className="mt-1 text-xs font-semibold text-blue-700">{score.label}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="font-semibold">{label}:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
