import { NextResponse } from "next/server";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { getPolarWebhookSecret, isKnownPolarProductId } from "@/lib/billing/config";
import { resolvePlanTier } from "@/lib/billing/entitlements";
import {
  PolarWebhookSignatureError,
  verifyPolarWebhookPayload,
} from "@/lib/billing/polar-webhook-verify";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PolarWebhookPayload = {
  type: string;
  timestamp?: string;
  data?: unknown;
};

function jsonSafe(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function stringMetadataValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asSubscription(data: unknown): Subscription | null {
  if (!data || typeof data !== "object") return null;
  return data as Subscription;
}

function userIdFromSubscription(subscription: Subscription): string | null {
  return (
    stringMetadataValue(subscription.metadata?.user_id) ??
    stringMetadataValue(subscription.customer?.externalId) ??
    stringMetadataValue(subscription.customer?.metadata?.user_id)
  );
}

async function resolveUserIdForSubscription(
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

function eventIdFromRequest(headers: Headers, rawBody: string, payload: PolarWebhookPayload): string {
  const raw = (() => {
    try {
      return JSON.parse(rawBody) as { id?: unknown };
    } catch {
      return {};
    }
  })();
  return (
    headers.get("webhook-id") ??
    headers.get("x-webhook-id") ??
    stringMetadataValue(raw.id) ??
    `${payload.type}:${(payload.data as { id?: string } | undefined)?.id ?? "unknown"}:${payload.timestamp ?? Date.now()}`
  );
}

function isSubscriptionEvent(payload: PolarWebhookPayload): payload is PolarWebhookPayload & { data: Subscription } {
  return payload.type.startsWith("subscription.") && typeof payload.data === "object" && payload.data !== null;
}

async function recordWebhookEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  eventType: string,
  rawPayload: Json,
): Promise<string | null> {
  const { error } = await admin.from("billing_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    raw_payload: rawPayload,
  });
  if (error && error.code !== "23505") {
    return error.message;
  }
  return null;
}

/** Lightweight health probe — Polar requires POST with signature for real deliveries. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "polar-billing-webhook" });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: PolarWebhookPayload;

    try {
      payload = verifyPolarWebhookPayload(rawBody, request.headers, getPolarWebhookSecret());
    } catch (e) {
      if (e instanceof PolarWebhookSignatureError) {
        console.error("[polar-webhook] invalid signature", e.message);
        return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
      }
      const message = e instanceof Error ? e.message : "Invalid webhook payload.";
      console.error("[polar-webhook] verify failed", message);
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const eventId = eventIdFromRequest(request.headers, rawBody, payload);
    const admin = createSupabaseAdminClient();
    const rawPayload = jsonSafe(payload);

    const { data: existingEvent } = await admin
      .from("billing_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (!isSubscriptionEvent(payload)) {
      const eventError = await recordWebhookEvent(admin, eventId, payload.type, rawPayload);
      if (eventError) {
        console.error("[polar-webhook] event insert failed", eventError);
        return NextResponse.json({ ok: false, error: eventError }, { status: 500 });
      }
      return NextResponse.json({ ok: true, ignored: true });
    }

    const subscription = asSubscription(payload.data);
    if (!subscription?.id || !subscription.productId) {
      await recordWebhookEvent(admin, eventId, payload.type, rawPayload);
      return NextResponse.json({ ok: true, ignored: true, reason: "invalid_subscription_shape" });
    }

    if (!isKnownPolarProductId(subscription.productId)) {
      console.warn("[polar-webhook] unknown product id", subscription.productId);
      await recordWebhookEvent(admin, eventId, payload.type, rawPayload);
      return NextResponse.json({ ok: true, ignored: true, reason: "unknown_product" });
    }

    const userId = await resolveUserIdForSubscription(admin, subscription);
    if (!userId) {
      console.error("[polar-webhook] missing user id", {
        eventType: payload.type,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
      });
      await recordWebhookEvent(admin, eventId, payload.type, rawPayload);
      return NextResponse.json({ ok: true, ignored: true, reason: "missing_user_id" });
    }

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

    const { error } = await admin.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        polar_customer_id: subscription.customerId,
        polar_subscription_id: subscription.id,
        polar_product_id: subscription.productId,
        polar_product_name: subscription.product?.name ?? null,
        status: subscription.status,
        trial_start: iso(subscription.trialStart),
        trial_end: iso(subscription.trialEnd),
        current_period_start: iso(subscription.currentPeriodStart),
        current_period_end: iso(subscription.currentPeriodEnd),
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        canceled_at: iso(subscription.canceledAt),
        started_at: iso(subscription.startedAt),
        ends_at: iso(subscription.endsAt),
        ended_at: iso(subscription.endedAt),
        checkout_id: subscription.checkoutId,
        last_webhook_event_id: eventId,
        raw_payload: jsonSafe(mergedPayload),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[polar-webhook] billing_subscriptions upsert", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const eventError = await recordWebhookEvent(admin, eventId, payload.type, rawPayload);
    if (eventError) {
      console.error("[polar-webhook] event insert failed after upsert", eventError);
      return NextResponse.json({ ok: false, error: eventError }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook handler failed.";
    console.error("[polar-webhook] unhandled", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
