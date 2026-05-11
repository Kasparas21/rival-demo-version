/**
 * Google / YouTube Transparency row ids — shared by normalize + merge/persist (no imports from normalize).
 */
export function parseGoogleTransparencyAdvertiserCreative(adUrl: string): {
  advertiserId: string;
  creativeId: string;
} | null {
  const u = adUrl.trim();
  const m = /\/advertiser\/([^/]+)\/creative\/([^/?#]+)/i.exec(u);
  if (!m) return null;
  return { advertiserId: decodeURIComponent(m[1]), creativeId: decodeURIComponent(m[2]) };
}

export function stableIdForGoogleItemRow(params: {
  type: "google" | "youtube";
  advertiserId?: string | null;
  creativeId?: string | null;
  adUrl: string;
  youtubeVideoId?: string | null;
}): string {
  const { type, adUrl } = params;
  if (type === "youtube") {
    const yid = params.youtubeVideoId?.trim();
    if (yid) return `yt:${yid.toLowerCase()}`;
  }
  const parsed = parseGoogleTransparencyAdvertiserCreative(adUrl);
  if (parsed) {
    return type === "youtube"
      ? `yt:${parsed.advertiserId}:${parsed.creativeId}`
      : `g:${parsed.advertiserId}:${parsed.creativeId}`;
  }
  const a = (params.advertiserId?.trim() || "na").replace(/\s+/g, "");
  const c = (params.creativeId?.trim() || "na").replace(/\s+/g, "");
  return type === "youtube" ? `yt:${a}:${c}` : `g:${a}:${c}`;
}
