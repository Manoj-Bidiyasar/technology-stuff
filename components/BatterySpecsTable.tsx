import type { ReactNode } from "react";
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
  return entries.map(([k, v]) => `${k} in ${v}`).join("\n");
}

function featureList(values?: string[]): string {
  if (!Array.isArray(values)) return "";
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].join(", ");
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
  const capacityValue: ReactNode = typicalText && ratedText ? (
    <>
      <span className="block sm:hidden">{typicalText} (Typical)<br />{ratedText} (Rated)</span>
      <span className="hidden sm:inline">{capacityWithVariant}</span>
    </>
  ) : capacityWithVariant;
  const batteryType = String(source.type || "").trim();
  const lifeCycle = String(source.lifeCycle ?? "").trim();
  const otherFeatures = featureList([...(source.otherBatteryFeatures || []), ...(source.otherChargingFeatures || [])]);

  const maxWiredPower = withUnit(source.wired?.maxPower, "W");
  const inBoxPower = withUnit(source.chargerInBox?.power, "W");
  const maxPowerNumber = Number.parseFloat(String(source.wired?.maxPower ?? ""));
  const inBoxPowerNumber = Number.parseFloat(String(source.chargerInBox?.power ?? ""));
  const chargingBrand = String(source.wired?.protocol || "").trim();
  const maxChargerSupport = maxWiredPower
    ? `${maxWiredPower}${chargingBrand ? ` ${chargingBrand}` : ""} Charger`
    : "";
  const inBoxBrand = String(source.chargerInBox?.protocol || "").trim();
  const inBoxChargerName = [inBoxPower, inBoxBrand].filter(Boolean).join(" ");
  const inBoxChargerLabel = inBoxChargerName ? `${inBoxChargerName} Charger` : "In-Box Charger included";
  const normalizeChargerDetail = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const chargersMatch = source.chargerInBox?.available === true &&
    normalizeChargerDetail(maxWiredPower) === normalizeChargerDetail(inBoxPower) &&
    normalizeChargerDetail(chargingBrand) === normalizeChargerDetail(inBoxBrand);
  const inBoxIsHigher = Number.isFinite(inBoxPowerNumber) && (!Number.isFinite(maxPowerNumber) || inBoxPowerNumber > maxPowerNumber);
  const chargerSupport: ReactNode = (
    <div className="flex flex-col gap-0.5">
      {maxChargerSupport && source.chargerInBox?.available && inBoxIsHigher ? (
        <>
          <span>{inBoxChargerLabel}</span>
          {maxWiredPower ? <span>{maxWiredPower} Max Charger Support</span> : null}
        </>
      ) : maxChargerSupport ? (
        <>
          <span>{maxChargerSupport}</span>
          {source.chargerInBox?.available
            ? !chargersMatch ? <span>{inBoxPower ? `${inBoxPower} ` : ""}In-Box Charger</span> : null
            : <span>No In-Box Charger</span>}
        </>
      ) : source.chargerInBox?.available ? (
        <span>{inBoxChargerLabel}</span>
      ) : (
        <span>No In-Box Charger</span>
      )}
    </div>
  );
  const maxChargingSpeed = speedLines(source.wired?.speed);
  const inBoxChargingSpeed = source.chargerInBox?.available ? speedLines(source.chargerInBox?.speed) : "";
  const chargingSpeed = maxChargingSpeed && inBoxChargingSpeed
    ? inBoxPowerNumber > maxPowerNumber ? inBoxChargingSpeed : maxChargingSpeed
    : maxChargingSpeed || inBoxChargingSpeed;
  const wirelessCombined = source.wireless?.supported
    ? {
        capacity: [withUnit(source.wireless?.maxPower, "W"), String(source.wireless?.protocol || "").trim()].filter(Boolean).join(" "),
        speed: speedLines(source.wireless?.speed),
      }
    : "No";
  const reverseWirelessCombined = source.reverseWireless?.supported
    ? combineWithProtocol(withUnit(source.reverseWireless?.maxPower, "W"), speedLines(source.reverseWireless?.speed), source.reverseWireless?.protocol)
    : "No";
  const reverseWiredCombined = source.reverseWired?.supported
    ? combineWithProtocol(withUnit(source.reverseWired?.maxPower, "W"), speedLines(source.reverseWired?.speed), source.reverseWired?.protocol)
    : "No";

  const rows: Array<[string, ReactNode]> = [
    ["Battery", capacityValue],
    ...(batteryType ? [["Battery Type", batteryType] as [string, string]] : []),
    ...(lifeCycle ? [["Life Cycle", lifeCycle] as [string, string]] : []),
    ["Charger Support", chargerSupport],
    ...(chargingSpeed ? [["Charging Speed", <span className="whitespace-pre-line">{chargingSpeed}</span>] as [string, ReactNode]] : []),
    ["Wireless Charging", typeof wirelessCombined === "string" ? wirelessCombined : (
      <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
        {wirelessCombined.capacity ? <span>{wirelessCombined.capacity}</span> : null}
        {wirelessCombined.speed ? <span className="whitespace-pre-line">{wirelessCombined.speed}</span> : null}
      </div>
    )],
    ["Reverse Wireless Charging", reverseWirelessCombined],
    ["Reverse Wired Charging", reverseWiredCombined],
    ...(source.replaceable === true ? [["Replaceable Battery", "Yes"] as [string, string]] : []),
    ...(otherFeatures ? [["Other Features", otherFeatures] as [string, string]] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
        {rows.filter(([, value]) => Boolean(String(value || "").trim()) && String(value).trim() !== "-").map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5"
          >
            <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
            <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
            <div className="relative -left-1 min-w-0 whitespace-pre-line text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
