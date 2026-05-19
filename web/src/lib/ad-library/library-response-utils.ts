import type { AdsLibraryPlatform, AdsLibraryResponse } from "./api-types";

/** Client-safe helpers — keep out of `persist-scraped-ads.ts` (server-only side effects). */

export function platformScrapeSucceeded(out: AdsLibraryResponse, p: AdsLibraryPlatform): boolean {
  switch (p) {
    case "meta":
      return out.meta.error == null;
    case "google":
      return out.google.error == null;
    case "linkedin":
      return out.linkedin.error == null;
    case "tiktok":
      return out.tiktok.error == null;
    case "microsoft":
      return out.microsoft.error == null;
    case "pinterest":
      return out.pinterest.error == null;
    case "snapchat":
      return out.snapchat.error == null;
    default:
      return false;
  }
}

export function countLibraryAdsForPlatform(platform: AdsLibraryPlatform, out: AdsLibraryResponse): number {
  switch (platform) {
    case "meta":
      return out.meta.ads?.length ?? 0;
    case "google":
      return out.google.rows?.length ?? 0;
    case "linkedin":
      return out.linkedin.ads?.length ?? 0;
    case "tiktok":
      return out.tiktok.ads?.length ?? 0;
    case "microsoft":
      return out.microsoft.ads?.length ?? 0;
    case "pinterest":
      return out.pinterest.ads?.length ?? 0;
    case "snapchat":
      return out.snapchat.ads?.length ?? 0;
    default:
      return 0;
  }
}
