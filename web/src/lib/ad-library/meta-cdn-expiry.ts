/**
 * Meta CDN creative URLs are signed and carry an `oe=` query param — the link's
 * expiry as hex-encoded unix seconds. Requests after that moment always 403,
 * so callers can skip the doomed fetch and go straight to the archived copy.
 */
export function metaCdnUrlExpiryMs(url: string): number | null {
  const trimmed = url.trim();
  if (!trimmed || !/\.fbcdn\.net\//i.test(trimmed)) return null;

  const match = /[?&]oe=([0-9a-f]{6,12})(?:&|$)/i.exec(trimmed);
  if (!match) return null;

  const seconds = Number.parseInt(match[1]!, 16);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds * 1000;
}

export function isExpiredMetaCdnUrl(url: string, nowMs = Date.now()): boolean {
  const expiryMs = metaCdnUrlExpiryMs(url);
  return expiryMs != null && expiryMs <= nowMs;
}
