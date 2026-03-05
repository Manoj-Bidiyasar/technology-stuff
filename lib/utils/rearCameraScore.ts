import type { Product, ProductCamera, ProductRearCamera, ProductSpecs, RearCameraUnit } from "@/lib/types/content";

export type RearCameraScoreResult = {
  score: number;
  breakdown: {
    main: number;
    ultraWide: number;
    zoom: number;
    video: number;
    features: number;
    ai: number;
  };
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(text: unknown): string {
  return String(text || "").trim().toLowerCase();
}

function extractMP(value?: string): number {
  const match = String(value || "").match(/(\d+(\.\d+)?)\s*mp/i);
  return match ? Number(match[1]) : 0;
}

function parseZoomX(value?: string): number {
  const match = String(value || "").match(/(\d+(\.\d+)?)\s*x/i);
  return match ? Number(match[1]) : 0;
}

function parseSlowMotionFPS(value?: string): number {
  const match = String(value || "").match(/(\d+(\.\d+)?)\s*fps/i);
  return match ? Number(match[1]) : 0;
}

function hasOpticalZoom(camera?: RearCameraUnit): boolean {
  const zoomText = normalize(camera?.sensor?.zoom);
  return zoomText.includes("optical");
}

function isUsefulCamera(camera?: RearCameraUnit): boolean {
  if (!camera) return false;
  const mp = extractMP(camera.resolution);
  return mp >= 8 || hasOpticalZoom(camera);
}

function getMainCamera(cameras: RearCameraUnit[]): RearCameraUnit | null {
  return cameras.find((camera) => normalize(camera.role) === "main" || normalize(camera.type) === "main") || cameras[0] || null;
}

function getUltraWideCamera(cameras: RearCameraUnit[]): RearCameraUnit | null {
  return cameras.find((camera) => {
    const role = normalize(camera.role);
    const type = normalize(camera.type);
    return role.includes("ultra") || type.includes("ultra");
  }) || null;
}

function getZoomCameras(cameras: RearCameraUnit[]): RearCameraUnit[] {
  return cameras.filter((camera) => {
    const role = normalize(camera.role);
    const type = normalize(camera.type);
    return role.includes("telephoto") || role.includes("periscope") || type.includes("telephoto") || type.includes("periscope") || hasOpticalZoom(camera);
  });
}

function scoreMain(main: RearCameraUnit | null): number {
  if (!main) return 1.7;
  const sensor = normalize(main.sensor?.name);
  let score = 1.3;
  if (sensor.includes("sony imx9")) score = 2.2;
  else if (sensor.includes("sony imx8")) score = 2;
  else if (sensor.includes("samsung gn")) score = 1.8;
  else if (sensor.includes("omnivision") && (sensor.includes("ov5") || sensor.includes("ov6") || sensor.includes("ov50"))) score = 1.6;

  const mp = extractMP(main.resolution);
  if (mp >= 50) score += 0.8;
  else if (mp >= 48) score += 0.7;
  else if (mp >= 32) score += 0.6;
  else if (mp >= 16) score += 0.5;
  else score += 0.4;

  if (main.sensor?.ois) score += 0.5;
  return clamp(score, 0, 3.5);
}

function scoreUltraWide(camera: RearCameraUnit | null): number {
  if (!camera) return 0;
  const mp = extractMP(camera.resolution);
  if (mp < 8) return 0;

  let score = 0.6;
  if (mp >= 12) score = 1.5;
  else if (mp >= 8) score = 1;

  const autofocus = normalize(camera.sensor?.autofocus);
  if (autofocus && autofocus !== "fixed focus") score += 0.2;
  return clamp(score, 0, 1.5);
}

function scoreZoom(cameras: RearCameraUnit[]): number {
  const valid = cameras.filter((camera) => isUsefulCamera(camera));
  if (valid.length === 0) return 0;

  let best = 0;
  valid.forEach((camera) => {
    const role = normalize(camera.role);
    const type = normalize(camera.type);
    const zoomX = parseZoomX(camera.sensor?.zoom);
    const isPeriscope = role.includes("periscope") || type.includes("periscope");
    const isTelephoto = role.includes("telephoto") || type.includes("telephoto");

    let value = 0;
    if (isPeriscope && zoomX >= 5) value = 2;
    else if ((isPeriscope || isTelephoto) && zoomX >= 3) value = 1.6;
    else if (zoomX > 0) value = 1.2;
    if (value > best) best = value;
  });

  const distinctZooms = new Set(
    valid
      .map((camera) => parseZoomX(camera.sensor?.zoom))
      .filter((value) => value > 0)
      .map((value) => (value >= 5 ? "5x+" : value >= 3 ? "3x+" : "sub3x")),
  );
  if (distinctZooms.size >= 2) best += 0.3;
  if (valid.some((camera) => camera.sensor?.ois)) best += 0.2;

  return clamp(best, 0, 2.5);
}

function scoreVideo(rearCamera?: ProductRearCamera): number {
  const recording = rearCamera?.video?.recording || [];
  const slowMotion = rearCamera?.video?.slowMotion || [];
  const recordingText = recording.map((item) => normalize(item));

  let score = 0;
  if (recordingText.some((item) => item.includes("8k"))) score = 1.2;
  else if (recordingText.some((item) => item.includes("4k") && item.includes("60"))) score = 1;
  else if (recordingText.some((item) => item.includes("4k") && item.includes("30"))) score = 0.8;

  const slowValues = slowMotion.map((item) => parseSlowMotionFPS(item));
  const bestSlow = slowValues.length ? Math.max(...slowValues) : 0;
  if (bestSlow >= 960) score += 0.3;
  else if (bestSlow >= 240) score += 0.2;
  else if (bestSlow >= 120) score += 0.1;

  return clamp(score, 0, 1.5);
}

function scoreFeatures(rearCamera?: ProductRearCamera, main?: RearCameraUnit | null): number {
  const features = (rearCamera?.features || []).map((item) => normalize(item));
  let score = 0;
  if (main?.sensor?.ois) score += 0.3;
  if (features.some((item) => item.includes("pdaf") || item.includes("dual pixel"))) score += 0.2;
  if (features.some((item) => item.includes("hdr"))) score += 0.1;
  if (features.some((item) => item.includes("night mode"))) score += 0.1;
  if (features.some((item) => item.includes("laser af"))) score += 0.1;
  return clamp(score, 0, 0.6);
}

function scoreAi(rearCamera?: ProductRearCamera): number {
  const ai = (rearCamera?.aiFeatures || []).map((item) => normalize(item));
  let score = 0;
  if (ai.some((item) => item.includes("ai hdr"))) score += 0.2;
  if (ai.some((item) => item.includes("ai night"))) score += 0.1;
  if (ai.some((item) => item.includes("ai scene"))) score += 0.1;
  return clamp(score, 0, 0.4);
}

export function calculateRearCameraScore(input: { rearCamera?: ProductRearCamera }): RearCameraScoreResult {
  const rearCamera = input.rearCamera;
  const allCameras = Array.isArray(rearCamera?.cameras) ? rearCamera!.cameras! : [];
  const usefulCameras = allCameras.filter((camera) => isUsefulCamera(camera));

  const main = getMainCamera(usefulCameras);
  const ultraWide = getUltraWideCamera(usefulCameras);
  const zoomCameras = getZoomCameras(usefulCameras);

  const mainScore = scoreMain(main);
  const ultraWideScore = scoreUltraWide(ultraWide);
  const zoomScore = scoreZoom(zoomCameras);
  const videoScore = scoreVideo(rearCamera);
  const featuresScore = scoreFeatures(rearCamera, main);
  const aiScore = scoreAi(rearCamera);

  return {
    score: round1(clamp(mainScore + ultraWideScore + zoomScore + videoScore + featuresScore + aiScore, 0, 10)),
    breakdown: {
      main: round1(clamp(mainScore, 0, 3.5)),
      ultraWide: round1(clamp(ultraWideScore, 0, 1.5)),
      zoom: round1(clamp(zoomScore, 0, 2.5)),
      video: round1(clamp(videoScore, 0, 1.5)),
      features: round1(clamp(featuresScore, 0, 0.6)),
      ai: round1(clamp(aiScore, 0, 0.4)),
    },
  };
}

function splitRearString(value?: string): RearCameraUnit[] {
  const text = String(value || "").trim();
  if (!text) return [];
  const parts = text.split("+").map((item) => item.trim()).filter(Boolean);
  return parts.map((item, index) => ({
    role: index === 0 ? "main" : "secondary",
    type: index === 0 ? "Main" : "Secondary",
    resolution: item,
    sensor: {},
  }));
}

function mapLegacyRearFromCamera(camera?: ProductCamera): ProductRearCamera {
  const cameras = Array.isArray(camera?.rear)
    ? camera!.rear!.map((item, index) => ({
        role: index === 0 ? "main" : "secondary",
        type: item.sensorType || (index === 0 ? "Main" : "Secondary"),
        resolution: item.resolution,
        sensor: {
          name: item.name,
          aperture: item.aperture,
          size: item.sensorSize,
          pixelSize: item.pixelSize,
          focalLength: item.focalLength,
          fov: "",
          zoom: item.zoom,
          autofocus: typeof item.autofocus === "string" ? item.autofocus : item.autofocus ? "Yes" : "",
          ois: item.ois,
          eis: item.eis,
        },
      }))
    : [];

  return {
    cameras,
    features: camera?.features || [],
    aiFeatures: [],
    zoom: {},
    video: {
      recording: camera?.video?.rear || [],
      slowMotion: camera?.video?.slowMotion || [],
      features: camera?.video?.features || [],
    },
  };
}

export function fallbackRearCameraFromProduct(
  product: Pick<Product, "rearCamera" | "camera" | "specs">,
): ProductRearCamera {
  if (product.rearCamera && Array.isArray(product.rearCamera.cameras) && product.rearCamera.cameras.length > 0) {
    return product.rearCamera;
  }

  const fromCamera = mapLegacyRearFromCamera(product.camera);
  if (fromCamera.cameras && fromCamera.cameras.length > 0) {
    return fromCamera;
  }

  return {
    cameras: splitRearString((product.specs as ProductSpecs | undefined)?.rearCamera || (product.specs as ProductSpecs | undefined)?.camera),
    features: [],
    aiFeatures: [],
    zoom: {},
    video: {
      recording: [],
      slowMotion: [],
      features: [],
    },
  };
}
