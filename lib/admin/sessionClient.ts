export function getOrCreateAdminDeviceId(): string {
  const key = "admin_device_id";
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, next);
  }
  return next;
}

