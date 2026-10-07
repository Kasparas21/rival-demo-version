import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getBillingEntitlement,
  hasActivePaidSubscription,
  isLapsedPaidSubscription,
  type BillingEntitlement,
} from "@/lib/billing/entitlements";
import {
  getUserActivitySnapshot,
  isUserInactiveForScrape,
  resolveLastActiveDateYmd,
  type UserActivitySnapshot,
} from "@/lib/billing/user-activity";
import type { Database } from "@/lib/supabase/types";

export type ScrapeEligibilityReason = "inactive_gate" | "billing";

export type ScrapeEligibility = {
  allowed: boolean;
  reason?: ScrapeEligibilityReason;
  activity: UserActivitySnapshot;
  lastActiveDateYmd: string | null;
  billing: BillingEntitlement;
};

/** Never-subscribed free trial: limited on-demand scrapes only (cron still gated elsewhere). */
export function isNeverSubscribedFreeTrial(
  billing: Pick<BillingEntitlement, "planTier" | "hasPolarBillingRecord" | "isUnlimited">,
): boolean {
  if (billing.isUnlimited) return false;
  return billing.planTier === "free_trial" && !billing.hasPolarBillingRecord;
}

export function userHasFreshScrapeBillingAccess(
  billing: Pick<
    BillingEntitlement,
    "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"
  >,
): boolean {
  if (billing.isUnlimited) return true;
  if (hasActivePaidSubscription(billing)) return true;
  if (isNeverSubscribedFreeTrial(billing)) return true;
  return false;
}

export function isScrapingPausedForInactiveUser(params: {
  activity: UserActivitySnapshot;
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord">;
  now?: Date;
}): boolean {
  const { activity, billing, now } = params;
  if (billing.isUnlimited) return false;
  return isUserInactiveForScrape(activity, now);
}

export function resolveScrapeEligibility(params: {
  activity: UserActivitySnapshot;
  billing: BillingEntitlement;
  now?: Date;
}): ScrapeEligibility {
  const { activity, billing, now } = params;
  const lastActiveDateYmd = resolveLastActiveDateYmd(activity);

  if (isLapsedPaidSubscription(billing)) {
    return { allowed: false, reason: "billing", activity, lastActiveDateYmd, billing };
  }

  if (!userHasFreshScrapeBillingAccess(billing)) {
    return { allowed: false, reason: "billing", activity, lastActiveDateYmd, billing };
  }

  if (isScrapingPausedForInactiveUser({ activity, billing, now })) {
    return { allowed: false, reason: "inactive_gate", activity, lastActiveDateYmd, billing };
  }

  return { allowed: true, activity, lastActiveDateYmd, billing };
}

export async function getUserScrapeEligibility(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ScrapeEligibility> {
  const [billing, activity] = await Promise.all([
    getBillingEntitlement(supabase, userId),
    getUserActivitySnapshot(supabase, userId),
  ]);

  return resolveScrapeEligibility({ activity, billing });
}

/**
 * Any scheduled job that spends Apify / capture / LLM credits on its own (organic, landing pages,
 * Autopilot, enrichment): only accounts whose scrape mode is auto — paying subscribers, or ones an admin switched on.
 */
export function resolveScheduledScrapeAllowed(eligibility: ScrapeEligibility): boolean {
  return eligibility.allowed && eligibility.billing.adminAdsScrapeMode === "auto";
}

export async function userAllowsScheduledScrape(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  return resolveScheduledScrapeAllowed(await getUserScrapeEligibility(supabase, userId));
}

/** Scheduled ads-library cron: scrape mode auto, plus an active paid plan with auto-refresh (or admin). */
export function resolveScheduledAdsScrapeAllowed(eligibility: ScrapeEligibility): boolean {
  if (!resolveScheduledScrapeAllowed(eligibility)) return false;

  const { billing } = eligibility;
  if (!hasActivePaidSubscription(billing) && !billing.isUnlimited) return false;
  return billing.limits.allowAutoRefresh || billing.isUnlimited;
}

export async function userAllowsScheduledAdsScrape(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const eligibility = await getUserScrapeEligibility(supabase, userId);
  return resolveScheduledAdsScrapeAllowed(eligibility);
}

/** Any scrape that incurs Apify / capture cost for a user. */
export async function userAllowsFreshScrape(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const eligibility = await getUserScrapeEligibility(supabase, userId);
  return eligibility.allowed;
}
