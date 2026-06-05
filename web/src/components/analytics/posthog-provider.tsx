"use client";

import type { BootstrapConfig } from "posthog-js";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef, type ReactNode } from "react";

import { useOptionalMarketingConsent } from "@/components/analytics/marketing-consent-provider";
import {
  getPostHogPublicKey,
  isPostHogConfigured,
  POSTHOG_BROWSER_API_HOST,
} from "@/lib/analytics/posthog-config";

type Props = {
  children: ReactNode;
  bootstrap?: BootstrapConfig;
};

export function SitePostHogProvider({ children, bootstrap }: Props) {
  const consent = useOptionalMarketingConsent();
  const initializedRef = useRef(false);

  const hasConsent = consent?.status === "granted";
  const consentResolved = consent?.isResolved ?? false;

  useEffect(() => {
    if (!isPostHogConfigured() || !consentResolved) return;

    if (!hasConsent) {
      if (initializedRef.current) {
        posthog.opt_out_capturing();
        posthog.reset();
        initializedRef.current = false;
      }
      return;
    }

    const apiKey = getPostHogPublicKey();
    if (!apiKey || initializedRef.current) return;

    posthog.init(apiKey, {
      api_host: POSTHOG_BROWSER_API_HOST,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      bootstrap,
      opt_out_capturing_by_default: false,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
      advanced_disable_feature_flags: false,
    });

    initializedRef.current = true;

    return () => {
      // Keep singleton alive for SPA navigations; consent effect handles opt-out.
    };
  }, [bootstrap, consentResolved, hasConsent]);

  if (!isPostHogConfigured() || !hasConsent) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
