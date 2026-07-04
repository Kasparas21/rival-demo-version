/** TikTok Ads Library detail URLs — canonical `?ad_id=` query format. */

function stringField(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Numeric TikTok ad ids from Lexis / data_xplorer (typically 15–20 digits). */
export function isTikTokAdLibraryId(id: string): boolean {
  return /^\d{10,22}$/.test(id.trim());
}

export function buildTikTokAdLibraryDetailUrl(adId: string): string {
  const id = adId.trim();
  if (!isTikTokAdLibraryId(id)) {
    return "https://library.tiktok.com/ads";
  }
  return `https://library.tiktok.com/ads/detail/?ad_id=${encodeURIComponent(id)}`;
}

/** Parse ad id from TikTok library detail URLs (`?ad_id=` or legacy `/detail/{id}` path). */
export function tiktokAdIdFromLibraryUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const fromQuery = u.searchParams.get("ad_id")?.trim();
    if (fromQuery && isTikTokAdLibraryId(fromQuery)) return fromQuery;
  } catch {
    /* ignore */
  }

  const queryMatch = /[?&]ad_id=([^&]+)/i.exec(raw);
  if (queryMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(queryMatch[1].trim());
      if (isTikTokAdLibraryId(decoded)) return decoded;
    } catch {
      const direct = queryMatch[1].trim();
      if (isTikTokAdLibraryId(direct)) return direct;
    }
  }

  const pathMatch = /\/ads\/detail\/([^/?#]+)/i.exec(raw);
  if (pathMatch?.[1]) {
    const segment = pathMatch[1].trim();
    if (isTikTokAdLibraryId(segment)) return segment;
  }

  return null;
}

function isTikTokLibraryDetailUrl(url: string): boolean {
  if (!isHttpUrl(url)) return false;
  const low = url.toLowerCase();
  return low.includes("library.tiktok.com") && low.includes("/ads/detail");
}

function isSyntheticFallbackId(id: string): boolean {
  return /^tt-\d+$/i.test(id.trim());
}

export function resolveTikTokAdIdFromPayload(p: Record<string, unknown>): string | null {
  const fromAdId = stringField(p, ["adId", "ad_id", "AD ID"]);
  if (fromAdId && isTikTokAdLibraryId(fromAdId)) return fromAdId;

  for (const key of ["adUrl", "adLibraryUrl", "Ad Detail URL", "ad_detail_url", "url"]) {
    const raw = typeof p[key] === "string" ? (p[key] as string).trim() : "";
    if (!raw || !isTikTokLibraryDetailUrl(raw)) continue;
    const fromUrl = tiktokAdIdFromLibraryUrl(raw);
    if (fromUrl) return fromUrl;
  }

  const id = typeof p.id === "string" ? p.id.trim() : "";
  if (id && !isSyntheticFallbackId(id) && isTikTokAdLibraryId(id)) return id;

  return null;
}

/** Canonical per-ad TikTok Ads Library detail URL, or null when no trustworthy ad id exists. */
export function resolveTikTokAdLibraryUrlFromPayload(p: Record<string, unknown>): string | null {
  for (const key of ["adUrl", "adLibraryUrl", "Ad Detail URL", "ad_detail_url", "url"]) {
    const raw = typeof p[key] === "string" ? (p[key] as string).trim() : "";
    if (!raw || !isHttpUrl(raw) || !isTikTokLibraryDetailUrl(raw)) continue;
    const id = tiktokAdIdFromLibraryUrl(raw);
    if (id) return buildTikTokAdLibraryDetailUrl(id);
  }

  const adId = resolveTikTokAdIdFromPayload(p);
  if (!adId) return null;
  return buildTikTokAdLibraryDetailUrl(adId);
}
