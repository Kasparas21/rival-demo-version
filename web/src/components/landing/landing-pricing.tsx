"use client";

import { useState } from "react";
import Link from "next/link";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";
import type { BillingPeriod } from "@/lib/billing/config";
import {
  PLAN_OFFERS,
  PLAN_PICKER_INTRO,
  PLAN_TRIAL_BADGE,
  maxAnnualSavingsPercent,
  planPriceDisplay,
} from "@/lib/billing/plan-offers";

/** Feature checklist (brand green `#95C14B`, matches `--rival-success`) */
export function BrandCheckLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-[#1a1a1a]">
      <svg className="mt-0.5 size-5 shrink-0 text-[#95C14B]" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" opacity="0.45" />
        <path d="m6 10 2.5 2.5L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export function BlackCta({ children, href = "/checkout" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="flex w-full justify-center rounded-xl bg-gradient-to-b from-neutral-700 to-neutral-950 py-3.5 font-semibold text-white shadow-inner hover:brightness-105"
    >
      {children}
    </Link>
  );
}

export function AccentCta({ children, href = "/checkout" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="flex w-full justify-center rounded-xl bg-gradient-to-r from-[#4a7fa5] to-[#35688a] py-3.5 font-semibold text-white shadow-sm hover:brightness-105"
    >
      {children}
    </Link>
  );
}

export type { BillingPeriod };

export function PricingBlock({
  billing,
  listMonthlyUsd,
  annualMonthlyUsd,
}: {
  billing: BillingPeriod;
  listMonthlyUsd: number;
  annualMonthlyUsd: number;
}) {
  const annualFull = Math.round(listMonthlyUsd * 12);
  const annualDeal = Math.round(annualMonthlyUsd * 12);

  if (billing === "monthly") {
    return (
      <div className="mt-4 space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold text-[#1a1a1a]">${listMonthlyUsd}</span>
          <span className="text-sm font-medium text-gray-600">/mo</span>
        </div>
        <p className="text-sm text-gray-700">7-day free trial · card required</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1">
      <p className="text-base text-gray-400 line-through">${annualFull}/yr</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-bold text-[#1a1a1a]">${annualMonthlyUsd}</span>
        <span className="text-sm font-medium text-gray-600">/mo</span>
      </div>
      <p className="text-sm text-gray-700">${annualDeal}/yr billed annually · 7-day free trial</p>
    </div>
  );
}

export function LandingPricing() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const maxSavingsPct = maxAnnualSavingsPercent();

  return (
    <section className="overflow-hidden py-16 text-center sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="pricing" className={`${landingNavAnchorScrollClasses} text-[clamp(2.5rem,11vw,3.75rem)] font-bold leading-[1.05] text-[#1a1a1a]`}>
          The only ad intelligence subscription <br />
          you&apos;ll ever
          <br />
          <span className="text-[#4a7fa5]">need.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-gray-600">{PLAN_PICKER_INTRO}</p>

        <div
          role="radiogroup"
          aria-label="Billing period"
          className="mx-auto mt-8 inline-flex max-w-full rounded-full bg-gray-100/90 p-1 shadow-inner ring-1 ring-black/[0.04] sm:mt-10"
        >
          <button
            type="button"
            role="radio"
            aria-checked={billing === "monthly"}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
              billing === "monthly" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-[#1a1a1a]"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billing === "annual"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
              billing === "annual" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-[#1a1a1a]"
            }`}
            onClick={() => setBilling("annual")}
          >
            Annual
            <span className="rounded-full bg-[#95C14B]/30 px-1.5 py-0.5 text-[10px] font-bold text-gray-900">
              Save {maxSavingsPct}%
            </span>
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-6 text-left sm:mt-14 lg:grid-cols-2 lg:gap-8">
          {PLAN_OFFERS.map((offer) => {
            const price = planPriceDisplay(offer, billing);
            const isAnnual = billing === "annual";
            const isPro = offer.popular === true;
            const shellClass = isPro
              ? "relative flex flex-col rounded-3xl border border-gray-900/20 bg-white p-6 shadow-[0_12px_40px_rgba(17,24,39,0.08)] ring-1 ring-gray-900/10 sm:p-8"
              : "flex flex-col rounded-3xl bg-white p-6 shadow-lg sm:p-8";

            return (
              <div key={offer.slug} className={shellClass}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xl font-bold text-[#1a1a1a]">{offer.name}</p>
                  {isPro ? (
                    <span className="shrink-0 rounded-full bg-gray-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Popular
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 space-y-1">
                  {isAnnual && price.listMonthlyUsd != null ? (
                    <p className="text-sm font-medium text-gray-400 line-through">${price.listMonthlyUsd}/mo</p>
                  ) : null}
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#1a1a1a]">{price.primary}</span>
                    <span className="text-sm font-medium text-gray-500">/mo</span>
                  </div>
                  {isAnnual && price.savingsPercent != null ? (
                    <p className="text-sm font-semibold text-[#2d5a1f]">
                      Save {price.savingsPercent}% vs paying monthly
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-500">{price.secondary}</p>
                </div>
                <p className="mt-3 text-sm text-gray-700">{offer.summary}</p>
                <span className="mt-4 inline-flex rounded-full border border-[#95C14B]/40 bg-[#95C14B]/12 px-2.5 py-1 text-xs font-semibold text-gray-800">
                  {PLAN_TRIAL_BADGE}
                </span>
                <div className="mt-5">
                  <BlackCta href={buildCheckoutHref(offer.slug, billing)}>Start free trial</BlackCta>
                </div>
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    {offer.plusLabel ?? "Includes"}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {offer.features.map((feature) => (
                      <BrandCheckLi key={feature}>{feature}</BrandCheckLi>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-full rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-gray-600 shadow-sm sm:mt-12 sm:max-w-fit sm:rounded-full sm:px-6">
          Switching from{" "}
          <a
            href="https://www.spyfu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#4a7fa5] underline decoration-[#4a7fa5]/35 underline-offset-2 hover:text-[#35688a]"
          >
            SpyFu
          </a>
          ,{" "}
          <a
            href="https://adspy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#4a7fa5] underline decoration-[#4a7fa5]/35 underline-offset-2 hover:text-[#35688a]"
          >
            AdSpy
          </a>{" "}
          or{" "}
          <a
            href="https://bigspy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#4a7fa5] underline decoration-[#4a7fa5]/35 underline-offset-2 hover:text-[#35688a]"
          >
            BigSpy
          </a>
          ? Save up to <span className="font-semibold text-[#4a7fa5]">96%</span>
          . <span className="text-[#4a7fa5]" aria-hidden>&gt;</span>
        </div>
      </div>
    </section>
  );
}
