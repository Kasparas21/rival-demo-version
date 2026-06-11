import Link from "next/link";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { LandingPageBackground, LandingSectionDivider } from "@/components/landing/landing-page-background";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { fontTempting } from "@/lib/fonts/tempting";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type Breadcrumb = { label: string; href?: string };

type Props = {
  copy: LandingCopy;
  locale: Locale;
  breadcrumbs: Breadcrumb[];
  title: string;
  summary: string;
  why: string;
  bullets: string[];
  preview: ReactNode;
};

export function MarketingDetailPage({
  copy,
  locale,
  breadcrumbs,
  title,
  summary,
  why,
  bullets,
  preview,
}: Props) {
  return (
    <div
      className={`${fontTempting.variable} min-h-screen w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased`}
    >
      <LandingHeader copy={copy.header} locale={locale} />

      <div className="relative isolate pt-28 sm:pt-32">
        <LandingPageBackground />

        <main className="relative z-10">
          <section className="px-4 py-8 sm:px-6 sm:py-12">
            <LandingScrollReveal>
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

                <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-x-16">
                  <div>
                    <h1 className="text-[clamp(1.75rem,4.5vw,2.5rem)] font-bold lowercase leading-tight tracking-tight text-[#1a1a1a]">
                      {title}
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-[15px]">{summary}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{why}</p>
                    <ul className="mt-5 space-y-2">
                      {bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm leading-snug text-gray-600">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#4a7fa5]" aria-hidden />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <LandingTrialCta href="/onboarding" size="lg">
                        TRY FOR FREE
                        <span aria-hidden>→</span>
                      </LandingTrialCta>
                    </div>
                  </div>
                  <div>{preview}</div>
                </div>
              </div>
            </LandingScrollReveal>
          </section>

          <LandingSectionDivider />
          <LandingFooter copy={copy.footer} />
        </main>
      </div>
    </div>
  );
}
