import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TRIAL_PENDING_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { CHOOSE_PLAN_AFTER_TRIAL_PATH, shouldRedirectToTrialComplete } from "@/lib/auth/trial-flow";
import { OnboardingDevHints } from "@/components/onboarding/onboarding-dev-hints";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  hasActivePaidSubscription,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import { canReplayOnboardingInDev } from "@/lib/auth/local-dev";
import { OnboardingFlowHeader } from "@/components/onboarding/onboarding-flow-header";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { isTesterInviteFlowEligibleForUser } from "@/lib/billing/tester-invite-server";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizedWorkspaceHost, sanitizeCompanyUrlInput } from "@/lib/onboarding/host";
import {
  hasPrePaymentSetup,
  isPostPaymentOnboardingSearchParams,
  shouldResumePostPaymentOnboarding,
} from "@/lib/onboarding/phase";
import { parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && value !== "/login" && value !== "/onboarding"
    ? value
    : null;
}

function postOnboardingPath(path: string): string {
  return path === "/checkout" ? "/api/billing/checkout" : path;
}

function initialDomainFromParams(params: SearchParams): string | null {
  const raw = firstParam(params.domain);
  if (!raw) return null;
  const host = normalizedWorkspaceHost(sanitizeCompanyUrlInput(raw));
  return host || null;
}

function OnboardingShell({
  children,
  showReplay,
}: {
  children: ReactNode;
  showReplay?: boolean;
}) {
  return (
    <RivalVideoShell footerTint="light">
      <div className="flex w-full flex-col items-center px-4 sm:px-6">
        <OnboardingFlowHeader className="max-w-5xl" />
        {children}
        <OnboardingDevHints showReplay={showReplay} />
      </div>
    </RivalVideoShell>
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getRequestLocale();
  const copy = getOnboardingCopy(locale);
  const params = (await searchParams) ?? {};
  const nextPath = safeNextPath(firstParam(params.next));
  const replayOnboarding = firstParam(params.replay) === "1" && canReplayOnboardingInDev();
  const initialDomain = initialDomainFromParams(params);
  const explicitPostPayment = isPostPaymentOnboardingSearchParams(params);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <OnboardingShell>
        <OnboardingForm
          copy={copy}
          locale={locale}
          guestMode
          initialDomain={initialDomain}
          userId="guest"
          showPlanStep={false}
        />
      </OnboardingShell>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, company_name, company_url")
    .eq("id", user.id)
    .maybeSingle();

  const billing = await getBillingEntitlement(supabase, user.id);
  const testerInviteActive = await isTesterInviteFlowEligibleForUser(user.id);
  const postPaymentResume = shouldResumePostPaymentOnboarding(profile, billing) || explicitPostPayment;
  const rawDestination = nextPath ? postOnboardingPath(nextPath) : DASHBOARD_HOME_PATH;
  const destinationAfterOnboarding = adminSkipCheckoutDestination(rawDestination, billing.isUnlimited);
  const needsPlanPicker = shouldShowPostOnboardingPlanPicker(billing);
  const postOnboardingDestination = postPaymentResume
    ? buildWorkspaceBrandScrapeHref()
    : needsPlanPicker
      ? `/choose-plan?next=${encodeURIComponent(destinationAfterOnboarding)}`
      : destinationAfterOnboarding;

  if (profile?.onboarding_completed && !replayOnboarding) {
    if (needsPlanPicker) {
      redirect(`/choose-plan?next=${encodeURIComponent(destinationAfterOnboarding)}`);
    }
    redirect(destinationAfterOnboarding);
  }

  if (
    user &&
    !replayOnboarding &&
    !postPaymentResume &&
    !hasPrePaymentSetup(profile) &&
    shouldRedirectToTrialComplete(
      null,
      (await cookies()).get(TRIAL_PENDING_COOKIE)?.value,
    )
  ) {
    redirect(CHOOSE_PLAN_AFTER_TRIAL_PATH);
  }

  if (hasPrePaymentSetup(profile) && needsPlanPicker && !replayOnboarding && !postPaymentResume) {
    redirect(`/choose-plan?next=${encodeURIComponent(destinationAfterOnboarding)}`);
  }

  if (
    hasPrePaymentSetup(profile) &&
    !postPaymentResume &&
    (billing.isUnlimited || hasActivePaidSubscription(billing)) &&
    !replayOnboarding
  ) {
    redirect("/onboarding?phase=post_payment");
  }

  let initialBrandSetup = null;
  if (postPaymentResume) {
    const admin = createSupabaseAdminClient();
    const { data: brandRows } = await admin
      .from("brands")
      .select("ads_profile_setup")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    initialBrandSetup = parseAdsProfileSetup(brandRows?.[0]?.ads_profile_setup ?? null);
  }

  return (
    <OnboardingShell showReplay={replayOnboarding}>
      <OnboardingForm
        copy={copy}
        locale={locale}
        initialData={profile}
        initialDomain={initialDomain}
        postOnboardingPath={postOnboardingDestination}
        prePaymentOnly={!postPaymentResume && !hasPrePaymentSetup(profile)}
        showPlanStep={false}
        testerInviteActive={testerInviteActive}
        userId={user.id}
        postPaymentResume={postPaymentResume}
        initialBrandSetup={initialBrandSetup}
      />
    </OnboardingShell>
  );
}
