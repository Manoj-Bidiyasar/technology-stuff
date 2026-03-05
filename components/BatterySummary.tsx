import type { ProductBattery } from "@/lib/types/content";

type BatterySummaryProps = {
  battery?: ProductBattery;
};

function withUnit(value: string | number | undefined, unit: string): string {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  return text.toLowerCase().includes(unit.toLowerCase()) ? text : `${text}${unit}`;
}

export default function BatterySummary({ battery }: BatterySummaryProps) {
  const source = battery || {};

  const items = [
    { icon: "??", text: source.capacity ? `${withUnit(source.capacity, "mAh")} battery` : "Battery info pending" },
    { icon: "?", text: source.maxChargingSupport ? `${withUnit(source.maxChargingSupport, "W")} fast charging` : "Charging info pending" },
    source.chargerInBox?.available
      ? { icon: "??", text: `${withUnit(source.chargerInBox?.power, "W") || "Charger"} charger in box` }
      : null,
    source.wireless?.supported
      ? { icon: "??", text: `${withUnit(source.wireless?.maxPower, "W") || "Wireless"} wireless charging` }
      : null,
  ].filter(Boolean) as Array<{ icon: string; text: string }>;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <p key={`${item.text}-${index}`} className="text-sm font-semibold text-slate-800">
            <span className="mr-2">{item.icon}</span>
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}
