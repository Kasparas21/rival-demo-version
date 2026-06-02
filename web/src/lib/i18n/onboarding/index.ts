import { onboardingCopyDe } from "@/lib/i18n/onboarding/de";
import { onboardingCopyEn } from "@/lib/i18n/onboarding/en";
import { onboardingCopyNl } from "@/lib/i18n/onboarding/nl";
import type { OnboardingCopy } from "@/lib/i18n/onboarding/types";
import type { Locale } from "@/lib/i18n/locale";

const COPY_BY_LOCALE: Record<Locale, OnboardingCopy> = {
  en: onboardingCopyEn,
  de: onboardingCopyDe,
  nl: onboardingCopyNl,
};

export function getOnboardingCopy(locale: Locale): OnboardingCopy {
  return COPY_BY_LOCALE[locale] ?? onboardingCopyEn;
}

export { onboardingCopyEn, onboardingCopyDe, onboardingCopyNl };
export type { OnboardingCopy, OnboardingFormCopy, PlanPickerCopy } from "@/lib/i18n/onboarding/types";
