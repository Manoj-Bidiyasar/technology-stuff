import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firestoreEmulatorHost =
  process.env.NODE_ENV === "production" ? undefined : process.env.FIRESTORE_EMULATOR_HOST;

function loadServiceAccount() {
  if (firestoreEmulatorHost) {
    return null;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error("Missing Firebase admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.");
  }

  const absolutePath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.join(process.cwd(), credentialsPath);
  const raw = fs.readFileSync(absolutePath, "utf-8");
  return JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
}

const serviceAccount = loadServiceAccount();
const projectId =
  serviceAccount?.project_id ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "demo-project";

const adminApp =
  getApps()[0] ||
  (serviceAccount
    ? initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
      })
    : initializeApp({ projectId }));

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

if (firestoreEmulatorHost) {
  const normalizedHost = firestoreEmulatorHost.replace(/^https?:\/\//, "");
  adminDb.settings({ host: normalizedHost, ssl: false });
}
