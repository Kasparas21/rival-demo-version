"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  MessageCircle,
  Repeat2,
  BarChart2,
  Globe,
  MoreHorizontal,
  X,
  RefreshCw,
  Clock,
  ThumbsUp,
  Send,
  ExternalLink,
  Play,
  Video,
  Check,
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { resolveCompetitorViewFromSidebar } from "@/lib/competitor-view-resolve";
import { useActiveBrand } from "../brand-context";
import { AIInsightChat } from "@/components/ai-insight-chat";
import {
  MetaLogo,
  GoogleLogo,
  LinkedInLogo,
  SnapchatLogo,
  TikTokLogo,
  PinterestLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { useAdLibrary } from "@/hooks/use-ad-library";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { GoogleAdFormatIcon } from "@/components/ads-library/google-ad-format-icon";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { AdsLibraryAllModal } from "@/components/ads-library/ads-library-all-modal";
import { MetaAdsAllModal } from "@/components/ads-library/meta-ads-all-modal";
import { TikTokAdCard } from "@/components/ads-library/tiktok-ad-card";
import { SnapchatAdCard } from "@/components/ads-library/snapchat-ad-card";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import { META_ADS_INLINE_PREVIEW } from "@/lib/ad-library/constants";
import { ALL_ADS_API_PLATFORMS, channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import {
  googleAdsExternalLinkLabel,
  youtubeThumbnailFromUrl,
  type GoogleAdRow,
  type LinkedInAdCard,
  type PinterestAdCard,
} from "@/lib/ad-library/normalize";
import { fetchSavedCompetitorsFromAccount, saveCompetitorToAccount } from "@/lib/account/client";
import type { SavedCompetitorPayload } from "@/lib/account/types";
import {
  hoistLogoOntoRow,
  loadSidebarCompetitors,
  mergeAccountSidebarRowsWithLocalLibraryContext,
  normalizeCompetitorSlug,
  saveSidebarCompetitors,
  SIDEBAR_COMPETITORS_EVENT,
  slugsLikelySameCompany,
  type SidebarCompetitor,
  upsertSidebarCompetitor,
} from "@/lib/sidebar-competitors";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { readScrapeRequestFieldsFromStorage } from "@/lib/ad-library/scrape-request-fields";
import { buildAdEvidenceText } from "@/lib/brand-comparison/build-ad-evidence";
import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import { COMPETITOR_PAGE_TABS } from "@/components/dashboard/competitor/competitor-tabs-data";
import {
  platformRefreshActionsRowClass,
  platformRefreshOnlyButtonClass,
  platformSectionPanelClass,
} from "@/components/dashboard/competitor/competitor-platform-styles";
import {
  readStoredGoogleRegion,
  readStoredPinterestCountry,
  readStoredTiktokRegion,
} from "@/components/dashboard/competitor/competitor-session-readers";
import { GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT } from "@/lib/ad-library/constants";

const ADS_GRID_CLASS = "grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3";

/** Matches Google Transparency + YouTube cards so mixed-format rows align in {@link ADS_GRID_CLASS}. */
const GOOGLE_MEDIA_FRAME_CLASS =
  "flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden";

const YOUTUBE_MEDIA_FRAME_CLASS =
  "relative flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden bg-[#0f0f0f]";

const GOOGLE_ARTICLE_MIN_HEIGHT_CLASS = "min-h-[440px] sm:min-h-[460px]";

/** Content region inside each platform card (below header + refresh). */
const platformAdsBodyShellClass =
  "border-t border-[#DDF1FD]/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.88)_0%,rgba(255,255,255,0.35)_100%)] px-4 pb-5 pt-5 sm:px-5";

function AdsLibraryEmptyWithPlaceholders({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#e2e8f0] bg-white/70 px-4 py-3.5 text-[14px] leading-relaxed text-[#475569] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {message}
      </div>
      <div className={ADS_GRID_CLASS}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc]/60 px-4 py-6 text-center"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
              Ad slot
            </span>
            <p className="max-w-[13rem] text-[13px] leading-snug text-[#94a3b8]">
              Scraped creatives will appear here after a successful load.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Platform toggles for Ads Library visibility (order matches typical channel pick order). */
const ADS_LIBRARY_PLATFORM_FILTER_CONFIG: {
  id: AdsLibraryPlatform;
  /** Short label for the visibility chip (full context in `title`). */
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "meta", label: "Meta", title: "Meta ads", Icon: MetaLogo },
  { id: "google", label: "Google", title: "Google & YouTube ads", Icon: GoogleLogo },
  { id: "linkedin", label: "LinkedIn", title: "LinkedIn ads", Icon: LinkedInLogo },
  { id: "tiktok", label: "TikTok", title: "TikTok ads", Icon: TikTokLogo },
  { id: "pinterest", label: "Pinterest", title: "Pinterest ads", Icon: PinterestLogo },
  { id: "snapchat", label: "Snapchat", title: "Snapchat ads", Icon: SnapchatLogo },
];

const StrategyOverview = dynamic(
  () => import("@/components/strategy-overview").then((m) => ({ default: m.StrategyOverview })),
  {
    loading: () => (
      <div className="flex flex-1 items-center justify-center py-16 text-[15px] font-medium text-[#71717a]">
        Loading strategy…
      </div>
    ),
  }
);

/** When the API uses the domain as “headline”, lift real copy from the description. */
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
}: {
  ad: Extract<GoogleAdRow, { type: "google" }>;
  brandDomain: string;
}) {
  const [creativeImgFailed, setCreativeImgFailed] = useState(false);
  useEffect(() => {
    setCreativeImgFailed(false);
  }, [ad.id]);

  const sn = googleTextSnippet(ad);
  const href =
    ad.adUrl || `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(brandDomain)}`;
  const linkCta = googleAdsExternalLinkLabel(href);

  /** Prefer Transparency “Preview URL” for the creative (same as Google’s preview iframe source). */
  const imageSrc = (ad.previewUrl?.trim() || ad.img || "").trim();
  const isFaviconOnly = Boolean(
    imageSrc.includes("google.com/s2/favicons") || imageSrc.includes("gstatic.com/favicon")
  );
  const hasCreativeImageAsset = Boolean(imageSrc && !isFaviconOnly);
  const previewHref = ad.previewUrl?.trim() || "";
  const imageOpenHref = previewHref || href;
  const showCreativePreviewLinkRow = Boolean(previewHref && !hasCreativeImageAsset);
  const detailTitle = ad.advertiserName?.trim() || sn.headline.split(" — ")[0]?.trim() || sn.headline;
  const lastShown =
    ad.lastShownLabel?.trim() || ad.shownSummary?.replace(/\s*–\s*/, " → ") || "—";

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-[#dadce0] bg-white text-left shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition-colors hover:border-[#c7c7c7] ${GOOGLE_ARTICLE_MIN_HEIGHT_CLASS}`}
    >
      <div className="shrink-0 border-b border-[#e8eaed] px-4 py-3">
        <h3 className="text-[17px] font-medium leading-snug text-[#202124] text-pretty [overflow-wrap:anywhere] break-words">
          {detailTitle}
        </h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[#f1f3f4] pt-3 text-[13px]">
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f1f3f4] px-4 py-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-sm">
          {hasCreativeImageAsset ? (
            <a
              href={imageOpenHref}
              target="_blank"
              rel="noopener noreferrer"
              title={previewHref ? "Open creative preview" : ad.adUrl ?? undefined}
              className={`block shrink-0 border-b border-[#e8eaed] bg-[#f8f9fa] ${GOOGLE_MEDIA_FRAME_CLASS}`}
            >
              {!creativeImgFailed ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="max-h-full max-w-full object-contain object-center"
                  onError={() => setCreativeImgFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f1f3f4] px-3 text-center text-[12px] text-[#64748b]">
                  No preview
                </div>
              )}
            </a>
          ) : null}
          {showCreativePreviewLinkRow ? (
            <div className={`shrink-0 border-b border-[#e8eaed] bg-[#fafafa] ${GOOGLE_MEDIA_FRAME_CLASS}`}>
              <a
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-center gap-2 px-4 text-center"
              >
                <ExternalLink className="h-6 w-6 shrink-0 text-[#1a73e8] opacity-90" aria-hidden />
                <span className="text-[12px] font-medium leading-snug text-[#1a73e8] underline">
                  Open creative preview
                </span>
              </a>
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
            <a href={href} target="_blank" rel="noopener noreferrer" title={ad.adUrl ?? undefined} className="block">
              <p className="flex items-center gap-1.5 text-[12px] leading-tight text-[#188038]">
                <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="truncate font-medium">{sn.displayUrl}</span>
              </p>
              <p className="mt-2 text-[15px] font-normal leading-snug text-[#1a0dab] [overflow-wrap:anywhere] break-words">
                {sn.headline}
              </p>
            </a>
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
          title={ad.adUrl ?? undefined}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] shadow-sm transition-colors hover:bg-[#eff6ff]"
        >
          {linkCta.primary}
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </a>
      </div>
    </article>
  );
}

/** Video-style row from Google Transparency (YouTube creative) — poster + CTA like Meta/TikTok. */
function GoogleYoutubeAdCard({
  ad,
  brand,
}: {
  ad: Extract<GoogleAdRow, { type: "youtube" }>;
  brand: { name: string; domain: string; logoUrl?: string };
}) {
  const [posterFailed, setPosterFailed] = useState(false);
  useEffect(() => {
    setPosterFailed(false);
  }, [ad.id]);

  const href =
    ad.adUrl || `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(brand.domain)}`;
  const { primary: linkLabel } = googleAdsExternalLinkLabel(href);
  const thumb = ad.thumbnail?.trim() || youtubeThumbnailFromUrl(ad.adUrl) || "";
  const showPoster = Boolean(thumb) && !posterFailed;

  return (
    <article
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] ${GOOGLE_ARTICLE_MIN_HEIGHT_CLASS}`}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" className={YOUTUBE_MEDIA_FRAME_CLASS}>
        {showPoster ? (
          <img
            src={thumb}
            alt=""
            className="max-h-full max-w-full object-contain object-center"
            onError={() => setPosterFailed(true)}
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
      </a>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex gap-3 p-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#e5e7eb] bg-white">
            <BrandLogoThumb src={brand.logoUrl ?? ""} alt={brand.name} className="bg-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-pretty break-words text-[14px] font-medium leading-snug text-[#0f0f0f] [overflow-wrap:anywhere]">
              {ad.title}
            </p>
            <p className="mt-0.5 break-words text-[12px] text-[#606060] [overflow-wrap:anywhere]">{ad.channel}</p>
            <p className="text-[12px] text-[#606060]">{ad.views}</p>
          </div>
        </div>
        <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-[#f1f5f9] px-3 pb-3 pt-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] shadow-sm transition-colors hover:bg-[#eff6ff] sm:w-auto"
          >
            {linkLabel}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

function GoogleAdRowCard({
  ad,
  brand,
}: {
  ad: GoogleAdRow;
  brand: { name: string; domain: string; logoUrl?: string };
}) {
  if (ad.type === "google") {
    return <GoogleTransparencyCard ad={ad} brandDomain={brand.domain} />;
  }
  return <GoogleYoutubeAdCard ad={ad} brand={brand} />;
}

function LinkedInFeedAdCard({
  ad,
  brand,
}: {
  ad: LinkedInAdCard;
  brand: { name: string; logoUrl?: string };
}) {
  return (
    <article className="min-w-0 h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:border-[#DDF1FD]/60 transition-all duration-200 text-left">
      <div className="p-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-[#e5e7eb] bg-[#f3f4f6]">
            <BrandLogoThumb
              src={ad.advertiserLogoUrl ?? brand.logoUrl ?? ""}
              alt={ad.advertiser}
              className="bg-[#f3f4f6]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-[#0a66c2]">{ad.advertiser}</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              Promoted
              {ad.ctaLabel?.trim() ? (
                <>
                  {" · "}
                  <span className="font-semibold text-[#374151]">{ad.ctaLabel}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-[#6b7280]">
            <span className="p-1.5">
              <MoreHorizontal className="w-4 h-4" />
            </span>
            <span className="p-1.5">
              <X className="w-4 h-4" />
            </span>
          </div>
        </div>
        {ad.desc?.trim() ? (
          <div className="mt-3">
            <ExpandableAdText
              text={ad.desc}
              className="text-[14px] text-[#374151] leading-relaxed break-words [overflow-wrap:anywhere] text-pretty whitespace-pre-wrap"
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col min-h-0 bg-[#f9fafb] border-y border-[#e5e7eb] overflow-hidden">
        <AdCreativeVideoOrImage
          img={ad.img ?? ""}
          videoUrl={ad.videoUrl}
          openHref={ad.adUrl}
          className="min-h-0 w-full flex-1"
          minHeightClass="min-h-[200px]"
          fillAvailableHeight
        />
        <a
          href={ad.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block shrink-0 p-4 bg-white border-t border-[#e5e7eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0a66c2]"
        >
          <p className="font-semibold text-[15px] text-[#374151] break-words [overflow-wrap:anywhere] text-pretty leading-snug">{ad.headline}</p>
          <p className="text-[13px] text-[#6b7280] mt-0.5 break-all [overflow-wrap:anywhere]">{ad.url}</p>
        </a>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1 px-4 py-3 border-t border-[#e5e7eb] min-h-[48px] text-[#6b7280]">
        <span className="flex items-center gap-2 text-[13px] font-medium py-1.5">
          <ThumbsUp className="w-4 h-4" /> Like
        </span>
        <span className="flex items-center gap-2 text-[13px] font-medium py-1.5">
          <MessageCircle className="w-4 h-4" /> Comment
        </span>
        <span className="flex items-center gap-2 text-[13px] font-medium py-1.5">
          <Repeat2 className="w-4 h-4" /> Repost
        </span>
        <span className="flex items-center gap-2 text-[13px] font-medium py-1.5">
          <Send className="w-4 h-4" /> Share
        </span>
      </div>
    </article>
  );
}

function PinterestFeedAdCard({
  ad,
  brand,
}: {
  ad: PinterestAdCard;
  brand: { name: string; logoUrl?: string };
}) {
  return (
    <article className="min-w-0 h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:border-[#DDF1FD]/60 transition-all duration-200 text-left">
      <div className="p-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-[#e5e7eb] bg-[#f3f4f6]">
            <BrandLogoThumb src={brand.logoUrl ?? ""} alt={ad.advertiser} className="bg-[#f3f4f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-[#bd081c]">{ad.advertiser}</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">Pinterest Ad Transparency (EU / BR / TR)</p>
            {ad.reachSummary ? (
              <p className="text-[11px] text-[#9ca3af] mt-1 tabular-nums">Reach: {ad.reachSummary}</p>
            ) : null}
          </div>
        </div>
        {ad.desc?.trim() && ad.desc !== "—" ? (
          <div className="mt-3">
            <ExpandableAdText
              text={ad.desc}
              className="text-[14px] text-[#374151] leading-relaxed break-words [overflow-wrap:anywhere] text-pretty whitespace-pre-wrap"
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col min-h-0 bg-[#f9fafb] border-y border-[#e5e7eb] overflow-hidden">
        <AdCreativeVideoOrImage
          img={ad.img ?? ""}
          videoUrl={ad.videoUrl}
          openHref={ad.adUrl}
          className="min-h-0 w-full flex-1"
          minHeightClass="min-h-[200px]"
          fillAvailableHeight
        />
        <a
          href={ad.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block shrink-0 p-4 bg-white border-t border-[#e5e7eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#bd081c]"
        >
          <p className="font-semibold text-[15px] text-[#374151] break-words [overflow-wrap:anywhere] text-pretty leading-snug">{ad.headline}</p>
          <p className="text-[13px] text-[#6b7280] mt-0.5 break-all [overflow-wrap:anywhere]">{ad.url}</p>
        </a>
      </div>
    </article>
  );
}

const tabs = COMPETITOR_PAGE_TABS;

type CompetitorDashboardBodyProps = {
  canonicalHost: string;
  sidebarEpoch: number;
  brandParam: string | null;
  idsParam: string | null;
  channelsQuery: string;
  confirmedParam: string | null;
};

function CompetitorDashboardBody({
  canonicalHost,
  sidebarEpoch,
  brandParam,
  idsParam,
  channelsQuery,
  confirmedParam,
}: CompetitorDashboardBodyProps) {
  const [sidebarSnapshot, setSidebarSnapshot] = useState<SidebarCompetitor[] | undefined>(undefined);
  useEffect(() => {
    setSidebarSnapshot(loadSidebarCompetitors());
  }, [canonicalHost, sidebarEpoch]);

  const { brand, platformIds, channelsParam: channelsFromResolver, isConfirmed } = useMemo(
    () =>
      resolveCompetitorViewFromSidebar(
        canonicalHost,
        {
          brandParam,
          idsParam,
          channelsParam: channelsQuery,
          confirmedParam,
        },
        sidebarSnapshot === undefined ? [] : sidebarSnapshot
      ),
    [canonicalHost, brandParam, idsParam, channelsQuery, confirmedParam, sidebarEpoch, sidebarSnapshot]
  );

  const [activeTab, setActiveTab] = useState("ads library");
  const [visibleAdPlatforms, setVisibleAdPlatforms] = useState<AdsLibraryPlatform[] | null>(null);
  const [metaAdsModalOpen, setMetaAdsModalOpen] = useState(false);
  const [googleAdsModalOpen, setGoogleAdsModalOpen] = useState(false);
  const [linkedInAdsModalOpen, setLinkedInAdsModalOpen] = useState(false);
  const [tiktokAdsModalOpen, setTiktokAdsModalOpen] = useState(false);
  const [pinterestAdsModalOpen, setPinterestAdsModalOpen] = useState(false);
  const [snapchatAdsModalOpen, setSnapchatAdsModalOpen] = useState(false);
  const [scrapeFields] = useState<ScrapeRequestFields>(() => readScrapeRequestFieldsFromStorage());
  const [tiktokRegion, setTiktokRegion] = useState(readStoredTiktokRegion);
  const [pinterestCountry, setPinterestCountry] = useState(readStoredPinterestCountry);
  const [googleRegion, setGoogleRegion] = useState(readStoredGoogleRegion);
  const [accountLastScrapedAt, setAccountLastScrapedAt] = useState<string | null>(null);

  /** Apify-backed platforms to fetch — from resolver `channels` (discovery / sidebar); omit = all API-backed platforms */
  const adsPlatforms: AdsLibraryPlatform[] = useMemo(() => {
    if (!channelsFromResolver.trim()) {
      return ALL_ADS_API_PLATFORMS;
    }
    return channelsQueryToAdsPlatforms(channelsFromResolver.split(","));
  }, [channelsFromResolver]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const myBrand = useActiveBrand();

  /** Stable id map — avoids effect loops when resolver returns a fresh object after each sidebar bump. */
  const platformIdsFingerprint = useMemo(() => {
    if (!platformIds || Object.keys(platformIds).length === 0) return "";
    const entries = Object.entries(platformIds)
      .filter(([, v]) => typeof v === "string" && v.trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  }, [platformIds]);

  const lastSavedCompetitorToAccountKeyRef = useRef("");

  useEffect(() => {
    // Before hydration, `sidebarSnapshot` is undefined and we intentionally pass `[]` into the resolver
    // so SSR matches the first client paint. Running `upsertSidebarCompetitor` in that state would merge
    // `confirmed: false` (and drop ids) into the real localStorage row — permanently disabling Ad Library.
    if (sidebarSnapshot === undefined) return;

    const row: SidebarCompetitor = {
      slug: normalizeCompetitorSlug(brand.domain),
      name: brand.name,
      logoUrl: brand.logoUrl,
      brand: {
        name: brand.name,
        domain: brand.domain,
        logoUrl: brand.logoUrl,
      },
      libraryContext: {
        ids: (platformIds ?? undefined) as Record<string, string> | undefined,
        channels: channelsFromResolver.trim()
          ? channelsFromResolver.split(",").filter(Boolean)
          : undefined,
        confirmed: isConfirmed,
      },
      pending: false,
    };
    const hoisted = hoistLogoOntoRow(row);
    const upsert = upsertSidebarCompetitor(hoisted);
    if (!upsert.ok) return;
    const acct: SavedCompetitorPayload = {
      slug: hoisted.slug,
      name: hoisted.name,
      logoUrl: hoisted.logoUrl,
      brand: hoisted.brand,
      pending: false,
    };
    const accountKey = JSON.stringify({
      slug: acct.slug,
      name: acct.name,
      logoUrl: acct.logoUrl ?? null,
      brandDomain: acct.brand?.domain ?? null,
      brandName: acct.brand?.name ?? null,
      brandLogoUrl: acct.brand?.logoUrl ?? null,
    });
    if (lastSavedCompetitorToAccountKeyRef.current === accountKey) return;
    lastSavedCompetitorToAccountKeyRef.current = accountKey;
    void saveCompetitorToAccount(acct);
  }, [
    sidebarSnapshot,
    brand.domain,
    brand.logoUrl,
    brand.name,
    channelsFromResolver,
    isConfirmed,
    platformIdsFingerprint,
  ]);

  const {
    data: adLib,
    loading: adLibLoading,
    googleRefreshing,
    metaRefreshing,
    tiktokRefreshing,
    pinterestRefreshing,
    linkedinRefreshing,
    snapchatRefreshing,
    fetchError: adLibFetchError,
    configured: adsApiConfigured,
    refresh: refreshAdLibrary,
    refreshGoogleAds,
    refreshMetaAds,
    refreshTikTokAds,
    refreshPinterestAds,
    refreshLinkedInAds,
    refreshSnapchatAds,
  } = useAdLibrary(
    { name: brand.name, domain: brand.domain, logoUrl: brand.logoUrl },
    platformIds,
    adsPlatforms,
    isConfirmed,
    tiktokRegion,
    googleRegion,
    scrapeFields,
    pinterestCountry
  );

  const adLibRef = useRef(adLib);
  adLibRef.current = adLib;

  const [comparison, setComparison] = useState<BrandComparisonLlmResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonRefresh, setComparisonRefresh] = useState(0);

  useEffect(() => {
    if (activeTab !== "comparison") return;
    if (!isConfirmed) return;
    if (adLibLoading) return;

    let cancelled = false;
    setComparisonLoading(true);
    setComparisonError(null);

    void (async () => {
      try {
        const res = await fetch("/api/brand-comparison", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor: { name: brand.name, domain: brand.domain },
            userBrand: {
              name: myBrand.name,
              domain: myBrand.domain,
              brandContext: myBrand.brandContext,
            },
            adEvidence: buildAdEvidenceText(adLibRef.current),
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          comparison?: BrandComparisonLlmResult;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.comparison) {
          setComparison(null);
          setComparisonError(json.error ?? "Comparison failed");
          return;
        }
        setComparison(json.comparison);
      } catch {
        if (!cancelled) {
          setComparison(null);
          setComparisonError("Network error");
        }
      } finally {
        if (!cancelled) setComparisonLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    isConfirmed,
    adLibLoading,
    brand.name,
    brand.domain,
    myBrand.name,
    myBrand.id,
    myBrand.domain,
    myBrand.brandContext,
    comparisonRefresh,
  ]);

  const readAccountLastScraped = useCallback(() => {
    const list = loadSidebarCompetitors();
    const bdom = brand.domain.trim().toLowerCase();
    const row = list.find(
      (c) =>
        c.brand?.domain?.trim().toLowerCase() === bdom ||
        (c.brand?.domain != null && slugsLikelySameCompany(c.slug, brand.domain))
    );
    setAccountLastScrapedAt(row?.lastScrapedAt ?? null);
  }, [brand.domain, brand.name]);

  useEffect(() => {
    readAccountLastScraped();
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
    return () => window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
  }, [readAccountLastScraped]);

  const syncSavedCompetitorsFromAccount = useCallback(async () => {
    const localPrev = loadSidebarCompetitors();
    const list = await fetchSavedCompetitorsFromAccount();
    if (list.length > 0) {
      saveSidebarCompetitors(
        mergeAccountSidebarRowsWithLocalLibraryContext(list as SidebarCompetitor[], localPrev)
      );
    }
  }, []);

  const fetchMeta = adsPlatforms.includes("meta");
  const fetchGoogle = adsPlatforms.includes("google");
  const fetchLinkedIn = adsPlatforms.includes("linkedin");
  const fetchTikTok = adsPlatforms.includes("tiktok");
  const fetchPinterest = adsPlatforms.includes("pinterest");
  const fetchSnapchat = adsPlatforms.includes("snapchat");

  const refreshGoogleAdsRef = useRef(refreshGoogleAds);
  refreshGoogleAdsRef.current = refreshGoogleAds;
  /** Only refetch Google when the region picker actually changes — not when refresh callback identity churns. */
  const prevGoogleRegionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isConfirmed || !fetchGoogle) return;
    const prev = prevGoogleRegionRef.current;
    prevGoogleRegionRef.current = googleRegion;
    if (prev === null) return;
    if (prev === googleRegion) return;
    void refreshGoogleAdsRef.current();
  }, [googleRegion, isConfirmed, fetchGoogle]);

  const refreshTikTokAdsRef = useRef(refreshTikTokAds);
  refreshTikTokAdsRef.current = refreshTikTokAds;
  const prevTiktokRegionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isConfirmed || !fetchTikTok) return;
    const prev = prevTiktokRegionRef.current;
    prevTiktokRegionRef.current = tiktokRegion;
    if (prev === null) return;
    if (prev === tiktokRegion) return;
    void refreshTikTokAdsRef.current();
  }, [tiktokRegion, isConfirmed, fetchTikTok]);

  const refreshPinterestAdsRef = useRef(refreshPinterestAds);
  refreshPinterestAdsRef.current = refreshPinterestAds;
  const prevPinterestCountryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isConfirmed || !fetchPinterest) return;
    const prev = prevPinterestCountryRef.current;
    prevPinterestCountryRef.current = pinterestCountry;
    if (prev === null) return;
    if (prev === pinterestCountry) return;
    void refreshPinterestAdsRef.current();
  }, [pinterestCountry, isConfirmed, fetchPinterest]);

  const metaAds = useMemo(() => adLib?.meta?.ads ?? [], [adLib?.meta?.ads]);
  const googleRows = useMemo(() => adLib?.google?.rows ?? [], [adLib?.google?.rows]);
  const linkedinAds = useMemo(() => adLib?.linkedin?.ads ?? [], [adLib?.linkedin?.ads]);
  const tiktokAds = useMemo(() => adLib?.tiktok?.ads ?? [], [adLib?.tiktok?.ads]);
  const pinterestAds = useMemo(() => adLib?.pinterest?.ads ?? [], [adLib?.pinterest?.ads]);
  const snapchatAds = useMemo(() => adLib?.snapchat?.ads ?? [], [adLib?.snapchat?.ads]);
  const filteredMetaAds = useMemo(() => {
    return [...metaAds].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  }, [metaAds]);
  const filteredGoogleRows = useMemo(() => {
    return [...googleRows].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [googleRows]);
  const filteredLinkedInAds = useMemo(() => {
    return [...linkedinAds].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [linkedinAds]);
  const filteredTikTokAds = useMemo(() => {
    return [...tiktokAds].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [tiktokAds]);
  const filteredPinterestAds = useMemo(() => {
    return [...pinterestAds].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [pinterestAds]);
  const filteredSnapchatAds = useMemo(() => {
    return [...snapchatAds].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [snapchatAds]);

  /** Avoid platform skeletons while `adLibLoading` stays true — e.g. Google already hydrated from cache but Meta still scraping. */
  const metaSectionBusy = useMemo(
    () =>
      fetchMeta &&
      (metaRefreshing ||
        (adLibLoading && filteredMetaAds.length === 0 && adLib?.meta?.error == null)),
    [fetchMeta, metaRefreshing, adLibLoading, filteredMetaAds.length, adLib?.meta?.error]
  );
  const googleSectionBusy = useMemo(
    () =>
      fetchGoogle &&
      (googleRefreshing ||
        (adLibLoading && filteredGoogleRows.length === 0 && adLib?.google?.error == null)),
    [fetchGoogle, googleRefreshing, adLibLoading, filteredGoogleRows.length, adLib?.google?.error]
  );
  const linkedinSectionBusy = useMemo(
    () =>
      fetchLinkedIn &&
      (linkedinRefreshing ||
        (adLibLoading && filteredLinkedInAds.length === 0 && adLib?.linkedin?.error == null)),
    [
      fetchLinkedIn,
      linkedinRefreshing,
      adLibLoading,
      filteredLinkedInAds.length,
      adLib?.linkedin?.error,
    ]
  );
  const tiktokSectionBusy = useMemo(
    () =>
      fetchTikTok &&
      (tiktokRefreshing ||
        (adLibLoading && filteredTikTokAds.length === 0 && adLib?.tiktok?.error == null)),
    [fetchTikTok, tiktokRefreshing, adLibLoading, filteredTikTokAds.length, adLib?.tiktok?.error]
  );
  const pinterestSectionBusy = useMemo(
    () =>
      fetchPinterest &&
      (pinterestRefreshing ||
        (adLibLoading && filteredPinterestAds.length === 0 && adLib?.pinterest?.error == null)),
    [
      fetchPinterest,
      pinterestRefreshing,
      adLibLoading,
      filteredPinterestAds.length,
      adLib?.pinterest?.error,
    ]
  );
  const snapchatSectionBusy = useMemo(
    () =>
      fetchSnapchat &&
      (snapchatRefreshing ||
        (adLibLoading && filteredSnapchatAds.length === 0 && adLib?.snapchat?.error == null)),
    [
      fetchSnapchat,
      snapchatRefreshing,
      adLibLoading,
      filteredSnapchatAds.length,
      adLib?.snapchat?.error,
    ]
  );

  /** Platforms that actually returned creatives (used as default visibility when the user has not overridden chips). */
  const platformsWithAdsFromLibrary = useMemo((): AdsLibraryPlatform[] => {
    if (!adLib || !isConfirmed) return [];
    const out: AdsLibraryPlatform[] = [];
    if (fetchMeta && (adLib.meta?.ads?.length ?? 0) > 0) out.push("meta");
    if (fetchGoogle && (adLib.google?.rows?.length ?? 0) > 0) out.push("google");
    if (fetchLinkedIn && (adLib.linkedin?.ads?.length ?? 0) > 0) out.push("linkedin");
    if (fetchTikTok && (adLib.tiktok?.ads?.length ?? 0) > 0) out.push("tiktok");
    if (fetchPinterest && (adLib.pinterest?.ads?.length ?? 0) > 0) out.push("pinterest");
    if (fetchSnapchat && (adLib.snapchat?.ads?.length ?? 0) > 0) out.push("snapchat");
    return out;
  }, [adLib, isConfirmed, fetchMeta, fetchGoogle, fetchLinkedIn, fetchTikTok, fetchPinterest, fetchSnapchat]);

  /** Stable visual order — matches channel selection (`adsPlatforms`) so switching competitors does not reshuffle sections. */
  const platformOrder = useMemo(() => {
    type P = "meta" | "google" | "linkedin" | "tiktok" | "pinterest" | "snapchat";
    const active: P[] = [];
    if (fetchMeta) active.push("meta");
    if (fetchGoogle) active.push("google");
    if (fetchLinkedIn) active.push("linkedin");
    if (fetchTikTok) active.push("tiktok");
    if (fetchPinterest) active.push("pinterest");
    if (fetchSnapchat) active.push("snapchat");
    const pos = new Map(adsPlatforms.map((p, i) => [p, i]));
    const ordered = [...active].sort((a, b) => (pos.get(a) ?? 99) - (pos.get(b) ?? 99));
    return Object.fromEntries(ordered.map((p, i) => [p, i])) as Record<P, number>;
  }, [fetchMeta, fetchGoogle, fetchLinkedIn, fetchTikTok, fetchPinterest, fetchSnapchat, adsPlatforms]);

  const adsPlatformsKey = adsPlatforms.join("\0");

  useEffect(() => {
    setVisibleAdPlatforms(null);
  }, [adsPlatformsKey]);

  const defaultVisibleAdPlatforms = useMemo((): AdsLibraryPlatform[] => {
    if (!isConfirmed || adLibLoading) return adsPlatforms;
    if (!adLib) return adsPlatforms;
    if (platformsWithAdsFromLibrary.length === 0) return adsPlatforms;
    const order = new Map(adsPlatforms.map((plat, i) => [plat, i] as const));
    return [...platformsWithAdsFromLibrary].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }, [
    isConfirmed,
    adLibLoading,
    adLib,
    adsPlatforms,
    platformsWithAdsFromLibrary,
  ]);

  const effectiveVisibleAdPlatforms = visibleAdPlatforms ?? defaultVisibleAdPlatforms;

  const toggleAdPlatformVisibility = useCallback(
    (p: AdsLibraryPlatform) => {
      setVisibleAdPlatforms((cur) => {
        const base = cur ?? defaultVisibleAdPlatforms;
        if (base.includes(p)) {
          if (base.length <= 1) return base;
          return base.filter((x) => x !== p);
        }
        const order = new Map(adsPlatforms.map((plat, i) => [plat, i] as const));
        return [...base, p].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      });
    },
    [adsPlatforms, defaultVisibleAdPlatforms]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full">
      {/* Top Header */}
      <div className="shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-[0_1px_0_rgba(255,255,255,0.5)]">
        {/* Brand identity + status */}
        <div className="px-6 sm:px-8 lg:px-10 pt-6 sm:pt-7 pb-0">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 shrink-0 overflow-hidden rounded-2xl border border-[#e0e3e8] shadow-sm">
                <BrandLogoThumb src={brand.logoUrl} alt={brand.name} className="bg-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[22px] sm:text-[26px] font-bold text-[#343434] tracking-[-0.02em] truncate">{brand.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span className="text-[13px] text-[#71717a]">
                    {accountLastScrapedAt
                      ? `Last scraped ${getTimeAgo(new Date(accountLastScrapedAt))}`
                      : "Not yet scraped"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? "border-[#343434] text-[#343434]"
                      : "border-transparent text-[#6b7280] hover:text-[#343434] hover:border-[#DDF1FD]"
                  } ${tab.id === "AI insight" ? "" : ""}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? tab.id === "AI insight" ? "text-amber-500" : "text-[#343434]"
                      : "text-[#9ca3af]"
                  }`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'ads library' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-200">
            {adsPlatforms.length > 0 ? (
              <div className="mb-5 rounded-2xl border border-[#e5e7eb]/70 bg-[#DDF1FD]/25 px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:px-4 sm:py-2">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1 lg:gap-x-7">
                  <div className="min-w-0 shrink-0 sm:max-w-[228px] lg:max-w-[248px]">
                    <p className="text-[12px] font-semibold leading-tight text-[#374151] sm:text-[13px]">
                      Choose which platforms to show
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6b7280]">
                      Tap a platform to hide or show that section.
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 sm:min-w-[min(100%,280px)]">
                    <div
                      role="toolbar"
                      aria-label="Platforms shown in Ads Library"
                      className="grid w-full grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-1.5 rounded-xl border border-[#e5e7eb]/90 bg-white/85 p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                    >
                      {ADS_LIBRARY_PLATFORM_FILTER_CONFIG.filter((c) => adsPlatforms.includes(c.id)).map(({ id, label, title, Icon }) => {
                        const on = effectiveVisibleAdPlatforms.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            title={on ? `${title} — showing (click to hide)` : `${title} — hidden (click to show)`}
                            aria-pressed={on}
                            onClick={() => toggleAdPlatformVisibility(id)}
                            className={[
                              "relative flex min-h-0 w-full min-w-0 flex-col items-center overflow-hidden rounded-lg border-2 px-1 pb-1 pt-1 text-center outline-none transition-[box-shadow,background-color,border-color,transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.98]",
                              "focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                              on
                                ? "border-[color:var(--rival-accent-blue)] bg-[#DDF1FD]/90 text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.06),inset_0_0_0_1px_rgba(255,255,255,0.65)]"
                                : "border-dashed border-[#cbd5e1] bg-[#f8fafc] text-[#64748b] shadow-none hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "pointer-events-none absolute right-1 top-1 z-10 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-white bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.35)] transition-[border-color,opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none sm:right-1.5 sm:top-1.5 sm:size-5",
                                on ? "opacity-100" : "border-white/90 opacity-90",
                              ].join(" ")}
                              aria-hidden
                            >
                              <Check
                                className={[
                                  "size-[11px] shrink-0 stroke-[2.5] text-[#2563eb] transition-opacity duration-200 ease-out motion-reduce:transition-none sm:size-3",
                                  on ? "opacity-100" : "opacity-0",
                                ].join(" ")}
                                aria-hidden
                              />
                            </span>
                            <span className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pt-2.5 pb-0.5">
                              <span className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10">
                                <Icon
                                  className={`size-7 shrink-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:size-8 ${on ? "scale-100 opacity-100" : "scale-[0.96] opacity-55"}`}
                                  aria-hidden
                                />
                              </span>
                              <span
                                className={`block w-full max-w-full text-pretty text-center text-[10px] font-semibold leading-none sm:leading-tight sm:text-[11px] [overflow-wrap:anywhere] line-clamp-2 transition-opacity duration-200 ease-out motion-reduce:transition-none ${on ? "" : "opacity-85"}`}
                              >
                                {label}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="space-y-12">
            {(!adsApiConfigured || adLibFetchError) && !adLibLoading ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
                <span className="font-semibold">Live ads unavailable. </span>
                {adLibFetchError ||
                  "Add APIFY_TOKEN to .env.local and restart the dev server. Ads load via Apify actors for Meta, Google, LinkedIn, TikTok, Pinterest, and Snapchat."}
              </div>
            ) : null}

            {isConfirmed && adsPlatforms.length > 0 && adsApiConfigured && !adLibFetchError && !adLibLoading && adLib === null ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-[14px] text-slate-800">
                <span className="font-semibold">No saved ads for this competitor yet. </span>
                Click a platform&apos;s <strong className="font-semibold">Refresh … only</strong> button below to run Apify and load ads (uses credits).
              </div>
            ) : null}

            {adsPlatforms.length === 0 ? (
              <p className="text-[14px] text-[#6b7280] py-4">
                None of your selected channels use the live ads API (Meta, Google/YouTube, LinkedIn, TikTok, Pinterest, or Snapchat). Pick at least one when you choose platforms to show during search, or add identifiers in discovery.
              </p>
            ) : null}

            <div className="flex flex-col gap-12">
            {/* Meta / Facebook — Apify */}
            {fetchMeta && effectiveVisibleAdPlatforms.includes("meta") ? (
            <section style={{ order: platformOrder.meta ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-4 border-b border-white/55 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:pb-4 sm:pt-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
                      <MetaLogo className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#343434]">Meta / Facebook</h3>
                        <p className="mt-0.5 text-[13px] text-[#6b7280]">
                          {metaSectionBusy
                            ? metaRefreshing
                              ? "Refreshing Meta ads…"
                              : "Loading ads…"
                            : `${metaAds.length} active ads loaded (max ${scrapeFields.metaMaxAds} per request) from Ad Library`}
                          {adLib?.meta?.error && metaAds.length === 0 ? ` · ${adLib.meta?.error}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!metaSectionBusy && filteredMetaAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setMetaAdsModalOpen(true)}
                      className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-xl border border-white/60 bg-white/85 px-4 text-[13px] font-semibold text-[#343434] shadow-sm transition-colors hover:border-[#DDF1FD] hover:bg-white sm:self-auto"
                    >
                      View all {filteredMetaAds.length} ads
                    </button>
                  ) : null}
                </div>
                {adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={metaRefreshing || adLibLoading || !fetchMeta}
                      onClick={async () => {
                        try {
                          await refreshMetaAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Meta only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${metaRefreshing ? "animate-spin" : ""}`} />
                      Refresh Meta only
                    </button>
                  </div>
                ) : null}
                <div className={platformAdsBodyShellClass}>
                  {metaSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden animate-pulse">
                          <div className="p-4 flex items-center gap-3 border-b border-[#f1f5f9]">
                            <div className="h-10 w-10 rounded-full bg-[#e5e7eb]" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 w-32 rounded bg-[#e5e7eb]" />
                              <div className="h-3 w-20 rounded bg-[#e5e7eb]" />
                            </div>
                          </div>
                          <div className="px-4 py-3 space-y-2">
                            <div className="h-3.5 w-full rounded bg-[#e5e7eb]" />
                            <div className="h-3.5 w-4/5 rounded bg-[#e5e7eb]" />
                          </div>
                          <div className="h-[220px] bg-[#f3f4f6] border-y border-[#e5e7eb]" />
                          <div className="p-4 space-y-2">
                            <div className="h-3 w-24 rounded bg-[#e5e7eb]" />
                            <div className="h-4 w-2/3 rounded bg-[#e5e7eb]" />
                            <div className="h-8 w-28 rounded-full bg-[#e5e7eb]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredMetaAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message="No active Meta ads loaded yet. Try Refresh Meta only below." />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredMetaAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <MetaAdCard key={ad.id} ad={ad} viewMode="grid" brand={brand} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <MetaAdsAllModal
                open={metaAdsModalOpen}
                onClose={() => setMetaAdsModalOpen(false)}
                ads={filteredMetaAds}
                viewMode="grid"
                brand={brand}
              />
            </section>
            ) : null}

            {/* Google + YouTube — Apify Google Ads Transparency scraper */}
            {fetchGoogle && effectiveVisibleAdPlatforms.includes("google") ? (
            <section style={{ order: platformOrder.google ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shadow-sm">
                        <GoogleLogo className="w-5 h-5" />
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shadow-sm">
                        <YouTubeLogo className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">Google / YouTube</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {googleSectionBusy
                          ? googleRefreshing
                            ? "Refreshing Google / YouTube ads…"
                            : "Loading…"
                          : `${googleRows.length} loaded (up to ${GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT} per run) from Ads Transparency`}
                        {adLib?.google?.error && googleRows.length === 0 ? ` · ${adLib.google?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end self-start">
                    {!googleSectionBusy && filteredGoogleRows.length > META_ADS_INLINE_PREVIEW ? (
                      <button
                        type="button"
                        onClick={() => setGoogleAdsModalOpen(true)}
                        className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors"
                      >
                        View all {filteredGoogleRows.length} ads
                      </button>
                    ) : null}
                  </div>
                </div>
                {adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={googleRefreshing || adLibLoading || !fetchGoogle}
                      onClick={async () => {
                        try {
                          await refreshGoogleAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Google / YouTube only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${googleRefreshing ? "animate-spin" : ""}`} />
                      Refresh Google only
                    </button>
                  </div>
                ) : null}
                <div className={platformAdsBodyShellClass}>
                  {googleSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="min-h-[280px] rounded-2xl bg-white border border-[#e5e7eb] animate-pulse">
                          <div className="h-36 bg-[#f3f4f6]" />
                          <div className="p-4 space-y-2">
                            <div className="h-3.5 w-24 rounded bg-[#e5e7eb]" />
                            <div className="h-4 w-4/5 rounded bg-[#e5e7eb]" />
                            <div className="h-3.5 w-full rounded bg-[#e5e7eb]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredGoogleRows.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message="No Google ads returned for this domain. Confirm the website domain from discovery." />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredGoogleRows.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <GoogleAdRowCard key={ad.id} ad={ad} brand={brand} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal
                open={googleAdsModalOpen}
                onClose={() => setGoogleAdsModalOpen(false)}
                title="Google / YouTube ads"
                logo={
                  <>
                    <GoogleLogo className="w-5 h-5" />
                    <YouTubeLogo className="w-5 h-5" />
                  </>
                }
                ads={filteredGoogleRows}
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => <GoogleAdRowCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {/* LinkedIn — Apify */}
            {fetchLinkedIn && effectiveVisibleAdPlatforms.includes("linkedin") ? (
            <section style={{ order: platformOrder.linkedin ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
                      <LinkedInLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">LinkedIn</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {linkedinSectionBusy
                          ? linkedinRefreshing
                            ? "Refreshing LinkedIn ads…"
                            : "Loading…"
                          : `${linkedinAds.length} loaded (max ${scrapeFields.linkedinMaxAds} per request) from LinkedIn Ads Library`}
                        {adLib?.linkedin?.error && linkedinAds.length === 0 ? ` · ${adLib.linkedin?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!linkedinSectionBusy && filteredLinkedInAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setLinkedInAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredLinkedInAds.length} ads
                    </button>
                  ) : null}
                </div>
                {adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={linkedinRefreshing || adLibLoading || !fetchLinkedIn}
                      onClick={async () => {
                        try {
                          await refreshLinkedInAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch LinkedIn only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${linkedinRefreshing ? "animate-spin" : ""}`} />
                      Refresh LinkedIn only
                    </button>
                  </div>
                ) : null}
                <div className={platformAdsBodyShellClass}>
                  {linkedinSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="min-h-[320px] rounded-2xl bg-white border border-[#e5e7eb] animate-pulse">
                          <div className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-[#e5e7eb]" />
                            <div className="space-y-2 flex-1">
                              <div className="h-3.5 w-28 rounded bg-[#e5e7eb]" />
                              <div className="h-3 w-20 rounded bg-[#e5e7eb]" />
                            </div>
                          </div>
                          <div className="h-44 bg-[#f3f4f6]" />
                          <div className="p-4 space-y-2">
                            <div className="h-3.5 w-3/4 rounded bg-[#e5e7eb]" />
                            <div className="h-3.5 w-1/2 rounded bg-[#e5e7eb]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredLinkedInAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message="No LinkedIn ads returned. Add a LinkedIn company URL in discovery or try refreshing." />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredLinkedInAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <LinkedInFeedAdCard key={ad.id} ad={ad} brand={brand} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal
                open={linkedInAdsModalOpen}
                onClose={() => setLinkedInAdsModalOpen(false)}
                title="LinkedIn ads"
                logo={<LinkedInLogo className="w-5 h-5" />}
                ads={filteredLinkedInAds}
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => <LinkedInFeedAdCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {/* TikTok — Apify */}
            {fetchTikTok && effectiveVisibleAdPlatforms.includes("tiktok") ? (
            <section style={{ order: platformOrder.tiktok ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
                      <TikTokLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">TikTok</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {tiktokSectionBusy
                          ? tiktokRefreshing
                            ? "Refreshing TikTok ads…"
                            : "Loading…"
                          : `${tiktokAds.length} loaded (max ${scrapeFields.tiktokMaxAds} per request) from TikTok Ads Library`}
                        {adLib?.tiktok?.error && tiktokAds.length === 0 ? ` · ${adLib.tiktok?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!tiktokSectionBusy && filteredTikTokAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setTiktokAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredTikTokAds.length} ads
                    </button>
                  ) : null}
                </div>
                {adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={tiktokRefreshing || adLibLoading || !fetchTikTok}
                      onClick={async () => {
                        try {
                          await refreshTikTokAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch TikTok only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${tiktokRefreshing ? "animate-spin" : ""}`} />
                      Refresh TikTok only
                    </button>
                  </div>
                ) : null}
                <div className={platformAdsBodyShellClass}>
                  {tiktokSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="min-h-[360px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white animate-pulse">
                          <div className="space-y-3 p-4">
                            <div className="flex gap-2">
                              <div className="h-5 w-9 rounded bg-[#e5e7eb]" />
                              <div className="h-4 flex-1 rounded bg-[#e5e7eb]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 w-full rounded bg-[#e5e7eb]" />
                              <div className="h-3 w-full rounded bg-[#e5e7eb]" />
                              <div className="h-3 w-4/5 rounded bg-[#e5e7eb]" />
                            </div>
                          </div>
                          <div className="mx-auto aspect-[9/16] max-h-[280px] max-w-[220px] bg-[#e5e7eb]" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTikTokAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message="No TikTok ads returned. The search uses your brand name as the advertiser query on TikTok Ads Library." />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredTikTokAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <TikTokAdCard key={ad.id} ad={ad} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal
                open={tiktokAdsModalOpen}
                onClose={() => setTiktokAdsModalOpen(false)}
                title="TikTok ads"
                logo={<TikTokLogo className="w-5 h-5" />}
                ads={filteredTikTokAds}
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => <TikTokAdCard ad={ad} />}
              />
            </section>
            ) : null}

            {/* Pinterest Ad Transparency — Apify (EU / BR / TR; not US) */}
            {fetchPinterest && effectiveVisibleAdPlatforms.includes("pinterest") ? (
            <section style={{ order: platformOrder.pinterest ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
                      <PinterestLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">Pinterest ads</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {pinterestSectionBusy
                          ? pinterestRefreshing
                            ? "Refreshing Pinterest ads…"
                            : "Loading…"
                          : `${pinterestAds.length} loaded (max ${scrapeFields.pinterestMaxResults} per request) from Pinterest`}
                        {adLib?.pinterest?.error && pinterestAds.length === 0 ? ` · ${adLib.pinterest?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!pinterestSectionBusy && filteredPinterestAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setPinterestAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredPinterestAds.length} ads
                    </button>
                  ) : null}
                </div>
                {adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={pinterestRefreshing || adLibLoading || !fetchPinterest}
                      onClick={async () => {
                        try {
                          await refreshPinterestAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Pinterest only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${pinterestRefreshing ? "animate-spin" : ""}`} />
                      Refresh Pinterest only
                    </button>
                  </div>
                ) : null}
                <div className={platformAdsBodyShellClass}>
                  {pinterestSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="min-h-[280px] rounded-2xl bg-white border border-[#e5e7eb] animate-pulse">
                          <div className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-[#e5e7eb]" />
                            <div className="space-y-2 flex-1">
                              <div className="h-3.5 w-28 rounded bg-[#e5e7eb]" />
                              <div className="h-3 w-20 rounded bg-[#e5e7eb]" />
                            </div>
                          </div>
                          <div className="h-44 bg-[#f3f4f6]" />
                          <div className="p-4 space-y-2">
                            <div className="h-3.5 w-3/4 rounded bg-[#e5e7eb]" />
                            <div className="h-3.5 w-1/2 rounded bg-[#e5e7eb]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPinterestAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders
                      message={
                        <>
                          No Pinterest ads returned. We match by the handle from your Pinterest profile URL (or{" "}
                          <code className="rounded bg-[#f4f4f5] px-1 text-[12px]">ids.pinterestAdvertiserName</code>
                          ). Try a larger EU market, confirm the profile URL, or paste the advertiser label from
                          Pinterest&apos;s transparency UI. Small regions (e.g. LT) may have fewer disclosed rows than
                          DE/FR.
                        </>
                      }
                    />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredPinterestAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <PinterestFeedAdCard key={ad.id} ad={ad} brand={brand} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal
                open={pinterestAdsModalOpen}
                onClose={() => setPinterestAdsModalOpen(false)}
                title="Pinterest ads"
                logo={<PinterestLogo className="w-5 h-5" />}
                ads={filteredPinterestAds}
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => <PinterestFeedAdCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {fetchSnapchat && effectiveVisibleAdPlatforms.includes("snapchat") ? (
              <section style={{ order: platformOrder.snapchat ?? 0 }}>
                <div className={platformSectionPanelClass}>
                  <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
                        <SnapchatLogo className="h-6 w-6 text-[#0fad00]" aria-hidden />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#343434]">
                          Snapchat (EU Ads Gallery)
                        </h3>
                        <p className="mt-0.5 text-[13px] text-[#6b7280]">
                          {snapchatSectionBusy ? (
                            snapchatRefreshing ? "Refreshing Snapchat ads…" : "Loading…"
                          ) : (
                            <>
                              {snapchatAds.length} ad{snapchatAds.length === 1 ? "" : "s"} from Snapchat’s EU
                              Transparency Gallery, matched using “{brand.name}” and {brand.domain}.
                            </>
                          )}
                          {adLib?.snapchat?.error && snapchatAds.length === 0
                            ? ` · ${adLib.snapchat?.error}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    {!snapchatSectionBusy &&
                    filteredSnapchatAds.length > META_ADS_INLINE_PREVIEW ? (
                      <button
                        type="button"
                        onClick={() => setSnapchatAdsModalOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center justify-center self-start rounded-xl border border-white/60 bg-white/80 px-3.5 text-[13px] font-semibold text-[#343434] transition-colors hover:border-[#DDF1FD] hover:bg-white"
                      >
                        View all {filteredSnapchatAds.length} ads
                      </button>
                    ) : null}
                  </div>
                  {adsApiConfigured ? (
                    <div className={platformRefreshActionsRowClass}>
                      <button
                        type="button"
                        disabled={snapchatRefreshing || adLibLoading || !fetchSnapchat}
                        onClick={async () => {
                          try {
                            await refreshSnapchatAds();
                            await syncSavedCompetitorsFromAccount();
                          } catch {
                            /* handled in hook */
                          }
                        }}
                        className={platformRefreshOnlyButtonClass}
                        title="Re-fetch Snapchat only (bypasses cache)."
                      >
                        <RefreshCw
                          className={`h-4 w-4 shrink-0 ${snapchatRefreshing ? "animate-spin" : ""}`}
                          aria-hidden
                        />
                        Refresh Snapchat only
                      </button>
                    </div>
                  ) : null}
                <div className={platformAdsBodyShellClass}>
                  {snapchatSectionBusy ? (
                    <div className={ADS_GRID_CLASS}>
                      {[0, 1, 2].map((k) => (
                        <div
                          key={k}
                          className="min-h-[320px] animate-pulse overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
                        >
                          <div className="h-12 bg-[#fef9c3]" />
                          <div className="mx-auto aspect-[9/16] max-h-[280px] max-w-[220px] bg-[#e5e7eb]" />
                        </div>
                      ))}
                    </div>
                  ) : filteredSnapchatAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message="Nothing turned up for this combination. Pick another EU market, adjust the date range in your scrape settings, and try Refresh." />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {filteredSnapchatAds
                        .slice(0, META_ADS_INLINE_PREVIEW)
                        .map((ad) => (
                          <SnapchatAdCard key={ad.id} ad={ad} />
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal
                open={snapchatAdsModalOpen}
                onClose={() => setSnapchatAdsModalOpen(false)}
                title="Snapchat ads"
                logo={<SnapchatLogo className="h-5 w-5 text-[#0fad00]" />}
                ads={filteredSnapchatAds}
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => <SnapchatAdCard ad={ad} />}
              />
              </section>
            ) : null}

            </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'strategy overview' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-16 text-[15px] font-medium text-[#71717a]">
                Loading strategy…
              </div>
            }
          >
            <StrategyOverview
              brand={brand}
              onOpenAdsLibrary={() => {
                setActiveTab("ads library");
              }}
            />
          </Suspense>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[860px] mx-auto w-full animate-in fade-in duration-200">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-[#343434]">Comparison to Your Brand</h2>
                <p className="text-[14px] text-[#71717a] mt-0.5">
                  How <span className="font-medium text-[#3f3f46]">{brand.name}</span> stacks up against{" "}
                  <span className="font-medium text-[#3f3f46]">{myBrand.name}</span>
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-indigo-600/90">
                  AI-generated · same OpenRouter model as Strategy Insights
                </p>
              </div>
              <button
                type="button"
                disabled={!isConfirmed || comparisonLoading || adLibLoading}
                onClick={() => {
                  setComparison(null);
                  setComparisonRefresh((n) => n + 1);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3f3f46] shadow-sm hover:bg-[#fafafa] disabled:opacity-50"
              >
                {comparisonLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh analysis
              </button>
            </div>

            {!isConfirmed ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
                Confirm this competitor (finish discovery / sidebar sync) to run a grounded comparison with your Ads
                Library data.
              </div>
            ) : adLibLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-[14px] text-[#71717a]">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                Loading ads for comparison…
              </div>
            ) : comparisonLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-[14px] text-[#71717a]">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                Comparing brands…
              </div>
            ) : comparisonError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900">
                {comparisonError}
                <button
                  type="button"
                  className="mt-2 block text-[13px] font-medium underline"
                  onClick={() => setComparisonRefresh((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            ) : comparison ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#e0e3e8] shadow-sm">
                        <BrandLogoThumb src={brand.logoUrl} alt={brand.name} className="bg-white" />
                      </div>
                      <p className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">{brand.name}</p>
                    </div>
                    <p className="text-[22px] font-bold text-[#343434] tracking-tight leading-tight">
                      {comparison.competitorArchetype.headline}
                    </p>
                    <p className="text-[13px] text-[#71717a] mt-1.5">{comparison.competitorArchetype.subtitle}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/60 shadow-sm">
                        {myBrand.logoUrl ? (
                          <BrandLogoThumb src={myBrand.logoUrl} alt={myBrand.name} className="bg-white" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-white text-[12px] font-bold"
                            style={{ backgroundColor: myBrand.color ?? "#343434" }}
                          >
                            {myBrand.badge}
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">{myBrand.name}</p>
                    </div>
                    <p className="text-[22px] font-bold text-[#343434] tracking-tight leading-tight">
                      {comparison.userArchetype.headline}
                    </p>
                    <p className="text-[13px] text-[#71717a] mt-1.5">{comparison.userArchetype.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <h3 className="text-[14px] font-semibold text-[#343434] mb-2.5">{comparison.theirAdvantage.title}</h3>
                    <p className="text-[14px] text-[#52525b] leading-relaxed whitespace-pre-wrap">{comparison.theirAdvantage.body}</p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <h3 className="text-[14px] font-semibold text-[#343434] mb-2.5">{comparison.yourAdvantage.title}</h3>
                    <p className="text-[14px] text-[#52525b] leading-relaxed whitespace-pre-wrap">{comparison.yourAdvantage.body}</p>
                  </div>

                  <div className="bg-[#DDF1FD]/40 rounded-2xl border border-[#DDF1FD] p-5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-md bg-[#343434] flex items-center justify-center shrink-0">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-[14px] font-semibold text-[#343434]">{comparison.recommendation.title}</h3>
                    </div>
                    <p className="text-[14px] text-[#343434]/90 leading-relaxed whitespace-pre-wrap">{comparison.recommendation.body}</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'AI insight' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AIInsightChat
            competitorName={brand.name}
            competitorDomain={brand.domain}
            myBrandName={myBrand.name}
            myBrandBadge={myBrand.badge}
            myBrandLogoUrl={myBrand.logoUrl}
            myBrandColor={myBrand.color}
            myBrandContext={myBrand.brandContext}
          />
        </div>
      )}

    </div>
  );
}

export function CompetitorContent({ pathDomainCanonical }: { pathDomainCanonical: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarEpoch, setSidebarEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setSidebarEpoch((n) => n + 1);
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const legacyUrlParam = searchParams.get("url");
  const canonicalHost = useMemo(() => {
    if (pathDomainCanonical?.trim()) return normalizeCompetitorSlug(pathDomainCanonical);
    if (legacyUrlParam?.trim()) return normalizeCompetitorSlug(legacyUrlParam);
    return "example.com";
  }, [pathDomainCanonical, legacyUrlParam]);

  const brandParam = searchParams.get("brand");
  const idsParam = searchParams.get("ids");
  const channelsQuery = searchParams.get("channels") ?? "";
  const confirmedParam = searchParams.get("confirmed");

  useEffect(() => {
    if (!pathDomainCanonical?.trim()) return;
    const bulky =
      searchParams.has("brand") || searchParams.has("ids") || searchParams.has("url");
    if (!bulky) return;
    router.replace(buildCompetitorDashboardPath(canonicalHost), { scroll: false });
  }, [pathDomainCanonical, canonicalHost, router, searchParams]);

  return (
    <CompetitorDashboardBody
      key={canonicalHost}
      canonicalHost={canonicalHost}
      sidebarEpoch={sidebarEpoch}
      brandParam={brandParam}
      idsParam={idsParam}
      channelsQuery={channelsQuery}
      confirmedParam={confirmedParam}
    />
  );
}
