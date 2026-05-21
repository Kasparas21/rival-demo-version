import { Check, X } from "lucide-react";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { RivalLogoImg } from "@/components/rival-logo";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import {
  COMPETITOR_COLUMNS,
  LANDING_COMPARISON_SECTIONS,
  type ComparisonRow,
} from "@/components/landing/landing-comparison-data";

function ComparisonMark({ value }: { value: boolean }) {
  if (value) {
    return (
      <span
        className="mx-auto flex size-6 items-center justify-center rounded-md bg-[#95C14B] shadow-[0_2px_8px_-2px_rgba(149,193,75,0.55)]"
        aria-label="Yes"
      >
        <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
      </span>
    );
  }

  return (
    <span className="mx-auto flex size-6 items-center justify-center text-[#ef4444]" aria-label="No">
      <X className="size-4" strokeWidth={2.75} aria-hidden />
    </span>
  );
}

function ComparisonTable({ title, rows }: { title: string; rows: ComparisonRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/65 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_-12px_rgba(74,127,165,0.18)] backdrop-blur-xl ring-1 ring-white/45">
      <div className="border-b border-white/55 bg-white/40 px-4 py-2.5 sm:px-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/50 bg-white/35 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th scope="col" className="px-4 py-2.5 text-left sm:px-5">
                Feature
              </th>
              <th scope="col" className="w-14 px-1 py-2.5 text-center sm:w-16">
                <RivalLogoImg className="mx-auto h-3.5 w-auto max-w-[52px] object-contain" />
              </th>
              {COMPETITOR_COLUMNS.map(({ key, label, short }) => (
                <th key={key} scope="col" className="w-12 px-1 py-2.5 text-center sm:w-14" title={label}>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-white/40 last:border-b-0">
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left text-[12px] font-medium leading-snug text-[#1a1a1a] sm:px-5 sm:text-[13px]"
                >
                  {row.feature}
                </th>
                <td className="bg-[#4a7fa5]/[0.07] px-1 py-2.5 text-center">
                  <ComparisonMark value={row.rival} />
                </td>
                {COMPETITOR_COLUMNS.map(({ key }) => (
                  <td key={key} className="px-1 py-2.5 text-center">
                    <ComparisonMark value={row[key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LandingComparison() {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <LandingScrollReveal className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <h2
            id="compare"
            className={`${landingNavAnchorScrollClasses} text-[clamp(1.875rem,5.5vw,2.75rem)] font-bold lowercase leading-[1.08] tracking-tight text-[#1a1a1a]`}
          >
            better competitor intel.
            <br />
            <LandingHeadlineHighlight>less manual spying.</LandingHeadlineHighlight>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">
            Rival vs Panoramata, AdSpyder, PowerAdSpy, and AdLibrary.com — at a glance.
          </p>
        </div>

        <div className="mt-8 space-y-4 sm:mt-10">
          {LANDING_COMPARISON_SECTIONS.map((section) => (
            <ComparisonTable key={section.title} title={section.title} rows={section.rows} />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2.5 text-center sm:mt-10">
          <LandingTrialCta href="/signup" size="md">
            Start your 7-day trial
            <span aria-hidden>→</span>
          </LandingTrialCta>
          <p className="text-xs text-gray-500">The only cross-platform competitor-set OS built for weekly moves.</p>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
