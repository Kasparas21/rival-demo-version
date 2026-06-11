import { Check, X } from "lucide-react";

import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { RivalLogoImg } from "@/components/rival-logo";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { ComparisonRowCopy, LandingCopy } from "@/lib/i18n/landing/types";

type CompetitorKey = "panoramata" | "adspyder" | "poweradspy" | "adlibrary";

function ComparisonMark({
  value,
  compact = false,
  yesAria,
  noAria,
}: {
  value: boolean;
  compact?: boolean;
  yesAria: string;
  noAria: string;
}) {
  if (value) {
    return (
      <span
        className={`mx-auto flex items-center justify-center rounded-md bg-[#95C14B] shadow-[0_2px_8px_-2px_rgba(149,193,75,0.55)] ${compact ? "size-4 rounded-[4px]" : "size-6"}`}
        aria-label={yesAria}
      >
        <Check className={`text-white ${compact ? "size-2.5" : "size-3.5"}`} strokeWidth={3} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={`mx-auto flex items-center justify-center text-[#ef4444] ${compact ? "size-4" : "size-6"}`}
      aria-label={noAria}
    >
      <X className={compact ? "size-3" : "size-4"} strokeWidth={2.75} aria-hidden />
    </span>
  );
}

function ComparisonTable({
  title,
  rows,
  featureColumn,
  competitorColumns,
  yesAria,
  noAria,
}: {
  title: string;
  rows: ComparisonRowCopy[];
  featureColumn: string;
  competitorColumns: LandingCopy["comparison"]["competitorColumns"];
  yesAria: string;
  noAria: string;
}) {
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
                {featureColumn}
              </th>
              <th scope="col" className="w-14 px-1 py-2.5 text-center sm:w-16">
                <RivalLogoImg className="mx-auto h-3.5 w-auto max-w-[52px] object-contain" />
              </th>
              {competitorColumns.map(({ key, label, short }) => (
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
                  <ComparisonMark value={row.rival} yesAria={yesAria} noAria={noAria} />
                </td>
                {competitorColumns.map(({ key }) => (
                  <td key={key} className="px-1 py-2.5 text-center">
                    <ComparisonMark
                      value={row[key as CompetitorKey]}
                      yesAria={yesAria}
                      noAria={noAria}
                    />
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

function ComparisonTableMobile({
  title,
  rows,
  featureColumn,
  competitorColumns,
  yesAria,
  noAria,
}: {
  title: string;
  rows: ComparisonRowCopy[];
  featureColumn: string;
  competitorColumns: LandingCopy["comparison"]["competitorColumns"];
  yesAria: string;
  noAria: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/65 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_-12px_rgba(74,127,165,0.18)] backdrop-blur-xl ring-1 ring-white/45">
      <div className="border-b border-white/55 bg-white/40 px-3 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a7fa5]">{title}</h3>
      </div>
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/50 bg-white/35 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
            <th scope="col" className="px-2 py-2 text-left">
              {featureColumn}
            </th>
            <th scope="col" className="px-0.5 py-2 text-center">
              <RivalLogoImg className="mx-auto h-2.5 w-auto max-w-[36px] object-contain" />
            </th>
            {competitorColumns.map(({ key, label, mobile }) => (
              <th key={key} scope="col" className="px-0.5 py-2 text-center" title={label}>
                {mobile}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-white/40 last:border-b-0">
              <th
                scope="row"
                className="px-2 py-2 text-left text-[10px] font-medium leading-tight text-[#1a1a1a]"
                title={row.feature}
              >
                {row.featureMobile}
              </th>
              <td className="bg-[#4a7fa5]/[0.07] px-0.5 py-2 text-center">
                <ComparisonMark value={row.rival} compact yesAria={yesAria} noAria={noAria} />
              </td>
              {competitorColumns.map(({ key }) => (
                <td key={key} className="px-0.5 py-2 text-center">
                  <ComparisonMark
                    value={row[key as CompetitorKey]}
                    compact
                    yesAria={yesAria}
                    noAria={noAria}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  copy: LandingCopy["comparison"];
};

export function LandingComparison({ copy }: Props) {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <LandingScrollReveal className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <h2
            id="compare"
            className={`${landingNavAnchorScrollClasses} ${landingSectionHeadlineClasses}`}
          >
            {copy.titleLine1}
            <br />
            <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">{copy.subtitle}</p>
        </div>

        <div className="mt-8 space-y-4 sm:mt-10">
          {copy.sections.map((section) => (
            <div key={section.title}>
              <div className="md:hidden">
                <ComparisonTableMobile
                  title={section.title}
                  rows={section.rows}
                  featureColumn={copy.featureColumn}
                  competitorColumns={copy.competitorColumns}
                  yesAria={copy.yesAria}
                  noAria={copy.noAria}
                />
              </div>
              <div className="hidden md:block">
                <ComparisonTable
                  title={section.title}
                  rows={section.rows}
                  featureColumn={copy.featureColumn}
                  competitorColumns={copy.competitorColumns}
                  yesAria={copy.yesAria}
                  noAria={copy.noAria}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2.5 text-center sm:mt-10">
          <LandingTrialCta href="/onboarding" size="md">
            {copy.cta}
            <span aria-hidden>→</span>
          </LandingTrialCta>
          <p className="text-xs text-gray-500">{copy.ctaFootnote}</p>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
