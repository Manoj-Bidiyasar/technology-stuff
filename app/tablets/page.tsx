import type { Metadata } from "next";
import TabletFinderRow from "@/components/TabletFinderRow";
import FilterSidebar from "@/components/FilterSidebar";
import InlineFilterRow from "@/components/InlineFilterRow";
import CompareTray from "@/components/CompareTray";
import MobilePageTopBar from "@/components/MobilePageTopBar";
import MobileExploreLinks from "@/components/MobileExploreLinks";
import Pagination from "@/components/ui/Pagination";
import { listBrands, listExploreProductsTabletCached, listPublishedProducts } from "@/lib/firestore/products";
import type { ProductFilters } from "@/lib/types/content";

type MobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Tablets",
  description: "Search, filter, and sort tablets by brand, price, RAM, and battery.",
};

export default async function MobilePage({ searchParams }: MobilePageProps) {
  const query = await searchParams;
  const page = Number(query.page || 1);
  const toSingle = (v: string | string[] | undefined): string | undefined => (typeof v === "string" ? v : undefined);
  const toNumberValue = (v: string | undefined): number | undefined => {
    if (!v) return undefined;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const selectedBrands = (toSingle(query.brand) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedRamTypes = (toSingle(query.ramType) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedStorageTypes = (toSingle(query.storageType) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedRefreshRates = (toSingle(query.refreshRateSet) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedResolutions = (toSingle(query.resolution) || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const selectedAntutu = (toSingle(query.antutu) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedCpuSpeed = (toSingle(query.cpuSpeed) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedSoc = (toSingle(query.soc) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedSocModels = (toSingle(query.socModel) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedDisplayShapes = (toSingle(query.displayShape) || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const selectedDisplayPanels = (toSingle(query.displayPanel) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedDisplayProtectionNames = (toSingle(query.displayProtectionName) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedRearCameraCounts = (toSingle(query.rearCameraCount) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedRearMaxRes = (toSingle(query.rearMaxRes) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedRearCameraTypes = (toSingle(query.rearCameraType) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedRearVideo = (toSingle(query.rearVideo) || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const selectedRearFunctions = (toSingle(query.rearFunction) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedFrontCameraCounts = (toSingle(query.frontCameraCount) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedFrontRes = (toSingle(query.frontRes) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedFrontFunctions = (toSingle(query.frontFunction) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedFrontVideo = (toSingle(query.frontVideo) || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const selectedBatteryTypes = (toSingle(query.batteryType) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedChargingWatt = (toSingle(query.chargingW) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedNetworkTypes = (toSingle(query.networkType) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedOsNames = (toSingle(query.osName) || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const selectedOsVersions = (toSingle(query.osVersion) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedOsUpdates = (toSingle(query.osUpdate) || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const selectedIpRatings = (toSingle(query.ipRating) || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const selectedBackMaterials = (toSingle(query.backMaterial) || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const filters: ProductFilters = {
    deviceType: "tablet" as const,
    search: (toSingle(query.q) || "").trim() || undefined,
    ramBucket: toSingle(query.ram) === "lte4" ? "lte4" : undefined,
    storageBucket: toSingle(query.storage) === "lte64" ? "lte64" : undefined,
    brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
    brands: selectedBrands.length > 1 ? selectedBrands : undefined,
    processor: toSingle(query.processor),
    network: (toSingle(query.network) as "5G" | "4G" | "3G" | "2G" | undefined),
    priceBucket: toSingle(query.priceBucket),
    minPrice: toNumberValue(toSingle(query.minPrice)),
    maxPrice: toNumberValue(toSingle(query.maxPrice)),
    minRamGb: toSingle(query.ram) && toSingle(query.ram) !== "lte4" ? toNumberValue(toSingle(query.ram)) : undefined,
    minBatteryMah: toNumberValue(toSingle(query.battery)),
    minRearCameraMp: toNumberValue(toSingle(query.cameraMp)),
    minDisplaySizeInch: toNumberValue(toSingle(query.displaySize)),
    minRefreshRateHz: toNumberValue(toSingle(query.refreshRate)),
    minStorageGb: toSingle(query.storage) && toSingle(query.storage) !== "lte64" ? toNumberValue(toSingle(query.storage)) : undefined,
    ramTypes: selectedRamTypes.length > 0 ? selectedRamTypes : undefined,
    storageTypes: selectedStorageTypes.length > 0 ? selectedStorageTypes : undefined,
    externalMemory: toSingle(query.externalMemory) === "1",
    screenSizeBuckets: (toSingle(query.screenSize) || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    refreshRateBuckets: selectedRefreshRates.length > 0 ? selectedRefreshRates : undefined,
    resolutionBuckets: selectedResolutions.length > 0 ? selectedResolutions : undefined,
    antutuBuckets: selectedAntutu.length > 0 ? selectedAntutu : undefined,
    cpuSpeedBuckets: selectedCpuSpeed.length > 0 ? selectedCpuSpeed : undefined,
    socBrands: selectedSoc.length > 0 ? selectedSoc : undefined,
    processorModels: selectedSocModels.length > 0 ? selectedSocModels : undefined,
    displayShapes: selectedDisplayShapes.length > 0 ? selectedDisplayShapes : undefined,
    displayPanels: selectedDisplayPanels.length > 0 ? selectedDisplayPanels : undefined,
    displayProtection: toSingle(query.displayProtection) === "1",
    displayProtectionNames: selectedDisplayProtectionNames.length > 0 ? selectedDisplayProtectionNames : undefined,
    rearCameraCounts: selectedRearCameraCounts.length > 0 ? selectedRearCameraCounts : undefined,
    rearCameraMaxResBuckets: selectedRearMaxRes.length > 0 ? selectedRearMaxRes : undefined,
    rearCameraTypes: selectedRearCameraTypes.length > 0 ? selectedRearCameraTypes : undefined,
    rearCameraVideoBuckets: selectedRearVideo.length > 0 ? selectedRearVideo : undefined,
    rearCameraFunctions: selectedRearFunctions.length > 0 ? selectedRearFunctions : undefined,
    frontCameraCounts: selectedFrontCameraCounts.length > 0 ? selectedFrontCameraCounts : undefined,
    frontCameraResBuckets: selectedFrontRes.length > 0 ? selectedFrontRes : undefined,
    frontCameraFunctions: selectedFrontFunctions.length > 0 ? selectedFrontFunctions : undefined,
    frontCameraVideoBuckets: selectedFrontVideo.length > 0 ? selectedFrontVideo : undefined,
    batteryTypes: selectedBatteryTypes.length > 0 ? selectedBatteryTypes : undefined,
    quickCharging: toSingle(query.quickCharging) === "1",
    chargingWattBuckets: selectedChargingWatt.length > 0 ? selectedChargingWatt : undefined,
    wirelessCharging: toSingle(query.wirelessCharging) === "1",
    networkTypes: selectedNetworkTypes.length > 0 ? selectedNetworkTypes : undefined,
    eSim: toSingle(query.eSim) === "1",
    dualSim: toSingle(query.dualSim) === "1",
    nfc: toSingle(query.nfc) === "1",
    fingerprint: toSingle(query.fingerprint) === "1",
    inDisplayFingerprint: toSingle(query.inDisplayFingerprint) === "1",
    faceUnlock: toSingle(query.faceUnlock) === "1",
    osNames: selectedOsNames.length > 0 ? selectedOsNames : undefined,
    osVersions: selectedOsVersions.length > 0 ? selectedOsVersions : undefined,
    osUpdateBuckets: selectedOsUpdates.length > 0 ? selectedOsUpdates : undefined,
    waterResistance: toSingle(query.waterResistance) === "1",
    ipRatings: selectedIpRatings.length > 0 ? selectedIpRatings : undefined,
    backMaterials: selectedBackMaterials.length > 0 ? selectedBackMaterials : undefined,
    sort: toSingle(query.sort)
      ? (toSingle(query.sort) as "latest" | "popularity" | "price-asc" | "price-desc" | "overall" | "performance" | "camera" | "battery" | "display")
      : "popularity",
    page,
    pageSize: 12,
  };

  const facetBaseFilters: ProductFilters = {
    ...filters,
    brand: undefined,
    brands: undefined,
    priceBucket: undefined,
    page: 1,
    pageSize: 500,
  };

  const [brands, result, facetBaseResult, exploreProducts] = await Promise.all([
    listBrands("tablet"),
    listPublishedProducts(filters),
    listPublishedProducts(facetBaseFilters),
    listExploreProductsTabletCached(),
  ]);
  const priceBucketCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const price = Number(item.price || 0);
    if (price <= 10000) acc["u10"] = (acc["u10"] || 0) + 1;
    if (price >= 10000 && price <= 20000) acc["10-20"] = (acc["10-20"] || 0) + 1;
    if (price >= 20000 && price <= 30000) acc["20-30"] = (acc["20-30"] || 0) + 1;
    if (price >= 30000 && price <= 40000) acc["30-40"] = (acc["30-40"] || 0) + 1;
    if (price >= 40000 && price <= 50000) acc["40-50"] = (acc["40-50"] || 0) + 1;
    if (price >= 50000 && price <= 60000) acc["50-60"] = (acc["50-60"] || 0) + 1;
    if (price >= 60000) acc["a60"] = (acc["a60"] || 0) + 1;
    return acc;
  }, {});
  const brandCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.brand || "").trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const ramThresholdCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = String(item.specs?.ram || "");
    const matches = raw.match(/(\d+)\s*GB/gi) || [];
    let max = 0;
    for (const m of matches) {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    }
    if (max > 0 && max <= 4) acc["lte4"] = (acc["lte4"] || 0) + 1;
    if (max >= 6) acc["6"] = (acc["6"] || 0) + 1;
    if (max >= 8) acc["8"] = (acc["8"] || 0) + 1;
    if (max >= 12) acc["12"] = (acc["12"] || 0) + 1;
    if (max >= 16) acc["16"] = (acc["16"] || 0) + 1;
    return acc;
  }, {});
  const ramTypeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const unique = new Set((item.memoryStorage?.ramType || []).map((v) => String(v || "").trim()).filter(Boolean));
    unique.forEach((value) => {
      acc[value] = (acc[value] || 0) + 1;
    });
    return acc;
  }, {});
  const storageThresholdCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const sources = [String(item.specs?.storage || ""), ...(item.memoryStorage?.internalStorage || []).map((v) => String(v || ""))];
    let max = 0;
    for (const source of sources) {
      const gb = source.match(/(\d+)\s*GB/gi) || [];
      gb.forEach((m) => {
        const n = Number(m.replace(/[^0-9]/g, ""));
        if (Number.isFinite(n) && n > max) max = n;
      });
      const tb = source.match(/(\d+)\s*TB/gi) || [];
      tb.forEach((m) => {
        const n = Number(m.replace(/[^0-9]/g, "")) * 1024;
        if (Number.isFinite(n) && n > max) max = n;
      });
    }
    if (max > 0 && max <= 64) acc["lte64"] = (acc["lte64"] || 0) + 1;
    if (max >= 128) acc["128"] = (acc["128"] || 0) + 1;
    if (max >= 256) acc["256"] = (acc["256"] || 0) + 1;
    if (max >= 512) acc["512"] = (acc["512"] || 0) + 1;
    return acc;
  }, {});
  const storageTypeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const unique = new Set((item.memoryStorage?.storageType || []).map((v) => String(v || "").trim()).filter(Boolean));
    unique.forEach((value) => {
      acc[value] = (acc[value] || 0) + 1;
    });
    return acc;
  }, {});
  const batteryCapacityCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = `${String(item.battery?.capacity || "")} ${String(item.specs?.battery || "")}`;
    const matches = raw.match(/(\d+)\s*mAh/gi) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    });
    if (max >= 4000) acc["4000"] = (acc["4000"] || 0) + 1;
    if (max >= 5000) acc["5000"] = (acc["5000"] || 0) + 1;
    if (max >= 6000) acc["6000"] = (acc["6000"] || 0) + 1;
    if (max >= 7000) acc["7000"] = (acc["7000"] || 0) + 1;
    return acc;
  }, {});
  const externalMemoryCount = facetBaseResult.items.filter((item) => item.memoryStorage?.expandableStorage?.supported === true).length;
  const screenSizeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = String(item.specs?.display || "");
    const match = raw.match(/(\d+(\.\d+)?)\s*(\"|inch|inches)/i);
    const value = match ? Number(match[1]) : Number(item.specs?.displaySizeInch || 0);
    if (!Number.isFinite(value) || value <= 0) return acc;
    if (value <= 6) acc["lte6"] = (acc["lte6"] || 0) + 1;
    if (value >= 6 && value <= 6.5) acc["6-6.5"] = (acc["6-6.5"] || 0) + 1;
    if (value >= 6.5) acc["6.5+"] = (acc["6.5+"] || 0) + 1;
    return acc;
  }, {});
  const refreshRateCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = String(item.specs?.display || "");
    const matches = raw.match(/(\d+)\s*hz/gi) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    });
    if (max >= 60) acc["60"] = (acc["60"] || 0) + 1;
    if (max >= 90) acc["90"] = (acc["90"] || 0) + 1;
    if (max >= 120) acc["120"] = (acc["120"] || 0) + 1;
    if (max >= 144) acc["144"] = (acc["144"] || 0) + 1;
    return acc;
  }, {});
  const resolutionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = `${String(item.display?.resolution || "")} ${String(item.specs?.display || "")}`.toLowerCase();
    if ((raw.includes("hd") || raw.includes("720")) && !raw.includes("fhd") && !raw.includes("qhd") && !raw.includes("uhd") && !raw.includes("4k")) {
      acc["HD"] = (acc["HD"] || 0) + 1;
    }
    if (raw.includes("fhd")) acc["FHD"] = (acc["FHD"] || 0) + 1;
    if (raw.includes("qhd")) acc["QHD"] = (acc["QHD"] || 0) + 1;
    if (raw.includes("uhd") || raw.includes("4k")) acc["UHD"] = (acc["UHD"] || 0) + 1;
    return acc;
  }, {});
  const displayShapeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const panels = Array.isArray(item.displays) && item.displays.length > 0 ? item.displays : item.display ? [item.display] : [];
    const curved = panels.some((panel) => panel?.curved === true);
    const flat = panels.some((panel) => panel?.curved === false);
    if (curved) acc.curved = (acc.curved || 0) + 1;
    if (flat) acc.flat = (acc.flat || 0) + 1;
    return acc;
  }, {});
  const displayPanelCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(Array.isArray(item.displays) ? item.displays.map((panel) => String(panel?.type || "")) : []),
      String(item.display?.type || ""),
      String(item.specs?.display || ""),
    ]
      .join(" ")
      .toLowerCase();
    if (text.includes("ltpo")) acc["LTPO AMOLED"] = (acc["LTPO AMOLED"] || 0) + 1;
    if (text.includes("amoled")) acc["AMOLED"] = (acc["AMOLED"] || 0) + 1;
    if (text.includes("ips")) acc["IPS LCD"] = (acc["IPS LCD"] || 0) + 1;
    if (text.includes("oled")) acc.OLED = (acc.OLED || 0) + 1;
    if (text.includes("led")) acc.LED = (acc.LED || 0) + 1;
    return acc;
  }, {});
  const displayProtectionNameCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const protections = [
      ...(Array.isArray(item.displays) ? item.displays.map((panel) => String(panel?.protection || "").trim()) : []),
      String(item.display?.protection || "").trim(),
    ].filter(Boolean);
    const unique = new Set(protections);
    unique.forEach((name) => {
      acc[name] = (acc[name] || 0) + 1;
    });
    return acc;
  }, {});
  const displayProtectionCount = facetBaseResult.items.filter((item) => {
    const protections = [
      ...(Array.isArray(item.displays) ? item.displays.map((panel) => String(panel?.protection || "").trim()) : []),
      String(item.display?.protection || "").trim(),
    ].filter(Boolean);
    return protections.length > 0;
  }).length;
  const rearCameraCountCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const structured = item.rearCamera?.cameras?.length || 0;
    const text = `${String(item.specs?.rearCamera || "")} ${String(item.specs?.camera || "")}`;
    const fallback = (text.match(/(\d+)\s*MP/gi) || []).length;
    const count = structured || fallback;
    if (count >= 1 && count <= 5) acc[String(count)] = (acc[String(count)] || 0) + 1;
    return acc;
  }, {});
  const rearMaxResolutionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(item.rearCamera?.cameras || []).map((camera) => String(camera.resolution || "")),
      String(item.specs?.rearCamera || ""),
      String(item.specs?.camera || ""),
    ].join(" ");
    const matches = text.match(/(\d+)\s*MP/gi) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    });
    if (max > 0 && max <= 16) acc.lte16 = (acc.lte16 || 0) + 1;
    [32, 48, 50, 64, 108, 200].forEach((threshold) => {
      if (max >= threshold) acc[String(threshold)] = (acc[String(threshold)] || 0) + 1;
    });
    return acc;
  }, {});
  const rearTypeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = (item.rearCamera?.cameras || [])
      .map((camera) => `${String(camera.role || "")} ${String(camera.type || "")}`)
      .join(" ")
      .toLowerCase();
    if (text.includes("macro")) acc.macro = (acc.macro || 0) + 1;
    if (text.includes("ultra")) acc["ultra-wide"] = (acc["ultra-wide"] || 0) + 1;
    if (text.includes("tele")) acc.telephoto = (acc.telephoto || 0) + 1;
    if (text.includes("periscope")) acc.periscope = (acc.periscope || 0) + 1;
    return acc;
  }, {});
  const rearVideoCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(item.rearCamera?.video?.recording || []),
      ...(item.camera?.video?.rear || []),
      String(item.specs?.rearCamera || ""),
    ]
      .join(" ")
      .toLowerCase();
    if (text.includes("1080")) acc["1080p"] = (acc["1080p"] || 0) + 1;
    if (text.includes("4k")) acc["4k30"] = (acc["4k30"] || 0) + 1;
    if (text.includes("4k@60") || text.includes("4k 60")) acc["4k60"] = (acc["4k60"] || 0) + 1;
    if (text.includes("8k")) acc["8k"] = (acc["8k"] || 0) + 1;
    return acc;
  }, {});
  const rearFunctionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const sensorText = (item.rearCamera?.cameras || [])
      .map((camera) => `${String(camera.sensor?.autofocus || "")} ${camera.sensor?.ois ? "ois" : ""}`)
      .join(" ")
      .toLowerCase();
    const featureText = [
      ...(item.rearCamera?.features || []),
      ...(item.camera?.features || []),
      ...(item.camera?.flash || []),
      String(item.specs?.rearCamera || ""),
      String(item.specs?.camera || ""),
    ]
      .join(" ")
      .toLowerCase();
    if (sensorText.includes("ois") || featureText.includes("ois")) acc.OIS = (acc.OIS || 0) + 1;
    if (sensorText.includes("af") || sensorText.includes("focus") || featureText.includes("autofocus")) acc.Autofocus = (acc.Autofocus || 0) + 1;
    if (featureText.includes("flash") || featureText.includes("led")) acc["Flash LED"] = (acc["Flash LED"] || 0) + 1;
    if (featureText.includes("laser")) acc["Laser AF"] = (acc["Laser AF"] || 0) + 1;
    return acc;
  }, {});
  const frontCameraCountCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const structured = item.frontCamera?.cameras?.length || 0;
    const fallback = (String(item.specs?.frontCamera || "").match(/(\d+)\s*MP/gi) || []).length;
    const count = structured || fallback;
    if (count >= 1 && count <= 2) acc[String(count)] = (acc[String(count)] || 0) + 1;
    return acc;
  }, {});
  const frontResolutionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(item.frontCamera?.cameras || []).map((camera) => String(camera.resolution || "")),
      String(item.specs?.frontCamera || ""),
    ].join(" ");
    const matches = text.match(/(\d+)\s*MP/gi) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    });
    if (max > 0 && max <= 8) acc.lte8 = (acc.lte8 || 0) + 1;
    [16, 32, 50].forEach((threshold) => {
      if (max >= threshold) acc[String(threshold)] = (acc[String(threshold)] || 0) + 1;
    });
    return acc;
  }, {});
  const frontFunctionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(item.frontCamera?.features || []),
      ...(item.frontCamera?.video?.features || []),
      ...(item.frontCamera?.cameras || []).map((camera) => `${camera.autofocus ? "autofocus" : ""} ${String(camera.role || "")} ${String(camera.type || "")}`),
      String(item.specs?.frontCamera || ""),
    ]
      .join(" ")
      .toLowerCase();
    if (text.includes("under-display") || text.includes("under display") || text.includes("underdisplay")) {
      acc["Under-display"] = (acc["Under-display"] || 0) + 1;
    }
    if (text.includes("autofocus") || text.includes(" af ")) {
      acc.Autofocus = (acc.Autofocus || 0) + 1;
    }
    return acc;
  }, {});
  const frontVideoCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = [
      ...(item.frontCamera?.video?.recording || []),
      ...(item.camera?.video?.front || []),
      String(item.specs?.frontCamera || ""),
    ]
      .join(" ")
      .toLowerCase();
    if (text.includes("1080")) acc["1080p"] = (acc["1080p"] || 0) + 1;
    if (text.includes("4k")) acc["4k30"] = (acc["4k30"] || 0) + 1;
    if (text.includes("4k@60") || text.includes("4k 60")) acc["4k60"] = (acc["4k60"] || 0) + 1;
    return acc;
  }, {});
  const antutuCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const total = Number(item.performance?.antutu?.total || (item.performance as { antutuScore?: number } | undefined)?.antutuScore || 0);
    if (total > 0 && total <= 500000) acc["lte500000"] = (acc["lte500000"] || 0) + 1;
    if (total >= 500000) acc["500000"] = (acc["500000"] || 0) + 1;
    if (total >= 1000000) acc["1000000"] = (acc["1000000"] || 0) + 1;
    if (total >= 1500000) acc["1500000"] = (acc["1500000"] || 0) + 1;
    if (total >= 2000000) acc["2000000"] = (acc["2000000"] || 0) + 1;
    if (total >= 2500000) acc["2500000"] = (acc["2500000"] || 0) + 1;
    return acc;
  }, {});
  const socCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = `${String(item.performance?.chipset || "")} ${String(item.specs?.processor || "")}`.toLowerCase();
    if (text.includes("snapdragon")) acc["Snapdragon"] = (acc["Snapdragon"] || 0) + 1;
    if (text.includes("mediatek") || text.includes("dimensity")) acc["MediaTek"] = (acc["MediaTek"] || 0) + 1;
    if (text.includes("exynos")) acc["Exynos"] = (acc["Exynos"] || 0) + 1;
    if (text.includes("tensor")) acc["Tensor"] = (acc["Tensor"] || 0) + 1;
    if (text.includes("apple")) acc["Apple"] = (acc["Apple"] || 0) + 1;
    return acc;
  }, {});
  const batteryTypeCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = `${String(item.battery?.type || "")} ${String(item.specs?.battery || "")}`.toLowerCase();
    if (text.includes("li-ion")) acc["Li-ion"] = (acc["Li-ion"] || 0) + 1;
    if (text.includes("li-po")) acc["Li-Po"] = (acc["Li-Po"] || 0) + 1;
    if (text.includes("silicon")) acc["Silicon Carbon"] = (acc["Silicon Carbon"] || 0) + 1;
    return acc;
  }, {});
  const chargingWattCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = `${String(item.battery?.maxChargingSupport || "")} ${String(item.specs?.charging || "")}`.toLowerCase();
    const matches = raw.match(/(\d+)\s*w/gi) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = Number(m.replace(/[^0-9]/g, ""));
      if (Number.isFinite(n) && n > max) max = n;
    });
    if (max >= 30) acc["30"] = (acc["30"] || 0) + 1;
    if (max >= 45) acc["45"] = (acc["45"] || 0) + 1;
    if (max >= 65) acc["65"] = (acc["65"] || 0) + 1;
    if (max >= 120) acc["120"] = (acc["120"] || 0) + 1;
    return acc;
  }, {});
  const quickChargingCount = facetBaseResult.items.filter((item) => {
    const text = `${String(item.battery?.maxChargingSupport || "")} ${String(item.specs?.charging || "")}`.toLowerCase();
    return text.includes("quick") || text.includes("fast") || /(\d+)\s*w/i.test(text);
  }).length;
  const wirelessChargingCount = facetBaseResult.items.filter((item) => item.battery?.wireless?.supported === true).length;
  const networkTypeCounts = {
    "5G": facetBaseResult.items.filter((item) => (item.network?.supported || []).map((v) => String(v).toUpperCase()).includes("5G")).length,
    "VoLTE": facetBaseResult.items.filter((item) => (item.network?.supported || []).map((v) => String(v).toUpperCase()).includes("4G")).length,
  };
  const simCounts = {
    eSim: facetBaseResult.items.filter((item) => String(item.network?.sim?.config || "").toLowerCase().includes("esim")).length,
    dualSim: facetBaseResult.items.filter((item) => String(item.network?.sim?.type || "").toLowerCase().includes("dual")).length,
  };
  const connectivityCounts = {
    nfc: facetBaseResult.items.filter((item) => item.network?.nfc === true).length,
    fingerprint: facetBaseResult.items.filter((item) => item.security?.fingerprint?.available === true).length,
    inDisplayFingerprint: facetBaseResult.items.filter((item) => (item.security?.fingerprint?.locations || []).some((loc) => String(loc).toLowerCase().includes("in-display"))).length,
    faceUnlock: facetBaseResult.items.filter((item) => {
      const t = String(item.security?.faceUnlock?.type || "").toLowerCase();
      return Boolean(t) && t !== "none";
    }).length,
  };
  const osNameCounts = {
    android: facetBaseResult.items.filter((item) => String(item.software?.os?.name || item.specs?.os || "").toLowerCase().includes("android")).length,
    ios: facetBaseResult.items.filter((item) => String(item.software?.os?.name || item.specs?.os || "").toLowerCase().includes("ios")).length,
  };
  const osVersionCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const raw = String(item.software?.os?.version || item.specs?.os || "");
    const m = raw.match(/(\d+(\.\d+)?)/);
    if (!m) return acc;
    const v = String(Math.floor(Number(m[1])));
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const osUpdateCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const years = Number(item.software?.updates?.os || 0);
    if (years >= 1) acc["1"] = (acc["1"] || 0) + 1;
    if (years >= 2) acc["2"] = (acc["2"] || 0) + 1;
    if (years >= 3) acc["3"] = (acc["3"] || 0) + 1;
    if (years >= 5) acc["5"] = (acc["5"] || 0) + 1;
    if (years >= 7) acc["7"] = (acc["7"] || 0) + 1;
    return acc;
  }, {});
  const designCounts = {
    waterResistance: facetBaseResult.items.filter((item) => (item.design?.ipRating || []).length > 0).length,
  };
  const ipCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    (item.design?.ipRating || []).forEach((ip) => {
      const key = String(ip || "").toUpperCase();
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
  const backMaterialCounts = facetBaseResult.items.reduce<Record<string, number>>((acc, item) => {
    const text = `${String(item.design?.build?.back?.material || "")} ${(item.design?.colors || []).join(" ")}`.toLowerCase();
    if (text.includes("metal")) acc["metal"] = (acc["metal"] || 0) + 1;
    if (text.includes("glass")) acc["glass"] = (acc["glass"] || 0) + 1;
    if (text.includes("leather")) acc["leather"] = (acc["leather"] || 0) + 1;
    return acc;
  }, {});
  const processors = Array.from(
    new Set(
      result.items
        .map((item) => String(item.specs?.processor || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
  const cameras = Array.from(
    new Set(
      result.items
        .map((item) => String(item.specs?.rearCamera || item.specs?.camera || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged: Record<string, string> = {
      q: toSingle(query.q) || "",
      brand: toSingle(query.brand) || "",
      processor: toSingle(query.processor) || "",
      network: toSingle(query.network) || "",
      priceBucket: toSingle(query.priceBucket) || "",
      minPrice: toSingle(query.minPrice) || "",
      maxPrice: toSingle(query.maxPrice) || "",
      ram: toSingle(query.ram) || "",
      ramType: toSingle(query.ramType) || "",
      battery: toSingle(query.battery) || "",
      storage: toSingle(query.storage) || "",
      storageType: toSingle(query.storageType) || "",
      externalMemory: toSingle(query.externalMemory) || "",
      screenSize: toSingle(query.screenSize) || "",
      refreshRateSet: toSingle(query.refreshRateSet) || "",
      resolution: toSingle(query.resolution) || "",
      displayShape: toSingle(query.displayShape) || "",
      displayPanel: toSingle(query.displayPanel) || "",
      displayProtection: toSingle(query.displayProtection) || "",
      displayProtectionName: toSingle(query.displayProtectionName) || "",
      antutu: toSingle(query.antutu) || "",
      cpuSpeed: toSingle(query.cpuSpeed) || "",
      soc: toSingle(query.soc) || "",
      socModel: toSingle(query.socModel) || "",
      rearCameraCount: toSingle(query.rearCameraCount) || "",
      rearMaxRes: toSingle(query.rearMaxRes) || "",
      rearCameraType: toSingle(query.rearCameraType) || "",
      rearVideo: toSingle(query.rearVideo) || "",
      rearFunction: toSingle(query.rearFunction) || "",
      frontCameraCount: toSingle(query.frontCameraCount) || "",
      frontRes: toSingle(query.frontRes) || "",
      frontFunction: toSingle(query.frontFunction) || "",
      frontVideo: toSingle(query.frontVideo) || "",
      batteryType: toSingle(query.batteryType) || "",
      quickCharging: toSingle(query.quickCharging) || "",
      chargingW: toSingle(query.chargingW) || "",
      wirelessCharging: toSingle(query.wirelessCharging) || "",
      networkType: toSingle(query.networkType) || "",
      eSim: toSingle(query.eSim) || "",
      dualSim: toSingle(query.dualSim) || "",
      nfc: toSingle(query.nfc) || "",
      fingerprint: toSingle(query.fingerprint) || "",
      inDisplayFingerprint: toSingle(query.inDisplayFingerprint) || "",
      faceUnlock: toSingle(query.faceUnlock) || "",
      osName: toSingle(query.osName) || "",
      osVersion: toSingle(query.osVersion) || "",
      osUpdate: toSingle(query.osUpdate) || "",
      waterResistance: toSingle(query.waterResistance) || "",
      ipRating: toSingle(query.ipRating) || "",
      backMaterial: toSingle(query.backMaterial) || "",
      cameraMp: toSingle(query.cameraMp) || "",
      displaySize: toSingle(query.displaySize) || "",
      refreshRate: toSingle(query.refreshRate) || "",
      sort: toSingle(query.sort) || "",
      ...overrides,
    };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/tablets${params.toString() ? `?${params.toString()}` : ""}`;
  }

  const restrictiveFilterChips = [
    typeof query.brand === "string" && query.brand ? { label: "Brand", href: buildHref({ brand: "" }) } : null,
    (typeof query.minPrice === "string" && query.minPrice) || (typeof query.maxPrice === "string" && query.maxPrice)
      ? { label: "Price", href: buildHref({ minPrice: "", maxPrice: "", priceBucket: "" }) }
      : null,
    typeof query.ram === "string" && query.ram ? { label: "RAM", href: buildHref({ ram: "" }) } : null,
    typeof query.storage === "string" && query.storage ? { label: "Storage", href: buildHref({ storage: "" }) } : null,
    typeof query.processor === "string" && query.processor ? { label: "Processor", href: buildHref({ processor: "" }) } : null,
    typeof query.networkType === "string" && query.networkType ? { label: "Network", href: buildHref({ networkType: "", network: "" }) } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item)).slice(0, 3);

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel mb-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Tablet Finder</h1>
          <a
            href="#mobile-filters"
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 lg:hidden"
          >
            Filters
          </a>
        </div>
        <p className="mt-1.5 max-w-5xl text-sm leading-6 text-slate-600">
          Not sure which tablet fits your needs? Use our filters to quickly discover top tablet recommendations in India, with pricing.
        </p>
      </section>
      <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div id="mobile-filters">
          <FilterSidebar
            brands={brands}
            processors={processors}
            priceBucketCounts={priceBucketCounts}
            brandCounts={brandCounts}
            ramThresholdCounts={ramThresholdCounts}
            ramTypeCounts={ramTypeCounts}
            storageThresholdCounts={storageThresholdCounts}
            storageTypeCounts={storageTypeCounts}
            batteryCapacityCounts={batteryCapacityCounts}
            externalMemoryCount={externalMemoryCount}
            screenSizeCounts={screenSizeCounts}
            refreshRateCounts={refreshRateCounts}
            resolutionCounts={resolutionCounts}
            displayShapeCounts={displayShapeCounts}
            displayPanelCounts={displayPanelCounts}
            displayProtectionCount={displayProtectionCount}
            displayProtectionNameCounts={displayProtectionNameCounts}
            antutuCounts={antutuCounts}
            socCounts={socCounts}
            rearCameraCountCounts={rearCameraCountCounts}
            rearMaxResolutionCounts={rearMaxResolutionCounts}
            rearTypeCounts={rearTypeCounts}
            rearVideoCounts={rearVideoCounts}
            rearFunctionCounts={rearFunctionCounts}
            frontCameraCountCounts={frontCameraCountCounts}
            frontResolutionCounts={frontResolutionCounts}
            frontFunctionCounts={frontFunctionCounts}
            frontVideoCounts={frontVideoCounts}
            batteryTypeCounts={batteryTypeCounts}
            quickChargingCount={quickChargingCount}
            chargingWattCounts={chargingWattCounts}
            wirelessChargingCount={wirelessChargingCount}
            networkTypeCounts={networkTypeCounts}
            simCounts={simCounts}
            connectivityCounts={connectivityCounts}
            osNameCounts={osNameCounts}
            osVersionCounts={osVersionCounts}
            osUpdateCounts={osUpdateCounts}
            designCounts={designCounts}
            ipCounts={ipCounts}
            backMaterialCounts={backMaterialCounts}
          />
        </div>

        <div>
          <MobilePageTopBar total={result.total} entityLabel="Tablets" />
          <div className="space-y-4">
            {result.items.map((product, index) => {
              return (
              <div key={product.slug}>
                <TabletFinderRow product={product} />
                {index === 6 && brands.length > 0
                  ? (
                    <InlineFilterRow
                      title="Refine by Brand"
                      chips={brands.slice(0, 10).map((b) => ({ label: b, href: buildHref({ brand: b, page: "" }) }))}
                    />
                  )
                  : null}
                {index === 11 && processors.length > 0
                  ? (
                    <InlineFilterRow
                      title="Refine by Processor"
                      chips={processors.map((p) => ({ label: p, href: buildHref({ processor: p, page: "" }) }))}
                    />
                  )
                  : null}
                {index === 15 && cameras.length > 0
                  ? (
                    <InlineFilterRow
                      title="Refine by Camera"
                      chips={cameras.map((c) => ({ label: c, href: buildHref({ q: c, page: "" }) }))}
                    />
                  )
                  : null}
              </div>
            )})}
          </div>
          {result.items.length === 0 ? (
            <div className="panel mt-4 p-4">
              <p className="text-sm text-slate-600">No products found for this filter combination.</p>
              {restrictiveFilterChips.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Try removing:</span>
                  {restrictiveFilterChips.map((chip) => (
                    <a
                      key={chip.label}
                      href={chip.href}
                      className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {chip.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/tablets"
            searchParams={{
              q: typeof query.q === "string" ? query.q : undefined,
              brand: typeof query.brand === "string" ? query.brand : undefined,
              minPrice: typeof query.minPrice === "string" ? query.minPrice : undefined,
              maxPrice: typeof query.maxPrice === "string" ? query.maxPrice : undefined,
              ram: typeof query.ram === "string" ? query.ram : undefined,
              ramType: typeof query.ramType === "string" ? query.ramType : undefined,
              battery: typeof query.battery === "string" ? query.battery : undefined,
              storage: typeof query.storage === "string" ? query.storage : undefined,
              storageType: typeof query.storageType === "string" ? query.storageType : undefined,
              externalMemory: typeof query.externalMemory === "string" ? query.externalMemory : undefined,
              screenSize: typeof query.screenSize === "string" ? query.screenSize : undefined,
              refreshRateSet: typeof query.refreshRateSet === "string" ? query.refreshRateSet : undefined,
              resolution: typeof query.resolution === "string" ? query.resolution : undefined,
              displayShape: typeof query.displayShape === "string" ? query.displayShape : undefined,
              displayPanel: typeof query.displayPanel === "string" ? query.displayPanel : undefined,
              displayProtection: typeof query.displayProtection === "string" ? query.displayProtection : undefined,
              displayProtectionName: typeof query.displayProtectionName === "string" ? query.displayProtectionName : undefined,
              antutu: typeof query.antutu === "string" ? query.antutu : undefined,
              cpuSpeed: typeof query.cpuSpeed === "string" ? query.cpuSpeed : undefined,
              soc: typeof query.soc === "string" ? query.soc : undefined,
              socModel: typeof query.socModel === "string" ? query.socModel : undefined,
              rearCameraCount: typeof query.rearCameraCount === "string" ? query.rearCameraCount : undefined,
              rearMaxRes: typeof query.rearMaxRes === "string" ? query.rearMaxRes : undefined,
              rearCameraType: typeof query.rearCameraType === "string" ? query.rearCameraType : undefined,
              rearVideo: typeof query.rearVideo === "string" ? query.rearVideo : undefined,
              rearFunction: typeof query.rearFunction === "string" ? query.rearFunction : undefined,
              frontCameraCount: typeof query.frontCameraCount === "string" ? query.frontCameraCount : undefined,
              frontRes: typeof query.frontRes === "string" ? query.frontRes : undefined,
              frontFunction: typeof query.frontFunction === "string" ? query.frontFunction : undefined,
              frontVideo: typeof query.frontVideo === "string" ? query.frontVideo : undefined,
              batteryType: typeof query.batteryType === "string" ? query.batteryType : undefined,
              quickCharging: typeof query.quickCharging === "string" ? query.quickCharging : undefined,
              chargingW: typeof query.chargingW === "string" ? query.chargingW : undefined,
              wirelessCharging: typeof query.wirelessCharging === "string" ? query.wirelessCharging : undefined,
              networkType: typeof query.networkType === "string" ? query.networkType : undefined,
              eSim: typeof query.eSim === "string" ? query.eSim : undefined,
              dualSim: typeof query.dualSim === "string" ? query.dualSim : undefined,
              nfc: typeof query.nfc === "string" ? query.nfc : undefined,
              fingerprint: typeof query.fingerprint === "string" ? query.fingerprint : undefined,
              inDisplayFingerprint: typeof query.inDisplayFingerprint === "string" ? query.inDisplayFingerprint : undefined,
              faceUnlock: typeof query.faceUnlock === "string" ? query.faceUnlock : undefined,
              osName: typeof query.osName === "string" ? query.osName : undefined,
              osVersion: typeof query.osVersion === "string" ? query.osVersion : undefined,
              osUpdate: typeof query.osUpdate === "string" ? query.osUpdate : undefined,
              waterResistance: typeof query.waterResistance === "string" ? query.waterResistance : undefined,
              ipRating: typeof query.ipRating === "string" ? query.ipRating : undefined,
              backMaterial: typeof query.backMaterial === "string" ? query.backMaterial : undefined,
              priceBucket: typeof query.priceBucket === "string" ? query.priceBucket : undefined,
              cameraMp: typeof query.cameraMp === "string" ? query.cameraMp : undefined,
              displaySize: typeof query.displaySize === "string" ? query.displaySize : undefined,
              refreshRate: typeof query.refreshRate === "string" ? query.refreshRate : undefined,
              network: typeof query.network === "string" ? query.network : undefined,
              processor: typeof query.processor === "string" ? query.processor : undefined,
              sort: typeof query.sort === "string" ? query.sort : undefined,
            }}
          />
          <MobileExploreLinks brands={brands} products={exploreProducts} deviceType="tablet" />
        </div>
      </section>
      <CompareTray deviceType="tablet" compareBasePath="/tablets/compare" />
    </main>
  );
}
