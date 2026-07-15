"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Globe, Play, Video } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { AdLibraryRunStatusBadge } from "@/components/ads-library/ad-library-run-status-badge";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { GoogleAdFormatIcon } from "@/components/ads-library/google-ad-format-icon";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { YouTubeLogo } from "@/components/platform-logos";
import { resolveGoogleAdRowTransparencyHref } from "@/lib/ad-detail/resolve-ad-library-url";
import { googleCreativeDisplayUrl, resolveGoogleStillPreviewDisplayUrl } from "@/lib/ad-library/google-creative-display-url";
import {
  computeLibraryAdRunDays,
  isLibraryAdKilled,
  type LibraryRunStatus,
} from "@/lib/ad-library/library-run-status";
import {
  extractYouTubeVideoId,
  googleAdsExternalLinkLabel,
  isUsableGoogleStillImagePreviewUrl,
  youtubePosterCandidateUrls,
  youtubeThumbnailFromUrl,
  type GoogleAdRow,
} from "@/lib/ad-library/normalize";
import { googleRowFirstShownYmd } from "@/lib/ad-library/count-active-ads";

const GOOGLE_MEDIA_FRAME_CLASS =
  "flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl";

const YOUTUBE_MEDIA_FRAME_CLASS =
  "relative flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0f0f0f]";

const GOOGLE_ARTICLE_MIN_HEIGHT_CLASS = "min-h-[440px] sm:min-h-[460px]";

/** Content region inside each platform card (below header + refresh). */

function googleTextSnippet(ad: Extract<GoogleAdRow, { type: "google" }>): {
  displayUrl: string;
  headline: string;
  body: string | null;
} {
  const displayUrl = ad.url.replace(/^www\./i, "");
  const host = displayUrl.toLowerCase();
  const rawTitle = ad.title.trim();
  const t = rawTitle.replace(/^www\./i, "").toLowerCase();
  const weakHeadline =
    !rawTitle || t === host || (rawTitle.length <= 28 && (t === host || t.endsWith(host)));
  const copy = ad.creativeCopy?.trim() ?? "";

  const splitLead = (s: string): { head: string; rest: string | null } => {
    const m = s.match(/^(.{8,240}[.!?])(\s+|$)([\s\S]*)$/);
    if (m) return { head: m[1].trim(), rest: (m[3] || "").trim() || null };
    if (s.length > 240) return { head: `${s.slice(0, 237).trim()}…`, rest: s.slice(237).trim() || null };
    return { head: s.trim(), rest: null };
  };

  if (weakHeadline && copy) {
    const { head, rest } = splitLead(copy);
    return { displayUrl, headline: head || rawTitle || displayUrl, body: rest };
  }
  return { displayUrl, headline: rawTitle || displayUrl, body: copy || null };
}

function GoogleTransparencyCard({
  ad,
  brandDomain,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
  runStatus,
}: {
  ad: Extract<GoogleAdRow, { type: "google" }>;
  brandDomain: string;
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  runStatus?: LibraryRunStatus;
}) {
  const [creativeImgFailed, setCreativeImgFailed] = useState(false);
  useEffect(() => {
    setCreativeImgFailed(false);
  }, [ad.id]);

  const sn = googleTextSnippet(ad);
  const href = resolveGoogleAdRowTransparencyHref(ad, brandDomain);
  const linkCta = googleAdsExternalLinkLabel(href);

  /** Prefer Transparency “Preview URL” only when it is a still image — proxy Google CDNs for ad blockers. */
  const rawPreview = (ad.previewUrl?.trim() || "").trim();
  const rawImg = (ad.img || "").trim();
  const imageSrc = resolveGoogleStillPreviewDisplayUrl(rawPreview || null, rawImg || null);
  const isFaviconOnly = Boolean(
    imageSrc.includes("google.com/s2/favicons") || imageSrc.includes("gstatic.com/favicon")
  );
  const hasCreativeImageAsset = Boolean(imageSrc && !isFaviconOnly);
  const previewHref = ad.previewUrl?.trim() || "";
  const showCreativePreviewLinkRow = Boolean(previewHref && !hasCreativeImageAsset);
  const detailTitle = ad.advertiserName?.trim() || sn.headline.split(" — ")[0]?.trim() || sn.headline;
  const lastShown =
    ad.lastShownLabel?.trim() || ad.shownSummary?.replace(/\s*–\s*/, " → ") || "—";
  const showRunBadge = googleRowFirstShownYmd(ad) != null;
  const killed = isLibraryAdKilled("google", ad, runStatus);
  const runDays = computeLibraryAdRunDays("google", ad, runStatus);

  return (
    <article
      onClick={() => onOpenDetail?.()}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dadce0] bg-white text-left shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition-colors hover:border-[#c7c7c7] ${GOOGLE_ARTICLE_MIN_HEIGHT_CLASS}${
        onOpenDetail ? " cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      <div className="shrink-0 border-b border-[#e8eaed] px-4 py-3">
        <h3 className="text-[17px] font-medium leading-snug text-[#202124] text-pretty [overflow-wrap:anywhere] break-words">
          {detailTitle}
        </h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[#f1f3f4] pt-3 text-[13px]">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[#5f6368]">Last shown</span>
            <span className="font-medium text-[#202124] [overflow-wrap:anywhere] break-words">{lastShown}</span>
            {ad.format?.trim() ? (
              <>
                <span className="text-[#dadce0]" aria-hidden>
                  ·
                </span>
                <GoogleAdFormatIcon format={ad.format} />
              </>
            ) : null}
          </div>
          {showRunBadge ? <AdLibraryRunStatusBadge killed={killed} runDays={runDays} /> : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f1f3f4] px-4 py-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-sm">
          {hasCreativeImageAsset ? (
            <div
              className={`block shrink-0 border-b border-[#e8eaed] bg-[#f8f9fa] ${GOOGLE_MEDIA_FRAME_CLASS}`}
              title="View ad details"
            >
              {!creativeImgFailed ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="max-h-full max-w-full rounded-xl object-contain object-center"
                  referrerPolicy="no-referrer"
                  onError={() => setCreativeImgFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f1f3f4] px-3 text-center text-[12px] text-[#64748b]">
                  No preview
                </div>
              )}
            </div>
          ) : null}
          {showCreativePreviewLinkRow ? (
            <div className={`shrink-0 border-b border-[#e8eaed] bg-[#fafafa] ${GOOGLE_MEDIA_FRAME_CLASS}`}>
              <div className="inline-flex flex-col items-center gap-2 px-4 py-3 text-center">
                <ExternalLink className="h-6 w-6 shrink-0 text-[#64748b] opacity-90" aria-hidden />
                <span className="text-[12px] font-medium leading-snug text-[#5f6368]">View ad details</span>
              </div>
            </div>
          ) : null}
          {!hasCreativeImageAsset && !showCreativePreviewLinkRow ? (
            <div className={`border-b border-[#e8eaed] bg-[#fafafa] px-3 text-center text-[12px] text-[#94a3b8] ${GOOGLE_MEDIA_FRAME_CLASS}`}>
              Text ad — no creative image
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col bg-white p-4">
            {isFaviconOnly && imageSrc ? (
              <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#e8eaed] bg-[#f8f9fa]">
                <img src={imageSrc} alt="" className="h-8 w-8 object-contain" />
              </div>
            ) : null}
            <div className="block text-left">
              <p className="flex items-center gap-1.5 text-[12px] leading-tight text-[#188038]">
                <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="truncate font-medium">{sn.displayUrl}</span>
              </p>
              <p className="mt-2 text-[15px] font-normal leading-snug text-[#1a0dab] [overflow-wrap:anywhere] break-words">
                {sn.headline}
              </p>
            </div>
            {sn.body ? (
              <ExpandableAdText
                text={sn.body}
                collapseOverflow={false}
                unclampedMaxHeightClass=""
                className="mt-2 text-[13px] leading-relaxed text-[#3c4043] [overflow-wrap:anywhere] break-words whitespace-pre-wrap"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-[#f1f3f4] px-4 py-3">
        {ad.shownSummary && !ad.lastShownLabel ? (
          <p className="flex items-center gap-2 text-[12px] text-[#5f6368]">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="tabular-nums">{ad.shownSummary}</span>
          </p>
        ) : null}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={ad.adUrl ?? undefined}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] shadow-sm transition-colors hover:bg-[#eff6ff]"
        >
          {linkCta.primary}
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </a>
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

/** Video-style row from Google Transparency (YouTube creative) — poster + optional MP4; resilient to expired CDN / bad hqdefault. */
function GoogleYoutubeAdCard({
  ad,
  brand,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
  runStatus,
}: {
  ad: Extract<GoogleAdRow, { type: "youtube" }>;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  runStatus?: LibraryRunStatus;
}) {
  const [posterIdx, setPosterIdx] = useState(0);
  const [videoDead, setVideoDead] = useState(false);
  const [posterExhausted, setPosterExhausted] = useState(false);

  const yid =
    ad.youtubeVideoId?.trim() ||
    extractYouTubeVideoId(ad.adUrl) ||
    extractYouTubeVideoId(ad.thumbnail) ||
    "";

  const posterList = useMemo(() => {
    const list: string[] = [];
    const push = (u: string) => {
      const t = u.trim();
      if (!t || list.includes(t)) return;
      const display = googleCreativeDisplayUrl(t) ?? t;
      if (!list.includes(display)) list.push(display);
    };
    const thumb = ad.thumbnail?.trim() || "";
    if (thumb && isUsableGoogleStillImagePreviewUrl(thumb)) push(thumb);
    const fromAdUrl = youtubeThumbnailFromUrl(ad.adUrl);
    if (fromAdUrl) push(fromAdUrl);
    if (yid) {
      for (const u of youtubePosterCandidateUrls(yid)) push(u);
    }
    return list;
  }, [ad.adUrl, ad.thumbnail, yid]);

  useEffect(() => {
    setPosterIdx(0);
    setVideoDead(false);
    setPosterExhausted(false);
  }, [ad.id, ad.videoUrl, ad.thumbnail, yid]);

  const activePoster = posterList[posterIdx] ?? "";
  const videoSrc = (ad.videoUrl ?? "").trim();
  const videoSrcNorm =
    videoSrc.length > 0 && !videoSrc.includes("#") ? `${videoSrc}#t=0.01` : videoSrc;

  const href = resolveGoogleAdRowTransparencyHref(ad, brand.domain);
  const { primary: linkLabel } = googleAdsExternalLinkLabel(href);

  const showVideoEl = Boolean(videoSrc) && !videoDead;
  const canBumpPoster = posterIdx < posterList.length - 1;
  const showRunBadge = googleRowFirstShownYmd(ad) != null;
  const killed = isLibraryAdKilled("google", ad, runStatus);
  const runDays = computeLibraryAdRunDays("google", ad, runStatus);

  return (
    <article
      onClick={() => onOpenDetail?.()}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] ${GOOGLE_ARTICLE_MIN_HEIGHT_CLASS}${
        onOpenDetail ? " cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      <div className={YOUTUBE_MEDIA_FRAME_CLASS}>
        {showVideoEl ? (
          <video
            key={`${ad.id}-v-${posterIdx}`}
            poster={activePoster || undefined}
            src={videoSrcNorm}
            muted
            playsInline
            /* Skip buffering when a poster covers the frame; without one we still
               need data to paint the first frame via the onLoadedData seek. */
            preload={activePoster ? "none" : "auto"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain object-center bg-black"
            onError={() => {
              setVideoDead(true);
              setPosterIdx(0);
            }}
            onLoadedData={(e) => {
              try {
                const el = e.currentTarget;
                if (el.duration && Number.isFinite(el.duration)) {
                  el.currentTime = Math.min(0.05, el.duration * 0.02);
                }
              } catch {
                /* ignore */
              }
            }}
          />
        ) : activePoster && !posterExhausted ? (
          <img
            src={activePoster}
            alt=""
            className="max-h-full max-w-full rounded-xl object-contain object-center bg-black"
            referrerPolicy="no-referrer"
            onError={() => {
              if (canBumpPoster) setPosterIdx((i) => i + 1);
              else setPosterExhausted(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] px-4 text-center">
            <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white shadow-lg ring-1 ring-white/20">
              <Play className="ml-0.5 h-7 w-7" fill="currentColor" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold leading-snug text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%)] [overflow-wrap:anywhere] px-2">
              {ad.title}
            </span>
            <YouTubeLogo className="mt-1 h-6 w-6 shrink-0 opacity-90" aria-hidden />
          </div>
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/80 px-2 py-1 text-[10px] font-medium text-white">
          Ad
        </span>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 pl-1 shadow-lg">
            <div className="h-0 w-0 border-b-[7px] border-b-transparent border-l-[12px] border-l-white border-t-[7px] border-t-transparent" />
          </div>
        </div>
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-white" title="Video">
          <Video className="h-4 w-4" aria-hidden />
          <span className="sr-only">Video</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-3 p-3">
          <CompetitorLogo
            sources={{ primary: brand.logoUrl, domain: brand.domain }}
            name={brand.name}
            size="sm-plus"
            shape="circle"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-pretty break-words text-[14px] font-medium leading-snug text-[#0f0f0f] [overflow-wrap:anywhere]">
                {ad.title}
              </p>
              {showRunBadge ? <AdLibraryRunStatusBadge killed={killed} runDays={runDays} /> : null}
            </div>
            <p className="mt-0.5 break-words text-[12px] text-[#606060] [overflow-wrap:anywhere]">{ad.channel}</p>
            <p className="text-[12px] text-[#606060]">{ad.views}</p>
          </div>
        </div>
        <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-[#f1f5f9] px-3 pb-3 pt-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] shadow-sm transition-colors hover:bg-[#eff6ff] sm:w-auto"
          >
            {linkLabel}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          </a>
          <AdSaveRow
            scrapedAdId={scrapedAdId}
            isSaved={Boolean(isSaved)}
            onToggleSave={onToggleSave}
            saveDisabled={saveDisabled}
          />
        </div>
      </div>
    </article>
  );
}

export function GoogleAdRowCard({
  ad,
  brand,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
  runStatus,
}: {
  ad: GoogleAdRow;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  runStatus?: LibraryRunStatus;
}) {
  if (ad.type === "google") {
    return (
      <GoogleTransparencyCard
        ad={ad}
        brandDomain={brand.domain}
        onOpenDetail={onOpenDetail}
        scrapedAdId={scrapedAdId}
        isSaved={isSaved}
        onToggleSave={onToggleSave}
        saveDisabled={saveDisabled}
        runStatus={runStatus}
      />
    );
  }
  return (
    <GoogleYoutubeAdCard
      ad={ad}
      brand={brand}
      onOpenDetail={onOpenDetail}
      scrapedAdId={scrapedAdId}
      isSaved={isSaved}
      onToggleSave={onToggleSave}
      saveDisabled={saveDisabled}
      runStatus={runStatus}
    />
  );
}

