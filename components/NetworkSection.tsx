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

function formatNetworkType(supported?: string[]): string {
  if (!Array.isArray(supported) || supported.length === 0) return "-";
  const normalized = supported.map((item) => cleanValue(item).toUpperCase()).filter(Boolean);
  const has5G = normalized.includes("5G");
  if (has5G) return "5G, 4G";
  if (normalized.includes("4G")) return "4G";
  if (normalized.includes("3G")) return "3G";
  return formatList(normalized, ", ") || "-";
}

function formatBands(bands: ProductNetwork["bands"], has5G: boolean): { label: string; value: string }[] {
  if (!bands) return [];
  if (has5G) {
    const fdd = formatList(bands["5G"]?.fdd);
    const tdd = formatList(bands["5G"]?.tdd);
    return [
      ...(fdd ? [{ label: "FDD", value: fdd }] : []),
      ...(tdd ? [{ label: "TDD", value: tdd }] : []),
    ];
  }

  const fdd = formatList(bands["4G"]?.fdd);
  const tdd = formatList(bands["4G"]?.tdd);
  return [
    ...(fdd ? [{ label: "FDD-LTE", value: fdd }] : []),
    ...(tdd ? [{ label: "TD-LTE", value: tdd }] : []),
  ];
}

function formatWifi(wifi?: ProductNetwork["wifi"]): string {
  if (!wifi) return "-";
  const version = cleanValue(wifi.version);
  const standards = Array.isArray(wifi.standards) ? wifi.standards.map((item) => cleanValue(item)).filter(Boolean) : [];
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
  const config = cleanValue(sim.config);
  if (type && config) return `${type} (${config})`;
  return type || config || "-";
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
  const bandRows = formatBands(network?.bands, has5G);
  const wifi = formatWifi(network?.wifi);
  const sim = formatSim(network?.sim);
  const bluetooth = cleanValue(network?.bluetooth) || "-";
  const gps = formatList(network?.gps) || "-";
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row("Network", formatNetworkType(supported))}
      {row(
        has5G ? "5G Bands" : "4G Bands",
        bandRows.length > 0 ? (
          <div className="space-y-1">
            {bandRows.map((item) => (
              <p key={item.label}>
                <span className="font-bold">{item.label}</span>: {item.value}
              </p>
            ))}
          </div>
        ) : "-",
      )}
      {row("SIM Type", sim)}
      {row("Wi-Fi", wifi)}
      {row("Bluetooth", bluetooth)}
      {row("GPS", gps)}
      {row("NFC", formatBoolean(network?.nfc))}
      {row("Infrared (IR Blaster)", formatBoolean(network?.infrared))}
    </div>
  );
}

