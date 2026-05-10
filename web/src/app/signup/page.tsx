import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthSetupError } from "@/components/auth/auth-setup-error";
import { firstParam, postOnboardingPath, safeAuthNextPath, type SearchParams } from "@/lib/auth/auth-page-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
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
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.onboarding_completed) {
      redirect(safePostOnboardingPath ? `/onboarding?next=${encodeURIComponent(safePostOnboardingPath)}` : "/onboarding");
    }
    redirect(safePostOnboardingPath ?? "/dashboard/spy");
  }

  return <SignupForm />;
}
