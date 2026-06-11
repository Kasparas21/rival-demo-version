import { fontTempting } from "@/lib/fonts/tempting";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { LandingPageBackground, LandingSectionDivider } from "@/components/landing/landing-page-background";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { FeaturesPageHero } from "@/components/marketing/features-page-hero";
import { FEATURE_DEFINITIONS } from "@/components/marketing/features-page-data";
import { FeaturesPageSection } from "@/components/marketing/features-page-section";

type Props = {
  copy: LandingCopy;
  locale: Locale;
};

export function FeaturesPage({ copy, locale }: Props) {
  return (
    <div
      className={`${fontTempting.variable} w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased`}
    >
      <LandingHeader copy={copy.header} locale={locale} />

      <div className="relative isolate pt-28 sm:pt-32">
        <LandingPageBackground />

        <main className="relative z-10">
          {/* Hero */}
          <section className="px-4 pb-12 pt-6 text-center sm:px-6 sm:pb-16 sm:pt-8">
            <LandingScrollReveal>
              <FeaturesPageHero />
            </LandingScrollReveal>
          </section>

          <LandingSectionDivider />

          {/* Feature sections */}
          {FEATURE_DEFINITIONS.map((feature, index) => (
            <div key={feature.id}>
              <FeaturesPageSection feature={feature} reverse={index % 2 === 1} />
              {index < FEATURE_DEFINITIONS.length - 1 ? <LandingSectionDivider /> : null}
            </div>
          ))}

          {/* Closing CTA */}
          <section className="px-4 py-20 sm:px-6 sm:py-28">
            <LandingScrollReveal className="mx-auto max-w-lg text-center">
              <LandingTrialCta href="/checkout" size="lg">
                TRY FOR FREE
                <span aria-hidden>→</span>
              </LandingTrialCta>
              <p className="mt-4 text-xs text-gray-500">1 competitor · card required · cancel anytime</p>
            </LandingScrollReveal>
          </section>

          <LandingSectionDivider />
          <LandingFooter copy={copy.footer} />
        </main>
      </div>
    </div>
  );
}
