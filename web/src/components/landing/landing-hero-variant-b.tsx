"use client";

import { HeroCoverageStrip } from "@/components/landing/hero-autopilot-strip";
import { HeroVariantBGlowCta } from "@/components/landing/hero-variant-b-glow-cta";
import { HeroHeadline } from "@/components/landing/hero-headline";
import { ProgressiveRivalVideoBackdrop } from "@/components/ui/progressive-rival-video-backdrop";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  hero: LandingCopy["hero"];
};

/** Centered hero for PostHog variant B - blue top wash fading into section 2. */
export function LandingHeroVariantB({ hero }: Props) {
  return (
    <section className="landing-hero-variant-b relative isolate overflow-x-clip bg-[#f2f4f8] pb-0 text-[#1a1a1a]">
      <div className="relative z-10 flex flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#f2f4f8]">
          <ProgressiveRivalVideoBackdrop footerTint="light" className="h-full min-h-full" />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-b from-transparent via-white/75 to-white sm:h-48"
        />

        <div className="landing-hero-copy-zone landing-hero-copy-zone--variant-b pb-10 sm:pb-12 md:pb-14">
          <HeroHeadline headline={hero.headline} variant="variant-b" showSubline />
          <div className="landing-hero-copy-zone__cta">
            <HeroVariantBGlowCta />
          </div>
          <HeroCoverageStrip coverage={hero.coverage} />
        </div>
      </div>
    </section>
  );
}
