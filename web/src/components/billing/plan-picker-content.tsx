"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckoutNavigationLink } from "@/components/analytics/checkout-navigation-link";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";
import type { BillingPeriod } from "@/lib/billing/config";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import { onboardingCopyEn } from "@/lib/i18n/onboarding/en";
import type { PlanPickerCopy } from "@/lib/i18n/onboarding/types";
import {
  localizedPlanPriceDisplay,
  maxAnnualSavingsPercentForPlans,
} from "@/lib/i18n/onboarding/plan-price";

function PlanGlassCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] leading-snug text-gray-700">
      <svg className="mt-0.5 size-3.5 shrink-0 text-[#95C14B]" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="m6 10 2.5 2.5L14 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function BillingToggle({
  billing,
  onChange,
  maxSavingsPct,
  copy,
  className = "",
}: {
  billing: BillingPeriod;
  onChange: (b: BillingPeriod) => void;
  maxSavingsPct: number;
  copy: PlanPickerCopy;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={copy.billingAria}
      className={`inline-flex max-w-full rounded-full border border-gray-200/80 bg-white/50 p-1 ${className}`.trim()}
    >
      <button
        type="button"
        role="radio"
        aria-checked={billing === "monthly"}
        className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
          billing === "monthly" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => onChange("monthly")}
      >
        {copy.monthly}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={billing === "annual"}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition sm:px-4 ${
          billing === "annual" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => onChange("annual")}
      >
        {copy.annual}
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            billing === "annual"
              ? "bg-[#95C14B] text-gray-900"
              : "bg-[#95C14B]/25 text-gray-800"
          }`}
        >
          {fillCopyTemplate(copy.savePercentBadge, { percent: maxSavingsPct })}
        </span>
      </button>
    </div>
  );
}

const planCardBase = "flex flex-col rounded-2xl border bg-white/50 p-5 backdrop-blur-md sm:p-7";
const planCardPopular = "border-gray-900/25 ring-1 ring-gray-900/10 shadow-[0_12px_40px_rgba(17,24,39,0.08)]";

type PlanPickerContentProps = {
  copy?: PlanPickerCopy;
  dashboardNext?: string;
  variant?: "page" | "overlay" | "onboarding";
  onSkip?: () => void;
  testerInviteActive?: boolean;
  checkoutError?: string | null;
};

function TesterPlanPicker({
  variant,
  dashboardNext,
  copy,
}: {
  variant: "page" | "overlay" | "onboarding";
  dashboardNext?: string;
  copy: PlanPickerCopy;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const proOffer = copy.plans.find((offer) => offer.slug === "pro") ?? copy.plans[1]!;
  const isOnboarding = variant === "onboarding";
  const destinationAfterActivate = dashboardNext ?? DASHBOARD_HOME_PATH;
  const t = copy.tester;

  const titleClass =
    variant === "onboarding"
      ? "text-[21px] font-semibold tracking-tight text-gray-900"
      : variant === "page"
        ? "text-[clamp(1.3rem,4vw,1.65rem)] font-semibold tracking-tight text-gray-900"
        : "text-[clamp(1.2rem,4vw,1.55rem)] font-bold leading-tight text-gray-900";

  async function claimWithoutCard() {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/billing/claim-tester-access", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; startWorkspaceScrape?: boolean };
      if (!res.ok || !json.ok) {
        setClaimError(json.error ?? t.claimError);
        return;
      }
      router.push(json.startWorkspaceScrape ? buildWorkspaceBrandScrapeHref() : destinationAfterActivate);
      router.refresh();
    } catch {
      setClaimError(t.networkError);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className={isOnboarding ? "mx-auto w-full max-w-xl" : undefined}>
      <div className={isOnboarding ? "mb-4 text-center" : variant === "page" || variant === "overlay" ? "text-center" : "mb-4 text-left"}>
        {variant !== "onboarding" ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{copy.allSet}</p>
        ) : null}
        <h1 className={isOnboarding ? titleClass : `mt-1 ${titleClass}`}>{t.title}</h1>
        <p
          className={
            isOnboarding
              ? "mx-auto mt-1.5 max-w-md text-[13px] text-gray-600"
              : "mx-auto mt-2 max-w-sm text-[13px] text-gray-600"
          }
        >
          {t.body}
        </p>
      </div>

      <div className="mt-4 text-left">
        <div className={`${planCardBase} ${planCardPopular} mx-auto max-w-xl`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold text-gray-900">{proOffer.name}</p>
            <span className="shrink-0 rounded-full bg-[#95C14B] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-900">
              {t.badge}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-[13px] font-medium text-gray-400 line-through">
              {fillCopyTemplate(t.listPricePerMonth, { amount: proOffer.monthlyUsd })}
            </p>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[1.65rem] font-bold leading-none tracking-tight text-gray-900">€0</span>
              <span className="text-[13px] font-medium text-gray-500">{t.freePerMonth}</span>
            </div>
          </div>

          <p className="mt-2 text-[13px] text-gray-700">{proOffer.summary}</p>

          <span className="mt-3 inline-flex w-fit rounded-full border border-[#95C14B]/40 bg-[#95C14B]/12 px-2.5 py-1 text-[11px] font-semibold text-gray-800">
            {t.complimentary}
          </span>

          <button
            type="button"
            disabled={claiming}
            onClick={() => void claimWithoutCard()}
            className="mt-3 flex w-full justify-center rounded-full bg-gray-900 py-3 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {claiming ? t.activating : t.activate}
          </button>

          {claimError ? (
            <p className="mt-2 text-[12px] font-medium text-[#b42318]">{claimError}</p>
          ) : null}

          <div className="mt-4 border-t border-gray-200/70 pt-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {proOffer.plusLabel ?? copy.includes}
            </p>
            <ul className="mt-2 space-y-1.5">
              {proOffer.features.map((feature) => (
                <PlanGlassCheck key={feature}>{feature}</PlanGlassCheck>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanPickerContent({
  copy = onboardingCopyEn.planPicker,
  variant = "page",
  testerInviteActive = false,
  dashboardNext,
  checkoutError = null,
}: PlanPickerContentProps) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const maxSavingsPct = maxAnnualSavingsPercentForPlans(copy.plans);

  if (testerInviteActive) {
    return <TesterPlanPicker variant={variant} dashboardNext={dashboardNext} copy={copy} />;
  }

  const titleClass =
    variant === "onboarding"
      ? "text-[21px] font-semibold tracking-tight text-gray-900"
      : variant === "page"
        ? "text-[clamp(1.3rem,4vw,1.65rem)] font-semibold tracking-tight text-gray-900"
        : "text-[clamp(1.2rem,4vw,1.55rem)] font-bold leading-tight text-gray-900";

  return (
    <>
      {checkoutError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-[#b42318]">
          {checkoutError}
        </p>
      ) : null}
      <div className={variant === "onboarding" ? "mb-4 text-left" : "text-center"}>
        {variant !== "onboarding" ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{copy.allSet}</p>
        ) : null}
        <h1 className={variant === "onboarding" ? titleClass : `mt-1 ${titleClass}`}>{copy.choosePlanTitle}</h1>
        <p
          className={
            variant === "onboarding"
              ? "mt-1.5 text-[13px] text-gray-600"
              : "mx-auto mt-2 max-w-sm text-[13px] text-gray-600"
          }
        >
          {copy.intro}
        </p>
        <div className="mt-4 flex justify-center">
          <BillingToggle billing={billing} onChange={setBilling} maxSavingsPct={maxSavingsPct} copy={copy} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-left md:grid-cols-2 md:gap-5 md:items-stretch">
        {copy.plans.map((offer) => {
          const price = localizedPlanPriceDisplay(offer, billing, copy);
          const checkoutHref = buildCheckoutHref(offer.slug, billing, dashboardNext);
          const isPro = offer.popular === true;
          const isAnnual = billing === "annual";

          return (
            <div
              key={offer.slug}
              className={`${planCardBase} ${isPro ? planCardPopular : "border-white/70 ring-1 ring-gray-900/5 shadow-[0_8px_28px_rgba(17,24,39,0.05)]"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-semibold text-gray-900">{offer.name}</p>
                {isPro ? (
                  <span className="shrink-0 rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    {copy.popular}
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                {isAnnual && price.listMonthlyUsd != null ? (
                  <p className="text-[13px] font-medium text-gray-400 line-through">
                    €{price.listMonthlyUsd}
                    {copy.perMonth}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[1.65rem] font-bold leading-none tracking-tight text-gray-900">
                    {price.primary}
                  </span>
                  <span className="text-[13px] font-medium text-gray-500">{copy.perMonth}</span>
                </div>
                {isAnnual && price.savingsPercent != null ? (
                  <p className="mt-1 text-[12px] font-semibold text-[#2d5a1f]">
                    {fillCopyTemplate(copy.saveVsMonthly, { percent: price.savingsPercent })}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-gray-500">{price.secondary}</p>
              </div>

              <p className="mt-2 text-[13px] text-gray-700">{offer.summary}</p>

              <span className="mt-3 inline-flex w-fit rounded-full border border-[#95C14B]/40 bg-[#95C14B]/12 px-2.5 py-1 text-[11px] font-semibold text-gray-800">
                {copy.trialBadge}
              </span>

              <CheckoutNavigationLink
                href={checkoutHref}
                className="mt-3 flex w-full justify-center rounded-full bg-gray-900 py-3 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:bg-black active:scale-[0.98]"
              >
                {copy.startFreeTrial}
              </CheckoutNavigationLink>

              <div className="mt-4 border-t border-gray-200/70 pt-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {offer.plusLabel ?? copy.includes}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {offer.features.map((feature) => (
                    <PlanGlassCheck key={feature}>{feature}</PlanGlassCheck>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
