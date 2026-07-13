import { redirect } from "next/navigation";
import { adminSkipCheckoutDestination, getBillingEntitlement, shouldShowAwaitingQuotePage } from "@/lib/billing/entitlements";
import { LoginForm } from "@/components/auth/login-form";
import { AuthSetupError } from "@/components/auth/auth-setup-error";
import {
  firstParam,
  postOnboardingPath,
  safeAuthNextPath,
  type SearchParams,
} from "@/lib/auth/auth-page-helpers";
import { matchesTesterInviteCode, normalizeInviteCode } from "@/lib/billing/tester-invite";
import { getTesterInviteCodeFromCookies } from "@/lib/billing/tester-invite-server";
import { AWAITING_QUOTE_AFTER_TRIAL_PATH, isPostGuestSignupPath } from "@/lib/auth/trial-flow";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { resolveIncompleteOnboardingPath } from "@/lib/onboarding/phase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const safeNext = safeAuthNextPath(firstParam(params.next), "/login");
  const safePostOnboardingPath = safeNext ? postOnboardingPath(safeNext) : null;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return <AuthSetupError message={e instanceof Error ? e.message : "Missing Supabase configuration."} />;
  }

  if (firstParam(params.switch) === "1") {
    await supabase.auth.signOut();
    redirect("/login");
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
    const rawNext = safePostOnboardingPath ?? DASHBOARD_HOME_PATH;
    const dest = adminSkipCheckoutDestination(rawNext, billing.isUnlimited);
    if (!profile?.onboarding_completed) {
      if (safeNext && isPostGuestSignupPath(safeNext)) {
        redirect(AWAITING_QUOTE_AFTER_TRIAL_PATH);
      }
      redirect(resolveIncompleteOnboardingPath(profile, billing, dest));
    }
    if (shouldShowAwaitingQuotePage(billing)) {
      redirect(`/awaiting-quote?next=${encodeURIComponent(dest)}`);
    }
    redirect(dest);
  }

  const testerFromQuery = firstParam(params.tester);
  const testerFromQueryCode =
    testerFromQuery && matchesTesterInviteCode(testerFromQuery)
      ? normalizeInviteCode(testerFromQuery)
      : null;
  const testerInviteCode = testerFromQueryCode ?? (await getTesterInviteCodeFromCookies());

  return <LoginForm testerInviteCode={testerInviteCode} />;
}
