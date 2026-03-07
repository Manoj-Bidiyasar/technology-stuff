import { FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { Product, ProductFilters } from "@/lib/types/content";
import { averageRating, productSearchText, toBatteryMah, toRamGb } from "@/lib/utils/format";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { slugify } from "@/utils/slugify";

const productsRef = adminDb.collection("products");

function normalizeBrand(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeDeviceType(value?: string): "smartphone" | "tablet" {
  return value === "tablet" ? "tablet" : "smartphone";
}

function parseRearCameraMp(product: Product): number | null {
  const sources = [String(product.specs?.rearCamera || ""), String(product.specs?.camera || "")];
  let max = 0;
  for (const source of sources) {
    const matches = source.match(/(\d+)\s*MP/gi) || [];
    for (const m of matches) {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max > 0 ? max : null;
}

function parseRearCameraCount(product: Product): number | null {
  const fromStructured = product.rearCamera?.cameras?.length || 0;
  if (fromStructured > 0) return fromStructured;
  const text = `${String(product.specs?.rearCamera || "")} ${String(product.specs?.camera || "")}`;
  const matches = text.match(/(\d+)\s*MP/gi) || [];
  return matches.length > 0 ? matches.length : null;
}

function parseFrontCameraCount(product: Product): number | null {
  const fromStructured = product.frontCamera?.cameras?.length || 0;
  if (fromStructured > 0) return fromStructured;
  const text = String(product.specs?.frontCamera || "");
  const matches = text.match(/(\d+)\s*MP/gi) || [];
  return matches.length > 0 ? matches.length : null;
}

function parseFrontCameraMp(product: Product): number | null {
  const sources = [
    ...(product.frontCamera?.cameras || []).map((camera) => String(camera.resolution || "")),
    String(product.specs?.frontCamera || ""),
  ];
  let max = 0;
  for (const source of sources) {
    const matches = source.match(/(\d+)\s*MP/gi) || [];
    for (const m of matches) {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max > 0 ? max : null;
}

function parseDisplaySize(product: Product): number | null {
  const fromSpecs = Number(product.specs?.displaySizeInch || 0);
  if (Number.isFinite(fromSpecs) && fromSpecs > 0) return fromSpecs;
  const raw = String(product.specs?.display || "");
  const match = raw.match(/(\d+(\.\d+)?)\s*(\"|inch|inches)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseRefreshRate(product: Product): number | null {
  const fromSpecs = Number(product.specs?.refreshRateHz || 0);
  if (Number.isFinite(fromSpecs) && fromSpecs > 0) return fromSpecs;
  const raw = String(product.specs?.display || "");
  const matches = raw.match(/(\d+)\s*hz/gi) || [];
  let max = 0;
  for (const m of matches) {
    const n = Number(m.replace(/[^0-9]/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : null;
}

function getDisplayPanels(product: Product): Array<{ type?: string; protection?: string; curved?: boolean }> {
  if (Array.isArray(product.displays) && product.displays.length > 0) {
    return product.displays.map((panel) => ({
      type: String(panel?.type || ""),
      protection: String(panel?.protection || ""),
      curved: typeof panel?.curved === "boolean" ? panel.curved : undefined,
    }));
  }
  const panel = product.display || {};
  return [
    {
      type: String(panel.type || product.specs?.display || ""),
      protection: String(panel.protection || ""),
      curved: typeof panel.curved === "boolean" ? panel.curved : undefined,
    },
  ];
}

function parseStorageGb(product: Product): number | null {
  const sources: string[] = [];
  if (product.specs?.storage) sources.push(String(product.specs.storage));
  (product.memoryStorage?.internalStorage || []).forEach((item) => sources.push(String(item)));
  (product.variants || []).forEach((item) => {
    if (item.storage) sources.push(String(item.storage));
  });
  let max = 0;
  for (const source of sources) {
    const matches = source.match(/(\d+)\s*GB/gi) || [];
    for (const m of matches) {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    }
    const tbMatches = source.match(/(\d+)\s*TB/gi) || [];
    for (const m of tbMatches) {
      const n = Number(m.replace(/[^0-9]/g, "")) * 1024;
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max > 0 ? max : null;
}

function parseAntutuTotal(product: Product): number | null {
  const candidates = [
    product.performance?.antutu?.total,
    (product.performance as { antutuScore?: number } | undefined)?.antutuScore,
    (product.specs as { antutuScore?: number } | undefined)?.antutuScore,
  ];
  for (const value of candidates) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseCpuMaxGhz(product: Product): number | null {
  const lines = product.performance?.cpu || [];
  let max = 0;
  for (const line of lines) {
    const matches = String(line || "").match(/(\d+(\.\d+)?)\s*ghz/gi) || [];
    for (const match of matches) {
      const n = Number(match.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max > 0 ? max : null;
}

function processorText(product: Product): string {
  return `${String(product.performance?.chipset || "")} ${String(product.specs?.processor || "")}`.toLowerCase();
}

function processorModelText(product: Product): string {
  return [
    String(product.performance?.chipset || ""),
    String(product.specs?.processor || ""),
    ...(product.performance?.additionalChips || []).map((item) => String(item || "")),
  ]
    .join(" ")
    .toLowerCase();
}

function getResolutionBucket(product: Product): string | null {
  const raw = `${String(product.display?.resolution || "")} ${String(product.specs?.display || "")}`.toLowerCase();
  if (!raw.trim()) return null;
  if (raw.includes("uhd") || raw.includes("4k")) return "UHD";
  if (raw.includes("qhd")) return "QHD";
  if (raw.includes("fhd")) return "FHD";
  if (raw.includes("hd")) return "HD";
  return null;
}

function parseChargingWatt(product: Product): number | null {
  const raw = `${String(product.battery?.maxChargingSupport || "")} ${String(product.specs?.charging || "")}`.toLowerCase();
  const matches = raw.match(/(\d+)\s*w/gi) || [];
  let max = 0;
  for (const m of matches) {
    const n = Number(m.replace(/[^0-9]/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : null;
}

function parseRearVideoTier(product: Product): "1080p" | "4k30" | "4k60" | "8k" | null {
  const recordings = [
    ...(product.rearCamera?.video?.recording || []),
    ...(product.camera?.video?.rear || []),
  ]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");
  const fromSpecs = String(product.specs?.rearCamera || "").toLowerCase();
  const text = `${recordings} ${fromSpecs}`;
  if (text.includes("8k")) return "8k";
  if (text.includes("4k@60") || text.includes("4k 60")) return "4k60";
  if (text.includes("4k")) return "4k30";
  if (text.includes("1080")) return "1080p";
  return null;
}

function parseFrontVideoTier(product: Product): "1080p" | "4k30" | "4k60" | null {
  const recordings = [
    ...(product.frontCamera?.video?.recording || []),
    ...(product.camera?.video?.front || []),
  ]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");
  const fromSpecs = String(product.specs?.frontCamera || "").toLowerCase();
  const text = `${recordings} ${fromSpecs}`;
  if (text.includes("4k@60") || text.includes("4k 60")) return "4k60";
  if (text.includes("4k")) return "4k30";
  if (text.includes("1080")) return "1080p";
  return null;
}

function hasRearFunction(product: Product, fn: string): boolean {
  const key = fn.toLowerCase();
  const cameras = product.rearCamera?.cameras || [];
  const sensorText = cameras
    .map((cam) => `${String(cam.sensor?.autofocus || "")} ${cam.sensor?.ois ? "ois" : ""} ${cam.sensor?.eis ? "eis" : ""}`)
    .join(" ")
    .toLowerCase();
  const featureText = [
    ...(product.rearCamera?.features || []),
    ...(product.camera?.features || []),
    ...(product.camera?.flash || []),
    ...(product.rearCamera?.video?.features || []),
    String(product.specs?.rearCamera || ""),
    String(product.specs?.camera || ""),
  ]
    .join(" ")
    .toLowerCase();
  if (key === "ois") return sensorText.includes("ois") || featureText.includes("ois");
  if (key === "autofocus") return sensorText.includes("af") || sensorText.includes("focus") || featureText.includes("autofocus");
  if (key === "flash") return featureText.includes("flash") || featureText.includes("led");
  if (key === "laser af") return featureText.includes("laser");
  return false;
}

function hasFrontFunction(product: Product, fn: string): boolean {
  const key = fn.toLowerCase();
  const cameras = product.frontCamera?.cameras || [];
  const sensorText = cameras
    .map((cam) => `${cam.autofocus ? "autofocus" : ""} ${String(cam.type || "")} ${String(cam.role || "")}`)
    .join(" ")
    .toLowerCase();
  const featureText = [
    ...(product.frontCamera?.features || []),
    ...(product.frontCamera?.video?.features || []),
    String(product.specs?.frontCamera || ""),
  ]
    .join(" ")
    .toLowerCase();

  if (key === "under-display") {
    return sensorText.includes("under") || featureText.includes("under-display") || featureText.includes("under display");
  }
  if (key === "autofocus") {
    return sensorText.includes("autofocus") || sensorText.includes("af") || featureText.includes("autofocus");
  }
  return false;
}

function getBatteryType(product: Product): string {
  return `${String(product.battery?.type || "")} ${String(product.specs?.battery || "")}`.toLowerCase();
}

function hasVolte(product: Product): boolean {
  const text = `${String(product.specs?.network || "")} ${String(product.specs?.sim || "")}`.toLowerCase();
  if (text.includes("volte")) return true;
  const supported = (product.network?.supported || []).map((item) => String(item || "").toUpperCase());
  return supported.includes("4G");
}

function hasFaceUnlock(product: Product): boolean {
  const type = String(product.security?.faceUnlock?.type || "").trim().toLowerCase();
  return Boolean(type) && type !== "none";
}

function parseOsName(product: Product): string {
  const name = String(product.software?.os?.name || "").trim();
  if (name) return name.toLowerCase();
  const fromSpecs = String(product.specs?.os || "").toLowerCase();
  if (fromSpecs.includes("android")) return "android";
  if (fromSpecs.includes("ios")) return "ios";
  return "";
}

function parseOsVersion(product: Product): number | null {
  const fromSoftware = Number(String(product.software?.os?.version || "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(fromSoftware) && fromSoftware > 0) return fromSoftware;
  const fromSpecs = String(product.specs?.os || "");
  const m = fromSpecs.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function matchesPriceBucket(price: number, bucket: string): boolean {
  switch (bucket) {
    case "u10":
      return price <= 10000;
    case "10-20":
      return price >= 10000 && price <= 20000;
    case "20-30":
      return price >= 20000 && price <= 30000;
    case "30-40":
      return price >= 30000 && price <= 40000;
    case "40-50":
      return price >= 40000 && price <= 50000;
    case "50-60":
      return price >= 50000 && price <= 60000;
    case "a60":
      return price >= 60000;
    default:
      return false;
  }
}

function toDocId(input: Partial<Product>): string {
  const fromName = slugify(String(input.name || ""));
  if (fromName) return fromName;
  const fromSlug = slugify(String(input.slug || ""));
  return fromSlug || "untitled-product";
}

function normalizeProduct(input: Partial<Product>): Product {
  const normalizedSlug = toDocId(input);
  return {
    deviceType: normalizeDeviceType(input.deviceType),
    name: input.name || "",
    slug: normalizedSlug,
    brand: input.brand || "",
    price: Number(input.price || 0),
    priceLive: input.priceLive
      ? {
          amount: Number(input.priceLive.amount || 0),
          source: input.priceLive.source || "manual",
          updatedAt: input.priceLive.updatedAt,
        }
      : undefined,
    status: input.status || "draft",
    shortDescription: input.shortDescription || "",
    images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
    specs: input.specs || {},
    performance: input.performance || {},
    camera: input.camera || {},
    frontCamera: input.frontCamera || {},
    rearCamera: input.rearCamera || {},
    security: input.security || {},
    sensors: Array.isArray(input.sensors) ? input.sensors : [],
    network: input.network || {},
    software: input.software || {},
    design: input.design || {},
    general: input.general || {},
    memoryStorage: input.memoryStorage || {},
    variants: Array.isArray(input.variants) ? input.variants : [],
    battery: input.battery || {},
    display: input.display || {},
    displays: Array.isArray(input.displays) ? input.displays : [],
    ratings: input.ratings || {},
    affiliateLinks: input.affiliateLinks || {},
    compareSuggestions: Array.isArray(input.compareSuggestions) ? input.compareSuggestions.filter(Boolean).map((item) => slugify(String(item))) : [],
    pros: Array.isArray(input.pros) ? input.pros : [],
    cons: Array.isArray(input.cons) ? input.cons : [],
    tags: Array.isArray(input.tags) ? input.tags : [],
    trending: Boolean(input.trending),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function hydrateProduct(id: string, input: Partial<Product>): Product {
  const normalized = normalizeProduct(input);
  return {
    id,
    ...normalized,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function isQuotaExceededError(error: unknown): boolean {
  const code = String((error as { code?: string | number } | null)?.code ?? "").toLowerCase();
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    code === "8" ||
    code.includes("resource-exhausted") ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded")
  );
}

export async function listPublishedProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(30, Math.max(1, filters.pageSize || 12));
  const deviceType = normalizeDeviceType(filters.deviceType);

  let snapshot: Awaited<ReturnType<typeof productsRef.where>>;
  try {
    snapshot = await productsRef.where("status", "==", "published").limit(500).get();
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }
    throw error;
  }
  let items = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((item) => normalizeDeviceType(item.deviceType) === deviceType);

  if (filters.search) {
    const search = filters.search.toLowerCase();
    items = items.filter((product) => productSearchText(product).includes(search));
  }

  if (filters.brands && filters.brands.length > 0) {
    const selected = new Set(filters.brands.map((item) => normalizeBrand(item)));
    items = items.filter((product) => selected.has(normalizeBrand(product.brand)));
  } else if (filters.brand) {
    items = items.filter((product) => normalizeBrand(product.brand) === normalizeBrand(filters.brand));
  }

  if (filters.processor) {
    const processor = filters.processor.toLowerCase();
    items = items.filter((product) => String(product.specs?.processor || "").toLowerCase().includes(processor));
  }

  if (filters.displayShapes && filters.displayShapes.length > 0) {
    const selected = new Set(filters.displayShapes.map((item) => item.toLowerCase()));
    items = items.filter((product) => {
      const panels = getDisplayPanels(product);
      return panels.some((panel) => {
        if (selected.has("curved") && panel.curved === true) return true;
        if (selected.has("flat") && panel.curved === false) return true;
        return false;
      });
    });
  }

  if (filters.displayPanels && filters.displayPanels.length > 0) {
    const selected = filters.displayPanels.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const text = getDisplayPanels(product)
        .map((panel) => String(panel.type || ""))
        .join(" ")
        .toLowerCase();
      return selected.some((value) => text.includes(value));
    });
  }

  if (filters.displayProtection) {
    items = items.filter((product) =>
      getDisplayPanels(product).some((panel) => String(panel.protection || "").trim().length > 0)
    );
  }

  if (filters.displayProtectionNames && filters.displayProtectionNames.length > 0) {
    const selected = filters.displayProtectionNames.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const text = getDisplayPanels(product)
        .map((panel) => String(panel.protection || ""))
        .join(" ")
        .toLowerCase();
      return selected.some((name) => text.includes(name));
    });
  }

  if (filters.network) {
    const network = filters.network.toUpperCase();
    items = items.filter((product) => (product.network?.supported || []).map((v) => String(v).toUpperCase()).includes(network));
  }

  if (filters.priceBucket) {
    items = items.filter((product) => matchesPriceBucket(Number(product.price || 0), filters.priceBucket!));
  }

  if (filters.minPrice !== undefined) {
    items = items.filter((product) => product.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    items = items.filter((product) => product.price <= filters.maxPrice!);
  }

  if (filters.minRamGb !== undefined) {
    items = items.filter((product) => {
      const value = toRamGb(product.specs);
      return value !== null && value >= filters.minRamGb!;
    });
  }

  if (filters.ramBucket === "lte4") {
    items = items.filter((product) => {
      const value = toRamGb(product.specs);
      return value !== null && value <= 4;
    });
  }

  if (filters.minBatteryMah !== undefined) {
    items = items.filter((product) => {
      const value = toBatteryMah(product.specs);
      return value !== null && value >= filters.minBatteryMah!;
    });
  }

  if (filters.minRearCameraMp !== undefined) {
    items = items.filter((product) => {
      const value = parseRearCameraMp(product);
      return value !== null && value >= filters.minRearCameraMp!;
    });
  }

  if (filters.minDisplaySizeInch !== undefined) {
    items = items.filter((product) => {
      const value = parseDisplaySize(product);
      return value !== null && value >= filters.minDisplaySizeInch!;
    });
  }

  if (filters.minRefreshRateHz !== undefined) {
    items = items.filter((product) => {
      const value = parseRefreshRate(product);
      return value !== null && value >= filters.minRefreshRateHz!;
    });
  }

  if (filters.minStorageGb !== undefined) {
    items = items.filter((product) => {
      const value = parseStorageGb(product);
      return value !== null && value >= filters.minStorageGb!;
    });
  }

  if (filters.storageBucket === "lte64") {
    items = items.filter((product) => {
      const value = parseStorageGb(product);
      return value !== null && value <= 64;
    });
  }

  if (filters.ramTypes && filters.ramTypes.length > 0) {
    const selected = new Set(filters.ramTypes.map((item) => item.toLowerCase()));
    items = items.filter((product) => {
      const values = [
        ...(product.memoryStorage?.ramType || []),
        ...(product.variants || []).map((item) => item.ramType || ""),
      ]
        .map((item) => String(item || "").toLowerCase().trim())
        .filter(Boolean);
      return values.some((value) => selected.has(value));
    });
  }

  if (filters.storageTypes && filters.storageTypes.length > 0) {
    const selected = new Set(filters.storageTypes.map((item) => item.toLowerCase()));
    items = items.filter((product) => {
      const values = [
        ...(product.memoryStorage?.storageType || []),
        ...(product.variants || []).map((item) => item.storageType || ""),
      ]
        .map((item) => String(item || "").toLowerCase().trim())
        .filter(Boolean);
      return values.some((value) => selected.has(value));
    });
  }

  if (filters.externalMemory) {
    items = items.filter((product) => product.memoryStorage?.expandableStorage?.supported === true);
  }

  if (filters.screenSizeBuckets && filters.screenSizeBuckets.length > 0) {
    items = items.filter((product) => {
      const size = parseDisplaySize(product);
      if (size === null) return false;
      return filters.screenSizeBuckets!.some((bucket) => {
        if (bucket === "lte6") return size <= 6;
        if (bucket === "6-6.5") return size >= 6 && size <= 6.5;
        if (bucket === "6.5+") return size >= 6.5;
        return false;
      });
    });
  }

  if (filters.refreshRateBuckets && filters.refreshRateBuckets.length > 0) {
    items = items.filter((product) => {
      const rate = parseRefreshRate(product);
      if (rate === null) return false;
      return filters.refreshRateBuckets!.some((value) => rate >= value);
    });
  }

  if (filters.resolutionBuckets && filters.resolutionBuckets.length > 0) {
    const selected = new Set(filters.resolutionBuckets.map((item) => item.toUpperCase()));
    items = items.filter((product) => {
      const bucket = getResolutionBucket(product);
      return bucket ? selected.has(bucket.toUpperCase()) : false;
    });
  }

  if (filters.antutuBuckets && filters.antutuBuckets.length > 0) {
    items = items.filter((product) => {
      const score = parseAntutuTotal(product);
      if (score === null) return false;
      return filters.antutuBuckets!.some((value) => {
        if (value === "lte500000") return score <= 500000;
        const threshold = Number(value);
        return Number.isFinite(threshold) ? score >= threshold : false;
      });
    });
  }

  if (filters.cpuSpeedBuckets && filters.cpuSpeedBuckets.length > 0) {
    items = items.filter((product) => {
      const ghz = parseCpuMaxGhz(product);
      if (ghz === null) return false;
      return filters.cpuSpeedBuckets!.some((value) => ghz >= value);
    });
  }

  if (filters.socBrands && filters.socBrands.length > 0) {
    const selected = filters.socBrands.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const text = processorText(product);
      return selected.some((brand) => text.includes(brand));
    });
  }

  if (filters.processorModels && filters.processorModels.length > 0) {
    const selected = filters.processorModels.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const text = processorModelText(product);
      return selected.some((model) => text.includes(model));
    });
  }

  if (filters.batteryTypes && filters.batteryTypes.length > 0) {
    const selected = filters.batteryTypes.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const type = getBatteryType(product);
      return selected.some((value) => type.includes(value));
    });
  }

  if (filters.quickCharging) {
    items = items.filter((product) => {
      const watt = parseChargingWatt(product);
      if (watt !== null && watt >= 18) return true;
      const text = String(product.specs?.charging || "").toLowerCase();
      return text.includes("quick") || text.includes("fast");
    });
  }

  if (filters.chargingWattBuckets && filters.chargingWattBuckets.length > 0) {
    items = items.filter((product) => {
      const watt = parseChargingWatt(product);
      if (watt === null) return false;
      return filters.chargingWattBuckets!.some((value) => watt >= value);
    });
  }

  if (filters.wirelessCharging) {
    items = items.filter((product) => product.battery?.wireless?.supported === true);
  }

  if (filters.networkTypes && filters.networkTypes.length > 0) {
    items = items.filter((product) =>
      filters.networkTypes!.some((type) => {
        const normalized = type.toUpperCase();
        if (normalized === "5G") return (product.network?.supported || []).map((v) => String(v).toUpperCase()).includes("5G");
        if (normalized === "VOLTE") return hasVolte(product);
        return false;
      })
    );
  }

  if (filters.eSim) {
    const config = (product: Product) => String(product.network?.sim?.config || "").toLowerCase();
    items = items.filter((product) => config(product).includes("esim"));
  }

  if (filters.dualSim) {
    items = items.filter((product) => String(product.network?.sim?.type || "").toLowerCase().includes("dual"));
  }

  if (filters.nfc) {
    items = items.filter((product) => product.network?.nfc === true);
  }

  if (filters.fingerprint) {
    items = items.filter((product) => product.security?.fingerprint?.available === true);
  }

  if (filters.inDisplayFingerprint) {
    items = items.filter((product) =>
      (product.security?.fingerprint?.locations || []).some((loc) => String(loc).toLowerCase().includes("in-display"))
    );
  }

  if (filters.faceUnlock) {
    items = items.filter((product) => hasFaceUnlock(product));
  }

  if (filters.osNames && filters.osNames.length > 0) {
    const selected = new Set(filters.osNames.map((value) => value.toLowerCase()));
    items = items.filter((product) => {
      const name = parseOsName(product);
      return name ? selected.has(name) : false;
    });
  }

  if (filters.osVersions && filters.osVersions.length > 0) {
    items = items.filter((product) => {
      const version = parseOsVersion(product);
      if (version === null) return false;
      return filters.osVersions!.some((value) => Math.floor(version) === Math.floor(value));
    });
  }

  if (filters.osUpdateBuckets && filters.osUpdateBuckets.length > 0) {
    items = items.filter((product) => {
      const years = Number(product.software?.updates?.os || 0);
      if (!years) return false;
      return filters.osUpdateBuckets!.some((value) => years >= value);
    });
  }

  if (filters.waterResistance) {
    items = items.filter((product) => (product.design?.ipRating || []).length > 0);
  }

  if (filters.ipRatings && filters.ipRatings.length > 0) {
    const selected = new Set(filters.ipRatings.map((value) => value.toUpperCase()));
    items = items.filter((product) => (product.design?.ipRating || []).some((ip) => selected.has(String(ip).toUpperCase())));
  }

  if (filters.backMaterials && filters.backMaterials.length > 0) {
    const selected = filters.backMaterials.map((value) => value.toLowerCase());
    items = items.filter((product) => {
      const text = `${String(product.design?.build?.back?.material || "")} ${(product.design?.colors || []).join(" ")}`.toLowerCase();
      return selected.some((value) => text.includes(value));
    });
  }

  if (filters.rearCameraCounts && filters.rearCameraCounts.length > 0) {
    const selected = new Set(filters.rearCameraCounts);
    items = items.filter((product) => {
      const count = parseRearCameraCount(product);
      return count !== null ? selected.has(count) : false;
    });
  }

  if (filters.rearCameraMaxResBuckets && filters.rearCameraMaxResBuckets.length > 0) {
    items = items.filter((product) => {
      const mp = parseRearCameraMp(product);
      if (mp === null) return false;
      return filters.rearCameraMaxResBuckets!.some((bucket) => {
        if (bucket === "lte16") return mp <= 16;
        const threshold = Number(bucket);
        return Number.isFinite(threshold) ? mp >= threshold : false;
      });
    });
  }

  if (filters.rearCameraTypes && filters.rearCameraTypes.length > 0) {
    const selected = filters.rearCameraTypes.map((item) => item.toLowerCase());
    items = items.filter((product) => {
      const typeText = (product.rearCamera?.cameras || [])
        .map((camera) => `${String(camera.role || "")} ${String(camera.type || "")}`)
        .join(" ")
        .toLowerCase();
      return selected.some((value) => typeText.includes(value));
    });
  }

  if (filters.rearCameraVideoBuckets && filters.rearCameraVideoBuckets.length > 0) {
    const rank: Record<string, number> = { "1080p": 1, "4k30": 2, "4k60": 3, "8k": 4 };
    items = items.filter((product) => {
      const tier = parseRearVideoTier(product);
      if (!tier) return false;
      return filters.rearCameraVideoBuckets!.some((bucket) => rank[tier] >= (rank[bucket] || 999));
    });
  }

  if (filters.rearCameraFunctions && filters.rearCameraFunctions.length > 0) {
    items = items.filter((product) =>
      filters.rearCameraFunctions!.some((fn) => hasRearFunction(product, fn))
    );
  }

  if (filters.frontCameraCounts && filters.frontCameraCounts.length > 0) {
    const selected = new Set(filters.frontCameraCounts);
    items = items.filter((product) => {
      const count = parseFrontCameraCount(product);
      return count !== null ? selected.has(count) : false;
    });
  }

  if (filters.frontCameraResBuckets && filters.frontCameraResBuckets.length > 0) {
    items = items.filter((product) => {
      const mp = parseFrontCameraMp(product);
      if (mp === null) return false;
      return filters.frontCameraResBuckets!.some((bucket) => {
        if (bucket === "lte8") return mp <= 8;
        const threshold = Number(bucket);
        return Number.isFinite(threshold) ? mp >= threshold : false;
      });
    });
  }

  if (filters.frontCameraFunctions && filters.frontCameraFunctions.length > 0) {
    items = items.filter((product) =>
      filters.frontCameraFunctions!.some((fn) => hasFrontFunction(product, fn))
    );
  }

  if (filters.frontCameraVideoBuckets && filters.frontCameraVideoBuckets.length > 0) {
    const rank: Record<string, number> = { "1080p": 1, "4k30": 2, "4k60": 3 };
    items = items.filter((product) => {
      const tier = parseFrontVideoTier(product);
      if (!tier) return false;
      return filters.frontCameraVideoBuckets!.some((bucket) => rank[tier] >= (rank[bucket] || 999));
    });
  }

  const sort = filters.sort || "popularity";
  if (sort === "price-asc") {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    items.sort((a, b) => b.price - a.price);
  } else if (sort === "overall") {
    items.sort((a, b) => calculateOverallScore100(b) - calculateOverallScore100(a));
  } else if (sort === "camera") {
    items.sort((a, b) => (b.ratings?.camera || 0) - (a.ratings?.camera || 0));
  } else if (sort === "battery") {
    items.sort((a, b) => (b.ratings?.battery || 0) - (a.ratings?.battery || 0));
  } else if (sort === "display") {
    items.sort((a, b) => (b.ratings?.display || 0) - (a.ratings?.display || 0));
  } else if (sort === "performance") {
    items.sort((a, b) => (b.ratings?.performance || 0) - (a.ratings?.performance || 0));
  } else if (sort === "popularity") {
    items.sort((a, b) => averageRating(b.ratings) - averageRating(a.ratings));
  } else {
    items.sort((a, b) => {
      const left = Number(a.createdAt && typeof a.createdAt === "object" && "seconds" in a.createdAt ? a.createdAt.seconds : 0);
      const right = Number(b.createdAt && typeof b.createdAt === "object" && "seconds" in b.createdAt ? b.createdAt.seconds : 0);
      return right - left;
    });
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function listLatestProducts(limit = 8, deviceType: "smartphone" | "tablet" = "smartphone"): Promise<Product[]> {
  const rows = await listPublishedProducts({ page: 1, pageSize: limit, sort: "latest", deviceType });
  return rows.items;
}

export async function listTrendingProducts(limit = 8, deviceType: "smartphone" | "tablet" = "smartphone"): Promise<Product[]> {
  let snapshot: Awaited<ReturnType<typeof productsRef.where>>;
  try {
    snapshot = await productsRef.where("status", "==", "published").limit(300).get();
  } catch (error) {
    if (isQuotaExceededError(error)) return [];
    throw error;
  }
  const items = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((item) => normalizeDeviceType(item.deviceType) === deviceType);
  items.sort((a, b) => averageRating(b.ratings) - averageRating(a.ratings));
  return items.slice(0, limit);
}

export async function listBrands(deviceType: "smartphone" | "tablet" = "smartphone"): Promise<string[]> {
  let snapshot: Awaited<ReturnType<typeof productsRef.where>>;
  try {
    snapshot = await productsRef.where("status", "==", "published").limit(500).get();
  } catch (error) {
    if (isQuotaExceededError(error)) return [];
    throw error;
  }
  const brands = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const row = normalizeProduct(doc.data() as Partial<Product>);
    if (normalizeDeviceType(row.deviceType) !== deviceType) return;
    if (row.brand) brands.add(row.brand);
  });
  return Array.from(brands).sort((a, b) => a.localeCompare(b));
}

export async function getPublishedProductBySlug(slug: string, deviceType: "smartphone" | "tablet" = "smartphone"): Promise<Product | null> {
  const docId = slugify(slug);
  if (docId) {
    let direct;
    try {
      direct = await productsRef.doc(docId).get();
    } catch (error) {
      if (isQuotaExceededError(error)) return null;
      throw error;
    }
    if (direct.exists) {
      const item = hydrateProduct(direct.id, direct.data() as Partial<Product>);
      if (item.status === "published" && normalizeDeviceType(item.deviceType) === deviceType) return item;
    }
  }

  let snapshot: Awaited<ReturnType<typeof productsRef.where>>;
  try {
    snapshot = await productsRef
      .where("status", "==", "published")
      .where("slug", "==", slug)
      .limit(1)
      .get();
  } catch (error) {
    if (isQuotaExceededError(error)) return null;
    throw error;
  }
  if (snapshot.empty) return null;
  const item = hydrateProduct(snapshot.docs[0].id, snapshot.docs[0].data() as Partial<Product>);
  if (normalizeDeviceType(item.deviceType) !== deviceType) return null;
  return item;
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const snapshot = await productsRef.where("status", "==", "published").limit(500).get();
  const items = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((item) => item.slug !== product.slug)
    .filter((item) => normalizeDeviceType(item.deviceType) === normalizeDeviceType(product.deviceType));

  const sameBrand = items.filter((item) => item.brand.toLowerCase() === product.brand.toLowerCase());
  const others = items.filter((item) => item.brand.toLowerCase() !== product.brand.toLowerCase());

  return [...sameBrand, ...others].slice(0, limit);
}

export async function listComparisonSuggestions(product: Product, limit = 3): Promise<Product[]> {
  const snapshot = await productsRef.where("status", "==", "published").limit(500).get();
  const items = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((item) => item.slug !== product.slug)
    .filter((item) => normalizeDeviceType(item.deviceType) === normalizeDeviceType(product.deviceType));

  items.sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price));
  return items.slice(0, limit);
}

export async function getCompareProductsFromSlug(
  slug: string,
  deviceType: "smartphone" | "tablet" = "smartphone"
): Promise<Product[]> {
  const slugs = slug
    .split("-vs-")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const results = await Promise.all(slugs.map((value) => getPublishedProductBySlug(value, deviceType)));
  return results.filter((item): item is Product => Boolean(item));
}

export async function searchProductSuggestions(
  search: string,
  limit = 8,
  deviceType: "smartphone" | "tablet" = "smartphone"
): Promise<Array<Pick<Product, "name" | "slug" | "brand"> & { image?: string; price?: number }>> {
  if (!search.trim()) return [];
  const snapshot = await productsRef.where("status", "==", "published").limit(500).get();
  const text = search.toLowerCase();
  const matches = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((product) => normalizeDeviceType(product.deviceType) === deviceType)
    .filter((product) => productSearchText(product).includes(text))
    .slice(0, limit)
    .map((product) => ({ name: product.name, slug: product.slug, brand: product.brand, image: product.images?.[0] || "", price: product.price }));

  return matches;
}

export async function listAllProductsAdmin(deviceType?: "smartphone" | "tablet"): Promise<Product[]> {
  const snapshot = await productsRef.limit(500).get();
  const items = snapshot.docs
    .map((doc) => hydrateProduct(doc.id, doc.data() as Partial<Product>))
    .filter((item) => (deviceType ? normalizeDeviceType(item.deviceType) === deviceType : true));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

const exploreCacheSeconds = (() => {
  const value = Number(process.env.EXPLORE_LINKS_CACHE_SECONDS || 3600);
  return Number.isFinite(value) && value > 0 ? value : 3600;
})();

const getCachedExploreProductsSmartphone = unstable_cache(
  async () => {
    const result = await listPublishedProducts({
      page: 1,
      pageSize: 500,
      deviceType: "smartphone",
    });
    return result.items;
  },
  ["explore-products-smartphone-v1"],
  { revalidate: exploreCacheSeconds }
);

export async function listExploreProductsSmartphoneCached(): Promise<Product[]> {
  return getCachedExploreProductsSmartphone();
}

const getCachedExploreProductsTablet = unstable_cache(
  async () => {
    const result = await listPublishedProducts({
      page: 1,
      pageSize: 500,
      deviceType: "tablet",
    });
    return result.items;
  },
  ["explore-products-tablet-v1"],
  { revalidate: exploreCacheSeconds }
);

export async function listExploreProductsTabletCached(): Promise<Product[]> {
  return getCachedExploreProductsTablet();
}

export async function createProduct(data: Product): Promise<string> {
  const payload = normalizeProduct(data);
  const id = payload.slug;
  await productsRef.doc(id).set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const payload = normalizeProduct(data);
  const nextId = payload.slug || id;
  const oldRef = productsRef.doc(id);
  const nextRef = productsRef.doc(nextId);

  const oldDoc = await oldRef.get();
  const oldData = oldDoc.exists ? (oldDoc.data() as Partial<Product>) : {};

  if (nextId !== id) {
    await nextRef.set({
      ...oldData,
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    if (oldDoc.exists) {
      await oldRef.delete();
    }
    return;
  }

  await nextRef.set({
    ...oldData,
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function deleteProduct(id: string): Promise<void> {
  await productsRef.doc(id).delete();
}
