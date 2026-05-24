import { NextResponse, type NextRequest } from "next/server";
import { isKnownPolarProductId } from "@/lib/billing/config";
import { createPolarClient } from "@/lib/billing/polar";
import {
  recordTesterInviteFromSubscription,
  stringMetadataValue,
  upsertPolarSubscription,
} from "@/lib/billing/sync-polar-subscription";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function userIdFromCheckout(checkout: {
  externalCustomerId?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  return (
    stringMetadataValue(checkout.metadata?.user_id) ??
    stringMetadataValue(checkout.externalCustomerId)
  );
}

/** GET — sync billing_subscriptions from Polar checkout_id after successful checkout. */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const checkoutId = request.nextUrl.searchParams.get("checkout_id")?.trim();
    if (!checkoutId) {
      return NextResponse.json({ ok: false, error: "Missing checkout_id." }, { status: 400 });
    }

    const polar = createPolarClient();
    const checkout = await polar.checkouts.get({ id: checkoutId });

    const checkoutUserId = userIdFromCheckout(checkout);
    if (checkoutUserId && checkoutUserId !== user.id) {
      return NextResponse.json({ ok: false, error: "Checkout does not belong to this account." }, { status: 403 });
    }

    const subscriptionId = checkout.subscriptionId?.trim();
    if (!subscriptionId) {
      return NextResponse.json({
        ok: true,
        synced: false,
        pending: true,
        message: "Subscription not ready yet — retry shortly.",
      });
    }

    const subscription = await polar.subscriptions.get({ id: subscriptionId });
    if (!subscription.productId || !isKnownPolarProductId(subscription.productId)) {
      return NextResponse.json({
        ok: true,
        synced: false,
        pending: true,
        message: "Subscription product not recognized yet.",
      });
    }

    const admin = createSupabaseAdminClient();
    const { error, planTier } = await upsertPolarSubscription(admin, subscription, user.id, {
      lastWebhookEventId: `sync-checkout:${checkoutId}`,
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    await recordTesterInviteFromSubscription(admin, subscription, user.id);

    return NextResponse.json({
      ok: true,
      synced: true,
      pending: false,
      status: subscription.status,
      planTier,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not sync checkout.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
