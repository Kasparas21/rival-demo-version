"use client";

import { useState } from "react";
import Link from "next/link";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

/** Feature checklist (brand green `#95C14B`, matches `--rival-success`) */
function BrandCheckLi({ children }: { children: React.ReactNode }) {
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

function BlackCta({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/checkout"
      className="flex w-full justify-center rounded-xl bg-gradient-to-b from-neutral-700 to-neutral-950 py-3.5 font-semibold text-white shadow-inner hover:brightness-105"
    >
      {children}
    </Link>
  );
}

function AccentCta({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/checkout"
      className="flex w-full justify-center rounded-xl bg-gradient-to-r from-[#4a7fa5] to-[#35688a] py-3.5 font-semibold text-white shadow-sm hover:brightness-105"
    >
      {children}
    </Link>
  );
}

type Billing = "monthly" | "annual";

function PricingBlock({
  billing,
  listMonthlyUsd,
}: {
  billing: Billing;
  listMonthlyUsd: number;
}) {
  const annualFull = Math.round(listMonthlyUsd * 12);
  const annualDeal = Math.round(annualFull * 0.7);
  const effectiveMoPerMonth = annualDeal / 12;
  const effectiveMoLabel = Math.round(effectiveMoPerMonth);

  if (billing === "monthly") {
    return (
      <div className="mt-4 space-y-1">
        <p className="text-base text-gray-400 line-through">${listMonthlyUsd}/mo</p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold text-[#1a1a1a]">Free</span>
          <span className="text-sm font-medium text-gray-600">for 1 day</span>
        </div>
        <p className="text-sm text-gray-700">then ${listMonthlyUsd}/mo</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1">
      <p className="text-base text-gray-400 line-through">${annualFull}/yr</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-bold text-[#1a1a1a]">Free</span>
        <span className="text-sm font-medium text-gray-600">for 1 day</span>
      </div>
      <p className="text-sm text-gray-700">
        then ~${effectiveMoLabel}/mo · ${annualDeal}/yr billed annually{" "}
        <span className="font-semibold text-[#4a7fa5]">(-30%)</span>
      </p>
    </div>
  );
}

export function LandingPricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section className="py-24 text-center">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="pricing" className={`${landingNavAnchorScrollClasses} text-5xl font-bold text-[#1a1a1a]`}>
          The only ad intelligence subscription <br />
          you&apos;ll ever
          <br />
          <span className="text-[#4a7fa5]">need.</span>
        </h2>
        <p className="mt-4 text-sm text-gray-600">
          Transparent monthly pricing with credits · Switch plans anytime
        </p>

        <div
          role="radiogroup"
          aria-label="Billing period"
          className="mx-auto mt-10 inline-flex rounded-full bg-gray-100/90 p-1 shadow-inner ring-1 ring-black/[0.04]"
        >
          <button
            type="button"
            role="radio"
            aria-checked={billing === "monthly"}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
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
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              billing === "annual" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-[#1a1a1a]"
            }`}
            onClick={() => setBilling("annual")}
          >
            Annual <span className="font-bold text-emerald-700">−30%</span>
          </button>
        </div>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-8 text-left lg:grid-cols-3 lg:gap-6">
          {/* Starter */}
          <div className="flex flex-col rounded-3xl bg-white p-8 shadow-lg">
            <p className="text-xl font-bold text-[#1a1a1a]">Starter</p>
            <PricingBlock billing={billing} listMonthlyUsd={19} />
            <p className="mt-4 text-sm font-bold text-[#1a1a1a]">5 searches included monthly</p>

            <div className="mt-8">
              <BlackCta>Start now</BlackCta>
              <p className="mt-3 text-center text-xs text-gray-400">No commitment</p>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-8">
              <p className="text-xs font-bold text-[#1a1a1a]">Features included:</p>
              <ul className="mt-5 space-y-4">
                <BrandCheckLi>Ads library</BrandCheckLi>
                <BrandCheckLi>Strategy map</BrandCheckLi>
                <BrandCheckLi>Strategy insights</BrandCheckLi>
                <BrandCheckLi>AI insight tab</BrandCheckLi>
                <BrandCheckLi>3 monitored competitors</BrandCheckLi>
                <BrandCheckLi>All 6 platforms</BrandCheckLi>
                <BrandCheckLi>Email support</BrandCheckLi>
              </ul>
            </div>
          </div>

          {/* Pro — highlighted */}
          <div className="relative flex flex-col rounded-3xl border-2 border-[#4a7fa5] bg-white p-8 shadow-[0_4px_28px_-4px_rgba(74,127,165,0.55),0_22px_56px_-12px_rgba(74,127,165,0.42),0_42px_90px_-24px_rgba(74,127,165,0.28)]">
            <span className="absolute right-6 top-6 rounded-full bg-[#4a7fa5] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Most Popular
            </span>
            <p className="text-xl font-bold text-[#1a1a1a]">Pro</p>
            <PricingBlock billing={billing} listMonthlyUsd={45} />
            <p className="mt-4 text-sm font-bold text-[#1a1a1a]">15 searches included monthly</p>

            <div className="mt-8">
              <AccentCta>Start now</AccentCta>
              <p className="mt-3 text-center text-xs text-gray-400">No commitment</p>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-8">
              <p className="text-xs font-bold text-[#4a7fa5]">All Starter features, plus:</p>
              <ul className="mt-5 space-y-4">
                <BrandCheckLi>Comparison to your brand</BrandCheckLi>
                <BrandCheckLi>Change alerts (real-time)</BrandCheckLi>
                <BrandCheckLi>Export reports (PDF, CSV)</BrandCheckLi>
                <BrandCheckLi>10 monitored competitors</BrandCheckLi>
                <BrandCheckLi>Priority email support</BrandCheckLi>
              </ul>
            </div>
          </div>

          {/* Agency */}
          <div className="flex flex-col rounded-3xl bg-white p-8 shadow-lg">
            <p className="text-xl font-bold text-[#1a1a1a]">Agency</p>
            <PricingBlock billing={billing} listMonthlyUsd={89} />
            <p className="mt-4 text-sm font-bold text-[#1a1a1a]">40 searches included monthly</p>

            <div className="mt-8">
              <BlackCta>Start now</BlackCta>
              <p className="mt-3 text-center text-xs text-gray-400">No commitment</p>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-8">
              <p className="text-xs font-bold text-[#1a1a1a]">Starter + Pro features, plus:</p>
              <ul className="mt-5 space-y-4">
                <BrandCheckLi>250 ads per search</BrandCheckLi>
                <BrandCheckLi>25 monitored competitors</BrandCheckLi>
                <BrandCheckLi>White-label PDF exports</BrandCheckLi>
                <BrandCheckLi>Dedicated account manager</BrandCheckLi>
                <BrandCheckLi>API access (limited)</BrandCheckLi>
                <BrandCheckLi>Slack support channel</BrandCheckLi>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-fit rounded-full bg-white px-6 py-3 text-sm text-gray-600 shadow-sm">
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
          </a>{" "}
          ? Save up to <span className="font-semibold text-[#4a7fa5]">96%</span>
          . <span className="text-[#4a7fa5]" aria-hidden>&gt;</span>
        </div>
      </div>
    </section>
  );
}
