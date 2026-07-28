"use client";

import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { TikTokAdCard } from "@/components/ads-library/tiktok-ad-card";
import { PinterestAdCard } from "@/components/ads-library/pinterest-ad-card";
import { SnapchatAdCard } from "@/components/ads-library/snapchat-ad-card";
import { GoogleAdRowCard } from "@/components/ads-library/google-ad-row-card";
import { LinkedInFeedAdCard } from "@/components/ads-library/linkedin-feed-ad-card";
import type { SavedAdRow } from "@/components/ads-library/saved-ads-panel";
import { hydrateSavedAdForDisplay } from "@/lib/saved-ads/hydrate-saved-ad-card";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard as MetaAdCardModel,
  PinterestAdCard as PinterestAdCardModel,
  SnapchatAdCard as SnapchatAdCardModel,
  TikTokAdCard as TikTokAdCardModel,
} from "@/lib/ad-library/normalize";

export const SAVED_ADS_LIBRARY_GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3";

export type SavedAdLibraryBrand = {
  name: string;
  domain: string;
  logoUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type SavedAdLibraryCardProps = {
  ad: SavedAdRow;
  brand: SavedAdLibraryBrand;
  onOpen?: () => void;
  onUnsave: () => void;
  saveDisabled?: boolean;
  gridCreativeSizing?: "fixed" | "natural";
};

export function SavedAdLibraryCard({
  ad,
  brand,
  onOpen,
  onUnsave,
  saveDisabled,
  gridCreativeSizing = "fixed",
}: SavedAdLibraryCardProps) {
  const platform = ad.platform.trim().toLowerCase();
  const scrapedAdId = ad.source_scraped_ad_id ?? undefined;
  const unavailable = !scrapedAdId;
  const saveProps = {
    scrapedAdId,
    isSaved: true as const,
    onToggleSave: onUnsave,
    saveDisabled: saveDisabled ?? false,
  };
  const metaBrand = { domain: brand.domain, logoUrl: brand.logoUrl ?? "" };
  const onClick = unavailable ? undefined : onOpen;

  if (!isRecord(ad.raw_payload)) {
    return null;
  }

  const { raw_payload: displayPayload } = hydrateSavedAdForDisplay({
    platform: ad.platform,
    ad_creative_url: ad.ad_creative_url,
    archived_creative_url: ad.archived_creative_url,
    raw_payload: ad.raw_payload,
    source_last_seen_at: ad.source_last_seen_at,
  });

  switch (platform) {
    case "meta": {
      const hydrated = displayPayload as unknown as MetaAdCardModel;
      return (
        <MetaAdCard
          ad={hydrated}
          viewMode="grid"
          gridCreativeSizing={gridCreativeSizing}
          brand={metaBrand}
          onClick={onClick}
          {...saveProps}
        />
      );
    }
    case "tiktok":
      return (
        <TikTokAdCard
          ad={displayPayload as unknown as TikTokAdCardModel}
          onClick={onClick}
          {...saveProps}
        />
      );
    case "pinterest":
      return (
        <PinterestAdCard
          ad={displayPayload as unknown as PinterestAdCardModel}
          onClick={onClick}
          {...saveProps}
        />
      );
    case "snapchat":
      return (
        <SnapchatAdCard
          ad={displayPayload as unknown as SnapchatAdCardModel}
          onClick={onClick}
          {...saveProps}
        />
      );
    case "google":
    case "youtube":
      return (
        <GoogleAdRowCard
          ad={displayPayload as unknown as GoogleAdRow}
          brand={brand}
          onOpenDetail={onClick}
          {...saveProps}
        />
      );
    case "linkedin":
      return (
        <LinkedInFeedAdCard
          ad={displayPayload as unknown as LinkedInAdCard}
          brand={brand}
          onOpenDetail={onClick}
          {...saveProps}
        />
      );
    default:
      return (
        <MetaAdCard
          ad={displayPayload as unknown as MetaAdCardModel}
          viewMode="grid"
          gridCreativeSizing={gridCreativeSizing}
          brand={metaBrand}
          onClick={onClick}
          {...saveProps}
        />
      );
  }
}
