"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AccentCta,
  BlackCta,
  BrandCheckLi,
  PricingBlock,
  type BillingPeriod,
} from "@/components/landing/landing-pricing";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";
import { RivalLogoImg } from "@/components/rival-logo";

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingPeriod;
  onChange: (b: BillingPeriod) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="mx-auto mt-6 inline-flex max-w-full rounded-full bg-gray-100/90 p-1 shadow-inner ring-1 ring-black/[0.04]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={billing === "monthly"}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
          billing === "monthly" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-[#1a1a1a]"
        }`}
        onClick={() => onChange("monthly")}
      >
        Monthly
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={billing === "annual"}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
          billing === "annual" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-[#1a1a1a]"
        }`}
        onClick={() => onChange("annual")}
      >
        Annual
      </button>
    </div>
  );
}

/**
 * Full-screen overlay on the dashboard main column after onboarding: blurred route shell + pricing plans.
 */
export function PostOnboardingPricingOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const clearPricingParam = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("pricing");
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearPricingParam();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearPricingParam]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center sm:px-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-onb-pricing-title"
    >
      <div className="pointer-events-auto relative z-10 my-auto w-full max-w-5xl rounded-3xl border border-white/80 bg-white/98 p-5 shadow-[0_24px_80px_rgba(31,38,135,0.18)] backdrop-blur-md sm:p-8">
        <div className="mb-5 flex flex-col items-center text-center sm:mb-6">
          <RivalLogoImg className="mb-4 h-7 w-auto max-w-[150px] object-contain sm:h-8" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717a]">Welcome to Rival</p>
          <h2 id="post-onb-pricing-title" className="mt-1 max-w-xl text-[clamp(1.35rem,4vw,1.85rem)] font-bold leading-tight text-[#1a1a1a]">
            Pick a plan to unlock the full ad intelligence stack
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-gray-600">
            7-day free trial on Starter or Pro. Card required. Switch plans anytime.
          </p>
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>

        <div className="grid grid-cols-1 gap-4 text-left lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-md sm:p-6">
            <p className="text-lg font-bold text-[#1a1a1a]">Starter</p>
            <PricingBlock billing={billing} listMonthlyUsd={79} annualMonthlyUsd={59} />
            <p className="mt-3 text-sm font-bold text-[#1a1a1a]">5 competitors · 50k ads/mo</p>
            <div className="mt-6">
              <BlackCta href={buildCheckoutHref("starter", billing)}>Start free trial</BlackCta>
              <p className="mt-2 text-center text-[11px] text-gray-400">No commitment</p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="text-[11px] font-bold text-[#1a1a1a]">Includes</p>
              <ul className="mt-3 space-y-2.5">
                <BrandCheckLi>5 competitors · 15 swaps/mo</BrandCheckLi>
                <BrandCheckLi>Smart Prioritization (always on)</BrandCheckLi>
                <BrandCheckLi>All 6 platforms</BrandCheckLi>
              </ul>
            </div>
          </div>

          <div className="relative flex flex-col rounded-2xl border-2 border-[#4a7fa5] bg-white p-5 shadow-[0_4px_28px_-4px_rgba(74,127,165,0.45)] sm:p-6">
            <span className="absolute right-4 top-4 rounded-full bg-[#4a7fa5] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:right-5 sm:top-5">
              Most Popular
            </span>
            <p className="text-lg font-bold text-[#1a1a1a]">Pro</p>
            <PricingBlock billing={billing} listMonthlyUsd={149} annualMonthlyUsd={129} />
            <p className="mt-3 text-sm font-bold text-[#1a1a1a]">15 competitors · 150k ads/mo</p>
            <div className="mt-6">
              <AccentCta href={buildCheckoutHref("pro", billing)}>Start free trial</AccentCta>
              <p className="mt-2 text-center text-[11px] text-gray-400">No commitment</p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="text-[11px] font-bold text-[#4a7fa5]">Everything in Starter, plus</p>
              <ul className="mt-3 space-y-2.5">
                <BrandCheckLi>CSV export & manual refresh</BrandCheckLi>
                <BrandCheckLi>50 swaps/mo</BrandCheckLi>
                <BrandCheckLi>Optional Smart Prioritization per competitor</BrandCheckLi>
                <BrandCheckLi>Brand comparison</BrandCheckLi>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-gray-100 pt-5 text-center sm:mt-7">
          <button
            type="button"
            onClick={clearPricingParam}
            className="text-[13px] font-semibold text-[#52525b] underline decoration-gray-300 underline-offset-2 transition-colors hover:text-[#1a1a1a]"
          >
            Explore the app first — I&apos;ll choose a plan later
          </button>
          <p className="max-w-md text-[11px] text-[#a1a1aa]">Some features may require an active subscription.</p>
        </div>
      </div>
    </div>
  );
}
