export type PublishStatus = "draft" | "published";

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
  type?: string;
  size?: string | number;
  resolution?: string;
  refreshRate?: string | number;
  adaptive?: boolean;
  peakBrightness?: string | number;
  protection?: string;
  hdr?: string[];
  pixelDensity?: string | number;
  screenToBody?: string | number;
  aspectRatio?: string;
  touchSamplingRate?: string | number;
  curved?: boolean;
  extras?: string[];
  certifications?: string[];
  others?: string[];
};

export type ProductDisplay = ProductDisplayPanel & {
  primary?: ProductDisplayPanel;
  secondary?: ProductDisplayPanel;
};

export type ProductBattery = {
  capacity?: string | number;
  type?: string;
  maxChargingSupport?: string | number;
  chargingSpeed?: Record<string, string>;
  chargerInBox?: {
    available?: boolean;
    power?: string | number;
  };
  wireless?: {
    supported?: boolean;
    maxPower?: string | number;
    speed?: Record<string, string>;
  };
  features?: string[];
};

export type ProductAntutu = {
  total?: number;
  cpu?: number;
  gpu?: number;
  memory?: number;
  ux?: number;
};

export type ProductPerformance = {
  chipset?: string;
  additionalChips?: string[];
  fabrication?: string;
  architecture?: string;
  cpu?: string[];
  gpu?: string;
  gpuFrequency?: string;
  coolingSystem?: string;
  otherFeatures?: string[];
  antutu?: ProductAntutu;
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
  resolution?: string;
  type?: string;
  autofocus?: boolean;
  aperture?: string;
  sensor?: {
    name?: string;
    size?: string;
    pixelSize?: string;
    aperture?: string;
    fov?: string;
  };
};

export type ProductFrontCamera = {
  cameras?: FrontCameraUnit[];
  features?: string[];
  video?: {
    recording?: string[];
    features?: string[];
  };
};

export type RearCameraUnit = {
  role?: string;
  resolution?: string;
  type?: string;
  sensor?: {
    name?: string;
    aperture?: string;
    size?: string;
    pixelSize?: string;
    focalLength?: string;
    fov?: string;
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
  zoom?: {
    optical?: string;
    digital?: string;
  };
  video?: {
    recording?: string[];
    slowMotion?: string[];
    features?: string[];
  };
};

export type ProductSecurity = {
  fingerprint?: {
    available?: boolean;
    locations?: string[];
    type?: string[];
  };
  faceUnlock?: {
    type?: string;
  };
};

export type ProductNetwork = {
  supported?: string[];
  bands?: {
    "5G"?: {
      fdd?: string[];
      tdd?: string[];
    };
    "4G"?: {
      fdd?: string[];
      tdd?: string[];
    };
  };
  sim?: {
    type?: string;
    config?: string;
    hybrid?: boolean;
  };
  wifi?: {
    version?: string;
    standards?: string[];
    dualBand?: boolean;
  };
  bluetooth?: string;
  gps?: string[];
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
  ram?: string;
  storage?: string;
  launchPrice?: number;
};

export type ProductGeneral = {
  launchDate?: string;
  modelNumber?: string;
  packageContents?: string[];
  variants?: ProductGeneralVariant[];
  multimedia?: string[];
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
  ram?: string[];
  ramType?: string[];
  internalStorage?: string[];
  storageType?: string[];
  virtualRam?: string[];
  features?: string[];
  expandableStorage?: {
    supported?: boolean;
    max?: string | null;
    types?: string[];
  };
};

export type MemoryVariant = {
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
  status: PublishStatus;
  shortDescription?: string;
  images: string[];
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
