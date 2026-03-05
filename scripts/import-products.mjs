import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(argv) {
  const args = { file: "", url: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") args.file = argv[i + 1] || "";
    if (token === "--url") args.url = argv[i + 1] || "";
  }
  return args;
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeProduct(raw) {
  const name = raw.name || raw.model || raw.title || "Unknown Device";
  const brand = raw.brand || raw.oem || "Unknown";
  const slug = raw.slug || slugify(name);
  const images = Array.isArray(raw.images)
    ? raw.images.filter(Boolean)
    : raw.image
      ? [raw.image]
      : raw.thumbnail
        ? [raw.thumbnail]
        : [];

  return {
    deviceType: raw.deviceType === "tablet" ? "tablet" : "smartphone",
    name,
    slug,
    brand,
    price: asNumber(raw.price, 0),
    priceLive: raw.priceLive
      ? {
          amount: asNumber(raw.priceLive?.amount, 0),
          source: raw.priceLive?.source || "manual",
          updatedAt: raw.priceLive?.updatedAt || "",
        }
      : undefined,
    status: raw.status === "draft" ? "draft" : "published",
    shortDescription: raw.shortDescription || raw.description || "",
    images,
    specs: {
      processor: raw.specs?.processor || raw.processor || "",
      ram: raw.specs?.ram || raw.ram || "",
      storage: raw.specs?.storage || raw.storage || "",
      battery: raw.specs?.battery || raw.battery || "",
      display: raw.specs?.display || raw.display || "",
      os: raw.specs?.os || raw.os || "",
    },
    affiliateLinks: {
      amazon: raw.affiliateLinks?.amazon || raw.amazon || "",
      flipkart: raw.affiliateLinks?.flipkart || raw.flipkart || "",
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function readPayload({ file, url }) {
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed URL fetch: ${res.status}`);
    return res.json();
  }

  if (!file) throw new Error("Pass either --file <path> or --url <https://...>");
  const content = await fs.readFile(file, "utf8");
  return JSON.parse(content);
}

async function ensureFirebase() {
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

async function upsertBySlug(db, product) {
  const collection = db.collection("products");
  const existing = await collection.where("slug", "==", product.slug).limit(1).get();

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await ref.set(product, { merge: true });
    return { action: "updated", id: ref.id };
  }

  const createdAt = admin.firestore.FieldValue.serverTimestamp();
  const ref = await collection.add({ ...product, createdAt });
  return { action: "created", id: ref.id };
}

async function main() {
  const cwd = process.cwd();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const args = parseArgs(process.argv);
  const filePath = args.file ? path.resolve(cwd, args.file) : "";

  const db = await ensureFirebase();
  const payload = await readPayload({ file: filePath, url: args.url });
  const items = Array.isArray(payload) ? payload : payload.products || [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No products found in input.");
  }

  let created = 0;
  let updated = 0;

  for (const raw of items) {
    const normalized = normalizeProduct(raw);
    if (!normalized.name || !normalized.slug) continue;
    const res = await upsertBySlug(db, normalized);
    if (res.action === "created") created += 1;
    if (res.action === "updated") updated += 1;
  }

  console.log(`Import complete. created=${created} updated=${updated} total=${items.length}`);
  console.log(`Script path: ${path.relative(cwd, __dirname)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
