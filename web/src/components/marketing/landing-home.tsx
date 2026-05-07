import { LandingBrandMarquee } from "@/components/landing/landing-brand-marquee";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCTA } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingReviews } from "@/components/landing/landing-reviews";

export default function LandingHome() {
  return (
    <div className="font-sans text-[#1a1a1a] antialiased">
      <LandingHeader />
      {/* Hero handles top padding under the fixed header so its video backdrop can reach the top edge */}
      <div>
        <LandingHero />
        <LandingBrandMarquee />
        <LandingFeatures />
        <LandingReviews />
        <LandingFAQ />
        <LandingFinalCTA />
        <LandingFooter />
      </div>
    </div>
  );
}
