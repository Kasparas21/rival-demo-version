/** Align scraped_ads.platform labels with detail-drawer + canonical field helpers. */
export function normalizeAdDetailPlatformKey(platform: string): string {
  const p = platform.trim().toLowerCase();
  if (p === "facebook") return "meta";
  return p;
}
