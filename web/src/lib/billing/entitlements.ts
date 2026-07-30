import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { TESTER_FULL_PRO_PAYLOAD_KEY } from "@/lib/billing/claim-tester-access-core";
import { isDebugPlatformClassificationEnabled } from "@/lib/debug/platform-classification";
import { getPolarProductIds, isPolarCustomProductId } from "@/lib/billing/config";
import {
  getActiveCustomQuoteForUser,
  getSentCustomQuoteForUser,
  parsePlanLimitsFromJson,
  type CustomQuoteRow,
} from "@/lib/billing/custom-quotes";
import {
  limitsForTier,
  normalizePlanTier,
  PLAN_DISPLAY_NAMES,
  tierHasProductAccess,
  type DevPlanOverride,
  type PlanLimits,
  type PlanTier,
} from "@/lib/billing/plan-limits";

export type { PlanLimits, PlanTier, DevPlanOverride };

export const BILLING_PLAN_NAME = "Rival";

export type AdminAdsScrapeMode = "auto" | "manual";

export type BillingEntitlement = {
  hasAccess: boolean;
  status: string;
  planTier: PlanTier;
  planName: string;
  /** Manually set from the admin dashboard; wins over Polar-derived tier. */
  adminPlanOverride: PlanTier | null;
  /** Admin-controlled ads scrape scheduling; defaults to automatic weekly cron. */
  adminAdsScrapeMode: AdminAdsScrapeMode;
  polarProductId: string | null;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  hasPolarBillingRecord: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  isUnlimited: boolean;
  canUseDevPlanSwitcher: boolean;
  devPlanOverride: DevPlanOverride | null;
  customQuote: CustomQuoteRow | null;
  pendingQuote: CustomQuoteRow | null;
  customPriceLabel: string | null;
};

export function isSubscriptionStatusAllowed(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

function readRawPayload(rawPayload: unknown): Record<string, unknown> {
  if (typeof rawPayload === "object" && rawPayload !== null && !Array.isArray(rawPayload)) {
    return rawPayload as Record<string, unknown>;
  }
  return {};
}

function isManualAdminUnlimited(rawPayload: unknown): boolean {
  const p = readRawPayload(rawPayload);
  return p.admin_unlimited === true;
}

function readDevPlanOverride(rawPayload: unknown): DevPlanOverride | null {
  const v = readRawPayload(rawPayload).dev_plan_override;
  if (typeof v !== "string") return null;
  return normalizePlanTier(v);
}

/** Set only via the admin dashboard (service role) — always applied when present. */
export function readAdminPlanOverride(rawPayload: unknown): PlanTier | null {
  const v = readRawPayload(rawPayload).admin_plan_override;
  if (typeof v !== "string") return null;
  return normalizePlanTier(v);
}

/** Admin dashboard: scheduled ads-library cron on (auto) or off (manual only). Defaults to auto. */
export function readAdminAdsScrapeMode(rawPayload: unknown): AdminAdsScrapeMode {
  const v = readRawPayload(rawPayload).admin_ads_scrape_mode;
  return v === "manual" ? "manual" : "auto";
}

export function normalizeAdminAdsScrapeMode(value: unknown): AdminAdsScrapeMode | null {
  if (value === "auto" || value === "manual") return value;
  return null;
}

export function isDevPlanOverrideEnabled(): boolean {
  return process.env.ALLOW_DEV_PLAN_OVERRIDE?.trim() === "true";
}

function tierFromPolarProductId(productId: string | null | undefined): PlanTier | null {
  if (!productId?.trim()) return null;
  if (isPolarCustomProductId(productId)) return "custom";
  const ids = getPolarProductIds();
  if (
    (ids.starter && productId === ids.starter) ||
    (ids.starterAnnual && productId === ids.starterAnnual)
  ) {
    return "starter";
  }
  if (
    (ids.pro && productId === ids.pro) ||
    (ids.proAnnual && productId === ids.proAnnual) ||
    (ids.legacy && productId === ids.legacy)
  ) {
    return "pro";
  }
  if (
    (ids.agency && productId === ids.agency) ||
    (ids.agencyAnnual && productId === ids.agencyAnnual)
  ) {
    return "agency";
  }
  return null;
}

export function resolvePlanTier(params: {
  status: string;
  polarProductId: string | null;
  rawPayload: unknown;
  applyDevOverride: boolean;
}): PlanTier {
  const { status, polarProductId, rawPayload, applyDevOverride } = params;

  const adminOverride = readAdminPlanOverride(rawPayload);
  if (adminOverride) {
    return adminOverride;
  }

  if (isManualAdminUnlimited(rawPayload)) {
    const override = readDevPlanOverride(rawPayload);
    if (applyDevOverride && override) {
      return override;
    }
    return "admin";
  }

  const payload = readRawPayload(rawPayload);
  if (payload.complimentary_quote_id && isSubscriptionStatusAllowed(status)) {
    return "custom";
  }

  const override = readDevPlanOverride(rawPayload);
  if (applyDevOverride && override) {
    return override;
  }

  if (status === "active" || status === "trialing") {
    const fromProduct = tierFromPolarProductId(polarProductId);
    if (fromProduct) return fromProduct;
    if (status === "trialing") {
      return "free_trial";
    }
    return "starter";
  }

  return "free_trial";
}

export function hasAccessForTier(tier: PlanTier, status: string, isUnlimited: boolean): boolean {
  if (isUnlimited && tier === "admin") return true;
  if (tier === "free_trial") return true;
  if (tier === "starter" || tier === "pro" || tier === "agency" || tier === "custom") {
    return status === "active" || status === "trialing";
  }
  return false;
}

/** Active Polar paid subscription (legacy tiers or custom quote). */
export function hasActivePaidSubscription(
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): boolean {
  if (billing.isUnlimited) return true;
  return (
    (billing.planTier === "starter" ||
      billing.planTier === "pro" ||
      billing.planTier === "agency" ||
      billing.planTier === "custom") &&
    isSubscriptionStatusAllowed(billing.status)
  );
}

/** Had Polar billing but subscription is no longer active (canceled, ended, past due, etc.). */
export function isLapsedPaidSubscription(
  billing: Pick<
    BillingEntitlement,
    "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"
  >,
): boolean {
  if (billing.isUnlimited) return false;
  if (!billing.hasPolarBillingRecord) return false;
  return !hasActivePaidSubscription(billing);
}

export type SubscriptionStatusBadgeTone = "green" | "sky" | "amber" | "red" | "gray";

export type SubscriptionStatusBadge = {
  label: string;
  tone: SubscriptionStatusBadgeTone;
};

const CANCELED_STATUSES = new Set(["canceled", "cancelled", "ended", "incomplete_expired", "unpaid"]);

export function subscriptionStatusBadge(
  billing: Pick<
    BillingEntitlement,
    "status" | "planTier" | "isUnlimited" | "cancelAtPeriodEnd" | "hasAccess" | "polarProductId" | "hasPolarBillingRecord"
  >,
): SubscriptionStatusBadge {
  if (billing.isUnlimited) {
    return { label: "Admin access", tone: "sky" };
  }

  if (
    billing.cancelAtPeriodEnd &&
    (billing.status === "active" || billing.status === "trialing")
  ) {
    return { label: "Canceling", tone: "amber" };
  }

  if (hasActivePaidSubscription(billing)) {
    if (billing.status === "trialing") {
      return { label: "Trial active", tone: "sky" };
    }
    return { label: "Active", tone: "green" };
  }

  if (CANCELED_STATUSES.has(billing.status)) {
    return { label: "Canceled", tone: "red" };
  }

  if (billing.status === "past_due") {
    return { label: "Past due", tone: "amber" };
  }

  if (billing.planTier === "free_trial" && !billing.polarProductId && !billing.hasPolarBillingRecord) {
    return { label: "Free trial", tone: "sky" };
  }

  if (!billing.hasAccess) {
    return { label: "Subscription required", tone: "amber" };
  }

  return { label: "Free trial", tone: "sky" };
}

export function subscriptionStatusBadgeClassName(tone: SubscriptionStatusBadgeTone): string {
  switch (tone) {
    case "green":
      return "bg-emerald-100 text-emerald-800";
    case "sky":
      return "bg-sky-100 text-sky-800";
    case "amber":
      return "bg-amber-100 text-amber-800";
    case "red":
      return "bg-red-100 text-red-800";
    case "gray":
      return "bg-zinc-100 text-zinc-700";
  }
}

export function isBillingActivating(
  billing: Pick<BillingEntitlement, "status" | "polarProductId" | "planTier" | "hasPolarBillingRecord">,
): boolean {
  return (
    billing.status === "none" &&
    !billing.polarProductId &&
    !billing.hasPolarBillingRecord &&
    billing.planTier === "free_trial"
  );
}

export function hasPolarBillingRecordFromRow(row: {
  polar_product_id?: string | null;
  polar_customer_id?: string | null;
  polar_subscription_id?: string | null;
  checkout_id?: string | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  if (row.polar_product_id || row.polar_customer_id || row.polar_subscription_id || row.checkout_id) {
    return true;
  }
  const status = row.status?.trim();
  return Boolean(status && status !== "none");
}

/** User has or recently started a Polar subscription (incl. sync pending). */
export function shouldUsePolarSubscriptionUi(
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord">,
): boolean {
  if (billing.isUnlimited) return false;
  return hasActivePaidSubscription(billing) || billing.hasPolarBillingRecord;
}

/**
 * Post-onboarding: user needs a custom quote / checkout (replaces plan picker).
 */
export function shouldShowAwaitingQuotePage(
  billing: Pick<
    BillingEntitlement,
    "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"
  >,
): boolean {
  if (billing.isUnlimited) return false;
  if (hasActivePaidSubscription(billing)) return false;
  return true;
}

/** @deprecated Use shouldShowAwaitingQuotePage */
export function shouldShowPostOnboardingPlanPicker(
  billing: Pick<
    BillingEntitlement,
    "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"
  >,
): boolean {
  return shouldShowAwaitingQuotePage(billing);
}

export function isTesterInviteBillingAccount(
  rawPayload: unknown,
  hasTesterRedemption = false,
): boolean {
  if (hasTesterRedemption) return true;
  const p = readRawPayload(rawPayload);
  if (typeof p.tester_invite === "string" && p.tester_invite.trim()) return true;
  const metadata = p.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const source = (metadata as Record<string, unknown>).source;
    if (source === "rival_tester_invite") return true;
  }
  return false;
}

export function isTesterFullProAccount(rawPayload: unknown): boolean {
  const p = readRawPayload(rawPayload);
  return p[TESTER_FULL_PRO_PAYLOAD_KEY] === true;
}

/** Complimentary tester Pro keeps Pro features but free-trial competitor caps. */
export function applyTesterInvitePlanLimits(limits: PlanLimits): PlanLimits {
  const trialLimits = limitsForTier("free_trial");
  return {
    ...limits,
    maxWatchedCompetitors: trialLimits.maxWatchedCompetitors,
    maxSwapsPerMonth: trialLimits.maxSwapsPerMonth,
  };
}

/** Polar 7-day trial on Starter/Pro: full plan features, but workspace trial competitor cap. */
export function applyPolarTrialCompetitorCap(
  limits: PlanLimits,
  status: string,
  planTier: PlanTier,
): PlanLimits {
  if (status !== "trialing") return limits;
  if (planTier !== "starter" && planTier !== "pro" && planTier !== "agency" && planTier !== "custom") return limits;

  const trialCap = limitsForTier("free_trial").maxWatchedCompetitors;
  if (limits.maxWatchedCompetitors <= trialCap) return limits;

  return {
    ...limits,
    maxWatchedCompetitors: trialCap,
  };
}

export async function getBillingEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BillingEntitlement> {
  const [billingRes, testerRedemptionRes, customQuoteRes, pendingQuoteRes] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select(
        "status, polar_product_id, polar_product_name, polar_customer_id, polar_subscription_id, checkout_id, trial_end, current_period_end, cancel_at_period_end, raw_payload",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("tester_invite_redemptions").select("id").eq("user_id", userId).maybeSingle(),
    getActiveCustomQuoteForUser(supabase, userId),
    getSentCustomQuoteForUser(supabase, userId),
  ]);

  const { data } = billingRes;
  const hasTesterRedemption = Boolean(testerRedemptionRes.data?.id);
  const customQuote = customQuoteRes;
  const pendingQuote = pendingQuoteRes;

  const status = data?.status ?? "none";
  const rawPayload = data?.raw_payload;
  const adminPlanOverride = readAdminPlanOverride(rawPayload);
  const adminAdsScrapeMode = readAdminAdsScrapeMode(rawPayload);
  const isUnlimited = isManualAdminUnlimited(rawPayload) || adminPlanOverride === "admin";
  const devPlanOverride = readDevPlanOverride(rawPayload);
  const applyDevOverride = isUnlimited || isDevPlanOverrideEnabled();
  const canUseDevPlanSwitcher =
    isDebugPlatformClassificationEnabled() && (isUnlimited || isDevPlanOverrideEnabled());

  const planTier = resolvePlanTier({
    status,
    polarProductId: data?.polar_product_id ?? null,
    rawPayload,
    applyDevOverride,
  });

  let limits = limitsForTier(planTier);
  if (planTier === "custom" && customQuote) {
    const customLimits = parsePlanLimitsFromJson(customQuote.limits);
    if (customLimits) limits = customLimits;
  }
  if (isTesterInviteBillingAccount(rawPayload, hasTesterRedemption) && !isTesterFullProAccount(rawPayload)) {
    limits = applyTesterInvitePlanLimits(limits);
  } else {
    limits = applyPolarTrialCompetitorCap(limits, status, planTier);
  }
  const hasAccess = adminPlanOverride
    ? tierHasProductAccess(planTier)
    : hasAccessForTier(planTier, status, isUnlimited);

  let planName = PLAN_DISPLAY_NAMES[planTier];
  if (planTier === "custom" && customQuote) {
    planName = `Custom (${formatQuotePriceLabel(customQuote)})`;
  }
  if (isUnlimited && planTier === "admin") {
    planName = data?.polar_product_name?.trim() || "Complimentary (admin)";
  }

  const hasPolarBillingRecord = hasPolarBillingRecordFromRow(data);

  return {
    hasAccess,
    status,
    planTier,
    planName,
    adminPlanOverride,
    adminAdsScrapeMode,
    polarProductId: data?.polar_product_id ?? null,
    polarCustomerId: data?.polar_customer_id ?? null,
    polarSubscriptionId: data?.polar_subscription_id ?? null,
    hasPolarBillingRecord,
    trialEnd: data?.trial_end ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    limits,
    isUnlimited: isUnlimited && planTier === "admin",
    canUseDevPlanSwitcher,
    devPlanOverride,
    customQuote,
    pendingQuote,
    customPriceLabel: customQuote ? formatQuotePriceLabel(customQuote) : null,
  };
}

function formatQuotePriceLabel(quote: CustomQuoteRow): string {
  if (quote.price_cents === 0) return "Free";
  const amount = quote.price_cents / 100;
  const symbol = quote.currency?.toLowerCase() === "gbp" ? "£" : quote.currency?.toLowerCase() === "usd" ? "$" : "";
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const period = quote.billing_period === "annual" ? "/yr" : "/mo";
  return `${symbol}${formatted}${period}`;
}

function isCheckoutOrBillingPath(path: string): boolean {
  return path === "/checkout" || path === "/api/billing/checkout";
}

export function adminSkipCheckoutDestination(path: string, isUnlimited: boolean): string {
  return isUnlimited && isCheckoutOrBillingPath(path) ? "/dashboard/spy" : path;
}

export function remainingMonthlyAdsProcessed(
  currentAds: number,
  requestedAds = 0,
  limit: number,
): number {
  return Math.max(0, limit - currentAds - Math.max(0, requestedAds));
}

export function billingRequiredResponseBody(
  message = "A custom subscription is required to continue.",
  checkoutUrl = "/awaiting-quote",
) {
  return {
    ok: false,
    code: "subscription_required",
    error: message,
    checkoutUrl,
  };
}

export function quotaExceededResponseBody(params: {
  used: number;
  requested: number;
  limit: number;
  metric?: string;
}) {
  const { used, requested, limit, metric = "ads processed" } = params;
  return {
    ok: false,
    code: "quota_exceeded",
    error: `Monthly ${metric} limit reached (${used}/${limit}).`,
    limit,
    used,
    requested,
    remaining: remainingMonthlyAdsProcessed(used, requested, limit),
    checkoutUrl: "/awaiting-quote",
  };
}

export function freeTrialScrapeUsedResponseBody() {
  return {
    ok: false,
    code: "free_trial_scrape_used",
    error:
      "Your free trial includes one competitor discovery scrape. Subscribe with your custom plan for ongoing refreshes.",
    checkoutUrl: "/awaiting-quote",
  };
}

export function inactiveUserScrapePausedResponseBody() {
  return {
    ok: false,
    code: "inactive_scrape_paused",
    error:
      "Automatic competitor tracking is paused because you have not opened Rival in the last week. Open the app to resume.",
    checkoutUrl: "/awaiting-quote",
  };
}

export function subscriptionEndedScrapePausedResponseBody() {
  return {
    ok: false,
    code: "subscription_ended_scrape_paused",
    error:
      "Your subscription has ended. Contact us or complete checkout with your custom plan to resume automatic tracking.",
    checkoutUrl: "/awaiting-quote",
  };
}

export function scrapePausedResponseBody(
  reason: "inactive_gate" | "billing",
) {
  return reason === "billing"
    ? subscriptionEndedScrapePausedResponseBody()
    : inactiveUserScrapePausedResponseBody();
}

/** @deprecated Use inactiveUserScrapePausedResponseBody */
export function streakGateScrapePausedResponseBody() {
  return inactiveUserScrapePausedResponseBody();
}

export function featureNotAvailableResponseBody(feature: string, requiredTier: PlanTier = "custom") {
  return {
    ok: false,
    code: "feature_not_available",
    error: `${feature} is not included in your current plan.`,
    requiredTier,
    checkoutUrl: "/awaiting-quote",
  };
}
