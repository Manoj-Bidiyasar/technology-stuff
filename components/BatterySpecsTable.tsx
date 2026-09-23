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
  return entries.map(([k, v]) => `${k} in ${v}`).join(" & ");
}

function combinePowerAndSpeed(power: string, speed: string): string {
  if (power && speed) return `${power} (${speed})`;
  if (power) return power;
  if (speed) return `Charging (${speed})`;
  return "";
}

function combineWithProtocol(power: string, speed: string, protocol?: string): string {
  const base = combinePowerAndSpeed(power, speed);
  const protocolText = String(protocol || "").trim();
  if (base && protocolText) return `${base} | ${protocolText}`;
  return base || protocolText || "";
}

export default function BatterySpecsTable({ battery }: BatterySpecsTableProps) {
  const source = battery || {};
  const typicalText = withUnit(source.capacityTypical, " mAh");
  const ratedText = withUnit(source.capacityRated, " mAh");
  const capacityText = typicalText || withUnit(source.capacity, " mAh");
  const capacityWithVariant = typicalText && ratedText
    ? `${typicalText} (Typical), ${ratedText} (Rated)`
    : capacityText || ratedText;
  const batteryType = String(source.type || "").trim();

  const wiredCombined = source.wired?.supported
    ? combineWithProtocol(withUnit(source.wired?.maxPower, "W"), speedLines(source.wired?.speed), source.wired?.protocol)
    : "No";
  const inBoxCombined = source.chargerInBox?.available
    ? combineWithProtocol(withUnit(source.chargerInBox?.power, "W"), speedLines(source.chargerInBox?.speed), source.chargerInBox?.protocol)
    : "No";
  const wirelessCombined = source.wireless?.supported
    ? combineWithProtocol(withUnit(source.wireless?.maxPower, "W"), speedLines(source.wireless?.speed), source.wireless?.protocol)
    : "No";
  const reverseWirelessCombined = source.reverseWireless?.supported
    ? combineWithProtocol(withUnit(source.reverseWireless?.maxPower, "W"), speedLines(source.reverseWireless?.speed), source.reverseWireless?.protocol)
    : "No";
  const reverseWiredCombined = source.reverseWired?.supported
    ? combineWithProtocol(withUnit(source.reverseWired?.maxPower, "W"), speedLines(source.reverseWired?.speed), source.reverseWired?.protocol)
    : "No";

  const rows: Array<[string, string]> = [
    ["Battery", capacityWithVariant],
    ...(batteryType ? [["Battery Type", batteryType] as [string, string]] : []),
    ["Wired Charging", wiredCombined],
    ["Charger in Box", inBoxCombined],
    ["Wireless Charging", wirelessCombined],
    ["Reverse Wireless Charging", reverseWirelessCombined],
    ["Reverse Wired Charging", reverseWiredCombined],
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
      </div>
    </div>
  );
}
