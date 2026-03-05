import type { ProductSecurity } from "@/lib/types/content";

function normalizeString(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toFixed2(value: number): number {
  return Number(value.toFixed(2));
}

export function getFaceScore(type: string): number {
  return normalizeString(type) === "2d" ? 1.5 : 0;
}

export function getFingerprintScore(type: string, x: number): number {
  const key = normalizeString(type);
  if (key === "ultrasonic") return x * 1;
  if (key === "optical") return x * 0.9;
  if (key === "capacitive") return x * 0.8;
  return 0;
}

export function hasCoreSensors(list: string[]): boolean {
  const normalized = list.map((item) => normalizeString(item));
  return normalized.includes("accelerometer") && normalized.includes("gyroscope");
}

function bestFingerprintType(types: string[]): string {
  if (types.some((item) => normalizeString(item) === "ultrasonic")) return "ultrasonic";
  if (types.some((item) => normalizeString(item) === "optical")) return "optical";
  if (types.some((item) => normalizeString(item) === "capacitive")) return "capacitive";
  return "";
}

export function calculateSecurityAndSensorScore(data: { security?: ProductSecurity; sensors?: string[] }) {
  const security = data.security || {};
  const sensors = Array.isArray(data.sensors)
    ? data.sensors.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const faceType = normalizeString(security.faceUnlock?.type);
  const fingerprintAvailable = Boolean(security.fingerprint?.available);
  const fingerprintTypes = Array.isArray(security.fingerprint?.type) ? security.fingerprint!.type! : [];
  const fingerprintType = bestFingerprintType(fingerprintTypes);

  let securityScore = 0;
  if (faceType === "infrared" || faceType === "3d") {
    securityScore = 4.5;
    if (fingerprintAvailable && fingerprintType === "ultrasonic") {
      securityScore = 5;
    }
  } else {
    const faceScore = getFaceScore(faceType);
    const x = 5 - faceScore;
    const fingerprintScore = fingerprintAvailable ? getFingerprintScore(fingerprintType, x) : 0;
    securityScore = clamp(faceScore + fingerprintScore, 0, 5);
  }

  let sensorScore = sensors.length * 0.9;
  if (!hasCoreSensors(sensors)) {
    sensorScore = sensorScore * 0.8;
  }
  sensorScore = clamp(sensorScore, 0, 4.5);

  const totalScore = clamp(securityScore + sensorScore, 0, 10);
  const hasSecureFaceUnlock = faceType === "infrared" || faceType === "3d";
  const hasFingerprint = fingerprintAvailable && Boolean(fingerprintType);
  const biometricCombo = hasFingerprint && hasSecureFaceUnlock;

  return {
    security: toFixed2(securityScore),
    sensors: toFixed2(sensorScore),
    total: toFixed2(totalScore),
    breakdown: {
      faceType: faceType || "none",
      fingerprintType: fingerprintType || "none",
      hasSecureFaceUnlock,
      hasFingerprint,
      biometricCombo,
      comboNote: biometricCombo ? "Fingerprint + secure face unlock" : "No secure biometrics combo",
    },
  };
}
