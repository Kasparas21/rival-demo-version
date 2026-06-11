"use client";

import { useCallback, useEffect, useState, type ReactNode, type SyntheticEvent } from "react";

import { MarketingSignupWall } from "@/components/marketing/marketing-signup-wall";
import { TRIAL_PREVIEW_SECONDS } from "@/components/marketing/marketing-trial-countdown";
import { MarketingTrialCountdownWidget } from "@/components/marketing/marketing-trial-countdown-widget";

type Props = {
  children: ReactNode;
  /** Feature pages — wall opens immediately on load. */
  showOnMount?: boolean;
};

const INTERACTIONS_AFTER_DISMISS = 3;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-demo-wall-ignore]")) return false;
  return Boolean(
    target.closest(
      'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [data-demo-interactive]',
    ),
  );
}

export function MarketingDemoGate({ children, showOnMount = false }: Props) {
  const [wallOpen, setWallOpen] = useState(showOnMount);
  const [showCount, setShowCount] = useState(showOnMount ? 1 : 0);
  const [interactionsLeft, setInteractionsLeft] = useState<number | null>(null);

  const [trialStarted, setTrialStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TRIAL_PREVIEW_SECONDS);
  const [trialExpired, setTrialExpired] = useState(false);
  const [clockMinimized, setClockMinimized] = useState(false);

  const showTrialCountdown = showCount >= 2;

  const openWall = useCallback(() => {
    setShowCount((count) => count + 1);
    setInteractionsLeft(null);
    setClockMinimized(false);
    setWallOpen(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setWallOpen(false);
    setInteractionsLeft(INTERACTIONS_AFTER_DISMISS);
  }, []);

  const handleMinimize = useCallback(() => {
    setWallOpen(false);
    setClockMinimized(true);
    setInteractionsLeft(null);
  }, []);

  useEffect(() => {
    if (showOnMount) {
      setWallOpen(true);
      setShowCount(1);
    }
  }, [showOnMount]);

  useEffect(() => {
    if (!wallOpen || !showTrialCountdown || trialStarted) return;
    setTrialStarted(true);
    setSecondsLeft(TRIAL_PREVIEW_SECONDS);
    setTrialExpired(false);
  }, [wallOpen, showTrialCountdown, trialStarted]);

  useEffect(() => {
    if (!trialStarted || trialExpired) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setTrialExpired(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [trialStarted, trialExpired]);

  const handleInteraction = useCallback(
    (event: SyntheticEvent) => {
      if (!wallOpen && trialStarted) return;
      if (wallOpen) return;
      if (!isInteractiveTarget(event.target)) return;

      if (interactionsLeft !== null) {
        if (interactionsLeft > 0) {
          setInteractionsLeft(interactionsLeft - 1);
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        openWall();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openWall();
    },
    [interactionsLeft, openWall, trialStarted, wallOpen],
  );

  const showFloatingWidget =
    trialStarted && !wallOpen && (clockMinimized || trialExpired);

  return (
    <>
      <MarketingSignupWall
        open={wallOpen}
        onDismiss={handleDismiss}
        showTrialCountdown={showTrialCountdown}
        secondsLeft={secondsLeft}
        trialExpired={trialExpired}
        onMinimize={handleMinimize}
      />

      {showFloatingWidget ? (
        <MarketingTrialCountdownWidget secondsLeft={secondsLeft} expired={trialExpired} />
      ) : null}

      <div
        className={wallOpen ? "pointer-events-none select-none" : undefined}
        onClickCapture={handleInteraction}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter" || e.key === " ") handleInteraction(e);
        }}
      >
        {children}
      </div>
    </>
  );
}
