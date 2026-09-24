export type PublishStatus = "draft" | "published";
export type ProductStatus = PublishStatus | "review" | "scheduled" | "recently_deleted";

export type TimestampLike =
  | Date
  | string
  | number
  | {
      seconds?: number;
      nanoseconds?: number;
      toDate?: () => Date;
    }
  | null
  | undefined;

export type ProductSpecs = {
  processor?: string;
  chipsetScore?: number;
  ram?: string;
  ramGb?: number;
  storage?: string;
  battery?: string;
  batteryMah?: number;
  charging?: string;
  display?: string;
  primaryDisplay?: string;
  secondaryDisplay?: string;
  displaySizeInch?: number;
  refreshRateHz?: number;
  rearCamera?: string;
  frontCamera?: string;
  camera?: string;
  os?: string;
  network?: string;
  sim?: string;
};

export type ProductDisplayPanel = {
  role?: string;
  posturesVisible?: string[];
  type?: string;
  size?: string | number;
  sizeInches?: string | number;
  sizeCm?: string | number;
  resolution?: string;
  resolutionWidth?: string | number;
  resolutionHeight?: string | number;
  resolutionLabel?: string;
  refreshRate?: string | number;
  adaptiveRefreshRate?: string | number;
  adaptive?: boolean;
  brightness?: {
    typical?: string | number;
    hdr?: string | number;
    maxRated?: string | number;
    peak?: string | number;
  };
  peakBrightness?: string | number;
  protection?: string;
  hdr?: string[];
  pixelDensity?: string | number;
  screenToBody?: string | number;
  aspectRatio?: string;
  touchSamplingRate?: string | number;
  curved?: boolean;
  curvedDegree?: string | number;
  colorGamut?: string[];
  displayModes?: string[];
  colorProfiles?: Array<{
    mode?: string;
    dciP3?: string | number;
    ntsc?: string | number;
    sRgb?: string | number;
    colorSpace?: string;
    coverage?: string | number;
  }>;
  dimming?: string[];
  alwaysOnDisplay?: string[];
  alwaysOnDisplayHz?: string | number;
  stylus?: {
    name?: string;
    features?: string[];
    palmRejection?: boolean;
  };
  extras?: string[];
  certifications?: string[];
  others?: string[];
};

export type ProductDisplay = ProductDisplayPanel & {
  formFactor?: "bar" | "bar_cover" | "flip_fold" | "book_fold" | "tri_fold" | string;
  primary?: ProductDisplayPanel;
  secondary?: ProductDisplayPanel;
};

export type ProductBattery = {
  capacity?: string | number;
  capacityTypical?: string | number;
  capacityRated?: string | number;
  type?: string;
  replaceable?: boolean;
  lifeCycle?: string | number;
  certifications?: string[];
  chargingCertifications?: string[];
  otherBatteryFeatures?: string[];
  otherChargingFeatures?: string[];
  wired?: {
    supported?: boolean;
    maxPower?: string | number;
    protocol?: string;
    speed?: Record<string, string>;
  };
  chargerInBox?: {
    available?: boolean;
    power?: string | number;
    protocol?: string;
    speed?: Record<string, string>;
  };
  wireless?: {
    supported?: boolean;
    maxPower?: string | number;
    protocol?: string;
    speed?: Record<string, string>;
  };
  reverseWireless?: {
    supported?: boolean;
    maxPower?: string | number;
    protocol?: string;
    speed?: Record<string, string>;
  };
  reverseWired?: {
    supported?: boolean;
    maxPower?: string | number;
    protocol?: string;
    speed?: Record<string, string>;
  };
};

export type ProductAntutu = {
  total?: number;
  cpu?: number;
  gpu?: number;
  memory?: number;
  ux?: number;
};

export type ProductBenchmarks = {
  antutuVersion?: string;
  geekbenchVersion?: string;
  geekbenchSingle?: number;
  geekbenchMulti?: number;
  geekbenchCompute?: number;
  geekbenchOpenCl?: number;
  geekbenchVulkanScore?: number;
  threeDMarkWildLife?: number;
  threeDMarkSteelNomadLight?: number;
  threeDMarkSolarBay?: number;
  threeDMarkWildLifeExtreme?: number;
  pcMark?: number;
};

export type ProductPerformance = {
  chipset?: string;
  additionalChips?: string[];
  additionalChipFeatures?: string[];
  fabrication?: string;
  noOfCores?: string;
  architecture?: string;
  cpu?: string[];
  cpuFrequency?: string;
  gpu?: string;
  gpuFrequency?: string;
  gpuFlops?: string;
  aiEngine?: string;
  otherAiFeatures?: string[];
  coolingSystem?: string;
  otherFeatures?: string[];
  antutu?: ProductAntutu;
  benchmarks?: ProductBenchmarks;
};

export type ProductCameraSensor = {
  name?: string;
  resolution?: string;
  sensorSize?: string;
  sensorType?: string;
  aperture?: string;
  focalLength?: string;
  pixelSize?: string;
  eis?: boolean;
  ois?: boolean;
  autofocus?: boolean | string;
  zoom?: string;
};

export type ProductCameraVideo = {
  rear?: string[];
  front?: string[];
  slowMotion?: string[];
  features?: string[];
};

export type FrontCameraUnit = {
  role?: string;
  purpose?: string;
  cameraType?: string;
  posturesVisible?: string[];
  resolution?: string;
  imageResolution?: string;
  imageResolutionWidth?: string | number;
  imageResolutionHeight?: string | number;
  type?: string;
  autofocus?: boolean | string;
  aperture?: string;
  features?: string[];
  video?: {
    recording?: string[];
    slowMotion?: string[];
    timeLapse?: string[];
    videoZoom?: string[];
    stabilization?: string[];
    movieMode?: string[];
    features?: string[];
  };
  sensor?: {
    name?: string;
    size?: string;
    pixelSize?: string;
    aperture?: string;
    lensType?: string;
    focalLength?: string;
    fov?: string;
    opticalZoom?: string;
    digitalZoom?: string;
    autofocus?: string;
    ois?: boolean;
    eis?: boolean;
  };
};

export type ProductFrontCamera = {
  cameras?: FrontCameraUnit[];
  features?: string[];
  flash?: {
    supported?: boolean;
    name?: string;
  };
  autofocus?: string;
  ois?: boolean;
  eis?: boolean;
  maxCameraResolution?: string;
  imageResolution?: string;
  imageResolutionWidth?: string | number;
  imageResolutionHeight?: string | number;
  zoom?: {
    optical?: string;
    digital?: string;
  };
  video?: {
    recording?: string[];
    features?: string[];
  };
  videoProfiles?: Array<{
    name?: string;
    resolution?: string;
    fps?: string;
    comment?: string;
    camera?: string;
    modes?: string[];
    recording?: string[];
    features?: string[];
  }>;
};

export type RearCameraUnit = {
  role?: string;
  purpose?: string;
  cameraType?: string;
  posturesVisible?: string[];
  resolution?: string;
  imageResolution?: string;
  imageResolutionWidth?: string | number;
  imageResolutionHeight?: string | number;
  type?: string;
  features?: string[];
  video?: {
    recording?: string[];
    slowMotion?: string[];
    timeLapse?: string[];
    videoZoom?: string[];
    stabilization?: string[];
    movieMode?: string[];
    features?: string[];
  };
  sensor?: {
    name?: string;
    aperture?: string;
    size?: string;
    pixelSize?: string;
    focalLength?: string;
    fov?: string;
    lensType?: string;
    opticalZoom?: string;
    digitalZoom?: string;
    zoom?: string;
    autofocus?: string;
    ois?: boolean;
    eis?: boolean;
  };
};

export type ProductRearCamera = {
  cameras?: RearCameraUnit[];
  features?: string[];
  aiFeatures?: string[];
  flash?: {
    supported?: boolean;
    name?: string;
  };
  autofocus?: string;
  ois?: boolean;
  eis?: boolean;
  maxCameraResolution?: string;
  imageResolution?: string;
  imageResolutionWidth?: string | number;
  imageResolutionHeight?: string | number;
  zoom?: {
    optical?: string;
    digital?: string;
  };
  video?: {
    recording?: string[];
    slowMotion?: string[];
    features?: string[];
  };
  videoProfiles?: Array<{
    name?: string;
    resolution?: string;
    fps?: string;
    comment?: string;
    camera?: string;
    modes?: string[];
    recording?: string[];
    features?: string[];
  }>;
};

export type ProductSecurity = {
  fingerprint?: {
    available?: boolean;
    locations?: string[];
    type?: string[];
  };
  faceUnlock?: {
    available?: boolean;
    type?: string;
  };
  irisScanner?: boolean;
};

export type ProductNetwork = {
  supported?: string[];
  otherFeatures?: string[];
  bands?: {
    "5G"?: {
      fdd?: string[];
      tdd?: string[];
      all?: string[];
    };
    "4G"?: {
      fdd?: string[];
      tdd?: string[];
      all?: string[];
    };
  };
  sim?: {
    type?: string;
    config?: string;
    hybrid?: boolean;
    slot1Type?: string;
    slot2Type?: string;
  };
  wifi?: {
    version?: string;
    standards?: string[];
    dualBand?: boolean;
    features?: string[];
  };
  bluetooth?: string;
  bluetoothFeatures?: string[];
  gps?: string[];
  usb?: {
    type?: string;
    version?: string[];
    displayPort?: boolean;
    features?: string[];
  };
  nfc?: boolean;
  infrared?: boolean;
};

export type ProductSoftware = {
  os?: {
    name?: string;
    version?: string;
  };
  ui?: string | null;
  updates?: {
    os?: number;
    security?: number;
  };
};

export type ProductDesign = {
  type?: "normal" | "foldable" | string;
  formFactor?: "bar" | "bar_dual_display" | "flip_fold" | "book_fold" | "tri_fold" | string;
  hingeType?: "none" | "flip" | "book" | "tri" | string;
  foldAxis?: "horizontal" | "vertical" | string;
  openStatesSupported?: string[];
  dimensions?: {
    normal?: {
      height?: number;
      width?: number;
      depth?: number | number[];
    };
    folded?: {
      height?: number;
      width?: number;
      depth?: number | number[];
    };
    unfolded?: {
      height?: number;
      width?: number;
      depth?: number | number[];
    };
  };
  dimensionsByPosture?: Record<string, { height?: number; width?: number; depth?: number | number[]; weight?: number }>;
  normalDimensionMode?: "same" | "variant" | string;
  postureDimensionModes?: Record<string, "same" | "variant" | string>;
  postureNotes?: Record<string, string>;
  normalDimensionVariants?: Array<{
    color?: string;
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
  }>;
  postureDimensionVariants?: Array<{
    posture?: string;
    color?: string;
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
  }>;
  weight?: Array<{
    color?: string;
    value?: number;
  }>;
  colors?: string[];
  designType?: string;
  build?: {
    back?: {
      material?: string;
      protection?: string;
    };
    frame?: string;
  };
  ipRating?: string[];
  audioJack?: {
    available?: boolean;
    type?: string;
  };
  otherFeatures?: string[];
};

export type ProductGeneralVariant = {
  model?: string;
  ram?: string;
  ramType?: string;
  storage?: string;
  storageType?: string;
  virtualRam?: string;
  launchPrice?: number;
  livePrice?: number;
};

export type ProductGeneral = {
  announceDate?: string;
  launchDate?: string;
  modelNumber?: string;
  originCountry?: string[];
  packageContents?: string[];
  variants?: ProductGeneralVariant[];
  multimedia?: string[];
  multimediaDetails?: {
    audioJack35mm?: boolean;
    typeCAudioJack?: boolean;
    lightningAudioJack?: boolean;
    fmRadio?: boolean;
    hiResAudio?: boolean;
    hiResVideo?: boolean;
    dolbyAtmos?: boolean;
    dolbyVision?: boolean;
    dts?: boolean;
    widevineLevels?: string[];
    speakerSetup?: "single" | "dual_stereo" | string;
    spatialSound?: boolean;
    otherFeatures?: string[];
  };
};

export type ProductCamera = {
  rear?: ProductCameraSensor[];
  front?: ProductCameraSensor[];
  flash?: string[];
  features?: string[];
  otherFeatures?: string[];
  video?: ProductCameraVideo;
};

export type MemoryStorage = {
  variantMode?: "same_both" | "same_ram_type" | "same_storage_type" | "different";
  commonRamType?: string | null;
  commonStorageType?: string | null;
  ramChannel?: "single" | "dual" | "quad" | string;
  ramBitWidth?: number;
  totalRamBusWidthBits?: number;
  ram?: string[];
  ramType?: string[];
  internalStorage?: string[];
  storageType?: string[];
  virtualRam?: string[];
  virtualRamMax?: string | null;
  variantGroups?: MemoryVariant[];
  features?: string[];
  expandableStorage?: {
    supported?: boolean;
    max?: string | null;
    slotType?: "none" | "hybrid" | "dedicated" | string;
    types?: string[];
  };
};

export type MemoryVariant = {
  model?: string;
  ram?: string;
  ramType?: string;
  storage?: string;
  storageType?: string;
  virtualRam?: string;
};

export type ProductRatings = {
  performance?: number;
  camera?: number;
  battery?: number;
  display?: number;
  overall?: number;
};

export type ProductImageItem = {
  purpose: string;
  color: string;
  url: string;
};

export type Product = {
  id?: string;
  deviceType?: "smartphone" | "tablet";
  name: string;
  slug: string;
  brand: string;
  price: number;
  priceLive?: {
    amount?: number;
    source?: "amazon" | "flipkart" | "manual" | string;
    updatedAt?: TimestampLike;
  };
  status: ProductStatus;
  scheduledAt?: TimestampLike;
  shortDescription?: string;
  images: string[];
  imageItems?: ProductImageItem[];
  allColorImages?: string[];
  imageVariants?: Array<{ color: string; images: string[] }>;
  imageBackground?: string;
  specs: ProductSpecs;
  performance?: ProductPerformance;
  camera?: ProductCamera;
  frontCamera?: ProductFrontCamera;
  rearCamera?: ProductRearCamera;
  security?: ProductSecurity;
  sensors?: string[];
  network?: ProductNetwork;
  software?: ProductSoftware;
  design?: ProductDesign;
  general?: ProductGeneral;
  memoryStorage?: MemoryStorage;
  variants?: MemoryVariant[];
  battery?: ProductBattery;
  display?: ProductDisplay;
  displays?: ProductDisplayPanel[];
  ratings: ProductRatings;
  affiliateLinks: {
    amazon?: string;
    flipkart?: string;
  };
  compareSuggestions?: string[];
  pros?: string[];
  cons?: string[];
  tags?: string[];
  trending?: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type BlogPost = {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  status: PublishStatus;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    focusKeyword?: string;
    ogImage?: string;
    noIndex?: boolean;
  };
  workflow?: {
    stage?: "idea" | "draft" | "review" | "approved" | "published";
    priority?: "low" | "medium" | "high";
    assignee?: string;
    dueDate?: string;
    notes?: string;
    lastAutoSavedAt?: TimestampLike | string;
  };
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type ProductFilters = {
  processor?: string;
  network?: "5G" | "4G" | "3G" | "2G";
  priceBucket?: string;
  minRearCameraMp?: number;
  minDisplaySizeInch?: number;
  minRefreshRateHz?: number;
  minStorageGb?: number;
  storageBucket?: "lte64";
  ramTypes?: string[];
  storageTypes?: string[];
  externalMemory?: boolean;
  screenSizeBuckets?: string[];
  refreshRateBuckets?: number[];
  resolutionBuckets?: string[];
  antutuBuckets?: string[];
  cpuSpeedBuckets?: number[];
  socBrands?: string[];
  processorModels?: string[];
  displayShapes?: string[];
  displayPanels?: string[];
  displayProtection?: boolean;
  displayProtectionNames?: string[];
  rearCameraCounts?: number[];
  rearCameraMaxResBuckets?: string[];
  rearCameraTypes?: string[];
  rearCameraVideoBuckets?: string[];
  rearCameraFunctions?: string[];
  frontCameraCounts?: number[];
  frontCameraResBuckets?: string[];
  frontCameraFunctions?: string[];
  frontCameraVideoBuckets?: string[];
  batteryTypes?: string[];
  quickCharging?: boolean;
  chargingWattBuckets?: number[];
  wirelessCharging?: boolean;
  networkTypes?: string[];
  eSim?: boolean;
  dualSim?: boolean;
  nfc?: boolean;
  fingerprint?: boolean;
  inDisplayFingerprint?: boolean;
  faceUnlock?: boolean;
  osNames?: string[];
  osVersions?: number[];
  osUpdateBuckets?: number[];
  waterResistance?: boolean;
  ipRatings?: string[];
  backMaterials?: string[];
  deviceType?: "smartphone" | "tablet";
  brand?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRamGb?: number;
  ramBucket?: "lte4";
  minBatteryMah?: number;
  search?: string;
  sort?: "latest" | "popularity" | "price-asc" | "price-desc" | "overall" | "performance" | "camera" | "battery" | "display";
  page?: number;
  pageSize?: number;
};
