"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_ENABLED_AD_PLATFORMS,
  isScrapeEnabledForPlatform,
  normalizeEnabledAdPlatforms,
  type ToggleableAdPlatform,
} from "@/lib/ad-library/disabled-scrape-platforms";

let cached: ToggleableAdPlatform[] | null = null;
let inFlight: Promise<ToggleableAdPlatform[]> | null = null;

function loadEnabledAdPlatforms(): Promise<ToggleableAdPlatform[]> {
  if (cached) return Promise.resolve(cached);
  inFlight ??= fetch("/api/account/ad-platforms", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { enabled?: unknown } | null) => {
      cached = normalizeEnabledAdPlatforms(json?.enabled) ?? [...DEFAULT_ENABLED_AD_PLATFORMS];
      return cached;
    })
    .catch(() => [...DEFAULT_ENABLED_AD_PLATFORMS])
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Ad platforms switched on for this account (admin-controlled). Starts with the defaults (Meta + Google)
 * so the first render matches the server, then updates once the account's list loads.
 */
export function useEnabledAdPlatforms(): {
  enabled: readonly ToggleableAdPlatform[];
  isAvailable: (platform: string) => boolean;
} {
  const [enabled, setEnabled] = useState<readonly ToggleableAdPlatform[]>(DEFAULT_ENABLED_AD_PLATFORMS);

  useEffect(() => {
    let cancelled = false;
    void loadEnabledAdPlatforms().then((list) => {
      if (!cancelled) setEnabled(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, isAvailable: (platform) => isScrapeEnabledForPlatform(platform, enabled) };
}
