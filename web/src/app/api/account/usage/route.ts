import { NextResponse } from "next/server";
import {
  getBillingEntitlement,
  remainingMonthlyAdsProcessed,
} from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

function countAdsInPayload(ads_data: Json | null | undefined): number {
  if (!ads_data || typeof ads_data !== "object" || ads_data === null) return 0;
  const ads = (ads_data as { ads?: unknown }).ads;
  return Array.isArray(ads) ? ads.length : 0;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const yearMonthUtc = utcYearMonth();

  const [competitorsRes, cacheRes, overviewRes, billing, monthlyUsage] = await Promise.all([
    supabase
      .from("saved_competitors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_workspace_brand", false),
    supabase.from("ads_cache").select("ads_data").eq("user_id", userId),
    supabase.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getBillingEntitlement(supabase, userId),
    loadMonthlyUsageSnapshot(supabase, userId, yearMonthUtc),
  ]);

  const competitorsWatched = competitorsRes.count ?? 0;

  let scrapedAdsTotal = 0;
  const rows = cacheRes.data ?? [];
  for (const row of rows) {
    scrapedAdsTotal += countAdsInPayload(row.ads_data as Json);
  }

  const aiStrategyOverviews = overviewRes.count ?? 0;

  return NextResponse.json({
    ok: true,
    usage: {
      scrapedAdsTotal,
      scrapedAdsThisMonth: monthlyUsage.adsScraped,
      adLibraryScrapeRunsThisMonth: monthlyUsage.scrapeOperations,
      competitorsWatched,
      aiStrategyOverviews,
      adLibraryRefreshes: rows.length,
      swapsThisMonth: monthlyUsage.swapCount,
      csvExportsThisMonth: monthlyUsage.csvExportCount,
      limits: billing.limits,
      remaining: {
        adsProcessedThisMonth: remainingMonthlyAdsProcessed(
          monthlyUsage.adsScraped,
          0,
          billing.limits.maxAdsProcessedPerMonth,
        ),
        competitorsWatched: Math.max(0, billing.limits.maxWatchedCompetitors - competitorsWatched),
        swapsThisMonth: Math.max(0, billing.limits.maxSwapsPerMonth - monthlyUsage.swapCount),
        csvExportsThisMonth: Math.max(
          0,
          billing.limits.csvExportsPerMonth - monthlyUsage.csvExportCount,
        ),
      },
    },
    billing: {
      hasAccess: billing.hasAccess,
      isUnlimited: billing.isUnlimited,
      status: billing.status,
      planTier: billing.planTier,
      planName: billing.planName,
      polarProductId: billing.polarProductId,
      trialEnd: billing.trialEnd,
      currentPeriodEnd: billing.currentPeriodEnd,
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
      canUseDevPlanSwitcher: billing.canUseDevPlanSwitcher,
      devPlanOverride: billing.devPlanOverride,
      limits: billing.limits,
      remaining: {
        adsProcessedThisMonth: remainingMonthlyAdsProcessed(
          monthlyUsage.adsScraped,
          0,
          billing.limits.maxAdsProcessedPerMonth,
        ),
        competitorsWatched: Math.max(0, billing.limits.maxWatchedCompetitors - competitorsWatched),
        swapsThisMonth: Math.max(0, billing.limits.maxSwapsPerMonth - monthlyUsage.swapCount),
        csvExportsThisMonth: Math.max(
          0,
          billing.limits.csvExportsPerMonth - monthlyUsage.csvExportCount,
        ),
      },
    },
  });
}
