"use client";

import type { CompetitorPageBrand } from "@/lib/competitor-view-resolve";
import { StrategyOverviewApp } from "@/components/strategy-overview/strategy-overview-app";

type Props = {
  brand: CompetitorPageBrand;
  onOpenAdsLibrary: () => void;
  competitorId?: string;
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
};

export function StrategyMapTab({
  brand,
  onOpenAdsLibrary,
  competitorId,
  lastScrapedAt,
  onFreshnessRescrape,
}: Props) {
  return (
    <StrategyOverviewApp
      brand={brand}
      onOpenAdsLibrary={onOpenAdsLibrary}
      competitorId={competitorId}
      lastScrapedAt={lastScrapedAt}
      onFreshnessRescrape={onFreshnessRescrape}
    />
  );
}
