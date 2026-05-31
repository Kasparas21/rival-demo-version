"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";

type SyncState = "idle" | "syncing" | "ready" | "pending" | "error";

const SETUP_MESSAGE = "We're setting up your account — this usually takes a few seconds.";

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id")?.trim() ?? "";
  const [syncState, setSyncState] = useState<SyncState>(checkoutId ? "syncing" : "ready");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

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
          setSyncState("ready");
          setSyncMessage(null);
          return;
        }

        if (json.pending && attempts < maxAttempts) {
          setSyncState("pending");
          setSyncMessage(json.message ?? SETUP_MESSAGE);
          window.setTimeout(() => void runSync(), 2000);
          return;
        }

        setSyncState("ready");
        setSyncMessage(null);
      } catch {
        if (!cancelled && attempts < maxAttempts) {
          setSyncState("pending");
          setSyncMessage(SETUP_MESSAGE);
          window.setTimeout(() => void runSync(), 2000);
          return;
        }
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
  const canContinue = !activating;

  const continueSetup = useCallback(() => {
    router.push(POST_PAYMENT_ONBOARDING_PATH);
  }, [router]);

  return (
    <RivalVideoShell footerTint="light">
      <div className="flex w-full flex-col items-center px-4 sm:px-6">
        <Link
          href="/"
          className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50"
        >
          <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
        </Link>

        <div className={`w-full max-w-[520px] text-center ${glassPanelClass}`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#95C14B]/35 bg-[#95C14B]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2d5a1f]">
            <span className="size-1.5 rounded-full bg-[#95C14B]" aria-hidden />
            Payment successful
          </span>

          <h1 className="mt-5 text-[clamp(1.45rem,4vw,1.85rem)] font-semibold leading-tight tracking-tight text-gray-900">
            You&apos;re subscribed — finish your setup
          </h1>

          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-600">
            Choose your ad regions and add your Meta, Google, and other ad library URLs so we can map your live
            creatives.
          </p>

          {activating ? (
            <div
              className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              role="status"
              aria-live="polite"
            >
              <span
                className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#4a7fa5]/25 border-t-[#4a7fa5]"
                aria-hidden
              />
              <p className="text-[13px] leading-snug text-gray-700">{syncMessage ?? SETUP_MESSAGE}</p>
            </div>
          ) : null}

          {!activating && syncMessage && syncState !== "error" ? (
            <p className="mt-4 text-[13px] text-gray-600">{syncMessage}</p>
          ) : null}

          {syncState === "error" && syncMessage ? (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-[13px] font-medium text-[#b42318]" role="alert">
              {syncMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={continueSetup}
            disabled={!canContinue}
            className="mt-8 inline-flex w-full max-w-sm justify-center rounded-full bg-gray-900 px-6 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-gray-900 disabled:active:scale-100"
          >
            {activating ? "Setting up your account…" : "Continue setup →"}
          </button>
        </div>
      </div>
    </RivalVideoShell>
  );
}
