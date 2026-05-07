"use client";
import React, { Suspense, useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Search,
  MessageCircle,
  Repeat2,
  BarChart2,
  ChevronDown,
  Globe,
  MoreHorizontal,
  X,
  RefreshCw,
  LayoutGrid,
  List,
  Plus,
  Filter,
  Library,
  BarChart3,
  GitCompareArrows,
  Clock,
  ThumbsUp,
  Send,
  ExternalLink,
  Play,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActiveBrand } from "../brand-context";
import { AIInsightChat } from "@/components/ai-insight-chat";
import { StrategyOverview } from "@/components/strategy-overview";
import {
  MetaLogo,
  GoogleLogo,
  XLogo,
  LinkedInLogo,
  MicrosoftLogo,
  RedditLogo,
  SnapchatLogo,
  TikTokLogo,
  PinterestLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { useAdLibrary } from "@/hooks/use-ad-library";
import { UnconnectedPlatformPlaceholder } from "@/components/ads-library/unconnected-platform-placeholder";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { GoogleAdFormatIcon } from "@/components/ads-library/google-ad-format-icon";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { AdsLibraryAllModal } from "@/components/ads-library/ads-library-all-modal";
import { MetaAdsAllModal } from "@/components/ads-library/meta-ads-all-modal";
import { TikTokAdCard } from "@/components/ads-library/tiktok-ad-card";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import {
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
  GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT,
  META_ADS_INLINE_PREVIEW,
} from "@/lib/ad-library/constants";
import {
  buildGoogleAdsRegionOptions,
  DEFAULT_GOOGLE_ADS_REGION,
  GOOGLE_ADS_RESULTS_LIMIT_CHOICES,
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import {
  DEFAULT_TIKTOK_ADS_REGION,
  normalizeTikTokAdsRegion,
  TIKTOK_ADS_LIBRARY_REGION_OPTIONS,
} from "@/lib/ad-library/tiktok-regions";
import {
  DEFAULT_PINTEREST_ADS_COUNTRY,
  normalizePinterestAdsCountry,
  PINTEREST_ADS_COUNTRY_OPTIONS,
} from "@/lib/ad-library/pinterest-regions";
import { ALL_ADS_API_PLATFORMS, channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import {
  googleAdsExternalLinkLabel,
  youtubeThumbnailFromUrl,
  type GoogleAdRow,
  type LinkedInAdCard,
  type MicrosoftAdCard,
  type PinterestAdCard,
} from "@/lib/ad-library/normalize";
import { fetchSavedCompetitorsFromAccount } from "@/lib/account/client";
import {
  loadSidebarCompetitors,
  normalizeCompetitorSlug,
  saveSidebarCompetitors,
  SIDEBAR_COMPETITORS_EVENT,
  slugsLikelySameCompany,
  type SidebarCompetitor,
  upsertSidebarCompetitor,
} from "@/lib/sidebar-competitors";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import {
  LINKEDIN_DATE_RANGE_OPTIONS,
  META_SORT_OPTIONS,
  PINTEREST_AGE_OPTIONS,
  PINTEREST_GENDER_OPTIONS,
  readScrapeRequestFieldsFromStorage,
  writeScrapeRequestFieldsToStorage,
} from "@/lib/ad-library/scrape-request-fields";
import {
  LINKEDIN_COUNTRY_OPTIONS,
  META_COUNTRY_OPTIONS,
  MICROSOFT_MARKET_OPTIONS,
} from "@/lib/ad-library/scrape-settings-options";

function readStoredGoogleRegion(): string {
  if (typeof window === "undefined") return DEFAULT_GOOGLE_ADS_REGION;
  try {
    const gr = sessionStorage.getItem("rival-google-ads-region");
    if (gr) return normalizeGoogleAdsRegion(gr);
  } catch {
    /* ignore */
  }
  return DEFAULT_GOOGLE_ADS_REGION;
}

function readStoredGoogleResultsLimit(): number {
  if (typeof window === "undefined") return GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT;
  try {
    const glim = sessionStorage.getItem("rival-google-ads-results-limit");
    if (glim) return normalizeGoogleAdsResultsLimit(Number(glim));
  } catch {
    /* ignore */
  }
  return GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT;
}

function readStoredTiktokRegion(): string {
  if (typeof window === "undefined") return DEFAULT_TIKTOK_ADS_REGION;
  try {
    const s = sessionStorage.getItem("rival-tiktok-ads-region");
    if (s) return normalizeTikTokAdsRegion(s);
  } catch {
    /* ignore */
  }
  return DEFAULT_TIKTOK_ADS_REGION;
}

function readStoredPinterestCountry(): string {
  if (typeof window === "undefined") return DEFAULT_PINTEREST_ADS_COUNTRY;
  try {
    const pc = sessionStorage.getItem("rival-pinterest-ads-country");
    if (pc) return normalizePinterestAdsCountry(pc);
  } catch {
    /* ignore */
  }
  return DEFAULT_PINTEREST_ADS_COUNTRY;
}

/** Matches top filter bar + ad cards — one surface with header + inline scrape controls */
const platformSectionPanelClass =
  "mb-6 overflow-hidden rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md shadow-[0_4px_24px_rgba(31,38,135,0.05)]";
const platformSelectClass =
  "h-9 min-w-[9.5rem] max-w-[min(100%,20rem)] rounded-xl border border-white/70 bg-white/95 px-3 pr-9 text-[13px] font-medium text-[#343434] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] focus:border-[#93c5fd] cursor-pointer";
const platformScrapeToggleBarClass =
  "border-t border-[#DDF1FD]/30 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.35)_100%)]";
/** Row: Scrape settings (left) + Refresh only (right) — matches platform cards. */
const platformScrapeActionsRowClass = `flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 ${platformScrapeToggleBarClass}`;
const platformScrapeToggleTextButtonClass =
  "min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#475569] transition-colors hover:bg-white/50";
const platformRefreshOnlyButtonClass =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-[13px] font-medium text-[#4b5563] transition-colors hover:border-[#DDF1FD] hover:bg-white disabled:pointer-events-none disabled:opacity-50 sm:w-auto";
const platformScrapeInputClass =
  "h-9 w-full min-w-0 rounded-xl border border-white/70 bg-white/95 px-2.5 text-[13px] text-[#343434] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] sm:max-w-[11rem]";
const platformScrapeFieldsGridClass =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

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
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-[#dadce0] bg-white text-left shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition-colors hover:border-[#c7c7c7]">
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
              className="block shrink-0 bg-[#f8f9fa]"
            >
              {!creativeImgFailed ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="max-h-[min(320px,42vh)] w-full object-contain object-center"
                  onError={() => setCreativeImgFailed(true)}
                />
              ) : (
                <div className="flex min-h-[min(160px,28vh)] w-full items-center justify-center bg-[#f1f3f4] px-3 text-center text-[12px] text-[#64748b]">
                  No preview
                </div>
              )}
            </a>
          ) : null}
          {showCreativePreviewLinkRow ? (
            <div className="shrink-0 bg-[#fafafa] px-3 py-2">
              <a
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1a73e8] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                Open creative preview
              </a>
            </div>
          ) : null}
          <div
            className={`flex min-h-0 flex-1 flex-col bg-white p-4 ${hasCreativeImageAsset || showCreativePreviewLinkRow ? "border-t border-[#e8eaed]" : ""}`}
          >
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
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)]">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video shrink-0 overflow-hidden bg-[#0f0f0f]"
      >
        {showPoster ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-contain object-center"
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
      <div className="flex min-h-0 flex-1 gap-3 p-3">
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
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#f1f5f9] px-3 pb-3 pt-0">
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
            <BrandLogoThumb src={brand.logoUrl ?? ""} alt={ad.advertiser} className="bg-[#f3f4f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-[#0a66c2]">{ad.advertiser}</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">Promoted</p>
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

function MicrosoftFeedAdCard({
  ad,
  brand,
}: {
  ad: MicrosoftAdCard;
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
            <p className="font-semibold text-[15px] text-[#0078d4]">{ad.advertiser}</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">Microsoft Advertising (EEA)</p>
            {ad.impressionsRange ? (
              <p className="text-[11px] text-[#9ca3af] mt-1 tabular-nums">{ad.impressionsRange} impressions</p>
            ) : null}
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
      <a
        href={ad.adUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 flex-col min-h-0 bg-[#f9fafb] border-y border-[#e5e7eb] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0078d4]"
      >
        {ad.img ? (
          <div className="flex min-h-[160px] flex-1 items-center justify-center overflow-auto bg-[#f3f4f6] px-2 py-3">
            <img
              src={ad.img}
              alt=""
              className="max-w-full max-h-[min(360px,42vh)] w-auto h-auto object-contain object-center"
            />
          </div>
        ) : (
          <div className="flex w-full flex-1 min-h-[168px] flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#e8f4fc] via-[#f3f4f6] to-[#eef2ff] px-4 py-4 text-center border-b border-[#e5e7eb]">
            <p className="text-[13px] font-semibold text-[#374151] line-clamp-2">No creative preview</p>
            <p className="text-[12px] text-[#64748b] leading-snug max-w-[280px]">
              Microsoft’s EEA transparency feed often lists copy and landing URLs only; image URLs are not always exposed to the scraper. Open the ad below to see the live creative.
            </p>
          </div>
        )}
        <div className="shrink-0 bg-white p-4">
          <p className="font-semibold text-[15px] text-[#374151] break-words [overflow-wrap:anywhere] text-pretty leading-snug">{ad.headline}</p>
          <p className="text-[13px] text-[#6b7280] mt-0.5 break-all [overflow-wrap:anywhere]">{ad.url}</p>
        </div>
      </a>
    </article>
  );
}

const tabs = [
  { id: "ads library", label: "Ads Library", icon: Library },
  { id: "strategy overview", label: "Strategy Overview", icon: BarChart3 },
  { id: "comparison", label: "Comparison to Your Brand", icon: GitCompareArrows },
  { id: "AI insight", label: "AI Insight", icon: Sparkles },
] as const;

const DEFAULT_BRAND = {
  name: "MyFitnessPal",
  domain: "myfitnesspal.com",
  logoUrl: "https://play-lh.googleusercontent.com/iGPZDsKZoF58BABAEIebIQk_X1sdYHviEJAwUyoYyJO4L-bN8XA6yWiXuBJcVJwIEc4wHSvxWjbFU23Y7cn1sMo",
  handle: "myfitnesspal",
  color: "#0066EE",
};

function parseBrandFromUrl(brandParam: string | null): typeof DEFAULT_BRAND | null {
  if (!brandParam) return null;
  try {
    const parsed = JSON.parse(brandParam) as { name?: string; domain?: string; logoUrl?: string };
    if (parsed?.name && parsed?.domain) {
      const handle = parsed.domain.split(".")[0] || parsed.name.toLowerCase().replace(/\s+/g, "");
      return {
        name: parsed.name,
        domain: parsed.domain,
        logoUrl: parsed.logoUrl ?? DEFAULT_BRAND.logoUrl,
        handle,
        color: DEFAULT_BRAND.color,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function CompetitorContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url") || "myfitnesspal.com";
  const brandParam = searchParams.get("brand");
  const idsParam = searchParams.get("ids");
  const channelsParam = searchParams.get("channels") ?? "";
  const isConfirmed = searchParams.get("confirmed") === "1";
  const discoveredBrand = parseBrandFromUrl(brandParam);
  /** Apify-backed platforms to fetch — from `?channels=` (discovery); omit param = all API-backed platforms */
  const adsPlatforms: AdsLibraryPlatform[] = useMemo(() => {
    if (!channelsParam.trim()) {
      return ALL_ADS_API_PLATFORMS;
    }
    return channelsQueryToAdsPlatforms(channelsParam.split(","));
  }, [channelsParam]);
  const platformIds = useMemo(() => {
    if (!idsParam?.trim()) return null;
    try {
      return JSON.parse(idsParam) as Record<string, string>;
    } catch {
      return null;
    }
  }, [idsParam]);
  const [activeTab, setActiveTab] = useState("ads library");
  const [metaAdsModalOpen, setMetaAdsModalOpen] = useState(false);
  const [googleAdsModalOpen, setGoogleAdsModalOpen] = useState(false);
  const [linkedInAdsModalOpen, setLinkedInAdsModalOpen] = useState(false);
  const [tiktokAdsModalOpen, setTiktokAdsModalOpen] = useState(false);
  const [microsoftAdsModalOpen, setMicrosoftAdsModalOpen] = useState(false);
  const [pinterestAdsModalOpen, setPinterestAdsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [metaScrapeSettingsOpen, setMetaScrapeSettingsOpen] = useState(false);
  const [googleScrapeSettingsOpen, setGoogleScrapeSettingsOpen] = useState(false);
  const [tiktokScrapeSettingsOpen, setTiktokScrapeSettingsOpen] = useState(false);
  const [pinterestScrapeSettingsOpen, setPinterestScrapeSettingsOpen] = useState(false);
  const [linkedInScrapeSettingsOpen, setLinkedInScrapeSettingsOpen] = useState(false);
  const [microsoftScrapeSettingsOpen, setMicrosoftScrapeSettingsOpen] = useState(false);
  const [scrapeFields, setScrapeFields] = useState<ScrapeRequestFields>(() => readScrapeRequestFieldsFromStorage());
  const [tiktokRegion, setTiktokRegion] = useState(readStoredTiktokRegion);
  const [pinterestCountry, setPinterestCountry] = useState(readStoredPinterestCountry);
  const [googleRegion, setGoogleRegion] = useState(readStoredGoogleRegion);
  const [googleResultsLimit, setGoogleResultsLimit] = useState(readStoredGoogleResultsLimit);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accountLastScrapedAt, setAccountLastScrapedAt] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    writeScrapeRequestFieldsToStorage(scrapeFields);
  }, [scrapeFields]);

  const patchScrape = <K extends keyof ScrapeRequestFields>(key: K, value: ScrapeRequestFields[K]) => {
    setScrapeFields((prev) => ({ ...prev, [key]: value }));
  };

  const googleRegionOptions = useMemo(() => buildGoogleAdsRegionOptions(), []);

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

  const brand = discoveredBrand ?? (() => {
    const domain = urlParam.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || urlParam;
    const handle = domain.split(".")[0] ?? domain;
    const name = handle.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    return {
      name: name || urlParam,
      domain,
      handle,
      logoUrl: DEFAULT_BRAND.logoUrl,
      color: DEFAULT_BRAND.color,
    };
  })();
  const myBrand = useActiveBrand();

  useEffect(() => {
    upsertSidebarCompetitor({
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
        channels: channelsParam ? channelsParam.split(",").filter(Boolean) : undefined,
        confirmed: isConfirmed,
      },
      pending: false,
    });
  }, [brand.name, brand.domain, brand.logoUrl, channelsParam, isConfirmed, platformIds]);

  const {
    data: adLib,
    loading: adLibLoading,
    googleRefreshing,
    metaRefreshing,
    tiktokRefreshing,
    pinterestRefreshing,
    linkedinRefreshing,
    microsoftRefreshing,
    fetchError: adLibFetchError,
    configured: adsApiConfigured,
    refresh: refreshAdLibrary,
    refreshGoogleAds,
    refreshMetaAds,
    refreshTikTokAds,
    refreshPinterestAds,
    refreshLinkedInAds,
    refreshMicrosoftAds,
  } = useAdLibrary(
    { name: brand.name, domain: brand.domain, logoUrl: brand.logoUrl },
    platformIds,
    adsPlatforms,
    isConfirmed,
    tiktokRegion,
    googleRegion,
    googleResultsLimit,
    scrapeFields,
    pinterestCountry
  );

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
    const list = await fetchSavedCompetitorsFromAccount();
    if (list.length > 0) {
      saveSidebarCompetitors(list as SidebarCompetitor[]);
    }
  }, []);

  const fetchMeta = adsPlatforms.includes("meta");
  const fetchGoogle = adsPlatforms.includes("google");
  const fetchLinkedIn = adsPlatforms.includes("linkedin");
  const fetchTikTok = adsPlatforms.includes("tiktok");
  const fetchMicrosoft = adsPlatforms.includes("microsoft");
  const fetchPinterest = adsPlatforms.includes("pinterest");

  const googleRegionRefetchReadyRef = useRef(false);
  useEffect(() => {
    if (!isConfirmed || !fetchGoogle) return;
    if (!googleRegionRefetchReadyRef.current) {
      googleRegionRefetchReadyRef.current = true;
      return;
    }
    void refreshGoogleAds();
  }, [googleRegion, isConfirmed, fetchGoogle, refreshGoogleAds]);

  const googleLimitRefetchReadyRef = useRef(false);
  useEffect(() => {
    if (!isConfirmed || !fetchGoogle) return;
    if (!googleLimitRefetchReadyRef.current) {
      googleLimitRefetchReadyRef.current = true;
      return;
    }
    void refreshGoogleAds();
  }, [googleResultsLimit, isConfirmed, fetchGoogle, refreshGoogleAds]);

  const tiktokRegionRefetchReadyRef = useRef(false);
  useEffect(() => {
    if (!isConfirmed || !fetchTikTok) return;
    if (!tiktokRegionRefetchReadyRef.current) {
      tiktokRegionRefetchReadyRef.current = true;
      return;
    }
    void refreshTikTokAds();
  }, [tiktokRegion, isConfirmed, fetchTikTok, refreshTikTokAds]);

  const pinterestCountryRefetchReadyRef = useRef(false);
  useEffect(() => {
    if (!isConfirmed || !fetchPinterest) return;
    if (!pinterestCountryRefetchReadyRef.current) {
      pinterestCountryRefetchReadyRef.current = true;
      return;
    }
    void refreshPinterestAds();
  }, [pinterestCountry, isConfirmed, fetchPinterest, refreshPinterestAds]);

  const metaAds = useMemo(() => adLib?.meta?.ads ?? [], [adLib?.meta?.ads]);
  const googleRows = useMemo(() => adLib?.google?.rows ?? [], [adLib?.google?.rows]);
  const linkedinAds = useMemo(() => adLib?.linkedin?.ads ?? [], [adLib?.linkedin?.ads]);
  const tiktokAds = useMemo(() => adLib?.tiktok?.ads ?? [], [adLib?.tiktok?.ads]);
  const microsoftAds = useMemo(() => adLib?.microsoft?.ads ?? [], [adLib?.microsoft?.ads]);
  const pinterestAds = useMemo(() => adLib?.pinterest?.ads ?? [], [adLib?.pinterest?.ads]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredMetaAds = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? metaAds.filter((ad) =>
          [ad.pageName, ad.headline, ad.desc, ad.subtext, ad.cta]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : metaAds;
    return [...out].sort((a, b) => {
      if (sortBy === "engagement") {
        return (b.impressionsIndex ?? -1) - (a.impressionsIndex ?? -1);
      }
      if (sortBy === "platform") {
        return a.pageName.localeCompare(b.pageName);
      }
      return (b.startedAt ?? 0) - (a.startedAt ?? 0);
    });
  }, [metaAds, normalizedSearch, sortBy]);
  const filteredGoogleRows = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? googleRows.filter((ad) =>
          JSON.stringify(ad).toLowerCase().includes(q)
        )
      : googleRows;
    return [...out].sort((a, b) => {
      if (sortBy === "platform") return a.type.localeCompare(b.type);
      return String(b.id).localeCompare(String(a.id));
    });
  }, [googleRows, normalizedSearch, sortBy]);
  const filteredLinkedInAds = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? linkedinAds.filter((ad) =>
          [ad.advertiser, ad.headline, ad.desc, ad.url].join(" ").toLowerCase().includes(q)
        )
      : linkedinAds;
    return [...out].sort((a, b) => {
      if (sortBy === "platform") return a.advertiser.localeCompare(b.advertiser);
      return String(b.id).localeCompare(String(a.id));
    });
  }, [linkedinAds, normalizedSearch, sortBy]);
  const filteredTikTokAds = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? tiktokAds.filter((ad) =>
          [ad.advertiser, ad.headline, ad.desc, ad.url].join(" ").toLowerCase().includes(q)
        )
      : tiktokAds;
    return [...out].sort((a, b) => {
      if (sortBy === "platform") return a.advertiser.localeCompare(b.advertiser);
      return String(b.id).localeCompare(String(a.id));
    });
  }, [tiktokAds, normalizedSearch, sortBy]);
  const filteredMicrosoftAds = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? microsoftAds.filter((ad) =>
          [ad.advertiser, ad.headline, ad.desc, ad.url].join(" ").toLowerCase().includes(q)
        )
      : microsoftAds;
    return [...out].sort((a, b) => {
      if (sortBy === "platform") return a.advertiser.localeCompare(b.advertiser);
      return String(b.id).localeCompare(String(a.id));
    });
  }, [microsoftAds, normalizedSearch, sortBy]);
  const filteredPinterestAds = useMemo(() => {
    const q = normalizedSearch;
    const out = q
      ? pinterestAds.filter((ad) =>
          [ad.advertiser, ad.headline, ad.desc, ad.url].join(" ").toLowerCase().includes(q)
        )
      : pinterestAds;
    return [...out].sort((a, b) => {
      if (sortBy === "platform") return a.advertiser.localeCompare(b.advertiser);
      return String(b.id).localeCompare(String(a.id));
    });
  }, [pinterestAds, normalizedSearch, sortBy]);

  /** Platforms with more scraped ads render first; unconnected placeholders stay below this block. */
  const platformOrder = useMemo(() => {
    type P = "meta" | "google" | "linkedin" | "tiktok" | "microsoft" | "pinterest";
    const active: P[] = [];
    if (fetchMeta) active.push("meta");
    if (fetchGoogle) active.push("google");
    if (fetchLinkedIn) active.push("linkedin");
    if (fetchTikTok) active.push("tiktok");
    if (fetchMicrosoft) active.push("microsoft");
    if (fetchPinterest) active.push("pinterest");
    if (adLibLoading) {
      return Object.fromEntries(active.map((p, i) => [p, i])) as Record<P, number>;
    }
    const counts: Record<P, number> = {
      meta: filteredMetaAds.length,
      google: filteredGoogleRows.length,
      linkedin: filteredLinkedInAds.length,
      tiktok: filteredTikTokAds.length,
      microsoft: filteredMicrosoftAds.length,
      pinterest: filteredPinterestAds.length,
    };
    const sorted = [...active].sort((a, b) => {
      const diff = counts[b] - counts[a];
      if (diff !== 0) return diff;
      return active.indexOf(a) - active.indexOf(b);
    });
    return Object.fromEntries(sorted.map((p, i) => [p, i])) as Record<P, number>;
  }, [
    fetchMeta,
    fetchGoogle,
    fetchLinkedIn,
    fetchTikTok,
    fetchMicrosoft,
    fetchPinterest,
    adLibLoading,
    filteredMetaAds.length,
    filteredGoogleRows.length,
    filteredLinkedInAds.length,
    filteredTikTokAds.length,
    filteredMicrosoftAds.length,
    filteredPinterestAds.length,
  ]);

  const confirmHref = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("confirmed", "1");
    return `${pathname}?${next.toString()}`;
  }, [pathname, searchParams]);

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen">
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
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <button
                type="button"
                title="Runs a new Apify scrape for Meta, Google, LinkedIn, TikTok, Microsoft, and Pinterest ads (uses credits). Page reload alone does not scrape."
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await refreshAdLibrary();
                    await syncSavedCompetitorsFromAccount();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                className="h-9 px-3.5 flex items-center gap-2 bg-white/80 border border-white/60 rounded-xl text-[13px] font-medium text-[#4b5563] hover:bg-white hover:border-[#DDF1FD] transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Rescrape ads
              </button>
              <Link
                href="/dashboard"
                className="h-9 px-4 flex items-center gap-2 bg-[#343434] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2a2a2a] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add competitor
              </Link>
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

        {/* Filters (Only for Ads Library) */}
        {activeTab === 'ads library' && (
          <div className="flex flex-col gap-2 px-6 sm:px-8 lg:px-10 py-3.5 bg-[#DDF1FD]/20 border-t border-white/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64 lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ads by headline, platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-white/80 border border-white/60 rounded-xl text-[13px] text-[#343434] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] focus:border-[#DDF1FD] transition-all shadow-sm"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((o) => !o)}
                  className="flex items-center gap-2 h-9 px-3.5 bg-white/80 border border-white/60 rounded-xl text-[13px] font-medium text-[#4b5563] hover:bg-white hover:border-[#DDF1FD] transition-colors shadow-sm"
                >
                  <Filter className="w-3.5 h-3.5 text-[#9ca3af]" />
                  Sort: {sortBy === "recent" ? "Recent" : sortBy === "platform" ? "Platform" : "Engagement"}
                  <ChevronDown className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform ${sortMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {sortMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-[#e0e3e8] rounded-xl shadow-xl z-20 min-w-[160px]">
                      {["recent", "platform", "engagement"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSortBy(opt);
                            setSortMenuOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors rounded-lg ${
                            sortBy === opt ? "bg-[#DDF1FD]/50 text-[#343434]" : "text-[#4b5563] hover:bg-[#DDF1FD]/20"
                          }`}
                        >
                          {opt === "recent" ? "Recent" : opt === "platform" ? "Platform" : "Engagement"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end shrink-0">
              <div className="flex bg-white p-0.5 rounded-lg border border-[#e0e3e8] shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#343434] text-white shadow-sm" : "text-[#6b7280] hover:text-[#343434]"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-[#343434] text-white shadow-sm" : "text-[#6b7280] hover:text-[#343434]"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'ads library' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-200">
            <div className="space-y-12">
            {(!adsApiConfigured || adLibFetchError) && !adLibLoading ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
                <span className="font-semibold">Live ads unavailable. </span>
                {adLibFetchError ||
                  "Add APIFY_TOKEN to .env.local and restart the dev server. Ads load via Apify actors for Meta, Google, LinkedIn, TikTok, Microsoft, and Pinterest."}
              </div>
            ) : null}
            {!isConfirmed ? (
              <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-4 text-[14px] text-[#1e3a8a] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Confirm the competitor details, then use <strong className="font-semibold">Rescrape ads</strong> when you want to load or refresh live ads (Apify: Meta, Google, LinkedIn, TikTok, Microsoft, Pinterest). Reloading the page uses your last saved scrape only.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(confirmHref)}
                  className="h-10 px-4 rounded-xl bg-[#1d4ed8] text-white text-[13px] font-semibold hover:bg-[#1e40af] transition-colors shrink-0"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {isConfirmed && adsPlatforms.length > 0 && adsApiConfigured && !adLibFetchError && !adLibLoading && adLib === null ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-[14px] text-slate-800">
                <span className="font-semibold">No saved ads for this competitor yet. </span>
                Click <strong className="font-semibold">Rescrape ads</strong> in the header to run Apify and load ads (uses credits).
              </div>
            ) : null}

            {adsPlatforms.length === 0 ? (
              <p className="text-[14px] text-[#6b7280] py-4">
                None of your selected channels use the live ads API (Meta, Google/YouTube, LinkedIn, TikTok, Microsoft, or Pinterest). Pick at least one in “Where should we look?” when searching, or add identifiers in discovery.
              </p>
            ) : null}

            <div className="flex flex-col gap-12">
            {/* Meta / Facebook — Apify */}
            {fetchMeta ? (
            <section style={{ order: platformOrder.meta ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/80 border border-white/60 flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
                      <MetaLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">Meta / Facebook</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {adLibLoading || metaRefreshing
                          ? metaRefreshing
                            ? "Refreshing Meta ads…"
                            : "Loading ads…"
                          : `${metaAds.length} active ads loaded (max ${scrapeFields.metaMaxAds} per request) from Ad Library`}
                        {adLib?.meta?.error && metaAds.length === 0 ? ` · ${adLib.meta?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!adLibLoading && !metaRefreshing && filteredMetaAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setMetaAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredMetaAds.length} ads
                    </button>
                  ) : null}
                </div>
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${metaScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setMetaScrapeSettingsOpen((v) => !v)}
                    aria-expanded={metaScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Meta filters</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
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
                  ) : null}
                </div>
                {metaScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#64748b]">
                      <span>
                        <span className="font-medium text-[#475569]">Scraped: </span>
                        {metaAds.length} ads
                      </span>
                    </div>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <input
                          type="number"
                          min={1}
                          max={ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM}
                          value={scrapeFields.metaMaxAds}
                          onChange={(e) =>
                            patchScrape(
                              "metaMaxAds",
                              Math.max(
                                1,
                                Math.min(Number(e.target.value) || 1, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM)
                              )
                            )
                          }
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Country</span>
                        <select
                          value={
                            META_COUNTRY_OPTIONS.some(
                              (o) => o.value === scrapeFields.metaCountry.trim().toUpperCase()
                            )
                              ? scrapeFields.metaCountry.trim().toUpperCase()
                              : "US"
                          }
                          onChange={(e) => patchScrape("metaCountry", e.target.value)}
                          className={platformSelectClass}
                        >
                          {META_COUNTRY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Start date</span>
                        <input
                          type="date"
                          value={scrapeFields.metaStartDate}
                          onChange={(e) => patchScrape("metaStartDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">End date</span>
                        <input
                          type="date"
                          value={scrapeFields.metaEndDate}
                          onChange={(e) => patchScrape("metaEndDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Sort</span>
                        <select
                          value={scrapeFields.metaSortBy}
                          onChange={(e) => patchScrape("metaSortBy", e.target.value)}
                          className={platformSelectClass}
                        >
                          {META_SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || metaRefreshing ? (
                  [0, 1, 2].map((k) => (
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
                  ))
                ) : filteredMetaAds.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No Meta ads matched your filters. Try changing search or sort, or run a fresh scrape.
                  </p>
                ) : (
                  filteredMetaAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <MetaAdCard key={ad.id} ad={ad} viewMode={viewMode} brand={brand} />
                  ))
                )}
              </div>
              <MetaAdsAllModal
                open={metaAdsModalOpen}
                onClose={() => setMetaAdsModalOpen(false)}
                ads={filteredMetaAds}
                viewMode={viewMode}
                brand={brand}
              />
            </section>
            ) : null}

            {/* Google + YouTube — Apify Google Ads Transparency scraper */}
            {fetchGoogle ? (
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
                        {adLibLoading || googleRefreshing
                          ? "Loading…"
                          : `${googleRows.length} loaded (max ${googleResultsLimit} per request) from Ads Transparency`}
                        {adLib?.google?.error && googleRows.length === 0 ? ` · ${adLib.google?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end self-start">
                    {!adLibLoading && !googleRefreshing && filteredGoogleRows.length > META_ADS_INLINE_PREVIEW ? (
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
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${googleScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setGoogleScrapeSettingsOpen((v) => !v)}
                    aria-expanded={googleScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Region & max ads</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
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
                  ) : null}
                </div>
                {googleScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium text-[#475569]">Scraped: </span>
                      {filteredGoogleRows.length} ads in this view
                    </p>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
                        <span className="text-[11px] font-medium text-[#64748b]">Country / region</span>
                        <select
                          id="google-region-select"
                          value={googleRegion}
                          onChange={(e) => {
                            const v = normalizeGoogleAdsRegion(e.target.value);
                            setGoogleRegion(v);
                            try {
                              sessionStorage.setItem("rival-google-ads-region", v);
                            } catch {
                              /* ignore */
                            }
                          }}
                          className={platformSelectClass}
                        >
                          {googleRegionOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <select
                          id="google-limit-select"
                          value={googleResultsLimit}
                          onChange={(e) => {
                            const v = normalizeGoogleAdsResultsLimit(Number(e.target.value));
                            setGoogleResultsLimit(v);
                            try {
                              sessionStorage.setItem("rival-google-ads-results-limit", String(v));
                            } catch {
                              /* ignore */
                            }
                          }}
                          className={platformSelectClass}
                        >
                          {GOOGLE_ADS_RESULTS_LIMIT_CHOICES.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || googleRefreshing ? (
                  [0, 1, 2].map((k) => (
                    <div key={k} className="min-h-[280px] rounded-2xl bg-white border border-[#e5e7eb] animate-pulse">
                      <div className="h-36 bg-[#f3f4f6]" />
                      <div className="p-4 space-y-2">
                        <div className="h-3.5 w-24 rounded bg-[#e5e7eb]" />
                        <div className="h-4 w-4/5 rounded bg-[#e5e7eb]" />
                        <div className="h-3.5 w-full rounded bg-[#e5e7eb]" />
                      </div>
                    </div>
                  ))
                ) : filteredGoogleRows.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No Google ads returned for this domain. Confirm the website domain from discovery.
                  </p>
                ) : (
                  filteredGoogleRows.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <GoogleAdRowCard key={ad.id} ad={ad} brand={brand} />
                  ))
                )}
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
                viewMode={viewMode}
                renderItem={(ad) => <GoogleAdRowCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {/* LinkedIn — Apify */}
            {fetchLinkedIn ? (
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
                        {adLibLoading || linkedinRefreshing
                          ? linkedinRefreshing
                            ? "Refreshing LinkedIn ads…"
                            : "Loading…"
                          : `${linkedinAds.length} loaded (max ${scrapeFields.linkedinMaxAds} per request) from LinkedIn Ads Library`}
                        {adLib?.linkedin?.error && linkedinAds.length === 0 ? ` · ${adLib.linkedin?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!adLibLoading && !linkedinRefreshing && filteredLinkedInAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setLinkedInAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredLinkedInAds.length} ads
                    </button>
                  ) : null}
                </div>
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${linkedInScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setLinkedInScrapeSettingsOpen((v) => !v)}
                    aria-expanded={linkedInScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Date & country</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
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
                  ) : null}
                </div>
                {linkedInScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium text-[#475569]">Scraped: </span>
                      {linkedinAds.length} ads
                    </p>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <input
                          type="number"
                          min={1}
                          max={ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM}
                          value={scrapeFields.linkedinMaxAds}
                          onChange={(e) =>
                            patchScrape(
                              "linkedinMaxAds",
                              Math.max(
                                1,
                                Math.min(Number(e.target.value) || 1, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM)
                              )
                            )
                          }
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
                        <span className="text-[11px] font-medium text-[#64748b]">Timeframe (activity)</span>
                        <select
                          value={scrapeFields.linkedinDateRange}
                          onChange={(e) => patchScrape("linkedinDateRange", e.target.value)}
                          className={platformSelectClass}
                        >
                          {LINKEDIN_DATE_RANGE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Country</span>
                        <select
                          value={
                            LINKEDIN_COUNTRY_OPTIONS.some(
                              (o) => o.value === scrapeFields.linkedinCountryCode.trim().toUpperCase()
                            )
                              ? scrapeFields.linkedinCountryCode.trim().toUpperCase()
                              : ""
                          }
                          onChange={(e) => patchScrape("linkedinCountryCode", e.target.value)}
                          className={platformSelectClass}
                        >
                          {LINKEDIN_COUNTRY_OPTIONS.map((o) => (
                            <option key={o.value === "" ? "_all" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || linkedinRefreshing ? (
                  [0, 1, 2].map((k) => (
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
                  ))
                ) : filteredLinkedInAds.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No LinkedIn ads returned. Add a LinkedIn company URL in discovery or try refreshing.
                  </p>
                ) : (
                  filteredLinkedInAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <LinkedInFeedAdCard key={ad.id} ad={ad} brand={brand} />
                  ))
                )}
              </div>
              <AdsLibraryAllModal
                open={linkedInAdsModalOpen}
                onClose={() => setLinkedInAdsModalOpen(false)}
                title="LinkedIn ads"
                logo={<LinkedInLogo className="w-5 h-5" />}
                ads={filteredLinkedInAds}
                getKey={(ad) => ad.id}
                viewMode={viewMode}
                renderItem={(ad) => <LinkedInFeedAdCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {/* TikTok — Apify */}
            {fetchTikTok ? (
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
                        {adLibLoading || tiktokRefreshing
                          ? tiktokRefreshing
                            ? "Refreshing TikTok ads…"
                            : "Loading…"
                          : `${tiktokAds.length} loaded (max ${scrapeFields.tiktokMaxAds} per request) from TikTok Ads Library`}
                        {adLib?.tiktok?.error && tiktokAds.length === 0 ? ` · ${adLib.tiktok?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!adLibLoading && !tiktokRefreshing && filteredTikTokAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setTiktokAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredTikTokAds.length} ads
                    </button>
                  ) : null}
                </div>
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${tiktokScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setTiktokScrapeSettingsOpen((v) => !v)}
                    aria-expanded={tiktokScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Region</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
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
                  ) : null}
                </div>
                {tiktokScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium text-[#475569]">Scraped: </span>
                      {tiktokAds.length} ads
                    </p>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <input
                          type="number"
                          min={1}
                          max={ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM}
                          value={scrapeFields.tiktokMaxAds}
                          onChange={(e) =>
                            patchScrape(
                              "tiktokMaxAds",
                              Math.max(
                                1,
                                Math.min(Number(e.target.value) || 1, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM)
                              )
                            )
                          }
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Start date</span>
                        <input
                          type="date"
                          value={scrapeFields.tiktokStartDate}
                          onChange={(e) => patchScrape("tiktokStartDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">End date</span>
                        <input
                          type="date"
                          value={scrapeFields.tiktokEndDate}
                          onChange={(e) => patchScrape("tiktokEndDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
                        <span className="text-[11px] font-medium text-[#64748b]">Country / region</span>
                        <select
                          id="tiktok-region-select"
                          value={tiktokRegion}
                          onChange={(e) => {
                            const v = normalizeTikTokAdsRegion(e.target.value);
                            setTiktokRegion(v);
                            try {
                              sessionStorage.setItem("rival-tiktok-ads-region", v);
                            } catch {
                              /* ignore */
                            }
                          }}
                          className={platformSelectClass}
                        >
                          {TIKTOK_ADS_LIBRARY_REGION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || tiktokRefreshing ? (
                  [0, 1, 2].map((k) => (
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
                  ))
                ) : filteredTikTokAds.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No TikTok ads returned. The search uses your brand name as the advertiser query on TikTok Ads Library.
                  </p>
                ) : (
                  filteredTikTokAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <TikTokAdCard key={ad.id} ad={ad} />
                  ))
                )}
              </div>
              <AdsLibraryAllModal
                open={tiktokAdsModalOpen}
                onClose={() => setTiktokAdsModalOpen(false)}
                title="TikTok ads"
                logo={<TikTokLogo className="w-5 h-5" />}
                ads={filteredTikTokAds}
                getKey={(ad) => ad.id}
                viewMode={viewMode}
                renderItem={(ad) => <TikTokAdCard ad={ad} />}
              />
            </section>
            ) : null}

            {/* Microsoft Advertising — Apify (EEA transparency) */}
            {fetchMicrosoft ? (
            <section style={{ order: platformOrder.microsoft ?? 0 }}>
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
                      <MicrosoftLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">Microsoft Ads</h3>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">
                        {adLibLoading || microsoftRefreshing
                          ? microsoftRefreshing
                            ? "Refreshing Microsoft ads…"
                            : "Loading…"
                          : `${microsoftAds.length} loaded (max ${scrapeFields.microsoftMaxSearchResults} per request) from Microsoft Advertising Library`}
                        {adLib?.microsoft?.error && microsoftAds.length === 0 ? ` · ${adLib.microsoft?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!adLibLoading && !microsoftRefreshing && filteredMicrosoftAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setMicrosoftAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredMicrosoftAds.length} ads
                    </button>
                  ) : null}
                </div>
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${microsoftScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setMicrosoftScrapeSettingsOpen((v) => !v)}
                    aria-expanded={microsoftScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Dates & markets</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
                    <button
                      type="button"
                      disabled={microsoftRefreshing || adLibLoading || !fetchMicrosoft}
                      onClick={async () => {
                        try {
                          await refreshMicrosoftAds();
                          await syncSavedCompetitorsFromAccount();
                        } catch {
                          /* handled in hook */
                        }
                      }}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Microsoft only (bypasses cache). Other platforms unchanged."
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${microsoftRefreshing ? "animate-spin" : ""}`} />
                      Refresh Microsoft only
                    </button>
                  ) : null}
                </div>
                {microsoftScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium text-[#475569]">Scraped: </span>
                      {microsoftAds.length} ads
                    </p>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <input
                          type="number"
                          min={24}
                          max={1000}
                          value={scrapeFields.microsoftMaxSearchResults}
                          onChange={(e) =>
                            patchScrape(
                              "microsoftMaxSearchResults",
                              Math.max(24, Math.min(Number(e.target.value) || 24, 1000))
                            )
                          }
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
                        <span className="text-[11px] font-medium text-[#64748b]">Country</span>
                        <select
                          value={
                            MICROSOFT_MARKET_OPTIONS.some(
                              (o) => o.value === scrapeFields.microsoftCountryCode.trim().replace(/\D/g, "")
                            )
                              ? scrapeFields.microsoftCountryCode.trim().replace(/\D/g, "")
                              : "66"
                          }
                          onChange={(e) => patchScrape("microsoftCountryCode", e.target.value)}
                          className={platformSelectClass}
                        >
                          {MICROSOFT_MARKET_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Start date</span>
                        <input
                          type="date"
                          value={scrapeFields.microsoftStartDate}
                          onChange={(e) => patchScrape("microsoftStartDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">End date</span>
                        <input
                          type="date"
                          value={scrapeFields.microsoftEndDate}
                          onChange={(e) => patchScrape("microsoftEndDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || microsoftRefreshing ? (
                  [0, 1, 2].map((k) => (
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
                  ))
                ) : filteredMicrosoftAds.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No Microsoft Ads returned for this brand in the EEA library. Try a different spelling or confirm the advertiser runs ads in covered regions (EU/EEA).
                  </p>
                ) : (
                  filteredMicrosoftAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <MicrosoftFeedAdCard key={ad.id} ad={ad} brand={brand} />
                  ))
                )}
              </div>
              <AdsLibraryAllModal
                open={microsoftAdsModalOpen}
                onClose={() => setMicrosoftAdsModalOpen(false)}
                title="Microsoft Ads"
                logo={<MicrosoftLogo className="w-5 h-5" />}
                ads={filteredMicrosoftAds}
                getKey={(ad) => ad.id}
                viewMode={viewMode}
                renderItem={(ad) => <MicrosoftFeedAdCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}

            {/* Pinterest Ad Transparency — Apify (EU / BR / TR; not US) */}
            {fetchPinterest ? (
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
                        {adLibLoading || pinterestRefreshing
                          ? pinterestRefreshing
                            ? "Refreshing Pinterest ads…"
                            : "Loading…"
                          : `${pinterestAds.length} loaded (max ${scrapeFields.pinterestMaxResults} per request) from Pinterest`}
                        {adLib?.pinterest?.error && pinterestAds.length === 0 ? ` · ${adLib.pinterest?.error}` : ""}
                      </p>
                    </div>
                  </div>
                  {!adLibLoading && !pinterestRefreshing && filteredPinterestAds.length > META_ADS_INLINE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setPinterestAdsModalOpen(true)}
                      className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[13px] font-semibold text-[#343434] hover:bg-white hover:border-[#DDF1FD] transition-colors self-start"
                    >
                      View all {filteredPinterestAds.length} ads
                    </button>
                  ) : null}
                </div>
                <div className={platformScrapeActionsRowClass}>
                  <button
                    type="button"
                    className={`${platformScrapeToggleTextButtonClass} ${pinterestScrapeSettingsOpen ? "bg-white/55" : ""}`}
                    onClick={() => setPinterestScrapeSettingsOpen((v) => !v)}
                    aria-expanded={pinterestScrapeSettingsOpen}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
                      <span className="truncate">Scrape settings</span>
                      <span className="hidden text-[11px] font-normal text-[#94a3b8] sm:inline">Market region</span>
                    </span>
                  </button>
                  {adsApiConfigured ? (
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
                  ) : null}
                </div>
                {pinterestScrapeSettingsOpen ? (
                  <div className="border-t border-white/50 px-4 pb-4 pt-3 sm:px-5 space-y-4">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium text-[#475569]">Scraped: </span>
                      {pinterestAds.length} ads
                    </p>
                    <div className={platformScrapeFieldsGridClass}>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Max ads</span>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={scrapeFields.pinterestMaxResults}
                          onChange={(e) =>
                            patchScrape(
                              "pinterestMaxResults",
                              Math.max(1, Math.min(Number(e.target.value) || 1, 1000))
                            )
                          }
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Start date</span>
                        <input
                          type="date"
                          value={scrapeFields.pinterestStartDate}
                          onChange={(e) => patchScrape("pinterestStartDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">End date</span>
                        <input
                          type="date"
                          value={scrapeFields.pinterestEndDate}
                          onChange={(e) => patchScrape("pinterestEndDate", e.target.value)}
                          className={platformScrapeInputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Gender</span>
                        <select
                          value={scrapeFields.pinterestGender}
                          onChange={(e) => patchScrape("pinterestGender", e.target.value)}
                          className={platformSelectClass}
                        >
                          {PINTEREST_GENDER_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#64748b]">Age</span>
                        <select
                          value={scrapeFields.pinterestAge}
                          onChange={(e) => patchScrape("pinterestAge", e.target.value)}
                          className={platformSelectClass}
                        >
                          {PINTEREST_AGE_OPTIONS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
                        <span className="text-[11px] font-medium text-[#64748b]">Country</span>
                        <select
                          id="pinterest-country-select"
                          value={pinterestCountry}
                          onChange={(e) => {
                            const v = normalizePinterestAdsCountry(e.target.value);
                            setPinterestCountry(v);
                            try {
                              sessionStorage.setItem("rival-pinterest-ads-country", v);
                            } catch {
                              /* ignore */
                            }
                          }}
                          className={platformSelectClass}
                        >
                          {PINTEREST_ADS_COUNTRY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  ) : null}
              </div>
              <div className={`grid items-stretch gap-6 ${viewMode === "list" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                {adLibLoading || pinterestRefreshing ? (
                  [0, 1, 2].map((k) => (
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
                  ))
                ) : filteredPinterestAds.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] col-span-full py-6">
                    No Pinterest ads returned. We match by the handle from your Pinterest profile URL (or{" "}
                    <code className="text-[12px] bg-[#f4f4f5] px-1 rounded">ids.pinterestAdvertiserName</code>
                    ). Try a larger EU market, confirm the profile URL, or paste the advertiser label from Pinterest’s transparency UI. Small regions (e.g. LT) may have fewer disclosed rows than DE/FR.
                  </p>
                ) : (
                  filteredPinterestAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                    <PinterestFeedAdCard key={ad.id} ad={ad} brand={brand} />
                  ))
                )}
              </div>
              <AdsLibraryAllModal
                open={pinterestAdsModalOpen}
                onClose={() => setPinterestAdsModalOpen(false)}
                title="Pinterest ads"
                logo={<PinterestLogo className="w-5 h-5" />}
                ads={filteredPinterestAds}
                getKey={(ad) => ad.id}
                viewMode={viewMode}
                renderItem={(ad) => <PinterestFeedAdCard ad={ad} brand={brand} />}
              />
            </section>
            ) : null}
            </div>

            <UnconnectedPlatformPlaceholder title="Twitter / X" Logo={XLogo} logoClassName="text-[#0f1419]" compact />
            <UnconnectedPlatformPlaceholder title="Google Shopping" Logo={GoogleLogo} compact />
            {!fetchPinterest ? (
              <UnconnectedPlatformPlaceholder title="Pinterest" Logo={PinterestLogo} compact />
            ) : null}
            <UnconnectedPlatformPlaceholder title="Snapchat" Logo={SnapchatLogo} compact />

            <section aria-labelledby="reddit-ads-heading">
              <div className={platformSectionPanelClass}>
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
                      <RedditLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <h3 id="reddit-ads-heading" className="font-semibold text-[#343434] text-[16px] tracking-[-0.01em]">
                          Reddit
                        </h3>
                        <span className="inline-flex shrink-0 rounded-full bg-[#343434] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Active
                        </span>
                      </div>
                      <p className="text-[13px] text-[#6b7280] mt-0.5">Reddit Ads Library</p>
                    </div>
                  </div>
                </div>
                <div className={`${platformScrapeToggleBarClass} px-4 pb-5 pt-5 sm:px-5`}>
                  <div className="rounded-xl border border-[#e2e8f0] bg-white/70 px-4 py-3.5 text-[14px] leading-relaxed text-[#475569] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    No ads found.
                  </div>
                </div>
              </div>
            </section>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'strategy overview' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <StrategyOverview adLib={adLib} adLibLoading={adLibLoading} brand={brand} />
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 max-w-[860px] mx-auto w-full animate-in fade-in duration-200">
            <div className="mb-6">
              <h2 className="text-[18px] font-semibold text-[#343434]">Comparison to Your Brand</h2>
              <p className="text-[14px] text-[#71717a] mt-0.5">How <span className="font-medium text-[#3f3f46]">{brand.name}</span> stacks up against <span className="font-medium text-[#3f3f46]">{myBrand.name}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#e0e3e8] shadow-sm">
                    <BrandLogoThumb src={brand.logoUrl} alt={brand.name} className="bg-white" />
                  </div>
                  <p className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">{brand.name}</p>
                </div>
                <p className="text-[22px] font-bold text-[#343434] tracking-tight leading-tight">Freemium Volume</p>
                <p className="text-[13px] text-[#71717a] mt-1.5">60% of budget on app installs</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/60 shadow-sm">
                    {myBrand.logoUrl ? (
                      <BrandLogoThumb src={myBrand.logoUrl} alt={myBrand.name} className="bg-white" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: myBrand.color ?? "#343434" }}>{myBrand.badge}</div>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">{myBrand.name}</p>
                </div>
                <p className="text-[22px] font-bold text-[#343434] tracking-tight leading-tight">Direct Subscription</p>
                <p className="text-[13px] text-[#71717a] mt-1.5">Paid-first conversion model</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <h3 className="text-[14px] font-semibold text-[#343434] mb-2.5">Their Creator Strategy Is Outpacing {myBrand.name}&apos;s Paid Ads</h3>
                <p className="text-[14px] text-[#52525b] leading-relaxed">
                  MyFitnessPal partners with fitness and nutrition influencers to create &quot;what I eat in a day&quot; content that feels native to TikTok and Instagram. These creator-driven ads have 3-4x the engagement rate of {myBrand.name}&apos;s branded display banners. Their CPM on Meta is estimated 40% lower because the content looks organic and avoids ad fatigue.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <h3 className="text-[14px] font-semibold text-[#343434] mb-2.5">Where {myBrand.name} Wins</h3>
                <p className="text-[14px] text-[#52525b] leading-relaxed">
                  {myBrand.name}&apos;s onboarding-to-paid conversion rate is stronger because it doesn&apos;t give away core features for free. You also dominate branded search terms like &quot;calorie counter&quot; and &quot;weight loss app&quot; and have better retention among paying subscribers. But MyFitnessPal is capturing 5x more top-of-funnel users with their free tier, building a much larger retargeting pool.
                </p>
              </div>

              <div className="bg-[#DDF1FD]/40 rounded-2xl border border-[#DDF1FD] p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#343434] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#343434]">Recommendation for {myBrand.name}</h3>
                </div>
                <p className="text-[14px] text-[#343434]/90 leading-relaxed">
                  Consider launching a limited free tier or extended trial to compete with MFP&apos;s install volume. Invest in 3-5 creator partnerships for UGC-style video ads on Meta and TikTok — this alone could cut {myBrand.name}&apos;s CAC by 30-40% while dramatically expanding top-of-funnel reach.
                </p>
              </div>
            </div>
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
          />
        </div>
      )}

    </div>
  );
}

export default function CompetitorViewWrapper() {
  return (
    <Suspense fallback={<div className="flex-1 flex min-h-screen items-center justify-center font-semibold text-gray-500">Loading library...</div>}>
      <CompetitorContent />
    </Suspense>
  )
}
