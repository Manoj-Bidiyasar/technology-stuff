import process from "node:process";
import admin from "firebase-admin";

function parseArgs(argv) {
  const args = {
    collection: "products",
    field: "slug",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--collection") args.collection = argv[i + 1] || args.collection;
    if (token === "--field") args.field = argv[i + 1] || args.field;
  }

  return args;
}

function groupByField(docs, field) {
  const map = new Map();

  docs.forEach((doc) => {
    const value = String(doc.get(field) || "").trim().toLowerCase();
    if (!value) return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(doc);
  });

  return map;
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

async function main() {
  const args = parseArgs(process.argv);
  const db = await ensureFirebase();

  const snapshot = await db.collection(args.collection).get();
  const grouped = groupByField(snapshot.docs, args.field);

  const duplicates = Array.from(grouped.entries())
    .filter(([, rows]) => rows.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (duplicates.length === 0) {
    console.log(
      `No duplicates found in "${args.collection}" by field "${args.field}".`,
    );
    return;
  }

  console.log(
    `Found ${duplicates.length} duplicate ${args.field} value(s) in "${args.collection}":`,
  );

  duplicates.forEach(([value, rows], index) => {
    console.log(`\n${index + 1}. ${args.field}="${value}" (${rows.length} docs)`);
    rows.forEach((doc, rowIndex) => {
      const name = String(doc.get("name") || "").trim();
      const status = String(doc.get("status") || "").trim();
      console.log(
        `   ${rowIndex + 1}) id=${doc.id}${name ? ` | name=${name}` : ""}${status ? ` | status=${status}` : ""}`,
      );
    });
  });

  console.log(
    "\nTip: keep one doc per slug and delete extra IDs from Firebase Console.",
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
