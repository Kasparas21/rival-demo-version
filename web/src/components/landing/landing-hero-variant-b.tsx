"use client";

import dynamic from "next/dynamic";

import { HeroCoverageStrip } from "@/components/landing/hero-autopilot-strip";
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
  hero: LandingCopy["hero"];
};

/** Centered hero for PostHog variant B - blue top wash fading into section 2. */
export function LandingHeroVariantB({ hero }: Props) {
  return (
    <section className="landing-hero-variant-b relative isolate overflow-x-clip bg-white pb-8 text-[#1a1a1a] sm:pb-10 md:pb-12">
      <div className="relative z-10 flex flex-col">
        <div
          aria-hidden
          className="landing-hero-variant-b__sky pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden max-md:h-[min(96vh,44rem)] max-md:min-h-full md:inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#9ec5e3] from-0% via-[#b3d5ea] via-[16%] via-[#c2dff0] via-[30%] via-[#b8d9eb] via-[42%] via-[#c8e2f1] via-[52%] via-[#d4e9f4] via-[62%] via-[#dceef6] via-[72%] via-[#eaf4fa] via-[82%] via-[#f4f9fc] via-[92%] to-white" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_90%_at_50%_2%,rgba(74,127,165,0.5),transparent_72%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_68%_at_50%_42%,rgba(58,110,148,0.24),transparent_78%)] max-md:opacity-100" />
          <HeroVariantBSkyClouds />
          <div className="max-md:hidden">
            <HeroVariantBGeometry />
          </div>
        </div>

        <div className="landing-hero-copy-zone landing-hero-copy-zone--variant-b">
          <HeroHeadline headline={hero.headline} variant="variant-b" showSubline />
          <div className="landing-hero-copy-zone__cta">
            <HeroVariantBGlowCta href="/onboarding">{hero.trialCta}</HeroVariantBGlowCta>
          </div>
          <HeroCoverageStrip coverage={hero.coverage} />
        </div>
      </div>
    </section>
  );
}
