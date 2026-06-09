"use client";

import { useState } from "react";

type BillingChoice = "monthly" | "annual";

type Props = {
  monthlyPrice: string;
  annualPrice: string;
  monthlyLabel: string;
  annualLabel: string;
  annualSaveBadge: string;
  billingAria: string;
};

/** Segmented monthly / annual pill for the closing CTA — matches pricing section styling. */
export function LandingFinalCtaPricing({
  monthlyPrice,
  annualPrice,
  monthlyLabel,
  annualLabel,
  annualSaveBadge,
  billingAria,
}: Props) {
  const [billing, setBilling] = useState<BillingChoice>("annual");

  return (
    <div
      role="radiogroup"
      aria-label={billingAria}
      className="relative inline-flex max-w-full rounded-full border border-[#4a7fa5]/28 bg-white/78 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_14px_44px_-14px_rgba(74,127,165,0.22)] backdrop-blur-xl"
    >
      <button
        type="button"
        role="radio"
        aria-checked={billing === "monthly"}
        onClick={() => setBilling("monthly")}
        className={`relative z-[1] rounded-full px-4 py-2.5 text-left transition-colors sm:px-6 sm:py-3 ${
          billing === "monthly" ? "text-white" : "text-[#64748b] hover:text-[#4a7fa5]"
        }`}
      >
        <span className="block text-[15px] font-bold leading-none tracking-tight sm:text-base">{monthlyPrice}</span>
        <span
          className={`mt-1 block text-[10px] font-medium uppercase tracking-[0.1em] ${
            billing === "monthly" ? "text-white/75" : "text-[#94a3b8]"
          }`}
        >
          {monthlyLabel}
        </span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={billing === "annual"}
        onClick={() => setBilling("annual")}
        className={`relative z-[1] rounded-full px-4 py-2.5 text-left transition-colors sm:px-6 sm:py-3 ${
          billing === "annual" ? "text-white" : "text-[#64748b] hover:text-[#4a7fa5]"
        }`}
      >
        <span
          className={`absolute -top-2.5 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] shadow-sm sm:text-[10px] ${
            billing === "annual"
              ? "border border-white/60 bg-[#95C14B] text-white"
              : "border border-[#95C14B]/35 bg-[#f3f9e8] text-[#4a6b24]"
          }`}
        >
          {annualSaveBadge}
        </span>
        <span className="block text-[15px] font-bold leading-none tracking-tight sm:text-base">{annualPrice}</span>
        <span
          className={`mt-1 block text-[10px] font-medium uppercase tracking-[0.1em] ${
            billing === "annual" ? "text-white/75" : "text-[#94a3b8]"
          }`}
        >
          {annualLabel}
        </span>
      </button>

      <span
        aria-hidden
        className={`pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#4a7fa5] to-[#35688a] shadow-[0_4px_14px_-4px_rgba(74,127,165,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          billing === "annual" ? "translate-x-[calc(100%+4px)]" : "translate-x-1"
        }`}
      />
    </div>
  );
}
