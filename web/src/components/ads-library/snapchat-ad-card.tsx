"use client";

import { ExternalLink, Ghost } from "lucide-react";
import type { SnapchatAdCard as SnapchatCardModel } from "@/lib/ad-library/normalize";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";

export function SnapchatAdCard({ ad }: { ad: SnapchatCardModel }) {
  const hasVideo = Boolean(ad.videoUrl?.trim());
  const tryImg = Boolean(ad.img?.trim());

  return (
    <article className="min-w-0 flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)]">
      <div className="shrink-0 border-b border-[#fde047]/25 bg-[#fffbeb]/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Ghost className="h-5 w-5 shrink-0 text-[#eab308]" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-[#854d0e]">
              Snapchat Ads (EU transparency)
              {ad.euCountry ? <span className="ml-1.5 opacity-85"> · {ad.euCountry}</span> : null}
            </p>
            <p className="truncate text-[14px] font-semibold leading-tight text-[#451a03]">{ad.advertiser}</p>
            {ad.impressionsLabel ? (
              <p className="mt-1 text-[11px] font-medium tabular-nums text-[#a16207]">
                Est. impressions: {ad.impressionsLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="relative min-h-[200px] flex-1 border-y border-[#e5e7eb] bg-[#fafafa]">
        {hasVideo || tryImg ? (
          <AdCreativeVideoOrImage
            img={tryImg ? (ad.img ?? "") : ""}
            videoUrl={hasVideo ? (ad.videoUrl ?? "") : undefined}
            openHref={ad.adUrl}
            className="h-full min-h-[200px] w-full"
            minHeightClass="min-h-[200px]"
          />
        ) : (
          <a
            href={ad.adUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#fef9c3] via-white to-[#eff6ff] px-4 py-10 text-center"
          >
            <Ghost className="h-12 w-12 text-[#ca8a04]/80" aria-hidden />
            <p className="text-[13px] font-semibold leading-snug text-[#451a03] line-clamp-4">{ad.headline}</p>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-[#92400e]">
              View in library <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </span>
          </a>
        )}
      </div>
      <div className="shrink-0 space-y-2 p-4">
        <ExpandableAdText text={ad.desc} className="text-[13px] leading-relaxed text-[#4b5563]" />
        <a
          href={ad.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7]"
        >
          Open ad snapshot
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <p className="truncate text-[12px] text-[#6b7280]" title={ad.url}>
          {ad.url}
        </p>
      </div>
    </article>
  );
}
