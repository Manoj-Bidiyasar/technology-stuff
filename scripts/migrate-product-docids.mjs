import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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
    if (!process.env[key]) process.env[key] = value;
  });
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

async function initAdmin() {
  await loadEnvLocal();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountJson && !credentialsPath) {
    throw new Error(
      "Missing Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env.local."
    );
  }

  if (!admin.apps.length) {
    if (serviceAccountJson) {
      const account = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: String(account.private_key || "").replace(/\\n/g, "\n"),
        }),
      });
    } else {
      const absolutePath = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.join(process.cwd(), credentialsPath);
      const raw = await fs.readFile(absolutePath, "utf8");
      const account = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: String(account.private_key || "").replace(/\\n/g, "\n"),
        }),
      });
    }
  }

  return admin.firestore();
}

async function run() {
  const { dryRun } = parseArgs(process.argv);
  const db = await initAdmin();
  const ref = db.collection("products");
  const snap = await ref.get();

  let checked = 0;
  let moved = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    checked += 1;
    const data = doc.data() || {};
    const name = String(data.name || "").trim();
    const nextSlug = slugify(name || data.slug || doc.id);
    const nextId = nextSlug || doc.id;
    const nextDeviceType = data.deviceType === "tablet" ? "tablet" : "smartphone";

    if (!nextSlug) {
      skipped += 1;
      continue;
    }

    const needsMove = doc.id !== nextId;
    const needsUpdate = data.slug !== nextSlug || data.deviceType !== nextDeviceType;

    if (!needsMove && !needsUpdate) continue;

    if (dryRun) {
      if (needsMove) moved += 1;
      if (needsUpdate) updated += 1;
      continue;
    }

    if (needsMove) {
      const targetRef = ref.doc(nextId);
      const targetDoc = await targetRef.get();
      if (targetDoc.exists) {
        console.log(`[skip] target exists for ${doc.id} -> ${nextId}`);
        skipped += 1;
        continue;
      }
      await targetRef.set({
        ...data,
        slug: nextSlug,
        deviceType: nextDeviceType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      await doc.ref.delete();
      moved += 1;
      continue;
    }

    await doc.ref.set({
      slug: nextSlug,
      deviceType: nextDeviceType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    updated += 1;
  }

  console.log(JSON.stringify({ checked, moved, updated, skipped, dryRun }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
