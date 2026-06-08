import { FeaturesPage } from "@/components/marketing/features-page";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

export const metadata = {
  title: "Features — Rival",
  description:
    "Explore every Rival feature in depth: multi-platform ad library, strategy map, three moves, stealable angles, and more.",
};

export default async function FeaturesRoutePage() {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return <FeaturesPage copy={copy} locale={locale} />;
}
