import { countryToLocale, isLocale, type Locale } from "@/lib/i18n/locale";

export type ResolveLocaleInput = {
  /** `?lang=de` — also used on localhost without geo headers. */
  langParam?: string | null;
  cookie?: string | null;
  country?: string | null;
};

/**
 * Priority: valid `?lang=` → cookie → `x-vercel-ip-country` → `en`.
 */
export function resolveLocale({ langParam, cookie, country }: ResolveLocaleInput): Locale {
  if (isLocale(langParam)) return langParam;
  if (isLocale(cookie)) return cookie;
  return countryToLocale(country);
}
