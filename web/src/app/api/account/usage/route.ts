import { NextResponse } from "next/server";
import {
  getBillingEntitlement,
  remainingMonthlyAdsProcessed,
} from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countWatchedCompetitorSlotsForUser } from "@/lib/billing/brand-competitor-slots";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const sessionUserId = user.id;
  const dataUserId = ctx.dataUserId;
  const yearMonthUtc = utcYearMonth();

  const [scrapedAdsRes, cacheRowsRes, overviewRes, billing, monthlyUsage, slotCount] = await Promise.all([
    supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", dataUserId)
      .eq("is_active", true),
    supabase.from("ads_cache").select("id", { count: "exact", head: true }).eq("user_id", dataUserId),
    supabase.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", dataUserId),
    getBillingEntitlement(supabase, sessionUserId),
    loadMonthlyUsageSnapshot(supabase, sessionUserId, yearMonthUtc),
    countWatchedCompetitorSlotsForUser(supabase, dataUserId),
  ]);

  const ownerBilling = ctx.isViewer
    ? await getBillingEntitlement(supabase, dataUserId)
    : billing;

  const competitorsWatched = slotCount.count;
  const scrapedAdsTotal = scrapedAdsRes.count ?? 0;
  const adLibraryRefreshes = cacheRowsRes.count ?? 0;

  const aiStrategyOverviews = overviewRes.count ?? 0;

  const competitorLimits = ownerBilling.limits;

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
      limits: competitorLimits,
      remaining: {
        adsProcessedThisMonth: remainingMonthlyAdsProcessed(
          monthlyUsage.adsScraped,
          0,
          billing.limits.maxAdsProcessedPerMonth,
        ),
        competitorsWatched: Math.max(0, competitorLimits.maxWatchedCompetitors - competitorsWatched),
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
        competitorsWatched: Math.max(0, competitorLimits.maxWatchedCompetitors - competitorsWatched),
        swapsThisMonth: Math.max(0, billing.limits.maxSwapsPerMonth - monthlyUsage.swapCount),
        csvExportsThisMonth: Math.max(
          0,
          billing.limits.csvExportsPerMonth - monthlyUsage.csvExportCount,
        ),
      },
    },
  });
}
