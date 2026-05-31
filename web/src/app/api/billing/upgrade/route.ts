import { NextResponse, type NextRequest } from "next/server";
import { appOriginForRequest } from "@/lib/auth/auth-link-origin";
import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
import {
  getPolarSubscriptionRaw,
  isProProductId,
  polarApiErrorMessage,
  readProductId,
  updatePolarSubscriptionProductRaw,
  type PolarRawSubscription,
} from "@/lib/billing/polar-api-raw";
import { createPolarClient } from "@/lib/billing/polar";
import { resolveUpgradeProductId } from "@/lib/billing/upgrade-plan";
import { upsertPolarSubscription, upsertPolarSubscriptionFromRaw } from "@/lib/billing/sync-polar-subscription";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function settingsRedirect(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL("/dashboard/settings", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

async function syncSubscriptionToDb(subscriptionId: string, userId: string): Promise<string | null> {
  const polar = createPolarClient();
  try {
    const subscription = await polar.subscriptions.get({ id: subscriptionId });
    const admin = createSupabaseAdminClient();
    const { error } = await upsertPolarSubscription(admin, subscription, userId, {
      lastWebhookEventId: `upgrade:${subscriptionId}`,
    });
    return error;
  } catch {
    const raw = await getPolarSubscriptionRaw(subscriptionId);
    if (!raw) {
      return "Could not sync billing after upgrade.";
    }

    const admin = createSupabaseAdminClient();
    const { error } = await upsertPolarSubscriptionFromRaw(admin, raw, userId, {
      lastWebhookEventId: `upgrade:${subscriptionId}`,
    });
    return error;
  }
}

async function runUpgrade(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (billing.isUnlimited) {
    return settingsRedirect(request.nextUrl.origin, { upgrade: "skipped" });
  }
  if (billing.planTier === "pro") {
    return settingsRedirect(request.nextUrl.origin, { upgrade: "already_pro" });
  }
  if (!hasActivePaidSubscription(billing) || billing.planTier !== "starter") {
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message: "Active Starter subscription required to upgrade.",
    });
  }

  const { data: row } = await supabase
    .from("billing_subscriptions")
    .select("polar_subscription_id, polar_product_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const subscriptionId = row?.polar_subscription_id?.trim();
  if (!subscriptionId) {
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message: "No Polar subscription found. Use Manage subscription or contact support.",
    });
  }

  const targetProductId = resolveUpgradeProductId(row?.polar_product_id, "pro");
  const before = await getPolarSubscriptionRaw(subscriptionId);
  const beforeProductId = readProductId(before);

  if (isProProductId(beforeProductId)) {
    return settingsRedirect(request.nextUrl.origin, { upgrade: "already_pro" });
  }

  const updateResult = await updatePolarSubscriptionProductRaw({
    subscriptionId,
    productId: targetProductId,
    prorationBehavior: "prorate",
  });

  if (!updateResult.ok) {
    const message = polarApiErrorMessage(updateResult);
    const paymentFailed = updateResult.status === 402 || /payment|declined|card/i.test(message);
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message: paymentFailed
        ? "Payment failed — update your card in Manage subscription and try again."
        : message.includes("Manage subscription")
          ? message
          : `${message} Try Manage subscription in Polar if this continues.`,
    });
  }

  const after = await getPolarSubscriptionRaw(subscriptionId);
  const afterProductId = readProductId(after) ?? readProductId(updateResult.json as PolarRawSubscription);

  if (!isProProductId(afterProductId)) {
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message:
        "Polar did not switch your plan to Pro. Open Manage subscription to upgrade there, or contact support.",
    });
  }

  const syncError = await syncSubscriptionToDb(subscriptionId, user.id);
  if (syncError) {
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message: "Upgraded in Polar, but billing sync failed. Refresh Settings in a moment.",
    });
  }

  return settingsRedirect(appOriginForRequest(request), { upgrade: "success" });
}

/** GET/POST — prorated Starter → Pro upgrade via Polar subscriptions.update. */
export async function GET(request: NextRequest) {
  try {
    return await runUpgrade(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upgrade failed.";
    return settingsRedirect(request.nextUrl.origin, { upgrade: "error", message });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
