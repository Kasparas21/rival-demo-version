import { redirect } from "next/navigation";
import { OnboardingPlanPicker } from "@/components/billing/onboarding-plan-picker";
import { claimTesterAccessForUser } from "@/lib/billing/claim-tester-access-core";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { isTesterInviteFlowEligibleForUser, resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && value !== "/choose-plan") {
    return value;
  }
  return DASHBOARD_HOME_PATH;
}

export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getRequestLocale();
  const copy = getOnboardingCopy(locale);
  const params = (await searchParams) ?? {};
  const nextPath = safeNextPath(firstParam(params.next));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/choose-plan?next=${encodeURIComponent(nextPath)}`)}`);
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const destination = adminSkipCheckoutDestination(nextPath, billing.isUnlimited);

  if (!shouldShowPostOnboardingPlanPicker(billing)) {
    redirect(destination);
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

  const checkoutError = firstParam(params.checkout_error);

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
