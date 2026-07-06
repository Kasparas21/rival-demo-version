import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BENCHMARK_PLATFORM_LABELS,
  type BenchmarkPlatformId,
} from "@/lib/benchmark/benchmark-types";
import { buildBrandBenchmarkPayload } from "@/lib/benchmark/build-brand-benchmark";
import { parseOrganicSocials, hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { ORGANIC_PLATFORMS } from "@/lib/organic-content/types";
import type { Database } from "@/lib/supabase/types";

export type StrategyGapChannel = "paid" | "organic" | "website" | "email";

export type StrategyGapItem = {
  channel: StrategyGapChannel;
  title: string;
  detail: string;
  tab: string;
  sub?: string;
};

export type StrategyGapsPayload = {
  ok: true;
  computedAt: string;
  fingerprint: string;
  gaps: StrategyGapItem[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function organicGapItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  ownCompetitorId: string,
  rivalIds: string[],
): Promise<StrategyGapItem[]> {
  const gaps: StrategyGapItem[] = [];
  const { data: ownRow } = await supabase
    .from("saved_competitors")
    .select("socials")
    .eq("id", ownCompetitorId)
    .maybeSingle();

  const ownSocials = parseOrganicSocials(ownRow?.socials);
  if (!hasAnyOrganicSocial(ownSocials)) {
    gaps.push({
      channel: "organic",
      title: "Organic social not connected",
      detail: "Add your social handles so we can compare post frequency and content patterns against rivals.",
      tab: "organic",
      sub: "organic-settings",
    });
    return gaps;
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const allIds = [ownCompetitorId, ...rivalIds];

  const { data: posts } = await supabase
    .from("organic_posts")
    .select("competitor_id, platform, posted_at")
    .eq("user_id", userId)
    .in("competitor_id", allIds)
    .gte("posted_at", since);

  const countByEntity = new Map<string, number>();
  const platformsByEntity = new Map<string, Set<string>>();
  for (const p of posts ?? []) {
    countByEntity.set(p.competitor_id, (countByEntity.get(p.competitor_id) ?? 0) + 1);
    const set = platformsByEntity.get(p.competitor_id) ?? new Set<string>();
    if (p.platform) set.add(p.platform);
    platformsByEntity.set(p.competitor_id, set);
  }

  const ownCount = countByEntity.get(ownCompetitorId) ?? 0;
  const rivalCounts = rivalIds.map((id) => countByEntity.get(id) ?? 0);
  const rivalAvg = avg(rivalCounts) ?? 0;

  if (rivalAvg >= 4 && ownCount < rivalAvg * 0.5) {
    gaps.push({
      channel: "organic",
      title: "Posting less than competitors",
      detail: `You published ${ownCount} organic posts in 30 days vs ~${Math.round(rivalAvg)} average across rivals.`,
      tab: "organic",
      sub: "insights",
    });
  }

  const ownPlatforms = platformsByEntity.get(ownCompetitorId)?.size ?? 0;
  const rivalPlatformCounts = rivalIds.map((id) => platformsByEntity.get(id)?.size ?? 0);
  const maxRivalPlatforms = rivalPlatformCounts.length ? Math.max(...rivalPlatformCounts) : 0;
  const missingPlatforms = ORGANIC_PLATFORMS.filter((p) => !ownSocials[p]?.trim());
  if (maxRivalPlatforms > ownPlatforms && missingPlatforms.length > 0) {
    gaps.push({
      channel: "organic",
      title: "Fewer organic channels than rivals",
      detail: `Competitors are active on more platforms. Consider adding ${missingPlatforms.slice(0, 2).join(", ")}.`,
      tab: "organic",
      sub: "organic-settings",
    });
  }

  return gaps;
}

async function websiteGapItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  ownCompetitorId: string,
  rivalIds: string[],
): Promise<StrategyGapItem[]> {
  const gaps: StrategyGapItem[] = [];
  const allIds = [ownCompetitorId, ...rivalIds];

  const { data: pages } = await supabase
    .from("landing_pages")
    .select("competitor_id, id")
    .eq("user_id", userId)
    .in("competitor_id", allIds)
    .eq("is_active", true);

  const pageCount = new Map<string, number>();
  for (const p of pages ?? []) {
    pageCount.set(p.competitor_id, (pageCount.get(p.competitor_id) ?? 0) + 1);
  }

  const ownPages = pageCount.get(ownCompetitorId) ?? 0;
  if (ownPages === 0) {
    gaps.push({
      channel: "website",
      title: "No tracked website pages",
      detail: "Track your homepage and key landing pages to spot when rivals update theirs more often.",
      tab: "website",
      sub: "tracked",
    });
    return gaps;
  }

  const rivalPageCounts = rivalIds.map((id) => pageCount.get(id) ?? 0);
  const maxRival = rivalPageCounts.length ? Math.max(...rivalPageCounts) : 0;
  if (maxRival > ownPages + 1) {
    gaps.push({
      channel: "website",
      title: "Tracking fewer pages than competitors",
      detail: `You track ${ownPages} page${ownPages === 1 ? "" : "s"}; top rivals track up to ${maxRival}.`,
      tab: "website",
      sub: "tracked",
    });
  }

  return gaps;
}

async function emailGapItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  ownCompetitorId: string,
  rivalIds: string[],
): Promise<StrategyGapItem[]> {
  const gaps: StrategyGapItem[] = [];
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: ownEmails } = await supabase
    .from("competitor_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("competitor_id", ownCompetitorId)
    .gte("received_at", since);

  const ownCount = ownEmails?.length ?? 0;
  if (ownCount === 0) {
    gaps.push({
      channel: "email",
      title: "Email tracking not set up",
      detail: "Subscribe your newsletter to your tracking address to compare cadence and offers against rivals.",
      tab: "email-marketing",
      sub: "inbox",
    });
    return gaps;
  }

  let maxRival = 0;
  for (const rivalId of rivalIds) {
    const { count } = await supabase
      .from("competitor_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("competitor_id", rivalId)
      .gte("received_at", since);
    maxRival = Math.max(maxRival, count ?? 0);
  }

  if (maxRival > ownCount * 1.5 && maxRival >= 3) {
    gaps.push({
      channel: "email",
      title: "Sending less email than competitors",
      detail: `You captured ${ownCount} emails in 30 days; rivals sent up to ${maxRival}.`,
      tab: "email-marketing",
      sub: "insights",
    });
  }

  return gaps;
}

export async function buildStrategyGapsPayload(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  brandId?: string | null;
}): Promise<StrategyGapsPayload> {
  const { supabase, userId, brandId } = params;
  const { payload: benchmark } = await buildBrandBenchmarkPayload({
    supabase,
    userId,
    brandId,
    skipLlm: true,
  });

  const gaps: StrategyGapItem[] = [];
  const own = benchmark.ownBrand;
  const rivals = benchmark.competitors;
  const rivalIds = rivals.map((r) => r.id);

  for (const pl of benchmark.platformOpportunities ?? []) {
    const label = BENCHMARK_PLATFORM_LABELS[pl as BenchmarkPlatformId] ?? pl;
    const count = rivals.filter((r) => r.platformsActive[pl as BenchmarkPlatformId]).length;
    gaps.push({
      channel: "paid",
      title: `No ${label} ads detected`,
      detail:
        count >= 2
          ? `${count} competitors run ${label} — you don't yet.`
          : `A competitor runs ${label} ads — you don't yet.`,
      tab: "ads library",
      sub: "all",
    });
  }

  for (const angle of (benchmark.angleGaps ?? []).slice(0, 3)) {
    gaps.push({
      channel: "paid",
      title: `Angle gap: ${angle}`,
      detail: "Rivals use this messaging angle more than your current ad library shows.",
      tab: "insights",
      sub: "benchmark",
    });
  }

  const ownAdsRank = benchmark.rankings.activeAds.find((r) => r.entityId === own.id);
  if (ownAdsRank && ownAdsRank.percentile < 40 && rivals.length > 0) {
    gaps.push({
      channel: "paid",
      title: "Lower active ad volume than rivals",
      detail: benchmark.hero.biggestGapLine || "Expand creative testing or platform coverage.",
      tab: "insights",
      sub: "benchmark",
    });
  }

  const [organicGaps, websiteGaps, emailGaps] = await Promise.all([
    organicGapItems(supabase, userId, own.id, rivalIds),
    websiteGapItems(supabase, userId, own.id, rivalIds),
    emailGapItems(supabase, userId, own.id, rivalIds),
  ]);

  gaps.push(...organicGaps, ...websiteGaps, ...emailGaps);

  return {
    ok: true,
    computedAt: new Date().toISOString(),
    fingerprint: benchmark.combinedFingerprint,
    gaps: gaps.slice(0, 12),
  };
}
