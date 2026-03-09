import { unstable_cache } from "next/cache";
import { listPublishedCustomProcessorDetailsBySlug } from "@/lib/firestore/processors";

export type ProcessorDetail = {
  announced?: string;
  manufacturer?: string;
  className?: string;
  model?: string;
  coreCount?: number;
  coreConfiguration?: string;
  cores?: string;
  architecture?: string;
  instructionSet?: string;
  architectureBits?: string;
  cpuFeatures?: string[];
  l2Cache?: string;
  l3Cache?: string;
  process?: string;
  transistorCount?: string;
  tdpW?: number;
  memoryType?: string;
  memoryTypes?: string[];
  memoryFreqMhz?: number;
  memoryFreqByType?: Record<string, number | string>;
  maxMemoryGb?: number;
  memoryBusWidthBits?: number;
  memoryChannels?: string;
  storageType?: string;
  storageTypes?: string[];
  bandwidthGbps?: number;
  gpuName?: string;
  gpuArchitecture?: string;
  gpuFrequencyMhz?: number;
  pipelines?: number;
  shadingUnits?: number;
  vulkanVersion?: string;
  openclVersion?: string;
  directxVersion?: string;
  gpuFeatures?: string[];
  aiEngine?: string;
  aiPerformanceTops?: number;
  aiPrecision?: string;
  aiFeatures?: string[];
  modem?: string;
  networkSupport?: string[];
  dual5g?: boolean;
  downloadMbps?: number;
  uploadMbps?: number;
  wifi?: string;
  bluetooth?: string;
  bluetoothFeatures?: string[];
  quickCharging?: string;
  chargingSpeed?: string;
  navigation?: string[];
  cameraIsp?: string;
  maxCameraSupport?: string;
  cameraSupportModes?: string[];
  cameraFeatures?: string[];
  maxVideoCapture?: string;
  videoRecordingModes?: string[];
  videoFeatures?: string[];
  cameraSupport?: string;
  videoCapture?: string;
  videoPlayback?: string;
  maxDisplayResolution?: string;
  maxRefreshRateHz?: number;
  displayModes?: string[];
  outputDisplay?: string;
  displayFeatures?: string[];
  audioCodecs?: string[];
  multimediaFeatures?: string[];
  benchmarks?: {
    antutuVersion?: string;
    antutu?: number;
    antutuCpu?: number;
    antutuGpu?: number;
    antutuMemory?: number;
    antutuUx?: number;
    geekbenchVersion?: string;
    geekbenchSingle?: number;
    geekbenchMulti?: number;
    threeDMarkName?: string;
    threeDMark?: number;
  };
  sourceUrl?: string;
};

const DETAILS: Record<string, ProcessorDetail> = {
  "mediatek-helio-g99-ultimate": {
    announced: "October 2023",
    manufacturer: "TSMC",
    className: "Midrange",
    model: "MT6789",
    coreCount: 8,
    coreConfiguration: "2x Cortex-A76 @ 2.2GHz, 6x Cortex-A55 @ 2.0GHz",
    architecture: "ARMv8.2-A, 64-bit",
    cpuFeatures: ["Power-efficient design", "Balanced performance cluster"],
    process: "TSMC 6nm",
    transistorCount: "N/A",
    tdpW: 6,
    memoryTypes: ["LPDDR4X"],
    memoryFreqByType: {
      LPDDR4X: 4266,
    },
    maxMemoryGb: 16,
    memoryBusWidthBits: 32,
    memoryChannels: "Dual-channel",
    storageTypes: ["UFS 2.2", "eMMC 5.1"],
    bandwidthGbps: 34.1,
    gpuName: "Mali-G57 MC2",
    gpuArchitecture: "Valhall",
    gpuFrequencyMhz: 1000,
    pipelines: 2,
    vulkanVersion: "1.1",
    openclVersion: "2.0",
    directxVersion: "12",
    gpuFeatures: ["MediaTek HyperEngine", "Gaming network optimization"],
    aiEngine: "MediaTek APU",
    aiPerformanceTops: 2,
    aiPrecision: "INT8",
    aiFeatures: ["AI camera enhancements", "Voice assistant acceleration"],
    networkSupport: ["4G", "3G", "2G"],
    downloadMbps: 600,
    uploadMbps: 150,
    wifi: "5",
    bluetooth: "5.2",
    bluetoothFeatures: ["LE"],
    quickCharging: "Supported, Pump Express",
    chargingSpeed: "33W, 50% in 36 minute",
    navigation: ["GPS", "GLONASS", "Galileo", "BeiDou"],
    cameraIsp: "MediaTek ISP",
    cameraSupportModes: ["108MP", "16MP + 16MP"],
    cameraFeatures: ["HDR", "Night mode support"],
    videoRecordingModes: ["2K@30fps", "1080p@60fps"],
    videoFeatures: ["EIS"],
    videoPlayback: "Up to 2K decode",
    displayModes: ["FHD+@120Hz", "HD+@120Hz"],
    outputDisplay: "-",
    displayFeatures: ["Adaptive display sync"],
    multimediaFeatures: ["HEVC decode"],
    benchmarks: {
      antutuVersion: "10",
      antutu: 470000,
      antutuCpu: 132000,
      antutuGpu: 141500,
      antutuMemory: 89000,
      antutuUx: 107500,
      geekbenchVersion: "6",
      geekbenchSingle: 730,
      geekbenchMulti: 2050,
      threeDMarkName: "Wild Life",
      threeDMark: 1250,
    },
  },
  "mediatek-helio-g100": {
    announced: "March 2026",
    manufacturer: "TSMC",
    className: "Budget",
    model: "MT6789X",
    coreCount: 8,
    coreConfiguration: "2x Cortex-A76 @ 2.4GHz, 6x Cortex-A55 @ 2.0GHz",
    architecture: "ARMv8.2-A, 64-bit",
    cpuFeatures: ["Efficient gaming profile", "Balanced sustained performance"],
    process: "TSMC 6nm",
    tdpW: 6,
    memoryTypes: ["LPDDR4X"],
    memoryFreqByType: {
      LPDDR4X: 4266,
    },
    maxMemoryGb: 16,
    memoryChannels: "Dual-channel",
    storageTypes: ["UFS 2.2", "eMMC 5.1"],
    gpuName: "Mali-G57 MC2",
    gpuArchitecture: "Valhall",
    gpuFrequencyMhz: 1050,
    pipelines: 2,
    vulkanVersion: "1.1",
    openclVersion: "2.0",
    directxVersion: "12",
    aiEngine: "MediaTek APU",
    networkSupport: ["4G", "3G", "2G"],
    downloadMbps: 650,
    uploadMbps: 150,
    wifi: "5",
    bluetooth: "5.2",
    cameraSupport: "Up to 108MP",
    videoCapture: "Up to 2K @ 30fps",
    displayModes: ["FHD+@120Hz", "HD+@120Hz"],
    benchmarks: {
      antutuVersion: "10",
      antutu: 520000,
      antutuCpu: 146000,
      antutuGpu: 158000,
      antutuMemory: 94000,
      antutuUx: 122000,
      geekbenchVersion: "6",
      geekbenchSingle: 780,
      geekbenchMulti: 2260,
      threeDMarkName: "Wild Life",
      threeDMark: 1390,
    },
  },
  "mediatek-dimensity-9500s": {
    announced: "September 25, 2025",
    manufacturer: "TSMC",
    className: "Flagship",
    model: "MT6993",
    coreCount: 8,
    coreConfiguration: "1x Cortex-X930 @ 3.5GHz, 3x Cortex-X930 @ 3.0GHz, 4x Cortex-A730 @ 2.1GHz",
    cores: "8 (1x Cortex-X930 @ 3.5GHz, 3x Cortex-X930 @ 3.0GHz, 4x Cortex-A730 @ 2.1GHz)",
    architecture: "ARMv9.2-A, 64-bit",
    instructionSet: "ARMv9.2-A",
    cpuFeatures: ["ARMv9.2-A ISA", "Large core cluster design", "Advanced branch prediction"],
    process: "TSMC 3nm (N3P)",
    transistorCount: "17.5 billion",
    tdpW: 11,
    memoryType: "LPDDR6",
    memoryTypes: ["LPDDR6", "LPDDR5X"],
    memoryFreqMhz: 10667,
    memoryFreqByType: {
      LPDDR6: 10667,
      LPDDR5X: 8533,
    },
    maxMemoryGb: 32,
    memoryBusWidthBits: 64,
    memoryChannels: "Quad-channel",
    storageType: "UFS 4.1",
    storageTypes: ["UFS 4.1", "UFS 4.0", "UFS 3.1"],
    bandwidthGbps: 68.3,
    gpuName: "Mali-G925 Immortalis MP12",
    gpuArchitecture: "Valhall 5th gen",
    gpuFrequencyMhz: 1612,
    pipelines: 12,
    shadingUnits: 128,
    vulkanVersion: "1.3",
    openclVersion: "2.0",
    directxVersion: "12",
    gpuFeatures: ["Hardware ray tracing", "Variable rate shading", "AI super resolution support"],
    aiEngine: "MediaTek NPU 890",
    aiPerformanceTops: 48,
    aiPrecision: "INT8 / FP16",
    aiFeatures: ["On-device GenAI", "LLM acceleration", "AI ISP assist"],
    modem: "5G / 4G / 3G",
    networkSupport: ["5G", "4G", "3G"],
    dual5g: true,
    downloadMbps: 10000,
    uploadMbps: 3500,
    wifi: "Wi-Fi 7",
    bluetooth: "6.0",
    bluetoothFeatures: ["LE Audio"],
    quickCharging: "Supported, Quick Charge 5.0",
    chargingSpeed: "50% in 30 minute, 70% in 40 minute",
    navigation: ["GPS", "GLONASS", "BeiDou", "Galileo", "QZSS", "NavIC"],
    cameraIsp: "Imagiq 1090 ISP",
    maxCameraSupport: "Up to 320MP",
    cameraSupportModes: ["Up to 320MP", "64MP + 36MP", "3x32MP"],
    cameraFeatures: ["HDR", "Multi-frame processing", "AI scene detection"],
    maxVideoCapture: "Up to 8K @ 30fps",
    videoRecordingModes: ["8K@30fps", "4K@120fps", "1080p@480fps"],
    videoFeatures: ["4K HDR", "Slow motion", "Stabilization assist"],
    cameraSupport: "Up to 320MP, or 60MP + 50MP, or 30MP + 30MP + 30MP",
    videoCapture: "Up to 8K @ 30fps",
    videoPlayback: "Up to 8K decode",
    maxDisplayResolution: "WQHD+",
    maxRefreshRateHz: 180,
    displayModes: ["QHD+@60Hz", "FHD+@120Hz", "HD+@180Hz"],
    outputDisplay: "Up to 4K @ 60Hz (external)",
    displayFeatures: ["HDR10+", "Adaptive refresh support"],
    audioCodecs: ["AAC", "aptX", "LDAC", "LHDC"],
    multimediaFeatures: ["AV1 decode", "HEVC encode", "Ultra HDR support"],
    benchmarks: {
      antutuVersion: "10",
      antutu: 3397028,
      antutuCpu: 952789,
      antutuGpu: 1130421,
      antutuMemory: 502375,
      antutuUx: 712860,
      geekbenchVersion: "6",
      geekbenchSingle: 3197,
      geekbenchMulti: 12107,
      threeDMarkName: "Wild Life",
      threeDMark: 8363,
    },
    sourceUrl: "https://nanoreview.net/en/soc/mediatek-dimensity-9500s",
  },
  "snapdragon-7-gen-4": {
    announced: "March 2026",
    manufacturer: "TSMC",
    className: "Upper Midrange",
    model: "SM7750-AB",
    coreCount: 8,
    coreConfiguration: "1x Cortex-A720 @ 2.8GHz, 3x Cortex-A720 @ 2.4GHz, 4x Cortex-A520 @ 1.9GHz",
    architecture: "ARMv9-A, 64-bit",
    process: "TSMC 4nm",
    memoryTypes: ["LPDDR5X", "LPDDR5"],
    memoryFreqByType: {
      LPDDR5X: 7500,
      LPDDR5: 6400,
    },
    storageTypes: ["UFS 4.0", "UFS 3.1"],
    gpuName: "Adreno 722",
    modem: "Snapdragon X63 5G Modem-RF",
    networkSupport: ["5G", "4G", "3G", "2G"],
    wifi: "Wi-Fi 7",
    bluetooth: "5.4",
    cameraSupport: "Up to 200MP",
    benchmarks: {
      antutuVersion: "10",
      antutu: 1180000,
      antutuCpu: 332000,
      antutuGpu: 388000,
      antutuMemory: 215000,
      antutuUx: 245000,
      geekbenchVersion: "6",
      geekbenchSingle: 1420,
      geekbenchMulti: 4320,
      threeDMarkName: "Wild Life",
      threeDMark: 4250,
    },
  },
  "snapdragon-8-elite-gen-5": {
    announced: "January 2027",
    manufacturer: "TSMC",
    className: "Ultra Flagship",
    model: "SM8950-AB",
    coreCount: 8,
    coreConfiguration: "2x Prime @ 4.75GHz, 5x Performance @ 3.4GHz, 1x Efficiency @ 2.4GHz",
    architecture: "ARMv9.3-A, 64-bit",
    process: "2nm",
    memoryTypes: ["LPDDR6", "LPDDR5X"],
    memoryFreqByType: {
      LPDDR6: 10667,
      LPDDR5X: 8533,
    },
    storageTypes: ["UFS 5.0", "UFS 4.1"],
    gpuName: "Adreno 850",
    gpuArchitecture: "Adreno",
    modem: "Snapdragon X85 5G",
    networkSupport: ["5G", "4G", "3G", "2G"],
    wifi: "Wi-Fi 7",
    bluetooth: "6.0",
    cameraSupport: "Up to 320MP",
    videoCapture: "Up to 8K @ 60fps",
    benchmarks: {
      antutuVersion: "10",
      antutu: 3720000,
      antutuCpu: 1082000,
      antutuGpu: 1298000,
      antutuMemory: 561000,
      antutuUx: 779000,
      geekbenchVersion: "6",
      geekbenchSingle: 3610,
      geekbenchMulti: 13890,
      threeDMarkName: "Wild Life Extreme",
      threeDMark: 9920,
    },
  },
  "snapdragon-780g": {
    announced: "March 2021",
    manufacturer: "Samsung",
    className: "Midrange",
    model: "SM7350-AB",
    coreCount: 8,
    coreConfiguration: "1x Cortex-A78 @ 2.4GHz, 3x Cortex-A78 @ 2.2GHz, 4x Cortex-A55 @ 1.9GHz",
    architecture: "ARMv8.4-A, 64-bit",
    process: "5nm",
    memoryTypes: ["LPDDR5", "LPDDR4X"],
    memoryFreqByType: {
      LPDDR5: 6400,
      LPDDR4X: 4266,
    },
    storageTypes: ["UFS 3.1", "UFS 2.2"],
    gpuName: "Adreno 642",
    modem: "Snapdragon X53 5G",
    networkSupport: ["5G", "4G", "3G", "2G"],
    wifi: "Wi-Fi 6E",
    bluetooth: "5.2",
    cameraSupport: "Up to 192MP",
    benchmarks: {
      antutuVersion: "10",
      antutu: 640000,
      antutuCpu: 188000,
      antutuGpu: 205000,
      antutuMemory: 116000,
      antutuUx: 131000,
      geekbenchVersion: "6",
      geekbenchSingle: 980,
      geekbenchMulti: 2980,
      threeDMarkName: "Wild Life",
      threeDMark: 2150,
    },
  },
  "snapdragon-732g": {
    announced: "August 2020",
    manufacturer: "Samsung",
    className: "Budget",
    model: "SM7150-AC",
    coreCount: 8,
    coreConfiguration: "2x Kryo 470 Gold @ 2.3GHz, 6x Kryo 470 Silver @ 1.8GHz",
    architecture: "ARMv8-A, 64-bit",
    process: "8nm",
    memoryTypes: ["LPDDR4X"],
    memoryFreqByType: {
      LPDDR4X: 3733,
    },
    storageTypes: ["UFS 2.1", "UFS 2.2"],
    gpuName: "Adreno 618",
    modem: "Snapdragon X15 LTE",
    networkSupport: ["4G", "3G", "2G"],
    wifi: "Wi-Fi 5",
    bluetooth: "5.1",
    cameraSupport: "Up to 192MP",
    benchmarks: {
      antutuVersion: "10",
      antutu: 430000,
      antutuCpu: 128000,
      antutuGpu: 118000,
      antutuMemory: 80000,
      antutuUx: 104000,
      geekbenchVersion: "6",
      geekbenchSingle: 540,
      geekbenchMulti: 1720,
      threeDMarkName: "Sling Shot Extreme",
      threeDMark: 1210,
    },
  },
  "exynos-2500": {
    announced: "January 2026",
    manufacturer: "Samsung Foundry",
    className: "Flagship",
    model: "S5E9955",
    coreCount: 10,
    coreConfiguration: "1x Cortex-X5 @ 3.5GHz, 3x Cortex-A730 @ 3.0GHz, 2x Cortex-A730 @ 2.6GHz, 4x Cortex-A530 @ 2.0GHz",
    architecture: "ARMv9.2-A, 64-bit",
    process: "Samsung 3nm GAA",
    memoryTypes: ["LPDDR5X", "LPDDR5"],
    memoryFreqByType: {
      LPDDR5X: 8533,
      LPDDR5: 6400,
    },
    storageTypes: ["UFS 4.0", "UFS 3.1"],
    gpuName: "Xclipse 950",
    gpuArchitecture: "RDNA-based",
    modem: "Exynos Modem 5G",
    networkSupport: ["5G", "4G", "3G", "2G"],
    wifi: "Wi-Fi 7",
    bluetooth: "5.4",
    cameraSupport: "Up to 320MP",
    videoCapture: "Up to 8K @ 30fps",
    benchmarks: {
      antutuVersion: "10",
      antutu: 2260000,
      antutuCpu: 676000,
      antutuGpu: 748000,
      antutuMemory: 338000,
      antutuUx: 498000,
      geekbenchVersion: "6",
      geekbenchSingle: 2280,
      geekbenchMulti: 7550,
      threeDMarkName: "Wild Life Extreme",
      threeDMark: 5300,
    },
  },
  "unisoc-t760": {
    announced: "February 2026",
    manufacturer: "TSMC",
    className: "Midrange",
    model: "T760",
    coreCount: 8,
    coreConfiguration: "4x Cortex-A76 @ 2.4GHz, 4x Cortex-A55 @ 2.0GHz",
    architecture: "ARMv8.2-A, 64-bit",
    process: "6nm",
    memoryTypes: ["LPDDR4X", "LPDDR5"],
    memoryFreqByType: {
      LPDDR4X: 4266,
      LPDDR5: 5500,
    },
    storageTypes: ["UFS 3.1", "UFS 2.2"],
    gpuName: "Mali-G57 MC4",
    modem: "Integrated 5G",
    networkSupport: ["5G", "4G", "3G", "2G"],
    wifi: "Wi-Fi 5",
    bluetooth: "5.2",
    cameraSupport: "Up to 108MP",
    videoCapture: "Up to 4K @ 30fps",
    benchmarks: {
      antutuVersion: "10",
      antutu: 560000,
      antutuCpu: 168000,
      antutuGpu: 155000,
      antutuMemory: 98000,
      antutuUx: 139000,
      geekbenchVersion: "6",
      geekbenchSingle: 860,
      geekbenchMulti: 2460,
      threeDMarkName: "Wild Life",
      threeDMark: 1580,
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(base?: T, override?: T): T {
  const left = isPlainObject(base) ? base : ({} as T);
  const right = isPlainObject(override) ? override : ({} as T);
  const out: Record<string, unknown> = { ...left };

  Object.entries(right).forEach(([key, value]) => {
    if (value === undefined) return;
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = deepMerge(existing, value);
      return;
    }
    out[key] = value;
  });
  return out as T;
}

const getCachedCustomDetails = unstable_cache(
  async () => listPublishedCustomProcessorDetailsBySlug(),
  ["processor-custom-detail-map-v1"],
  { revalidate: 1800 }
);

export async function getProcessorDetailBySlug(slug: string): Promise<ProcessorDetail | undefined> {
  const key = String(slug || "").trim().toLowerCase();
  const local = DETAILS[key];
  let remote: ProcessorDetail | undefined;
  try {
    const map = await getCachedCustomDetails();
    remote = map[key];
  } catch {
    remote = undefined;
  }
  if (!local && !remote) return undefined;
  return deepMerge<ProcessorDetail>((local || {}) as ProcessorDetail, (remote || {}) as ProcessorDetail);
}
