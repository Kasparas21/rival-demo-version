import { inferAdLibraryRegionDefaults } from "@/lib/ad-library/infer-ad-library-regions-from-domain";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";

/** Read TikTok region from saved `ads_library_context` or infer from competitor domain. */
export function readTiktokRegionFromAdsLibraryContext(
  adsLibraryContext: unknown,
  domainFallback?: string | null,
): string {
  if (adsLibraryContext != null && typeof adsLibraryContext === "object" && !Array.isArray(adsLibraryContext)) {
    const o = adsLibraryContext as Record<string, unknown>;
    const direct = o.tiktokRegion;
    if (typeof direct === "string" && direct.trim()) {
      return normalizeTikTokAdsRegion(direct);
    }
    const prefs = o.regionPrefs;
    if (prefs != null && typeof prefs === "object" && !Array.isArray(prefs)) {
      const tr = (prefs as Record<string, unknown>).tiktokRegion;
      if (typeof tr === "string" && tr.trim()) {
        return normalizeTikTokAdsRegion(tr);
      }
    }
  }
  const domain = domainFallback?.trim();
  if (domain) {
    return inferAdLibraryRegionDefaults(domain).tiktokRegion;
  }
  return DEFAULT_TIKTOK_ADS_REGION;
}
