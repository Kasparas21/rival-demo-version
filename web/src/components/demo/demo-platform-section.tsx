"use client";

import type { ReactNode } from "react";
import { Clock } from "lucide-react";

import { platformSectionPanelClass } from "@/components/dashboard/competitor/competitor-platform-styles";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { META_ADS_INLINE_PREVIEW } from "@/lib/ad-library/constants";
import type { DemoPlatform } from "@/lib/demo/dashboard-demo-data";

export const platformAdsBodyShellClass =
  "border-t border-[#DDF1FD]/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.88)_0%,rgba(255,255,255,0.35)_100%)] px-4 pb-5 pt-5 sm:px-5";

export const DEMO_ADS_GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3";

const PLATFORM_LOGOS: Record<
  DemoPlatform,
  React.ComponentType<{ className?: string }>
> = {
  meta: MetaLogo,
  google: GoogleLogo,
  tiktok: TikTokLogo,
  linkedin: LinkedInLogo,
  pinterest: PinterestLogo,
  snapchat: SnapchatLogo,
};

export const DEMO_PLATFORM_SECTION_HEADERS: Record<
  DemoPlatform,
  { title: string; headerVariant: "meta" | "google" | "default" }
> = {
  meta: { title: "Meta / Facebook", headerVariant: "meta" },
  google: { title: "Google / YouTube", headerVariant: "google" },
  tiktok: { title: "TikTok", headerVariant: "default" },
  linkedin: { title: "LinkedIn", headerVariant: "default" },
  pinterest: { title: "Pinterest ads", headerVariant: "default" },
  snapchat: { title: "Snapchat (EU Ads Gallery)", headerVariant: "default" },
};

function PlatformHeaderLogo({ platform }: { platform: DemoPlatform }) {
  const config = DEMO_PLATFORM_SECTION_HEADERS[platform];

  if (config.headerVariant === "meta") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
        <MetaLogo className="size-5" />
      </div>
    );
  }

  if (config.headerVariant === "google") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
          <GoogleLogo className="h-5 w-5" />
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
          <YouTubeLogo className="h-5 w-5" />
        </div>
      </div>
    );
  }

  const Icon = PLATFORM_LOGOS[platform];
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
      <Icon className={`h-5 w-5 ${platform === "snapchat" ? "text-[#0fad00]" : ""}`} />
    </div>
  );
}

type DemoPlatformSectionProps = {
  platform: DemoPlatform;
  lastScraped: string;
  totalCount: number;
  onViewAll?: () => void;
  children: ReactNode;
};

export function DemoPlatformSection({
  platform,
  lastScraped,
  totalCount,
  onViewAll,
  children,
}: DemoPlatformSectionProps) {
  const { title, headerVariant } = DEMO_PLATFORM_SECTION_HEADERS[platform];
  const showViewAll = totalCount > META_ADS_INLINE_PREVIEW;
  const headerLayout =
    headerVariant === "google"
      ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6";

  return (
    <section>
      <div className={platformSectionPanelClass}>
        <div
          className={`${headerLayout} border-b border-white/55 px-4 pb-4 pt-4 sm:px-5 sm:pb-4 sm:pt-5`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PlatformHeaderLogo platform={platform} />
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#343434]">{title}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                <Clock className="size-3.5 shrink-0 opacity-80" aria-hidden />
                <span>Last scraped {lastScraped}</span>
              </p>
            </div>
          </div>
          {showViewAll ? (
            <button
              type="button"
              data-demo-interactive
              onClick={onViewAll}
              className={`inline-flex shrink-0 items-center justify-center self-start rounded-xl border border-white/60 bg-white/85 text-[13px] font-semibold text-[#343434] shadow-sm transition-colors hover:border-[#DDF1FD] hover:bg-white sm:self-auto ${
                headerVariant === "meta" ? "h-10 px-4" : "h-9 px-3.5"
              }`}
            >
              View all {totalCount} ads
            </button>
          ) : null}
        </div>
        <div className={platformAdsBodyShellClass}>
          <div className={DEMO_ADS_GRID_CLASS}>{children}</div>
        </div>
      </div>
    </section>
  );
}
