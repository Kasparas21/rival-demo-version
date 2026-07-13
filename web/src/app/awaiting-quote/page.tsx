import { redirect } from "next/navigation";

import { AwaitingQuoteContent } from "@/components/billing/awaiting-quote-content";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  hasActivePaidSubscription,
  shouldShowAwaitingQuotePage,
} from "@/lib/billing/entitlements";
import { buildQuoteCheckoutHref, formatQuotePrice, isComplimentaryQuote } from "@/lib/billing/custom-quotes";
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

  if (!shouldShowAwaitingQuotePage(billing)) {
    redirect(destination);
  }

  const pendingQuote = billing.pendingQuote;
  const checkoutHref = pendingQuote
    ? buildQuoteCheckoutHref(pendingQuote.checkout_token, nextPath)
    : null;
  const priceLabel = pendingQuote
    ? formatQuotePrice(pendingQuote.price_cents, pendingQuote.currency)
    : null;
  const isComplimentary = pendingQuote ? isComplimentaryQuote(pendingQuote) : false;

  return (
    <AwaitingQuoteContent
      checkoutError={checkoutError}
      checkoutHref={checkoutHref}
      priceLabel={priceLabel}
      billingPeriod={pendingQuote?.billing_period ?? null}
      nextPath={nextPath}
      isComplimentary={isComplimentary}
    />
  );
}
