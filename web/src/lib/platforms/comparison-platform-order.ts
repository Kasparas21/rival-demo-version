import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

/** Server-safe platform order for comparison / timeline (no client component imports). */
export const COMPARISON_PLATFORM_ORDER: StrategyPlatform[] = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
];

export type ComparisonPlatformIconId = StrategyPlatform | "youtube" | "microsoft";

export const ALL_COMPARISON_PLATFORMS: ComparisonPlatformIconId[] = [
  ...COMPARISON_PLATFORM_ORDER,
  "youtube",
  "microsoft",
];
