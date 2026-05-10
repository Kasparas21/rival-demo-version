/**
 * Google Ads Transparency Center — advertiser URLs for Apify (`lurkapi/google-ads-scraper` `startUrls`).
 * Only URLs with a valid `/advertiser/AR…` path are accepted; `/creative/CR…` is stripped to advertiser-only.
 */

const ALLOWED_HOSTS = new Set(["adstransparency.google.com", "www.adstransparency.google.com"]);

/** Advertiser id segment (e.g. AR08888592736429539329). */
const ADVERTISER_ID = /^AR\d+$/i;

/** Creative id segment under /advertiser/…/creative/… */
const CREATIVE_ID = /^CR\d+$/i;

function trimPath(pathname: string): string {
  const p = pathname.trim();
  return p.replace(/\/+$/, "") || "/";
}

/** `domain=` value from Transparency Center search/share URLs — hostname-style only. */
function isValidTransparencyDomainQuery(domainRaw: string): boolean {
  let dec: string;
  try {
    dec = decodeURIComponent(domainRaw).trim().toLowerCase();
  } catch {
    return false;
  }
  if (!dec || dec.length > 253) return false;
  const host = dec.replace(/^www\./, "");
  if (!host.includes(".")) return false;
  if (host.includes("..") || host.startsWith(".") || host.endsWith(".")) return false;
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(host);
}

/**
 * Returns canonical `https://adstransparency.google.com/advertiser/AR…` (no query string, no `/creative/…`), or null.
 */
export function canonicalGoogleAdsTransparencyStartUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  const path = trimPath(url.pathname);
  const segments = path.split("/").filter(Boolean);

  if (segments.length < 2 || segments[0] !== "advertiser") return null;
  const arId = segments[1] ?? "";
  if (!ADVERTISER_ID.test(arId)) return null;

  const arNorm = arId.toUpperCase();

  if (segments.length === 2) {
    return `https://adstransparency.google.com/advertiser/${arNorm}`;
  }

  if (
    segments.length >= 4 &&
    segments[2] === "creative" &&
    CREATIVE_ID.test(segments[3] ?? "")
  ) {
    return `https://adstransparency.google.com/advertiser/${arNorm}`;
  }

  return null;
}

/**
 * If the URL is a Transparency “search by domain” page (`/?domain=shop.com`), returns that hostname.
 * Advertiser URLs return null (they do not encode a single registrable domain query).
 */
export function extractDomainFromTransparencyDomainSearchUrl(raw: string): string | null {
  const t = raw.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
  const segments = trimPath(url.pathname).split("/").filter(Boolean);
  if (segments.length !== 0) return null;
  const domainParam = url.searchParams.get("domain")?.trim();
  if (!domainParam || !isValidTransparencyDomainQuery(domainParam)) return null;
  try {
    return decodeURIComponent(domainParam).trim().toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isGoogleAdsTransparencyAdvertiserUrl(raw: string): boolean {
  return canonicalGoogleAdsTransparencyStartUrl(raw) !== null;
}
