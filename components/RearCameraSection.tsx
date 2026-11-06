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

function formatAperture(value: unknown): string {
  const text = cleanValue(value);
  if (!text || text === "-") return "-";
  const number = text.replace(/^f\s*\/\s*/i, "").replace(/(\d)\s*[-\u2013\u2014]\s*(?=\d)/g, "$1-");
  return `f/${number}`;
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
  const key = cleanValue(input).toLowerCase().replace(/\s+camera$/, "");
  if (!key) return "";
  if (key === "ultrawide" || key === "ultra-wide") return "Ultra-wide";
  if (key === "telephoto") return "Telephoto";
  if (key === "periscope") return "Periscope";
  if (key === "main") return "Main";
  return key.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function cameraLabels(camera: RearCameraUnit): string[] {
  const roleOnly = /^(primary|main|secondary|tertiary|fourth|fifth)$/i;
  const rawType = [camera.cameraType, camera.purpose, camera.type]
    .map(cleanValue)
    .find((value) => value && !roleOnly.test(value.replace(/\s+camera$/i, ""))) || "";
  const type = prettyRole(rawType
    .replace(/^(primary|main|secondary|tertiary|fourth|fifth)\s+/i, "")
    .replace(/\s+camera$/i, ""));
  return type ? [type] : [];
}

function formatMegapixels(value: unknown): string {
  const text = cleanValue(value);
  if (!text) return "";
  const normalized = text.replace(/^(\d+(?:\.\d+)?)\s*MP$/i, "$1MP");
  return /^\d+(?:\.\d+)?$/.test(normalized) ? `${normalized}MP` : normalized;
}

function sortCameraLocations<T extends { role?: string }>(cameras: T[]): T[] {
  const order = ["primary", "main", "secondary", "tertiary", "fourth", "fifth"];
  return cameras.map((camera, index) => ({ camera, index })).sort((left, right) => {
    const roleKey = (camera: T) => cleanValue(camera.role).toLowerCase().replace(/\s+camera$/, "");
    const leftRank = order.findIndex((role) => roleKey(left.camera) === role || roleKey(left.camera).startsWith(`${role} `));
    const rightRank = order.findIndex((role) => roleKey(right.camera) === role || roleKey(right.camera).startsWith(`${role} `));
    return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank) || left.index - right.index;
  }).map(({ camera }) => camera);
}

function formatFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const value = list.map((item) => cleanValue(item)).filter(Boolean).join(` ${String.fromCharCode(9642)} `);
  return value || "-";
}

function formatVideo(recording?: string[], profiles?: ProductRearCamera["videoProfiles"]): ReactNode {
  const grouped = new Map<string, { name: string; profiles: string[] }>();
  (profiles || []).forEach((profile) => {
    const resolution = cleanValue(profile.resolution);
    if (!resolution) return;
    const name = cleanValue(profile.name);
    const key = name.toLocaleLowerCase();
    const group = grouped.get(key) || { name, profiles: [] };
    const comment = cleanValue(profile.comment);
    group.profiles.push(`${resolution}${comment ? ` (${comment})` : ""}`);
    grouped.set(key, group);
  });
  if (grouped.size > 0) {
    return <div className="space-y-1">{Array.from(grouped.values()).map((group, index) => {
      const label = group.name && !["video recording", "recording"].includes(group.name.toLocaleLowerCase()) ? `${group.name}: ` : "";
      return <p key={`rear-video-type-${index}`}>{label}{group.profiles.join(", ")}</p>;
    })}</div>;
  }
  if (!Array.isArray(recording) || recording.length === 0) return "-";
  const value = recording
    .map((item) => cleanValue(item))
    .filter(Boolean)
    .join(", ");
  return value || "-";
}

function formatZoom(zoom?: ProductRearCamera["zoom"]): ReactNode {
  const entries = [
    ...(cleanValue(zoom?.digital) ? [{ value: cleanValue(zoom?.digital), label: "Digital Zoom" }] : []),
    ...(cleanValue(zoom?.optical) ? [{ value: cleanValue(zoom?.optical), label: "Optical Zoom" }] : []),
  ];
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    const key = `${entry.label}:${entry.value.toLowerCase().replace(/[\u00d7x\s]/g, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) return "";
  return <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">{unique.map((entry, index) => {
    const numeric = entry.value.match(/^(\d+(?:\.\d+)?)(?:\s*[x\u00d7])?$/i);
    const value = numeric ? `${numeric[1]}\u00d7` : entry.value.replace(/\s*x$/i, "\u00d7");
    return <span key={`${entry.label}-${entry.value}-${index}`}><span className="font-semibold text-slate-900">{value}</span><span className="font-normal text-slate-500"> ({entry.label})</span></span>;
  })}</span>;
}

function formatCameraSetup(cameras?: RearCameraUnit[]): string {
  if (!Array.isArray(cameras) || cameras.length === 0) return "-";
  return cameras.map((camera) => formatMegapixels(camera.resolution)).filter(Boolean).join(" + ") || "-";
}

function formatBinnedSensorOutput(camera: RearCameraUnit): string {
  const sensor = camera.sensor;
  if (!sensor || sensor.binningSupported === false) return "";
  const resolution = formatMegapixels(sensor.binnedResolution);
  const pixelSize = formatUnit(sensor.binnedPixelSize, "\u00b5m");
  if (!resolution && !pixelSize) return "";

  let binning = cleanValue(sensor.binningDetails);
  if (binning && !/binning/i.test(binning)) binning = `${binning} pixel binning`;
  if (!binning) {
    const full = Number.parseFloat(cleanValue(camera.resolution));
    const binned = Number.parseFloat(cleanValue(sensor.binnedResolution));
    const ratio = full && binned ? Math.round(full / binned) : 0;
    if (ratio > 1 && ratio <= 16 && Math.abs(full / binned - ratio) < 0.05) binning = `${ratio}-in-1 pixel binning`;
  }

  return [pixelSize, binning].filter(Boolean).join(" ");
}

function formatSensorZoom(camera: RearCameraUnit): string {
  const cameraType = [camera.cameraType, camera.purpose, camera.type, camera.role].map(cleanValue).join(" ");
  if (!/\b(telephoto|periscope|zoom)\b/i.test(cameraType)) return "";
  const formatZoom = (value: unknown, label: string) => {
    const text = cleanValue(value);
    if (!text) return "";
    const normalized = /[x\u00d7]$/i.test(text) ? text.replace(/x$/i, "\u00d7") : /^\d+(?:\.\d+)?$/.test(text) ? `${text}\u00d7` : text;
    return `${normalized} ${label}`;
  };
  return [formatZoom(camera.sensor?.opticalZoom, "Optical Zoom"), formatZoom(camera.sensor?.digitalZoom, "Digital Zoom")].filter(Boolean).join(", ");
}

function formatSensorLine(camera: RearCameraUnit): string {
  const resolution = formatMegapixels(camera.resolution);
  const labels = cameraLabels(camera).join(", ");
  const prefix = [resolution, labels].filter(Boolean).join(" (") + (resolution && labels ? ")" : "");
  const details = [
    cleanValue(camera.sensor?.name),
    formatAperture(camera.sensor?.aperture),
    formatUnit(camera.sensor?.size, '"'),
    [formatUnit(camera.sensor?.pixelSize, "\u00b5m"), formatBinnedSensorOutput(camera) ? `(${formatBinnedSensorOutput(camera)})` : ""].filter(Boolean).join(" "),
    formatUnit(camera.sensor?.fov, "\u00b0"),
    formatSensorZoom(camera),
  ].filter(Boolean).join(", ");
  if (!details) return "";
  return prefix ? `${prefix}: ${details}` : details;
}

function formatStabilization(rearCamera?: ProductRearCamera): string {
  return [rearCamera?.ois ? "OIS" : "", rearCamera?.eis ? "EIS" : ""].filter(Boolean).join(", ");
}

function row(label: string, value: ReactNode) {
  if (value == null || value === "" || value === "-") return null;
  return (
    <div className="grid grid-cols-[104px_8px_minmax(0,1fr)] items-center gap-1 border-b border-slate-100 px-2 py-2 last:border-b-0 sm:grid-cols-[180px_16px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-normal uppercase tracking-[0.04em] text-slate-500 sm:text-[11px] sm:font-bold sm:tracking-wide">{label}</p>
      <p className="relative -left-1 text-xs font-semibold text-slate-500 sm:left-0 sm:text-sm">-</p>
      <div className="relative -left-1 min-w-0 text-[11px] font-semibold text-slate-900 sm:left-0 sm:text-sm">{value}</div>
    </div>
  );
}

export default function RearCameraSection({ rearCamera }: RearCameraSectionProps) {
  const [open, setOpen] = useState(false);
  const cameras = sortCameraLocations(rearCamera?.cameras || []);
  const setup = formatCameraSetup(cameras);
  const sensorLines = cameras.map((camera) => formatSensorLine(camera)).filter(Boolean);
  const zoom = formatZoom(rearCamera?.zoom);
  const flash = cleanValue(rearCamera?.flash?.name) || (rearCamera?.flash?.supported === true ? "Yes" : rearCamera?.flash?.supported === false ? "No" : "");
  return (
    <>
      <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
        {row("Rear Camera Setup", setup)}
        {row(
          "Sensor Details",
          sensorLines.length > 0 ? (
            <div className="space-y-1">
              {sensorLines.map((line, index) => (
                <p key={`rear-line-${index}`}>{line}</p>
              ))}
              <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800">
                <span className="text-base leading-none">+</span>
                <span>View Sensor Details</span>
              </button>
            </div>
          ) : (
            "-"
          ),
        )}
        {row("Flash", flash)}
        {row("Zoom", zoom)}
        {row("Stabilization", formatStabilization(rearCamera))}
        {rearCamera?.cameraIsp && rearCamera.cameraIspVisible === true ? row("Camera ISP", rearCamera.cameraIsp) : null}
        {row("Camera Features", formatFeatures(rearCamera?.features))}
        {row("Video Recording", formatVideo(rearCamera?.video?.recording, rearCamera?.videoProfiles))}
        {row("Video Features", formatFeatures(rearCamera?.video?.features))}
      </div>

      <SensorDetailsModal open={open} onClose={() => setOpen(false)} rearCamera={rearCamera ? { ...rearCamera, cameras } : rearCamera} />
    </>
  );
}

