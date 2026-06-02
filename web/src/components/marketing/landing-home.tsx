import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCTA } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  LandingPageBackground,
  LandingSectionDivider,
} from "@/components/landing/landing-page-background";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingReviews } from "@/components/landing/landing-reviews";
import { LandingStackReplacement } from "@/components/landing/landing-stack-replacement";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  copy: LandingCopy;
  locale: Locale;
};

export default function LandingHome({ copy, locale }: Props) {
  return (
    <div className="w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased">
      <LandingHeader copy={copy.header} locale={locale} />
      <div className="w-full overflow-x-clip">
        <LandingHero copy={copy.hero} />

        <div className="relative isolate">
          <LandingPageBackground />

          <div className="relative z-10">
            <LandingFeatures copy={copy.features} />
            <LandingSectionDivider />
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
