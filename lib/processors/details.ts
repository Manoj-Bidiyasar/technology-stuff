import { unstable_cache } from "next/cache";
import { listPublishedCustomProcessorDetailsBySlug } from "@/lib/firestore/processors";

export type ProcessorDetail = {
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    summary?: string;
    focusKeyword?: string;
    tags?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };
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
  maxCameraSupport?: number | string;
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

const getCachedCustomDetails = unstable_cache(
  async () => listPublishedCustomProcessorDetailsBySlug(),
  ["processor-custom-detail-map-v2"],
  {
    revalidate: 1800,
    tags: ["processor-custom-details"],
  }
);

export async function getProcessorDetailBySlug(slug: string): Promise<ProcessorDetail | undefined> {
  const key = String(slug || "").trim().toLowerCase();
  let remote: ProcessorDetail | undefined;
  try {
    const map = await getCachedCustomDetails();
    remote = map[key];
  } catch {
    remote = undefined;
  }
  return remote;
}

