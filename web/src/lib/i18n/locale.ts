export const LOCALES = ["en", "de", "nl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "rival_locale";

export const LOCALE_HEADER = "x-rival-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "de" || value === "nl";
}

export function countryToLocale(country: string | null | undefined): Locale {
  const code = (country ?? "").toUpperCase();
  if (code === "DE") return "de";
  if (code === "NL") return "nl";
  return "en";
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
