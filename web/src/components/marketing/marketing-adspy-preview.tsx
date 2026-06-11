"use client";

import { AdLibraryPreview } from "@/components/feature-previews/ad-library-preview";
import type { PlatformName } from "@/components/feature-previews/platform-utils";
import { LazyFeaturePreview } from "@/components/feature-previews/lazy-feature-preview";

export function MarketingAdspyPreview({ platform }: { platform: PlatformName }) {
  return (
    <LazyFeaturePreview minHeight={300} className="w-full">
      <AdLibraryPreview defaultPlatform={platform} />
    </LazyFeaturePreview>
  );
}
