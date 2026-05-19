import type { AdsLibraryPlatform } from "./ads-library-platform";
import type { AdsLibraryResponse } from "./api-types";
import type { GoogleTransparencyRegionStat } from "./apify-raw-types";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";

const KILLED_GRACE_MS = 48 * 60 * 60 * 1000;

export function utcTodayYmd(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function metaTimestampToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

export function isMetaAdActive(ad: Pick<MetaAdCard, "endedAt">, nowMs = Date.now()): boolean {
  if (ad.endedAt == null || !Number.isFinite(ad.endedAt)) return true;
  return metaTimestampToMs(ad.endedAt) >= nowMs - KILLED_GRACE_MS;
}

function parseYmdFromLooseDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  if (iso) return iso[1];
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (mdy) {
    const month = mdy[1].padStart(2, "0");
    const day = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${month}-${day}`;
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function googleRowLastShownYmd(row: GoogleAdRow): string | null {
  const direct = parseYmdFromLooseDate(row.lastShown ?? undefined);
  if (direct) return direct;
  const stats = row.regionStats ?? [];
  let max: string | null = null;
  for (const s of stats) {
    const y = parseYmdFromLooseDate(s.lastShown ?? undefined);
    if (y && (!max || y > max)) max = y;
  }
  return max;
}

/** Active only when lastShown calendar date equals today (UTC). */
export function isGoogleAdRowActive(row: GoogleAdRow, nowMs = Date.now()): boolean {
  const ymd = googleRowLastShownYmd(row);
  if (!ymd) return false;
  return ymd === utcTodayYmd(nowMs);
}

export function isTikTokAdActive(ad: Pick<TikTokAdCard, "flightEndMs">, nowMs = Date.now()): boolean {
  if (ad.flightEndMs == null || Number.isNaN(ad.flightEndMs)) return true;
  return ad.flightEndMs >= nowMs - KILLED_GRACE_MS;
}

export function isLinkedInAdActive(
  ad: Pick<LinkedInAdCard, "publicationEnd">,
  nowMs = Date.now()
): boolean {
  const end = ad.publicationEnd?.trim();
  if (!end) return true;
  const ymd = parseYmdFromLooseDate(end);
  if (!ymd) return true;
  return ymd >= utcTodayYmd(nowMs);
}

function pinterestEndYmdFromDisclosure(disclosureWindow: string | null | undefined): string | null {
  const t = disclosureWindow?.trim() ?? "";
  const ran = /^Ran\s+.+?\s+[–-]\s+(.+)$/i.exec(t);
  if (ran) return parseYmdFromLooseDate(ran[1].trim());
  const until = /^Until\s+(.+)$/i.exec(t);
  if (until) return parseYmdFromLooseDate(until[1].trim());
  return null;
}

export function isPinterestAdActive(
  ad: Pick<PinterestAdCard, "disclosureWindow">,
  nowMs = Date.now()
): boolean {
  const endYmd = pinterestEndYmdFromDisclosure(ad.disclosureWindow);
  if (!endYmd) return true;
  return endYmd >= utcTodayYmd(nowMs);
}

export function isSnapchatAdActive(ad: Pick<SnapchatAdCard, "status">): boolean {
  return (ad.status ?? "").trim().toUpperCase() === "ACTIVE";
}

export function isAdActiveFromRawPayload(
  platform: AdsLibraryPlatform,
  raw: unknown,
  nowMs = Date.now()
): boolean {
  if (!raw || typeof raw !== "object") return false;
  switch (platform) {
    case "meta":
      return isMetaAdActive(raw as MetaAdCard, nowMs);
    case "google":
      return isGoogleAdRowActive(raw as GoogleAdRow, nowMs);
    case "tiktok":
      return isTikTokAdActive(raw as TikTokAdCard, nowMs);
    case "linkedin":
      return isLinkedInAdActive(raw as LinkedInAdCard, nowMs);
    case "pinterest":
      return isPinterestAdActive(raw as PinterestAdCard, nowMs);
    case "snapchat":
      return isSnapchatAdActive(raw as SnapchatAdCard);
    default:
      return false;
  }
}

export function countActiveMetaAds(ads: MetaAdCard[], nowMs = Date.now()): number {
  return ads.filter((a) => isMetaAdActive(a, nowMs)).length;
}

export function countActiveGoogleRows(rows: GoogleAdRow[], nowMs = Date.now()): number {
  return rows.filter((r) => isGoogleAdRowActive(r, nowMs)).length;
}

export function countActiveTikTokAds(ads: TikTokAdCard[], nowMs = Date.now()): number {
  return ads.filter((a) => isTikTokAdActive(a, nowMs)).length;
}

export function countActiveLinkedInAds(ads: LinkedInAdCard[], nowMs = Date.now()): number {
  return ads.filter((a) => isLinkedInAdActive(a, nowMs)).length;
}

export function countActivePinterestAds(ads: PinterestAdCard[], nowMs = Date.now()): number {
  return ads.filter((a) => isPinterestAdActive(a, nowMs)).length;
}

export function countActiveSnapchatAds(ads: SnapchatAdCard[]): number {
  return ads.filter((a) => isSnapchatAdActive(a)).length;
}

export type ActiveAdCounts = Partial<Record<AdsLibraryPlatform, number>>;

export function countActiveAdsFromLibraryResponse(
  out: Pick<
    AdsLibraryResponse,
    "meta" | "google" | "linkedin" | "tiktok" | "pinterest" | "snapchat"
  >,
  nowMs = Date.now()
): ActiveAdCounts {
  return {
    meta: countActiveMetaAds(out.meta?.ads ?? [], nowMs),
    google: countActiveGoogleRows(out.google?.rows ?? [], nowMs),
    linkedin: countActiveLinkedInAds(out.linkedin?.ads ?? [], nowMs),
    tiktok: countActiveTikTokAds(out.tiktok?.ads ?? [], nowMs),
    pinterest: countActivePinterestAds(out.pinterest?.ads ?? [], nowMs),
    snapchat: countActiveSnapchatAds(out.snapchat?.ads ?? []),
  };
}

export function countActiveAdsFromRawPayloads(
  rows: { platform: string; raw_payload: unknown }[],
  nowMs = Date.now()
): ActiveAdCounts {
  const counts: ActiveAdCounts = {};
  for (const row of rows) {
    const pl = row.platform;
    let bucket: AdsLibraryPlatform;
    let active = false;
    if (pl === "youtube") {
      bucket = "google";
      active = isGoogleAdRowActive(row.raw_payload as GoogleAdRow, nowMs);
    } else {
      bucket = pl as AdsLibraryPlatform;
      active = isAdActiveFromRawPayload(bucket, row.raw_payload, nowMs);
    }
    if (!active) continue;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}

/** Region stat helper for tests / Google edge cases. */
export function maxLastShownFromRegionStats(stats: GoogleTransparencyRegionStat[] | undefined): string | null {
  if (!stats?.length) return null;
  let max: string | null = null;
  for (const s of stats) {
    const y = parseYmdFromLooseDate(s.lastShown ?? undefined);
    if (y && (!max || y > max)) max = y;
  }
  return max;
}
