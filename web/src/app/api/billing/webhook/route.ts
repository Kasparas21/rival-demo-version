import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { getPolarEnv, getPolarWebhookSecret } from "@/lib/billing/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

type PolarWebhookPayload = {
  type: string;
  timestamp?: Date;
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

function userIdFromSubscription(subscription: Subscription): string | null {
  return (
    stringMetadataValue(subscription.metadata?.user_id) ??
    stringMetadataValue(subscription.customer?.externalId) ??
    stringMetadataValue(subscription.customer?.metadata?.user_id)
  );
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
    `${payload.type}:${(payload.data as { id?: string } | undefined)?.id ?? "unknown"}:${payload.timestamp?.toISOString() ?? Date.now()}`
  );
}

function isSubscriptionEvent(payload: PolarWebhookPayload): payload is PolarWebhookPayload & { data: Subscription } {
  return payload.type.startsWith("subscription.") && typeof payload.data === "object" && payload.data !== null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: PolarWebhookPayload;

  try {
    payload = validateEvent(rawBody, Object.fromEntries(request.headers.entries()), getPolarWebhookSecret());
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Invalid webhook payload.";
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
    await admin.from("billing_webhook_events").insert({
      event_id: eventId,
      event_type: payload.type,
      raw_payload: rawPayload,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const subscription = payload.data;
  const { productId } = getPolarEnv();
  if (subscription.productId !== productId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const userId = userIdFromSubscription(subscription);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Subscription webhook did not include a user id." }, { status: 400 });
  }

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
      raw_payload: jsonSafe(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { error: eventError } = await admin.from("billing_webhook_events").insert({
    event_id: eventId,
    event_type: payload.type,
    raw_payload: rawPayload,
  });

  if (eventError && eventError.code !== "23505") {
    return NextResponse.json({ ok: false, error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
