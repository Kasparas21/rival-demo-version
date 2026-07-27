import { NextResponse } from "next/server";
import {
  getBillingEntitlement,
  remainingMonthlyAdsProcessed,
} from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { countWatchedCompetitorSlotsForUser } from "@/lib/billing/brand-competitor-slots";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
import type { WorkspaceContext } from "@/lib/team/workspace-context";

export async function GET() {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);
  const sessionUserId = user?.id ?? dataUserId;
  const yearMonthUtc = utcYearMonth();

  const [scrapedAdsRes, cacheRowsRes, overviewRes, billing, monthlyUsage, slotCount] = await Promise.all([
    db
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", dataUserId)
      .eq("is_active", true),
    db.from("ads_cache").select("id", { count: "exact", head: true }).eq("user_id", dataUserId),
    db.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", dataUserId),
    getBillingEntitlement(db, sessionUserId),
    loadMonthlyUsageSnapshot(db, sessionUserId, yearMonthUtc),
    countWatchedCompetitorSlotsForUser(db, dataUserId),
  ]);

  const ownerBilling = ctx.isViewer
    ? await getBillingEntitlement(db, dataUserId)
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
      isAdminSuspended: billing.isAdminSuspended,
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
