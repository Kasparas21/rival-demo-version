/**
 * Stable per-platform identifiers for ads-library merge + `scraped_ads.stable_ad_key`.
 *
 * Requirements: two scrape runs for the “same” creative must yield the same key.
 * Keys are normalized (trim); YouTube video ids lowercased. Google Transparency
 * pairs come from API fields or parsed `adUrl` (`/advertiser/…/creative/…`).
 *
 * Fallback order when official ids are missing: parse library/detail URLs →
 * short hash of canonical adUrl (never headline text).
 */
import type { AdsLibraryPlatform } from "./ads-library-platform";
import { parseGoogleTransparencyAdvertiserCreative } from "./google-stable-id";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";

export {
  parseGoogleTransparencyAdvertiserCreative,
  stableIdForGoogleItemRow,
} from "./google-stable-id";

export function metaArchiveIdFromAdLibraryUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const u = new URL(url.trim());
    const id = u.searchParams.get("id");
    if (id?.trim()) return id.trim();
  } catch {
    /* ignore */
  }
  const m = /[?&]id=([^&]+)/i.exec(url);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1].trim());
    } catch {
      return m[1].trim();
    }
  }
  return null;
}

function linkedInDetailIdFromAdUrl(url: string): string | null {
  const m = /ad-library\/detail\/([^/?#]+)/i.exec(url.trim());
  return m?.[1]?.trim() ?? null;
}

function tiktokAdIdFromAdUrl(url: string): string | null {
  const m = /\/ads\/detail\/([^/?#]+)/i.exec(url.trim());
  return m?.[1]?.trim() ?? null;
}

function pinterestPinIdFromUrl(url: string): string | null {
  const m = /pinterest\.com\/pin\/([^/?#]+)/i.exec(url.trim().toLowerCase());
  return m?.[1]?.trim() ?? null;
}

function fallbackKeyFromUrl(url: string): string {
  const s = url.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `url:${Math.abs(h).toString(36)}`;
}

export function stableAdKeyForMeta(card: MetaAdCard): string {
  const archive = card.adArchiveId?.trim() || metaArchiveIdFromAdLibraryUrl(card.adLibraryUrl);
  if (archive) return archive;
  const raw = String(card.id ?? "").trim();
  if (raw && !/^fb-\d+$/i.test(raw)) return raw;
  const fromUrl = metaArchiveIdFromAdLibraryUrl(card.adLibraryUrl);
  if (fromUrl) return fromUrl;
  return fallbackKeyFromUrl(card.adLibraryUrl || raw || "meta");
}

export function stableAdKeyForGoogleRow(row: GoogleAdRow): string {
  if (row.type === "youtube") {
    const yid = row.youtubeVideoId?.trim();
    if (yid) return `yt:${yid.toLowerCase()}`;
    const parsed = parseGoogleTransparencyAdvertiserCreative(row.adUrl);
    if (parsed) return `yt:${parsed.advertiserId}:${parsed.creativeId}`;
    return fallbackKeyFromUrl(row.adUrl);
  }
  const parsed = parseGoogleTransparencyAdvertiserCreative(row.adUrl);
  if (parsed) return `g:${parsed.advertiserId}:${parsed.creativeId}`;
  const legacy = row.id?.trim() || "";
  const stripped = legacy.replace(/-(\d+)$/, "");
  if (stripped && stripped !== legacy) return stripped.startsWith("g:") ? stripped : `g:${stripped}`;
  if (legacy && legacy.includes(":")) return legacy.startsWith("g:") ? legacy : `g:${legacy}`;
  return fallbackKeyFromUrl(row.adUrl);
}

export function stableAdKeyForLinkedIn(card: LinkedInAdCard): string {
  const raw = String(card.id ?? "").trim();
  if (raw && !/^li-\d+$/i.test(raw)) return raw;
  const d = linkedInDetailIdFromAdUrl(card.adUrl);
  if (d) return d;
  return fallbackKeyFromUrl(card.adUrl || raw || "linkedin");
}

export function stableAdKeyForTikTok(card: TikTokAdCard): string {
  const raw = String(card.id ?? "").trim();
  if (raw && !/^tt-\d+$/i.test(raw)) return raw;
  const d = tiktokAdIdFromAdUrl(card.adUrl);
  if (d) return d;
  return fallbackKeyFromUrl(card.adUrl || raw || "tiktok");
}

export function stableAdKeyForMicrosoft(card: MicrosoftAdCard): string {
  const raw = String(card.id ?? "").trim();
  if (raw && !/^ms-\d+$/i.test(raw)) return raw;
  return fallbackKeyFromUrl(card.adUrl || raw || "microsoft");
}

export function stableAdKeyForPinterest(card: PinterestAdCard): string {
  const raw = String(card.id ?? "").trim();
  if (raw && !/^pin-\d+$/i.test(raw)) return raw;
  const p = pinterestPinIdFromUrl(card.adUrl) || pinterestPinIdFromUrl(`https://www.pinterest.com/pin/${raw}/`);
  if (p) return p;
  return fallbackKeyFromUrl(card.adUrl || raw || "pinterest");
}

export function stableAdKeyForSnapchat(card: SnapchatAdCard): string {
  const raw = String(card.id ?? "").trim();
  if (raw && !/^snap-\d+$/i.test(raw)) return raw;
  return fallbackKeyFromUrl(card.adUrl || raw || "snapchat");
}

export function stableAdKeyForLibraryItem(platform: AdsLibraryPlatform, item: unknown): string {
  switch (platform) {
    case "meta":
      return stableAdKeyForMeta(item as MetaAdCard);
    case "google":
      return stableAdKeyForGoogleRow(item as GoogleAdRow);
    case "linkedin":
      return stableAdKeyForLinkedIn(item as LinkedInAdCard);
    case "tiktok":
      return stableAdKeyForTikTok(item as TikTokAdCard);
    case "microsoft":
      return stableAdKeyForMicrosoft(item as MicrosoftAdCard);
    case "pinterest":
      return stableAdKeyForPinterest(item as PinterestAdCard);
    case "snapchat":
      return stableAdKeyForSnapchat(item as SnapchatAdCard);
    default:
      return fallbackKeyFromUrl(String(platform));
  }
}
