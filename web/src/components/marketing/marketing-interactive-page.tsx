import Link from "next/link";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { MarketingDemoGate } from "@/components/marketing/marketing-demo-gate";
import { fontTempting } from "@/lib/fonts/tempting";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Breadcrumb = { label: string; href?: string };

type Props = {
  copy: LandingCopy;
  locale: Locale;
  breadcrumbs: Breadcrumb[];
  title: string;
  description?: string;
  demo: ReactNode;
  /** Feature pages show the signup wall on load; AdSpy demos only on interaction. */
  wallOnMount?: boolean;
};

export function MarketingInteractivePage({
  copy,
  locale,
  breadcrumbs,
  title,
  description,
  demo,
  wallOnMount = false,
}: Props) {
  return (
    <div
      className={`${fontTempting.variable} min-h-screen w-full overflow-x-clip bg-[#f3f4f6] font-sans text-[#1a1a1a] antialiased`}
    >
      <LandingHeader copy={copy.header} locale={locale} />

      <main className="relative z-10 px-3 pb-16 pt-28 sm:px-4 sm:pt-32 md:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-[#4a7fa5]">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 ? <span className="mx-2">/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </p>
          <h1 className="mt-4 text-[clamp(1.35rem,3.5vw,1.75rem)] font-bold lowercase tracking-tight text-[#1a1a1a]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#64748b]">{description}</p>
          ) : null}

          <div className="mt-8">
            <MarketingDemoGate showOnMount={wallOnMount}>{demo}</MarketingDemoGate>
          </div>
        </div>
      </main>

      <LandingFooter copy={copy.footer} />
    </div>
  );
}
