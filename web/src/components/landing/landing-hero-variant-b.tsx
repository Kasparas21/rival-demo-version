"use client";

import dynamic from "next/dynamic";

import { HeroVariantBDemoEntrance } from "@/components/landing/hero-variant-b-demo-entrance";
import { HeroVariantBGlowCta } from "@/components/landing/hero-variant-b-glow-cta";
import { HeroVariantBSkyClouds } from "@/components/landing/hero-variant-b-sky-clouds";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const HeroVariantBGeometry = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-geometry").then((m) => m.HeroVariantBGeometry),
  { ssr: false },
);

const HeroVariantBProductDemo = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-product-demo").then(
      (m) => m.HeroVariantBProductDemo,
    ),
  {
    ssr: false,
    loading: () => <div className="mx-auto h-[min(52vh,420px)] max-w-6xl px-4" aria-hidden />,
  },
);

type Props = {
  headline: LandingCopy["hero"]["headline"];
  trialCtaLabel?: string;
};

/** Centered hero for PostHog variant B — blue top wash fading into section 2. */
export function LandingHeroVariantB({ headline, trialCtaLabel = "Start your 7-day trial →" }: Props) {
  return (
    <section className="landing-hero-variant-b relative isolate overflow-x-clip bg-white pb-10 text-[#1a1a1a] sm:pb-14 md:flex md:min-h-svh md:flex-col md:pb-0">
      <div className="relative z-10 flex flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#9ec5e3] from-0% via-[#b3d5ea] via-[18%] via-[#c2dff0] via-[32%] via-[#d4e9f4] via-[46%] via-[#e3f1f8] via-[54%] to-white to-[62%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_52%_at_50%_-6%,rgba(74,127,165,0.52),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_42%_at_50%_14%,rgba(58,110,148,0.28),transparent_64%)]" />
          <HeroVariantBSkyClouds />
          <HeroVariantBGeometry />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-[1] h-[min(36vh,300px)] bg-gradient-to-b from-transparent from-0% via-[#eef6fb]/75 via-[42%] via-white/90 via-[72%] to-white"
          />
        </div>

        <div className="relative isolate flex flex-1 flex-col items-center justify-center px-3 pt-24 pb-8 sm:px-4 sm:pt-28 sm:pb-10 md:justify-start md:px-4 md:pt-[7.5rem] md:pb-8">
          <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
            <h1 id="how-it-works" className="hero-headline hero-variant-b-headline mx-auto lowercase">
              <span className="hero-headline-line hero-variant-b-headline-line block max-md:whitespace-normal md:whitespace-nowrap">
                {headline.line1Prefix}
                <span className="hero-headline-accent">{headline.highlight}</span>
              </span>
              {headline.line2 ? (
                <span className="hero-headline-line hero-variant-b-headline-line block max-md:whitespace-normal md:whitespace-nowrap">
                  {headline.line2}
                </span>
              ) : null}
            </h1>
            <p className="hero-subline mx-auto mt-4 max-w-2xl text-pretty sm:mt-5">{headline.subline}</p>

            <div className="mt-8 flex justify-center sm:mt-10">
              <HeroVariantBGlowCta href="/onboarding">{trialCtaLabel}</HeroVariantBGlowCta>
            </div>
          </div>
        </div>

        <div className="relative z-10 shrink-0 px-3 pb-10 sm:px-4 md:px-4 md:pb-12">
          <HeroVariantBDemoEntrance>
            <HeroVariantBProductDemo />
          </HeroVariantBDemoEntrance>
        </div>
      </div>
    </section>
  );
}
