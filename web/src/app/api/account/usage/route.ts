import { NextResponse } from "next/server";
import {
  getBillingEntitlement,
  remainingMonthlyAdsProcessed,
} from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const [competitorsRes, scrapedAdsRes, cacheRowsRes, overviewRes, billing, monthlyUsage] = await Promise.all([
    supabase
      .from("saved_competitors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_workspace_brand", false),
    supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase.from("ads_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getBillingEntitlement(supabase, userId),
    loadMonthlyUsageSnapshot(supabase, userId, yearMonthUtc),
  ]);

  const competitorsWatched = competitorsRes.count ?? 0;
  const scrapedAdsTotal = scrapedAdsRes.count ?? 0;
  const adLibraryRefreshes = cacheRowsRes.count ?? 0;

  const aiStrategyOverviews = overviewRes.count ?? 0;

  return NextResponse.json({
    ok: true,
    usage: {
      scrapedAdsTotal,
      scrapedAdsThisMonth: monthlyUsage.adsScraped,
      adLibraryScrapeRunsThisMonth: monthlyUsage.scrapeOperations,
      competitorsWatched,
      aiStrategyOverviews,
      adLibraryRefreshes,
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
      polarSubscriptionId: billing.polarSubscriptionId,
      hasPolarBillingRecord: billing.hasPolarBillingRecord,
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
