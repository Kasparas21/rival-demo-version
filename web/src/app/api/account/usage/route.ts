import { NextResponse } from "next/server";
import { getBillingEntitlement, remainingMonthlyScrapeRuns } from "@/lib/billing/entitlements";
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
  const yearMonthUtc = new Date().toISOString().slice(0, 7);

  const [competitorsRes, cacheRes, overviewRes, monthUsageRes, billing] = await Promise.all([
    supabase.from("saved_competitors").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ads_cache").select("ads_data").eq("user_id", userId),
    supabase.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("monthly_scrape_usage")
      .select("ads_scraped, scrape_operations")
      .eq("user_id", userId)
      .eq("year_month", yearMonthUtc)
      .maybeSingle(),
    getBillingEntitlement(supabase, userId),
  ]);

  const competitorsWatched = competitorsRes.count ?? 0;

  let scrapedAdsTotal = 0;
  const rows = cacheRes.data ?? [];
  for (const row of rows) {
    scrapedAdsTotal += countAdsInPayload(row.ads_data as Json);
  }

  const aiStrategyOverviews = overviewRes.count ?? 0;
  const monthRow = monthUsageRes.data;

  return NextResponse.json({
    ok: true,
    usage: {
      scrapedAdsTotal,
      /** Ads fetched via Apify this calendar month (UTC), across all competitors. */
      scrapedAdsThisMonth: monthRow?.ads_scraped ?? 0,
      /** Distinct platform scrape runs this month (UTC) that were not served from cache. */
      adLibraryScrapeRunsThisMonth: monthRow?.scrape_operations ?? 0,
      competitorsWatched,
      /** AI-generated strategy summaries (token / compute cost); good limit candidate */
      aiStrategyOverviews,
      adLibraryRefreshes: rows.length,
      limits: billing.limits,
      remaining: {
        adLibraryScrapeRunsThisMonth: remainingMonthlyScrapeRuns(monthRow?.scrape_operations ?? 0),
        competitorsWatched: Math.max(0, billing.limits.maxWatchedCompetitors - competitorsWatched),
      },
    },
    billing: {
      hasAccess: billing.hasAccess,
      status: billing.status,
      planName: billing.planName,
      polarProductId: billing.polarProductId,
      trialEnd: billing.trialEnd,
      currentPeriodEnd: billing.currentPeriodEnd,
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
      limits: billing.limits,
      remaining: {
        adLibraryScrapeRunsThisMonth: remainingMonthlyScrapeRuns(monthRow?.scrape_operations ?? 0),
        competitorsWatched: Math.max(0, billing.limits.maxWatchedCompetitors - competitorsWatched),
      },
    },
  });
}
