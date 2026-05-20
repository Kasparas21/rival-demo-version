"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlanPickerContent } from "@/components/billing/plan-picker-content";
import { planPickerGlassClass } from "@/components/ui/glass-styles";
import { RivalLogoImg } from "@/components/rival-logo";

/**
 * Dashboard overlay when `?pricing=1` — same plan cards as `/choose-plan` (glass onboarding style).
 */
export function PostOnboardingPricingOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      <div className={`pointer-events-auto relative z-10 my-auto w-full max-w-3xl ${planPickerGlassClass}`}>
        <div className="mb-5 flex justify-center sm:mb-6">
          <RivalLogoImg className="h-7 w-auto max-w-[150px] object-contain sm:h-8" />
        </div>
        <div id="post-onb-pricing-title" className="sr-only">
          Choose your plan
        </div>
        <PlanPickerContent variant="overlay" />
      </div>
    </div>
  );
}
