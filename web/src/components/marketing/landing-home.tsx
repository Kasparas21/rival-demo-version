import dynamic from "next/dynamic";

import { LandingBrandMarquee } from "@/components/landing/landing-brand-marquee";
import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCTA } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import type { LandingHeroHeadlineVariant } from "@/lib/analytics/posthog-server";
import {
  LandingPageBackground,
  LandingSectionDivider,
} from "@/components/landing/landing-page-background";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingReviews } from "@/components/landing/landing-reviews";
import { LandingStackReplacement } from "@/components/landing/landing-stack-replacement";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

const LandingHeroVariantB = dynamic(
  () =>
    import("@/components/landing/landing-hero-variant-b").then((mod) => mod.LandingHeroVariantB),
  { ssr: true },
);

type Props = {
  copy: LandingCopy;
  locale: Locale;
  heroVariant?: LandingHeroHeadlineVariant;
};

export default function LandingHome({ copy, locale, heroVariant = "control" }: Props) {
  const isHeroVariantB = heroVariant === "test";

  return (
    <div className="w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased">
      <LandingHeader copy={copy.header} locale={locale} />
      <div className="w-full overflow-x-clip">
        {isHeroVariantB ? (
          <LandingHeroVariantB headline={copy.hero.headline} trialCtaLabel={copy.hero.trialCta} />
        ) : (
          <LandingHero copy={copy.hero} />
        )}

        {isHeroVariantB ? (
          <div className="relative z-20 -mt-6 sm:-mt-10">
            <div
              aria-hidden
              className="pointer-events-none h-16 w-full bg-gradient-to-b from-transparent via-white/85 to-white sm:h-24"
            />
            <div className="bg-white">
              <LandingBrandMarquee
                embedded
                ariaLabel={copy.hero.brandMarqueeAria}
                label={copy.hero.brandMarqueeLabel}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none h-12 w-full bg-gradient-to-b from-white via-white to-[#f7fbff] sm:h-14"
            />
          </div>
        ) : null}

        <div className="relative isolate">
          <LandingPageBackground />

          <div className="relative z-10">
            {!isHeroVariantB ? (
              <>
                <LandingFeatures copy={copy.features} />
                <LandingSectionDivider />
              </>
            ) : null}
            <LandingStackReplacement copy={copy.stackReplacement} />
            <LandingSectionDivider />
            <LandingReviews copy={copy.reviews} />
            <LandingSectionDivider />
            <LandingPricing copy={copy.pricing} />
            <LandingSectionDivider />
            <LandingFAQ copy={copy.faq} />
            <LandingSectionDivider />
            <LandingComparison copy={copy.comparison} />
            <LandingSectionDivider />
            <LandingFinalCTA copy={copy.finalCta} />
            <LandingSectionDivider />
            <LandingFooter copy={copy.footer} />
          </div>
        </div>
      </div>
    </div>
  );
}
