import { SiteHeader } from "@/components/landing/site-header";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  copy: LandingCopy["header"];
  locale: Locale;
  /** Kept for older callers; the header now has one look everywhere. */
  theme?: "light" | "dark";
};

/** The site header on pages outside the editorial layout (blog, resources, legal…), fixed to the top. */
export function LandingHeader({ copy, locale }: Props) {
  return <SiteHeader copy={copy} locale={locale} fixed />;
}
