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

export default function LandingHome() {
  return (
    <div className="w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased">
      <LandingHeader />
      <div className="w-full overflow-x-clip">
        <LandingHero />

        <div className="relative isolate">
          <LandingPageBackground />

          <div className="relative z-10">
            <LandingFeatures />
            <LandingSectionDivider />
            <LandingStackReplacement />
            <LandingSectionDivider />
            <LandingReviews />
            <LandingSectionDivider />
            <LandingPricing />
            <LandingSectionDivider />
            <LandingFAQ />
            <LandingSectionDivider />
            <LandingComparison />
            <LandingSectionDivider />
            <LandingFinalCTA />
            <LandingSectionDivider />
            <LandingFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
