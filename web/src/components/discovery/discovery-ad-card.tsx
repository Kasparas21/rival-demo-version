"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { TikTokAdCard } from "@/components/ads-library/tiktok-ad-card";
import { PinterestAdCard } from "@/components/ads-library/pinterest-ad-card";
import { SnapchatAdCard } from "@/components/ads-library/snapchat-ad-card";
import { GoogleAdRowCard } from "@/components/ads-library/google-ad-row-card";
import { LinkedInFeedAdCard } from "@/components/ads-library/linkedin-feed-ad-card";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard as MetaAdCardModel,
  PinterestAdCard as PinterestAdCardModel,
  SnapchatAdCard as SnapchatAdCardModel,
  TikTokAdCard as TikTokAdCardModel,
} from "@/lib/ad-library/normalize";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Props = {
  ad: DiscoveryAdDto;
  onOpen?: () => void;
  className?: string;
};

export function DiscoveryAdCard({ ad, onOpen, className }: Props) {
  const platform = ad.platform.trim().toLowerCase();
  const domain = ad.competitor_domain ?? "";
  const brand = { name: ad.competitor_name, domain, logoUrl: ad.competitor_logo_url ?? "" };
  const onClick = onOpen;
  const saveProps = {
    scrapedAdId: ad.id,
    isSaved: false as const,
    saveDisabled: false,
  };

  const header = (
    <div className="flex items-center gap-2 border-b border-slate-100/90 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      <CompetitorLogo
        sources={{ primary: ad.competitor_logo_url, domain }}
        name={ad.competitor_name}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-900">{ad.competitor_name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3 w-3" />
          <span className="capitalize">{platform}</span>
          {ad.is_ultimate_winner ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-bold text-amber-800">
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              Ultimate
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!isRecord(ad.raw_payload)) {
    return null;
  }

  const shell = (body: ReactNode) => (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {header}
      <div className="p-2">{body}</div>
    </article>
  );

  switch (platform) {
    case "meta": {
      const hydrated = hydrateMetaAdCardForLibrary(ad.raw_payload as unknown as MetaAdCardModel);
      return shell(
        <MetaAdCard ad={hydrated} viewMode="grid" brand={brand} onClick={onClick} {...saveProps} />,
      );
    }
    case "tiktok":
      return shell(
        <TikTokAdCard ad={ad.raw_payload as unknown as TikTokAdCardModel} onClick={onClick} {...saveProps} />,
      );
    case "pinterest":
      return shell(
        <PinterestAdCard ad={ad.raw_payload as unknown as PinterestAdCardModel} onClick={onClick} {...saveProps} />,
      );
    case "snapchat":
      return shell(
        <SnapchatAdCard ad={ad.raw_payload as unknown as SnapchatAdCardModel} onClick={onClick} {...saveProps} />,
      );
    case "google":
    case "youtube":
      return shell(
        <GoogleAdRowCard
          ad={ad.raw_payload as unknown as GoogleAdRow}
          brand={brand}
          onOpenDetail={onClick}
          {...saveProps}
        />,
      );
    case "linkedin":
      return shell(
        <LinkedInFeedAdCard
          ad={ad.raw_payload as unknown as LinkedInAdCard}
          brand={brand}
          onOpenDetail={onClick}
          {...saveProps}
        />,
      );
    default:
      return null;
  }
}
