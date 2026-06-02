import { landingCopyDe } from "@/lib/i18n/landing/de";
import { landingCopyEn } from "@/lib/i18n/landing/en";
import { landingCopyNl } from "@/lib/i18n/landing/nl";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

const COPY_BY_LOCALE: Record<Locale, LandingCopy> = {
  en: landingCopyEn,
  de: landingCopyDe,
  nl: landingCopyNl,
};

export function getLandingCopy(locale: Locale): LandingCopy {
  return COPY_BY_LOCALE[locale] ?? landingCopyEn;
}

export { landingCopyEn, landingCopyDe, landingCopyNl };
export type { LandingCopy };
