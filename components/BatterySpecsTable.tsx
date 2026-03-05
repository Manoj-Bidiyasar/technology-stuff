import Tag from "@/components/Tag";
import type { ProductBattery } from "@/lib/types/content";

type BatterySpecsTableProps = {
  battery?: ProductBattery;
};

function withUnit(value: string | number | undefined, unit: string): string {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  return text.toLowerCase().includes(unit.toLowerCase()) ? text : `${text}${unit}`;
}

function speedLines(speed?: Record<string, string>): string {
  if (!speed) return "";
  const entries = Object.entries(speed).filter(([k, v]) => k && v);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}% in ${v}`).join(" & ");
}

function combinePowerAndSpeed(power: string, speed: string): string {
  if (power && speed) return `${power} (${speed})`;
  if (power) return power;
  if (speed) return `Charging (${speed})`;
  return "";
}

export default function BatterySpecsTable({ battery }: BatterySpecsTableProps) {
  const source = battery || {};
  const capacityText = withUnit(source.capacity, " mAh");
  const batteryCombined =
    capacityText && source.type
      ? `${capacityText} (${source.type})`
      : capacityText || source.type || "";
  const chargingPower = withUnit(source.maxChargingSupport, "W");
  const chargingSpeed = speedLines(source.chargingSpeed);
  const chargingCombined = combinePowerAndSpeed(chargingPower, chargingSpeed);
  const wirelessPower = source.wireless?.supported ? withUnit(source.wireless?.maxPower, "W") : "";
  const wirelessSpeed = source.wireless?.supported ? speedLines(source.wireless?.speed) : "";
  const wirelessCombined = source.wireless?.supported
    ? combinePowerAndSpeed(wirelessPower, wirelessSpeed)
    : "No";

  const rows: Array<[string, string]> = [
    ["Battery", batteryCombined],
    ["Charging", chargingCombined],
    [
      "Charger in Box",
      source.chargerInBox?.available
        ? `Yes${source.chargerInBox?.power ? ` (${source.chargerInBox.power}W)` : ""}`
        : "No",
    ],
    ["Wireless Charging", wirelessCombined],
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[160px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-sm font-semibold text-slate-500">-</p>
            <p className="text-sm font-semibold text-slate-900">{value || "NA"}</p>
          </div>
        ))}

        <div className="grid grid-cols-[160px_16px_minmax(0,1fr)] items-center gap-3 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Other Features</p>
          <p className="text-sm font-semibold text-slate-500">-</p>
          <div className="flex flex-wrap gap-2">
            {(source.features || []).length > 0 ? (source.features || []).map((item) => <Tag key={item}>{item}</Tag>) : <span className="text-sm font-semibold text-slate-900">NA</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

