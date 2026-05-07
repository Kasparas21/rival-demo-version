import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { RivalLogoImg } from "@/components/rival-logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const HERO_VIDEO_SRC = "/smooth_animation_for_202603181849.mp4";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, full_name, company_name, company_url, company_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f2f4f8]">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
        aria-hidden
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-[#E9F1B5]/28 blur-[130px]" />
        <div className="absolute right-[-10%] top-[0%] h-[min(700px,95vw)] w-[min(700px,95vw)] rounded-full bg-[#F3E3FF]/32 blur-[150px]" />
        <div className="absolute left-[20%] bottom-[0%] h-[min(500px,80vw)] w-[min(500px,80vw)] rounded-full bg-[#DDF1FD]/28 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 via-white/10 to-white/14" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#e8ecf4]/22 to-transparent" />
      </div>

      <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
            >
              <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
            </Link>
          </div>
          <OnboardingForm initialData={profile} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
