import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveBrandScale, normalizePlatform } from "@/lib/strategy-overview/brand-scale-score";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import type { Database } from "@/lib/supabase/types";

import {
  FOOTPRINT_MAX_AGE_DAYS,
  LIVE_AD_RECENCY_DAYS,
} from "@/lib/spend-estimator/constants";
import { hasImpressionBandInPayload } from "@/lib/spend-estimator/impression-band";
import { liveCreativeGroupsPerPlatform } from "@/lib/spend-estimator/live-creatives";
import type { BrandFootprint, FootprintAdInput, PlatformStats, SupportedPlatform } from "@/lib/spend-estimator/types";

const SUPPORTED: ReadonlySet<string> = new Set<SupportedPlatform>([
  "meta",
  "google",
  "youtube",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
  "microsoft",
]);

export function toSupportedPlatform(platform: string): SupportedPlatform | null {
  const p = platform.toLowerCase().trim() as SupportedPlatform;
  return SUPPORTED.has(p) ? p : null;
}

function daysBetween(firstIso: string, lastIso: string): number {
  const a = Date.parse(firstIso);
  const b = Date.parse(lastIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  const d = Math.max(1, Math.round((b - a) / 86_400_000) + 1);
  return Math.min(d, 365);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base]!;
  const hi = sorted[Math.min(base + 1, sorted.length - 1)]!;
  return lo + rest * (hi - lo);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function cutoffIso(maxAgeDays: number, nowMs: number): string {
  return new Date(nowMs - maxAgeDays * 86_400_000).toISOString();
}

function inFootprintWindow(row: FootprintAdInput, cutoff: string): boolean {
  const last = Date.parse(row.last_seen_at);
  const first = Date.parse(row.first_seen_at);
  const cutoffT = Date.parse(cutoff);
  if (!Number.isFinite(cutoffT)) return true;
  const lastOk = Number.isFinite(last) && last >= cutoffT;
  const firstOk = Number.isFinite(first) && first >= cutoffT;
  return lastOk || firstOk;
}

export type BuildBrandFootprintContext = {
  competitorId: string;
  userId: string;
  brandName: string;
  brandDomain: string | null;
  lastScrapedAt: string | null;
};

/**
 * Pure footprint from ad rows already loaded (e.g. Strategy Overview recompute).
 * `brandScaleScore` should match {@link deriveBrandScale} on the same ad universe as Strategy Map.
 */
export function buildBrandFootprintFromAds(
  ads: FootprintAdInput[],
  ctx: BuildBrandFootprintContext,
  brandScaleScore: number,
  opts?: {
    nowMs?: number;
    maxFootprintAgeDays?: number;
    /** @deprecated live window is always {@link LIVE_AD_RECENCY_DAYS} */
    activeRecencyDays?: number;
  }
): BrandFootprint | null {
  const nowMs = opts?.nowMs ?? Date.now();
  const maxAge = opts?.maxFootprintAgeDays ?? FOOTPRINT_MAX_AGE_DAYS;
  const liveRecency = opts?.activeRecencyDays ?? LIVE_AD_RECENCY_DAYS;
  const cutoff = cutoffIso(maxAge, nowMs);
  const windowed = ads.filter((a) => inFootprintWindow(a, cutoff));
  if (windowed.length === 0) return null;

  const bySp = new Map<SupportedPlatform, FootprintAdInput[]>();
  for (const row of windowed) {
    const sp = toSupportedPlatform(row.platform);
    if (!sp) continue;
    if (!bySp.has(sp)) bySp.set(sp, []);
    bySp.get(sp)!.push(row);
  }
  if (bySp.size === 0) return null;

  const thirtyAgo = nowMs - 30 * 86_400_000;
  const ninetyAgo = nowMs - 90 * 86_400_000;

  const platform_stats: PlatformStats[] = [];

  for (const [platform, list] of bySp) {
    const liveGroupsMap = liveCreativeGroupsPerPlatform(list, nowMs, liveRecency);
    const liveGroups = liveGroupsMap.get(platform) ?? [];
    const active_ads = liveGroups.length;

    const dayVals = liveGroups
      .map((g) =>
        daysBetween(new Date(g.firstSeenMinMs).toISOString(), new Date(g.lastSeenMaxMs).toISOString())
      )
      .sort((a, b) => a - b);
    const median_days_active = median(dayVals);
    const p25_days_active = percentile(dayVals, 0.25);
    const p75_days_active = percentile(dayVals, 0.75);

    let new30 = 0;
    let new90 = 0;
    let has_impression_band = false;
    for (const g of liveGroups) {
      if (g.firstSeenMinMs >= thirtyAgo) new30 += 1;
      if (g.firstSeenMinMs >= ninetyAgo) new90 += 1;
      if (hasImpressionBandInPayload(g.representative.raw_payload, platform)) has_impression_band = true;
    }

    platform_stats.push({
      platform,
      active_ads,
      median_days_active,
      p25_days_active,
      p75_days_active,
      new_creatives_30d: new30,
      new_creatives_90d: new90,
      has_impression_band,
    });
  }

  platform_stats.sort((a, b) => a.platform.localeCompare(b.platform));

  return {
    competitor_id: ctx.competitorId,
    user_id: ctx.userId,
    brand_domain: ctx.brandDomain,
    brand_name: ctx.brandName,
    last_scraped_at: ctx.lastScrapedAt,
    platform_stats,
    brand_scale_score: brandScaleScore,
  };
}

/** Loads competitor + scraped_ads and builds a footprint. */
export async function computeBrandFootprint(params: {
  supabase: SupabaseClient<Database>;
  competitorId: string;
  userId: string;
}): Promise<BrandFootprint | null> {
  const { supabase, competitorId, userId } = params;

  const { data: comp } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, name, brand_domain, last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!comp) return null;

  const brandName = comp.brand_name?.trim() || comp.name;
  const cutoff = cutoffIso(FOOTPRINT_MAX_AGE_DAYS, Date.now());

  const { data: rows, error } = await supabase
    .from("scraped_ads")
    .select("id, platform, first_seen_at, last_seen_at, is_active, raw_payload")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .or(`last_seen_at.gte.${cutoff},first_seen_at.gte.${cutoff}`);

  if (error || !rows?.length) return null;

  const footprintRows: FootprintAdInput[] = rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));

  const brandAdsForScale = footprintRows.map((a) => ({
    platform: a.platform,
    first_seen_at: a.first_seen_at,
    last_seen_at: a.last_seen_at,
  }));
  const byPlScale = new Map<StrategyPlatform, typeof brandAdsForScale>();
  for (const a of brandAdsForScale) {
    const pl = normalizePlatform(a.platform);
    if (!byPlScale.has(pl)) byPlScale.set(pl, []);
    byPlScale.get(pl)!.push(a);
  }
  const brandScaleScore = deriveBrandScale(brandAdsForScale, byPlScale);

  return buildBrandFootprintFromAds(
    footprintRows,
    {
      competitorId: comp.id,
      userId,
      brandName,
      brandDomain: comp.brand_domain,
      lastScrapedAt: comp.last_scraped_at,
    },
    brandScaleScore
  );
}
