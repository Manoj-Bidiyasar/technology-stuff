import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

const firestoreEmulatorHost =
  process.env.NODE_ENV === "production"
    ? undefined
    : process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST;
let emulatorConnected = false;

if (!emulatorConnected && firestoreEmulatorHost && typeof window !== "undefined") {
  const normalizedHost = firestoreEmulatorHost.replace(/^https?:\/\//, "");
  const [host, port] = normalizedHost.split(":");
  const portNumber = Number(port || 8080);
  if (!Number.isNaN(portNumber)) {
    connectFirestoreEmulator(db, host, portNumber);
    emulatorConnected = true;
  }
}
