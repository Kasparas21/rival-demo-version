"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { MarketingSignupWall } from "@/components/marketing/marketing-signup-wall";
import { TRIAL_PREVIEW_SECONDS } from "@/components/marketing/marketing-trial-countdown";
import { MarketingTrialCountdownWidget } from "@/components/marketing/marketing-trial-countdown-widget";

type Props = {
  children: ReactNode;
  /** Feature / AdSpy pages — wall opens immediately on load. */
  showOnMount?: boolean;
};

/** Free demo time after the first dismiss before the trial-countdown wall returns. */
const SECOND_WALL_DELAY_MS = 45_000;

export function MarketingDemoGate({ children, showOnMount = false }: Props) {
  const [wallOpen, setWallOpen] = useState(showOnMount);
  const [showCount, setShowCount] = useState(showOnMount ? 1 : 0);

  const [trialStarted, setTrialStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TRIAL_PREVIEW_SECONDS);
  const [trialExpired, setTrialExpired] = useState(false);
  const [clockMinimized, setClockMinimized] = useState(false);

  const secondWallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTrialCountdown = showCount >= 2;

  const openWall = useCallback(() => {
    setShowCount((count) => count + 1);
    setClockMinimized(false);
    setWallOpen(true);
  }, []);

  const clearSecondWallTimer = useCallback(() => {
    if (secondWallTimerRef.current !== null) {
      window.clearTimeout(secondWallTimerRef.current);
      secondWallTimerRef.current = null;
    }
  }, []);

  const scheduleSecondWall = useCallback(() => {
    clearSecondWallTimer();
    secondWallTimerRef.current = window.setTimeout(() => {
      secondWallTimerRef.current = null;
      openWall();
    }, SECOND_WALL_DELAY_MS);
  }, [clearSecondWallTimer, openWall]);

  const handleDismiss = useCallback(() => {
    setWallOpen(false);
    if (showCount === 1 && !trialStarted) {
      scheduleSecondWall();
    }
  }, [scheduleSecondWall, showCount, trialStarted]);

  const handleMinimize = useCallback(() => {
    setWallOpen(false);
    setClockMinimized(true);
  }, []);

  useEffect(() => {
    if (showOnMount) {
      setWallOpen(true);
      setShowCount(1);
    }
  }, [showOnMount]);

  useEffect(() => clearSecondWallTimer, [clearSecondWallTimer]);

  useEffect(() => {
    if (!wallOpen || !showTrialCountdown || trialStarted) return;
    clearSecondWallTimer();
    setTrialStarted(true);
    setSecondsLeft(TRIAL_PREVIEW_SECONDS);
    setTrialExpired(false);
  }, [clearSecondWallTimer, showTrialCountdown, trialStarted, wallOpen]);

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

      <div className={wallOpen ? "pointer-events-none select-none" : undefined}>{children}</div>
    </>
  );
}
