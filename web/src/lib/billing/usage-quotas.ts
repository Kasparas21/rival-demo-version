import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { BillingEntitlement } from "@/lib/billing/entitlements";

export function utcYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export type MonthlyUsageSnapshot = {
  adsScraped: number;
  scrapeOperations: number;
  swapCount: number;
  csvExportCount: number;
  csvAdsExported: number;
  adPreviewAnalyses: number;
};

export async function loadMonthlyUsageSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
  yearMonth = utcYearMonth(),
): Promise<MonthlyUsageSnapshot> {
  const [scrapeRes, swapRes, csvRes, analysisRes] = await Promise.all([
    supabase
      .from("monthly_scrape_usage")
      .select("ads_scraped, scrape_operations")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle(),
    supabase
      .from("competitor_swap_usage")
      .select("swap_count")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle(),
    supabase
      .from("csv_export_usage")
      .select("export_count, ads_exported")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle(),
    supabase
      .from("ad_preview_analysis_usage")
      .select("analysis_count")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle(),
  ]);

  return {
    adsScraped: scrapeRes.data?.ads_scraped ?? 0,
    scrapeOperations: scrapeRes.data?.scrape_operations ?? 0,
    swapCount: swapRes.data?.swap_count ?? 0,
    csvExportCount: csvRes.data?.export_count ?? 0,
    csvAdsExported: csvRes.data?.ads_exported ?? 0,
    adPreviewAnalyses: analysisRes.data?.analysis_count ?? 0,
  };
}

export async function loadLifetimeScrapeOperations(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("monthly_scrape_usage")
    .select("scrape_operations")
    .eq("user_id", userId);

  return (data ?? []).reduce((sum, row) => sum + (row.scrape_operations ?? 0), 0);
}

export type FreeTrialScrapeCheck =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Free trial: exactly one fresh scrape run, ever, until upgrade. */
export async function checkFreeTrialScrapeAllowedForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  billing: BillingEntitlement,
  requestedOps: number,
): Promise<FreeTrialScrapeCheck> {
  if (billing.isUnlimited || billing.planTier !== "free_trial") {
    return { ok: true };
  }
  const cap = billing.limits.maxTotalScrapeOperations;
  if (cap == null) return { ok: true };

  const used = await loadLifetimeScrapeOperations(supabase, userId);
  if (used + requestedOps > cap) {
    return {
      ok: false,
      status: 402,
      error:
        used >= cap
          ? "Your free trial includes one competitor discovery scrape. Upgrade to Starter or Pro for ongoing refreshes."
          : "This scrape would exceed your free trial limit. Upgrade to continue.",
    };
  }
  return { ok: true };
}

export async function loadWorkspaceManualRefreshUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  yearMonth = utcYearMonth(),
): Promise<{ workspaceRefreshCount: number }> {
  const { data } = await supabase
    .from("manual_refresh_usage")
    .select("refresh_count")
    .eq("user_id", userId)
    .eq("year_month", yearMonth);

  const workspaceRefreshCount = (data ?? []).reduce(
    (sum, row) => sum + (row.refresh_count ?? 0),
    0,
  );
  return { workspaceRefreshCount };
}

export async function loadCompetitorLastManualRefreshAt(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  yearMonth = utcYearMonth(),
): Promise<string | null> {
  const { data } = await supabase
    .from("manual_refresh_usage")
    .select("last_refresh_at")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  return data?.last_refresh_at ?? null;
}

export async function loadManualRefreshUsageForCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  yearMonth = utcYearMonth(),
): Promise<{ workspaceRefreshCount: number; lastRefreshAtForCompetitor: string | null }> {
  const [workspace, lastRefreshAtForCompetitor] = await Promise.all([
    loadWorkspaceManualRefreshUsage(supabase, userId, yearMonth),
    loadCompetitorLastManualRefreshAt(supabase, userId, competitorId, yearMonth),
  ]);
  return {
    workspaceRefreshCount: workspace.workspaceRefreshCount,
    lastRefreshAtForCompetitor,
  };
}

export function canPerformManualRefresh(
  billing: BillingEntitlement,
  usage: { workspaceRefreshCount: number; lastRefreshAtForCompetitor: string | null },
): { ok: true } | { ok: false; error: string; status: number } {
  if (billing.isUnlimited) return { ok: true };
  if (!billing.limits.allowManualRefresh) {
    return {
      ok: false,
      status: 403,
      error: "Manual refresh is available on the Pro plan.",
    };
  }
  const limit = billing.limits.manualRefreshPerMonth;
  if (usage.workspaceRefreshCount >= limit) {
    return {
      ok: false,
      status: 402,
      error: `Manual refresh limit reached (${usage.workspaceRefreshCount}/${limit} this month).`,
    };
  }
  const lastAt = usage.lastRefreshAtForCompetitor;
  if (lastAt && billing.limits.manualRefreshMinIntervalMs > 0) {
    const elapsed = Date.now() - Date.parse(lastAt);
    if (elapsed < billing.limits.manualRefreshMinIntervalMs) {
      const remainingMs = billing.limits.manualRefreshMinIntervalMs - elapsed;
      const hours = Math.ceil(remainingMs / 3_600_000);
      return {
        ok: false,
        status: 429,
        error: `Please wait ${hours} hour(s) before refreshing this competitor again.`,
      };
    }
  }
  return { ok: true };
}

export async function loadAdPreviewAnalysisUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  yearMonth = utcYearMonth(),
): Promise<number> {
  const { data } = await supabase
    .from("ad_preview_analysis_usage")
    .select("analysis_count")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  return data?.analysis_count ?? 0;
}

export function canRunAdPreviewAnalysis(
  billing: BillingEntitlement,
  usedThisMonth: number,
): { ok: true; limit: number | null; remaining: number | null } | { ok: false; error: string; status: number } {
  if (billing.isUnlimited) {
    return { ok: true, limit: null, remaining: null };
  }

  const limit = billing.limits.maxAdPreviewAnalysesPerMonth;
  if (limit == null) {
    return { ok: true, limit: null, remaining: null };
  }

  if (limit <= 0) {
    return {
      ok: false,
      status: 402,
      error: "Ad preview AI analysis is available on Starter and Pro plans.",
    };
  }

  if (usedThisMonth >= limit) {
    return {
      ok: false,
      status: 402,
      error: `Monthly AI analysis limit reached (${usedThisMonth}/${limit}). Resets next UTC month.`,
    };
  }

  return { ok: true, limit, remaining: limit - usedThisMonth };
}

export async function loadEmailAiAnalysisUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  yearMonth = utcYearMonth(),
): Promise<number> {
  const { data } = await supabase
    .from("email_intelligence_analysis_usage")
    .select("analysis_count")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  return data?.analysis_count ?? 0;
}

export async function incrementEmailAiAnalysisUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc("increment_email_intelligence_analysis_usage", {
    p_user_id: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadActiveEmailTrackerCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("competitor_email_trackers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export function canCreateEmailTracker(
  billing: BillingEntitlement,
  activeTrackers: number,
): { ok: true } | { ok: false; error: string; status: number } {
  if (billing.isUnlimited) return { ok: true };
  if (!billing.limits.allowEmailMarketing) {
    return {
      ok: false,
      status: 403,
      error: "Email marketing is available on Starter and Pro plans.",
    };
  }
  const limit = billing.limits.maxEmailTrackers;
  if (limit == null) return { ok: true };
  if (activeTrackers >= limit) {
    return {
      ok: false,
      status: 402,
      error: `Email tracker limit reached (${activeTrackers}/${limit}). Upgrade for more competitors.`,
    };
  }
  return { ok: true };
}

export function canRunEmailAiAnalysis(
  billing: BillingEntitlement,
  usedThisMonth: number,
):
  | { ok: true; limit: number | null; remaining: number | null }
  | { ok: false; error: string; status: number; quotaExceeded: true } {
  if (billing.isUnlimited) {
    return { ok: true, limit: null, remaining: null };
  }

  if (!billing.limits.allowEmailMarketing) {
    return {
      ok: false,
      status: 403,
      error: "Email AI analysis is available on Starter and Pro plans.",
      quotaExceeded: true,
    };
  }

  const limit = billing.limits.maxEmailAiAnalysesPerMonth;
  if (limit == null) {
    return { ok: true, limit: null, remaining: null };
  }

  if (limit <= 0) {
    return {
      ok: false,
      status: 402,
      error: "Email AI analysis is not included on your plan.",
      quotaExceeded: true,
    };
  }

  if (usedThisMonth >= limit) {
    return {
      ok: false,
      status: 402,
      error: `Monthly email AI limit reached (${usedThisMonth}/${limit}). Resets next UTC month.`,
      quotaExceeded: true,
    };
  }

  return { ok: true, limit, remaining: limit - usedThisMonth };
}
