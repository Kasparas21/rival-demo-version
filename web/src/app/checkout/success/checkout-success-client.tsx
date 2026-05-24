"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id")?.trim() ?? "";

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;
    const scrapeHref = buildWorkspaceBrandScrapeHref();

    const goToScrape = () => {
      if (!cancelled) router.replace(scrapeHref);
    };

    if (!checkoutId) {
      goToScrape();
      return;
    }

    const runSync = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/billing/sync-checkout?checkout_id=${encodeURIComponent(checkoutId)}`,
          { credentials: "include", cache: "no-store" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          synced?: boolean;
          pending?: boolean;
        };

        if (cancelled) return;

        if (json.synced) {
          goToScrape();
          return;
        }

        if (json.pending && attempts < maxAttempts) {
          window.setTimeout(() => void runSync(), 2000);
          return;
        }

        goToScrape();
      } catch {
        if (!cancelled && attempts < maxAttempts) {
          window.setTimeout(() => void runSync(), 2000);
          return;
        }
        if (!cancelled) goToScrape();
      }
    };

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [checkoutId, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
      <RivalLoadingBlock />
    </main>
  );
}
