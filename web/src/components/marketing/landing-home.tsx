import dynamic from "next/dynamic";

import { LandingBelowFold } from "@/components/marketing/landing-below-fold";
import { LandingBrandMarqueeDeferred } from "@/components/landing/landing-brand-marquee-deferred";
import { LandingHeader } from "@/components/landing/landing-header";
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

        <div className="relative z-20 -mt-6 sm:-mt-10">
          <div
            aria-hidden
            className="pointer-events-none h-16 w-full bg-gradient-to-b from-transparent via-white/85 to-white sm:h-24"
          />
          <div className="bg-white">
            <LandingBrandMarqueeDeferred
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

        <LandingBelowFold copy={copy} />
      </div>
    </div>
  );
}
