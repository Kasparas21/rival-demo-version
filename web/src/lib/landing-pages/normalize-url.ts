/**
 * Normalize a landing page URL for deduplication.
 * - Strips utm_*, fbclid, gclid, mc_*, ref tracking params
 * - Removes trailing slash
 * - Normalizes www. vs apex (strip www.)
 * - Lowercases hostname
 * - Preserves query params that aren't tracking
 */
export function normalizeLandingPageUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "gclid",
    "msclkid",
    "dclid",
    "yclid",
    "twclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_url",
    "_ga",
    "_gl",
  ];

  for (const param of trackingParams) {
    url.searchParams.delete(param);
  }

  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  url.hash = "";

  return url.toString();
}

/**
 * Returns a display-friendly version of the URL (shorter, no protocol).
 */
export function displayUrlShort(normalizedUrl: string, maxLength = 60): string {
  const stripped = normalizedUrl.replace(/^https?:\/\//, "");
  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength - 1)}…`;
}
