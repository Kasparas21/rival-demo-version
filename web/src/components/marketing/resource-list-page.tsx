import Link from "next/link";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { LandingPageBackground, LandingSectionDivider } from "@/components/landing/landing-page-background";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { fontTempting } from "@/lib/fonts/tempting";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";

type ListItem =
  | {
      type: "tutorial";
      title: string;
      summary: string;
      steps: string[];
    }
  | {
      type: "tool";
      title: string;
      summary: string;
      href: string;
    };

type Props = {
  copy: LandingCopy;
  locale: Locale;
  pageTitle: string;
  pageSummary: string;
  breadcrumbLabel: string;
  items: ListItem[];
};

export function ResourceListPage({ copy, locale, pageTitle, pageSummary, breadcrumbLabel, items }: Props) {
  return (
    <div
      className={`${fontTempting.variable} min-h-screen w-full overflow-x-clip font-sans text-[#1a1a1a] antialiased`}
    >
      <LandingHeader copy={copy.header} locale={locale} />

      <div className="relative isolate pt-28 sm:pt-32">
        <LandingPageBackground />

        <main className="relative z-10 px-4 py-8 sm:px-6 sm:py-12">
          <LandingScrollReveal className="mx-auto max-w-3xl">
            <p className="text-sm text-[#4a7fa5]">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span>{breadcrumbLabel}</span>
            </p>
            <h1 className="mt-6 text-[clamp(1.75rem,4.5vw,2.5rem)] font-bold lowercase tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[15px]">{pageSummary}</p>
          </LandingScrollReveal>

          <div className="mx-auto mt-10 max-w-3xl space-y-6">
            {items.map((item) => (
              <LandingScrollReveal key={item.title}>
                <article className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold lowercase text-[#1a1a1a]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.summary}</p>
                  {item.type === "tutorial" ? (
                    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-600">
                      {item.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex text-sm font-semibold text-[#4a7fa5] hover:underline"
                    >
                      Open tool →
                    </Link>
                  )}
                </article>
              </LandingScrollReveal>
            ))}
          </div>

          <LandingScrollReveal className="mx-auto mt-12 max-w-lg text-center">
            <LandingTrialCta href="/onboarding" size="lg">
              TRY FOR FREE
              <span aria-hidden>→</span>
            </LandingTrialCta>
          </LandingScrollReveal>

          <LandingSectionDivider />
          <LandingFooter copy={copy.footer} />
        </main>
      </div>
    </div>
  );
}
