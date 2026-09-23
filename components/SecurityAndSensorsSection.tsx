import type { ProductSecurity } from "@/lib/types/content";

type SecurityAndSensorsSectionProps = {
  security?: ProductSecurity;
  sensors?: string[];
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function normalizeSensorName(value: string): string {
  const cleaned = cleanValue(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const lowered = cleaned.toLowerCase();
  const isECompass = lowered === "e-compass" || lowered === "e compass" || lowered === "ecompass";
  const isVirtual = !isECompass && (lowered.includes("virtual") || lowered.includes("software") || lowered.includes("electronic"));
  const base = cleaned
    .replace(/\(.*?(virtual|software|electronic).*?\)/gi, "")
    .replace(/\b(virtual|software|electronic)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const baseLowered = base.toLowerCase();
  let normalizedBase = base;
  if (baseLowered === "ambient light") normalizedBase = "Ambient Light";
  else if (baseLowered === "accelerometer") normalizedBase = "Accelerometer";
  else if (baseLowered === "gyroscope") normalizedBase = "Gyroscope";
  else if (baseLowered === "proximity") normalizedBase = "Proximity";
  else if (baseLowered === "compass") normalizedBase = "Compass";
  else if (baseLowered === "e compass" || baseLowered === "ecompass") normalizedBase = "E-Compass";
  else if (baseLowered === "barometer") normalizedBase = "Barometer";
  else normalizedBase = base
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return isVirtual ? `Virtual ${normalizedBase}` : normalizedBase;
}

function safeArrayJoin(list: string[] | undefined, separator: string): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
}

function formatFingerprint(security?: ProductSecurity): string {
  const available = Boolean(security?.fingerprint?.available);
  if (!available) return "No";

  const location = cleanValue(security?.fingerprint?.locations?.[0]);
  const technology = cleanValue(security?.fingerprint?.type?.[0]);
  const isInDisplay = /in[\s-]?display/i.test(location);
  if (isInDisplay) return technology ? `${technology} In-Display Fingerprint Sensor` : "In-Display Fingerprint Sensor";
  return location ? `${location} Fingerprint Sensor` : "Fingerprint Sensor";
}

function formatFaceUnlock(security?: ProductSecurity): string {
  if (security?.faceUnlock?.available === false) return "No";
  const technology = cleanValue(security?.faceUnlock?.type);
  if (technology) return technology;
  return security?.faceUnlock?.available === true ? "Yes" : "No";
}

function formatSensors(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  const normalized = list
    .map((item) => normalizeSensorName(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return safeArrayJoin(normalized, ", ");
}

function row(label: string, value: string) {
  const isDashValue = value.trim() === "-";
  return (
    <div className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-500">-</p>
      <p className="text-sm font-semibold text-slate-900">{isDashValue ? "NA" : value}</p>
    </div>
  );
}

export default function SecurityAndSensorsSection({ security, sensors }: SecurityAndSensorsSectionProps) {
  const fingerprint = formatFingerprint(security);
  const faceUnlock = formatFaceUnlock(security);
  const sensorsLine = formatSensors(sensors);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Fingerprint Sensor", fingerprint)}
      {row("Face Unlock", faceUnlock)}
      {security?.irisScanner === true ? row("Other Biometric Unlock", "Iris Scanner") : null}
      {row("Sensors", sensorsLine || "-")}
    </div>
  );
}

