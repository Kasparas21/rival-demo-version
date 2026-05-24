"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";

type SyncState = "idle" | "syncing" | "synced" | "pending" | "error";

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id")?.trim() ?? "";
  const [syncState, setSyncState] = useState<SyncState>(checkoutId ? "syncing" : "idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const runSync = async () => {
      attempts += 1;
      setSyncState("syncing");
      try {
        const res = await fetch(
          `/api/billing/sync-checkout?checkout_id=${encodeURIComponent(checkoutId)}`,
          { credentials: "include", cache: "no-store" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          synced?: boolean;
          pending?: boolean;
          error?: string;
          message?: string;
        };

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setSyncState("error");
          setSyncMessage(json.error ?? "Could not activate subscription.");
          return;
        }

        if (json.synced) {
          setSyncState("synced");
          setSyncMessage(null);
          return;
        }

        if (json.pending && attempts < maxAttempts) {
          setSyncState("pending");
          setSyncMessage(json.message ?? "Activating subscription…");
          window.setTimeout(() => void runSync(), 2000);
          return;
        }

        setSyncState("pending");
        setSyncMessage("Subscription is still activating — you can continue and check Settings shortly.");
      } catch {
        if (!cancelled) {
          setSyncState("error");
          setSyncMessage("Network error while activating subscription.");
        }
      }
    };

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [checkoutId]);

  const activating = syncState === "syncing" || syncState === "pending";

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#dcfce7] bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">You&apos;re subscribed</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e]">
          Thanks for subscribing — let&apos;s scrape your ads
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#52525b]">
          We&apos;ll pull your live ads across Meta, Google, and more so you can see what&apos;s working and where to
          improve against competitors.
        </p>

        {activating ? (
          <p className="mt-4 text-[13px] text-[#71717a]">
            {syncMessage ?? "Activating subscription…"}
          </p>
        ) : null}

        {syncState === "error" && syncMessage ? (
          <p className="mt-4 text-[13px] font-medium text-[#b42318]" role="alert">
            {syncMessage}
          </p>
        ) : null}

        <Link
          href={buildWorkspaceBrandScrapeHref()}
          className="mt-7 inline-flex rounded-xl bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d44]"
        >
          Start scraping your company ads
        </Link>

        <p className="mt-4">
          <Link
            href="/dashboard/settings"
            className="text-[13px] font-medium text-[#71717a] underline underline-offset-2 hover:text-[#1a1a2e]"
          >
            Account settings
          </Link>
        </p>
      </div>
    </main>
  );
}
