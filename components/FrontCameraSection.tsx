"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { FrontCameraUnit, ProductFrontCamera } from "@/lib/types/content";
import FrontSensorDetailsModal from "@/components/FrontSensorDetailsModal";

type FrontCameraSectionProps = {
  frontCamera?: ProductFrontCamera;
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

function cameraLabels(camera: FrontCameraUnit): string[] {
  const roleOnly = /^(primary|main|secondary|tertiary|fourth|fifth)$/i;
  const rawType = [camera.cameraType, camera.purpose, camera.type]
    .map(cleanValue)
    .find((value) => value && !roleOnly.test(value.replace(/\s+camera$/i, ""))) || "";
  const normalizedType = rawType
    .replace(/^(primary|main|secondary|tertiary|fourth|fifth)\s+/i, "")
    .replace(/^(primary|main|secondary|tertiary|fourth|fifth)$/i, "")
    .replace(/\s+camera$/i, "");
  return normalizedType ? [normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)] : [];
}

function formatFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "-";
  return list
    .map((item) => cleanValue(item))
    .filter(Boolean)
    .join(` ${String.fromCharCode(9642)} `) || "-";
}

function formatVideo(recording?: string[], profiles?: ProductFrontCamera["videoProfiles"]): ReactNode {
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
      return <p key={`front-video-type-${index}`}>{label}{group.profiles.join(", ")}</p>;
    })}</div>;
  }
  if (!Array.isArray(recording) || recording.length === 0) return "-";
  return recording
    .map((item) => cleanValue(item))
    .filter(Boolean)
    .join(", ") || "-";
}

function formatVideoFeatures(list?: string[]): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((item) => cleanValue(item)).filter(Boolean).join(` ${String.fromCharCode(9642)} `);
}

function formatZoom(frontCamera?: ProductFrontCamera): ReactNode {
  const entries = [
    ...(cleanValue(frontCamera?.zoom?.digital)
      ? [{ value: cleanValue(frontCamera?.zoom?.digital), label: "Digital Zoom" }]
      : []),
    ...(cleanValue(frontCamera?.zoom?.optical)
      ? [{ value: cleanValue(frontCamera?.zoom?.optical), label: "Optical Zoom" }]
      : []),
  ].filter((entry) => entry.value);
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    const key = `${entry.label}:${entry.value.toLowerCase().replace(/[\u00d7x\s]/g, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) return "";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {unique.map((entry, index) => {
        const numeric = entry.value.match(/^(\d+(?:\.\d+)?)(?:\s*[x\u00d7])?$/i);
        const value = numeric ? `${numeric[1]}\u00d7` : entry.value.replace(/\s*x$/i, "\u00d7");
        return (
          <span key={`${entry.label}-${entry.value}-${index}`}>
            <span className="font-semibold text-slate-900">{value}</span>
            <span className="font-normal text-slate-500"> ({entry.label})</span>
          </span>
        );
      })}
    </span>
  );
}

function formatStabilization(frontCamera?: ProductFrontCamera): string {
  const ois = frontCamera?.ois === true;
  const eis = frontCamera?.eis === true;
  return [ois ? "OIS" : "", eis ? "EIS" : ""].filter(Boolean).join(", ");
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

function formatCameraLine(cameras?: FrontCameraUnit[]): string {
  if (!Array.isArray(cameras) || cameras.length === 0) return "-";
  return cameras.map((camera) => formatResolutionLabel(camera.resolution)).filter(Boolean).join(" + ") || "-";
}

function formatResolutionLabel(value?: string): string {
  const raw = cleanValue(value);
  if (!raw) return "";
  const mpMatch = raw.match(/(\d+(\.\d+)?)\s*mp/i);
  if (mpMatch) return raw.replace(mpMatch[0], `${mpMatch[1]}MP`);
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}MP` : raw;
}

function formatFrontCameraFeatures(frontCamera?: ProductFrontCamera): ReactNode {
  return formatFeatures(frontCamera?.features);
}

function formatBinnedSensorOutput(camera: FrontCameraUnit): string {
  const sensor = camera.sensor;
  if (!sensor || sensor.binningSupported === false) return "";
  const resolution = formatResolutionLabel(sensor.binnedResolution);
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

  const binnedPixel = [pixelSize, binning].filter(Boolean).join(" ");
  return binnedPixel;
}

function formatSensorZoom(camera: FrontCameraUnit): string {
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

function formatSensorDetails(cameras?: FrontCameraUnit[]): string[] {
  if (!Array.isArray(cameras) || cameras.length === 0) return [];
  const multiple = cameras.length > 1;

  return cameras
    .map((camera) => {
      const details = [
        cleanValue(camera.sensor?.name),
        formatAperture(camera.sensor?.aperture),
        formatUnit(camera.sensor?.size, '"'),
        [formatUnit(camera.sensor?.pixelSize, "\u00b5m"), formatBinnedSensorOutput(camera) ? `(${formatBinnedSensorOutput(camera)})` : ""].filter(Boolean).join(" "),
        formatUnit(camera.sensor?.fov, "\u00b0"),
        formatSensorZoom(camera),
      ].filter(Boolean).join(", ");

      const resolution = multiple ? formatResolutionLabel(camera.resolution) : "";
      const type = multiple ? cameraLabels(camera).join(", ") : "";
      const header = [resolution, type].filter(Boolean).join(" (").replace(/ \($/, "") + (resolution && type ? ")" : "");

      return details ? `${header}${header ? ": " : ""}${details}` : "";
    })
    .filter(Boolean);
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

export default function FrontCameraSection({ frontCamera }: FrontCameraSectionProps) {
  const [sensorModalOpen, setSensorModalOpen] = useState(false);
  const cameras = sortCameraLocations(frontCamera?.cameras || []);
  const primaryLabel = cameras.length > 1 ? "Front Camera Setup" : "Front Camera";
  const sensorDetails = formatSensorDetails(cameras);
  const cameraFeatures = formatFrontCameraFeatures(frontCamera);
  const zoom = formatZoom(frontCamera);
  const stabilization = formatStabilization(frontCamera);
  const videoFeatures = formatVideoFeatures(frontCamera?.video?.features);
  return (
    <>
      <div className="empty:hidden rounded-xl border border-slate-200 bg-white">
        {row(primaryLabel, formatCameraLine(cameras))}
        {row(
          "Sensor Details",
          sensorDetails.length > 0 ? (
            <div className="space-y-1">
              {sensorDetails.map((item, index) => (
                <p key={`sensor-${index}`}>{item}</p>
              ))}
              <button type="button" onClick={() => setSensorModalOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800">
                <span className="text-base leading-none">+</span>
                <span>View Sensor Details</span>
              </button>
            </div>
          ) : (
            "-"
          ),
        )}
        {row("Zoom", zoom)}
        {row("Stabilization", stabilization)}
        {row("Camera Features", cameraFeatures)}
        {row("Video Recording", formatVideo(frontCamera?.video?.recording, frontCamera?.videoProfiles))}
        {row("Video Features", videoFeatures || "-")}
      </div>
      <FrontSensorDetailsModal open={sensorModalOpen} onClose={() => setSensorModalOpen(false)} cameras={cameras} />
    </>
  );
}

