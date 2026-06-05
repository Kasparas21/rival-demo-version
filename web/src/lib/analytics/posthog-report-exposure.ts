import type { PostHogInterface } from "posthog-js";

import { LANDING_HERO_HEADLINE_FLAG } from "@/lib/analytics/posthog-config";

/** Ensure experiments receive `$feature_flag_called` after PostHog has finished init. */
export function reportLandingHeroExperimentExposure(posthog: PostHogInterface): void {
  const report = () => {
    const response = posthog.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, { send_event: false });
    if (response === undefined || response === null) return;

    posthog.capture("$feature_flag_called", {
      $feature_flag: LANDING_HERO_HEADLINE_FLAG,
      $feature_flag_response: response,
      [`$feature/${LANDING_HERO_HEADLINE_FLAG}`]: response,
    });
  };

  report();

  if (posthog.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, { send_event: false }) === undefined) {
    posthog.onFeatureFlags(report);
    posthog.reloadFeatureFlags();
  }
}
