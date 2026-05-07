import {
  DEFAULT_GOOGLE_ADS_REGION,
  normalizeGoogleAdsRegion,
} from "./google-ads-regions";
import {
  DEFAULT_PINTEREST_ADS_COUNTRY,
  normalizePinterestAdsCountry,
} from "./pinterest-regions";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "./tiktok-regions";
import {
  readScrapeRequestFieldsFromStorage,
  writeScrapeRequestFieldsToStorage,
  type ScrapeRequestFields,
} from "./scrape-request-fields";

const K_GOOGLE_REGION = "rival-google-ads-region";
const K_TIKTOK_REGION = "rival-tiktok-ads-region";
const K_PINTEREST_COUNTRY = "rival-pinterest-ads-country";

/** Region / market picks shown on the competitor confirmation screen — mirrored to session for `/api/ads/library`. */
export type AdLibraryRegionPrefs = {
  metaCountry: string;
  googleRegion: string;
  tiktokRegion: string;
  pinterestCountry: string;
  linkedinCountryCode: string;
  /** Snapchat EU gallery — single ISO2 from the EU set (no multi-country sweep). */
  snapchatCountry: string;
};

export function readAdLibraryRegionPrefsFromSession(): AdLibraryRegionPrefs {
  const scrape = readScrapeRequestFieldsFromStorage();
  let googleRegion = DEFAULT_GOOGLE_ADS_REGION;
  let tiktokRegion = DEFAULT_TIKTOK_ADS_REGION;
  let pinterestCountry = DEFAULT_PINTEREST_ADS_COUNTRY;
  if (typeof window !== "undefined") {
    try {
      const gr = sessionStorage.getItem(K_GOOGLE_REGION);
      if (gr) googleRegion = normalizeGoogleAdsRegion(gr);
      const tr = sessionStorage.getItem(K_TIKTOK_REGION);
      if (tr) tiktokRegion = normalizeTikTokAdsRegion(tr);
      const pc = sessionStorage.getItem(K_PINTEREST_COUNTRY);
      if (pc) pinterestCountry = normalizePinterestAdsCountry(pc);
    } catch {
      /* ignore */
    }
  }
  return {
    metaCountry: scrape.metaCountry.trim().toUpperCase() || "US",
    googleRegion,
    tiktokRegion,
    pinterestCountry,
    linkedinCountryCode: scrape.linkedinCountryCode.trim().toUpperCase(),
    snapchatCountry: scrape.snapchatCountry.trim().toUpperCase() || "DE",
  };
}

export function writeAdLibraryRegionPrefsToSession(p: AdLibraryRegionPrefs): void {
  const scrape: ScrapeRequestFields = {
    ...readScrapeRequestFieldsFromStorage(),
    metaCountry: p.metaCountry.trim().toUpperCase() || "US",
    linkedinCountryCode: p.linkedinCountryCode.trim().toUpperCase(),
    snapchatCountry: (p.snapchatCountry.trim().toUpperCase() || "DE").slice(0, 2),
  };
  writeScrapeRequestFieldsToStorage(scrape);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(K_GOOGLE_REGION, normalizeGoogleAdsRegion(p.googleRegion));
    sessionStorage.setItem(K_TIKTOK_REGION, normalizeTikTokAdsRegion(p.tiktokRegion));
    sessionStorage.setItem(K_PINTEREST_COUNTRY, normalizePinterestAdsCountry(p.pinterestCountry));
  } catch {
    /* quota */
  }
}
