"use client";

import { ExternalLink } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";
import {
  cleanPinterestAdPreviewDescription,
  type PinterestAdCard as PinterestAdCardModel,
} from "@/lib/ad-library/normalize";

export function PinterestAdCard({
  ad,
  onClick,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: PinterestAdCardModel;
  onClick?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  const displayDescription = cleanPinterestAdPreviewDescription(ad.desc ?? "");
  const urlTrimmed = ad.url?.trim();
  const destinationDisplay =
    urlTrimmed && urlTrimmed !== "—"
      ? urlTrimmed
      : (() => {
          const raw = ad.adUrl?.trim() ?? "";
          if (!raw) return "Open destination";
          try {
            return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).host;
          } catch {
            return "Open destination";
          }
        })();

  return (
    <article
      onClick={onClick}
      className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] ${
        onClick ? "cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-[15px] font-semibold text-[#bd081c] [overflow-wrap:anywhere]">{ad.advertiser}</p>
          {ad.advertiserMismatch ? <UnverifiedSourceBadge /> : null}
        </div>
        <p className="mt-0.5 text-[12px] text-[#6b7280]">Pinterest Ad Transparency (EU / BR / TR)</p>

        <div className="mt-4 space-y-3">
          <p className="text-[14px] leading-relaxed text-[#111827] [overflow-wrap:anywhere] break-words text-pretty">
            {ad.headline}
          </p>
          {displayDescription ? (
            <ExpandableAdText
              text={displayDescription}
              className="text-[14px] leading-relaxed text-[#111827] [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-pretty"
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-y border-[#e5e7eb] bg-[#f9fafb] p-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white">
          <AdCreativeVideoOrImage
            img={ad.img ?? ""}
            videoUrl={ad.videoUrl}
            openHref={ad.adUrl}
            onMediaClick={onClick ? () => onClick() : undefined}
            className="min-h-0 w-full flex-1"
            minHeightClass="min-h-[200px]"
            fillAvailableHeight
          />
        </div>
        {ad.adUrl?.trim() ? (
          <a
            href={ad.adUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-center text-[13px] font-semibold text-[#bd081c] shadow-sm ring-offset-2 transition-[border-color,box-shadow,background-color] hover:border-[#bd081c]/45 hover:bg-[#fff5f7] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#bd081c]"
          >
            <ExternalLink className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="min-w-0 [overflow-wrap:anywhere] break-all">{destinationDisplay}</span>
          </a>
        ) : null}
      </div>

      <div className="shrink-0 bg-white px-4 pb-4 pt-1" onClick={(e) => e.stopPropagation()}>
        <AdSaveRow
          scrapedAdId={scrapedAdId}
          isSaved={Boolean(isSaved)}
          onToggleSave={onToggleSave}
          saveDisabled={saveDisabled}
        />
      </div>
    </article>
  );
}
