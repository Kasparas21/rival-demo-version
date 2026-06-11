"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { formatTrialCountdown } from "@/components/marketing/marketing-trial-countdown";
import { glassModalShellClass } from "@/components/ui/glass-styles";

type Props = {
  open: boolean;
  onDismiss: () => void;
  /** From the 2nd wall appearance onward — trial countdown + primary CTA layout. */
  showTrialCountdown?: boolean;
  secondsLeft: number;
  trialExpired: boolean;
  onMinimize: () => void;
};

const GLASS_SECONDARY_BTN =
  "rounded-full border border-white/75 bg-white/58 px-5 py-2.5 text-sm font-semibold text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-10px_rgba(74,127,165,0.2)] backdrop-blur-md ring-1 ring-white/55 transition hover:border-white/90 hover:bg-white/72";

function TrialCountdownBanner({ secondsLeft, expired }: { secondsLeft: number; expired: boolean }) {
  return (
    <div
      className="mt-4 rounded-2xl border border-[#4a7fa5]/25 bg-gradient-to-br from-[#4a7fa5]/12 via-white/70 to-white/55 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_32px_-14px_rgba(74,127,165,0.28)] backdrop-blur-md ring-1 ring-white/60"
      aria-live="polite"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4a7fa5]">
        {expired ? "Preview ended" : "Free trial preview"}
      </p>
      <p className="mt-1 font-mono text-[clamp(1.75rem,5vw,2.25rem)] font-bold tabular-nums leading-none tracking-tight text-[#1e3a5f]">
        {expired ? "0:00" : formatTrialCountdown(secondsLeft)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">
        {expired
          ? "Your preview time is up. Start your free trial to keep exploring competitor ads, Strategy Maps, and Three Moves without limits."
          : "Your 3-minute preview is ticking down. Start your free trial now to keep exploring competitor ads, Strategy Maps, and Three Moves without limits."}
      </p>
    </div>
  );
}

/** BigSpy-style gate — blocks demo until user joins or dismisses. */
export function MarketingSignupWall({
  open,
  onDismiss,
  showTrialCountdown = false,
  secondsLeft,
  trialExpired,
  onMinimize,
}: Props) {
  if (!open) return null;

  const isTrialMode = showTrialCountdown;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {!isTrialMode ? (
        <button
          type="button"
          className="absolute inset-0 bg-[#4a7fa5]/22 backdrop-blur-2xl backdrop-saturate-[1.5]"
          aria-label="Close dialog backdrop"
          onClick={onDismiss}
        />
      ) : (
        <div
          className="absolute inset-0 bg-[#4a7fa5]/22 backdrop-blur-2xl backdrop-saturate-[1.5]"
          aria-hidden
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketing-signup-wall-title"
        className={`relative z-10 w-full overflow-hidden px-6 py-6 shadow-[0_28px_72px_-16px_rgba(74,127,165,0.42)] sm:px-8 sm:py-7 ${isTrialMode ? "max-w-xl" : "max-w-lg"} ${glassModalShellClass}`}
        data-demo-wall-ignore
      >
        {isTrialMode ? (
          <button
            type="button"
            onClick={onMinimize}
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#4a7fa5] shadow-sm backdrop-blur-md transition hover:bg-white/80"
            aria-label="Minimize trial timer"
            data-demo-wall-ignore
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        ) : null}

        <div className={`flex flex-wrap items-start justify-between gap-3 ${isTrialMode ? "pr-10" : ""}`}>
          <p
            id="marketing-signup-wall-title"
            className="text-base font-bold tracking-[-0.01em] text-[#111827] sm:text-[17px]"
          >
            {trialExpired ? "Your preview has ended" : "Join now to discover more features!"}
          </p>
          {!isTrialMode ? (
            <Link
              href="/login"
              className="text-sm font-semibold text-[#4a7fa5] transition hover:text-[#3d6d8f] hover:underline"
              data-demo-wall-ignore
            >
              Already a member?
            </Link>
          ) : null}
        </div>

        {!isTrialMode ? (
          <p className="mt-3 text-sm leading-relaxed text-[#4b5563] sm:text-[15px]">
            Start your free trial to search competitor ads, run Strategy Maps, and get Three Moves every
            Monday.
          </p>
        ) : null}

        {isTrialMode ? <TrialCountdownBanner secondsLeft={secondsLeft} expired={trialExpired} /> : null}

        <div className={`${isTrialMode ? "mt-6" : "mt-7"} flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end`}>
          {!isTrialMode ? (
            <button
              type="button"
              onClick={onDismiss}
              className={GLASS_SECONDARY_BTN}
              data-demo-wall-ignore
            >
              Maybe later
            </button>
          ) : null}

          <div className="flex w-full justify-stretch sm:justify-end" data-demo-wall-ignore>
            <LandingTrialCta
              href="/onboarding"
              size={isTrialMode ? "lg" : "md"}
              className="w-full sm:min-w-[12.5rem] sm:w-auto"
            >
              {isTrialMode ? (trialExpired ? "TRY FOR FREE NOW" : "GIVE ME MY FREE TRIAL") : "TRY FOR FREE"}
            </LandingTrialCta>
          </div>
        </div>
      </div>
    </div>
  );
}
