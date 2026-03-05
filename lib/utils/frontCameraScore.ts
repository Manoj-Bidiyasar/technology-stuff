import type { FrontCameraUnit, Product, ProductCamera, ProductFrontCamera, ProductSpecs } from "@/lib/types/content";

export type FrontCameraScoreResult = {
  score: number;
  breakdown: {
    main: number;
    sensor: number;
    video: number;
    features: number;
    secondary: number;
  };
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function safeValue<T>(value: T | undefined | null, fallback: T): T {
  return value ?? fallback;
}

function normalize(text: unknown): string {
  return String(text || "").trim().toLowerCase();
}

export function extractMP(resolution?: string): number {
  const match = String(resolution || "").match(/(\d+(\.\d+)?)\s*mp/i);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

export function parseSensorSize(sizeString?: string): number {
  const text = String(sizeString || "").trim();
  const fraction = text.match(/(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)/);
  if (fraction) {
    const left = Number(fraction[1]);
    const right = Number(fraction[3]);
    if (left > 0 && right > 0) return left / right;
  }
  const direct = text.match(/(\d+(\.\d+)?)/);
  return direct ? Number(direct[1]) : 0;
}

export function parsePixelSize(pixelString?: string): number {
  const match = String(pixelString || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function getMainCamera(cameras?: FrontCameraUnit[]): FrontCameraUnit | null {
  if (!Array.isArray(cameras) || cameras.length === 0) return null;
  return cameras.find((item) => normalize(item.role) === "main") || cameras[0] || null;
}

export function getSecondaryCamera(cameras?: FrontCameraUnit[]): FrontCameraUnit | null {
  if (!Array.isArray(cameras) || cameras.length <= 1) return null;
  const nonMain = cameras.find((item) => normalize(item.role) !== "main");
  return nonMain || cameras[1] || null;
}

function scoreMain(main: FrontCameraUnit | null): number {
  if (!main) return 2;
  const mp = extractMP(main.resolution);
  let score = 1.5;
  if (mp >= 50) score = 3;
  else if (mp >= 32) score = 2.6;
  else if (mp >= 16) score = 2.2;
  else if (mp >= 12) score = 1.8;

  if (main.autofocus) score += 0.2;
  return clamp(score, 0, 3);
}

function scoreSensor(main: FrontCameraUnit | null): number {
  if (!main || !main.sensor) return 1.5;
  const name = normalize(main.sensor.name);
  let score = 0.7;
  if (name.includes("sony")) score = 1.2;
  else if (name.includes("samsung")) score = 1;
  else if (name.includes("omnivision") || name.includes("omni vision")) score = 0.9;

  const size = parseSensorSize(main.sensor.size);
  if (size >= 0.4) score += 0.7;
  else if (size >= 0.333) score += 0.5;
  else if (size >= 0.25) score += 0.3;

  const pixel = parsePixelSize(main.sensor.pixelSize);
  if (pixel >= 1) score += 0.6;
  else if (pixel >= 0.8) score += 0.4;
  else if (pixel > 0) score += 0.2;

  return clamp(score, 0, 2.5);
}

function bestRecording(recording?: string[]): string {
  if (!Array.isArray(recording) || recording.length === 0) return "";
  const ranks: Array<{ pattern: RegExp; value: number; key: string }> = [
    { pattern: /4k\s*@?\s*60/i, value: 4, key: "4k60" },
    { pattern: /4k\s*@?\s*30/i, value: 3, key: "4k30" },
    { pattern: /1080p?\s*@?\s*60/i, value: 2, key: "1080p60" },
    { pattern: /1080p?\s*@?\s*30/i, value: 1, key: "1080p30" },
  ];

  let best = "";
  let bestRank = 0;
  recording.forEach((line) => {
    const text = normalize(line);
    ranks.forEach((rule) => {
      if (rule.pattern.test(text) && rule.value > bestRank) {
        bestRank = rule.value;
        best = rule.key;
      }
    });
  });
  return best;
}

function scoreVideo(frontCamera?: ProductFrontCamera): number {
  const recording = frontCamera?.video?.recording;
  const features = [
    ...(frontCamera?.features || []),
    ...(frontCamera?.video?.features || []),
  ].map((item) => normalize(item));

  let score = 1.2;
  const best = bestRecording(recording);
  if (best === "4k60") score = 2;
  else if (best === "4k30") score = 1.8;
  else if (best === "1080p60") score = 1.5;
  else if (best === "1080p30") score = 1.2;

  if (features.some((item) => item.includes("eis"))) score += 0.2;
  if (features.some((item) => item.includes("hdr video"))) score += 0.2;
  return clamp(score, 0, 2);
}

function scoreFeatures(frontCamera?: ProductFrontCamera): number {
  const features = (frontCamera?.features || []).map((item) => normalize(item));
  if (features.length === 0) return 0.5;
  let score = 0;
  if (features.some((item) => item.includes("hdr"))) score += 0.4;
  if (features.some((item) => item.includes("portrait"))) score += 0.4;
  if (features.some((item) => item.includes("eis"))) score += 0.3;
  if (features.some((item) => item.includes("ai beauty") || item.includes("beauty"))) score += 0.2;
  if (features.some((item) => item.includes("face detection"))) score += 0.2;
  return clamp(score, 0, 1.5);
}

function scoreSecondary(secondary: FrontCameraUnit | null): number {
  if (!secondary) return 0;
  const role = normalize(secondary.role);
  const type = normalize(secondary.type);
  if (role.includes("ultra") || type.includes("ultra")) return 1;
  if (role.includes("depth") || type.includes("depth")) return 0.6;
  return 0.4;
}

export function calculateFrontCameraScore(input: { frontCamera?: ProductFrontCamera }): FrontCameraScoreResult {
  const frontCamera = input.frontCamera;
  const cameras = safeValue(frontCamera?.cameras, []);
  const main = getMainCamera(cameras);
  const secondary = getSecondaryCamera(cameras);

  const mainScore = scoreMain(main);
  const sensorScore = scoreSensor(main);
  const videoScore = scoreVideo(frontCamera);
  const featureScore = scoreFeatures(frontCamera);
  const secondaryScore = scoreSecondary(secondary);

  const total = clamp(mainScore + sensorScore + videoScore + featureScore + secondaryScore, 0, 10);
  return {
    score: round1(total),
    breakdown: {
      main: round1(clamp(mainScore, 0, 3)),
      sensor: round1(clamp(sensorScore, 0, 2.5)),
      video: round1(clamp(videoScore, 0, 2)),
      features: round1(clamp(featureScore, 0, 1.5)),
      secondary: round1(clamp(secondaryScore, 0, 1)),
    },
  };
}

function splitFrontString(value?: string): FrontCameraUnit[] {
  const text = String(value || "").trim();
  if (!text) return [];
  const parts = text.split("+").map((item) => item.trim()).filter(Boolean);
  return parts.map((resolution, index) => ({
    role: index === 0 ? "main" : "secondary",
    resolution,
  }));
}

function mapLegacyFrontFromCamera(camera?: ProductCamera): ProductFrontCamera {
  const mapped: FrontCameraUnit[] = Array.isArray(camera?.front)
    ? camera.front.map((item, index) => ({
        role: index === 0 ? "main" : "secondary",
        resolution: item.resolution,
        type: item.sensorType,
        autofocus: typeof item.autofocus === "boolean" ? item.autofocus : false,
        sensor: {
          name: item.name,
          size: item.sensorSize,
          pixelSize: item.pixelSize,
          fov: "",
        },
      }))
    : [];

  return {
    cameras: mapped,
    features: camera?.features || [],
    video: {
      recording: camera?.video?.front || [],
      features: camera?.video?.features || [],
    },
  };
}

export function fallbackFrontCameraFromProduct(
  product: Pick<Product, "frontCamera" | "camera" | "specs">,
): ProductFrontCamera {
  if (product.frontCamera && Array.isArray(product.frontCamera.cameras) && product.frontCamera.cameras.length > 0) {
    return product.frontCamera;
  }

  const fromCamera = mapLegacyFrontFromCamera(product.camera);
  if (fromCamera.cameras && fromCamera.cameras.length > 0) {
    return fromCamera;
  }

  return {
    cameras: splitFrontString((product.specs as ProductSpecs | undefined)?.frontCamera),
    features: [],
    video: {
      recording: [],
      features: [],
    },
  };
}
