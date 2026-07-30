const FB_REDIRECT_HOSTS = new Set([
  "facebook.com",
  "l.facebook.com",
  "m.facebook.com",
  "lm.facebook.com",
]);

/**
 * Unwrap common outbound redirect trackers (e.g. facebook l.php?u=) before normalization.
 * Best-effort only — unknown trackers stay as-is.
 */
export function unwrapOutboundRedirectUrl(raw: string, depth = 0): string {
  if (depth > 6 || !raw || typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return raw;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const isFbRedirect =
    FB_REDIRECT_HOSTS.has(host) && (url.pathname.includes("/l.php") || url.searchParams.has("u"));
  if (isFbRedirect) {
    const u = url.searchParams.get("u");
    if (u) {
      try {
        return unwrapOutboundRedirectUrl(decodeURIComponent(u), depth + 1);
      } catch {
        /* ignore decode errors */
      }
    }
  }

  return trimmed;
}

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

  if (url.pathname === "/") {
    url.pathname = "";
  }

  url.hash = "";

  return url.toString();
}

/**
 * Canonical key for grouping ads that land on the same page across platforms.
 * Apex URLs (root path only) collapse to `https://{hostname}` so Google hostname
 * rows and Meta destination URLs dedupe correctly.
 */
export function landingPageGroupKey(rawUrl: string): string | null {
  const normalized = normalizeLandingPageUrl(rawUrl);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "";
      url.search = "";
      url.hash = "";
      return url.toString();
    }
    return normalized;
  } catch {
    return null;
  }
}

/** Legacy URL variants that share the same canonical group key (not query-param variants). */
export function landingPageGroupKeyAliases(rawUrl: string): string[] {
  const aliases = new Set<string>();
  const primary = landingPageGroupKey(rawUrl);
  const normalized = normalizeLandingPageUrl(rawUrl);

  if (primary) aliases.add(primary);
  if (normalized) {
    aliases.add(normalized);
    const fromNorm = landingPageGroupKey(normalized);
    if (fromNorm) aliases.add(fromNorm);
  }

  return [...aliases];
}

export function landingPageKeysMatch(a: string, b: string): boolean {
  const aAliases = new Set(landingPageGroupKeyAliases(a));
  return landingPageGroupKeyAliases(b).some((key) => aAliases.has(key));
}

/** Hostname for favicon / display; uses same unwrap as extraction for tracker URLs. */
export function hostFromLandingPageUrl(url: string): string | null {
  const unwrapped = unwrapOutboundRedirectUrl(url);
  const norm = normalizeLandingPageUrl(unwrapped);
  if (!norm) return null;
  try {
    return new URL(norm).hostname;
  } catch {
    return null;
  }
}

/**
 * Returns a display-friendly version of the URL (shorter, no protocol).
 */
export function displayUrlShort(normalizedUrl: string, maxLength = 60): string {
  const stripped = normalizedUrl.replace(/^https?:\/\//, "");
  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength - 1)}…`;
}
