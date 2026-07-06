"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";
import { hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { cn } from "@/lib/utils";

import {
  ORGANIC_FEED_PLATFORM_ORDER,
  ORGANIC_PLATFORM_FILTER_CONFIG,
} from "./organic-feed-layout";
import { OrganicPlatformSection } from "./OrganicPlatformSection";
import type { OrganicPostCardData } from "./OrganicPostCard";

const PLATFORM_CHIP_LOGOS: Record<OrganicPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

type OrganicFeedPanelProps = {
  competitorId: string;
  socials: OrganicSocials;
  onGoToSettings: () => void;
  /** Bump to refetch posts (e.g. after a manual platform rescrape). */
  refreshTrigger?: number;
  onPostClick?: (post: OrganicPostCardData) => void;
  onChannelDataUpdated?: () => void;
};

export function OrganicFeedPanel({
  competitorId,
  socials,
  onGoToSettings,
  refreshTrigger = 0,
  onPostClick,
  onChannelDataUpdated,
}: OrganicFeedPanelProps) {
  const [globalLastScrapedAt, setGlobalLastScrapedAt] = useState<string | null>(null);

  const configuredPlatforms = useMemo(
    () => ORGANIC_FEED_PLATFORM_ORDER.filter((p) => Boolean(socials[p]?.trim())),
    [socials],
  );

  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<OrganicPlatform>>(
    () => new Set(configuredPlatforms),
  );

  useEffect(() => {
    setVisiblePlatforms(new Set(configuredPlatforms));
  }, [configuredPlatforms]);

  const loadGlobalMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitor/${competitorId}/organic/socials`);
      if (res.ok) {
        const data = (await res.json()) as { organic_last_scraped_at?: string | null };
        setGlobalLastScrapedAt(data.organic_last_scraped_at ?? null);
      }
    } catch {
      // ignore
    }
  }, [competitorId]);

  useEffect(() => {
    void loadGlobalMeta();
  }, [loadGlobalMeta, refreshTrigger]);

  const togglePlatform = (platform: OrganicPlatform) => {
    setVisiblePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size <= 1) return prev;
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  if (!hasAnyOrganicSocial(socials)) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 text-center ${COMPETITOR_PAGE_X}`}>
        <p className="max-w-md text-[15px] font-medium text-slate-800">
          No social accounts connected yet.
        </p>
        <p className="mt-2 max-w-md text-[14px] text-slate-600">
          Add your competitor&apos;s handles in Settings to start tracking organic posts.
        </p>
        <button
          type="button"
          onClick={onGoToSettings}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          Go to Settings →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {ORGANIC_PLATFORM_FILTER_CONFIG.filter(({ id }) => configuredPlatforms.includes(id)).map(
          ({ id, label }) => {
            const Logo = PLATFORM_CHIP_LOGOS[id];
            const visible = visiblePlatforms.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePlatform(id)}
                title={`${visible ? "Hide" : "Show"} ${label}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors",
                  visible
                    ? "border-[#93c5fd] bg-[#DDF1FD] text-[#343434]"
                    : "border-white/70 bg-white/80 text-[#64748b] hover:border-[#DDF1FD]/80",
                )}
              >
                <Logo className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          },
        )}
      </div>

      <div className="flex flex-col gap-12">
        {configuredPlatforms.map((platform) =>
          visiblePlatforms.has(platform) ? (
            <OrganicPlatformSection
              key={platform}
              competitorId={competitorId}
              platform={platform}
              socials={socials}
              refreshTrigger={refreshTrigger}
              globalLastScrapedAt={globalLastScrapedAt}
              onGoToSettings={onGoToSettings}
              onPostClick={onPostClick}
              onChannelDataUpdated={onChannelDataUpdated}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
