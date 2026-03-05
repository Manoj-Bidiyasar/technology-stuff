export type ProcessorDetail = {
  announced?: string;
  className?: string;
  model?: string;
  cores?: string;
  architecture?: string;
  process?: string;
  tdpW?: number;
  memoryType?: string;
  memoryFreqMhz?: number;
  maxMemoryGb?: number;
  storageType?: string;
  bandwidthGbps?: number;
  modem?: string;
  downloadMbps?: number;
  uploadMbps?: number;
  wifi?: string;
  bluetooth?: string;
  navigation?: string[];
  cameraSupport?: string;
  videoCapture?: string;
  videoPlayback?: string;
  benchmarks?: {
    antutu?: number;
    geekbenchSingle?: number;
    geekbenchMulti?: number;
    threeDMark?: number;
  };
  sourceUrl?: string;
};

const DETAILS: Record<string, ProcessorDetail> = {
  "mediatek-dimensity-9500s": {
    announced: "September 25, 2025",
    className: "Flagship",
    model: "MT6993",
    cores: "8 (1x Cortex-X930 @ 3.5GHz, 3x Cortex-X930 @ 3.0GHz, 4x Cortex-A730 @ 2.1GHz)",
    architecture: "ARMv9.2-A, 64-bit",
    process: "TSMC 3nm (N3P)",
    tdpW: 11,
    memoryType: "LPDDR6",
    memoryFreqMhz: 10667,
    maxMemoryGb: 32,
    storageType: "UFS 4.1",
    bandwidthGbps: 68.3,
    modem: "5G / 4G / 3G",
    downloadMbps: 10000,
    uploadMbps: 3500,
    wifi: "Wi-Fi 7",
    bluetooth: "6.0",
    navigation: ["GPS", "GLONASS", "BeiDou", "Galileo", "QZSS", "NavIC"],
    cameraSupport: "Up to 320MP, or 60MP + 50MP, or 30MP + 30MP + 30MP",
    videoCapture: "Up to 8K @ 30fps",
    videoPlayback: "Up to 8K decode",
    benchmarks: {
      antutu: 3397028,
      geekbenchSingle: 3197,
      geekbenchMulti: 12107,
      threeDMark: 8363,
    },
    sourceUrl: "https://nanoreview.net/en/soc/mediatek-dimensity-9500s",
  },
};

export function getProcessorDetailBySlug(slug: string): ProcessorDetail | undefined {
  return DETAILS[slug];
}

