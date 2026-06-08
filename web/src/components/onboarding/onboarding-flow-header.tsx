import Link from "next/link";

import { RivalLogoImg } from "@/components/rival-logo";

type Props = {
  homeHref?: string;
  homeAriaLabel?: string;
  className?: string;
};

/** Centered Rival logo above onboarding / choose-plan cards. */
export function OnboardingFlowHeader({
  homeHref = "/",
  homeAriaLabel = "Rival home",
  className = "",
}: Props) {
  return (
    <div className={`mb-8 flex w-full justify-center ${className}`.trim()}>
      <Link
        href={homeHref}
        aria-label={homeAriaLabel}
        className="rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>
    </div>
  );
}
