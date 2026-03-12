const DEFAULT_SITE_URL = "https://technologystuff.in";

export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return String(raw || DEFAULT_SITE_URL).replace(/\/+$/, "");
}
