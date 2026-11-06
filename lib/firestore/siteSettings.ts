import { adminDb } from "@/lib/firebase/admin";

const settingsRef = adminDb.collection("siteSettings").doc("publicPages");

export async function getShowSmartphoneRamStorageConfiguration(): Promise<boolean> {
  const snapshot = await settingsRef.get();
  return snapshot.exists ? snapshot.data()?.showSmartphoneRamStorageConfiguration === true : false;
}

export async function setShowSmartphoneRamStorageConfiguration(show: boolean): Promise<void> {
  await settingsRef.set({ showSmartphoneRamStorageConfiguration: show }, { merge: true });
}
