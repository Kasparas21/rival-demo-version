import { LandingFinalCtaPricing } from "@/components/landing/landing-final-cta-pricing";
import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  copy: LandingCopy["finalCta"];
};

export function LandingFinalCTA({ copy }: Props) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <LandingScrollReveal>
          <div className="relative overflow-visible rounded-[2rem] border border-white/70 bg-white/45 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_64px_-24px_rgba(74,127,165,0.35)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-white/50 sm:rounded-[2.25rem] sm:px-10 sm:py-12">
            <div className="relative">
              <h2 className={landingSectionHeadlineClasses}>
                {copy.titleLine1}
                <br />
                <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
              </h2>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-gray-500 sm:text-base">{copy.subtitle}</p>

              <div className="mx-auto mt-8 flex justify-center px-1">
                <LandingFinalCtaPricing
                  monthlyPrice={copy.monthlyPrice}
                  annualPrice={copy.annualPrice}
                  monthlyLabel={copy.monthlyLabel}
                  annualLabel={copy.annualLabel}
                  annualSaveBadge={copy.annualSaveBadge}
                  billingAria={copy.billingAria}
                />
              </div>

              <div className="mx-auto mt-8 w-full max-w-lg">
                <LandingContactCta size="lg" trailingArrow />
              </div>

              <p className="mt-5 text-xs text-gray-400">{copy.cancelNote}</p>
            </div>
          </div>
        </LandingScrollReveal>
      </div>
    </section>
  );
}
