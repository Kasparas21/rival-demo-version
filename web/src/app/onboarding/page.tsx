import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
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
  const destinationAfterOnboarding = nextPath ? postOnboardingPath(nextPath) : "/dashboard";
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

  if (profile?.onboarding_completed) {
    redirect(destinationAfterOnboarding);
  }

  return (
    <RivalVideoShell footerTint="light">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
          >
            <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
          </Link>
        </div>
        <OnboardingForm initialData={profile} postOnboardingPath={destinationAfterOnboarding} userId={user.id} />
      </div>
    </RivalVideoShell>
  );
}
