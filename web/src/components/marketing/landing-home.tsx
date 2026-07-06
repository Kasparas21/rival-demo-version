import dynamic from "next/dynamic";

import { LandingBelowFold } from "@/components/marketing/landing-below-fold";
import { LandingBrandMarqueeDeferred } from "@/components/landing/landing-brand-marquee-deferred";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingPostHeroBackdrop } from "@/components/landing/landing-page-background";
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
};

export default function LandingHome({ copy, locale }: Props) {
  return (
    <div className="w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased">
      <LandingHeader copy={copy.header} locale={locale} />
      <div className="w-full overflow-x-clip">
        <LandingHeroVariantB hero={copy.hero} />

        <div className="relative">
          <LandingPostHeroBackdrop />

          <div className="relative z-10 -mt-8 sm:-mt-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-40 bg-gradient-to-b from-transparent via-white/70 to-transparent sm:h-52"
            />
            <div className="relative pb-16 pt-20 sm:pb-24 sm:pt-28">
              <LandingBrandMarqueeDeferred
                embedded
                ariaLabel={copy.hero.brandMarqueeAria}
                label={copy.hero.brandMarqueeLabel}
              />
            </div>
            {/* Carousel → section 2 hand-off: fade the carousel base to pure white so it
                meets section 2's white top-fade with zero step (no hard line). */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-28 bg-gradient-to-b from-transparent to-white sm:h-36"
            />
          </div>

          <LandingBelowFold copy={copy} sharedBackdrop />
        </div>
      </div>
    </div>
  );
}
