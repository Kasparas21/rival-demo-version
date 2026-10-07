import { redirect } from "next/navigation";
import { OnboardingPlanPicker } from "@/components/billing/onboarding-plan-picker";
import { claimTesterAccessForUser } from "@/lib/billing/claim-tester-access-core";
import { buildAwaitingQuoteHref } from "@/lib/billing/checkout-url";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  shouldShowPaywall,
} from "@/lib/billing/entitlements";
import { buildPaywallHref } from "@/lib/billing/paywall";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { isTesterInviteFlowEligibleForUser, resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";
import { safeNextPath } from "@/lib/auth/safe-next-path";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function resolveNextPath(value: string | null): string {
  const safe = safeNextPath(value);
  return safe && !safe.startsWith("/choose-plan") ? safe : DASHBOARD_HOME_PATH;
}

/** Paywall: anyone without an active plan picks one here after onboarding. */
export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getRequestLocale();
  const copy = getOnboardingCopy(locale);
  const params = (await searchParams) ?? {};
  const nextPath = resolveNextPath(firstParam(params.next));
  const checkoutError = firstParam(params.checkout_error);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(buildPaywallHref(nextPath))}`);
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const destination = adminSkipCheckoutDestination(nextPath, billing.isUnlimited);

  if (!shouldShowPaywall(billing)) {
    redirect(destination);
  }

  /** Admin-sent custom quote takes precedence over the standard plans. */
  if (billing.pendingQuote) {
    const quoteHref = buildAwaitingQuoteHref(nextPath);
    redirect(
      checkoutError
        ? `${quoteHref}${quoteHref.includes("?") ? "&" : "?"}checkout_error=${encodeURIComponent(checkoutError)}`
        : quoteHref,
    );
  }

  const testerInviteActive = await isTesterInviteFlowEligibleForUser(user.id);
  if (testerInviteActive) {
    const inviteCode = await resolveTesterInviteCodeForUser(user.id);
    const admin = createSupabaseAdminClient();
    const claim = await claimTesterAccessForUser(admin, user.id, inviteCode);
    if (claim.ok) {
      redirect(POST_PAYMENT_ONBOARDING_PATH);
    }
  }

  return (
    <OnboardingPlanPicker
      locale={locale}
      localeSwitcherAria={copy.localeSwitcherAria}
      copy={copy.planPicker}
      dashboardNext={destination}
      testerInviteActive={testerInviteActive}
      checkoutError={checkoutError}
    />
  );
}
