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

/** Segmented monthly / annual pill for the closing CTA. */
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
    <div className="inline-block w-full max-w-[min(100%,19rem)] sm:max-w-[20.5rem]">
      <div className="mb-2.5 grid grid-cols-2 gap-1.5 sm:mb-3 sm:gap-2">
        <div aria-hidden />
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full border border-[#7daa3a] bg-[#95C14B] px-3 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-white shadow-[0_2px_8px_-2px_rgba(74,106,36,0.45)] sm:text-[11px]">
            {annualSaveBadge}
          </span>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={billingAria}
        className="grid grid-cols-2 gap-1.5 rounded-full border border-[#4a7fa5]/25 bg-white/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_36px_-12px_rgba(74,127,165,0.22)] backdrop-blur-xl sm:gap-2 sm:p-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={billing === "monthly"}
          onClick={() => setBilling("monthly")}
          className={`flex min-w-0 flex-col items-center justify-center rounded-full px-3 py-3.5 text-center transition-[color,background-color,box-shadow] duration-200 sm:px-4 sm:py-4 ${
            billing === "monthly"
              ? "bg-gradient-to-b from-[#5a8fb3] to-[#4a7fa5] text-white shadow-[0_4px_12px_-4px_rgba(74,127,165,0.55)]"
              : "text-[#64748b] hover:bg-white/60 hover:text-[#4a7fa5]"
          }`}
        >
          <span className="text-[15px] font-bold leading-none tracking-tight sm:text-base">{monthlyPrice}</span>
          <span
            className={`mt-2 text-[10px] font-medium uppercase tracking-[0.1em] ${
              billing === "monthly" ? "text-white/80" : "text-[#94a3b8]"
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
          className={`flex min-w-0 flex-col items-center justify-center rounded-full px-3 py-3.5 text-center transition-[color,background-color,box-shadow] duration-200 sm:px-4 sm:py-4 ${
            billing === "annual"
              ? "bg-gradient-to-b from-[#5a8fb3] to-[#4a7fa5] text-white shadow-[0_4px_12px_-4px_rgba(74,127,165,0.55)]"
              : "text-[#64748b] hover:bg-white/60 hover:text-[#4a7fa5]"
          }`}
        >
          <span className="text-[15px] font-bold leading-none tracking-tight sm:text-base">{annualPrice}</span>
          <span
            className={`mt-2 text-[10px] font-medium uppercase tracking-[0.1em] ${
              billing === "annual" ? "text-white/80" : "text-[#94a3b8]"
            }`}
          >
            {annualLabel}
          </span>
        </button>
      </div>
    </div>
  );
}
