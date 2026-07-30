"use client";

import type { CompetitorSubTabId } from "@/components/dashboard/competitor/competitor-tabs-data";
import {
  LandingPagesTab,
  type SharedLandingPagesListCache,
} from "@/components/competitor/landing-pages-tab";

import { LatestChangesPanel } from "./LatestChangesPanel";
import { TrackedPagesPanel } from "./TrackedPagesPanel";

type WebsiteTabProps = {
  competitorId?: string;
  competitorLabel: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  activeSubTab: CompetitorSubTabId | null;
  onOpenAd: (adId: string) => void;
  onFreshnessRescrape?: () => void;
  sharedLandingPagesListCache?: SharedLandingPagesListCache | null;
  fetchEnabled?: boolean;
};

export function WebsiteTab({
  competitorId,
  competitorLabel,
  cacheDomainNorm,
  lastScrapedAt,
  activeSubTab,
  onOpenAd,
  onFreshnessRescrape,
  sharedLandingPagesListCache,
  fetchEnabled = true,
}: WebsiteTabProps) {
  const subTab: "tracked" | "from-ads" | "latest-changes" =
    activeSubTab === "from-ads"
      ? "from-ads"
      : activeSubTab === "latest-changes"
        ? "latest-changes"
        : "tracked";

  if (!competitorId) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-500">
        Save this competitor to track their website.
      </div>
    );
  }

  if (subTab === "from-ads") {
    return (
      <LandingPagesTab
        competitorId={competitorId}
        competitorLabel={competitorLabel}
        cacheDomainNorm={cacheDomainNorm}
        lastScrapedAt={lastScrapedAt}
        onOpenAd={onOpenAd}
        onFreshnessRescrape={onFreshnessRescrape}
        landingPagesListCache={sharedLandingPagesListCache}
        fetchEnabled={fetchEnabled && subTab === "from-ads"}
      />
    );
  }

  if (subTab === "latest-changes") {
    return (
      <LatestChangesPanel
        competitorId={competitorId}
        competitorLabel={competitorLabel}
        cacheDomainNorm={cacheDomainNorm}
        lastScrapedAt={lastScrapedAt}
        fetchEnabled={fetchEnabled && subTab === "latest-changes"}
      />
    );
  }

  return (
    <TrackedPagesPanel
      competitorId={competitorId}
      competitorLabel={competitorLabel}
      cacheDomainNorm={cacheDomainNorm}
      lastScrapedAt={lastScrapedAt}
      fetchEnabled={fetchEnabled && subTab === "tracked"}
      landingPagesListCache={sharedLandingPagesListCache}
    />
  );
}
