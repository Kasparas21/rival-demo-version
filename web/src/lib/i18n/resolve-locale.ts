import { countryToLocale, isLocale, type Locale } from "@/lib/i18n/locale";

export type ResolveLocaleInput = {
  /** `?lang=de` — explicit override. */
  langParam?: string | null;
  cookie?: string | null;
  /** True when the visitor chose a language (not a stale auto cookie). */
  userPickedLocale?: boolean;
  country?: string | null;
};

/**
 * Priority: valid `?lang=` → geo (`x-vercel-ip-country`) → saved choice (if user-picked) → `en`.
 */
export function resolveLocale({
  langParam,
  cookie,
  userPickedLocale = false,
  country,
}: ResolveLocaleInput): Locale {
  if (isLocale(langParam)) return langParam;

  const fromCountry = countryToLocale(country);
  if (country) return fromCountry;

  if (userPickedLocale && isLocale(cookie)) return cookie;

  return fromCountry;
}
