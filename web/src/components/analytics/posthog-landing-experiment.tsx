"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";

import { LANDING_HERO_HEADLINE_FLAG } from "@/lib/analytics/posthog-config";

/**
 * PostHog experiments count exposures from `$feature_flag_called`.
 * Bootstrapped flags skip that unless we call `getFeatureFlag` after init.
 */
export function PostHogLandingExperimentExposure() {
  const posthog = usePostHog();
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!posthog || reportedRef.current) return;

    posthog.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG);
    reportedRef.current = true;
  }, [posthog]);

  return null;
}
