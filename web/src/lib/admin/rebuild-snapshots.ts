import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { utcYearMonth, loadMonthlyUsageSnapshot } from "@/lib/billing/usage-quotas";
import {
  daysSinceUtcDateYmd,
  getUserActivitySnapshot,
  isUserInactiveForScrape,
  resolveLastActiveDateYmd,
} from "@/lib/billing/user-activity";
import type { Database } from "@/lib/supabase/types";

function computeFunnelStage(params: {
  onboardingCompleted: boolean;
  billingStatus: string | null;
  hasActivePaid: boolean;
  competitorCount: number;
  scrapeStarted: boolean;
  scrapeComplete: boolean;
  customQuoteStatus: string | null;
}): string {
  if (params.scrapeComplete) return "scrape_complete";
  if (params.scrapeStarted) return "scrape_started";
  if (params.onboardingCompleted) return "onboarding_complete";
  if (params.customQuoteStatus === "sent") return "quote_sent";
  if (params.hasActivePaid) return "subscribed";
  return "signed_up";
}

export async function rebuildAdminUserSnapshot(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const [profileRes, billing, activity, usage, competitorsRes, quotesRes, emailUsageRes] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "email, full_name, company_name, company_url, company_role, onboarding_completed, last_active_date, app_streak_days, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      getBillingEntitlement(admin, userId),
      getUserActivitySnapshot(admin, userId),
      loadMonthlyUsageSnapshot(admin, userId, utcYearMonth()),
      admin.from("saved_competitors").select("brand_domain, name").eq("user_id", userId),
      admin
        .from("custom_quotes")
        .select("id, status, price_cents, billing_period")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      admin
        .from("email_intelligence_analysis_usage")
        .select("analysis_count")
        .eq("user_id", userId)
        .eq("year_month", utcYearMonth())
        .maybeSingle(),
    ]);

  const profile = profileRes.data;
  const competitors = competitorsRes.data ?? [];
  const latestQuote = quotesRes.data?.[0] ?? null;
  const lastActiveYmd = resolveLastActiveDateYmd(activity);
  const daysInactive = lastActiveYmd ? daysSinceUtcDateYmd(lastActiveYmd) : 999;
  const scrapePaused = isUserInactiveForScrape(activity);
  const hasActivePaid = hasActivePaidSubscription(billing);

  let mrrCents = 0;
  if (hasActivePaid && latestQuote?.status === "accepted") {
    mrrCents =
      latestQuote.billing_period === "annual"
        ? Math.round(latestQuote.price_cents / 12)
        : latestQuote.price_cents;
  }

  const competitorDomains = competitors
    .map((c) => c.brand_domain?.trim())
    .filter((d): d is string => Boolean(d));

  const funnelStage = computeFunnelStage({
    onboardingCompleted: profile?.onboarding_completed ?? false,
    billingStatus: billing.status,
    hasActivePaid,
    competitorCount: competitorDomains.length,
    scrapeStarted: competitorDomains.length > 0,
    scrapeComplete: competitorDomains.length > 0 && profile?.onboarding_completed === true,
    customQuoteStatus: latestQuote?.status ?? null,
  });

  await admin.from("admin_user_snapshots").upsert(
    {
      user_id: userId,
      email: profile?.email ?? null,
      full_name: profile?.full_name ?? null,
      company_name: profile?.company_name ?? null,
      company_url: profile?.company_url ?? null,
      company_role: profile?.company_role ?? null,
      onboarding_completed: profile?.onboarding_completed ?? false,
      last_active_date: profile?.last_active_date ?? null,
      app_streak_days: profile?.app_streak_days ?? 0,
      billing_status: billing.status,
      plan_tier: billing.planTier,
      polar_product_name: billing.planName,
      custom_quote_status: latestQuote?.status ?? null,
      custom_quote_id: latestQuote?.id ?? null,
      mrr_cents: mrrCents,
      competitor_count: competitorDomains.length,
      competitor_domains: competitorDomains,
      ads_scraped_month: usage.adsScraped,
      scrape_operations_month: usage.scrapeOperations,
      swap_count_month: usage.swapCount,
      csv_export_count_month: usage.csvExportCount,
      ad_preview_analyses_month: usage.adPreviewAnalyses,
      email_ai_analyses_month: emailUsageRes.data?.analysis_count ?? 0,
      scrape_paused: scrapePaused,
      days_inactive: daysInactive,
      account_suspended: billing.isAdminSuspended,
      funnel_stage: funnelStage,
      profile_created_at: profile?.created_at ?? null,
      snapshot_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function rebuildAllAdminUserSnapshots(
  admin: SupabaseClient<Database>,
): Promise<{ count: number }> {
  const { data: profiles, error } = await admin.from("profiles").select("id");
  if (error) throw new Error(error.message);

  let count = 0;
  for (const row of profiles ?? []) {
    await rebuildAdminUserSnapshot(admin, row.id);
    count += 1;
  }
  return { count };
}
