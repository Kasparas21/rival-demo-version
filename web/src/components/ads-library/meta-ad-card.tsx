"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, Play } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import {
  computeLibraryAdRunDays,
  isLibraryAdKilled,
  type LibraryRunStatus,
} from "@/lib/ad-library/library-run-status";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";
import { safeHttpsUrl } from "@/lib/ad-library/normalize";
import { resolveMetaLibraryCardPreview } from "@/lib/ad-library/resolve-meta-library-card-preview";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";

function MetaCreativeMedia({ ad, compact }: { ad: MetaAdCardModel; compact: boolean }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const stream = ad.videoUrl?.trim() ?? "";
  useEffect(() => {
    setVideoFailed(false);
    setPlaying(false);
    setImageFailed(false);
  }, [ad.id, stream, ad.img]);
  const still = resolveMetaLibraryCardPreview(ad);
  const fallbackStill = ad.img?.trim() ?? "";
  const displayStill = !imageFailed ? still || fallbackStill : fallbackStill;
  /** Poster-first preview so video tiles match image size; mount `<video>` only after play. */
  const wantsVideo = Boolean(stream && ad.isVideo && displayStill);
  const maxH = compact ? "max-h-[300px]" : "max-h-[420px]";
  const previewFrameH = compact ? "h-[200px]" : "h-[280px]";
  /** Image ads: natural aspect, width-first. Video posters: fixed frame fills like hero creative. */
  const imageMediaClass = `block w-full ${maxH} object-contain rounded-xl`;
  const videoPreviewMediaClass = "block h-full w-full object-cover rounded-xl";

  if (wantsVideo && playing && !videoFailed) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${previewFrameH}`}>
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          poster={displayStill || undefined}
          className={`${videoPreviewMediaClass} bg-black object-contain`}
          src={stream}
          onClick={(e) => e.stopPropagation()}
          onError={() => setVideoFailed(true)}
          // DOM: HTMLVideoElement.referrerPolicy — @types/react VideoHTMLAttributes omit it in this project
          {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
        />
      </div>
    );
  }

  if (wantsVideo && displayStill && !videoFailed) {
    return (
      <button
        type="button"
        className={`relative block w-full overflow-hidden rounded-xl border-0 bg-[#f3f4f6] p-0 ${previewFrameH}`}
        onClick={(e) => {
          e.stopPropagation();
          setPlaying(true);
        }}
        aria-label="Play video ad"
      >
        <img
          src={displayStill}
          alt=""
          referrerPolicy="no-referrer"
          className={videoPreviewMediaClass}
          onClick={(e) => e.stopPropagation()}
          onError={() => setImageFailed(true)}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
            <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
          </span>
        </span>
      </button>
    );
  }

  if (wantsVideo && !displayStill && !videoFailed) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${previewFrameH}`}>
        <video
          controls
          playsInline
          preload="metadata"
          className={`${videoPreviewMediaClass} bg-black object-contain`}
          src={stream}
          onClick={(e) => e.stopPropagation()}
          onError={() => setVideoFailed(true)}
          {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
        />
      </div>
    );
  }

  if (wantsVideo && videoFailed && displayStill) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${previewFrameH}`}>
        <img
          src={displayStill}
          alt=""
          referrerPolicy="no-referrer"
          className={videoPreviewMediaClass}
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={ad.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${compact ? "bottom-2 left-2" : "bottom-3 left-3"} rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1`}
        >
          Play on Meta
        </a>
      </div>
    );
  }

  if (wantsVideo && videoFailed && !displayStill) {
    return (
      <div
        className={`flex w-full ${compact ? "min-h-[200px]" : "min-h-[280px]"} flex-col items-center justify-center gap-2 px-4 text-center`}
      >
        <p className="text-[12px] text-[#6b7280]">Video didn&apos;t load in the browser. Open it on Meta.</p>
        <a
          href={ad.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-[#1877f2] text-white text-[12px] font-semibold px-4 py-2 hover:bg-[#166fe5]"
        >
          Play on Meta
        </a>
      </div>
    );
  }

  if (displayStill) {
    return (
      <img
        src={displayStill}
        alt=""
        referrerPolicy="no-referrer"
        className={imageMediaClass}
        onClick={(e) => e.stopPropagation()}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex w-full ${compact ? "min-h-[200px]" : "min-h-[280px]"} items-center justify-center text-[12px] text-[#9ca3af] px-2 text-center`}
    >
      {compact ? "No preview" : "No creative preview"}
    </div>
  );
}

function metaSiteLabel(ad: MetaAdCardModel, brandDomain: string): { destHttps: string | null; siteLabel: string } {
  const probe = (ad.destinationUrl || ad.subtext || "").trim();
  let destHttps = safeHttpsUrl(probe);
  if (!destHttps && probe && !/\s/.test(probe) && !/^https?:\/\//i.test(probe)) {
    destHttps = safeHttpsUrl(`https://${probe.replace(/^\/\/+/, "")}`);
  }
  const siteLabel = destHttps
    ? (() => {
        try {
          return new URL(destHttps).hostname.replace(/^www\./, "");
        } catch {
          return brandDomain;
        }
      })()
    : ad.subtext && !/^https?:\/\//i.test(ad.subtext.trim())
      ? ad.subtext.trim().split(/[\s/]/)[0]?.slice(0, 48) || `www.${brandDomain}`
      : `www.${brandDomain}`;
  return { destHttps, siteLabel };
}

export function MetaAdCard({
  ad,
  viewMode,
  brand,
  onClick,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
  runStatus,
  metaScrapeAtMs,
}: {
  ad: MetaAdCardModel;
  viewMode: "grid" | "list";
  brand: { domain: string; logoUrl: string };
  onClick?: () => void;
  /** DB row id when this card exists as scraped_ads (may be absent until resolve). */
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  runStatus?: LibraryRunStatus;
  /** UTC ms of last Meta scrape — used for end_date vs scrape-day active rule. */
  metaScrapeAtMs?: number;
}) {
  const killed = isLibraryAdKilled("meta", ad, runStatus, metaScrapeAtMs);
  const runDays = computeLibraryAdRunDays("meta", ad, runStatus, metaScrapeAtMs);
  const { destHttps, siteLabel } = metaSiteLabel(ad, brand.domain);
  const ctaHref = destHttps || ad.adLibraryUrl;
  const metaTitle = ad.headline?.trim() || "";
  const metaPrimary = ad.desc?.trim() || "";
  const metaLinkDesc = ad.linkDescription?.trim() || "";

  return (
    <article
      onClick={onClick}
      className={`min-w-0 ${viewMode === "list" ? "h-full" : ""} bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden transition-all duration-200 flex flex-col ${
        onClick ? "cursor-pointer hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-2 hover:ring-slate-200" : "hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className={`flex min-h-0 ${viewMode === "list" ? "flex-1 flex-row" : "flex-col"}`}>
        {viewMode === "list" ? (
          <div className="relative w-56 shrink-0 min-h-[220px] border-r border-[#e5e7eb] bg-[#f3f4f6] p-2">
            <div className="relative flex h-full min-h-[204px] w-full items-center justify-center overflow-hidden rounded-xl bg-white">
              <MetaCreativeMedia ad={ad} compact />
            </div>
          </div>
        ) : null}
        <div className={`min-w-0 flex flex-col ${viewMode === "list" ? "flex-1 min-h-0" : ""}`}>
          <div className="p-4 flex items-start gap-3 border-b border-[#f1f5f9]">
            <CompetitorLogo
              sources={{
                primary: ad.pageProfilePic,
                secondary: brand.logoUrl,
                domain: brand.domain,
              }}
              name={ad.pageName?.trim() || brand.domain || "Brand"}
              size="md"
              shape="circle"
            />
            <div className="flex-1 min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-[15px] text-[#343434] break-words [overflow-wrap:anywhere]">
                  {ad.pageName}
                </p>
                {ad.advertiserMismatch ? <UnverifiedSourceBadge /> : null}
              </div>
              <p className="text-[13px] text-[#6b7280] flex items-center gap-1.5 mt-0.5">
                Sponsored <Globe className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {ad.startedAt != null && Number.isFinite(ad.startedAt) ? (
                <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      killed ? "bg-[#9ca3af]" : "bg-green-500"
                    }`}
                  />
                  <span className="font-medium whitespace-nowrap">
                    {killed ? "Ended" : "Active"} {runDays}D
                  </span>
                </div>
              ) : null}
              {ad.adLibraryUrl?.trim() ? (
                <a
                  href={ad.adLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#343434] transition-colors"
                  title="Open original ad on Meta"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
          {metaTitle || metaPrimary ? (
            <div className="px-4 py-3 shrink-0">
              {metaTitle ? (
                <ExpandableAdText
                  text={metaTitle}
                  className="font-semibold text-[15px] text-[#1c1e21] leading-snug break-words [overflow-wrap:anywhere]"
                />
              ) : null}
              {metaTitle && metaPrimary ? (
                <div className="h-[1lh] min-h-[1.125rem] shrink-0" aria-hidden />
              ) : null}
              {metaPrimary ? (
                <ExpandableAdText
                  text={metaPrimary}
                  className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />
              ) : null}
            </div>
          ) : null}
          {viewMode === "grid" && (
            <div className="relative w-full shrink-0 border-y border-[#e5e7eb] bg-[#f3f4f6] p-3">
              <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                <MetaCreativeMedia ad={ad} compact={false} />
              </div>
            </div>
          )}
          <div className="px-4 py-3.5 flex flex-col gap-3 bg-[#f3f4f6] shrink-0 border-t border-[#e5e7eb]">
            <div className="min-w-0 flex flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-medium text-[#65676b] uppercase tracking-wide truncate">{siteLabel}</p>
              {metaLinkDesc ? (
                <ExpandableAdText
                  text={metaLinkDesc}
                  className="mt-1.5 text-[13px] text-[#65676b] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`px-5 py-2 min-h-[44px] inline-flex items-center justify-center rounded-md text-[14px] font-semibold shrink-0 border transition-colors ${
                  destHttps
                    ? "bg-[#e7f3ff] text-[#0d6efd] border-[#cce4ff] hover:bg-[#d8ebfc]"
                    : "bg-[#f0f2f5] text-[#65676b] border-[#e4e6eb] hover:bg-[#e7e9ed]"
                }`}
              >
                {ad.cta}
              </a>
              <a
                href={ad.adLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-2 rounded-full bg-white text-[#2563eb] text-[12px] font-semibold hover:bg-[#eff6ff] transition-colors border border-[#bfdbfe] whitespace-nowrap"
              >
                View in Meta library
              </a>
            </div>
            <AdSaveRow
              scrapedAdId={scrapedAdId}
              isSaved={Boolean(isSaved)}
              onToggleSave={onToggleSave}
              saveDisabled={saveDisabled}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
