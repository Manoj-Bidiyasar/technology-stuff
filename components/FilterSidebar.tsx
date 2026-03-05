"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  brands: string[];
  processors: string[];
  priceBucketCounts?: Record<string, number>;
  brandCounts?: Record<string, number>;
  ramThresholdCounts?: Record<string, number>;
  ramTypeCounts?: Record<string, number>;
  storageThresholdCounts?: Record<string, number>;
  storageTypeCounts?: Record<string, number>;
  batteryCapacityCounts?: Record<string, number>;
  externalMemoryCount?: number;
  screenSizeCounts?: Record<string, number>;
  refreshRateCounts?: Record<string, number>;
  resolutionCounts?: Record<string, number>;
  displayShapeCounts?: Record<string, number>;
  displayPanelCounts?: Record<string, number>;
  displayProtectionCount?: number;
  displayProtectionNameCounts?: Record<string, number>;
  antutuCounts?: Record<string, number>;
  socCounts?: Record<string, number>;
  rearCameraCountCounts?: Record<string, number>;
  rearMaxResolutionCounts?: Record<string, number>;
  rearTypeCounts?: Record<string, number>;
  rearVideoCounts?: Record<string, number>;
  rearFunctionCounts?: Record<string, number>;
  frontCameraCountCounts?: Record<string, number>;
  frontResolutionCounts?: Record<string, number>;
  frontFunctionCounts?: Record<string, number>;
  frontVideoCounts?: Record<string, number>;
  batteryTypeCounts?: Record<string, number>;
  quickChargingCount?: number;
  chargingWattCounts?: Record<string, number>;
  wirelessChargingCount?: number;
  networkTypeCounts?: Record<string, number>;
  simCounts?: Record<string, number>;
  connectivityCounts?: Record<string, number>;
  osNameCounts?: Record<string, number>;
  osVersionCounts?: Record<string, number>;
  osUpdateCounts?: Record<string, number>;
  designCounts?: Record<string, number>;
  ipCounts?: Record<string, number>;
  backMaterialCounts?: Record<string, number>;
};

const PRICE_BUCKETS = [
  { id: "u10", label: "Under \u20B910,000", min: "", max: "10000" },
  { id: "10-20", label: "\u20B910,000 - \u20B920,000", min: "10000", max: "20000" },
  { id: "20-30", label: "\u20B920,000 - \u20B930,000", min: "20000", max: "30000" },
  { id: "30-40", label: "\u20B930,000 - \u20B940,000", min: "30000", max: "40000" },
  { id: "40-50", label: "\u20B940,000 - \u20B950,000", min: "40000", max: "50000" },
  { id: "50-60", label: "\u20B950,000 - \u20B960,000", min: "50000", max: "60000" },
  { id: "a60", label: "\u20B960,000 and above", min: "60000", max: "" },
] as const;

const RAM_TYPES = ["LPDDR5X", "LPDDR5", "LPDDR4X", "LPDDR4"];
const STORAGE_TYPES = ["UFS 4.1", "UFS 4.0", "UFS 3.1", "UFS 2.2", "eMMC 5.1"];
const SOC_BRANDS = ["Snapdragon", "MediaTek", "Exynos", "Tensor", "Apple"];

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
const splitCsv = (value: string | null) => (value || "").split(",").map((v) => v.trim()).filter(Boolean);
const toggleArray = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "");

function Row({ label, checked, disabled, onChange, indent = false }: { label: string; checked: boolean; disabled: boolean; onChange: () => void; indent?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0", indent && "pl-8", disabled ? "text-slate-400" : "text-slate-800")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="h-4 w-4 rounded border-slate-300" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

export default function FilterSidebar({
  brands,
  processors,
  priceBucketCounts = {},
  brandCounts = {},
  ramThresholdCounts = {},
  ramTypeCounts = {},
  storageThresholdCounts = {},
  storageTypeCounts = {},
  batteryCapacityCounts = {},
  externalMemoryCount = 0,
  screenSizeCounts = {},
  refreshRateCounts = {},
  resolutionCounts = {},
  displayShapeCounts = {},
  displayPanelCounts = {},
  displayProtectionCount = 0,
  displayProtectionNameCounts = {},
  antutuCounts = {},
  socCounts = {},
  rearCameraCountCounts = {},
  rearMaxResolutionCounts = {},
  rearTypeCounts = {},
  rearVideoCounts = {},
  rearFunctionCounts = {},
  frontCameraCountCounts = {},
  frontResolutionCounts = {},
  frontFunctionCounts = {},
  frontVideoCounts = {},
  batteryTypeCounts = {},
  quickChargingCount = 0,
  chargingWattCounts = {},
  wirelessChargingCount = 0,
  networkTypeCounts = {},
  simCounts = {},
  connectivityCounts = {},
  osNameCounts = {},
  osVersionCounts = {},
  osUpdateCounts = {},
  designCounts = {},
  ipCounts = {},
  backMaterialCounts = {},
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [brandSearch, setBrandSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, setBrand] = useState<string[]>(splitCsv(searchParams.get("brand")));
  const [processor] = useState(searchParams.get("processor") || "");
  const [network, setNetwork] = useState(searchParams.get("network") || "");
  const [priceBucket, setPriceBucket] = useState(searchParams.get("priceBucket") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [ram, setRam] = useState(searchParams.get("ram") || "");
  const [ramType, setRamType] = useState<string[]>(splitCsv(searchParams.get("ramType")));
  const [storage, setStorage] = useState(searchParams.get("storage") || "");
  const [storageType, setStorageType] = useState<string[]>(splitCsv(searchParams.get("storageType")));
  const [battery, setBattery] = useState(searchParams.get("battery") || "");
  const [externalMemory, setExternalMemory] = useState(searchParams.get("externalMemory") === "1");
  const [screenSize, setScreenSize] = useState<string[]>(splitCsv(searchParams.get("screenSize")));
  const [refreshRateSet, setRefreshRateSet] = useState<string[]>(splitCsv(searchParams.get("refreshRateSet")));
  const [resolution, setResolution] = useState<string[]>(splitCsv(searchParams.get("resolution")).map((v) => v.toUpperCase()));
  const [displayShape, setDisplayShape] = useState<string[]>(splitCsv(searchParams.get("displayShape")).map((v) => v.toLowerCase()));
  const [displayPanel, setDisplayPanel] = useState<string[]>(splitCsv(searchParams.get("displayPanel")));
  const [displayProtection, setDisplayProtection] = useState(searchParams.get("displayProtection") === "1");
  const [displayProtectionName, setDisplayProtectionName] = useState<string[]>(splitCsv(searchParams.get("displayProtectionName")));
  const [expandedDisplayProtection, setExpandedDisplayProtection] = useState(searchParams.get("displayProtection") === "1" || splitCsv(searchParams.get("displayProtectionName")).length > 0);
  const [antutu, setAntutu] = useState<string[]>(splitCsv(searchParams.get("antutu")));
  const [soc, setSoc] = useState<string[]>(splitCsv(searchParams.get("soc")));
  const [socModel, setSocModel] = useState<string[]>(splitCsv(searchParams.get("socModel")));
  const [expandedSoc, setExpandedSoc] = useState<string[]>(splitCsv(searchParams.get("soc")));
  const [batteryType, setBatteryType] = useState<string[]>(splitCsv(searchParams.get("batteryType")));
  const [rearCameraCount, setRearCameraCount] = useState<string[]>(splitCsv(searchParams.get("rearCameraCount")));
  const [rearMaxRes, setRearMaxRes] = useState<string[]>(splitCsv(searchParams.get("rearMaxRes")));
  const [rearCameraType, setRearCameraType] = useState<string[]>(splitCsv(searchParams.get("rearCameraType")));
  const [rearVideo, setRearVideo] = useState<string[]>(splitCsv(searchParams.get("rearVideo")).map((v) => v.toLowerCase()));
  const [rearFunction, setRearFunction] = useState<string[]>(splitCsv(searchParams.get("rearFunction")));
  const [rearOpen, setRearOpen] = useState({
    count: true,
    resolution: true,
    type: true,
    video: true,
    function: true,
  });
  const [frontCameraCount, setFrontCameraCount] = useState<string[]>(splitCsv(searchParams.get("frontCameraCount")));
  const [frontRes, setFrontRes] = useState<string[]>(splitCsv(searchParams.get("frontRes")));
  const [frontFunction, setFrontFunction] = useState<string[]>(splitCsv(searchParams.get("frontFunction")));
  const [frontVideo, setFrontVideo] = useState<string[]>(splitCsv(searchParams.get("frontVideo")).map((v) => v.toLowerCase()));
  const [frontOpen, setFrontOpen] = useState({
    count: true,
    resolution: true,
    function: true,
    video: true,
  });
  const [quickCharging, setQuickCharging] = useState(searchParams.get("quickCharging") === "1");
  const [chargingW, setChargingW] = useState<string[]>(splitCsv(searchParams.get("chargingW")));
  const [wirelessCharging, setWirelessCharging] = useState(searchParams.get("wirelessCharging") === "1");
  const [networkType, setNetworkType] = useState<string[]>(splitCsv(searchParams.get("networkType")));
  const [eSim, setESim] = useState(searchParams.get("eSim") === "1");
  const [dualSim, setDualSim] = useState(searchParams.get("dualSim") === "1");
  const [nfc, setNfc] = useState(searchParams.get("nfc") === "1");
  const [fingerprint, setFingerprint] = useState(searchParams.get("fingerprint") === "1");
  const [inDisplayFingerprint, setInDisplayFingerprint] = useState(searchParams.get("inDisplayFingerprint") === "1");
  const [faceUnlock, setFaceUnlock] = useState(searchParams.get("faceUnlock") === "1");
  const [osName, setOsName] = useState<string[]>(splitCsv(searchParams.get("osName")).map((v) => v.toLowerCase()));
  const [osVersion, setOsVersion] = useState<string[]>(splitCsv(searchParams.get("osVersion")));
  const [osUpdate, setOsUpdate] = useState<string[]>(splitCsv(searchParams.get("osUpdate")));
  const [waterResistance, setWaterResistance] = useState(searchParams.get("waterResistance") === "1");
  const [ipRating, setIpRating] = useState<string[]>(splitCsv(searchParams.get("ipRating")).map((v) => v.toUpperCase()));
  const [backMaterial, setBackMaterial] = useState<string[]>(splitCsv(searchParams.get("backMaterial")).map((v) => v.toLowerCase()));
  const selectedBrands = splitCsv(searchParams.get("brand"));
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  function pushParams(next: Partial<Record<string, string>>, immediate = false) {
    const params = new URLSearchParams(searchParams.toString());
    const entries: Array<[string, string]> = [
      ["brand", next.brand ?? selectedBrands.join(",")], ["processor", next.processor ?? processor], ["network", next.network ?? network], ["priceBucket", next.priceBucket ?? priceBucket], ["minPrice", next.minPrice ?? minPrice], ["maxPrice", next.maxPrice ?? maxPrice], ["ram", next.ram ?? ram], ["ramType", next.ramType ?? ramType.join(",")], ["battery", next.battery ?? battery], ["storage", next.storage ?? storage], ["storageType", next.storageType ?? storageType.join(",")], ["externalMemory", next.externalMemory ?? (externalMemory ? "1" : "")], ["screenSize", next.screenSize ?? screenSize.join(",")], ["refreshRateSet", next.refreshRateSet ?? refreshRateSet.join(",")], ["resolution", next.resolution ?? resolution.join(",")], ["displayShape", next.displayShape ?? displayShape.join(",")], ["displayPanel", next.displayPanel ?? displayPanel.join(",")], ["displayProtection", next.displayProtection ?? (displayProtection ? "1" : "")], ["displayProtectionName", next.displayProtectionName ?? displayProtectionName.join(",")], ["antutu", next.antutu ?? antutu.join(",")], ["soc", next.soc ?? soc.join(",")], ["socModel", next.socModel ?? socModel.join(",")], ["rearCameraCount", next.rearCameraCount ?? rearCameraCount.join(",")], ["rearMaxRes", next.rearMaxRes ?? rearMaxRes.join(",")], ["rearCameraType", next.rearCameraType ?? rearCameraType.join(",")], ["rearVideo", next.rearVideo ?? rearVideo.join(",")], ["rearFunction", next.rearFunction ?? rearFunction.join(",")], ["frontCameraCount", next.frontCameraCount ?? frontCameraCount.join(",")], ["frontRes", next.frontRes ?? frontRes.join(",")], ["frontFunction", next.frontFunction ?? frontFunction.join(",")], ["frontVideo", next.frontVideo ?? frontVideo.join(",")], ["batteryType", next.batteryType ?? batteryType.join(",")], ["quickCharging", next.quickCharging ?? (quickCharging ? "1" : "")], ["chargingW", next.chargingW ?? chargingW.join(",")], ["wirelessCharging", next.wirelessCharging ?? (wirelessCharging ? "1" : "")], ["networkType", next.networkType ?? networkType.join(",")], ["eSim", next.eSim ?? (eSim ? "1" : "")], ["dualSim", next.dualSim ?? (dualSim ? "1" : "")], ["nfc", next.nfc ?? (nfc ? "1" : "")], ["fingerprint", next.fingerprint ?? (fingerprint ? "1" : "")], ["inDisplayFingerprint", next.inDisplayFingerprint ?? (inDisplayFingerprint ? "1" : "")], ["faceUnlock", next.faceUnlock ?? (faceUnlock ? "1" : "")], ["osName", next.osName ?? osName.join(",")], ["osVersion", next.osVersion ?? osVersion.join(",")], ["osUpdate", next.osUpdate ?? osUpdate.join(",")], ["waterResistance", next.waterResistance ?? (waterResistance ? "1" : "")], ["ipRating", next.ipRating ?? ipRating.join(",")], ["backMaterial", next.backMaterial ?? backMaterial.join(",")],
    ];
    entries.forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    params.delete("q");
    params.delete("page");
    const target = `${pathname}?${params.toString()}`;
    if (immediate) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      router.replace(target, { scroll: false });
      return;
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      router.replace(target, { scroll: false });
    }, 220);
  }

  function clearAllFilters() {
    setBrandSearch("");
    setBrand([]);
    setNetwork("");
    setPriceBucket("");
    setMinPrice("");
    setMaxPrice("");
    setRam("");
    setRamType([]);
    setStorage("");
    setStorageType([]);
    setBattery("");
    setExternalMemory(false);
    setScreenSize([]);
    setRefreshRateSet([]);
    setResolution([]);
    setDisplayShape([]);
    setDisplayPanel([]);
    setDisplayProtection(false);
    setDisplayProtectionName([]);
    setExpandedDisplayProtection(false);
    setAntutu([]);
    setSoc([]);
    setSocModel([]);
    setExpandedSoc([]);
    setRearCameraCount([]);
    setRearMaxRes([]);
    setRearCameraType([]);
    setRearVideo([]);
    setRearFunction([]);
    setRearOpen({ count: true, resolution: true, type: true, video: true, function: true });
    setFrontCameraCount([]);
    setFrontRes([]);
    setFrontFunction([]);
    setFrontVideo([]);
    setFrontOpen({ count: true, resolution: true, function: true, video: true });
    setBatteryType([]);
    setQuickCharging(false);
    setChargingW([]);
    setWirelessCharging(false);
    setNetworkType([]);
    setESim(false);
    setDualSim(false);
    setNfc(false);
    setFingerprint(false);
    setInDisplayFingerprint(false);
    setFaceUnlock(false);
    setOsName([]);
    setOsVersion([]);
    setOsUpdate([]);
    setWaterResistance(false);
    setIpRating([]);
    setBackMaterial([]);
    router.replace(pathname, { scroll: false });
  }

  const brandCountLookup = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(brandCounts).forEach(([name, count]) => {
      const key = normalize(name.trim());
      map.set(key, (map.get(key) || 0) + count);
    });
    return map;
  }, [brandCounts]);

  const filteredBrands = useMemo(
    () =>
      brands
        .filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()))
        .map((name) => ({
          name,
          count: brandCountLookup.get(normalize(name.trim())) || 0,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [brands, brandSearch, brandCountLookup]
  );

  const ramTypeRows = useMemo(() => RAM_TYPES.map((name) => ({ name, count: Object.entries(ramTypeCounts).reduce((acc, [k, v]) => (normalize(k) === normalize(name) ? acc + v : acc), 0) })), [ramTypeCounts]);
  const storageTypeRows = useMemo(() => STORAGE_TYPES.map((name) => ({ name, count: Object.entries(storageTypeCounts).reduce((acc, [k, v]) => (normalize(k) === normalize(name) ? acc + v : acc), 0) })), [storageTypeCounts]);
  const socModels = useMemo(() => {
    const g: Record<string, string[]> = { Snapdragon: [], MediaTek: [], Exynos: [], Tensor: [], Apple: [] };
    processors.forEach((p) => {
      const v = p.toLowerCase();
      if (v.includes("snapdragon")) g.Snapdragon.push(p);
      else if (v.includes("dimensity") || v.includes("mediatek")) g.MediaTek.push(p);
      else if (v.includes("exynos")) g.Exynos.push(p);
      else if (v.includes("tensor")) g.Tensor.push(p);
      else if (v.includes("apple") || v.includes("bionic")) g.Apple.push(p);
    });
    return g;
  }, [processors]);

  const min = Math.max(0, Math.min(Number(minPrice || 0), 200000));
  const max = Math.max(0, Math.min(Number(maxPrice || 200000), 200000));
  const l = (Math.min(min, max) / 200000) * 100;
  const r = (Math.max(min, max) / 200000) * 100;
  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sort");
    params.delete("page");
    params.delete("q");
    let count = 0;
    for (const [, raw] of params.entries()) {
      const v = String(raw || "").trim();
      if (!v) continue;
      count += v.split(",").map((item) => item.trim()).filter(Boolean).length;
    }
    return count;
  }, [searchParams]);

  return (
    <aside className="panel h-fit p-4 lg:sticky lg:top-20">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Filters</h2>
        <button type="button" onClick={clearAllFilters} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">Clear all</button>
      </div>
      {activeFilterCount > 0 ? (
        <div className="sticky top-0 z-10 mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs font-semibold text-blue-800">Applied filters: {activeFilterCount}</p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-blue-700 underline underline-offset-2"
          >
            Reset
          </button>
        </div>
      ) : null}
      <div className="mt-3 space-y-3">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Price Range</p>
          <div className="relative h-9">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
            <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-500" style={{ left: `${l}%`, width: `${Math.max(r - l, 0)}%` }} />
            <input type="range" min={0} max={200000} step={1000} value={Math.min(min, max)} onChange={(e) => { const v = String(Math.min(Number(e.target.value), max)); setMinPrice(v); pushParams({ minPrice: v }); }} className="pointer-events-none absolute left-0 top-1/2 h-9 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white" />
            <input type="range" min={0} max={200000} step={1000} value={Math.max(min, max)} onChange={(e) => { const v = String(Math.max(Number(e.target.value), min)); setMaxPrice(v); pushParams({ maxPrice: v }); }} className="pointer-events-none absolute left-0 top-1/2 h-9 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white" />
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">&#8377;</span><input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} onBlur={() => pushParams({ minPrice })} type="number" placeholder="Min" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm" /></label>
            <label className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">&#8377;</span><input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} onBlur={() => pushParams({ maxPrice })} type="number" placeholder="Max" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm" /></label>
          </div>
          <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {PRICE_BUCKETS.map((item) => (
              <Row
                key={`price-${item.id}`}
                label={`${item.label} (${priceBucketCounts[item.id] || 0})`}
                checked={priceBucket === item.id}
                disabled={false}
                onChange={() => {
                  const active = priceBucket === item.id;
                  setPriceBucket(active ? "" : item.id);
                  setMinPrice(active ? "" : item.min);
                  setMaxPrice(active ? "" : item.max);
                  pushParams({
                    priceBucket: active ? "" : item.id,
                    minPrice: active ? "" : item.min,
                    maxPrice: active ? "" : item.max,
                  });
                }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">Brands</p>
            {selectedBrands.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setBrand([]);
                  pushParams({ brand: "" });
                }}
                className="text-xs font-semibold text-slate-600 underline underline-offset-2"
              >
                Unselect
              </button>
            ) : null}
          </div>
          <div className="relative mb-2">
            <input
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Search Brand"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-700 placeholder:text-slate-500"
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            >
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
              <span className="inline-block h-4 w-4 rounded border border-slate-300 bg-white" />
              Popular Brands
            </div>
            {filteredBrands.map((item) => {
              const checked = selectedBrands.includes(item.name);
              return (
                <label
                  key={`brand-${item.name}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0",
                    item.count === 0 ? "text-slate-400" : "text-slate-800",
                    checked && item.count > 0 && "bg-white"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = toggleArray(selectedBrands, item.name);
                      setBrand(next);
                      pushParams({ brand: next.join(",") });
                    }}
                    className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                  />
                  <span className="font-medium">
                    {item.name} ({item.count})
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-extrabold text-slate-800">RAM</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`4GB & below (${ramThresholdCounts["lte4"] || 0})`} checked={ram === "lte4"} disabled={(ramThresholdCounts["lte4"] || 0) === 0 && ram !== "lte4"} onChange={() => { const next = ram === "lte4" ? "" : "lte4"; setRam(next); pushParams({ ram: next }); }} />
            {["6", "8", "12", "16"].map((value) => <Row key={`ram-${value}`} label={`${value} GB & above (${ramThresholdCounts[value] || 0})`} checked={ram === value} disabled={(ramThresholdCounts[value] || 0) === 0 && ram !== value} onChange={() => { const next = ram === value ? "" : value; setRam(next); pushParams({ ram: next }); }} />)}
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">RAM Type</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {ramTypeRows.map((item) => <Row key={`ram-type-${item.name}`} label={`${item.name} (${item.count})`} checked={ramType.includes(item.name)} disabled={item.count === 0 && !ramType.includes(item.name)} onChange={() => { const next = toggleArray(ramType, item.name); setRamType(next); pushParams({ ramType: next.join(",") }); }} />)}
          </div>
        </section>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
          </button>
        </div>

        {showAdvanced ? (
        <>
        <section>
          <p className="mb-2 text-sm font-extrabold text-slate-800">Memory</p>
          <p className="mb-2 text-sm font-extrabold text-slate-800">Internal Memory</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`64GB & below (${storageThresholdCounts["lte64"] || 0})`} checked={storage === "lte64"} disabled={(storageThresholdCounts["lte64"] || 0) === 0 && storage !== "lte64"} onChange={() => { const next = storage === "lte64" ? "" : "lte64"; setStorage(next); pushParams({ storage: next }); }} />
            {["128", "256", "512"].map((value) => <Row key={`storage-${value}`} label={`${value} GB & above (${storageThresholdCounts[value] || 0})`} checked={storage === value} disabled={(storageThresholdCounts[value] || 0) === 0 && storage !== value} onChange={() => { const next = storage === value ? "" : value; setStorage(next); pushParams({ storage: next }); }} />)}
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Storage Type</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {storageTypeRows.map((item) => <Row key={`storage-type-${item.name}`} label={`${item.name.replace("UFS 2.2", "UFS2.2").replace("eMMC 5.1", "eMMC5.1")} (${item.count})`} checked={storageType.includes(item.name)} disabled={item.count === 0 && !storageType.includes(item.name)} onChange={() => { const next = toggleArray(storageType, item.name); setStorageType(next); pushParams({ storageType: next.join(",") }); }} />)}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-extrabold text-slate-800">External Memory</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row label={`Memory Card Slot (${externalMemoryCount})`} checked={externalMemory} disabled={externalMemoryCount === 0 && !externalMemory} onChange={() => { const next = !externalMemory; setExternalMemory(next); pushParams({ externalMemory: next ? "1" : "" }); }} /></div>
        </section>
        <section className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-sm font-extrabold text-slate-800">Display</p>
          <p className="mb-2 text-sm font-extrabold text-slate-800">Screen Size</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`6 inch & below (${screenSizeCounts["lte6"] || 0})`} checked={screenSize.includes("lte6")} disabled={(screenSizeCounts["lte6"] || 0) === 0 && !screenSize.includes("lte6")} onChange={() => { const next = toggleArray(screenSize, "lte6"); setScreenSize(next); pushParams({ screenSize: next.join(",") }); }} />
            <Row label={`6 inch - 6.5 inch (${screenSizeCounts["6-6.5"] || 0})`} checked={screenSize.includes("6-6.5")} disabled={(screenSizeCounts["6-6.5"] || 0) === 0 && !screenSize.includes("6-6.5")} onChange={() => { const next = toggleArray(screenSize, "6-6.5"); setScreenSize(next); pushParams({ screenSize: next.join(",") }); }} />
            <Row label={`6.5 inch & above (${screenSizeCounts["6.5+"] || 0})`} checked={screenSize.includes("6.5+")} disabled={(screenSizeCounts["6.5+"] || 0) === 0 && !screenSize.includes("6.5+")} onChange={() => { const next = toggleArray(screenSize, "6.5+"); setScreenSize(next); pushParams({ screenSize: next.join(",") }); }} />
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Refresh Rate</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{["60", "90", "120", "144"].map((value) => <Row key={`refresh-${value}`} label={`${value} Hz (${refreshRateCounts[value] || 0})`} checked={refreshRateSet.includes(value)} disabled={(refreshRateCounts[value] || 0) === 0 && !refreshRateSet.includes(value)} onChange={() => { const next = toggleArray(refreshRateSet, value); setRefreshRateSet(next); pushParams({ refreshRateSet: next.join(",") }); }} />)}</div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Screen Resolution</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`HD+ (${resolutionCounts.HD || 0})`} checked={resolution.includes("HD")} disabled={(resolutionCounts.HD || 0) === 0 && !resolution.includes("HD")} onChange={() => { const next = toggleArray(resolution, "HD"); setResolution(next); pushParams({ resolution: next.join(",") }); }} />
            <Row label={`FHD+ (${resolutionCounts.FHD || 0})`} checked={resolution.includes("FHD")} disabled={(resolutionCounts.FHD || 0) === 0 && !resolution.includes("FHD")} onChange={() => { const next = toggleArray(resolution, "FHD"); setResolution(next); pushParams({ resolution: next.join(",") }); }} />
            <Row label={`QHD (2K) (${resolutionCounts.QHD || 0})`} checked={resolution.includes("QHD")} disabled={(resolutionCounts.QHD || 0) === 0 && !resolution.includes("QHD")} onChange={() => { const next = toggleArray(resolution, "QHD"); setResolution(next); pushParams({ resolution: next.join(",") }); }} />
            <Row label={`UHD (4K) (${resolutionCounts.UHD || 0})`} checked={resolution.includes("UHD")} disabled={(resolutionCounts.UHD || 0) === 0 && !resolution.includes("UHD")} onChange={() => { const next = toggleArray(resolution, "UHD"); setResolution(next); pushParams({ resolution: next.join(",") }); }} />
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Display Shape</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`Flat (${displayShapeCounts.flat || 0})`} checked={displayShape.includes("flat")} disabled={(displayShapeCounts.flat || 0) === 0 && !displayShape.includes("flat")} onChange={() => { const next = toggleArray(displayShape, "flat"); setDisplayShape(next); pushParams({ displayShape: next.join(",") }); }} />
            <Row label={`Curved (${displayShapeCounts.curved || 0})`} checked={displayShape.includes("curved")} disabled={(displayShapeCounts.curved || 0) === 0 && !displayShape.includes("curved")} onChange={() => { const next = toggleArray(displayShape, "curved"); setDisplayShape(next); pushParams({ displayShape: next.join(",") }); }} />
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Display Type</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["LTPO AMOLED", "AMOLED", "IPS LCD", "OLED", "LED"].map((value) => (
              <Row
                key={`display-panel-${value}`}
                label={`${value} (${displayPanelCounts[value] || 0})`}
                checked={displayPanel.includes(value)}
                disabled={(displayPanelCounts[value] || 0) === 0 && !displayPanel.includes(value)}
                onChange={() => {
                  const next = toggleArray(displayPanel, value);
                  setDisplayPanel(next);
                  pushParams({ displayPanel: next.join(",") });
                }}
              />
            ))}
          </div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Display Protection</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={displayProtection}
                onChange={() => {
                  const next = !displayProtection;
                  setDisplayProtection(next);
                  if (next) setExpandedDisplayProtection(true);
                  pushParams({ displayProtection: next ? "1" : "" });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-orange-500"
              />
              <span className="font-medium">Protection ({displayProtectionCount})</span>
              <button
                type="button"
                className="ml-auto text-xs font-bold text-slate-500"
                onClick={() => setExpandedDisplayProtection((prev) => !prev)}
              >
                [{expandedDisplayProtection ? "-" : "+"}]
              </button>
            </label>
            {expandedDisplayProtection ? (
              <div className="border-t border-slate-100 bg-slate-50 px-8 pb-2 pt-1">
                {Object.entries(displayProtectionNameCounts)
                  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                  .map(([name, count]) => (
                    <label key={`display-protection-${name}`} className="flex cursor-pointer items-start gap-2 py-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={displayProtectionName.includes(name)}
                        onChange={() => {
                          const next = toggleArray(displayProtectionName, name);
                          setDisplayProtectionName(next);
                          pushParams({ displayProtectionName: next.join(",") });
                        }}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-orange-500"
                      />
                      <span>{name} ({count})</span>
                    </label>
                  ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-800">Rear Camera</p>
            <button
              type="button"
              onClick={() => {
                const allOpen = Object.values(rearOpen).every(Boolean);
                setRearOpen({ count: !allOpen, resolution: !allOpen, type: !allOpen, video: !allOpen, function: !allOpen });
              }}
              className="text-xs font-semibold text-slate-600 underline underline-offset-2"
            >
              {Object.values(rearOpen).every(Boolean) ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">No. of Rear Camera</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setRearOpen((prev) => ({ ...prev, count: !prev.count }))}>[{rearOpen.count ? "-" : "+"}]</button>
          </div>
          {rearOpen.count ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {[["1", "Single"], ["2", "Dual"], ["3", "Triple"], ["4", "Quad"], ["5", "Penta"]].map(([value, label]) => (
              <Row
                key={`rear-count-${value}`}
                label={`${label} (${rearCameraCountCounts[value] || 0})`}
                checked={rearCameraCount.includes(value)}
                disabled={(rearCameraCountCounts[value] || 0) === 0 && !rearCameraCount.includes(value)}
                onChange={() => {
                  const next = toggleArray(rearCameraCount, value);
                  setRearCameraCount(next);
                  pushParams({ rearCameraCount: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Max Rear Camera Resolution</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setRearOpen((prev) => ({ ...prev, resolution: !prev.resolution }))}>[{rearOpen.resolution ? "-" : "+"}]</button>
          </div>
          {rearOpen.resolution ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {[["lte16", "16MP & below"], ["32", "32MP & above"], ["48", "48MP & above"], ["50", "50MP & above"], ["64", "64MP & above"], ["108", "108MP & above"], ["200", "200MP & above"]].map(([id, label]) => (
              <Row
                key={`rear-mp-${id}`}
                label={`${label} (${rearMaxResolutionCounts[id] || 0})`}
                checked={rearMaxRes.includes(id)}
                disabled={(rearMaxResolutionCounts[id] || 0) === 0 && !rearMaxRes.includes(id)}
                onChange={() => {
                  const next = toggleArray(rearMaxRes, id);
                  setRearMaxRes(next);
                  pushParams({ rearMaxRes: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Camera Type</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setRearOpen((prev) => ({ ...prev, type: !prev.type }))}>[{rearOpen.type ? "-" : "+"}]</button>
          </div>
          {rearOpen.type ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["macro", "ultra-wide", "telephoto", "periscope"].map((value) => (
              <Row
                key={`rear-type-${value}`}
                label={`${value} (${rearTypeCounts[value] || 0})`}
                checked={rearCameraType.includes(value)}
                disabled={(rearTypeCounts[value] || 0) === 0 && !rearCameraType.includes(value)}
                onChange={() => {
                  const next = toggleArray(rearCameraType, value);
                  setRearCameraType(next);
                  pushParams({ rearCameraType: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Max Rear Camera Video</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setRearOpen((prev) => ({ ...prev, video: !prev.video }))}>[{rearOpen.video ? "-" : "+"}]</button>
          </div>
          {rearOpen.video ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["1080p", "4k30", "4k60", "8k"].map((value) => (
              <Row
                key={`rear-video-${value}`}
                label={`${value.toUpperCase()} (${rearVideoCounts[value] || 0})`}
                checked={rearVideo.includes(value)}
                disabled={(rearVideoCounts[value] || 0) === 0 && !rearVideo.includes(value)}
                onChange={() => {
                  const next = toggleArray(rearVideo, value);
                  setRearVideo(next);
                  pushParams({ rearVideo: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Camera Function</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setRearOpen((prev) => ({ ...prev, function: !prev.function }))}>[{rearOpen.function ? "-" : "+"}]</button>
          </div>
          {rearOpen.function ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["OIS", "Autofocus", "Flash LED", "Laser AF"].map((value) => (
              <Row
                key={`rear-fn-${value}`}
                label={`${value} (${rearFunctionCounts[value] || 0})`}
                checked={rearFunction.includes(value)}
                disabled={(rearFunctionCounts[value] || 0) === 0 && !rearFunction.includes(value)}
                onChange={() => {
                  const next = toggleArray(rearFunction, value);
                  setRearFunction(next);
                  pushParams({ rearFunction: next.join(",") });
                }}
              />
            ))}
          </div> : null}
        </section>

        <section className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-800">Front Camera</p>
            <button
              type="button"
              onClick={() => {
                const allOpen = Object.values(frontOpen).every(Boolean);
                setFrontOpen({ count: !allOpen, resolution: !allOpen, function: !allOpen, video: !allOpen });
              }}
              className="text-xs font-semibold text-slate-600 underline underline-offset-2"
            >
              {Object.values(frontOpen).every(Boolean) ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">No. of Front Camera</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setFrontOpen((prev) => ({ ...prev, count: !prev.count }))}>[{frontOpen.count ? "-" : "+"}]</button>
          </div>
          {frontOpen.count ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {[["1", "Single"], ["2", "Dual"]].map(([value, label]) => (
              <Row
                key={`front-count-${value}`}
                label={`${label} (${frontCameraCountCounts[value] || 0})`}
                checked={frontCameraCount.includes(value)}
                disabled={(frontCameraCountCounts[value] || 0) === 0 && !frontCameraCount.includes(value)}
                onChange={() => {
                  const next = toggleArray(frontCameraCount, value);
                  setFrontCameraCount(next);
                  pushParams({ frontCameraCount: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Max Front Camera Resolution</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setFrontOpen((prev) => ({ ...prev, resolution: !prev.resolution }))}>[{frontOpen.resolution ? "-" : "+"}]</button>
          </div>
          {frontOpen.resolution ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {[["lte8", "8MP & below"], ["16", "16MP & above"], ["32", "32MP & above"], ["50", "50MP & above"]].map(([id, label]) => (
              <Row
                key={`front-res-${id}`}
                label={`${label} (${frontResolutionCounts[id] || 0})`}
                checked={frontRes.includes(id)}
                disabled={(frontResolutionCounts[id] || 0) === 0 && !frontRes.includes(id)}
                onChange={() => {
                  const next = toggleArray(frontRes, id);
                  setFrontRes(next);
                  pushParams({ frontRes: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Front Camera Function</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setFrontOpen((prev) => ({ ...prev, function: !prev.function }))}>[{frontOpen.function ? "-" : "+"}]</button>
          </div>
          {frontOpen.function ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["Under-display", "Autofocus"].map((value) => (
              <Row
                key={`front-fn-${value}`}
                label={`${value} (${frontFunctionCounts[value] || 0})`}
                checked={frontFunction.includes(value)}
                disabled={(frontFunctionCounts[value] || 0) === 0 && !frontFunction.includes(value)}
                onChange={() => {
                  const next = toggleArray(frontFunction, value);
                  setFrontFunction(next);
                  pushParams({ frontFunction: next.join(",") });
                }}
              />
            ))}
          </div> : null}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Max Front Camera Video</p>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setFrontOpen((prev) => ({ ...prev, video: !prev.video }))}>[{frontOpen.video ? "-" : "+"}]</button>
          </div>
          {frontOpen.video ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {["1080p", "4k30", "4k60"].map((value) => (
              <Row
                key={`front-video-${value}`}
                label={`${value.toUpperCase()} (${frontVideoCounts[value] || 0})`}
                checked={frontVideo.includes(value)}
                disabled={(frontVideoCounts[value] || 0) === 0 && !frontVideo.includes(value)}
                onChange={() => {
                  const next = toggleArray(frontVideo, value);
                  setFrontVideo(next);
                  pushParams({ frontVideo: next.join(",") });
                }}
              />
            ))}
          </div> : null}
        </section>

        <section className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-sm font-extrabold text-slate-800">Processor</p>
          <p className="mb-2 text-sm font-extrabold text-slate-800">AnTuTu Benchmark Score</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{[["lte500000", "5 Lakh & below"], ["500000", "5 Lakh & above"], ["1000000", "10 Lakh & above"], ["1500000", "15 Lakh & above"], ["2000000", "20 Lakh & above"], ["2500000", "25 Lakh & above"]].map(([id, label]) => <Row key={`antutu-${id}`} label={`${label} (${antutuCounts[id] || 0})`} checked={antutu.includes(id)} disabled={(antutuCounts[id] || 0) === 0 && !antutu.includes(id)} onChange={() => { const next = toggleArray(antutu, id); setAntutu(next); pushParams({ antutu: next.join(",") }); }} />)}</div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">System on Chip</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {SOC_BRANDS.map((brandName) => (
              <div key={`soc-${brandName}`} className="border-b border-slate-100 last:border-b-0">
                <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={soc.includes(brandName)}
                    onChange={() => {
                      const next = toggleArray(soc, brandName);
                      setSoc(next);
                      if (next.includes(brandName) && !expandedSoc.includes(brandName)) {
                        setExpandedSoc([...expandedSoc, brandName]);
                      }
                      pushParams({ soc: next.join(",") });
                    }}
                    className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                  />
                  <span className="font-medium">{brandName} ({socCounts[brandName] || 0})</span>
                  <button
                    type="button"
                    className="ml-auto text-xs font-bold text-slate-500"
                    onClick={() => {
                      setExpandedSoc((prev) =>
                        prev.includes(brandName)
                          ? prev.filter((item) => item !== brandName)
                          : [...prev, brandName]
                      );
                    }}
                  >
                    [{expandedSoc.includes(brandName) ? "-" : "+"}]
                  </button>
                </label>
                {expandedSoc.includes(brandName) && socModels[brandName]?.length ? (
                  <div className="bg-slate-50 px-8 pb-2 pt-1">
                    {socModels[brandName].map((name) => (
                      <label key={`${brandName}-${name}`} className="flex cursor-pointer items-start gap-2 py-1 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={socModel.includes(name)}
                          onChange={() => {
                            const next = toggleArray(socModel, name);
                            setSocModel(next);
                            pushParams({ socModel: next.join(",") });
                          }}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-orange-500"
                        />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-sm font-extrabold text-slate-800">Battery</p>
          <p className="mb-2 text-sm font-extrabold text-slate-800">Battery Capacity</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{["4000", "5000", "6000", "7000"].map((value) => <Row key={`battery-${value}`} label={`${value} mAh & above (${batteryCapacityCounts[value] || 0})`} checked={battery === value} disabled={(batteryCapacityCounts[value] || 0) === 0 && battery !== value} onChange={() => { const next = battery === value ? "" : value; setBattery(next); pushParams({ battery: next }); }} />)}</div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Battery Type</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{["Li-ion", "Li-Po", "Silicon Carbon"].map((value) => <Row key={`battery-type-${value}`} label={`${value} (${batteryTypeCounts[value] || 0})`} checked={batteryType.includes(value)} disabled={(batteryTypeCounts[value] || 0) === 0 && !batteryType.includes(value)} onChange={() => { const next = toggleArray(batteryType, value); setBatteryType(next); pushParams({ batteryType: next.join(",") }); }} />)}</div>
          <p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Other</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`Quick Charging (${quickChargingCount})`} checked={quickCharging} disabled={false} onChange={() => { const next = !quickCharging; setQuickCharging(next); pushParams({ quickCharging: next ? "1" : "" }); }} />
            {["30", "45", "65", "120"].map((value) => <Row key={`cw-${value}`} label={`${value} watts & above (${chargingWattCounts[value] || 0})`} checked={chargingW.includes(value)} disabled={false} onChange={() => { const next = toggleArray(chargingW, value); setChargingW(next); pushParams({ chargingW: next.join(",") }); }} indent />)}
            <Row label={`Wireless Charging (${wirelessChargingCount})`} checked={wirelessCharging} disabled={false} onChange={() => { const next = !wirelessCharging; setWirelessCharging(next); pushParams({ wirelessCharging: next ? "1" : "" }); }} />
          </div>
        </section>

        <section className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-sm font-extrabold text-slate-800">Network Technology</p>
          <p className="mb-2 text-sm font-extrabold text-slate-800">Network Type</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Row label={`5G (${networkTypeCounts["5G"] || 0})`} checked={networkType.includes("5G")} disabled={(networkTypeCounts["5G"] || 0) === 0 && !networkType.includes("5G")} onChange={() => { const next = toggleArray(networkType, "5G"); setNetworkType(next); setNetwork(next.includes("5G") ? "5G" : ""); pushParams({ networkType: next.join(","), network: next.includes("5G") ? "5G" : "" }); }} />
            <Row label={`VoLTE (${networkTypeCounts.VoLTE || 0})`} checked={networkType.includes("VoLTE")} disabled={(networkTypeCounts.VoLTE || 0) === 0 && !networkType.includes("VoLTE")} onChange={() => { const next = toggleArray(networkType, "VoLTE"); setNetworkType(next); pushParams({ networkType: next.join(",") }); }} />
          </div>
        </section>

        <section><p className="mb-2 text-sm font-extrabold text-slate-800">SIM Support</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row label={`eSIM (${simCounts.eSim || 0})`} checked={eSim} disabled={(simCounts.eSim || 0) === 0 && !eSim} onChange={() => { const next = !eSim; setESim(next); pushParams({ eSim: next ? "1" : "" }); }} /><Row label={`Dual SIM (${simCounts.dualSim || 0})`} checked={dualSim} disabled={(simCounts.dualSim || 0) === 0 && !dualSim} onChange={() => { const next = !dualSim; setDualSim(next); pushParams({ dualSim: next ? "1" : "" }); }} /></div></section>
        <section className="border-t border-slate-100 pt-3"><p className="mb-2 text-sm font-extrabold text-slate-800">Connectivity & More</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row label={`NFC (${connectivityCounts.nfc || 0})`} checked={nfc} disabled={(connectivityCounts.nfc || 0) === 0 && !nfc} onChange={() => { const next = !nfc; setNfc(next); pushParams({ nfc: next ? "1" : "" }); }} /><Row label={`Fingerprint scanner (${connectivityCounts.fingerprint || 0})`} checked={fingerprint} disabled={(connectivityCounts.fingerprint || 0) === 0 && !fingerprint} onChange={() => { const next = !fingerprint; setFingerprint(next); pushParams({ fingerprint: next ? "1" : "" }); }} /><Row label={`In-display fingerprint scanner (${connectivityCounts.inDisplayFingerprint || 0})`} checked={inDisplayFingerprint} disabled={(connectivityCounts.inDisplayFingerprint || 0) === 0 && !inDisplayFingerprint} onChange={() => { const next = !inDisplayFingerprint; setInDisplayFingerprint(next); pushParams({ inDisplayFingerprint: next ? "1" : "" }); }} /><Row label={`Face unlock (${connectivityCounts.faceUnlock || 0})`} checked={faceUnlock} disabled={(connectivityCounts.faceUnlock || 0) === 0 && !faceUnlock} onChange={() => { const next = !faceUnlock; setFaceUnlock(next); pushParams({ faceUnlock: next ? "1" : "" }); }} /></div></section>
        <section className="border-t border-slate-100 pt-3"><p className="mb-2 text-sm font-extrabold text-slate-800">Operating System</p><p className="mb-2 text-sm font-extrabold text-slate-800">OS Version</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row label={`Android (${osNameCounts.android || 0})`} checked={osName.includes("android")} disabled={(osNameCounts.android || 0) === 0 && !osName.includes("android")} onChange={() => { const next = toggleArray(osName, "android"); setOsName(next); pushParams({ osName: next.join(",") }); }} /><Row label={`iOS (${osNameCounts.ios || 0})`} checked={osName.includes("ios")} disabled={(osNameCounts.ios || 0) === 0 && !osName.includes("ios")} onChange={() => { const next = toggleArray(osName, "ios"); setOsName(next); pushParams({ osName: next.join(",") }); }} />{Object.entries(osVersionCounts).sort((a, b) => Number(b[0]) - Number(a[0])).map(([version, count]) => <Row key={`os-version-${version}`} label={`OS ${version} (${count})`} checked={osVersion.includes(version)} disabled={count === 0 && !osVersion.includes(version)} onChange={() => { const next = toggleArray(osVersion, version); setOsVersion(next); pushParams({ osVersion: next.join(",") }); }} indent />)}</div><p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">OS Updates</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{["1", "2", "3", "5", "7"].map((value) => <Row key={`os-update-${value}`} label={`${value} Years & above (${osUpdateCounts[value] || 0})`} checked={osUpdate.includes(value)} disabled={(osUpdateCounts[value] || 0) === 0 && !osUpdate.includes(value)} onChange={() => { const next = toggleArray(osUpdate, value); setOsUpdate(next); pushParams({ osUpdate: next.join(",") }); }} />)}</div></section>
        <section className="border-t border-slate-100 pt-3"><p className="mb-2 text-sm font-extrabold text-slate-800">Design</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row label={`Water Resistance (${designCounts.waterResistance || 0})`} checked={waterResistance} disabled={false} onChange={() => { const next = !waterResistance; setWaterResistance(next); pushParams({ waterResistance: next ? "1" : "" }); }} />{["IP69", "IP68", "IP67", "IP66", "IP65", "IP64"].map((value) => <Row key={`ip-${value}`} label={`${value} (${ipCounts[value] || 0})`} checked={ipRating.includes(value)} disabled={false} onChange={() => { const next = toggleArray(ipRating, value); setIpRating(next); pushParams({ ipRating: next.join(",") }); }} indent />)}</div><p className="mb-2 mt-3 text-sm font-extrabold text-slate-800">Back Material</p><div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{[{ id: "metal", label: "Metal" }, { id: "glass", label: "Glass Finish" }, { id: "leather", label: "Leather Finish" }].map((item) => <Row key={`material-${item.id}`} label={`${item.label} (${backMaterialCounts[item.id] || 0})`} checked={backMaterial.includes(item.id)} disabled={false} onChange={() => { const next = toggleArray(backMaterial, item.id); setBackMaterial(next); pushParams({ backMaterial: next.join(",") }); }} />)}</div></section>
        </>
        ) : null}
      </div>
    </aside>
  );
}
