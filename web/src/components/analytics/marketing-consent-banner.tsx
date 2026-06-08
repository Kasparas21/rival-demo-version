"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useMarketingConsent } from "@/components/analytics/marketing-consent-provider";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import { landingCopyEn } from "@/lib/i18n/landing/en";

type ConsentCopy = LandingCopy["consent"];

type Props = {
  copy?: ConsentCopy;
};

export function MarketingConsentBanner({ copy = landingCopyEn.consent }: Props) {
  const { status, isResolved, acceptMarketing, rejectMarketing } = useMarketingConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isResolved || status !== null) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-sky-200/80 bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:px-6 sm:py-4 sm:shadow-[0_-8px_30px_rgba(15,23,42,0.08)]"
      role="dialog"
      aria-labelledby="marketing-consent-title"
      aria-describedby="marketing-consent-description"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <p id="marketing-consent-title" className="text-xs font-semibold text-sky-950 sm:text-sm">
            {copy.title}
          </p>
          <p
            id="marketing-consent-description"
            className="text-[11px] leading-snug text-sky-900/80 sm:text-sm sm:leading-relaxed"
          >
            <span className="sm:hidden">
              {copy.descriptionMobile}{" "}
              <Link href="/cookies" className="underline underline-offset-2 hover:text-sky-950">
                {copy.policyShort}
              </Link>
            </span>
            <span className="hidden sm:inline">
              {copy.descriptionDesktop}{" "}
              <Link href="/cookies" className="underline underline-offset-2 hover:text-sky-950">
                {copy.cookiePolicy}
              </Link>
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          <button
            type="button"
            onClick={rejectMarketing}
            className="min-h-8 flex-1 rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm"
          >
            {copy.reject}
          </button>
          <button
            type="button"
            onClick={acceptMarketing}
            className="min-h-8 flex-1 rounded-md bg-sky-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
