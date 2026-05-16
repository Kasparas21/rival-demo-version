"use client";

import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  MicrosoftLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/platform-logos";

export const COMPARISON_PLATFORM_ORDER: StrategyPlatform[] = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
];

/** Platforms rendered in comparison UI (includes scrape-only ids not in strategy map). */
export type ComparisonPlatformIconId = StrategyPlatform | "youtube" | "microsoft";

export function ComparisonPlatformIcon({
  platform,
  className = "h-5 w-5",
}: {
  platform: ComparisonPlatformIconId;
  className?: string;
}) {
  switch (platform) {
    case "meta":
      return <MetaLogo className={className} />;
    case "google":
      return <GoogleLogo className={className} />;
    case "tiktok":
      return <TikTokLogo className={className} />;
    case "linkedin":
      return <LinkedInLogo className={className} />;
    case "snapchat":
      return <SnapchatLogo className={className} />;
    case "pinterest":
      return <PinterestLogo className={className} />;
    case "youtube":
      return <YouTubeLogo className={className} />;
    case "microsoft":
      return <MicrosoftLogo className={className} />;
    default:
      return <span className={`inline-block rounded bg-slate-200 ${className}`} aria-hidden />;
  }
}
