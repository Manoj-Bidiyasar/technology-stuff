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

function formatBoolean(value?: boolean): string {
  if (typeof value !== "boolean") return "-";
  return value ? "Yes" : "No";
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close sensor details modal"
          >
            &times;
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Sensor</th>
                <th className="px-3 py-2">Aperture</th>
                <th className="px-3 py-2">Sensor Size</th>
                <th className="px-3 py-2">Pixel Size</th>
                <th className="px-3 py-2">FOV</th>
                <th className="px-3 py-2">Focal Length</th>
                <th className="px-3 py-2">Zoom</th>
                <th className="px-3 py-2">Autofocus</th>
                <th className="px-3 py-2">OIS</th>
                <th className="px-3 py-2">EIS</th>
              </tr>
            </thead>
            <tbody>
              {cameras.length > 0 ? (
                cameras.map((camera, index) => {
                  const res = cleanValue(camera.resolution);
                  const type = cleanValue(camera.type);
                  const name = cleanValue(camera.sensor?.name);
                  const title = `${res}${type !== "-" ? ` (${type})` : ""}${name !== "-" ? ` ${name}` : ""}`.trim();
                  return (
                    <tr key={`${title}-${index}`} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 font-semibold">{title || "-"}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.aperture)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.size)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.pixelSize)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.fov)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.focalLength)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.zoom)}</td>
                      <td className="px-3 py-2">{cleanValue(camera.sensor?.autofocus)}</td>
                      <td className="px-3 py-2">{formatBoolean(camera.sensor?.ois)}</td>
                      <td className="px-3 py-2">{formatBoolean(camera.sensor?.eis)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-3 text-sm font-semibold text-slate-500" colSpan={10}>
                    No rear sensor details available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
