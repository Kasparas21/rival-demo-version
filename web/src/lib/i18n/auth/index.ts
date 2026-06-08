import { authCopyDe } from "@/lib/i18n/auth/de";
import { authCopyEn } from "@/lib/i18n/auth/en";
import { authCopyNl } from "@/lib/i18n/auth/nl";
import type { AuthCopy, SignupCopy } from "@/lib/i18n/auth/types";
import type { Locale } from "@/lib/i18n/locale";

const COPY_BY_LOCALE: Record<Locale, AuthCopy> = {
  en: authCopyEn,
  de: authCopyDe,
  nl: authCopyNl,
};

export function getAuthCopy(locale: Locale): AuthCopy {
  return COPY_BY_LOCALE[locale] ?? authCopyEn;
}

export function getSignupCopy(locale: Locale): SignupCopy {
  return getAuthCopy(locale).signup;
}

export { authCopyEn, authCopyDe, authCopyNl };
export type { AuthCopy, SignupCopy };
