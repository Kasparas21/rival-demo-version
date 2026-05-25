import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingDevHints } from "@/components/onboarding/onboarding-dev-hints";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import { canReplayOnboardingInDev } from "@/lib/auth/local-dev";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { isTesterInviteFlowEligibleForUser } from "@/lib/billing/tester-invite-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const nextPath = safeNextPath(firstParam(params.next));
  const replayOnboarding = firstParam(params.replay) === "1" && canReplayOnboardingInDev();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, company_name, company_url")
    .eq("id", user.id)
    .maybeSingle();

  const billing = await getBillingEntitlement(supabase, user.id);
  const rawDestination = nextPath ? postOnboardingPath(nextPath) : "/dashboard/spy";
  const destinationAfterOnboarding = adminSkipCheckoutDestination(rawDestination, billing.isUnlimited);
  const showPlanStep = shouldShowPostOnboardingPlanPicker(billing);
  const testerInviteActive = await isTesterInviteFlowEligibleForUser(user.id);

  if (profile?.onboarding_completed && !replayOnboarding) {
    if (showPlanStep) {
      redirect(`/choose-plan?next=${encodeURIComponent(destinationAfterOnboarding)}`);
    }
    redirect(destinationAfterOnboarding);
  }

  return (
    <RivalVideoShell footerTint="light">
      <div className="flex w-full flex-col items-center px-4 sm:px-6">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
          >
            <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
          </Link>
        </div>
        <OnboardingForm
          initialData={profile}
          postOnboardingPath={destinationAfterOnboarding}
          showPlanStep={showPlanStep}
          testerInviteActive={testerInviteActive}
          userId={user.id}
        />
        <OnboardingDevHints showReplay={replayOnboarding} />
      </div>
    </RivalVideoShell>
  );
}
