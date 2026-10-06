import { redirect } from "next/navigation";

import { AwaitingQuoteContent } from "@/components/billing/awaiting-quote-content";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  shouldShowPaywall,
} from "@/lib/billing/entitlements";
import { buildQuoteAccessHref } from "@/lib/billing/checkout-url";
import { formatQuotePrice, isComplimentaryQuote } from "@/lib/billing/custom-quotes";
import { buildPaywallHref } from "@/lib/billing/paywall";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && value !== "/awaiting-quote") {
    return value;
  }
  return DASHBOARD_HOME_PATH;
}

export default async function AwaitingQuotePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const nextPath = safeNextPath(firstParam(params.next));
  const checkoutError = firstParam(params.checkout_error);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/awaiting-quote?next=${encodeURIComponent(nextPath)}`)}`);
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const destination = adminSkipCheckoutDestination(nextPath, billing.isUnlimited);

  if (!shouldShowPaywall(billing)) {
    redirect(destination);
  }

  const pendingQuote = billing.pendingQuote;
  /** No admin-sent quote — the standard plan picker is the way in. */
  if (!pendingQuote) {
    const paywallHref = buildPaywallHref(nextPath);
    redirect(
      checkoutError
        ? `${paywallHref}${paywallHref.includes("?") ? "&" : "?"}checkout_error=${encodeURIComponent(checkoutError)}`
        : paywallHref,
    );
  }
  const isComplimentary = isComplimentaryQuote(pendingQuote);
  const checkoutHref = buildQuoteAccessHref(pendingQuote.checkout_token, isComplimentary, nextPath);
  const priceLabel = formatQuotePrice(pendingQuote.price_cents, pendingQuote.currency);

  return (
    <AwaitingQuoteContent
      checkoutError={checkoutError}
      checkoutHref={checkoutHref}
      priceLabel={priceLabel}
      billingPeriod={pendingQuote.billing_period}
      isComplimentary={isComplimentary}
    />
  );
}
