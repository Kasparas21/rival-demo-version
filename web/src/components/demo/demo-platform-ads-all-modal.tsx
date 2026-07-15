"use client";

import type { ReactNode } from "react";

import { AdsLibraryAllModal } from "@/components/ads-library/ads-library-all-modal";
import { DemoPlatformAdCard } from "@/components/demo/demo-platform-ad-cards";
import { DEMO_PLATFORM_SECTION_HEADERS } from "@/components/demo/demo-platform-section";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { DemoAd, DemoPlatform } from "@/lib/demo/dashboard-demo-data";
import { resolveDemoAdSource } from "@/lib/demo/demo-platform-ads-modal-feed";

type Props = {
  open: boolean;
  onClose: () => void;
  platform: DemoPlatform;
  baseAds: DemoAd[];
  displayTotal: number;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onOpenAd: (ad: DemoAd) => void;
};

function modalLogo(platform: DemoPlatform): ReactNode {
  const { headerVariant } = DEMO_PLATFORM_SECTION_HEADERS[platform];
  if (headerVariant === "meta") return <MetaLogo className="h-5 w-5" />;
  if (headerVariant === "google") {
    return (
      <>
        <GoogleLogo className="h-5 w-5" />
        <YouTubeLogo className="h-5 w-5" />
      </>
    );
  }
  const icons: Record<Exclude<DemoPlatform, "meta" | "google">, ReactNode> = {
    tiktok: <TikTokLogo className="h-5 w-5" />,
    linkedin: <LinkedInLogo className="h-5 w-5" />,
    pinterest: <PinterestLogo className="h-5 w-5" />,
    snapchat: <SnapchatLogo className="h-5 w-5 text-[#0fad00]" />,
  };
  return icons[platform as Exclude<DemoPlatform, "meta" | "google">];
}

function modalTitle(platform: DemoPlatform): string {
  const title = DEMO_PLATFORM_SECTION_HEADERS[platform].title;
  return title.includes("ads") ? title : `${title} ads`;
}

export function DemoPlatformAdsAllModal({
  open,
  onClose,
  platform,
  baseAds,
  displayTotal,
  savedIds,
  onToggleSave,
  onOpenAd,
}: Props) {
  return (
    <AdsLibraryAllModal<DemoAd>
      open={open}
      onClose={onClose}
      title={modalTitle(platform)}
      logo={modalLogo(platform)}
      domain=""
      platform={platform}
      getKey={(ad) => ad.id}
      viewMode="grid"
      demoFeed={{ baseAds, displayTotal }}
      renderItem={(ad) => {
        const sourceId = resolveDemoAdSource(ad).id;
        return (
          <DemoPlatformAdCard
            platform={platform}
            ad={ad}
            saved={savedIds.has(sourceId)}
            onToggleSave={() => onToggleSave(sourceId)}
            onOpen={() => onOpenAd(ad)}
          />
        );
      }}
    />
  );
}
