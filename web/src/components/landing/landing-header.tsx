import Link from "next/link";
import { RivalLogoImg } from "@/components/rival-logo";
import { LandingLocaleSwitcher } from "@/components/landing/landing-locale-switcher";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { glassPillShellClass } from "@/components/ui/glass-styles";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  copy: LandingCopy["header"];
  locale: Locale;
  /** Dark glass header for hero variant B. */
  theme?: "light" | "dark";
};

/** Full floating pill: logo | nav | divider | CTA — fixed at top while scrolling */
export function LandingHeader({ copy, locale, theme = "light" }: Props) {
  const isDark = theme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`flex w-full max-w-5xl items-center justify-between gap-2 overflow-visible rounded-full px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5 ${
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

        <nav
          aria-label={copy.primaryNavAria}
          className={`hidden min-w-0 flex-1 items-center justify-center gap-4 whitespace-nowrap py-0.5 text-sm font-medium md:flex lg:gap-5 ${isDark ? "text-white/80" : "text-[#1a1a1a]"}`}
        >
          {copy.navItems.map(({ label, sectionId }) => (
            <a
              key={sectionId}
              href={`/#${sectionId}`}
              className="shrink-0 rounded-sm hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LandingLocaleSwitcher currentLocale={locale} ariaLabel={copy.localeSwitcherAria} />

          <div
            className={`hidden h-5 w-px shrink-0 self-center md:block ${isDark ? "bg-white/15" : "bg-black/[0.12]"}`}
            aria-hidden
          />

          <div className="md:hidden">
            <LandingTrialCta
              href="/onboarding"
              size="md"
              appearance="plain"
              className="[&_.landing-trial-cta-face]:min-w-[8.25rem] [&_.landing-trial-cta-face]:px-7 [&_.landing-trial-cta-face]:py-2.5 [&_.landing-trial-cta-face]:text-[15px]"
            >
              {copy.startTrial}
            </LandingTrialCta>
          </div>
          <div className="hidden md:block">
            <LandingTrialCta href="/onboarding" size="sm" appearance="plain">
              {copy.startTrial}
            </LandingTrialCta>
          </div>
        </div>
      </div>
    </header>
  );
}
