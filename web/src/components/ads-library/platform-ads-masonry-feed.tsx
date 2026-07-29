"use client";

import { useMemo, type ReactNode } from "react";

import { distributeMasonryColumns } from "@/components/discovery/use-masonry-column-count";
import { usePlatformAdsModalColumnCount } from "@/components/ads-library/use-platform-ads-modal-column-count";
import { cn } from "@/lib/utils";

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
};

/** Masonry grid for the expanded Ad Library modal — max 2 columns inside the dialog. */
export function PlatformAdsMasonryFeed<T>({ items, getKey, renderItem, className }: Props<T>) {
  const columnCount = usePlatformAdsModalColumnCount();
  const columns = useMemo(
    () => distributeMasonryColumns(items, columnCount),
    [items, columnCount],
  );

  return (
    <div className={cn("flex items-start gap-4", className)}>
      {columns.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4">
          {columnItems.map((item) => (
            <div key={getKey(item)} className="min-w-0">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
