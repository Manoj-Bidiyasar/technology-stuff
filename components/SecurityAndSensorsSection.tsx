import type { ProductGeneral, ProductNetwork, ProductSecurity } from "@/lib/types/content";

type SecurityAndSensorsSectionProps = {
  security?: ProductSecurity;
  general?: ProductGeneral;
  sensors?: string[];
  network?: ProductNetwork;
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
  if (!location) return "";
  const normalizedLocation = /in[\s-]?display/i.test(location)
    ? "In-display"
    : /side/i.test(location)
      ? "Side-mounted"
      : /rear|back/i.test(location)
        ? "Rear-mounted"
        : /top/i.test(location)
          ? "Top-mounted"
          : location;
  return `${normalizedLocation} Fingerprint`;
}

function formatFaceUnlock(security?: ProductSecurity): string {
  if (security?.faceUnlock?.available === false) return "No";
  const technology = cleanValue(security?.faceUnlock?.type);
  if (technology) return technology;
  return security?.faceUnlock?.available === true ? "Yes" : "No";
}

function formatSensors(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  const seen = new Set<string>();
  const normalized = list
    .map((item) => normalizeSensorName(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return safeArrayJoin(normalized, ", ");
}

function row(label: string, value: string) {
  if (!value.trim() || value.trim() === "-") return null;
  return (
    <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
      <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
      <p className="relative -left-1 min-w-0 whitespace-pre-line text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</p>
    </div>
  );
}

export default function SecurityAndSensorsSection({ security, general, sensors, network }: SecurityAndSensorsSectionProps) {
  const fingerprint = formatFingerprint(security);
  const fingerprintType = security?.fingerprint?.available === true
    ? safeArrayJoin(security.fingerprint.type, ", ")
    : "";
  const faceUnlock = formatFaceUnlock(security);
  const sensorsLine = formatSensors([
    ...(sensors || []).filter((sensor) => !/\bnfc\b|near[-\s]?field communication/i.test(cleanValue(sensor))),
    ...(network?.infrared ? ["IR Blaster"] : []),
  ]);
  const sarLines = [
    typeof general?.headSarWkg === "number" && Number.isFinite(general.headSarWkg) && general.headSarWkg >= 0 ? `Head: ${general.headSarWkg} W/kg` : "",
    typeof general?.bodySarWkg === "number" && Number.isFinite(general.bodySarWkg) && general.bodySarWkg >= 0 ? `Body: ${general.bodySarWkg} W/kg` : "",
  ].filter(Boolean).join("\n");

  return (
    <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
      {fingerprint ? row("Fingerprint", fingerprint) : null}
      {fingerprintType ? row("Fingerprint Type", fingerprintType) : null}
      {row("Face Unlock", faceUnlock)}
      {security?.irisScanner === true ? row("Other Biometric Unlock", "Iris Scanner") : null}
      {sarLines ? row("SAR Value", sarLines) : null}
      {row("NFC Support", network?.nfc === true ? "Yes" : "No")}
      {row("Sensor Support", sensorsLine || "-")}
      {Array.isArray(security?.vibrationMotors) && security.vibrationMotors.length > 0 ? row("Vibration Motor", safeArrayJoin(security.vibrationMotors, ", ")) : null}
    </div>
  );
}

