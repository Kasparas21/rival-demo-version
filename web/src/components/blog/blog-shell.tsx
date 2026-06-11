import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

export async function BlogShell({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <div className="min-h-screen bg-[#f3f1f4] font-sans text-gray-800 antialiased">
      <LandingHeader copy={copy.header} locale={locale} />

      <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-28 sm:px-6 sm:pt-32">{children}</main>

      <LandingFooter copy={copy.footer} />
    </div>
  );
}
