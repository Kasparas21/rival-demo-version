import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { stableAdKeyForGoogleRow, stableAdKeyForLibraryItem } from "@/lib/ad-library/stable-ad-keys";
import { scheduleActivityScoreRecompute } from "@/lib/activity-score/schedule-recompute";
import type { Database } from "@/lib/supabase/types";
import { sanitizeJsonForPostgres } from "@/lib/json/sanitize-json-for-db";

type ScrapedAdInsert = Database["public"]["Tables"]["scraped_ads"]["Insert"];

const DB_PLATFORMS_FOR_LIBRARY_PLATFORM: Record<AdsLibraryPlatform, string[]> = {
  meta: ["meta"],
  google: ["google", "youtube"],
  linkedin: ["linkedin"],
  tiktok: ["tiktok"],
  microsoft: ["microsoft"],
  pinterest: ["pinterest"],
  snapchat: ["snapchat"],
};

function joinedText(parts: (string | null | undefined)[]): string {
  const body = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return body || "—";
}

function normalizeCreativeFormat(
  raw: string | undefined,
  fallback: "image" | "video" | "text"
): string {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "video" || t === "image" || t === "text" || t === "carousel") return t;
  return fallback;
}

/** Apify Meta timestamps are UNIX seconds; some sources may use ms. */
function unixishToIso(u: number | undefined, fallbackIso: string): string {
  if (u == null || !Number.isFinite(u)) return fallbackIso;
  const ms = u > 1e12 ? u : u * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return fallbackIso;
  return d.toISOString();
}

function looseDateToIso(label: string | null | undefined, fallbackIso: string): string {
  if (!label?.trim()) return fallbackIso;
  const d = new Date(label.trim());
  if (Number.isNaN(d.getTime())) return fallbackIso;
  return d.toISOString();
}

const SOON_MS = 86400000; // reject dates clearly in the future (clock skew)

function coerceUnknownToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isUnrealisticFuture(d: Date): boolean {
  return d.getTime() > Date.now() + SOON_MS;
}

/**
 * Best-effort platform launch / start time from Apify / normalized ad row.
 * Returns null when nothing trustworthy is found or the date is in the future.
 */
export function extractLaunchDate(rawAd: unknown, platform: string): Date | null {
  const raw =
    rawAd && typeof rawAd === "object"
      ? (rawAd as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const p = platform.trim().toLowerCase();

  const tryKeys = (keys: string[]): Date | null => {
    for (const k of keys) {
      const d = coerceUnknownToDate(raw[k]);
      if (d && !isUnrealisticFuture(d)) return d;
    }
    return null;
  };

  let d: Date | null = null;
  switch (p) {
    case "meta":
      d = tryKeys(["ad_creation_time", "start_date", "started_running_on", "startedAt"]);
      break;
    case "google":
      d = tryKeys(["first_shown", "start_date", "lastShownLabel"]);
      break;
    case "youtube":
      d = tryKeys(["first_shown", "start_date", "create_time"]);
      break;
    case "tiktok":
      d = tryKeys(["first_shown_date", "create_time", "firstShown", "lastShown"]);
      break;
    case "linkedin":
      d = tryKeys(["firstImpression", "start_date", "firstShown", "create_time"]);
      break;
    case "snapchat":
      d = tryKeys(["creation_time", "start_date", "startDateLabel"]);
      break;
    case "reddit":
      d = tryKeys(["created_utc", "start_date", "created_at"]);
      break;
    default:
      d = tryKeys(["first_shown", "start_date", "creation_time", "create_time", "startedAt"]);
  }
  return d;
}

export function platformScrapeSucceeded(out: AdsLibraryResponse, p: AdsLibraryPlatform): boolean {
  switch (p) {
    case "meta":
      return out.meta.error == null;
    case "google":
      return out.google.error == null;
    case "linkedin":
      return out.linkedin.error == null;
    case "tiktok":
      return out.tiktok.error == null;
    case "microsoft":
      return out.microsoft.error == null;
    case "pinterest":
      return out.pinterest.error == null;
    case "snapchat":
      return out.snapchat.error == null;
    default:
      return false;
  }
}

export function countLibraryAdsForPlatform(platform: AdsLibraryPlatform, out: AdsLibraryResponse): number {
  switch (platform) {
    case "meta":
      return out.meta.ads?.length ?? 0;
    case "google":
      return out.google.rows?.length ?? 0;
    case "linkedin":
      return out.linkedin.ads?.length ?? 0;
    case "tiktok":
      return out.tiktok.ads?.length ?? 0;
    case "microsoft":
      return out.microsoft.ads?.length ?? 0;
    case "pinterest":
      return out.pinterest.ads?.length ?? 0;
    case "snapchat":
      return out.snapchat.ads?.length ?? 0;
    default:
      return 0;
  }
}

/**
 * Platforms to sync into `scraped_ads`: freshly scraped successes (including merges that retain
 * prior creatives when a run returns zero rows), plus cache-served platforms that have creatives in
 * `out` but no rows in `scraped_ads` yet. Upserts use stable_ad_key (no wholesale delete).
 */
export async function computePlatformsToPersist(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    platformsRequested: Set<AdsLibraryPlatform>;
    platformsNeedingScrape: Set<AdsLibraryPlatform>;
    out: AdsLibraryResponse;
  }
): Promise<Set<AdsLibraryPlatform>> {
  const { userId, competitorId, platformsRequested, platformsNeedingScrape, out } = params;

  const { data: existingRows } = await supabase
    .from("scraped_ads")
    .select("platform")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);

  const existingDb = new Set((existingRows ?? []).map((r) => r.platform));

  const outSet = new Set<AdsLibraryPlatform>();
  for (const p of platformsRequested) {
    if (!platformScrapeSucceeded(out, p)) continue;

    if (platformsNeedingScrape.has(p)) {
      outSet.add(p);
      continue;
    }

    if (countLibraryAdsForPlatform(p, out) === 0) continue;

    const dbKeys = DB_PLATFORMS_FOR_LIBRARY_PLATFORM[p];
    const hasRows = dbKeys.some((db) => existingDb.has(db));
    if (!hasRows) outSet.add(p);
  }

  return outSet;
}

export function buildScrapedAdInsertsForPlatform(params: {
  platform: AdsLibraryPlatform;
  out: AdsLibraryResponse;
  userId: string;
  competitorId: string;
  batchId: string;
  nowIso: string;
}): ScrapedAdInsert[] {
  const { platform, out, userId, competitorId, batchId, nowIso } = params;
  const base = { user_id: userId, competitor_id: competitorId, scrape_batch_id: batchId, is_active: true };

  switch (platform) {
    case "meta":
      return (out.meta.ads ?? []).map((ad) => ({
        ...base,
        platform: "meta",
        stable_ad_key: stableAdKeyForLibraryItem("meta", ad),
        ad_text: joinedText([ad.desc, ad.headline, ad.linkDescription, ad.cta]),
        ad_creative_url: ad.img?.trim() || ad.videoUrl?.trim() || null,
        format: ad.isVideo ? "video" : "image",
        first_seen_at: unixishToIso(ad.startedAt, nowIso),
        last_seen_at: unixishToIso(ad.endedAt, nowIso),
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "meta");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    case "google": {
      const rows: ScrapedAdInsert[] = [];
      for (const row of out.google.rows ?? []) {
        if (row.type === "google") {
          rows.push({
            ...base,
            platform: "google",
            stable_ad_key: stableAdKeyForGoogleRow(row),
            ad_text: joinedText([
              row.title,
              row.creativeCopy,
              row.desc,
              row.shownSummary,
              row.advertiserName,
            ]),
            ad_creative_url: row.img?.trim() || null,
            format: normalizeCreativeFormat(row.format, row.img ? "image" : "text"),
            first_seen_at: looseDateToIso(row.lastShownLabel, nowIso),
            last_seen_at: looseDateToIso(row.lastShownLabel, nowIso),
            ai_extracted_launch_date: (() => {
              const launch = extractLaunchDate(row, "google");
              return launch ? launch.toISOString() : null;
            })(),
            raw_payload: sanitizeJsonForPostgres(row),
          });
        } else {
          rows.push({
            ...base,
            platform: "youtube",
            stable_ad_key: stableAdKeyForGoogleRow(row),
            ad_text: joinedText([row.title, row.channel, row.views]),
            ad_creative_url: row.thumbnail?.trim() || null,
            format: "video",
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            ai_extracted_launch_date: (() => {
              const launch = extractLaunchDate(row, "youtube");
              return launch ? launch.toISOString() : null;
            })(),
            raw_payload: sanitizeJsonForPostgres(row),
          });
        }
      }
      return rows;
    }
    case "linkedin":
      return (out.linkedin.ads ?? []).map((ad) => ({
        ...base,
        platform: "linkedin",
        stable_ad_key: stableAdKeyForLibraryItem("linkedin", ad),
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "linkedin");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    case "tiktok":
      return (out.tiktok.ads ?? []).map((ad) => ({
        ...base,
        platform: "tiktok",
        stable_ad_key: stableAdKeyForLibraryItem("tiktok", ad),
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: "video",
        first_seen_at: looseDateToIso(ad.firstShown ?? ad.lastShown, nowIso),
        last_seen_at: looseDateToIso(ad.lastShown ?? ad.firstShown, nowIso),
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "tiktok");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    case "microsoft":
      return (out.microsoft.ads ?? []).map((ad) => ({
        ...base,
        platform: "microsoft",
        stable_ad_key: stableAdKeyForLibraryItem("microsoft", ad),
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.img?.trim() ? "image" : "text",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "microsoft");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    case "pinterest":
      return (out.pinterest.ads ?? []).map((ad) => ({
        ...base,
        platform: "pinterest",
        stable_ad_key: stableAdKeyForLibraryItem("pinterest", ad),
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "pinterest");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    case "snapchat":
      return (out.snapchat.ads ?? []).map((ad) => ({
        ...base,
        platform: "snapchat",
        stable_ad_key: stableAdKeyForLibraryItem("snapchat", ad),
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        ai_extracted_launch_date: (() => {
          const launch = extractLaunchDate(ad, "snapchat");
          return launch ? launch.toISOString() : null;
        })(),
        raw_payload: sanitizeJsonForPostgres(ad),
      }));
    default:
      return [];
  }
}

async function mergeFirstLastSeenFromExisting(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  inserts: ScrapedAdInsert[]
): Promise<void> {
  const byPl = new Map<string, ScrapedAdInsert[]>();
  for (const ins of inserts) {
    const pl = ins.platform;
    if (!byPl.has(pl)) byPl.set(pl, []);
    byPl.get(pl)!.push(ins);
  }

  const chunkSize = 100;
  for (const [pl, rows] of byPl) {
    const keys = [...new Set(rows.map((r) => r.stable_ad_key).filter(Boolean) as string[])];
    const prior = new Map<string, { first: string; last: string }>();
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      const { data } = await supabase
        .from("scraped_ads")
        .select("stable_ad_key, first_seen_at, last_seen_at")
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .eq("platform", pl)
        .in("stable_ad_key", chunk);
      for (const r of data ?? []) {
        if (r.stable_ad_key)
          prior.set(r.stable_ad_key, { first: r.first_seen_at, last: r.last_seen_at });
      }
    }
    for (const ins of rows) {
      const p = prior.get(ins.stable_ad_key ?? "");
      if (!p) continue;
      const iFirst = Date.parse(ins.first_seen_at);
      const pFirst = Date.parse(p.first);
      const iLast = Date.parse(ins.last_seen_at);
      const pLast = Date.parse(p.last);
      if (!Number.isNaN(pFirst) && !Number.isNaN(iFirst)) {
        ins.first_seen_at = new Date(Math.min(iFirst, pFirst)).toISOString();
      }
      if (!Number.isNaN(pLast) && !Number.isNaN(iLast)) {
        ins.last_seen_at = new Date(Math.max(iLast, pLast)).toISOString();
      }
    }
  }
}

/**
 * Writes row-level creatives to `scraped_ads` for the given platforms (fresh scrapes and/or
 * cache backfill). Upserts on `(user_id, competitor_id, platform, stable_ad_key)`.
 */
export type PersistScrapedAdsFromLibraryResult = {
  ok: boolean;
  errors: string[];
  rowsInserted: number;
};

export async function persistScrapedAdsFromAdsLibraryResponse(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    /** From `resolveAdsCacheDomainForUser` — required; row-level `scraped_ads` are keyed by competitor id. */
    competitorId: string | null;
    domainNorm: string;
    /** Platforms to write (from {@link computePlatformsToPersist}). */
    platformsToPersist: Iterable<AdsLibraryPlatform>;
    out: AdsLibraryResponse;
    nowIso: string;
    /** Use an existing scrape batch row (weekly cron); when omitted inserts `ads-library:…`. */
    scrapeBatchId?: string | null;
  }
): Promise<PersistScrapedAdsFromLibraryResult> {
  const { userId, competitorId, domainNorm, platformsToPersist, out, nowIso, scrapeBatchId } = params;
  const errors: string[] = [];
  let rowsInserted = 0;

  if (!competitorId) {
    return { ok: false, errors: ["missing_competitor_id"], rowsInserted: 0 };
  }

  const toPersist = [...platformsToPersist].filter((p) => platformScrapeSucceeded(out, p));
  if (toPersist.length === 0) {
    return { ok: true, errors: [], rowsInserted: 0 };
  }

  let batchId: string | undefined = scrapeBatchId?.trim() || undefined;

  if (!batchId) {
    const { data: batchRow, error: batchErr } = await supabase
      .from("scrape_batches")
      .insert({
        user_id: userId,
        competitor_id: competitorId,
        label: `ads-library:${domainNorm}:${nowIso}`,
      })
      .select("id")
      .single();

    if (batchErr || !batchRow?.id) {
      console.error("[persistScrapedAds] scrape_batches insert", batchErr);
      const msg = batchErr?.message ?? "scrape_batches insert failed";
      return { ok: false, errors: [`batch_insert: ${msg}`], rowsInserted: 0 };
    }
    batchId = batchRow.id;
  }

  if (!batchId) {
    console.error("[persistScrapedAds] missing scrape batch id");
    return { ok: false, errors: ["missing_scrape_batch_id"], rowsInserted: 0 };
  }

  for (const platform of toPersist) {
    const inserts = buildScrapedAdInsertsForPlatform({
      platform,
      out,
      userId,
      competitorId,
      batchId,
      nowIso,
    });
    if (inserts.length === 0) {
      console.error("[persistScrapedAds] zero inserts built for platform", { platform, domainNorm });
      continue;
    }

    const launchExtracted = inserts.filter((r) => r.ai_extracted_launch_date != null).length;
    console.log("[persist] launch dates extracted=", launchExtracted, "/", inserts.length);

    await mergeFirstLastSeenFromExisting(supabase, userId, competitorId, inserts);
    const chunkSize = 75;
    for (let offset = 0; offset < inserts.length; offset += chunkSize) {
      const slice = inserts.slice(offset, offset + chunkSize);
      const { error: upsertErr } = await supabase.from("scraped_ads").upsert(slice, {
        onConflict: "user_id,competitor_id,platform,stable_ad_key",
      });
      if (upsertErr) {
        console.error("[persistScrapedAds] scraped_ads upsert", upsertErr);
        errors.push(`upsert_${platform}: ${upsertErr.message}`);
        break;
      }
      rowsInserted += slice.length;
    }
  }

  if (errors.length === 0 && rowsInserted > 0) {
    scheduleActivityScoreRecompute(userId, competitorId);
  }

  return { ok: errors.length === 0, errors, rowsInserted };
}
