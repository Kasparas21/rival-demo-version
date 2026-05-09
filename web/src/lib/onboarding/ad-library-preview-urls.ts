/** Lightweight public-library preview targets for onboarding (mirrors competitor manual-ID patterns). */

const META_LIBRARY_HOME = "https://www.facebook.com/ads/library/";
const GOOGLE_TRANSPARENCY_HOME = "https://adstransparency.google.com/?region=any";
const LINKEDIN_LIBRARY_HOME = "https://www.linkedin.com/ad-library/home";

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  return /^https?:\/\//i.test(v) ? v.replace(/\/+$/, "") : `https://${v.replace(/^\/+/u, "")}`;
}

function sanitizeDomain(domain: string): string {
  return domain.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? "";
}

export function isMetaAdsLibraryUrl(raw: string): boolean {
  const low = raw.toLowerCase().trim();
  return (
    (low.includes("facebook.com") || low.includes("fb.com") || low.includes("m.facebook.com")) &&
    low.includes("ads/library")
  );
}

export function buildMetaAdsLibraryPreviewUrl(metaInputTrimmed: string): string {
  const v = metaInputTrimmed.trim();
  if (v && isMetaAdsLibraryUrl(v)) return normalizeUrl(v);
  const digitsOnly = v.replace(/\D/g, "");
  if (/^[\d\s-]+$/.test(v) && digitsOnly.length >= 10 && digitsOnly.length <= 22) {
    return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${encodeURIComponent(digitsOnly)}`;
  }
  return META_LIBRARY_HOME;
}

export function buildGoogleTransparencyPreviewUrl(domainInput: string, fallbackHost: string): string {
  const d = sanitizeDomain(domainInput) || sanitizeDomain(fallbackHost);
  if (!d) return GOOGLE_TRANSPARENCY_HOME;
  return `${GOOGLE_TRANSPARENCY_HOME}&domain=${encodeURIComponent(d.replace(/^www\./i, ""))}`;
}

export function buildLinkedInAdLibraryPreviewUrl(linkedinInputTrimmed: string): string {
  const v = linkedinInputTrimmed.trim();
  if (v.toLowerCase().includes("linkedin.com/ad-library")) {
    try {
      return new URL(normalizeUrl(v)).href;
    } catch {
      /* fall through */
    }
  }
  return LINKEDIN_LIBRARY_HOME;
}

/** TikTok Creative Center Ads Library advertiser search preview. */
export function buildTikTokAdsLibraryPreviewUrl(advertiserName?: string): string {
  const params = new URLSearchParams({
    region: "all",
    adv_biz_ids: "",
    query_type: "1",
    sort_type: "last_shown_date,desc",
  });
  const trimmed = advertiserName?.trim();
  if (trimmed) params.set("adv_name", trimmed);
  return `https://library.tiktok.com/ads?${params.toString()}`;
}

export function buildPinterestAdsPreviewUrl(profileOrKeywordTrimmed: string): string {
  const t = profileOrKeywordTrimmed.trim().replace(/^@+/, "").replace(/^\/+/u, "");
  if (!t) return "https://ads.pinterest.com/ads-repository/";
  try {
    if (/\.com\//u.test(t) || /^https?:/iu.test(t)) return normalizeUrl(t);
    return `https://www.pinterest.com/${encodeURIComponent(t)}/`;
  } catch {
    return "https://ads.pinterest.com/ads-repository/";
  }
}

export function buildSnapchatAdsGalleryPreviewUrl(keyword?: string): string {
  const u = new URL("https://adsgallery.snap.com/");
  const trimmed = keyword?.trim();
  if (trimmed) u.searchParams.set("advertiser", trimmed);
  return u.toString();
}
