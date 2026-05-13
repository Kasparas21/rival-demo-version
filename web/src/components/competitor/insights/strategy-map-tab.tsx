"use client";

import type { CompetitorPageBrand } from "@/lib/competitor-view-resolve";
import { StrategyOverviewApp } from "@/components/strategy-overview/strategy-overview-app";

type Props = {
  brand: CompetitorPageBrand;
  onOpenAdsLibrary: () => void;
};

export function StrategyMapTab({ brand, onOpenAdsLibrary }: Props) {
  return (
    <StrategyOverviewApp brand={brand} onOpenAdsLibrary={onOpenAdsLibrary} forceView="map" />
  );
}
