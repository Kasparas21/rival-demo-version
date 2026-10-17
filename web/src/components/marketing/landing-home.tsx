import { EditorialLanding } from "@/components/landing/editorial-landing";
import { EditorialShell } from "@/components/marketing/editorial-shell";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  copy: LandingCopy;
  locale: Locale;
};

export default function LandingHome({ copy, locale }: Props) {
  return (
    <EditorialShell copy={copy} locale={locale}>
      <EditorialLanding copy={copy} locale={locale} />
    </EditorialShell>
  );
}
