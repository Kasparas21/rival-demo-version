"use client";

import { useState } from "react";
import { Check, User, Users } from "lucide-react";

import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";
import type { BillingPeriod } from "@/lib/billing/config";
import { PLAN_OFFERS, type PlanOffer, planPriceDisplay } from "@/lib/billing/plan-offers";

function PricingCheckLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-snug text-[#1a1a1a] sm:text-sm">
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/25">
        <Check className="size-3 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  );
}

function PulsatingTrialCta({ href }: { href: string }) {
  return (
    <LandingTrialCta href={href} size="lg">
      Start 7-day free trial
    </LandingTrialCta>
  );
}

function PricingCard({ offer, billing }: { offer: PlanOffer; billing: BillingPeriod }) {
  const price = planPriceDisplay(offer, billing);
  const isAnnual = billing === "annual";
  const isPro = offer.popular === true;
  const Icon = isPro ? Users : User;

  return (
    <article
      className={`relative flex flex-col rounded-[1.75rem] p-6 sm:p-7 ${
        isPro
          ? "border-2 border-[#4a7fa5]/55 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_64px_-20px_rgba(74,127,165,0.35)] backdrop-blur-2xl backdrop-saturate-[1.4] ring-1 ring-[#4a7fa5]/20"
          : "border border-white/75 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_48px_-18px_rgba(31,38,135,0.18)] backdrop-blur-2xl backdrop-saturate-[1.35] ring-1 ring-white/55"
      }`}
    >
      {isPro ? (
        <span className="absolute -right-2 -top-3 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#4a7fa5] shadow-sm backdrop-blur-md">
          Popular
        </span>
      ) : null}

      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/60 shadow-sm backdrop-blur-sm">
          <Icon className="size-4 text-[#4a7fa5]" strokeWidth={2.25} aria-hidden />
        </span>
        <h3 className="text-xl font-bold text-[#1a1a1a]">{offer.name}</h3>
      </div>

      <div className="mt-5">
        {isAnnual && price.listMonthlyUsd != null ? (
          <p className="text-sm font-medium text-gray-400 line-through">${price.listMonthlyUsd} /month</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
          <span className="text-[2.5rem] font-bold leading-none tracking-tight text-[#1a1a1a]">{price.primary}</span>
          <span className="text-base font-medium text-gray-500">/month</span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[#4a7fa5]">{price.secondary}</p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-600">{offer.summary}</p>

      <div className="mt-5">
        <PulsatingTrialCta href={buildCheckoutHref(offer.slug, billing)} />
      </div>

      <div className="mt-6 border-t border-white/60 pt-5">
        <p className="text-xs font-semibold text-gray-500">Plan includes:</p>
        <ul className="mt-4 space-y-2.5">
          {isPro && offer.plusLabel ? (
            <>
              {offer.features.slice(0, 2).map((feature) => (
                <PricingCheckLi key={feature}>{feature}</PricingCheckLi>
              ))}
              <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{offer.plusLabel}:</p>
              {offer.features.slice(2).map((feature) => (
                <PricingCheckLi key={feature}>{feature}</PricingCheckLi>
              ))}
            </>
          ) : (
            offer.features.map((feature) => <PricingCheckLi key={feature}>{feature}</PricingCheckLi>)
          )}
        </ul>
      </div>
    </article>
  );
}

export function LandingPricing() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <LandingScrollReveal className="relative mx-auto w-full max-w-5xl px-4 text-center sm:px-6">
        <h2
          id="pricing"
          className={`${landingNavAnchorScrollClasses} text-[clamp(2rem,6vw,2.75rem)] font-bold lowercase tracking-tight text-[#1a1a1a]`}
        >
          choose your plan
        </h2>

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#f0e4c8]/80 bg-[#faf6ed]/75 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_-12px_rgba(180,140,60,0.15)] backdrop-blur-xl sm:px-6 sm:text-center">
          <p className="text-sm font-bold text-[#5c4a32]">30-day money-back guarantee</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#7a6548] sm:text-sm">
            Track your competitors. If within 30 days Rival hasn&apos;t shown you something worth acting on, email us for a
            full refund. No questions asked.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div
            role="radiogroup"
            aria-label="Billing period"
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
              Monthly
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
              Yearly
            </button>
            <span
              aria-hidden
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#4a7fa5] to-[#35688a] shadow-[0_4px_14px_-4px_rgba(74,127,165,0.55)] transition-transform duration-300 ease-out ${
                billing === "annual" ? "translate-x-[calc(100%+4px)]" : "translate-x-1"
              }`}
            />
          </div>

          <span className="inline-flex rounded-full border border-[#95C14B]/35 bg-[#95C14B]/15 px-3 py-1 text-[11px] font-semibold text-[#3d5c1f] backdrop-blur-sm">
            Save 2 months & get all 6 platforms
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 text-left sm:mt-12 lg:grid-cols-2 lg:gap-6">
          {PLAN_OFFERS.map((offer) => (
            <PricingCard key={offer.slug} offer={offer} billing={billing} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-gray-500 sm:text-sm">
          All plans start with a 7-day free trial · 1 competitor · card required · cancel anytime
        </p>
      </LandingScrollReveal>
    </section>
  );
}

export type { BillingPeriod };
