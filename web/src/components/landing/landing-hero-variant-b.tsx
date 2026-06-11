"use client";

import dynamic from "next/dynamic";

import { HeroVariantBDeferredDemo } from "@/components/landing/hero-variant-b-deferred-demo";
import { HeroVariantBDemoEntrance } from "@/components/landing/hero-variant-b-demo-entrance";
import { HeroVariantBGlowCta } from "@/components/landing/hero-variant-b-glow-cta";
import { HeroHeadline } from "@/components/landing/hero-headline";
import { HeroVariantBSkyClouds } from "@/components/landing/hero-variant-b-sky-clouds";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const HeroVariantBGeometry = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-geometry").then((m) => m.HeroVariantBGeometry),
  { ssr: false },
);

type Props = {
  headline: LandingCopy["hero"]["headline"];
  trialCtaLabel?: string;
};

/** Centered hero for PostHog variant B — blue top wash fading into section 2. */
export function LandingHeroVariantB({ headline, trialCtaLabel = "TRY FOR FREE" }: Props) {
  return (
    <section className="landing-hero-variant-b relative isolate overflow-x-clip bg-white pb-10 text-[#1a1a1a] sm:pb-14 md:flex md:min-h-svh md:flex-col md:pb-0">
      <div className="relative z-10 flex flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#9ec5e3] from-0% via-[#b3d5ea] via-[18%] via-[#c2dff0] via-[32%] via-[#d4e9f4] via-[46%] via-[#e3f1f8] via-[54%] to-white to-[62%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_52%_at_50%_-6%,rgba(74,127,165,0.52),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_42%_at_50%_14%,rgba(58,110,148,0.28),transparent_64%)] max-md:opacity-80" />
          <HeroVariantBSkyClouds />
          <div className="max-md:hidden">
            <HeroVariantBGeometry />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-[1] h-[min(36vh,300px)] bg-gradient-to-b from-transparent from-0% via-[#eef6fb]/75 via-[42%] via-white/90 via-[72%] to-white"
          />
        </div>

        <div className="landing-hero-copy-zone landing-hero-copy-zone--variant-b">
          <HeroHeadline headline={headline} variant="variant-b" showSubline />
          <div className="landing-hero-copy-zone__cta">
            <HeroVariantBGlowCta href="/onboarding">{trialCtaLabel}</HeroVariantBGlowCta>
          </div>
        </div>

        <div className="relative z-10 shrink-0 px-3 pb-10 sm:px-4 md:px-4 md:pb-12">
          <HeroVariantBDemoEntrance>
            <HeroVariantBDeferredDemo />
          </HeroVariantBDemoEntrance>
        </div>
      </div>
    </section>
  );
}
