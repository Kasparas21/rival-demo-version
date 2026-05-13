"use client";

import type { CompetitorPageBrand } from "@/lib/competitor-view-resolve";
import { StrategyOverviewApp } from "@/components/strategy-overview/strategy-overview-app";

type Props = {
  brand: CompetitorPageBrand;
  onOpenAdsLibrary: () => void;
  competitorId?: string;
};

export function StrategyInsightTab({ brand, onOpenAdsLibrary, competitorId }: Props) {
  return (
    <StrategyOverviewApp
      brand={brand}
      onOpenAdsLibrary={onOpenAdsLibrary}
      forceView="insight"
      competitorId={competitorId}
    />
  );
}
