import type { ProductNetwork } from "@/lib/types/content";

type NetworkScoreResult = {
  score: number;
  breakdown: {
    networkType: number;
    bands: number;
    wifi: number;
    bluetooth: number;
    gps: number;
    extras: number;
  };
};

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseBluetoothVersion(value?: string): number {
  const match = String(value || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function has(list: string[], target: string): boolean {
  const normalized = list.map((item) => normalize(item));
  return normalized.includes(normalize(target));
}

function getNetworkTypeScore(supported: string[]): number {
  if (has(supported, "5g")) return 3;
  if (has(supported, "4g")) return 2;
  if (has(supported, "3g")) return 1;
  return 0;
}

function getBandsScore(network?: ProductNetwork): number {
  const supported = Array.isArray(network?.supported) ? network!.supported! : [];
  const has5G = has(supported, "5g");
  if (!has5G) return 0;

  const indiaBands = ["n1", "n3", "n5", "n8", "n28", "n77", "n78"];
  const fdd = Array.isArray(network?.bands?.["5G"]?.fdd) ? network!.bands!["5G"]!.fdd! : [];
  const tdd = Array.isArray(network?.bands?.["5G"]?.tdd) ? network!.bands!["5G"]!.tdd! : [];
  const merged = [...fdd, ...tdd].map((item) => normalize(item));
  const foundCount = indiaBands.filter((band) => merged.includes(band)).length;

  let score = 0;
  if (foundCount >= 6) score = 2.5;
  else if (foundCount >= 4) score = 2;
  else if (foundCount >= 2) score = 1.5;
  else if (foundCount >= 1) score = 1;

  if (merged.includes("n77") && merged.includes("n78")) score += 0.3;
  return clamp(score, 0, 2.5);
}

function getWifiScore(network?: ProductNetwork): number {
  const version = normalize(network?.wifi?.version);
  if (version.includes("wi-fi 7") || version.includes("wifi 7")) return 2;
  if (version.includes("wi-fi 6e") || version.includes("wifi 6e") || version.includes("wi-fi 6") || version.includes("wifi 6")) return 1.8;
  if (version.includes("wi-fi 5") || version.includes("wifi 5")) return 1.5;
  if (version.includes("wi-fi 4") || version.includes("wifi 4")) return 1;
  return 0.5;
}

function getBluetoothScore(network?: ProductNetwork): number {
  const version = parseBluetoothVersion(network?.bluetooth);
  if (version >= 5.3) return 1;
  if (version >= 5.1) return 0.8;
  if (version >= 5.0) return 0.6;
  if (version > 0) return 0.4;
  return 0.4;
}

function getGpsScore(network?: ProductNetwork): number {
  const gps = Array.isArray(network?.gps) ? network!.gps! : [];
  const hasGps = has(gps, "gps");
  const hasGlonass = has(gps, "glonass");
  const hasNavic = has(gps, "navic");
  if (hasGps && hasGlonass && hasNavic) return 0.8;
  if (hasGps && hasGlonass) return 0.6;
  if (hasGps) return 0.4;
  return 0;
}

function getExtrasScore(network?: ProductNetwork): number {
  let score = 0;
  if (network?.nfc) score += 0.4;
  if (network?.infrared) score += 0.3;
  return clamp(score, 0, 0.7);
}

export function calculateNetworkScore(input: { network?: ProductNetwork }): NetworkScoreResult {
  const network = input.network;
  const supported = Array.isArray(network?.supported) ? network!.supported! : [];

  const networkType = getNetworkTypeScore(supported);
  const bands = getBandsScore(network);
  const wifi = getWifiScore(network);
  const bluetooth = getBluetoothScore(network);
  const gps = getGpsScore(network);
  const extras = getExtrasScore(network);

  const score = clamp(networkType + bands + wifi + bluetooth + gps + extras, 0, 10);

  return {
    score: round2(score),
    breakdown: {
      networkType: round2(networkType),
      bands: round2(bands),
      wifi: round2(wifi),
      bluetooth: round2(bluetooth),
      gps: round2(gps),
      extras: round2(extras),
    },
  };
}
