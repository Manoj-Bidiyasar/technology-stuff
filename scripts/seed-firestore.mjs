import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

async function loadEnvLocal() {
  const envFile = path.resolve(process.cwd(), ".env.local");
  let raw = "";
  try {
    raw = await fs.readFile(envFile, "utf8");
  } catch {
    return;
  }

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function parseArgs(argv) {
  const args = {
    products: "data/products.dummy.json",
    blogs: "data/blogs.dummy.json",
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--products") args.products = argv[i + 1] || args.products;
    if (token === "--blogs") args.blogs = argv[i + 1] || args.blogs;
    if (token === "--dry-run") args.dryRun = true;
  }

  return args;
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function asCameraSensorList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    name: item?.name || "",
    resolution: item?.resolution || "",
    sensorSize: item?.sensorSize || "",
    sensorType: item?.sensorType || "",
    aperture: item?.aperture || "",
    focalLength: item?.focalLength || "",
    pixelSize: item?.pixelSize || "",
    eis: Boolean(item?.eis),
    ois: Boolean(item?.ois),
    autofocus: typeof item?.autofocus === "boolean" ? item.autofocus : (item?.autofocus || ""),
    zoom: item?.zoom || "",
  }));
}

function asFrontCameraList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    role: item?.role || "",
    resolution: item?.resolution || "",
    type: item?.type || "",
    autofocus: Boolean(item?.autofocus),
    aperture: item?.aperture || "",
    sensor: {
      name: item?.sensor?.name || "",
      size: item?.sensor?.size || "",
      pixelSize: item?.sensor?.pixelSize || "",
      aperture: item?.sensor?.aperture || "",
      fov: item?.sensor?.fov || "",
    },
  }));
}

function asRearCameraList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    role: item?.role || "",
    resolution: item?.resolution || "",
    type: item?.type || "",
    sensor: {
      name: item?.sensor?.name || "",
      aperture: item?.sensor?.aperture || "",
      size: item?.sensor?.size || "",
      pixelSize: item?.sensor?.pixelSize || "",
      focalLength: item?.sensor?.focalLength || "",
      fov: item?.sensor?.fov || "",
      zoom: item?.sensor?.zoom || "",
      autofocus: item?.sensor?.autofocus || "",
      ois: Boolean(item?.sensor?.ois),
      eis: Boolean(item?.sensor?.eis),
    },
  }));
}

function normalizeProduct(raw) {
  const display = raw.display || {};
  const primaryDisplay = display.primary || {};
  const secondaryDisplay = display.secondary || {};
  const displays = Array.isArray(raw.displays) ? raw.displays : [];

  return {
    deviceType: raw.deviceType === "tablet" ? "tablet" : "smartphone",
    name: String(raw.name || "").trim(),
    slug: String(raw.slug || "").trim(),
    brand: String(raw.brand || "").trim(),
    price: asNumber(raw.price, 0),
    priceLive: raw.priceLive
      ? {
          amount: asNumber(raw.priceLive?.amount, 0),
          source: raw.priceLive?.source || "manual",
          updatedAt: raw.priceLive?.updatedAt || "",
        }
      : undefined,
    status: raw.status === "draft" ? "draft" : "published",
    shortDescription: String(raw.shortDescription || "").trim(),
    images: asStringArray(raw.images),
    specs: {
      processor: raw.specs?.processor || "",
      chipsetScore: asNumber(raw.specs?.chipsetScore, 0),
      ram: raw.specs?.ram || "",
      storage: raw.specs?.storage || "",
      battery: raw.specs?.battery || "",
      charging: raw.specs?.charging || "",
      display: raw.specs?.display || "",
      primaryDisplay: raw.specs?.primaryDisplay || "",
      secondaryDisplay: raw.specs?.secondaryDisplay || "",
      camera: raw.specs?.camera || "",
      rearCamera: raw.specs?.rearCamera || "",
      frontCamera: raw.specs?.frontCamera || "",
      os: raw.specs?.os || "",
    },
    performance: {
      chipset: raw.performance?.chipset || "",
      additionalChips: asStringArray(raw.performance?.additionalChips),
      fabrication: raw.performance?.fabrication || "",
      architecture: raw.performance?.architecture || "",
      cpu: asStringArray(raw.performance?.cpu),
      gpu: raw.performance?.gpu || "",
      gpuFrequency: raw.performance?.gpuFrequency || "",
      coolingSystem: raw.performance?.coolingSystem || "",
      otherFeatures: asStringArray(raw.performance?.otherFeatures),
      antutu: {
        total: asNumber(raw.performance?.antutu?.total, 0),
        cpu: asNumber(raw.performance?.antutu?.cpu, 0),
        gpu: asNumber(raw.performance?.antutu?.gpu, 0),
        memory: asNumber(raw.performance?.antutu?.memory, 0),
        ux: asNumber(raw.performance?.antutu?.ux, 0),
      },
    },
    camera: {
      rear: asCameraSensorList(raw.camera?.rear),
      front: asCameraSensorList(raw.camera?.front),
      flash: asStringArray(raw.camera?.flash),
      features: asStringArray(raw.camera?.features),
      otherFeatures: asStringArray(raw.camera?.otherFeatures),
      video: {
        rear: asStringArray(raw.camera?.video?.rear),
        front: asStringArray(raw.camera?.video?.front),
        slowMotion: asStringArray(raw.camera?.video?.slowMotion),
        features: asStringArray(raw.camera?.video?.features),
      },
    },
    frontCamera: {
      cameras: asFrontCameraList(raw.frontCamera?.cameras),
      features: asStringArray(raw.frontCamera?.features),
      video: {
        recording: asStringArray(raw.frontCamera?.video?.recording),
        features: asStringArray(raw.frontCamera?.video?.features),
      },
    },
    rearCamera: {
      cameras: asRearCameraList(raw.rearCamera?.cameras),
      features: asStringArray(raw.rearCamera?.features),
      aiFeatures: asStringArray(raw.rearCamera?.aiFeatures),
      zoom: {
        optical: raw.rearCamera?.zoom?.optical || "",
        digital: raw.rearCamera?.zoom?.digital || "",
      },
      video: {
        recording: asStringArray(raw.rearCamera?.video?.recording),
        slowMotion: asStringArray(raw.rearCamera?.video?.slowMotion),
        features: asStringArray(raw.rearCamera?.video?.features),
      },
    },
    security: {
      fingerprint: {
        available: Boolean(raw.security?.fingerprint?.available),
        locations: asStringArray(raw.security?.fingerprint?.locations),
        type: asStringArray(raw.security?.fingerprint?.type),
      },
      faceUnlock: {
        type: raw.security?.faceUnlock?.type || "",
      },
    },
    sensors: asStringArray(raw.sensors),
    network: {
      supported: asStringArray(raw.network?.supported),
      bands: {
        "5G": {
          fdd: asStringArray(raw.network?.bands?.["5G"]?.fdd),
          tdd: asStringArray(raw.network?.bands?.["5G"]?.tdd),
        },
        "4G": {
          fdd: asStringArray(raw.network?.bands?.["4G"]?.fdd),
          tdd: asStringArray(raw.network?.bands?.["4G"]?.tdd),
        },
      },
      sim: {
        type: raw.network?.sim?.type || "",
        config: raw.network?.sim?.config || "",
        hybrid: Boolean(raw.network?.sim?.hybrid),
      },
      wifi: {
        version: raw.network?.wifi?.version || "",
        standards: asStringArray(raw.network?.wifi?.standards),
        dualBand: Boolean(raw.network?.wifi?.dualBand),
      },
      bluetooth: raw.network?.bluetooth || "",
      gps: asStringArray(raw.network?.gps),
      nfc: typeof raw.network?.nfc === "boolean" ? raw.network.nfc : false,
      infrared: typeof raw.network?.infrared === "boolean" ? raw.network.infrared : false,
    },
    software: {
      os: {
        name: raw.software?.os?.name || "",
        version: raw.software?.os?.version || "",
      },
      ui: raw.software?.ui ?? null,
      updates: {
        os: asNumber(raw.software?.updates?.os, 0),
        security: asNumber(raw.software?.updates?.security, 0),
      },
    },
    design: {
      type: raw.design?.type || "",
      dimensions: {
        normal: {
          height: asNumber(raw.design?.dimensions?.normal?.height, 0),
          width: asNumber(raw.design?.dimensions?.normal?.width, 0),
          depth: Array.isArray(raw.design?.dimensions?.normal?.depth)
            ? raw.design.dimensions.normal.depth.map((item) => asNumber(item, 0)).filter((item) => item > 0)
            : asNumber(raw.design?.dimensions?.normal?.depth, 0),
        },
        folded: {
          height: asNumber(raw.design?.dimensions?.folded?.height, 0),
          width: asNumber(raw.design?.dimensions?.folded?.width, 0),
          depth: Array.isArray(raw.design?.dimensions?.folded?.depth)
            ? raw.design.dimensions.folded.depth.map((item) => asNumber(item, 0)).filter((item) => item > 0)
            : asNumber(raw.design?.dimensions?.folded?.depth, 0),
        },
        unfolded: {
          height: asNumber(raw.design?.dimensions?.unfolded?.height, 0),
          width: asNumber(raw.design?.dimensions?.unfolded?.width, 0),
          depth: Array.isArray(raw.design?.dimensions?.unfolded?.depth)
            ? raw.design.dimensions.unfolded.depth.map((item) => asNumber(item, 0)).filter((item) => item > 0)
            : asNumber(raw.design?.dimensions?.unfolded?.depth, 0),
        },
      },
      weight: Array.isArray(raw.design?.weight)
        ? raw.design.weight.map((item) => ({
            color: item?.color || "",
            value: asNumber(item?.value, 0),
          }))
        : [],
      colors: asStringArray(raw.design?.colors),
      designType: raw.design?.designType || "",
      build: {
        back: {
          material: raw.design?.build?.back?.material || "",
          protection: raw.design?.build?.back?.protection || "",
        },
        frame: raw.design?.build?.frame || "",
      },
      ipRating: asStringArray(raw.design?.ipRating),
      audioJack: {
        available: Boolean(raw.design?.audioJack?.available),
        type: raw.design?.audioJack?.type || "",
      },
      otherFeatures: asStringArray(raw.design?.otherFeatures),
    },
    general: {
      launchDate: raw.general?.launchDate || "",
      modelNumber: raw.general?.modelNumber || "",
      packageContents: asStringArray(raw.general?.packageContents),
      variants: Array.isArray(raw.general?.variants)
        ? raw.general.variants.map((item) => ({
            ram: item?.ram || "",
            storage: item?.storage || "",
            launchPrice: asNumber(item?.launchPrice, 0),
          }))
        : [],
      multimedia: asStringArray(raw.general?.multimedia),
    },
    memoryStorage: {
      ram: asStringArray(raw.memoryStorage?.ram),
      ramType: asStringArray(raw.memoryStorage?.ramType),
      internalStorage: asStringArray(raw.memoryStorage?.internalStorage),
      storageType: asStringArray(raw.memoryStorage?.storageType),
      virtualRam: asStringArray(raw.memoryStorage?.virtualRam),
      features: asStringArray(raw.memoryStorage?.features),
      expandableStorage: {
        supported: Boolean(raw.memoryStorage?.expandableStorage?.supported),
        max: raw.memoryStorage?.expandableStorage?.max ?? null,
        types: asStringArray(raw.memoryStorage?.expandableStorage?.types),
      },
    },
    variants: Array.isArray(raw.variants)
      ? raw.variants.map((item) => ({
          ram: item?.ram || "",
          ramType: item?.ramType || "",
          storage: item?.storage || "",
          storageType: item?.storageType || "",
          virtualRam: item?.virtualRam || "",
        }))
      : [],
    battery: {
      capacity: raw.battery?.capacity || "",
      type: raw.battery?.type || "",
      maxChargingSupport: raw.battery?.maxChargingSupport || "",
      chargingSpeed: raw.battery?.chargingSpeed && typeof raw.battery.chargingSpeed === "object" ? raw.battery.chargingSpeed : {},
      chargerInBox: {
        available: Boolean(raw.battery?.chargerInBox?.available),
        power: raw.battery?.chargerInBox?.power || "",
      },
      wireless: {
        supported: Boolean(raw.battery?.wireless?.supported),
        maxPower: raw.battery?.wireless?.maxPower || "",
        speed: raw.battery?.wireless?.speed && typeof raw.battery.wireless.speed === "object" ? raw.battery.wireless.speed : {},
      },
      features: asStringArray(raw.battery?.features),
    },
    display: {
      type: display.type || "",
      size: display.size || "",
      resolution: display.resolution || "",
      refreshRate: display.refreshRate || "",
      adaptive: Boolean(display.adaptive),
      peakBrightness: display.peakBrightness || "",
      protection: display.protection || "",
      hdr: asStringArray(display.hdr),
      pixelDensity: display.pixelDensity || "",
      screenToBody: display.screenToBody || "",
      aspectRatio: display.aspectRatio || "",
      touchSamplingRate: display.touchSamplingRate || "",
      curved: Boolean(display.curved),
      extras: asStringArray(display.extras),
      certifications: asStringArray(display.certifications),
      others: asStringArray(display.others),
      primary: {
        type: primaryDisplay.type || "",
        size: primaryDisplay.size || "",
        resolution: primaryDisplay.resolution || "",
        refreshRate: primaryDisplay.refreshRate || "",
        adaptive: Boolean(primaryDisplay.adaptive),
        peakBrightness: primaryDisplay.peakBrightness || "",
        protection: primaryDisplay.protection || "",
        hdr: asStringArray(primaryDisplay.hdr),
        pixelDensity: primaryDisplay.pixelDensity || "",
        screenToBody: primaryDisplay.screenToBody || "",
        aspectRatio: primaryDisplay.aspectRatio || "",
        touchSamplingRate: primaryDisplay.touchSamplingRate || "",
        curved: Boolean(primaryDisplay.curved),
        extras: asStringArray(primaryDisplay.extras),
        certifications: asStringArray(primaryDisplay.certifications),
        others: asStringArray(primaryDisplay.others),
      },
      secondary: {
        type: secondaryDisplay.type || "",
        size: secondaryDisplay.size || "",
        resolution: secondaryDisplay.resolution || "",
        refreshRate: secondaryDisplay.refreshRate || "",
        adaptive: Boolean(secondaryDisplay.adaptive),
        peakBrightness: secondaryDisplay.peakBrightness || "",
        protection: secondaryDisplay.protection || "",
        hdr: asStringArray(secondaryDisplay.hdr),
        pixelDensity: secondaryDisplay.pixelDensity || "",
        screenToBody: secondaryDisplay.screenToBody || "",
        aspectRatio: secondaryDisplay.aspectRatio || "",
        touchSamplingRate: secondaryDisplay.touchSamplingRate || "",
        curved: Boolean(secondaryDisplay.curved),
        extras: asStringArray(secondaryDisplay.extras),
        certifications: asStringArray(secondaryDisplay.certifications),
        others: asStringArray(secondaryDisplay.others),
      },
    },
    displays: displays.map((item) => ({
      type: item?.type || "",
      size: item?.size || "",
      resolution: item?.resolution || "",
      refreshRate: item?.refreshRate || "",
      adaptive: Boolean(item?.adaptive),
      peakBrightness: item?.peakBrightness || "",
      protection: item?.protection || "",
      hdr: asStringArray(item?.hdr),
      pixelDensity: item?.pixelDensity || "",
      screenToBody: item?.screenToBody || "",
      aspectRatio: item?.aspectRatio || "",
      touchSamplingRate: item?.touchSamplingRate || "",
      curved: Boolean(item?.curved),
      certifications: asStringArray(item?.certifications),
      others: asStringArray(item?.others),
      extras: asStringArray(item?.extras),
    })),
    ratings: {
      performance: asNumber(raw.ratings?.performance, 0),
      camera: asNumber(raw.ratings?.camera, 0),
      battery: asNumber(raw.ratings?.battery, 0),
      display: asNumber(raw.ratings?.display, 0),
      overall: asNumber(raw.ratings?.overall, 0),
    },
    affiliateLinks: {
      amazon: raw.affiliateLinks?.amazon || "",
      flipkart: raw.affiliateLinks?.flipkart || "",
    },
    pros: asStringArray(raw.pros),
    cons: asStringArray(raw.cons),
    tags: asStringArray(raw.tags),
    trending: Boolean(raw.trending),
  };
}

function normalizeBlog(raw) {
  return {
    title: String(raw.title || "").trim(),
    slug: String(raw.slug || "").trim(),
    excerpt: String(raw.excerpt || "").trim(),
    content: String(raw.content || "").trim(),
    featuredImage: String(raw.featuredImage || "").trim(),
    tags: asStringArray(raw.tags),
    categories: asStringArray(raw.categories),
    status: raw.status === "draft" ? "draft" : "published",
  };
}

async function ensureFirebase() {
  await loadEnvLocal();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS env variable.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  return admin.firestore();
}

async function readJson(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolute, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must be a JSON array.`);
  }
  return parsed;
}

async function upsertBySlug({ db, collectionName, slug, payload, dryRun }) {
  const collection = db.collection(collectionName);
  const existing = await collection.where("slug", "==", slug).limit(1).get();

  if (existing.empty) {
    if (!dryRun) {
      await collection.add({
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return "created";
  }

  if (!dryRun) {
    await existing.docs[0].ref.set(
      {
        ...payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return "updated";
}

async function seedProducts(db, filePath, dryRun) {
  const rows = await readJson(filePath);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const payload = normalizeProduct(row);
    if (!payload.name || !payload.slug || !payload.brand) continue;
    const action = await upsertBySlug({ db, collectionName: "products", slug: payload.slug, payload, dryRun });
    if (action === "created") created += 1;
    if (action === "updated") updated += 1;
  }

  return { total: rows.length, created, updated };
}

async function seedBlogs(db, filePath, dryRun) {
  const rows = await readJson(filePath);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const payload = normalizeBlog(row);
    if (!payload.title || !payload.slug) continue;
    const action = await upsertBySlug({ db, collectionName: "blogs", slug: payload.slug, payload, dryRun });
    if (action === "created") created += 1;
    if (action === "updated") updated += 1;
  }

  return { total: rows.length, created, updated };
}

async function main() {
  const args = parseArgs(process.argv);
  const db = await ensureFirebase();

  const [productResult, blogResult] = await Promise.all([
    seedProducts(db, args.products, args.dryRun),
    seedBlogs(db, args.blogs, args.dryRun),
  ]);

  const mode = args.dryRun ? "DRY RUN" : "LIVE";
  console.log(`[${mode}] products: total=${productResult.total} created=${productResult.created} updated=${productResult.updated}`);
  console.log(`[${mode}] blogs: total=${blogResult.total} created=${blogResult.created} updated=${blogResult.updated}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
