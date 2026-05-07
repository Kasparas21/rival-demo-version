import { DEFAULT_GOOGLE_ADS_REGION, normalizeGoogleAdsRegion } from "@/lib/ad-library/google-ads-regions";
import {
  DEFAULT_PINTEREST_ADS_COUNTRY,
  normalizePinterestAdsCountry,
} from "@/lib/ad-library/pinterest-regions";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";

export function readStoredGoogleRegion(): string {
  if (typeof window === "undefined") return DEFAULT_GOOGLE_ADS_REGION;
  try {
    const gr = sessionStorage.getItem("rival-google-ads-region");
    if (gr) return normalizeGoogleAdsRegion(gr);
  } catch {
    /* ignore */
  }
  return DEFAULT_GOOGLE_ADS_REGION;
}

export function readStoredTiktokRegion(): string {
  if (typeof window === "undefined") return DEFAULT_TIKTOK_ADS_REGION;
  try {
    const s = sessionStorage.getItem("rival-tiktok-ads-region");
    if (s) return normalizeTikTokAdsRegion(s);
  } catch {
    /* ignore */
  }
  return DEFAULT_TIKTOK_ADS_REGION;
}

export function readStoredPinterestCountry(): string {
  if (typeof window === "undefined") return DEFAULT_PINTEREST_ADS_COUNTRY;
  try {
    const pc = sessionStorage.getItem("rival-pinterest-ads-country");
    if (pc) return normalizePinterestAdsCountry(pc);
  } catch {
    /* ignore */
  }
  return DEFAULT_PINTEREST_ADS_COUNTRY;
}
