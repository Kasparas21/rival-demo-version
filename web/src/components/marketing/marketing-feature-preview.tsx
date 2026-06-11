"use client";

import { LazyFeaturePreview } from "@/components/feature-previews/lazy-feature-preview";
import { FEATURE_PREVIEW_MAP } from "@/components/marketing/features-page-preview-map";

export function MarketingFeaturePreview({ featureId }: { featureId: string }) {
  const Preview = FEATURE_PREVIEW_MAP[featureId];
  if (!Preview) return null;

  return (
    <LazyFeaturePreview minHeight={300} className="w-full">
      <Preview />
    </LazyFeaturePreview>
  );
}
