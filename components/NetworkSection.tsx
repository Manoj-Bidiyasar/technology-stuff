import type { ProductNetwork } from "@/lib/types/content";
import type { ReactNode } from "react";

type NetworkSectionProps = {
  network?: ProductNetwork;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatBoolean(value?: boolean): string {
  if (typeof value !== "boolean") return "-";
  return value ? "Yes" : "No";
}

function formatList(list?: string[], separator = ", "): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(separator);
}

const BLUETOOTH_FEATURE_ORDER = ["LE", "LE+Dual Audio", "A2DP", "aptX", "aptX HD", "aptX Adaptive", "LDAC", "LHDC", "AAC", "SBC", "Dual Audio"];

function formatBluetoothFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  const values = list.map((item) => cleanValue(item)).filter(Boolean);
  const position = (value: string) => {
    const index = BLUETOOTH_FEATURE_ORDER.findIndex((item) => item.toLowerCase() === value.toLowerCase());
    return index < 0 ? BLUETOOTH_FEATURE_ORDER.length : index;
  };
  return values.sort((left, right) => position(left) - position(right) || left.localeCompare(right)).join(", ");
}

function selectLatestVersion(value: unknown, orderedVersions: string[]): string {
  const values = cleanValue(value).split(",").map((item) => item.trim()).filter(Boolean);
  const normalized = values.map((item) => item.replace(/^wi-?fi\s*/i, "").toUpperCase());
  const matched = orderedVersions.find((version) => normalized.includes(version.toUpperCase()));
  return matched || values[0] || "";
}

function formatNetworkType(supported?: string[]): string {
  if (!Array.isArray(supported) || supported.length === 0) return "-";
  const normalized = supported.map((item) => cleanValue(item).toUpperCase()).filter(Boolean);
  const order = ["5G", "4G", "3G", "2G"];
  return order.filter((network) => normalized.includes(network)).join(", ") || formatList(normalized, ", ") || "-";
}

function formatWifi(wifi?: ProductNetwork["wifi"]): string {
  if (!wifi) return "-";
  const version = selectLatestVersion(wifi.version, ["7", "6E", "6", "5", "4"]);
  const savedStandards = Array.isArray(wifi.standards) ? wifi.standards.map((item) => cleanValue(item)).filter(Boolean) : [];
  const standardsByVersion: Record<string, string[]> = {
    "7": ["a", "b", "g", "n", "ac", "ax", "be"],
    "6E": ["a", "b", "g", "n", "ac", "ax"],
    "6": ["a", "b", "g", "n", "ac", "ax"],
    "5": ["a", "b", "g", "n", "ac"],
    "4": ["a", "b", "g", "n"],
  };
  const standards = savedStandards.length > 0 ? savedStandards : (standardsByVersion[version] || []);
  const standardsText = standards.length > 0 ? `802.11 ${standards.join("/")}` : "";
  const dualBand = wifi.dualBand ? "Dual Band" : "";
  const suffix = [standardsText, dualBand].filter(Boolean).join(", ");

  if (version && suffix) return `${version} (${suffix})`;
  if (version) return version;
  if (suffix) return suffix;
  return "-";
}

function formatSim(sim?: ProductNetwork["sim"]): string {
  if (!sim) return "-";
  const type = cleanValue(sim.type);
  const slot1 = cleanValue(sim.slot1Type);
  const slot2 = cleanValue(sim.slot2Type);
  const config = cleanValue(sim.config) || (slot1 && slot2 ? `${slot1} + ${slot2}` : slot1);
  if (type && config) return `${type} (${config})`;
  return type || config || "-";
}

function formatUsbVersion(usb?: ProductNetwork["usb"]): string {
  if (!usb) return "";
  const type = cleanValue(usb.type);
  const rawVersion = selectLatestVersion((usb.version || []).join(", "), ["4.0", "4", "3.2", "3.1", "3.0", "2.0"]);
  const version = rawVersion === "4" ? "4.0" : rawVersion;
  if (type && version) return `${type} ${version}`;
  return type || (version ? `USB ${version}` : "");
}

function row(label: string, value: ReactNode) {
  const isDashValue = typeof value === "string" && value.trim() === "-";
  return (
    <div className="grid grid-cols-[140px_16px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-500">-</p>
      <div className="text-sm font-semibold text-slate-900">{isDashValue ? "NA" : value}</div>
    </div>
  );
}

export default function NetworkSection({ network }: NetworkSectionProps) {
  const supported = network?.supported || [];
  const has5G = supported.map((item) => cleanValue(item).toUpperCase()).includes("5G");
  const fiveGBands = formatList(network?.bands?.["5G"]?.all);
  const fourGBands = formatList(network?.bands?.["4G"]?.all);
  const wifi = formatWifi(network?.wifi);
  const sim = formatSim(network?.sim);
  const bluetooth = selectLatestVersion(network?.bluetooth, ["6.0", "5.4", "5.3", "5.2", "5.1", "5.0", "4.2"]) || "-";
  const bluetoothFeatures = formatBluetoothFeatures(network?.bluetoothFeatures);
  const wifiFeatures = formatList(network?.wifi?.features);
  const otherNetwork = formatList(network?.otherFeatures);
  const gps = formatList(network?.gps) || "-";
  const usbVersion = formatUsbVersion(network?.usb);
  const usbFeatures = formatList(network?.usb?.features);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Supported Network", formatNetworkType(supported))}
      {otherNetwork ? row("Other Network", otherNetwork) : null}
      {has5G ? (fiveGBands ? row("5G Band", fiveGBands) : null) : (fourGBands ? row("4G Band", fourGBands) : null)}
      {row("SIM Type", sim)}
      {row("Wi-Fi", wifi)}
      {wifiFeatures ? row("Wi-Fi Features", wifiFeatures) : null}
      {row("Bluetooth", bluetooth)}
      {bluetoothFeatures ? row("Bluetooth Features", bluetoothFeatures) : null}
      {row("GPS", gps)}
      {usbVersion ? row("USB Version", usbVersion) : null}
      {usbFeatures ? row("USB Features", usbFeatures) : null}
      {row("NFC", formatBoolean(network?.nfc))}
      {row("Infrared (IR Blaster)", formatBoolean(network?.infrared))}
    </div>
  );
}

