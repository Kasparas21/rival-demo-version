import type { AdsLibraryPlatform } from "./ads-library-platform";
import type { AdsLibraryResponse } from "./api-types";
import type { GoogleTransparencyRegionStat } from "./apify-raw-types";
import { parseGoogleShownSummaryRange } from "@/lib/ad-library/google-shown-range";
import { isScrapedAdRunning } from "@/lib/ad-library/scraped-ad-lifecycle";
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

function utcYmdFromMs(ms: number): string | null {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

/**
 * Meta ad is active when: scraper `is_active === true`, no end date, or end date is the
 * same UTC day as the scrape (still running when captured).
 */
export function isMetaAdActive(
  ad: Pick<MetaAdCard, "endedAt" | "isActive">,
  scrapeAtMs?: number,
  nowMs = Date.now()
): boolean {
  if (ad.isActive === false) return false;
  if (ad.isActive === true) return true;

  if (ad.endedAt == null || !Number.isFinite(ad.endedAt) || ad.endedAt <= 0) return true;

  const endMs = metaTimestampToMs(ad.endedAt);
  const anchorMs =
    scrapeAtMs != null && Number.isFinite(scrapeAtMs) ? scrapeAtMs : nowMs;
  const endYmd = utcYmdFromMs(endMs);
  const scrapeYmd = utcYmdFromMs(anchorMs);
  if (!endYmd || !scrapeYmd) return true;

  return endYmd === scrapeYmd;
}

/** Align library card fields with scrape-aware active rules. */
export function hydrateMetaAdCardForLibrary(ad: MetaAdCard, scrapeAtMs?: number): MetaAdCard {
  const active = isMetaAdActive(ad, scrapeAtMs);
  if (active) {
    return { ...ad, isActive: ad.isActive ?? true, endedAt: undefined };
  }
  return { ...ad, isActive: false };
}

export function isMetaAdKilled(
  ad: Pick<MetaAdCard, "endedAt" | "isActive">,
  scrapeAtMs?: number,
  nowMs = Date.now()
): boolean {
  return !isMetaAdActive(ad, scrapeAtMs, nowMs);
}

export function computeMetaAdRunDays(
  ad: Pick<MetaAdCard, "startedAt" | "endedAt" | "isActive">,
  scrapeAtMs?: number,
  nowMs = Date.now()
): number {
  if (ad.startedAt == null || !Number.isFinite(ad.startedAt)) return 0;
  const start = metaTimestampToMs(ad.startedAt);
  const active = isMetaAdActive(ad, scrapeAtMs, nowMs);
  let end = nowMs;
  if (!active && ad.endedAt != null && Number.isFinite(ad.endedAt) && ad.endedAt > 0) {
    end = metaTimestampToMs(ad.endedAt);
  }
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

export function isTikTokAdKilled(ad: Pick<TikTokAdCard, "flightEndMs">, nowMs = Date.now()): boolean {
  return !isTikTokAdActive(ad, nowMs);
}

export function computeTikTokAdRunDays(ad: Pick<TikTokAdCard, "flightStartMs" | "flightEndMs">, nowMs = Date.now()): number {
  const start = ad.flightStartMs;
  if (start == null || Number.isNaN(start)) return 0;
  const active = isTikTokAdActive(ad, nowMs);
  const end =
    !active && ad.flightEndMs != null && !Number.isNaN(ad.flightEndMs) ? ad.flightEndMs : nowMs;
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

export function isAdKilledForLibraryCard(
  platform: AdsLibraryPlatform,
  ad: unknown,
  scrapeAtMs?: number,
  nowMs = Date.now()
): boolean {
  if (!ad || typeof ad !== "object") return true;
  switch (platform) {
    case "meta":
      return isMetaAdKilled(ad as MetaAdCard, scrapeAtMs, nowMs);
    case "tiktok":
      return isTikTokAdKilled(ad as TikTokAdCard, nowMs);
    case "snapchat":
      return !isSnapchatAdActive(ad as SnapchatAdCard);
    case "google":
      return isGoogleAdKilled(ad as GoogleAdRow, nowMs);
    default:
      return !isAdActiveFromRawPayload(platform, ad, nowMs);
  }
}

export function computeAdRunDays(
  platform: AdsLibraryPlatform,
  ad: unknown,
  scrapeAtMs?: number,
  nowMs = Date.now()
): number {
  if (!ad || typeof ad !== "object") return 0;
  switch (platform) {
    case "meta":
      return computeMetaAdRunDays(ad as MetaAdCard, scrapeAtMs, nowMs);
    case "tiktok":
      return computeTikTokAdRunDays(ad as TikTokAdCard, nowMs);
    case "google":
      return computeGoogleAdRunDays(ad as GoogleAdRow, nowMs);
    default:
      return 0;
  }
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

export function googleRowLastShownYmd(row: GoogleAdRow): string | null {
  const direct = parseYmdFromLooseDate(row.lastShown ?? undefined);
  if (direct) return direct;
  if (row.type === "google") {
    const fromLabel = parseYmdFromLooseDate(row.lastShownLabel ?? undefined);
    if (fromLabel) return fromLabel;
    const fromSummary = parseGoogleShownSummaryRange(row.shownSummary);
    if (fromSummary.last) return fromSummary.last;
  }
  const stats = row.regionStats ?? [];
  let max: string | null = null;
  for (const s of stats) {
    const y = parseYmdFromLooseDate(s.lastShown ?? undefined);
    if (y && (!max || y > max)) max = y;
  }
  return max;
}

export function googleRowFirstShownYmd(row: GoogleAdRow): string | null {
  const direct = parseYmdFromLooseDate(row.firstShown ?? undefined);
  if (direct) return direct;
  if (row.type === "google") {
    const fromSummary = parseGoogleShownSummaryRange(row.shownSummary);
    if (fromSummary.first) return fromSummary.first;
  }
  return null;
}

function googleYmdToUtcCalendar(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcCalendarFromNowMs(nowMs: number): number {
  const n = new Date(nowMs);
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

/** Whole UTC calendar days from first shown through last shown (or today when still visible). */
export function computeGoogleAdRunDays(
  row: GoogleAdRow,
  nowMs = Date.now(),
  forceRunning = false
): number {
  const firstYmd = googleRowFirstShownYmd(row);
  if (!firstYmd) return 0;
  const startCal = googleYmdToUtcCalendar(firstYmd);
  const active = forceRunning || isGoogleAdRowActive(row, nowMs);
  let endCal = utcCalendarFromNowMs(nowMs);
  if (!active) {
    const lastYmd = googleRowLastShownYmd(row);
    if (lastYmd) endCal = googleYmdToUtcCalendar(lastYmd);
  }
  return Math.max(0, Math.floor((endCal - startCal) / (24 * 60 * 60 * 1000)));
}

export function isGoogleAdKilled(row: GoogleAdRow, nowMs = Date.now()): boolean {
  return !isGoogleAdRowActive(row, nowMs);
}

/**
 * Aligns with ad-detail `is_killed` and library card `runStatus`: scrape recency first,
 * then Transparency `lastShown` visibility window.
 */
export function isGoogleAdActiveFromScrapeRow(
  payload: unknown,
  lastSeenAt: string | null | undefined,
  lastScrapedAt: string | null | undefined,
  isActive?: boolean | null,
  nowMs = Date.now()
): boolean {
  if (isActive === true) return true;
  if (isScrapedAdRunning(lastSeenAt, lastScrapedAt, nowMs)) return true;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return isGoogleAdRowActive(payload as GoogleAdRow, nowMs);
  }
  return false;
}

export type LibraryRunStatusLookup = (
  platform: string,
  libraryItemId: string
) => { isRunning: boolean } | undefined;

/** Count Google/YouTube rows using bulk lifecycle when available (matches library badges). */
export function countActiveGoogleRowsWithLifecycle(
  rows: GoogleAdRow[],
  runStatus?: LibraryRunStatusLookup,
  nowMs = Date.now()
): number {
  let count = 0;
  for (const row of rows) {
    const platform = row.type === "youtube" ? "youtube" : "google";
    const status = runStatus?.(platform, row.id);
    if (status != null) {
      if (status.isRunning) count++;
      continue;
    }
    if (isGoogleAdRowActive(row, nowMs)) count++;
  }
  return count;
}

/**
 * Google Transparency `lastShown` is the end of the visibility window (not “last seen today”).
 * Active when that end date is today or in the future (UTC).
 */
export function isGoogleAdRowActive(row: GoogleAdRow, nowMs = Date.now()): boolean {
  const today = utcTodayYmd(nowMs);
  const lastYmd = googleRowLastShownYmd(row);
  if (lastYmd && lastYmd >= today) return true;
  const firstYmd = googleRowFirstShownYmd(row);
  if (firstYmd && firstYmd >= today) return true;
  return false;
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

export type ScrapeRowActiveContext = {
  lastSeenAt?: string | null;
  isActive?: boolean | null;
  lastScrapedAt?: string | null;
};

export function isAdActiveFromRawPayload(
  platform: AdsLibraryPlatform,
  raw: unknown,
  nowMs = Date.now(),
  scrapeAtMs?: number,
  scrapeRow?: ScrapeRowActiveContext
): boolean {
  if (!raw || typeof raw !== "object") return false;
  const lastScrapedAt =
    scrapeRow?.lastScrapedAt ??
    (scrapeAtMs != null && Number.isFinite(scrapeAtMs) ? new Date(scrapeAtMs).toISOString() : null);
  switch (platform) {
    case "meta":
      return isMetaAdActive(raw as MetaAdCard, scrapeAtMs, nowMs);
    case "google":
      return isGoogleAdActiveFromScrapeRow(
        raw,
        scrapeRow?.lastSeenAt,
        lastScrapedAt,
        scrapeRow?.isActive,
        nowMs
      );
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

export function countActiveMetaAds(ads: MetaAdCard[], scrapeAtMs?: number, nowMs = Date.now()): number {
  return ads.filter((a) => isMetaAdActive(a, scrapeAtMs, nowMs)).length;
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
  options?: { metaScrapeAtMs?: number; nowMs?: number }
): ActiveAdCounts {
  const nowMs = options?.nowMs ?? Date.now();
  return {
    meta: countActiveMetaAds(out.meta?.ads ?? [], options?.metaScrapeAtMs, nowMs),
    google: countActiveGoogleRows(out.google?.rows ?? [], nowMs),
    linkedin: countActiveLinkedInAds(out.linkedin?.ads ?? [], nowMs),
    tiktok: countActiveTikTokAds(out.tiktok?.ads ?? [], nowMs),
    pinterest: countActivePinterestAds(out.pinterest?.ads ?? [], nowMs),
    snapchat: countActiveSnapchatAds(out.snapchat?.ads ?? []),
  };
}

export function countActiveAdsFromRawPayloads(
  rows: {
    platform: string;
    raw_payload: unknown;
    last_seen_at?: string | null;
    is_active?: boolean | null;
  }[],
  options?: { lastScrapedAt?: string | null; nowMs?: number }
): ActiveAdCounts {
  const nowMs = options?.nowMs ?? Date.now();
  const scrapeCtx: ScrapeRowActiveContext = { lastScrapedAt: options?.lastScrapedAt ?? null };
  const counts: ActiveAdCounts = {};
  for (const row of rows) {
    const pl = row.platform;
    let bucket: AdsLibraryPlatform;
    let active = false;
    const rowCtx: ScrapeRowActiveContext = {
      ...scrapeCtx,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active,
    };
    if (pl === "youtube") {
      bucket = "google";
      active = isGoogleAdActiveFromScrapeRow(
        row.raw_payload,
        row.last_seen_at,
        scrapeCtx.lastScrapedAt,
        row.is_active,
        nowMs
      );
    } else {
      bucket = pl as AdsLibraryPlatform;
      active = isAdActiveFromRawPayload(bucket, row.raw_payload, nowMs, undefined, rowCtx);
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
