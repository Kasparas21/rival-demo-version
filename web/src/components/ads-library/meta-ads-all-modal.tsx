"use client";

import { MetaLogo } from "@/components/platform-logos";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { AdsLibraryAllModal } from "@/components/ads-library/ads-library-all-modal";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";

export interface MetaAdsAllModalProps {
  open: boolean;
  onClose: () => void;
  domain: string;
  viewMode: "grid" | "list";
  brand: { domain: string; logoUrl: string };
  onAdActivate?: (ad: MetaAdCardModel) => void;
  getMetaAdExtras?: (ad: MetaAdCardModel) => {
    scrapedAdId?: string;
    isSaved?: boolean;
    onToggleSave?: () => void;
    saveDisabled?: boolean;
    runStatus?: { isRunning: boolean };
    metaScrapeAtMs?: number;
    isCreativeTestWinner?: boolean;
  };
}

export function MetaAdsAllModal({
  open,
  onClose,
  domain,
  viewMode,
  brand,
  onAdActivate,
  getMetaAdExtras,
}: MetaAdsAllModalProps) {
  return (
    <AdsLibraryAllModal<MetaAdCardModel>
      open={open}
      onClose={onClose}
      title="Meta / Facebook ads"
      logo={<MetaLogo className="h-5 w-5" />}
      domain={domain}
      platform="meta"
      viewMode={viewMode}
      getKey={(ad) => ad.id}
      renderItem={(ad, ctx) => {
        const extras = getMetaAdExtras?.(ad);
        return (
          <MetaAdCard
            ad={ad}
            viewMode={viewMode}
            brand={brand}
            gridCreativeSizing="natural"
            onClick={() => onAdActivate?.(ad)}
            scrapedAdId={extras?.scrapedAdId}
            isSaved={extras?.isSaved}
            onToggleSave={extras?.onToggleSave}
            saveDisabled={extras?.saveDisabled}
            runStatus={extras?.runStatus}
            metaScrapeAtMs={extras?.metaScrapeAtMs ?? ctx.metaScrapeAtMs ?? undefined}
            isCreativeTestWinner={extras?.isCreativeTestWinner}
          />
        );
      }}
    />
  );
}
