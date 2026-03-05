import type { ReactNode } from "react";
import Tag from "@/components/Tag";
import type { ProductCamera, ProductCameraSensor, ProductSpecs } from "@/lib/types/content";

type CameraSpecsTableProps = {
  camera?: ProductCamera;
  specs?: ProductSpecs;
  side?: "rear" | "front" | "both";
};

function hasText(value: unknown): boolean {
  return Boolean(String(value || "").trim());
}

function boolText(value: boolean | string | undefined): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (hasText(value)) return String(value);
  return "-";
}

function splitSensorString(value?: string): string[] {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split("+").map((item) => item.trim()).filter(Boolean);
}

function fallbackSensors(value?: string): ProductCameraSensor[] {
  const parts = splitSensorString(value);
  return parts.map((item, index) => ({
    name: `Sensor ${index + 1}`,
    resolution: item,
  }));
}

function withFallbackSensors(
  list: ProductCameraSensor[] | undefined,
  fallbackValue?: string,
): ProductCameraSensor[] {
  if (Array.isArray(list) && list.length > 0) return list;
  return fallbackSensors(fallbackValue);
}

function sensorSummary(sensors: ProductCameraSensor[]): string {
  if (!Array.isArray(sensors) || sensors.length === 0) return "-";
  return sensors
    .map((sensor) => sensor.resolution || sensor.name || "-")
    .filter(Boolean)
    .join(" + ");
}

function renderRow(label: string, value: ReactNode) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function renderSensorsInline(sensors: ProductCameraSensor[]) {
  if (!sensors.length) return null;

  return sensors.map((sensor, index) => (
    <div key={`inline-sensor-${index}`} className="border-t border-slate-100">
      <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-blue-700">
        {sensor.name || `Sensor ${index + 1}`}
      </div>
      {renderRow("Resolution", sensor.resolution || "-")}
      {renderRow("Sensor Size", sensor.sensorSize || "-")}
      {renderRow("Sensor Type", sensor.sensorType || "-")}
      {renderRow("Aperture", sensor.aperture || "-")}
      {renderRow("Focal Length", sensor.focalLength || "-")}
      {renderRow("Pixel Size", sensor.pixelSize || "-")}
      {renderRow("OIS", boolText(sensor.ois))}
      {renderRow("EIS", boolText(sensor.eis))}
      {renderRow("Auto Focus", boolText(sensor.autofocus))}
      {renderRow("Zoom", sensor.zoom || "-")}
    </div>
  ));
}

function renderList(value: string[] | undefined): ReactNode {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.join(", ");
}

function renderTags(value: string[] | undefined): ReactNode {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </div>
  );
}

export default function CameraSpecsTable({ camera, specs, side = "both" }: CameraSpecsTableProps) {
  const rearSensors = withFallbackSensors(camera?.rear, specs?.rearCamera || specs?.camera);
  const frontSensors = withFallbackSensors(camera?.front, specs?.frontCamera);
  const showRear = side === "rear" || side === "both";
  const showFront = side === "front" || side === "both";

  return (
    <div className="space-y-3">
      {showRear ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {side === "both" ? (
            <div className="bg-slate-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">
              Rear Camera
            </div>
          ) : null}
          {renderRow("Rear Setup", sensorSummary(rearSensors))}
          {renderRow("Flash", renderList(camera?.flash))}
          {renderRow("Video Recording", renderList(camera?.video?.rear))}
          {renderRow("Slow Motion", renderList(camera?.video?.slowMotion))}
          {renderRow("Video Features", renderTags(camera?.video?.features))}
          {renderRow("Other Features", renderTags(camera?.otherFeatures || camera?.features))}
          {renderSensorsInline(rearSensors)}
        </div>
      ) : null}

      {showFront ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {side === "both" ? (
            <div className="bg-slate-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">
              Front Camera
            </div>
          ) : null}
          {renderRow("Front Setup", sensorSummary(frontSensors))}
          {renderRow("Video Recording", renderList(camera?.video?.front))}
          {renderSensorsInline(frontSensors)}
        </div>
      ) : null}
    </div>
  );
}

