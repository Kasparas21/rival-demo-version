import Link from "next/link";
import { RivalLogoImg } from "@/components/rival-logo";
import {
  LandingHeaderMobileMenu,
  LandingHeaderNav,
} from "@/components/landing/landing-header-nav";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import { glassPillShellClass } from "@/components/ui/glass-styles";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { getSiteNav } from "@/lib/marketing/site-nav";

type Props = {
  copy: LandingCopy["header"];
  locale: Locale;
  /** Dark glass header for hero variant B. */
  theme?: "light" | "dark";
};

/** Full floating pill: logo | nav | divider | CTA - fixed at top while scrolling */
export function LandingHeader({ copy, theme = "light" }: Props) {
  const isDark = theme === "dark";
  const siteNav = getSiteNav("en");

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`flex w-full max-w-6xl items-center justify-between gap-2 overflow-visible rounded-full px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5 ${
          isDark
            ? "border border-[#4a7fa5]/20 bg-[#0c1219]/85 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            : glassPillShellClass
        }`}
      >
        <Link
          href="/"
          className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label={copy.homeAria}
        >
          <RivalLogoImg className="block h-[21px] w-auto max-w-[132px] object-contain object-left sm:h-[26px] sm:max-w-[168px]" />
        </Link>

        <LandingHeaderNav items={siteNav} isDark={isDark} ariaLabel={copy.primaryNavAria} />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="md:hidden">
            <LandingContactCta
              size="md"
              appearance="plain"
              className="[&_.landing-trial-cta-face]:min-w-[9.5rem] [&_.landing-trial-cta-face]:px-7 [&_.landing-trial-cta-face]:py-2.5 [&_.landing-trial-cta-face]:text-sm [&_.landing-trial-cta-face]:font-bold [&_.landing-trial-cta-face]:tracking-[0.05em]"
            />
          </div>
          <div className="hidden md:block">
            <LandingContactCta
              size="sm"
              appearance="plain"
              className="[&_.landing-trial-cta-face]:min-w-[11rem] [&_.landing-trial-cta-face]:px-9 [&_.landing-trial-cta-face]:py-2.5 [&_.landing-trial-cta-face]:text-[15px] [&_.landing-trial-cta-face]:font-bold [&_.landing-trial-cta-face]:tracking-[0.05em]"
            />
          </div>

          <LandingHeaderMobileMenu items={siteNav} isDark={isDark} />
        </div>
      </div>
    </header>
  );
}
