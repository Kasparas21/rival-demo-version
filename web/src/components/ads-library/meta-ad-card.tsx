"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import { Globe, Play } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { AdCardTopRightLinkStack } from "@/components/ads-library/creative-test-winner-trophy";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import {
  computeLibraryAdRunDays,
  isLibraryAdKilled,
  type LibraryRunStatus,
} from "@/lib/ad-library/library-run-status";
import { isExpiredMetaCdnUrl } from "@/lib/ad-library/meta-cdn-expiry";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";
import { safeHttpsUrl, looksLikeMetaRasterPreviewUrl } from "@/lib/ad-library/normalize";
import { resolveMetaLibraryCardPreview } from "@/lib/ad-library/resolve-meta-library-card-preview";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";

/** Centers creative inside the fixed grid frame (horizontal + vertical). */
function fillFrameCenter(children: ReactNode, fillFrame: boolean, extraClass = "") {
  if (!fillFrame) return children;
  return (
    <div
      className={`flex h-full w-full min-h-0 items-center justify-center overflow-hidden ${extraClass}`.trim()}
    >
      {children}
    </div>
  );
}

const fillFrameMediaClass = "max-h-full max-w-full object-contain object-center rounded-xl";

function MetaCreativeMedia({
  ad,
  compact,
  archivedUrl,
  fillFrame,
  naturalSizing,
}: {
  ad: MetaAdCardModel;
  compact: boolean;
  /** Supabase Storage copy — survives Meta CDN link expiry. */
  archivedUrl?: string;
  /** Fit creative inside a fixed-height card frame (grid view). */
  fillFrame?: boolean;
  /** Size the frame to the creative's natural aspect ratio (discovery masonry). */
  naturalSizing?: boolean;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [archivedFailed, setArchivedFailed] = useState(false);
  const stream = ad.videoUrl?.trim() ?? "";
  useEffect(() => {
    setVideoFailed(false);
    setPlaying(false);
    setImageFailed(false);
    setArchivedFailed(false);
  }, [ad.id, stream, ad.img]);
  const still = resolveMetaLibraryCardPreview(ad);
  const fallbackStill = ad.img?.trim() ?? "";
  const pagePicFallback =
    ad.pageProfilePic?.trim() && looksLikeMetaRasterPreviewUrl(ad.pageProfilePic.trim())
      ? ad.pageProfilePic.trim()
      : "";
  const archived = !archivedFailed ? archivedUrl?.trim() ?? "" : "";
  const rawCdnStill = still || fallbackStill;
  /** Signed CDN link already past its `oe=` expiry always 403s — skip it when we have an archived copy. */
  const cdnStill = archived && isExpiredMetaCdnUrl(rawCdnStill) ? "" : rawCdnStill;
  /** CDN link first (freshest); archived Storage copy when the CDN link has expired; page logo last. */
  const displayStill = !imageFailed ? cdnStill || archived || pagePicFallback : archived || pagePicFallback;
  const onStillError = () => {
    if (!imageFailed) setImageFailed(true);
    else setArchivedFailed(true);
  };
  /** Poster-first preview so video tiles match image size; mount `<video>` only after play. */
  const wantsVideo = Boolean(stream && ad.isVideo && displayStill);
  const useNatural = naturalSizing && !compact;
  const maxH = compact ? "max-h-[300px]" : useNatural ? "max-h-[min(80vh,720px)]" : fillFrame ? "max-h-full" : "max-h-[420px]";
  const previewFrameH = compact ? "h-[200px]" : useNatural ? "" : fillFrame ? "h-full min-h-0" : "h-[280px]";
  /** Image ads: natural aspect, width-first. Video posters: fixed frame unless naturalSizing. */
  const imageMediaClass = useNatural
    ? "block w-full h-auto object-contain rounded-xl"
    : fillFrame
      ? fillFrameMediaClass
      : `block w-full ${maxH} object-contain rounded-xl`;
  const videoPreviewMediaClass = useNatural
    ? "block w-full h-auto max-h-[min(80vh,720px)] object-contain rounded-xl"
    : fillFrame
      ? fillFrameMediaClass
      : "block h-full w-full object-cover rounded-xl";
  const videoFrameBg = fillFrame ? "bg-[#f3f4f6]" : "bg-black";

  if (wantsVideo && playing && !videoFailed) {
    const video = (
      <video
        controls
        autoPlay
        playsInline
        preload="metadata"
        poster={displayStill || undefined}
        className={`${videoPreviewMediaClass} ${fillFrame ? "bg-[#f3f4f6]" : "bg-black"}`}
        src={stream}
        onClick={(e) => e.stopPropagation()}
        onError={() => setVideoFailed(true)}
        {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
      />
    );
    if (fillFrame) {
      return fillFrameCenter(video, true, `rounded-xl ${videoFrameBg}`);
    }
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${previewFrameH} ${videoFrameBg}`}>
        {video}
      </div>
    );
  }

  if (wantsVideo && displayStill && !videoFailed) {
    const poster = (
      <button
        type="button"
        className={
          fillFrame
            ? "relative inline-flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-xl border-0 bg-transparent p-0"
            : useNatural
              ? "relative block w-full overflow-hidden rounded-xl border-0 bg-[#f3f4f6] p-0"
              : `relative block w-full overflow-hidden rounded-xl border-0 bg-[#f3f4f6] p-0 ${previewFrameH}`
        }
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
          onError={onStillError}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
            <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
          </span>
        </span>
      </button>
    );
    return fillFrame ? fillFrameCenter(poster, true, "rounded-xl bg-[#f3f4f6]") : poster;
  }

  if (wantsVideo && !displayStill && !videoFailed) {
    const video = (
      <video
        controls
        playsInline
        preload="metadata"
        className={`${videoPreviewMediaClass} ${fillFrame ? "bg-[#f3f4f6]" : "bg-black"}`}
        src={stream}
        onClick={(e) => e.stopPropagation()}
        onError={() => setVideoFailed(true)}
        {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
      />
    );
    if (fillFrame) {
      return fillFrameCenter(video, true, `rounded-xl ${videoFrameBg}`);
    }
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${previewFrameH} ${videoFrameBg}`}>
        {video}
      </div>
    );
  }

  if (wantsVideo && videoFailed && displayStill) {
    const fallback = (
      <div className={fillFrame ? "relative inline-flex max-h-full max-w-full" : `relative w-full overflow-hidden rounded-xl ${previewFrameH} ${videoFrameBg}`}>
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
    return fillFrame ? fillFrameCenter(fallback, true, `rounded-xl ${videoFrameBg}`) : fallback;
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
    if (useNatural) {
      return (
        <img
          src={displayStill}
          alt=""
          referrerPolicy="no-referrer"
          className={imageMediaClass}
          onClick={(e) => e.stopPropagation()}
          onError={onStillError}
        />
      );
    }
    return fillFrameCenter(
      <img
        src={displayStill}
        alt=""
        referrerPolicy="no-referrer"
        className={imageMediaClass}
        onClick={(e) => e.stopPropagation()}
        onError={onStillError}
      />,
      Boolean(fillFrame),
      fillFrame ? "rounded-xl bg-[#f3f4f6]" : "",
    );
  }

  /** Had a preview URL but every source (CDN + archive) failed → the creative expired on Meta's side. */
  const expired = imageFailed && Boolean(cdnStill || archivedUrl?.trim());
  if (expired) {
    return (
      <div
        className={`flex w-full ${compact ? "min-h-[200px]" : "min-h-[280px]"} flex-col items-center justify-center gap-2 px-4 text-center`}
      >
        <p className="text-[12px] text-[#6b7280]">Preview expired — Meta rotates creative links for ended ads.</p>
        {ad.adLibraryUrl?.trim() ? (
          <a
            href={ad.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-full bg-white text-[#2563eb] text-[12px] font-semibold px-4 py-2 border border-[#bfdbfe] hover:bg-[#eff6ff]"
          >
            View in Meta library
          </a>
        ) : null}
      </div>
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

function MetaAdCardImpl({
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
  isCreativeTestWinner,
  gridCreativeSizing = "fixed",
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
  isCreativeTestWinner?: boolean;
  /** Grid creative frame: fixed 280px box vs natural aspect ratio. */
  gridCreativeSizing?: "fixed" | "natural";
}) {
  const killed = isLibraryAdKilled("meta", ad, runStatus, metaScrapeAtMs);
  const runDays = computeLibraryAdRunDays("meta", ad, runStatus, metaScrapeAtMs);
  const archivedUrl = runStatus?.archivedCreativeUrl;
  const { destHttps, siteLabel } = metaSiteLabel(ad, brand.domain);
  const ctaHref = destHttps || ad.adLibraryUrl;
  const metaTitle = ad.headline?.trim() || "";
  const metaPrimary = ad.desc?.trim() || "";
  const metaLinkDesc = ad.linkDescription?.trim() || "";

  const isGrid = viewMode === "grid";

  return (
    <article
      onClick={onClick}
      className={`min-w-0 ${viewMode === "list" || isGrid ? "h-full" : ""} bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden transition-all duration-200 flex flex-col ${
        onClick ? "cursor-pointer hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-2 hover:ring-slate-200" : "hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className={`flex min-h-0 ${viewMode === "list" ? "flex-1 flex-row" : isGrid ? "flex-1 flex-col" : "flex-col"}`}>
        {viewMode === "list" ? (
          <div className="relative w-56 shrink-0 min-h-[220px] border-r border-[#e5e7eb] bg-[#f3f4f6] p-2">
            <div className="relative flex h-full min-h-[204px] w-full items-center justify-center overflow-hidden rounded-xl bg-white">
              <MetaCreativeMedia ad={ad} compact archivedUrl={archivedUrl} />
            </div>
          </div>
        ) : null}
        <div className={`min-w-0 flex flex-col ${viewMode === "list" || isGrid ? "flex-1 min-h-0" : ""}`}>
          <div className="p-4 flex items-start gap-3 border-b border-[#f1f5f9]" data-pa-section="brand">
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
              <AdCardTopRightLinkStack
                href={ad.adLibraryUrl}
                hrefTitle="Open original ad on Meta"
                isCreativeTestWinner={isCreativeTestWinner}
                onLinkClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {metaTitle || metaPrimary ? (
            <div className="px-4 py-3 shrink-0" data-pa-section="copy">
              {metaTitle ? (
                <p className="font-semibold text-[15px] text-[#1c1e21] leading-snug break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {metaTitle}
                </p>
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
          {isGrid ? (
            gridCreativeSizing === "natural" ? (
              <div className="border-y border-[#e5e7eb] bg-[#f3f4f6] px-3">
                <div className="w-full overflow-hidden rounded-xl bg-[#f3f4f6]">
                  <MetaCreativeMedia
                    ad={ad}
                    compact={false}
                    naturalSizing
                    archivedUrl={archivedUrl}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col border-y border-[#e5e7eb] bg-[#f3f4f6]">
                <div className="min-h-0 flex-1" aria-hidden />
                <div className="relative z-0 w-full shrink-0 px-3">
                  <div className="h-[280px] w-full overflow-hidden rounded-xl bg-[#f3f4f6]">
                    <MetaCreativeMedia ad={ad} compact={false} fillFrame archivedUrl={archivedUrl} />
                  </div>
                </div>
                <div className="min-h-0 flex-1" aria-hidden />
              </div>
            )
          ) : null}
          <div
            className="px-4 py-3.5 flex flex-col gap-3 bg-[#f3f4f6] shrink-0 border-t border-[#e5e7eb]"
            data-pa-section="cta"
          >
            <div className="min-w-0 flex flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-medium text-[#65676b] uppercase tracking-wide truncate">{siteLabel}</p>
              {metaLinkDesc ? (
                <p className="mt-1.5 break-words whitespace-pre-wrap text-[13px] leading-snug text-[#65676b] [overflow-wrap:anywhere]">
                  {metaLinkDesc}
                </p>
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

/** Memoized — grids render many cards; parent loading-flag flips shouldn't re-render them all. */
export const MetaAdCard = memo(MetaAdCardImpl);
