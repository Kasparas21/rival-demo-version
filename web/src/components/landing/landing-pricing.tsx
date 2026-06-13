"use client";

import { useState } from "react";
import { Check, ShieldCheck, User, Users } from "lucide-react";

import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { landingSectionHeadlineClasses } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { HeroVariantBGlowCta } from "@/components/landing/hero-variant-b-glow-cta";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import type { BillingPeriod } from "@/lib/billing/config";
import { formatPlanPrice, PLAN_PRICE_SYMBOL } from "@/lib/billing/plan-price-format";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingCopy, LandingPlanMetricHighlight, LandingPlanOffer } from "@/lib/i18n/landing/types";

function UsersThree({
  className,
  strokeWidth = 2.25,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="5.5" cy="8.5" r="2.25" />
      <path d="M2.5 20v-1.25a2.75 2.75 0 0 1 2.75-2.75h0" />
      <circle cx="12" cy="7" r="2.75" />
      <path d="M7.5 20v-1.75a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1.75" />
      <circle cx="18.5" cy="8.5" r="2.25" />
      <path d="M21.5 20v-1.25a2.75 2.75 0 0 0-2.75-2.75h0" />
    </svg>
  );
}

function PlanIcon({
  slug,
  className,
  strokeWidth = 2.25,
}: {
  slug: LandingPlanOffer["slug"];
  className?: string;
  strokeWidth?: number;
}) {
  if (slug === "pro") {
    return <Users className={className} strokeWidth={strokeWidth} aria-hidden />;
  }
  if (slug === "agency") {
    return <UsersThree className={className} strokeWidth={strokeWidth} />;
  }
  return <User className={className} strokeWidth={strokeWidth} aria-hidden />;
}

function emphasizeNumbers(text: string, boldClass: string) {
  return text.split(/(\d+)/g).map((part, index) =>
    /^\d+$/.test(part) ? (
      <strong key={index} className={boldClass}>
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function formatPerCompetitorAmount(monthlyUsd: number, competitorCount: number): string {
  const perUnit = monthlyUsd / competitorCount;
  const rounded = Math.round(perUnit * 100) / 100;
  const amount = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${PLAN_PRICE_SYMBOL}${amount}`;
}

function ProPopularGlassBadge({
  badge,
  claim,
}: {
  badge: string;
  claim: string;
}) {
  return (
    <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
      <div className="relative overflow-hidden rounded-full border border-white/85 bg-white/40 px-6 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-10px_20px_-10px_rgba(255,255,255,0.2),0_20px_50px_-16px_rgba(30,70,95,0.45)] backdrop-blur-2xl backdrop-saturate-[1.75] ring-1 ring-white/65 sm:px-7 sm:py-3">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-white/30 to-[#4a7fa5]/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-white/50 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-0 h-16 w-16 rounded-full bg-[#7eb8dc]/25 blur-2xl"
        />

        <div className="relative z-[1] flex flex-col items-center gap-0.5 text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a4a63] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] sm:text-[11px]">
            {badge}
          </span>
          <span className="text-[10px] font-medium leading-snug text-[#35688a]/90 sm:text-[11px]">
            {claim}
          </span>
        </div>
      </div>
    </div>
  );
}

function PricingMetricHighlight({
  metric,
  perUnitLabel,
  inverted = false,
  emphasized = false,
}: {
  metric: LandingPlanMetricHighlight;
  perUnitLabel?: string;
  inverted?: boolean;
  emphasized?: boolean;
}) {
  const heroOnDark = inverted && emphasized;

  const shellClass = heroOnDark
    ? "relative overflow-hidden rounded-2xl border border-white/80 bg-white/38 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-12px_24px_-12px_rgba(255,255,255,0.18),0_18px_48px_-16px_rgba(0,0,0,0.42)] backdrop-blur-2xl backdrop-saturate-[1.6] ring-1 ring-white/60"
    : inverted
      ? "rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/20"
      : "rounded-2xl bg-[#4a7fa5]/10 px-4 py-3.5 ring-1 ring-[#4a7fa5]/20";

  return (
    <div className={shellClass}>
      {heroOnDark ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#2a5570]/30"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/15 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-white/35 blur-2xl"
          />
        </>
      ) : null}

      <div className={heroOnDark ? "relative z-[1]" : undefined}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={`font-extrabold tabular-nums leading-none tracking-tight ${
              heroOnDark
                ? "text-[3.25rem] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.22)] sm:text-[3.5rem]"
                : emphasized
                  ? inverted
                    ? "text-[3rem] text-white sm:text-[3.25rem]"
                    : "text-[2.75rem] text-[#2f5f7f] sm:text-[3rem]"
                  : inverted
                    ? "text-[2.25rem] text-white sm:text-[2.5rem]"
                    : "text-[2rem] text-[#35688a] sm:text-[2.25rem]"
            }`}
          >
            {metric.count}
          </span>
          <span
            className={`font-semibold leading-snug ${
              heroOnDark
                ? "text-base text-white/95 sm:text-[17px]"
                : inverted
                  ? emphasized
                    ? "text-base text-white sm:text-[17px]"
                    : "text-sm text-white/90"
                  : "text-sm text-[#1a1a1a] sm:text-base"
            }`}
          >
            {metric.label}
          </span>
        </div>
        {perUnitLabel ? (
          <p
            className={`mt-1.5 text-xs font-medium tabular-nums ${
              heroOnDark ? "text-white/80" : inverted ? "text-white/65" : "text-gray-500"
            }`}
          >
            {perUnitLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PricingCheckLi({
  children,
  inverted = false,
  compact = false,
  emphasizeNums = false,
}: {
  children: React.ReactNode;
  inverted?: boolean;
  compact?: boolean;
  emphasizeNums?: boolean;
}) {
  const boldClass = inverted ? "font-bold text-white" : "font-bold text-[#1a1a1a]";

  return (
    <li
      className={`flex gap-2.5 leading-snug ${
        compact ? "text-[12px] sm:text-[13px]" : "text-[13px] sm:text-sm"
      } ${inverted ? "text-white/90" : "text-[#1a1a1a]"}`}
    >
      <span
        className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full ${
          inverted ? "bg-white/15 ring-1 ring-white/30" : "bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/25"
        }`}
      >
        <Check
          className={`size-3 ${inverted ? "text-white" : "text-[#4a7fa5]"}`}
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <span>
        {emphasizeNums && typeof children === "string"
          ? emphasizeNumbers(children, boldClass)
          : children}
      </span>
    </li>
  );
}

function planPriceDisplay(
  offer: LandingPlanOffer,
  billing: BillingPeriod,
  labels: LandingCopy["pricing"],
): {
  primary: string;
  secondary: string;
  strikethroughUsd?: number;
} {
  const { monthlyUsd, annualMonthlyUsd, annualYearlyUsd, originalMonthlyUsd } = offer;

  if (billing === "monthly") {
    return {
      primary: formatPlanPrice(monthlyUsd),
      secondary: labels.billedMonthly,
      strikethroughUsd: originalMonthlyUsd,
    };
  }

  return {
    primary: formatPlanPrice(annualMonthlyUsd),
    secondary: fillCopyTemplate(labels.billedAnnually, { yearlyUsd: annualYearlyUsd }),
    strikethroughUsd: annualMonthlyUsd < monthlyUsd ? monthlyUsd : undefined,
  };
}

function PricingCard({
  offer,
  billing,
  labels,
}: {
  offer: LandingPlanOffer;
  billing: BillingPeriod;
  labels: LandingCopy["pricing"];
}) {
  const price = planPriceDisplay(offer, billing, labels);
  const isPro = offer.popular === true;
  const isStarter = offer.slug === "starter";
  const competitorCount = offer.metricHighlight ? Number.parseInt(offer.metricHighlight.count, 10) : 0;
  const monthlyForUnit =
    billing === "monthly" ? offer.monthlyUsd : offer.annualMonthlyUsd;
  const perUnitLabel =
    offer.metricHighlight && competitorCount > 0
      ? fillCopyTemplate(labels.perCompetitor, {
          price: formatPerCompetitorAmount(monthlyForUnit, competitorCount),
        })
      : undefined;

  return (
    <article
      className={`relative flex h-full w-full min-w-0 flex-col rounded-[1.75rem] p-6 sm:p-7 ${
        isPro
          ? "border border-white/20 bg-gradient-to-b from-[#4a7fa5] to-[#2f5f7f] p-7 shadow-[0_32px_80px_-28px_rgba(45,95,127,0.75)] sm:p-8 lg:pb-10 lg:pt-12"
          : "border border-white/75 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_48px_-18px_rgba(31,38,135,0.18)] backdrop-blur-2xl backdrop-saturate-[1.35] ring-1 ring-white/55"
      }`}
    >
      {isPro ? (
        <ProPopularGlassBadge badge={labels.popularBadge} claim={labels.popularClaim} />
      ) : null}

      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-9 items-center justify-center rounded-full shadow-sm ${
            isPro
              ? "border border-white/25 bg-white/15"
              : "border border-white/70 bg-white/60 backdrop-blur-sm"
          }`}
        >
          <PlanIcon
            slug={offer.slug}
            className={`size-4 ${isPro ? "text-white" : "text-[#4a7fa5]"}`}
            strokeWidth={2.25}
          />
        </span>
        <h3 className={`text-xl font-bold ${isPro ? "text-white" : "text-[#1a1a1a]"}`}>{offer.name}</h3>
      </div>

      <div className="mt-5">
        {price.strikethroughUsd != null ? (
          <div
            className={`flex flex-wrap items-baseline gap-2 ${
              isPro ? "text-white/50" : "text-gray-400"
            }`}
          >
            <span className="text-sm font-medium line-through">{formatPlanPrice(price.strikethroughUsd)}</span>
            <span className="text-sm font-medium line-through">{labels.perMonth}</span>
          </div>
        ) : null}
        <div className={`flex flex-wrap items-baseline gap-2 ${price.strikethroughUsd != null ? "mt-2.5" : ""}`}>
          <span
            className={`font-bold leading-none tracking-tight ${
              isPro ? "text-[2.75rem] text-white sm:text-[3rem]" : "text-[2.5rem] text-[#1a1a1a]"
            }`}
          >
            {price.primary}
          </span>
          <span className={`text-base font-medium ${isPro ? "text-white/75" : "text-gray-500"}`}>
            {labels.perMonth}
          </span>
        </div>
        <p className={`mt-2 text-sm font-medium ${isPro ? "text-white/85" : "text-[#4a7fa5]"}`}>
          {price.secondary}
        </p>
      </div>

      <p className={`mt-4 text-sm leading-relaxed ${isPro ? "text-white/80" : "text-gray-600"}`}>
        {offer.summary}
      </p>

      <div className="mt-5 flex justify-center">
        {isPro ? (
          <HeroVariantBGlowCta href="/onboarding">{labels.trialCta}</HeroVariantBGlowCta>
        ) : (
          <LandingTrialCta href="/onboarding" size="lg">
            {labels.trialCta}
          </LandingTrialCta>
        )}
      </div>

      <div className={`mt-6 border-t pt-5 ${isPro ? "border-white/20" : "border-white/60"}`}>
        <p className={`text-xs font-semibold ${isPro ? "text-white/70" : "text-gray-500"}`}>
          {labels.planIncludes}
        </p>

        {offer.metricHighlight ? (
          <div className="mt-4">
            <PricingMetricHighlight
              metric={offer.metricHighlight}
              perUnitLabel={perUnitLabel}
              inverted={isPro}
              emphasized={isPro}
            />
          </div>
        ) : null}

        <ul className="mt-4 space-y-2.5">
          {isPro && offer.plusLabel ? (
            <>
              {offer.features.slice(0, 1).map((feature) => (
                <PricingCheckLi key={feature} inverted emphasizeNums>
                  {feature}
                </PricingCheckLi>
              ))}
              <p className="pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                {offer.plusLabel}:
              </p>
              {offer.features.slice(1).map((feature) => (
                <PricingCheckLi key={feature} inverted emphasizeNums>
                  {feature}
                </PricingCheckLi>
              ))}
            </>
          ) : (
            offer.features.map((feature) => (
              <PricingCheckLi
                key={feature}
                inverted={isPro}
                compact={isStarter}
                emphasizeNums={!isStarter}
              >
                {feature}
              </PricingCheckLi>
            ))
          )}
        </ul>
      </div>
    </article>
  );
}

type Props = {
  copy: LandingCopy["pricing"];
};

export function LandingPricing({ copy }: Props) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <section className="relative overflow-x-clip py-16 sm:py-24">
      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
        <h2
          id="pricing"
          className={`${landingNavAnchorScrollClasses} ${landingSectionHeadlineClasses}`}
        >
          {copy.title}
        </h2>

        <div className="relative mx-auto mt-4 max-w-2xl overflow-hidden rounded-2xl border border-[#95C14B]/30 bg-[#f3f9e8]/78 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_32px_-16px_rgba(149,193,75,0.22)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-[#95C14B]/15 sm:px-5 sm:py-3.5 sm:text-center">
          <div className="relative flex flex-col items-start gap-1.5 sm:items-center sm:gap-2">
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-center sm:gap-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#95C14B]/35 bg-[#95C14B]/18 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4a6b24] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md">
                <ShieldCheck className="size-3 text-[#5a7f2e]" strokeWidth={2.5} aria-hidden />
                {copy.riskFreeBadge}
              </span>
              <p className="text-sm font-bold leading-snug tracking-tight text-[#1a1a1a] sm:text-[15px]">
                {copy.guaranteeTitle}
              </p>
            </div>
            <p className="max-w-xl text-xs leading-snug text-[#4a5c3a] sm:text-[13px] sm:leading-relaxed">
              {copy.guaranteeBody}
            </p>
          </div>
        </div>

        <div className="mt-8 mb-2 flex justify-center sm:mb-3 lg:mb-4">
          <div
            role="radiogroup"
            aria-label={copy.billingAria}
            className="relative inline-flex rounded-full border border-white/70 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_-8px_rgba(74,127,165,0.2)] backdrop-blur-xl"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billing === "monthly"}
              className={`relative z-[1] rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === "monthly" ? "text-white" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setBilling("monthly")}
            >
              {copy.monthly}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billing === "annual"}
              className={`relative z-[1] rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === "annual" ? "text-white" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setBilling("annual")}
            >
              {copy.yearly}
            </button>
            <span
              aria-hidden
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#4a7fa5] to-[#35688a] shadow-[0_4px_14px_-4px_rgba(74,127,165,0.55)] transition-transform duration-300 ease-out ${
                billing === "annual" ? "translate-x-[calc(100%+4px)]" : "translate-x-1"
              }`}
            />
          </div>
        </div>
      </LandingScrollReveal>

      <div className="relative left-1/2 mt-14 w-[min(calc(100vw-1.5rem),96rem)] -translate-x-1/2 overflow-visible px-3 pt-5 sm:mt-16 sm:px-4 sm:pt-6 lg:mt-20 lg:px-6 lg:pt-8">
        <div className="grid grid-cols-1 gap-6 text-left sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-x-16 xl:gap-x-20">
          {copy.plans.map((offer) => {
            const isPro = offer.popular === true;
            const isStarter = offer.slug === "starter";
            const isAgency = offer.slug === "agency";

            return (
              <div
                key={offer.slug}
                className={[
                  "flex min-w-0",
                  isPro ? "items-end lg:justify-self-center" : "h-full",
                  isStarter && "lg:justify-self-start",
                  isAgency && "lg:justify-self-end",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div
                  className={
                    isPro ? "w-full origin-bottom lg:scale-[1.08]" : "flex h-full w-full min-w-0"
                  }
                >
                  <PricingCard offer={offer} billing={billing} labels={copy} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
        <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-gray-500 sm:text-sm">{copy.footnote}</p>
      </LandingScrollReveal>
    </section>
  );
}

export type { BillingPeriod };
