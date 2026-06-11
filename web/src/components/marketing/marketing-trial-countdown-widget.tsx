"use client";

import Link from "next/link";

import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { glassPillMobileMenuMaterialClass } from "@/components/ui/glass-styles";
import { formatTrialCountdown } from "@/components/marketing/marketing-trial-countdown";

type Props = {
  secondsLeft: number;
  expired: boolean;
};

/** Pinned trial clock — desktop: right-center; mobile: below header. */
export function MarketingTrialCountdownWidget({ secondsLeft, expired }: Props) {
  if (expired) {
    return (
      <>
        <div
          className="pointer-events-none fixed inset-x-3 top-[4.25rem] z-[45] md:hidden"
          data-demo-wall-ignore
        >
          <LandingTrialCta href="/onboarding" size="lg" className="pointer-events-auto w-full">
            TRY FOR FREE NOW
          </LandingTrialCta>
        </div>
        <div
          className="pointer-events-none fixed right-4 top-1/2 z-[45] hidden w-[min(100%,18rem)] -translate-y-1/2 md:block"
          data-demo-wall-ignore
        >
          <LandingTrialCta href="/onboarding" size="lg" className="pointer-events-auto w-full">
            TRY FOR FREE NOW
          </LandingTrialCta>
        </div>
      </>
    );
  }

  const clockShell = `block w-full rounded-2xl border px-4 py-3 text-left shadow-[0_16px_48px_-12px_rgba(74,127,165,0.35)] transition hover:border-white/90 hover:shadow-[0_20px_56px_-12px_rgba(74,127,165,0.42)] ${glassPillMobileMenuMaterialClass}`;

  return (
    <>
      <Link
        href="/onboarding"
        className={`fixed inset-x-3 top-[4.25rem] z-[45] md:hidden ${clockShell}`}
        data-demo-wall-ignore
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">Free trial</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none text-[#1e3a5f]">
          {formatTrialCountdown(secondsLeft)}
        </p>
        <p className="mt-1 text-xs text-[#64748b]">Tap to start your free trial</p>
      </Link>

      <Link
        href="/onboarding"
        className={`fixed right-4 top-1/2 z-[45] hidden w-36 -translate-y-1/2 md:block ${clockShell}`}
        data-demo-wall-ignore
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">Free trial</p>
        <p className="mt-1 font-mono text-[clamp(1.5rem,2.5vw,1.85rem)] font-bold tabular-nums leading-none text-[#1e3a5f]">
          {formatTrialCountdown(secondsLeft)}
        </p>
        <p className="mt-2 text-[11px] leading-snug text-[#64748b]">Click to claim your trial</p>
      </Link>
    </>
  );
}
