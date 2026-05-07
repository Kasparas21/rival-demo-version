import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const BILLING_LIMITS = {
  maxWatchedCompetitors: 10,
  maxAdLibraryScrapeRunsPerMonth: 15,
} as const;

export const BILLING_PLAN_NAME = "Spy Rival Pro";

export type BillingEntitlement = {
  hasAccess: boolean;
  status: string;
  planName: string;
  polarProductId: string | null;
  polarCustomerId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: typeof BILLING_LIMITS;
};

export function isSubscriptionStatusAllowed(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export async function getBillingEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BillingEntitlement> {
  const { data } = await supabase
    .from("billing_subscriptions")
    .select(
      "status, polar_product_id, polar_product_name, polar_customer_id, trial_end, current_period_end, cancel_at_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status ?? "none";

  return {
    hasAccess: isSubscriptionStatusAllowed(status),
    status,
    planName: data?.polar_product_name ?? BILLING_PLAN_NAME,
    polarProductId: data?.polar_product_id ?? null,
    polarCustomerId: data?.polar_customer_id ?? null,
    trialEnd: data?.trial_end ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    limits: BILLING_LIMITS,
  };
}

export function remainingMonthlyScrapeRuns(currentRuns: number, requestedRuns = 0): number {
  return Math.max(0, BILLING_LIMITS.maxAdLibraryScrapeRunsPerMonth - currentRuns - Math.max(0, requestedRuns));
}

export function billingRequiredResponseBody(message = "An active subscription is required.") {
  return {
    ok: false,
    code: "subscription_required",
    error: message,
    checkoutUrl: "/checkout",
  };
}

export function quotaExceededResponseBody(currentRuns: number, requestedRuns: number) {
  return {
    ok: false,
    code: "quota_exceeded",
    error: `Monthly ad-library search limit reached (${currentRuns}/${BILLING_LIMITS.maxAdLibraryScrapeRunsPerMonth}).`,
    limit: BILLING_LIMITS.maxAdLibraryScrapeRunsPerMonth,
    used: currentRuns,
    requested: requestedRuns,
    remaining: remainingMonthlyScrapeRuns(currentRuns),
    checkoutUrl: "/checkout",
  };
}
