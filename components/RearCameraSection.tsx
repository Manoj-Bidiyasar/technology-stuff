"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import SensorDetailsModal from "@/components/SensorDetailsModal";
import type { ProductRearCamera, RearCameraUnit } from "@/lib/types/content";

type RearCameraSectionProps = {
  rearCamera?: ProductRearCamera;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatUnit(value: unknown, unit: string, prefix = ""): string {
  const text = cleanValue(value);
  if (!text) return "";
  if (prefix && text.toLowerCase().startsWith(prefix.toLowerCase())) return text;
  if (unit && text.toLowerCase().endsWith(unit.toLowerCase())) return text;
  return `${prefix}${text}${unit}`;
}

function formatFocalLengths(value: unknown): string {
  const text = cleanValue(value);
  if (!text) return "";
  return text.split(",").map((part) => formatUnit(part.trim(), "mm")).join(", ");
}

function prettyRole(input?: string): string {
  const key = cleanValue(input).toLowerCase();
  if (!key) return "";
  if (key === "ultrawide" || key === "ultra-wide") return "Ultra-wide";
  if (key === "telephoto") return "Telephoto";
  if (key === "periscope") return "Periscope";
  if (key === "main") return "Main";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const value = list.map((item) => cleanValue(item)).filter(Boolean).join(", ");
  return value || "-";
}

function formatVideo(recording?: string[]): string {
  if (!Array.isArray(recording) || recording.length === 0) return "-";
  const value = recording
    .map((item) => cleanValue(item).replace(/@/g, " @"))
    .filter(Boolean)
    .join(", ");
  return value || "-";
}

function formatZoom(zoom?: ProductRearCamera["zoom"]): string {
  const parts = [
    cleanValue(zoom?.optical) ? `${cleanValue(zoom?.optical)} Optical` : "",
    cleanValue(zoom?.digital) ? `${cleanValue(zoom?.digital)} Digital` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

function formatCameraSetup(cameras?: RearCameraUnit[]): string {
  if (!Array.isArray(cameras) || cameras.length === 0) return "-";
  const value = cameras
    .map((camera) => {
      const resolution = cleanValue(camera.resolution);
      const type = cleanValue(camera.type) || prettyRole(camera.role);
      if (!resolution && !type) return "";
      if (resolution && type) return `${resolution} (${type})`;
      return resolution || type;
    })
    .filter(Boolean)
    .join(" + ");

  return value || "-";
}

function formatSensorLine(camera: RearCameraUnit): string {
  const resolution = cleanValue(camera.resolution);
  const type = cleanValue(camera.type) || prettyRole(camera.role);
  const prefix = `${resolution}${type ? ` (${type})` : ""}`.trim();

  const extras = [
    cleanValue(camera.sensor?.name),
    formatUnit(camera.sensor?.aperture, "", "f/"),
    formatFocalLengths(camera.sensor?.focalLength),
    formatUnit(camera.sensor?.size, '"'),
    formatUnit(camera.sensor?.pixelSize, "µm"),
    camera.sensor?.binnedResolution || camera.sensor?.binnedPixelSize
      ? `Binned: ${[
          formatUnit(camera.sensor?.binnedResolution, " MP"),
          formatUnit(camera.sensor?.binnedPixelSize, "µm"),
        ].filter(Boolean).join(", ")}`
      : "",
    cleanValue(camera.sensor?.autofocus),
    cleanValue(camera.sensor?.zoom),
    formatUnit(camera.sensor?.fov, "°"),
    camera.sensor?.ois ? "OIS" : "",
    camera.sensor?.eis ? "EIS" : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (!prefix && !extras) return "";
  if (!prefix) return extras;
  if (!extras) return prefix;
  return `${prefix}: ${extras}`;
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

export default function RearCameraSection({ rearCamera }: RearCameraSectionProps) {
  const [open, setOpen] = useState(false);
  const cameras = rearCamera?.cameras || [];
  const setup = formatCameraSetup(cameras);
  const sensorLines = cameras.map((camera) => formatSensorLine(camera)).filter(Boolean);
  const zoom = formatZoom(rearCamera?.zoom);
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white">
        {row("Rear Camera Setup", setup)}
        {row(
          "Sensor Details",
          sensorLines.length > 0 ? (
            <div className="space-y-1">
              {sensorLines.map((line, index) => (
                <p key={`rear-line-${index}`}>{line}</p>
              ))}
              <button type="button" onClick={() => setOpen(true)} className="pt-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
                View Sensor Details
              </button>
            </div>
          ) : (
            "-"
          ),
        )}
        {rearCamera?.cameraIsp && rearCamera.cameraIspVisible === true ? row("Camera ISP", rearCamera.cameraIsp) : null}
        {row("Features", formatFeatures(rearCamera?.features))}
        {row("Zoom", zoom || "-")}
        {row("Video Recording", formatVideo(rearCamera?.video?.recording))}
        {row("Video Features", formatFeatures(rearCamera?.video?.features))}
      </div>

      <SensorDetailsModal open={open} onClose={() => setOpen(false)} rearCamera={rearCamera} />
    </>
  );
}

