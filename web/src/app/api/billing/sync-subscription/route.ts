import { NextResponse } from "next/server";
import { createPolarClient } from "@/lib/billing/polar";
import {
  pickSubscriptionForSync,
  recordTesterInviteFromSubscription,
  upsertPolarSubscription,
} from "@/lib/billing/sync-polar-subscription";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** GET — sync billing from Polar by external customer id (Supabase user id). */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const polar = createPolarClient();
    const subscriptions: Subscription[] = [];

    const iterator = await polar.subscriptions.list({
      externalCustomerId: user.id,
      limit: 10,
    });

    for await (const page of iterator) {
      subscriptions.push(...page.result.items);
    }

    const subscription = pickSubscriptionForSync(subscriptions);

    if (!subscription?.id || !subscription.productId) {
      return NextResponse.json({
        ok: true,
        synced: false,
        pending: true,
        message: "No active Polar subscription found yet.",
      });
    }

    const admin = createSupabaseAdminClient();
    const { error, planTier } = await upsertPolarSubscription(admin, subscription, user.id, {
      lastWebhookEventId: `sync-subscription:${user.id}`,
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
    const message = e instanceof Error ? e.message : "Could not sync subscription.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
