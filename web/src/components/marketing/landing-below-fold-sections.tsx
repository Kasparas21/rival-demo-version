import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCTA } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import {
  LandingPageBackground,
  LandingSectionDivider,
} from "@/components/landing/landing-page-background";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingReviews } from "@/components/landing/landing-reviews";
import { LandingStackReplacement } from "@/components/landing/landing-stack-replacement";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  copy: LandingCopy;
  showFeatures: boolean;
};

export function LandingBelowFoldSections({ copy, showFeatures }: Props) {
  return (
    <div className="relative isolate">
      <LandingPageBackground />

      <div className="relative z-10">
        {showFeatures ? (
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
  );
}
