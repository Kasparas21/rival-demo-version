import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthSetupError } from "@/components/auth/auth-setup-error";
import { firstParam, postOnboardingPath, safeAuthNextPath, type SearchParams } from "@/lib/auth/auth-page-helpers";
import { getBillingEntitlement, shouldShowAwaitingQuotePage } from "@/lib/billing/entitlements";
import { matchesTesterInviteCode, normalizeInviteCode } from "@/lib/billing/tester-invite";
import { getTesterInviteCodeFromCookies } from "@/lib/billing/tester-invite-server";
import { AWAITING_QUOTE_AFTER_TRIAL_PATH, isPostGuestSignupPath } from "@/lib/auth/trial-flow";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { hasPrePaymentSetup, resolveIncompleteOnboardingPath } from "@/lib/onboarding/phase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getSignupCopy } from "@/lib/i18n/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getSignupCopy(locale);
  return { title: copy.pageTitle };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getRequestLocale();
  const copy = getSignupCopy(locale);
  const params = (await searchParams) ?? {};
  const safeNext = safeAuthNextPath(firstParam(params.next), "/signup");
  const safePostOnboardingPath = safeNext ? postOnboardingPath(safeNext) : null;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return <AuthSetupError message={e instanceof Error ? e.message : "Missing Supabase configuration."} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, company_url")
      .eq("id", user.id)
      .maybeSingle();
    const billing = await getBillingEntitlement(supabase, user.id);
    const dest = safePostOnboardingPath ?? DASHBOARD_HOME_PATH;

    /** Trial funnel: show signup after guest onboarding — never skip straight to plans. */
    if (
      safeNext &&
      isPostGuestSignupPath(safeNext) &&
      !profile?.onboarding_completed &&
      !hasPrePaymentSetup(profile)
    ) {
      await supabase.auth.signOut();
    } else if (!profile?.onboarding_completed) {
      if (safeNext && isPostGuestSignupPath(safeNext)) {
        redirect(AWAITING_QUOTE_AFTER_TRIAL_PATH);
      }
      redirect(resolveIncompleteOnboardingPath(profile, billing, dest));
    } else if (shouldShowAwaitingQuotePage(billing)) {
      redirect(`/awaiting-quote?next=${encodeURIComponent(dest)}`);
    } else {
      redirect(dest);
    }
  }

  const testerFromQuery = firstParam(params.tester);
  const testerFromQueryCode =
    testerFromQuery && matchesTesterInviteCode(testerFromQuery)
      ? normalizeInviteCode(testerFromQuery)
      : null;
  const testerInviteCode = testerFromQueryCode ?? (await getTesterInviteCodeFromCookies());

  return <SignupForm copy={copy} locale={locale} testerInviteCode={testerInviteCode} />;
}
