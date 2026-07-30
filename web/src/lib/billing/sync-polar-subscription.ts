import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { isKnownPolarProductId } from "@/lib/billing/config";
import { markCustomQuoteAccepted } from "@/lib/billing/custom-quotes";
import { isSubscriptionStatusAllowed, resolvePlanTier } from "@/lib/billing/entitlements";
import type { PolarRawSubscription } from "@/lib/billing/polar-api-raw";
import { readProductId } from "@/lib/billing/polar-api-raw";
import { recordTesterInviteRedemption } from "@/lib/billing/tester-invite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const SYNC_TERMINAL_STATUSES = new Set(["canceled", "cancelled", "ended", "unpaid", "past_due"]);

export function pickSubscriptionForSync(subscriptions: Subscription[]): Subscription | null {
  if (subscriptions.length === 0) return null;

  const active = subscriptions.filter((sub) => isSubscriptionStatusAllowed(sub.status));
  if (active.length > 0) {
    return active.sort((a, b) => {
      const aCancel = a.cancelAtPeriodEnd ? 1 : 0;
      const bCancel = b.cancelAtPeriodEnd ? 1 : 0;
      if (bCancel !== aCancel) return bCancel - aCancel;
      return (
        new Date(b.currentPeriodEnd ?? 0).getTime() - new Date(a.currentPeriodEnd ?? 0).getTime()
      );
    })[0];
  }

  const terminal = subscriptions.filter((sub) => SYNC_TERMINAL_STATUSES.has(sub.status));
  if (terminal.length > 0) {
    return terminal.sort((a, b) => {
      const aTime = new Date(a.endedAt ?? a.canceledAt ?? a.currentPeriodEnd ?? 0).getTime();
      const bTime = new Date(b.endedAt ?? b.canceledAt ?? b.currentPeriodEnd ?? 0).getTime();
      return bTime - aTime;
    })[0];
  }

  return subscriptions[0] ?? null;
}

export function jsonSafe(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function isoPolarDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function stringMetadataValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function userIdFromSubscription(subscription: Subscription): string | null {
  return (
    stringMetadataValue(subscription.metadata?.user_id) ??
    stringMetadataValue(subscription.customer?.externalId) ??
    stringMetadataValue(subscription.customer?.metadata?.user_id)
  );
}

export async function resolveUserIdForSubscription(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscription: Subscription,
): Promise<string | null> {
  const direct = userIdFromSubscription(subscription);
  if (direct) return direct;

  if (subscription.customerId) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("user_id")
      .eq("polar_customer_id", subscription.customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (subscription.id) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("user_id")
      .eq("polar_subscription_id", subscription.id)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

export function buildBillingSubscriptionUpsertRow(params: {
  subscription: Subscription;
  userId: string;
  lastWebhookEventId?: string | null;
}) {
  const { subscription, userId, lastWebhookEventId = null } = params;

  const planTier = resolvePlanTier({
    status: subscription.status,
    polarProductId: subscription.productId,
    rawPayload: subscription,
    applyDevOverride: false,
  });

  const mergedPayload = {
    ...(typeof subscription === "object" && subscription !== null ? subscription : {}),
    plan_tier: planTier,
  };

  return {
    user_id: userId,
    polar_customer_id: subscription.customerId,
    polar_subscription_id: subscription.id,
    polar_product_id: subscription.productId,
    polar_product_name: subscription.product?.name ?? null,
    status: subscription.status,
    trial_start: isoPolarDate(subscription.trialStart),
    trial_end: isoPolarDate(subscription.trialEnd),
    current_period_start: isoPolarDate(subscription.currentPeriodStart),
    current_period_end: isoPolarDate(subscription.currentPeriodEnd),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    canceled_at: isoPolarDate(subscription.canceledAt),
    started_at: isoPolarDate(subscription.startedAt),
    ends_at: isoPolarDate(subscription.endsAt),
    ended_at: isoPolarDate(subscription.endedAt),
    checkout_id: subscription.checkoutId,
    last_webhook_event_id: lastWebhookEventId,
    raw_payload: jsonSafe(mergedPayload),
    updated_at: new Date().toISOString(),
  };
}

/** Polar syncs rebuild raw_payload from the subscription; keep manual admin overrides intact. */
async function readPreservedAdminPayloadKeys(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("raw_payload")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = data?.raw_payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return {};

  const preserved: Record<string, unknown> = {};
  const record = payload as Record<string, unknown>;
  const override = record.admin_plan_override;
  if (typeof override === "string" && override.trim()) {
    preserved.admin_plan_override = override;
  }
  const adsScrapeMode = record.admin_ads_scrape_mode;
  if (adsScrapeMode === "auto" || adsScrapeMode === "manual") {
    preserved.admin_ads_scrape_mode = adsScrapeMode;
  }
  return preserved;
}

export async function upsertPolarSubscription(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscription: Subscription,
  userId: string,
  options?: { lastWebhookEventId?: string | null },
): Promise<{ error: string | null; planTier: ReturnType<typeof resolvePlanTier> }> {
  if (!subscription.id || !subscription.productId) {
    return { error: "Invalid subscription shape.", planTier: "free_trial" };
  }
  if (!isKnownPolarProductId(subscription.productId)) {
    return { error: "Unknown Polar product id.", planTier: "free_trial" };
  }

  const row = buildBillingSubscriptionUpsertRow({
    subscription,
    userId,
    lastWebhookEventId: options?.lastWebhookEventId ?? null,
  });

  const preserved = await readPreservedAdminPayloadKeys(admin, userId);
  if (Object.keys(preserved).length > 0) {
    row.raw_payload = jsonSafe({
      ...(typeof row.raw_payload === "object" && row.raw_payload !== null && !Array.isArray(row.raw_payload)
        ? (row.raw_payload as Record<string, unknown>)
        : {}),
      ...preserved,
    });
  }

  const { error } = await admin.from("billing_subscriptions").upsert(row, { onConflict: "user_id" });
  const planTier = resolvePlanTier({
    status: subscription.status,
    polarProductId: subscription.productId,
    rawPayload: subscription,
    applyDevOverride: false,
  });

  if (error) {
    return { error: error.message, planTier };
  }

  await acceptCustomQuoteFromSubscription(admin, subscription);

  return { error: null, planTier };
}

export async function acceptCustomQuoteFromSubscription(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscription: Subscription,
): Promise<void> {
  const quoteId = stringMetadataValue(subscription.metadata?.quote_id);
  const source = stringMetadataValue(subscription.metadata?.source);
  if (source !== "rival_custom_quote" || !quoteId) return;
  if (!isSubscriptionStatusAllowed(subscription.status)) return;

  try {
    await markCustomQuoteAccepted(admin, quoteId);
    await admin.from("admin_event_log").insert({
      target_user_id: userIdFromSubscription(subscription),
      event_type: "custom_quote_accepted",
      payload: jsonSafe({ quote_id: quoteId, subscription_id: subscription.id }),
    });
  } catch (e) {
    console.error("[polar-sync] custom quote acceptance", e);
  }
}

export async function upsertPolarSubscriptionFromRaw(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  raw: PolarRawSubscription,
  userId: string,
  options?: { lastWebhookEventId?: string | null },
): Promise<{ error: string | null; planTier: ReturnType<typeof resolvePlanTier> }> {
  const productId = readProductId(raw);
  if (!raw.id?.trim() || !productId) {
    return { error: "Invalid subscription shape.", planTier: "free_trial" };
  }
  if (!isKnownPolarProductId(productId)) {
    return { error: "Unknown Polar product id.", planTier: "free_trial" };
  }

  const planTier = resolvePlanTier({
    status: raw.status,
    polarProductId: productId,
    rawPayload: raw,
    applyDevOverride: false,
  });

  const preserved = await readPreservedAdminPayloadKeys(admin, userId);
  const mergedPayload = {
    ...raw,
    productId,
    plan_tier: planTier,
    ...preserved,
  };

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_customer_id: raw.customer_id ?? null,
      polar_subscription_id: raw.id,
      polar_product_id: productId,
      polar_product_name: null,
      status: raw.status,
      trial_end: isoPolarDate(raw.trial_end),
      current_period_end: isoPolarDate(raw.current_period_end),
      cancel_at_period_end: raw.cancel_at_period_end ?? false,
      last_webhook_event_id: options?.lastWebhookEventId ?? null,
      raw_payload: jsonSafe(mergedPayload),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message, planTier };
  }

  return { error: null, planTier };
}

export async function recordTesterInviteFromSubscription(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscription: Subscription,
  userId: string,
): Promise<void> {
  const inviteCode = stringMetadataValue(subscription.metadata?.invite_code);
  const source = stringMetadataValue(subscription.metadata?.source);
  if (source !== "rival_tester_invite" || !inviteCode || !subscription.id) return;

  try {
    await recordTesterInviteRedemption(admin, {
      inviteCode,
      userId,
      polarSubscriptionId: subscription.id,
    });
  } catch (redemptionErr) {
    console.error("[polar-sync] tester invite redemption", redemptionErr);
  }
}
