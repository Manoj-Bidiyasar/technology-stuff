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
  const capacityTypical = withUnit(source.capacityTypical, "mAh");
  const capacityRated = withUnit(source.capacityRated, "mAh");
  const capacity = capacityTypical || withUnit(source.capacity, "mAh");
  const capacityLine = capacityTypical && capacityRated
    ? `${capacityTypical} (Typical), ${capacityRated} (Rated)`
    : capacity || capacityRated;
  const maxPower = Number.parseFloat(String(source.wired?.maxPower ?? ""));
  const inBoxPower = Number.parseFloat(String(source.chargerInBox?.power ?? ""));
  const maxPowerText = withUnit(source.wired?.maxPower, "W");
  const inBoxPowerText = withUnit(source.chargerInBox?.power, "W");
  const chargingPowerText = source.wired?.supported
    ? source.chargerInBox?.available && maxPower > inBoxPower && maxPowerText && inBoxPowerText
      ? `${maxPowerText} charger support (${inBoxPowerText} in box)`
      : `${maxPowerText || inBoxPowerText || "Wired"} charger support`
    : source.chargerInBox?.available
      ? `${inBoxPowerText || "Charger"} charger support`
      : "Wired charging info pending";

  const items = [
    { icon: "??", text: capacityLine ? `${capacityLine} battery` : "Battery info pending" },
    { icon: "?", text: chargingPowerText },
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
