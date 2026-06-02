"use client";

import { LandingLocaleSwitcher } from "@/components/landing/landing-locale-switcher";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  ariaLabel: string;
  /** Top of card — default end (right). Use start for top-left. */
  align?: "start" | "end";
};

/** Compact language control for the top of onboarding / plan-picker cards. */
export function OnboardingCardLocaleSwitcher({ locale, ariaLabel, align = "end" }: Props) {
  return (
    <div className={`flex shrink-0 ${align === "start" ? "justify-start" : "justify-end"}`}>
      <LandingLocaleSwitcher variant="minimal" currentLocale={locale} ariaLabel={ariaLabel} />
    </div>
  );
}
