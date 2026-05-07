/**
 * Path segments that are not Pinterest profile usernames (first path segment after domain).
 */
const RESERVED_FIRST_SEGMENTS = new Set(
  [
    "pin",
    "ideas",
    "search",
    "today",
    "_saved",
    "explore",
    "pin-builder",
    "verify",
    "settings",
    "about",
    "shopping",
    "tv",
    "videos",
    "notifications",
    "messages",
    "newsroom",
    "analytics",
    "help",
    "topics",
    "invites",
    "business",
    "idea-pin-builder",
  ].map((s) => s.toLowerCase())
);

function hostnameIsPinterest(host: string): boolean {
  const h = host.replace(/^www\./i, "").toLowerCase();
  return h === "pinterest.com" || h.endsWith(".pinterest.com");
}

/**
 * Returns a single string suitable for the Pinterest transparency Apify actor `advertiserName`
 * (partial match). For Pinterest URLs, uses the first non-reserved path segment (profile handle).
 * For plain text (no pinterest.com URL), returns trimmed input (brand name or handle).
 */
export function extractPinterestHandleFromUrlOrString(raw: string): string {
  const t = raw.trim();
  if (!t) return "";

  const hasPinterestHost =
    /pinterest\.com/i.test(t) && (/^https?:\/\//i.test(t) || /^www\.pinterest\.com/i.test(t));

  if (hasPinterestHost || /^pinterest\.com\//i.test(t)) {
    const urlStr = t.startsWith("http") ? t : `https://${t}`;
    try {
      const u = new URL(urlStr);
      if (!hostnameIsPinterest(u.hostname)) return "";
      const segments = u.pathname.split("/").filter(Boolean);
      for (const seg of segments) {
        const lower = seg.toLowerCase();
        if (RESERVED_FIRST_SEGMENTS.has(lower)) continue;
        const decoded = decodeURIComponent(seg).trim();
        if (decoded.length >= 1 && !/[/?#]/.test(decoded)) return decoded;
      }
      return "";
    } catch {
      return "";
    }
  }

  if (/^https?:\/\//i.test(t)) return "";

  return t.replace(/^@+/, "").trim().slice(0, 200);
}
