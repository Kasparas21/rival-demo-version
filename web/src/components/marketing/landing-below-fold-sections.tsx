import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingAutopilot } from "@/components/landing/landing-autopilot";
import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingCoverage } from "@/components/landing/landing-coverage";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingMcp } from "@/components/landing/landing-mcp";
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
};

export function LandingBelowFoldSections({ copy }: Props) {
  return (
    <div className="relative isolate">
      <LandingPageBackground />

      <div className="relative z-10">
        <LandingHowItWorks copy={copy.howItWorks} />
        <LandingSectionDivider />
        <LandingAutopilot copy={copy.autopilot} />
        <LandingSectionDivider />
        <LandingCoverage copy={copy.coverage} />
        <LandingSectionDivider />
        <LandingMcp copy={copy.mcp} />
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
  );
}
