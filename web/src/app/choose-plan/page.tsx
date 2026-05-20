import { redirect } from "next/navigation";
import { OnboardingPlanPicker } from "@/components/billing/onboarding-plan-picker";
import {
  adminSkipCheckoutDestination,
  getBillingEntitlement,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const params = (await searchParams) ?? {};
  const nextPath = safeNextPath(firstParam(params.next));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/choose-plan?next=${encodeURIComponent(nextPath)}`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect(`/onboarding?next=${encodeURIComponent(nextPath)}`);
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const destination = adminSkipCheckoutDestination(nextPath, billing.isUnlimited);

  if (!shouldShowPostOnboardingPlanPicker(billing)) {
    redirect(destination);
  }

  return <OnboardingPlanPicker dashboardNext={destination} />;
}
