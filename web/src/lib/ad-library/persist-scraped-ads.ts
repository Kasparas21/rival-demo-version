import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import type { Database, Json } from "@/lib/supabase/types";

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
 * Platforms to sync into `scraped_ads`: always those freshly scraped (so zero-ad runs clear rows),
 * plus cache-served platforms that have creatives in `out` but no rows in `scraped_ads` yet.
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
        ad_text: joinedText([ad.desc, ad.headline, ad.linkDescription, ad.cta]),
        ad_creative_url: ad.img?.trim() || ad.videoUrl?.trim() || null,
        format: ad.isVideo ? "video" : "image",
        first_seen_at: unixishToIso(ad.startedAt, nowIso),
        last_seen_at: unixishToIso(ad.endedAt, nowIso),
        raw_payload: ad as unknown as Json,
      }));
    case "google": {
      const rows: ScrapedAdInsert[] = [];
      for (const row of out.google.rows ?? []) {
        if (row.type === "google") {
          rows.push({
            ...base,
            platform: "google",
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
            raw_payload: row as unknown as Json,
          });
        } else {
          rows.push({
            ...base,
            platform: "youtube",
            ad_text: joinedText([row.title, row.channel, row.views]),
            ad_creative_url: row.thumbnail?.trim() || null,
            format: "video",
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            raw_payload: row as unknown as Json,
          });
        }
      }
      return rows;
    }
    case "linkedin":
      return (out.linkedin.ads ?? []).map((ad) => ({
        ...base,
        platform: "linkedin",
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        raw_payload: ad as unknown as Json,
      }));
    case "tiktok":
      return (out.tiktok.ads ?? []).map((ad) => ({
        ...base,
        platform: "tiktok",
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: "video",
        first_seen_at: looseDateToIso(ad.firstShown ?? ad.lastShown, nowIso),
        last_seen_at: looseDateToIso(ad.lastShown ?? ad.firstShown, nowIso),
        raw_payload: ad as unknown as Json,
      }));
    case "microsoft":
      return (out.microsoft.ads ?? []).map((ad) => ({
        ...base,
        platform: "microsoft",
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.img?.trim() ? "image" : "text",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        raw_payload: ad as unknown as Json,
      }));
    case "pinterest":
      return (out.pinterest.ads ?? []).map((ad) => ({
        ...base,
        platform: "pinterest",
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        raw_payload: ad as unknown as Json,
      }));
    case "snapchat":
      return (out.snapchat.ads ?? []).map((ad) => ({
        ...base,
        platform: "snapchat",
        ad_text: joinedText([ad.headline, ad.desc]),
        ad_creative_url: ad.img?.trim() || null,
        format: ad.videoUrl ? "video" : "image",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        raw_payload: ad as unknown as Json,
      }));
    default:
      return [];
  }
}

/**
 * Writes row-level creatives to `scraped_ads` for the given platforms (fresh scrapes and/or
 * cache backfill). Replaces prior rows for the same competitor + platform keys.
 */
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
  }
): Promise<void> {
  const { userId, competitorId, domainNorm, platformsToPersist, out, nowIso } = params;

  if (!competitorId) {
    return;
  }

  const toPersist = [...platformsToPersist].filter((p) => platformScrapeSucceeded(out, p));
  if (toPersist.length === 0) return;

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
    return;
  }
  const batchId = batchRow.id;

  for (const platform of toPersist) {
    const dbKeys = DB_PLATFORMS_FOR_LIBRARY_PLATFORM[platform];
    for (const dbPlatform of dbKeys) {
      const { error: delErr } = await supabase
        .from("scraped_ads")
        .delete()
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .eq("platform", dbPlatform);
      if (delErr) {
        console.error("[persistScrapedAds] scraped_ads delete", delErr);
        return;
      }
    }

    const inserts = buildScrapedAdInsertsForPlatform({
      platform,
      out,
      userId,
      competitorId,
      batchId,
      nowIso,
    });
    const chunkSize = 75;
    for (let offset = 0; offset < inserts.length; offset += chunkSize) {
      const slice = inserts.slice(offset, offset + chunkSize);
      const { error: insErr } = await supabase.from("scraped_ads").insert(slice);
      if (insErr) {
        console.error("[persistScrapedAds] scraped_ads insert", insErr);
        return;
      }
    }
  }
}
