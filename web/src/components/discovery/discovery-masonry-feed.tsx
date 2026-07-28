"use client";

import { useMemo } from "react";

import { DiscoveryAdCard } from "@/components/discovery/discovery-ad-card";
import { DiscoveryAdCardBoundary } from "@/components/discovery/discovery-ad-card-boundary";
import {
  distributeMasonryColumns,
  useMasonryColumnCount,
} from "@/components/discovery/use-masonry-column-count";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type Props = {
  ads: DiscoveryAdDto[];
  isSaved: (scrapedAdId: string) => boolean;
  isPending: (scrapedAdId: string) => boolean;
  onOpenAd: (scrapedAdId: string) => void;
  onToggleSave: (ad: DiscoveryAdDto) => void;
  className?: string;
};

/**
 * Stable masonry: each ad stays in a fixed column (by index) so load-more only
 * appends at column bottoms instead of reflowing CSS columns.
 */
export function DiscoveryMasonryFeed({
  ads,
  isSaved,
  isPending,
  onOpenAd,
  onToggleSave,
  className,
}: Props) {
  const columnCount = useMasonryColumnCount();
  const columns = useMemo(
    () => distributeMasonryColumns(ads, columnCount),
    [ads, columnCount],
  );

  return (
    <div className={cn("mt-5 flex items-start gap-4", className)}>
      {columns.map((columnAds, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4">
          {columnAds.map((ad) => (
            <DiscoveryAdCardBoundary key={ad.id}>
              <DiscoveryAdCard
                ad={ad}
                onOpen={() => onOpenAd(ad.id)}
                isSaved={isSaved(ad.id)}
                isSavePending={isPending(ad.id)}
                onToggleSave={() => onToggleSave(ad)}
              />
            </DiscoveryAdCardBoundary>
          ))}
        </div>
      ))}
    </div>
  );
}
