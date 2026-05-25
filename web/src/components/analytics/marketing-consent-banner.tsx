"use client";

import Link from "next/link";

import { useMarketingConsent } from "@/components/analytics/marketing-consent-provider";

export function MarketingConsentBanner() {
  const { status, acceptMarketing, rejectMarketing } = useMarketingConsent();

  if (status !== null) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-sky-200/80 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-labelledby="marketing-consent-title"
      aria-describedby="marketing-consent-description"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p id="marketing-consent-title" className="text-sm font-semibold text-sky-950">
            Cookies &amp; analytics
          </p>
          <p id="marketing-consent-description" className="text-xs leading-relaxed text-sky-900/80 sm:text-sm">
            We use analytics and marketing cookies (including Meta Pixel) to measure site use and ad
            performance. You can accept or reject non-essential cookies.{" "}
            <Link href="/cookies" className="underline underline-offset-2 hover:text-sky-950">
              Cookie Policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={rejectMarketing}
            className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={acceptMarketing}
            className="rounded-lg bg-sky-900 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
