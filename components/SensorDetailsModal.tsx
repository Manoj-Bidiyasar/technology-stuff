"use client";

import { useEffect } from "react";
import type { ProductRearCamera } from "@/lib/types/content";

type SensorDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  rearCamera?: ProductRearCamera;
};

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "-";
}

function formatCameraLabel(camera: NonNullable<ProductRearCamera["cameras"]>[number], multiple: boolean): string {
  const rawResolution = cleanValue(camera.resolution);
  const resolution = rawResolution === "-" ? "" : /^\d+(?:\.\d+)?$/.test(rawResolution) ? `${rawResolution}MP` : rawResolution.replace(/\s*mp$/i, "MP");
  if (!multiple) return resolution || "-";

  const rawType = cleanValue(camera.cameraType || camera.purpose || camera.type || camera.role);
  const normalized = rawType
    .replace(/^(primary|main)$/i, "Main")
    .replace(/^(secondary)$/i, "Secondary")
    .replace(/^(tertiary)$/i, "Tertiary")
    .replace(/\s+camera$/i, "")
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  if (!resolution) return normalized || "-";
  return normalized ? `${resolution} (${normalized})` : resolution;
}

function formatAperture(value: unknown): string {
  const text = cleanValue(value);
  if (!text || text === "-") return "-";
  const number = text.replace(/^f\s*\/\s*/i, "").replace(/(\d)\s*[-\u2013\u2014]\s*(?=\d)/g, "$1-");
  return `f/${number}`;
}

function formatUnit(value: unknown, unit: string, prefix = ""): string {
  const text = cleanValue(value);
  if (text === "-") return "-";
  if (prefix && text.toLowerCase().startsWith(prefix.toLowerCase())) return text;
  if (unit && text.toLowerCase().endsWith(unit.toLowerCase())) return text;
  return `${prefix}${text}${unit}`;
}

function formatPixelSize(camera: NonNullable<ProductRearCamera["cameras"]>[number]): string {
  const sensor = camera.sensor;
  const full = formatUnit(sensor?.pixelSize, "\u00b5m");
  if (!sensor || sensor.binningSupported === false) return full;
  const resolutionText = cleanValue(sensor.binnedResolution);
  const pixelSizeText = formatUnit(sensor.binnedPixelSize, "\u00b5m");
  const pixelSize = pixelSizeText === "-" ? "" : pixelSizeText;
  if (resolutionText === "-" && !pixelSize && cleanValue(sensor.binningDetails) === "-") return full;
  let binning = cleanValue(sensor.binningDetails);
  if (binning !== "-" && !/binning/i.test(binning)) binning = `${binning} pixel binning`;
  if (binning === "-") {
    const fullResolution = Number.parseFloat(cleanValue(camera.resolution));
    const binnedResolution = Number.parseFloat(resolutionText);
    const ratio = fullResolution && binnedResolution ? Math.round(fullResolution / binnedResolution) : 0;
    if (ratio > 1 && ratio <= 16 && Math.abs(fullResolution / binnedResolution - ratio) < 0.05) binning = `${ratio}-in-1 pixel binning`;
    else binning = "";
  }
  const output = [pixelSize, binning].filter(Boolean).join(" ");
  return full === "-" ? output : `${full}${output ? ` (${output})` : ""}`;
}

function formatFocalLengths(value: unknown): string {
  const text = cleanValue(value);
  if (text === "-") return "-";
  return text.split(",").map((part) => formatUnit(part.trim(), "mm")).join(", ");
}

export default function SensorDetailsModal({ open, onClose, rearCamera }: SensorDetailsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const cameras = rearCamera?.cameras || [];

  const columns: Array<{ label: string; getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => string; always?: boolean }> = [
    { label: "Camera", always: true, getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatCameraLabel(camera, cameras.length > 1) },
    { label: "Sensor", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => cleanValue(camera.sensor?.name) },
    { label: "Aperture", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatAperture(camera.sensor?.aperture) },
    { label: "Sensor Size", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatUnit(camera.sensor?.size, '"') },
    { label: "Pixel Size", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatPixelSize(camera) },
    { label: "FOV", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatUnit(camera.sensor?.fov, "\u00b0") },
    { label: "Focal Length", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatFocalLengths(camera.sensor?.focalLength) },
    { label: "Lens Type", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => cleanValue(camera.sensor?.lensType) },
    { label: "Optical Zoom", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatUnit(camera.sensor?.opticalZoom, "\u00d7") },
    { label: "Digital Zoom", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => formatUnit(camera.sensor?.digitalZoom, "\u00d7") },
    { label: "Stabilization", getValue: (camera: NonNullable<ProductRearCamera["cameras"]>[number]) => [camera.sensor?.ois ? "OIS" : "", camera.sensor?.eis ? "EIS" : ""].filter(Boolean).join(", ") || "-" },
  ].filter((column) => column.always || cameras.some((camera: NonNullable<ProductRearCamera["cameras"]>[number]) => column.getValue(camera) !== "-"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rear Camera Sensor Details"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Rear Camera Sensor Details</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close sensor details modal">
            &times;
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-600">
              <tr>{columns.map((column) => <th key={column.label} className="whitespace-nowrap px-3 py-2">{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {cameras.length > 0 ? cameras.map((camera, index) => (
                <tr key={`${camera.role || camera.cameraType || "rear-camera"}-${index}`} className="border-t border-slate-100 text-slate-800">
                  {columns.map((column) => <td key={column.label} className="whitespace-nowrap px-3 py-2">{column.getValue(camera)}</td>)}
                </tr>
              )) : (
                <tr><td className="px-3 py-3 text-sm font-semibold text-slate-500" colSpan={columns.length}>No rear sensor details available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
