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
  if (lowered === "ambient light") return "Ambient Light";
  if (lowered === "accelerometer") return "Accelerometer";
  if (lowered === "gyroscope") return "Gyroscope";
  if (lowered === "proximity") return "Proximity";
  if (lowered === "compass") return "Compass";
  if (lowered === "barometer") return "Barometer";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function safeArrayJoin(list: string[] | undefined, separator: string): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
}

function formatFingerprint(security?: ProductSecurity): string {
  const available = Boolean(security?.fingerprint?.available);
  if (!available) return "No";

  const locations = safeArrayJoin(security?.fingerprint?.locations, ", ");
  return locations ? `Yes (${locations})` : "Yes";
}

function formatFingerprintType(security?: ProductSecurity): string {
  if (!security?.fingerprint?.available) return "";
  const joined = safeArrayJoin(security?.fingerprint?.type, ", ");
  return joined || "-";
}

function formatFaceUnlock(type?: string): string {
  const raw = cleanValue(type);
  const key = raw.toLowerCase();
  if (!key || key === "none" || key === "no") return "No";
  if (key === "infrared" || key === "3d" || key.includes("infrared") || key.includes("3d")) return "Infrared Secure Face Unlock";
  if (key === "2d" || key.includes("2d")) return "Basic Face Unlock";
  if (key.includes("secure")) return "Secure Face Unlock";
  if (key.includes("face")) {
    return raw
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  return "Basic Face Unlock";
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
  const fingerprintAvailable = Boolean(security?.fingerprint?.available);
  const fingerprint = formatFingerprint(security);
  const fingerprintType = formatFingerprintType(security);
  const faceUnlock = formatFaceUnlock(security?.faceUnlock?.type);
  const sensorsLine = formatSensors(sensors);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Fingerprint Sensor", fingerprint)}
      {row("Fingerprint Type", fingerprintAvailable ? (fingerprintType || "-") : "-")}
      {row("Face Unlock", faceUnlock)}
      {row("Sensors", sensorsLine || "-")}
    </div>
  );
}

