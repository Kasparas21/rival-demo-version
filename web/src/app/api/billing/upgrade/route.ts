import { NextResponse, type NextRequest } from "next/server";
import { SubscriptionProrationBehavior } from "@polar-sh/sdk/models/components/subscriptionprorationbehavior";
import { getAppUrl } from "@/lib/billing/config";
import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { createPolarClient } from "@/lib/billing/polar";
import { resolveUpgradeProductId } from "@/lib/billing/upgrade-plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function settingsRedirect(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL("/dashboard/settings", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
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
  const polar = createPolarClient();

  try {
    await polar.subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        productId: targetProductId,
        prorationBehavior: SubscriptionProrationBehavior.Prorate,
      },
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const paymentFailed = /payment|402|declined|card/i.test(raw);
    return settingsRedirect(request.nextUrl.origin, {
      upgrade: "error",
      message: paymentFailed
        ? "Payment failed — update your card in Manage subscription and try again."
        : raw.length > 200
          ? `${raw.slice(0, 200)}…`
          : raw,
    });
  }

  return settingsRedirect(getAppUrl(), { upgrade: "success" });
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
