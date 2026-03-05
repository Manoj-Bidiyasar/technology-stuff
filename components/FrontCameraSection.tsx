import type { ReactNode } from "react";
import type { FrontCameraUnit, ProductFrontCamera } from "@/lib/types/content";

type FrontCameraSectionProps = {
  frontCamera?: ProductFrontCamera;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  return list
    .map((item) => cleanValue(item))
    .filter(Boolean)
    .slice(0, 5)
    .join(" • ") || "-";
}

function formatVideo(recording?: string[]): string {
  if (!Array.isArray(recording) || recording.length === 0) return "-";
  return recording
    .map((item) => cleanValue(item).replace(/@/g, " @"))
    .filter(Boolean)
    .join(" • ") || "-";
}

function formatVideoFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(" • ");
}

function formatCameraLine(cameras?: FrontCameraUnit[]): string {
  if (!Array.isArray(cameras) || cameras.length === 0) return "-";
  const joined = cameras
    .map((camera) => {
      const resolution = cleanValue(camera.resolution);
      const type = cleanValue(camera.type);
      if (!resolution && !type) return "";
      if (!type) return resolution;
      return `${resolution} (${type})`.trim();
    })
    .filter(Boolean)
    .join(" + ");

  return joined || "-";
}

function formatResolutionLabel(value?: string): string {
  const raw = cleanValue(value);
  if (!raw) return "-";
  const mpMatch = raw.match(/(\d+(\.\d+)?)\s*mp/i);
  if (mpMatch) return `${mpMatch[1]}MP`;
  return raw;
}

function formatSensorDetails(cameras?: FrontCameraUnit[]): string[] {
  if (!Array.isArray(cameras) || cameras.length === 0) return [];
  const multiple = cameras.length > 1;

  return cameras
    .map((camera, index) => {
      const details = cleanValue(camera.sensor?.size);

      const resolution = formatResolutionLabel(camera.resolution);
      const role = cleanValue(camera.role).toLowerCase();
      const roleLabel = role
        ? role.charAt(0).toUpperCase() + role.slice(1)
        : index === 0
          ? "Main"
          : "Secondary";
      const header = multiple ? `${resolution} (${roleLabel})` : resolution;

      return details ? `${header}: ${details}` : `${header}:`;
    })
    .filter(Boolean);
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

export default function FrontCameraSection({ frontCamera }: FrontCameraSectionProps) {
  const cameras = frontCamera?.cameras || [];
  const primaryLabel = cameras.length > 1 ? "Front Camera Setup" : "Front Camera";
  const sensorDetails = formatSensorDetails(cameras);
  const videoFeatures = formatVideoFeatures(frontCamera?.video?.features);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {row(primaryLabel, formatCameraLine(cameras))}
      {row(
        "Sensor Details",
        sensorDetails.length > 0 ? (
          <div className="space-y-1">
            {sensorDetails.map((item, index) => (
              <p key={`sensor-${index}`}>{item}</p>
            ))}
          </div>
        ) : (
          "-"
        ),
      )}
      {row("Features", formatFeatures(frontCamera?.features))}
      {row("Video Recording", formatVideo(frontCamera?.video?.recording))}
      {row("Video Features", videoFeatures || "-")}
    </div>
  );
}

