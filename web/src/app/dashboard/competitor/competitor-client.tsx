"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import {
  Sparkles,
  BarChart2,
  Globe,
  RefreshCw,
  Clock,
  SatelliteDish,
  ExternalLink,
  Play,
  Video,
  Check,
  Lock,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";
import { setupGlobalCacheInvalidator } from "@/lib/cache/cache-invalidator";
import { evictBulkyLocalStorageCaches } from "@/lib/cache/storage-quota";
import { findSidebarRowForHost, resolveCompetitorViewFromSidebar } from "@/lib/competitor-view-resolve";
import { useActiveBrand } from "../brand-context";
import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";
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
import { AdLibraryAnalyticsPanel } from "@/components/ads-library/analytics-panel";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { GoogleAdFormatIcon } from "@/components/ads-library/google-ad-format-icon";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { AdsLibraryAllModal } from "@/components/ads-library/ads-library-all-modal";
import { MetaAdsAllModal } from "@/components/ads-library/meta-ads-all-modal";
import { AdDetailDrawer } from "@/components/ad-detail/ad-detail-drawer";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { TikTokAdCard } from "@/components/ads-library/tiktok-ad-card";
import { SavedAdsPanel } from "@/components/ads-library/saved-ads-panel";
import { PinterestAdCard } from "@/components/ads-library/pinterest-ad-card";
import { SnapchatAdCard } from "@/components/ads-library/snapchat-ad-card";
import {
  UnverifiedSourceBadge,
} from "@/components/ads-library/unverified-source-overlay";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { META_ADS_INLINE_PREVIEW } from "@/lib/ad-library/constants";
import {
  DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE,
  googleAdRowHasDashboardInlinePreview,
  linkedInAdHasDashboardInlinePreview,
  metaAdHasDashboardInlinePreview,
  pinterestAdHasDashboardInlinePreview,
  snapchatAdHasDashboardInlinePreview,
  tikTokAdHasDashboardInlinePreview,
} from "@/lib/ad-library/dashboard-inline-preview";
import {
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import { resolveAdsPlatformsForCompetitorView } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import {
  extractYouTubeVideoId,
  googleAdsExternalLinkLabel,
  isUsableGoogleStillImagePreviewUrl,
  youtubePosterCandidateUrls,
  youtubeThumbnailFromUrl,
  type GoogleAdRow,
  type LinkedInAdCard,
} from "@/lib/ad-library/normalize";
import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";
import {
  countActiveGoogleRows,
  countActiveLinkedInAds,
  countActiveMetaAds,
  countActivePinterestAds,
  countActiveSnapchatAds,
  countActiveTikTokAds,
} from "@/lib/ad-library/count-active-ads";
import {
  sortGoogleRowsActiveFirst,
  sortLinkedInAdsActiveFirst,
  sortMetaAdsActiveFirst,
  sortPinterestAdsActiveFirst,
  sortSnapchatAdsActiveFirst,
  sortTikTokAdsActiveFirst,
} from "@/lib/ad-library/sort-ads-active-first";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { RIVAL_BRANDS_UPDATED_EVENT } from "@/lib/account/profile-events";
import { CHANNELS, type ChannelId, DEFAULT_SELECTED_CHANNELS } from "@/components/channel-picker-modal";
import {
  adsProfileSetupV1,
  emptyWorkspaceScrapeRow,
  scrapeHintsToPlatformIds,
} from "@/lib/onboarding/workspace-ads-setup";
import type { AdsProfileSetup, WorkspaceAdsScrapeHints } from "@/lib/onboarding/workspace-ads-setup";
import {
  hoistLogoOntoRow,
  loadSidebarCompetitors,
  mergeAccountSidebarRowsWithLocalLibraryContext,
  normalizeCompetitorSlug,
  saveSidebarCompetitors,
  sidebarCompetitorsWithoutWorkspaceRow,
  SIDEBAR_COMPETITORS_EVENT,
  shouldSuppressSidebarUpsertForSlug,
  slugsLikelySameCompany,
  type SidebarCompetitor,
  upsertSidebarCompetitor,
} from "@/lib/sidebar-competitors";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import {
  mergeScrapeFieldsWithWorkspaceMarkets,
  readScrapeRequestFieldsFromStorage,
} from "@/lib/ad-library/scrape-request-fields";
import { ComparisonPage } from "@/components/comparison/comparison-page";
import { buildAdEvidenceText, buildDualBrandAdEvidenceText } from "@/lib/brand-comparison/build-ad-evidence";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { normalizeComparisonPayloadJson } from "@/lib/comparison/normalize-comparison-payload-json";
import {
  fetchSavedCompetitorsFromAccount,
  saveCompetitorToAccount,
  sidebarCompetitorToAccountPayload,
} from "@/lib/account/client";
import type { CompetitorPageBrand } from "@/lib/competitor-view-resolve";
import type { MarketingImprovementLlmResult } from "@/lib/workspace/run-marketing-improvement-llm";
import {
  buildGoogleTransparencyPreviewUrl,
  buildLinkedInAdLibraryPreviewUrl,
  buildMetaAdsLibraryPreviewUrl,
  buildPinterestAdsPreviewUrl,
  buildSnapchatAdsGalleryPreviewUrl,
  buildTikTokAdsLibraryPreviewUrl,
} from "@/lib/onboarding/ad-library-preview-urls";
import {
  countryFlagEmoji,
  DEFAULT_ONBOARDING_AD_MARKETS,
  ONBOARDING_AD_MARKET_CODES,
  ONBOARDING_AD_MARKETS,
} from "@/lib/onboarding/ad-markets";
import {
  COMPETITOR_PAGE_TABS,
  WORKSPACE_ADS_TAB,
  WORKSPACE_MARKETING_IMPROVEMENTS_TAB,
  findCompetitorTab,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { KeepMountedTab } from "@/components/competitor/keep-mounted-tab";
import { ActivityFeedTab } from "@/components/competitor/insights/activity-feed-tab";
import { CreativeTestsTab } from "@/components/competitor/tests-timeline/creative-tests-tab";
import { TimelineTab } from "@/components/competitor/tests-timeline/timeline-tab";
import {
  LandingPagesTab,
  type LandingPagesApiResponse,
  type SharedLandingPagesListCache,
} from "@/components/competitor/landing-pages-tab";
import { StrategyOverviewApp } from "@/components/strategy-overview/strategy-overview-app";
import { AudienceTab } from "@/components/competitor/audience-copy/audience-tab";
import { CopyVaultTab } from "@/components/competitor/audience-copy/copy-vault-tab";
import { AlertsTab } from "@/components/competitor/alerts/alerts-tab";
import {
  ADS_LIBRARY_UPDATED_EVENT,
  type AdsLibraryUpdatedDetail,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import {
  platformRefreshActionsRowClass,
  platformRefreshOnlyButtonClass,
  platformSectionPanelClass,
} from "@/components/dashboard/competitor/competitor-platform-styles";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import {
  readStoredGoogleRegion,
  readStoredPinterestCountry,
  readStoredTiktokRegion,
} from "@/components/dashboard/competitor/competitor-session-readers";
import { toast } from "sonner";
import type { ManualRefreshStatus } from "@/lib/billing/manual-refresh-status";

function normalizeDomainHostForAdsEvent(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0] ?? ""
  );
}

function formatSpySubtitle(fireUtcYmd: string): string {
  const [yStr, moStr, dStr] = fireUtcYmd.split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  const da = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return "";
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const wd = dt.toLocaleDateString(undefined, { weekday: "short" });
  const mon = dt.toLocaleDateString(undefined, { month: "short" });
  const dom = dt.getUTCDate();
  return `Last spy run: ${wd} ${mon} ${dom} (UTC)`;
}

/**
 * Inline Ads Library grid: at most {@link META_ADS_INLINE_PREVIEW} cards per platform.
 * Use 3 columns from `md` up so three cards span the full row (avoid `xl:grid-cols-4` with only 3 items,
 * which left an empty fourth column and looked left-clumped).
 */
const ADS_GRID_CLASS = "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3";

/** Matches Google Transparency + YouTube cards so mixed-format rows align in {@link ADS_GRID_CLASS}. */
const GOOGLE_MEDIA_FRAME_CLASS =
  "flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl";

const YOUTUBE_MEDIA_FRAME_CLASS =
  "relative flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0f0f0f]";

const GOOGLE_ARTICLE_MIN_HEIGHT_CLASS = "min-h-[440px] sm:min-h-[460px]";

/** Content region inside each platform card (below header + refresh). */
const platformAdsBodyShellClass =
  "border-t border-[#DDF1FD]/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.88)_0%,rgba(255,255,255,0.35)_100%)] px-4 pb-5 pt-5 sm:px-5";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatLastScrapedLine(iso: string | null | undefined): string {
  if (!iso) return "No scrape yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No scrape yet";
  return `Last scraped ${formatTimeAgo(d)}`;
}

function PlatformLastScrapedLine({
  busy,
  busyLabel,
  lastScrapedAt,
  errorSuffix,
}: {
  busy: boolean;
  busyLabel: string;
  lastScrapedAt: string | null | undefined;
  errorSuffix?: string | null;
}) {
  if (busy) {
    return <p className="mt-0.5 text-[13px] text-[#6b7280]">{busyLabel}</p>;
  }
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
      <Clock className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" aria-hidden />
      <span>
        {formatLastScrapedLine(lastScrapedAt)}
        {errorSuffix ? ` · ${errorSuffix}` : ""}
      </span>
    </p>
  );
}

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
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: Extract<GoogleAdRow, { type: "google" }>;
  brandDomain: string;
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  const [creativeImgFailed, setCreativeImgFailed] = useState(false);
  useEffect(() => {
    setCreativeImgFailed(false);
  }, [ad.id]);

  const sn = googleTextSnippet(ad);
  const href =
    ad.adUrl || `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(brandDomain)}`;
  const linkCta = googleAdsExternalLinkLabel(href);

  /** Prefer Transparency “Preview URL” only when it is a still image — `content.js` loaders are not valid `<img src>`. */
  const rawPreview = (ad.previewUrl?.trim() || "").trim();
  const rawImg = (ad.img || "").trim();
  const imageSrc =
    (isUsableGoogleStillImagePreviewUrl(rawPreview) ? rawPreview : "") ||
    (isUsableGoogleStillImagePreviewUrl(rawImg) ? rawImg : "");
  const isFaviconOnly = Boolean(
    imageSrc.includes("google.com/s2/favicons") || imageSrc.includes("gstatic.com/favicon")
  );
  const hasCreativeImageAsset = Boolean(imageSrc && !isFaviconOnly);
  const previewHref = ad.previewUrl?.trim() || "";
  const showCreativePreviewLinkRow = Boolean(previewHref && !hasCreativeImageAsset);
  const detailTitle = ad.advertiserName?.trim() || sn.headline.split(" — ")[0]?.trim() || sn.headline;
  const lastShown =
    ad.lastShownLabel?.trim() || ad.shownSummary?.replace(/\s*–\s*/, " → ") || "—";

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
            <div
              className={`block shrink-0 border-b border-[#e8eaed] bg-[#f8f9fa] ${GOOGLE_MEDIA_FRAME_CLASS}`}
              title="View ad details"
            >
              {!creativeImgFailed ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="max-h-full max-w-full rounded-xl object-contain object-center"
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
}: {
  ad: Extract<GoogleAdRow, { type: "youtube" }>;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
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
      if (t && !list.includes(t)) list.push(t);
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

  const href =
    ad.adUrl || `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(brand.domain)}`;
  const { primary: linkLabel } = googleAdsExternalLinkLabel(href);

  const showVideoEl = Boolean(videoSrc) && !videoDead;
  const canBumpPoster = posterIdx < posterList.length - 1;

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
            preload="auto"
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

function GoogleAdRowCard({
  ad,
  brand,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: GoogleAdRow;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
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
    />
  );
}

/** Public LinkedIn Ad Library detail URL for this card (stable id or parsed from ad URL). */
function linkedInAdLibraryDetailHref(ad: LinkedInAdCard): string {
  const raw = ad.adUrl?.trim() || "";
  if (/linkedin\.com\/ad-library\/detail/i.test(raw)) {
    const idMatch = /ad-library\/detail\/([^/?#]+)/i.exec(raw);
    if (idMatch?.[1]) {
      return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(idMatch[1])}`;
    }
  }
  const id = ad.id?.trim() || "";
  if (id && !/^li-\d+$/i.test(id)) {
    return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(id)}`;
  }
  const fromAdUrl = /ad-library\/detail\/([^/?#]+)/i.exec(raw);
  if (fromAdUrl?.[1]) {
    return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(fromAdUrl[1])}`;
  }
  return "https://www.linkedin.com/ad-library/home";
}

/** Sponsored landing URL when `adUrl` is not already an Ad Library page. */
function linkedInNonLibraryDestinationHref(ad: LinkedInAdCard): string | null {
  const raw = ad.adUrl?.trim() || "";
  if (!raw || /linkedin\.com\/ad-library/i.test(raw)) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Legacy cards: infer `https://…` from truncated `url` display (no protocol). */
function linkedInGuessLandingFromDisplayUrl(display: string | null | undefined): string | null {
  const t = display?.trim() ?? "";
  if (!t || t === "—" || /linkedin\.com/i.test(t)) return null;
  if (!t.includes(".")) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
  try {
    const u = new URL(withProto);
    if (/linkedin\.com$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** URL for the sponsor-site button — never Ad Library. */
function linkedInSponsoredSiteHref(ad: LinkedInAdCard): string | null {
  const fromCard = ad.landingPageUrl?.trim();
  if (fromCard && /^https?:\/\//i.test(fromCard)) return fromCard;

  const fromAdUrl = linkedInNonLibraryDestinationHref(ad);
  if (fromAdUrl) return fromAdUrl;

  return linkedInGuessLandingFromDisplayUrl(ad.url ?? "");
}

/** Short label: host + path, no query/hash (drops UTM noise). */
function shortenLinkedInLandingLinkLabel(fullHref: string, maxChars = 52): string {
  try {
    const u = new URL(fullHref.startsWith("http") ? fullHref : `https://${fullHref}`);
    u.search = "";
    u.hash = "";
    const host = u.hostname.replace(/^www\./i, "");
    const path = u.pathname.replace(/\/$/, "") || "";
    let out = path && path !== "/" ? `${host}${path}` : host;
    if (out.length > maxChars) return `${out.slice(0, Math.max(1, maxChars - 1))}…`;
    return out;
  } catch {
    const stripped = fullHref.replace(/^https?:\/\//, "").split(/[?#]/)[0]?.trim() ?? "";
    if (!stripped) return fullHref.slice(0, maxChars);
    return stripped.length > maxChars ? `${stripped.slice(0, maxChars - 1)}…` : stripped;
  }
}

function linkedInFeedSiteLabelFromLanding(
  sponsoredHref: string | null,
  brandDomain: string
): { site: string; detail?: string } {
  const fallbackHost = (brandDomain || "linkedin.com").replace(/^www\./i, "").split("/")[0] || "linkedin.com";
  if (!sponsoredHref) {
    return { site: fallbackHost };
  }
  try {
    const u = new URL(sponsoredHref);
    const site = u.hostname.replace(/^www\./i, "");
    const short = shortenLinkedInLandingLinkLabel(sponsoredHref);
    const detail = short.toLowerCase() !== site.toLowerCase() ? short : undefined;
    return { site, detail };
  } catch {
    return { site: fallbackHost };
  }
}

/** LinkedIn cards use `desc` up top and `headline` under the creative — often the same primary text. */
function linkedInHeadlineRedundantWithDescription(
  headline: string | undefined,
  desc: string | undefined
): boolean {
  const h = (headline ?? "").replace(/\s+/g, " ").trim();
  const rawBody = desc ?? "";
  if (!h || !rawBody.trim()) return false;
  const bodyCollapsed = rawBody.replace(/\s+/g, " ").trim();
  if (h === bodyCollapsed) return true;
  const firstLine =
    rawBody
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  return h === firstLine.replace(/\s+/g, " ").trim();
}

function linkedInDisplayDescription(desc: string | undefined): string {
  const raw = desc?.trim() ?? "";
  if (!raw) return "";

  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length < 2) return raw;

  const first = paragraphs[0];
  const rest = paragraphs.slice(1).join("\n\n");
  const restCollapsed = rest.replace(/\s+/g, " ").trim();

  // LinkedIn sometimes emits a truncated teaser, then repeats the full ad copy.
  if (restCollapsed.startsWith(first)) {
    return rest;
  }

  return raw;
}

function LinkedInFeedAdCard({
  ad,
  brand,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: LinkedInAdCard;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  const libraryDetailHref = linkedInAdLibraryDetailHref(ad);
  const sponsoredHref = linkedInSponsoredSiteHref(ad);
  const { site: siteLabel, detail: siteDetail } = linkedInFeedSiteLabelFromLanding(sponsoredHref, brand.domain);

  const displayDesc = linkedInDisplayDescription(ad.desc);
  const showHeadlineUnderCreative =
    Boolean(ad.headline?.trim()) &&
    !linkedInHeadlineRedundantWithDescription(ad.headline, displayDesc);

  return (
    <article
      onClick={() => onOpenDetail?.()}
      className={`relative min-w-0 h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:border-[#DDF1FD]/60 transition-all duration-200 text-left${
        onOpenDetail ? " cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      <div className="p-4 shrink-0">
        <div className="flex items-start gap-3">
          <CompetitorLogo
            sources={{
              primary: ad.advertiserLogoUrl,
              secondary: brand.logoUrl,
              domain: brand.domain,
            }}
            name={ad.advertiser}
            size="md"
            shape="rounded"
            className="rounded-lg border-[#e5e7eb] bg-[#f3f4f6]"
          />
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
            {ad.advertiserMismatch ? (
              <div className="mt-2">
                <UnverifiedSourceBadge />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-[#6b7280]">
            <a
              href={ad.adUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1.5 transition-colors hover:bg-[#f3f4f6] hover:text-[#0a66c2]"
              title="Open original ad on LinkedIn"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
        {displayDesc ? (
          <div className="mt-3">
            <ExpandableAdText
              text={displayDesc}
              className="text-[14px] text-[#374151] leading-relaxed break-words [overflow-wrap:anywhere] text-pretty whitespace-pre-wrap"
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col min-h-0 border-y border-[#e5e7eb] bg-[#f3f4f6] p-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white">
          <AdCreativeVideoOrImage
            img={ad.img ?? ""}
            videoUrl={ad.videoUrl}
            openHref={ad.adUrl}
            onMediaClick={onOpenDetail ? () => onOpenDetail() : undefined}
            className="min-h-0 w-full flex-1"
            minHeightClass="min-h-[200px]"
            fillAvailableHeight
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3.5">
        {showHeadlineUnderCreative ? (
          <p className="text-[14px] font-semibold leading-snug text-[#1c1e21] [overflow-wrap:anywhere] text-pretty">
            {ad.headline}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
          <p className="truncate text-[12px] font-medium uppercase tracking-wide text-[#65676b]">{siteLabel}</p>
          {siteDetail ? (
            <p className="mt-1.5 text-[13px] leading-snug break-words text-[#65676b] [overflow-wrap:anywhere]">
              {siteDetail}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sponsoredHref ?? libraryDetailHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border px-5 py-2 text-[14px] font-semibold transition-colors ${
              sponsoredHref
                ? "border-[#cce4ff] bg-[#e7f3ff] text-[#0d6efd] hover:bg-[#d8ebfc]"
                : "border-[#e4e6eb] bg-[#f0f2f5] text-[#65676b] hover:bg-[#e7e9ed]"
            }`}
            title={sponsoredHref ?? libraryDetailHref}
          >
            {sponsoredHref ? (ad.ctaLabel?.trim() || "Visit site") : "View on LinkedIn"}
          </a>
          <a
            href={libraryDetailHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="whitespace-nowrap rounded-full border border-[#bfdbfe] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#2563eb] transition-colors hover:bg-[#eff6ff]"
          >
            View in LinkedIn Ad Library
          </a>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
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

function workspaceInitialMarkets(setup: AdsProfileSetup | null): { auto: boolean; codes: string[] } {
  const raw =
    setup?.adMarketCountryCodes?.filter((c) => typeof c === "string" && c.trim()) ?? [];
  if (raw.length === 0) {
    return { auto: true, codes: [] };
  }
  const normalized = [...new Set(raw.map((c) => c.trim().toUpperCase()))].sort();
  const fullSorted = [...ONBOARDING_AD_MARKET_CODES].sort();
  if (
    normalized.length === fullSorted.length &&
    fullSorted.every((c, i) => c === normalized[i])
  ) {
    return { auto: true, codes: [] };
  }
  return { auto: false, codes: normalized };
}

function workspacePreviewHrefForChannel(
  id: ChannelId,
  scrape: WorkspaceAdsScrapeHints,
  workspaceDomain: string
): string {
  switch (id) {
    case "meta":
      return buildMetaAdsLibraryPreviewUrl(scrape.metaAdsLibraryUrl);
    case "google":
      return buildGoogleTransparencyPreviewUrl(scrape.googleAdsTransparencyUrl.trim());
    case "linkedin":
      return buildLinkedInAdLibraryPreviewUrl(scrape.linkedInUrl);
    case "tiktok":
      return buildTikTokAdsLibraryPreviewUrl(scrape.tiktokKeyword);
    case "pinterest":
      return buildPinterestAdsPreviewUrl(scrape.pinterestKeyword);
    case "snapchat":
      return buildSnapchatAdsGalleryPreviewUrl(scrape.snapchatKeyword);
    default:
      return "about:blank";
  }
}

function WorkspaceAdSourcesPanel({
  brandId,
  domain,
  initialSetup,
  noBottomMargin,
}: {
  brandId: string;
  domain: string;
  initialSetup: AdsProfileSetup | null;
  /** When embedded in a full tab, avoid extra bottom margin. */
  noBottomMargin?: boolean;
}) {
  const baseDomain = normalizeCompetitorSlug(domain);
  const [channels, setChannels] = useState<ChannelId[]>(() => {
    const c = initialSetup?.channels;
    return c?.length ? [...c] : [...DEFAULT_SELECTED_CHANNELS];
  });
  const [marketsAuto, setMarketsAuto] = useState(() => workspaceInitialMarkets(initialSetup).auto);
  const [selectedMarketCodes, setSelectedMarketCodes] = useState<string[]>(() => {
    const { auto, codes } = workspaceInitialMarkets(initialSetup);
    return auto ? [] : codes;
  });
  const [scrape, setScrape] = useState<WorkspaceAdsScrapeHints>(() => {
    if (initialSetup?.scrape) {
      const s = initialSetup.scrape;
      return {
        ...s,
        googleAdsTransparencyUrl: s.googleAdsTransparencyUrl ?? "",
        googleAdsDomain: s.googleAdsDomain ?? "",
      };
    }
    return emptyWorkspaceScrapeRow(baseDomain);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  /** Full country flag strip — only after user expands (default: Auto, compact). */
  const [showRegionFlags, setShowRegionFlags] = useState(false);

  useEffect(() => {
    const c = initialSetup?.channels;
    setChannels(c?.length ? [...c] : [...DEFAULT_SELECTED_CHANNELS]);
    const { auto, codes } = workspaceInitialMarkets(initialSetup);
    setMarketsAuto(auto);
    setSelectedMarketCodes(auto ? [] : codes);
    setShowRegionFlags(false);
    setScrape(
      initialSetup?.scrape
        ? {
            ...initialSetup.scrape,
            googleAdsTransparencyUrl: initialSetup.scrape.googleAdsTransparencyUrl ?? "",
            googleAdsDomain: initialSetup.scrape.googleAdsDomain ?? "",
          }
        : emptyWorkspaceScrapeRow(baseDomain),
    );
  }, [initialSetup, baseDomain]);

  const marketSummaryLabel = useMemo(() => {
    if (marketsAuto) {
      return `All supported territories (${ONBOARDING_AD_MARKET_CODES.length} regions)`;
    }
    if (selectedMarketCodes.length === 0) {
      return "Pick regions or switch back to Auto";
    }
    const tags = selectedMarketCodes
      .map((c) => ONBOARDING_AD_MARKETS.find((m) => m.code === c)?.shortTag ?? c)
      .slice(0, 8);
    const more = selectedMarketCodes.length > 8 ? ` +${selectedMarketCodes.length - 8} more` : "";
    return `${tags.join(", ")}${more}`;
  }, [marketsAuto, selectedMarketCodes]);

  const toggleChannel = (id: ChannelId) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleMarketCode = (code: string) => {
    setMarketsAuto(false);
    setShowRegionFlags(true);
    setSelectedMarketCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const patchScrape = (patch: Partial<WorkspaceAdsScrapeHints>) => {
    setScrape((s) => ({ ...s, ...patch }));
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const adMarketCountryCodes = marketsAuto
        ? [...ONBOARDING_AD_MARKET_CODES]
        : [...selectedMarketCodes];
      if (!marketsAuto && adMarketCountryCodes.length === 0) {
        setError("Select at least one region below, or turn on Auto (all supported regions).");
        setSaving(false);
        return;
      }
      if (channels.length === 0) {
        setError("Select at least one ad platform.");
        setSaving(false);
        return;
      }
      const payload: AdsProfileSetup = {
        channels,
        adMarketCountryCodes: [...adMarketCountryCodes].sort(),
        scrape: { ...scrape },
      };
      const body: { id?: string; ads_profile_setup: Record<string, unknown> } = {
        ads_profile_setup: adsProfileSetupV1(payload),
      };
      if (brandId && brandId !== "_workspace") {
        body.id = brandId;
      }
      const res = await fetch("/api/account/brands", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
      window.dispatchEvent(new Event(RIVAL_BRANDS_UPDATED_EVENT));
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-sky-200/70 bg-white/95 px-3.5 py-2.5 text-[13px] font-medium text-sky-950 placeholder:text-sky-900/40 outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)] transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-2 focus:ring-sky-300/35";

  /** Basics row: same visual height as the compact Ad markets bar */
  const basicsInputClass =
    "mt-1.5 box-border h-[42px] w-full rounded-xl border border-sky-200/70 bg-white/95 px-3.5 py-0 text-[13px] font-medium leading-normal text-sky-950 placeholder:text-sky-900/40 outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)] transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-2 focus:ring-sky-300/35";

  type PlatformFieldSpec = {
    label: string;
    hint?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    id: string;
  };

  const fieldByChannel = (id: ChannelId): PlatformFieldSpec | null => {
    switch (id) {
      case "meta":
        return {
          id: "rival-ws-meta",
          label: "Meta Ads Library URL",
          hint: "Use an Ad Library search URL—not a Facebook Page link.",
          placeholder: "https://www.facebook.com/ads/library/...",
          value: scrape.metaAdsLibraryUrl,
          onChange: (v) => patchScrape({ metaAdsLibraryUrl: v }),
        };
      case "google":
        return {
          id: "rival-ws-google",
          label: "URL with Advertiser ID",
          hint:
            "URL from Google Ads Transparency Center that includes …/advertiser/AR… in the path.",
          placeholder: "https://adstransparency.google.com/advertiser/AR…",
          value: scrape.googleAdsTransparencyUrl,
          onChange: (v) => patchScrape({ googleAdsTransparencyUrl: v }),
        };
      case "linkedin":
        return {
          id: "rival-ws-li",
          label: "LinkedIn Ad Library URL",
          hint: "Ad Library search or company/advertiser link.",
          value: scrape.linkedInUrl,
          onChange: (v) => patchScrape({ linkedInUrl: v }),
        };
      case "tiktok":
        return {
          id: "rival-ws-tt",
          label: "TikTok keyword",
          hint: "What we pass to TikTok Ads Library search.",
          value: scrape.tiktokKeyword,
          onChange: (v) => patchScrape({ tiktokKeyword: v }),
        };
      case "pinterest":
        return {
          id: "rival-ws-pin",
          label: "Pinterest search keyword",
          hint: "Keyword-style match in Pinterest transparency.",
          value: scrape.pinterestKeyword,
          onChange: (v) => patchScrape({ pinterestKeyword: v }),
        };
      case "snapchat":
        return {
          id: "rival-ws-snap",
          label: "Snapchat keyword",
          hint: "Gallery search term for your brand.",
          value: scrape.snapchatKeyword,
          onChange: (v) => patchScrape({ snapchatKeyword: v }),
        };
      default:
        return null;
    }
  };

  const googleTransparencyNeedsFix =
    scrape.googleAdsTransparencyUrl.trim().length > 0 &&
    canonicalGoogleAdsTransparencyStartUrl(scrape.googleAdsTransparencyUrl.trim()) === null;

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-sky-200/65 bg-gradient-to-b from-white via-sky-50/35 to-amber-50/25 shadow-[0_10px_40px_rgba(14,116,144,0.07)] ${
        noBottomMargin ? "" : "mb-6"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400/90 via-sky-300/50 to-amber-300/70"
        aria-hidden
      />
      <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0 pl-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-sky-800/90">Your workspace</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug tracking-[-0.02em] text-sky-950">
            Ad library connections
          </p>
          <p className="mt-1 max-w-[52rem] text-[12px] leading-snug text-sky-900/65">
            Saved on your account—not the same flow as confirming a competitor during Spy. Set the links and handles
            your account uses to find <span className="font-semibold text-sky-900/80">your</span> brand in each ad
            library. The Ads Library tab is for browsing creatives and refreshing scrapes—keep configuration here so it
            stays easy to scan.
          </p>
        </div>
      </div>

      <div className="space-y-5 border-t border-sky-200/50 px-4 py-5 sm:px-5 sm:py-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">Basics</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4">
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-sky-900/85" htmlFor="rival-ws-site">
                Website URL
              </label>
              <input
                id="rival-ws-site"
                className={basicsInputClass}
                value={scrape.websiteUrl}
                onChange={(e) => patchScrape({ websiteUrl: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                <p className="text-[11px] font-semibold text-sky-900/85">Ad markets</p>
                <p className="text-[10px] leading-tight text-sky-900/50">
                  <span className="hidden sm:inline">Auto unless you pick countries.</span>
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-sky-900/50 sm:hidden">
                Auto by default — open Countries… to customize.
              </p>

              {!showRegionFlags ? (
                <div
                  className="mt-1.5 flex min-h-[42px] w-full flex-wrap items-center gap-2 rounded-xl border border-sky-200/70 bg-white/80 px-3 py-1.5 sm:flex-nowrap sm:gap-3"
                  title={marketSummaryLabel}
                >
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-tight text-sky-950">
                    <span className="font-semibold">{marketsAuto ? "Auto" : "Custom"}</span>
                    <span className="font-normal text-sky-800/70"> · {marketSummaryLabel}</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {marketsAuto ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMarketsAuto(false);
                          setShowRegionFlags(true);
                          setSelectedMarketCodes((p) =>
                            p.length ? p : [...DEFAULT_ONBOARDING_AD_MARKETS],
                          );
                        }}
                        className="rounded-lg border border-sky-300/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50/90"
                      >
                        Countries…
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowRegionFlags(true)}
                          className="rounded-lg border border-sky-300/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50/90"
                        >
                          Edit…
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMarketsAuto(true);
                            setShowRegionFlags(false);
                            setSelectedMarketCodes([]);
                          }}
                          className="rounded-lg border border-sky-200/80 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100/90"
                        >
                          Auto
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {showRegionFlags ? (
                <div className="mt-3 min-w-0 space-y-2">
                  <div className="relative">
                    <div
                      className="flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-xl border border-sky-200/60 bg-white/70 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
                      role="group"
                      aria-label="Ad markets"
                    >
                      <span className="inline-flex shrink-0 snap-start items-center">
                        <button
                          type="button"
                          title="Use all supported regions"
                          aria-pressed={marketsAuto}
                          onClick={() => {
                            setMarketsAuto(true);
                            setSelectedMarketCodes([]);
                            setShowRegionFlags(false);
                          }}
                          className={`inline-flex shrink-0 items-center gap-0.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                            marketsAuto
                              ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                              : "border-sky-200/90 bg-white/90 text-sky-800 hover:bg-sky-50"
                          }`}
                        >
                          <span className="text-[0.85rem] leading-none" aria-hidden>
                            🌐
                          </span>
                          Auto
                        </button>
                      </span>
                      {ONBOARDING_AD_MARKETS.map((m) => {
                        const on = !marketsAuto && selectedMarketCodes.includes(m.code);
                        return (
                          <button
                            key={m.code}
                            type="button"
                            disabled={marketsAuto}
                            aria-pressed={on}
                            aria-disabled={marketsAuto}
                            title={m.label}
                            onClick={() => toggleMarketCode(m.code)}
                            className={`inline-flex shrink-0 snap-start items-center gap-0.5 rounded-lg border px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                              marketsAuto
                                ? "cursor-not-allowed border-sky-100/90 bg-sky-50/60 text-sky-800/35"
                                : on
                                  ? "border-sky-600/50 bg-sky-600 text-white shadow-sm"
                                  : "border-sky-200/80 bg-white/85 text-sky-900/75 hover:border-sky-300 hover:bg-white"
                            }`}
                          >
                            <span className="text-[0.85rem] leading-none" aria-hidden>
                              {countryFlagEmoji(m.code)}
                            </span>
                            {m.shortTag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRegionFlags(false)}
                      className="text-[11px] font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
                    >
                      Collapse list
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">
            Platforms you track
          </p>
          <p className="mt-0.5 text-[12px] text-sky-900/60">
            Toggle networks—connection fields below appear only for platforms you enable.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-sky-200/60 bg-white/60 p-2">
            {CHANNELS.map(({ id, name, Logo }) => {
              const on = channels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleChannel(id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    on
                      ? "border-sky-400/90 bg-sky-500/15 text-sky-950 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
                      : "border-transparent bg-white/90 text-sky-900/45 hover:bg-sky-50/90 hover:text-sky-900"
                  }`}
                >
                  <Logo className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  {name.replace(" ads", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">
            Per-platform identifiers
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {CHANNELS.filter((c) => channels.includes(c.id)).map((ch) => {
              const spec = fieldByChannel(ch.id);
              if (!spec) return null;
              const previewHref = workspacePreviewHrefForChannel(ch.id, scrape, baseDomain);
              return (
                <div
                  key={ch.id}
                  className="relative flex min-h-0 flex-col rounded-2xl border border-dashed border-sky-300/55 bg-white/75 px-3.5 pb-3.5 pt-3 shadow-[0_2px_12px_rgba(14,116,144,0.04)] sm:px-4 sm:pb-4 sm:pt-3.5"
                >
                  <div
                    className="pointer-events-none absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-sky-500 to-sky-400/85"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 shadow-sm">
                        <ch.Logo className="h-4 w-4 text-sky-950" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[13px] font-bold leading-tight text-sky-950">{ch.name}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-700/55">
                          Your brand · workspace
                        </p>
                      </div>
                    </div>
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Preview in new tab"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200/80 bg-sky-50/90 px-2 py-1 text-[11px] font-semibold text-sky-900 transition-colors hover:bg-sky-100 sm:mt-0.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      Preview
                    </a>
                  </div>
                  <div className="mt-3 pl-1.5">
                    <label className="block text-[11px] font-semibold text-sky-900/75" htmlFor={spec.id}>
                      {spec.label}
                    </label>
                    <input
                      id={spec.id}
                      className={
                        spec.id === "rival-ws-google" && googleTransparencyNeedsFix
                          ? `${inputClass} border-amber-400/90 ring-1 ring-amber-300/50`
                          : inputClass
                      }
                      value={spec.value}
                      onChange={(e) => spec.onChange(e.target.value)}
                      onBlur={() => {
                        if (spec.id === "rival-ws-meta") {
                          const v = scrape.metaAdsLibraryUrl.trim();
                          if (!v) return;
                          const c = canonicalMetaAdsLibraryUrl(v);
                          if (c && c !== v) patchScrape({ metaAdsLibraryUrl: c });
                          return;
                        }
                        if (spec.id === "rival-ws-google") {
                          const v = scrape.googleAdsTransparencyUrl.trim();
                          if (!v) return;
                          const c = canonicalGoogleAdsTransparencyStartUrl(scrape.googleAdsTransparencyUrl);
                          if (c && c !== v) patchScrape({ googleAdsTransparencyUrl: c });
                          return;
                        }
                        if (spec.id === "rival-ws-li") {
                          const v = scrape.linkedInUrl.trim();
                          if (!v) return;
                          const c = canonicalLinkedInAdLibraryUrl(v);
                          if (c && c !== v) patchScrape({ linkedInUrl: c });
                        }
                      }}
                      placeholder={spec.placeholder}
                    />
                    {spec.hint ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-sky-800/55">{spec.hint}</p>
                    ) : null}
                    {spec.id === "rival-ws-google" && googleTransparencyNeedsFix ? (
                      <p className="mt-1.5 text-[11px] leading-snug font-medium text-amber-900/95" role="alert">
                        That link doesn&apos;t include a Transparency advertiser ID (
                        <span className="font-mono text-[10px]">…/advertiser/AR…</span>). Open Google Ads
                        Transparency Center, search for your company, then open any creative or ad — copy the URL from
                        that page&apos;s address bar and paste it here. Don&apos;t use only your shop domain or a{' '}
                        <span className="font-mono text-[10px]">?domain=</span> search results page.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {channels.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-sky-200/80 bg-sky-50/40 px-3 py-2.5 text-[12px] text-sky-900/65">
              Turn on at least one platform above to add connection details.
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-[12px] font-medium text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-sky-700 to-sky-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(14,116,144,0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving…" : "Save connections"}
          </button>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            {savedFlash ? (
              <span className="text-[12px] font-semibold text-emerald-700">Saved to your brand</span>
            ) : (
              <span className="text-[11px] text-sky-900/45">Changes apply to your workspace only.</span>
            )}
          </div>
        </div>
      </div>
    </div>
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
    const load = () => setSidebarSnapshot(loadSidebarCompetitors());
    load();
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, load);
    return () => window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, load);
  }, [canonicalHost, sidebarEpoch]);

  const myBrand = useActiveBrand();

  const { brand, platformIds, channelsFromResolver, isConfirmed, isOwnWorkspace } = useMemo(() => {
    const base = resolveCompetitorViewFromSidebar(
      canonicalHost,
      {
        brandParam,
        idsParam,
        channelsParam: channelsQuery,
        confirmedParam,
      },
      sidebarSnapshot === undefined ? [] : sidebarSnapshot
    );

    const own =
      Boolean(myBrand.domain?.trim()) &&
      normalizeCompetitorSlug(canonicalHost) === normalizeCompetitorSlug(myBrand.domain ?? "");

    if (!own) {
      return {
        isOwnWorkspace: false as const,
        brand: base.brand,
        platformIds: base.platformIds,
        channelsFromResolver: base.channelsParam,
        isConfirmed: base.isConfirmed,
      };
    }

    const adsSetup = myBrand.adsSetup ?? null;
    const wsDomain = myBrand.domain!.trim();
    const normDomain = normalizeCompetitorSlug(wsDomain);

    let nextPlatformIds: Record<string, string> | null =
      base.platformIds && Object.keys(base.platformIds).length > 0 ? { ...base.platformIds } : null;
    if (adsSetup?.channels?.length) {
      const fromHints = scrapeHintsToPlatformIds({
        scrape: adsSetup.scrape,
        workspaceDomain: wsDomain,
        channels: adsSetup.channels,
      });
      if (Object.keys(fromHints).length > 0) {
        nextPlatformIds = { ...(nextPlatformIds ?? {}), ...fromHints };
      }
    }
    if (nextPlatformIds && Object.keys(nextPlatformIds).length === 0) {
      nextPlatformIds = null;
    }

    let channelsFromResolver = base.channelsParam;
    if (!channelsFromResolver.trim() && adsSetup?.channels?.length) {
      channelsFromResolver = adsSetup.channels.join(",");
    }

    let nextConfirmed = base.isConfirmed;
    if (!nextConfirmed && adsSetup?.channels?.length) {
      nextConfirmed = true;
    }

    const logoUrl =
      myBrand.logoUrl?.trim() || googleFaviconUrlForDomain(normDomain);

    const mergedBrand: CompetitorPageBrand = {
      name: myBrand.name,
      domain: normDomain,
      logoUrl,
      handle: normDomain.split(".")[0] ?? myBrand.name.toLowerCase().replace(/\s+/g, ""),
      color: myBrand.color ?? "#6366f1",
    };

    return {
      isOwnWorkspace: true as const,
      brand: mergedBrand,
      platformIds: nextPlatformIds,
      channelsFromResolver,
      isConfirmed: nextConfirmed,
    };
  }, [
    canonicalHost,
    brandParam,
    idsParam,
    channelsQuery,
    confirmedParam,
    sidebarEpoch,
    sidebarSnapshot,
    myBrand.id,
    myBrand.domain,
    myBrand.name,
    myBrand.logoUrl,
    myBrand.color,
    myBrand.adsSetup,
  ]);

  const pageTabs = useMemo(() => {
    const base = isOwnWorkspace ? tabs.filter((t) => t.id !== "comparison") : tabs;
    if (!isOwnWorkspace) return base;
    const adsIdx = base.findIndex((t) => t.id === "ads library");
    const next = [...base];
    next.splice(
      adsIdx >= 0 ? adsIdx + 1 : 0,
      0,
      WORKSPACE_ADS_TAB,
      WORKSPACE_MARKETING_IMPROVEMENTS_TAB,
    );
    return next;
  }, [isOwnWorkspace]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = (searchParams.get("tab") ?? "").trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const params = new URLSearchParams(searchParams.toString());
    let fix = false;
    if (lower === "ai insight") {
      params.set("tab", "insights");
      params.set("sub", "activity-feed");
      params.delete("view");
      fix = true;
    } else if (lower === "strategy overview") {
      params.set("tab", "insights");
      params.set("sub", "strategy-map");
      params.delete("view");
      fix = true;
    } else if (lower === "workspace ads") {
      params.set("tab", "workspace-ads");
      fix = true;
    } else if (lower === "marketing improvements") {
      params.set("tab", "workspace-marketing-improvements");
      fix = true;
    }
    if (fix) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const sub = (searchParams.get("sub") ?? "").trim();
    if (sub !== "strategy-insight" && sub !== "moves") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("sub", "activity-feed");
    params.delete("view");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const tabParamRaw = (searchParams.get("tab") ?? "").trim();
  const isValidTab = (id: string) => {
    if (COMPETITOR_PAGE_TABS.some((t) => t.id === id)) return true;
    if (isOwnWorkspace && (id === "workspace-ads" || id === "workspace-marketing-improvements")) return true;
    return false;
  };
  const activeTab = isValidTab(tabParamRaw) ? tabParamRaw : "ads library";

  const activeSubTab = useMemo(() => {
    const def = findCompetitorTab(activeTab);
    if (!def?.subTabs?.length) return null;
    const sub = (searchParams.get("sub") ?? "").trim();
    if (sub && def.subTabs.some((s) => s.id === sub)) return sub;
    return def.defaultSubTab ?? null;
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (activeTab !== "audience-copy") return;
    const sub = (searchParams.get("sub") ?? "").trim();
    if (sub !== "hooks" && sub !== "briefs") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("sub", "audience");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, pathname, router, searchParams]);

  useEffect(() => {
    const def = findCompetitorTab(activeTab);
    if (!def?.subTabs?.length || !def.defaultSubTab) return;
    const sub = (searchParams.get("sub") ?? "").trim();
    const ok = Boolean(sub && def.subTabs.some((s) => s.id === sub));
    if (ok) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("sub", def.defaultSubTab);
    if (activeTab === "insights") {
      params.delete("view");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, pathname, router, searchParams]);

  useEffect(() => {
    if (isOwnWorkspace && activeTab === "comparison") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "ads library");
      params.delete("sub");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [isOwnWorkspace, activeTab, pathname, router, searchParams]);

  useEffect(() => {
    if (
      !isOwnWorkspace &&
      (activeTab === "workspace-ads" || activeTab === "workspace-marketing-improvements")
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "ads library");
      params.delete("sub");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [isOwnWorkspace, activeTab, pathname, router, searchParams]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      const tab = findCompetitorTab(tabId);
      if (tab?.defaultSubTab) {
        params.set("sub", tab.defaultSubTab);
        if (tabId === "insights") {
          params.delete("view");
        }
      } else {
        params.delete("sub");
        if (tabId !== "insights") {
          params.delete("view");
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleSubTabChange = useCallback(
    (subTabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sub", subTabId);
      if (activeTab === "insights") {
        params.delete("view");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [activeTab, pathname, router, searchParams],
  );

  const navigateToLandingPagesExplorer = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "tests");
    params.set("sub", "landing-pages");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);
  const [visibleAdPlatforms, setVisibleAdPlatforms] = useState<AdsLibraryPlatform[] | null>(null);
  const [metaAdsModalOpen, setMetaAdsModalOpen] = useState(false);
  const [googleAdsModalOpen, setGoogleAdsModalOpen] = useState(false);
  const [linkedInAdsModalOpen, setLinkedInAdsModalOpen] = useState(false);
  const [tiktokAdsModalOpen, setTiktokAdsModalOpen] = useState(false);
  const [pinterestAdsModalOpen, setPinterestAdsModalOpen] = useState(false);
  const [snapchatAdsModalOpen, setSnapchatAdsModalOpen] = useState(false);
  const [scrapeFields] = useState<ScrapeRequestFields>(() => readScrapeRequestFieldsFromStorage());

  /** Workspace "Ad markets" (e.g. LT) must override session default scrape country for the user's own brand. */
  const effectiveScrapeFields = useMemo(
    () =>
      isOwnWorkspace
        ? mergeScrapeFieldsWithWorkspaceMarkets(scrapeFields, myBrand.adsSetup?.adMarketCountryCodes)
        : scrapeFields,
    [isOwnWorkspace, scrapeFields, myBrand.adsSetup?.adMarketCountryCodes]
  );

  const workspaceScrapeFields = useMemo(
    () => mergeScrapeFieldsWithWorkspaceMarkets(scrapeFields, myBrand.adsSetup?.adMarketCountryCodes),
    [scrapeFields, myBrand.adsSetup?.adMarketCountryCodes]
  );
  const [tiktokRegion, setTiktokRegion] = useState(readStoredTiktokRegion);
  const [pinterestCountry, setPinterestCountry] = useState(readStoredPinterestCountry);
  const [googleRegion, setGoogleRegion] = useState(readStoredGoogleRegion);
  const [accountLastScrapedAt, setAccountLastScrapedAt] = useState<string | null>(null);
  /** Bumps every minute so `getTimeAgo` in the header stays fresh while the page is open. */
  const [lastScrapeRelativeTick, setLastScrapeRelativeTick] = useState(0);

  useEffect(() => {
    evictBulkyLocalStorageCaches();
    return setupGlobalCacheInvalidator();
  }, []);

  /** Platforms to hydrate from `ads_cache` — from saved channels, else identifiers, never blind “all six” scrape. */
  const adsPlatforms: AdsLibraryPlatform[] = useMemo(
    () => resolveAdsPlatformsForCompetitorView(channelsFromResolver, platformIds),
    [channelsFromResolver, platformIds]
  );

  /** Page/API “brand name” can be the logged-in display name (e.g. Admin); prefer domain-derived label for UI + ad matching copy. */
  const competitorDisplayLabel = useMemo(
    () => effectiveCompetitorBrandLabel(brand.name, brand.domain) || brand.name,
    [brand.name, brand.domain],
  );

  const cacheDomainNorm = useMemo(() => brand.domain.trim().toLowerCase(), [brand.domain]);

  const competitorSidebarMatch = useMemo(() => {
    if (!sidebarSnapshot?.length) return undefined;
    return findSidebarRowForHost(canonicalHost, sidebarSnapshot);
  }, [sidebarSnapshot, canonicalHost]);

  const { activeAdId, openAd, closeAd, resolveLibraryAdAndOpen } = useAdDetailState();

  const openAdLibraryCard = useCallback(
    (platform: string, libraryItemId: string) => {
      const cid = competitorSidebarMatch?.savedCompetitorDbId?.trim();
      if (!cid || !libraryItemId.trim()) return;
      void resolveLibraryAdAndOpen(cid, platform, libraryItemId);
    },
    [competitorSidebarMatch?.savedCompetitorDbId, resolveLibraryAdAndOpen],
  );

  const [serverScrapedAdTotal, setServerScrapedAdTotal] = useState<number | null>(null);
  const [manualRefreshBusyPlatform, setManualRefreshBusyPlatform] =
    useState<AdsLibraryPlatform | null>(null);
  const [billingAllowManualRefresh, setBillingAllowManualRefresh] = useState(false);
  const [billingIsUnlimited, setBillingIsUnlimited] = useState(false);
  const [manualRefreshStatus, setManualRefreshStatus] = useState<ManualRefreshStatus | null>(null);

  const canManualRefresh = billingAllowManualRefresh || billingIsUnlimited;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/usage", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j: { billing?: { limits?: { allowManualRefresh?: boolean }; isUnlimited?: boolean } }) => {
        if (cancelled) return;
        setBillingAllowManualRefresh(j.billing?.limits?.allowManualRefresh === true);
        setBillingIsUnlimited(j.billing?.isUnlimited === true);
      })
      .catch(() => {
        if (!cancelled) {
          setBillingAllowManualRefresh(false);
          setBillingIsUnlimited(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getTimeAgo = formatTimeAgo;

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
    if (isOwnWorkspace) return;

    const domainSlug = normalizeCompetitorSlug(brand.domain);
    if (shouldSuppressSidebarUpsertForSlug(domainSlug)) return;

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
    const acct = sidebarCompetitorToAccountPayload(hoisted);
    const accountKey = JSON.stringify({
      slug: acct.slug,
      name: acct.name,
      logoUrl: acct.logoUrl ?? null,
      brandDomain: acct.brand?.domain ?? null,
      brandName: acct.brand?.name ?? null,
      brandLogoUrl: acct.brand?.logoUrl ?? null,
      adsLibraryContext: acct.adsLibraryContext ?? null,
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
    isOwnWorkspace,
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
    refreshGoogleAds,
    refreshMetaAds,
    refreshTikTokAds,
    refreshPinterestAds,
    refreshLinkedInAds,
    refreshSnapchatAds,
    reloadPlatformFromCache,
  } = useAdLibrary(
    { name: brand.name, domain: brand.domain, logoUrl: brand.logoUrl },
    platformIds,
    adsPlatforms,
    isConfirmed,
    tiktokRegion,
    googleRegion,
    effectiveScrapeFields,
    pinterestCountry
  );

  const adLibRef = useRef(adLib);
  adLibRef.current = adLib;

  const [marketingCoach, setMarketingCoach] = useState<{
    coaching: MarketingImprovementLlmResult;
    competitorsConsidered: { name: string; domain: string }[];
    model: string;
  } | null>(null);
  const [marketingCoachLoading, setMarketingCoachLoading] = useState(false);
  const [marketingCoachError, setMarketingCoachError] = useState<string | null>(null);
  const [marketingCoachRefresh, setMarketingCoachRefresh] = useState(0);

  useEffect(() => {
    if (activeTab !== "workspace-marketing-improvements") return;
    if (!isOwnWorkspace) return;

    let cancelled = false;
    setMarketingCoachLoading(true);
    setMarketingCoachError(null);

    void (async () => {
      try {
        const res = await fetch("/api/workspace/marketing-improvement", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userBrandName: myBrand.name,
            userBrandDomain: myBrand.domain ?? "",
            userBrandContext: myBrand.brandContext ?? "",
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          coaching?: MarketingImprovementLlmResult;
          competitorsConsidered?: { name: string; domain: string }[];
          model?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.coaching) {
          setMarketingCoach(null);
          setMarketingCoachError(json.error ?? "Coaching request failed");
          return;
        }
        setMarketingCoach({
          coaching: json.coaching,
          competitorsConsidered: json.competitorsConsidered ?? [],
          model: json.model ?? "",
        });
      } catch {
        if (!cancelled) {
          setMarketingCoach(null);
          setMarketingCoachError("Network error");
        }
      } finally {
        if (!cancelled) setMarketingCoachLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    isOwnWorkspace,
    myBrand.name,
    myBrand.domain,
    myBrand.brandContext,
    marketingCoachRefresh,
  ]);

  const readAccountLastScraped = useCallback(async () => {
    if (isOwnWorkspace) {
      try {
        const qs =
          myBrand.id && myBrand.id !== "default"
            ? `?brandId=${encodeURIComponent(myBrand.id)}`
            : "";
        const res = await fetch(`/api/account/workspace-last-scrape${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setAccountLastScrapedAt(null);
          return;
        }
        const json = (await res.json()) as { lastScrapedAt?: string | null };
        setAccountLastScrapedAt(json.lastScrapedAt ?? null);
      } catch {
        setAccountLastScrapedAt(null);
      }
      return;
    }
    const list = loadSidebarCompetitors();
    const bdom = brand.domain.trim().toLowerCase();
    const row = list.find(
      (c) =>
        c.brand?.domain?.trim().toLowerCase() === bdom ||
        (c.brand?.domain != null && slugsLikelySameCompany(c.slug, brand.domain))
    );
    setAccountLastScrapedAt(row?.lastScrapedAt ?? null);
  }, [isOwnWorkspace, brand.domain, brand.name, myBrand.id]);

  useEffect(() => {
    void readAccountLastScraped();
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
    return () => window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
  }, [readAccountLastScraped]);

  useEffect(() => {
    if (!accountLastScrapedAt) return;
    const id = window.setInterval(() => setLastScrapeRelativeTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [accountLastScrapedAt]);

  useEffect(() => {
    if (!isOwnWorkspace) return;
    const onAdsLibUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<AdsLibraryUpdatedDetail>;
      const incoming = normalizeDomainHostForAdsEvent(ce.detail?.domain ?? "");
      const current = normalizeDomainHostForAdsEvent(brand.domain);
      if (!incoming || !current || incoming !== current) return;
      void readAccountLastScraped();
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, onAdsLibUpdated);
    return () => window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, onAdsLibUpdated);
  }, [isOwnWorkspace, brand.domain, readAccountLastScraped]);

  const syncSavedCompetitorsFromAccount = useCallback(async () => {
    const localPrev = loadSidebarCompetitors();
    const list = await fetchSavedCompetitorsFromAccount();
    if (list.length > 0) {
      const visible = sidebarCompetitorsWithoutWorkspaceRow(
        list as SidebarCompetitor[],
        myBrand.domain?.trim() || null,
      );
      saveSidebarCompetitors(mergeAccountSidebarRowsWithLocalLibraryContext(visible, localPrev));
    }
  }, [myBrand.domain]);

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
    const seen = new Set<string>();
    const unique = metaAds.filter((ad) => {
      if (seen.has(ad.id)) return false;
      seen.add(ad.id);
      return true;
    });
    return sortMetaAdsActiveFirst(unique);
  }, [metaAds]);
  const filteredGoogleRows = useMemo(
    () => sortGoogleRowsActiveFirst(googleRows),
    [googleRows]
  );
  const filteredLinkedInAds = useMemo(
    () => sortLinkedInAdsActiveFirst(linkedinAds),
    [linkedinAds]
  );
  const filteredTikTokAds = useMemo(
    () => sortTikTokAdsActiveFirst(tiktokAds),
    [tiktokAds]
  );
  const filteredPinterestAds = useMemo(
    () => sortPinterestAdsActiveFirst(pinterestAds),
    [pinterestAds]
  );
  const filteredSnapchatAds = useMemo(
    () => sortSnapchatAdsActiveFirst(snapchatAds),
    [snapchatAds]
  );

  const platformTotalCounts = useMemo(
    () => ({
      meta: filteredMetaAds.length,
      google: filteredGoogleRows.length,
      tiktok: filteredTikTokAds.length,
      linkedin: filteredLinkedInAds.length,
      pinterest: filteredPinterestAds.length,
      snapchat: filteredSnapchatAds.length,
    }),
    [
      filteredMetaAds.length,
      filteredGoogleRows.length,
      filteredTikTokAds.length,
      filteredLinkedInAds.length,
      filteredPinterestAds.length,
      filteredSnapchatAds.length,
    ]
  );

  const platformActiveCounts = useMemo(
    () => ({
      meta: countActiveMetaAds(filteredMetaAds),
      google: countActiveGoogleRows(filteredGoogleRows),
      tiktok: countActiveTikTokAds(filteredTikTokAds),
      linkedin: countActiveLinkedInAds(filteredLinkedInAds),
      pinterest: countActivePinterestAds(filteredPinterestAds),
      snapchat: countActiveSnapchatAds(filteredSnapchatAds),
    }),
    [
      filteredMetaAds,
      filteredGoogleRows,
      filteredLinkedInAds,
      filteredTikTokAds,
      filteredPinterestAds,
      filteredSnapchatAds,
    ]
  );

  const inlinePreviewMetaAds = useMemo(
    () => filteredMetaAds.filter(metaAdHasDashboardInlinePreview),
    [filteredMetaAds]
  );
  const inlinePreviewGoogleRows = useMemo(
    () => filteredGoogleRows.filter(googleAdRowHasDashboardInlinePreview),
    [filteredGoogleRows]
  );
  const inlinePreviewLinkedInAds = useMemo(
    () => filteredLinkedInAds.filter(linkedInAdHasDashboardInlinePreview),
    [filteredLinkedInAds]
  );
  const inlinePreviewTikTokAds = useMemo(
    () => filteredTikTokAds.filter(tikTokAdHasDashboardInlinePreview),
    [filteredTikTokAds]
  );
  const inlinePreviewPinterestAds = useMemo(
    () => filteredPinterestAds.filter(pinterestAdHasDashboardInlinePreview),
    [filteredPinterestAds]
  );
  const inlinePreviewSnapchatAds = useMemo(
    () => filteredSnapchatAds.filter(snapchatAdHasDashboardInlinePreview),
    [filteredSnapchatAds]
  );

  const competitorDbIdForSaved = competitorSidebarMatch?.savedCompetitorDbId?.trim() ?? "";

  const loadManualRefreshStatus = useCallback(async () => {
    if (!competitorDbIdForSaved || !canManualRefresh) {
      setManualRefreshStatus(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/competitor/manual-refresh-status?competitorId=${encodeURIComponent(competitorDbIdForSaved)}`,
        { cache: "no-store", credentials: "include" },
      );
      const json = (await res.json()) as ManualRefreshStatus & { ok?: boolean };
      if (res.ok && json.ok !== false) {
        setManualRefreshStatus({
          workspaceRefreshCount: json.workspaceRefreshCount,
          workspaceLimit: json.workspaceLimit,
          lastRefreshAt: json.lastRefreshAt,
          canRefreshNow: json.canRefreshNow,
          nextRefreshAt: json.nextRefreshAt,
          blockReason: json.blockReason,
        });
      } else {
        setManualRefreshStatus(null);
      }
    } catch {
      setManualRefreshStatus(null);
    }
  }, [competitorDbIdForSaved, canManualRefresh]);

  useEffect(() => {
    void loadManualRefreshStatus();
  }, [loadManualRefreshStatus]);

  const manualRefreshQuotaHint = useMemo(() => {
    if (!canManualRefresh || !manualRefreshStatus) return null;
    const { workspaceRefreshCount, workspaceLimit, blockReason, nextRefreshAt } = manualRefreshStatus;
    const used = `${workspaceRefreshCount}/${workspaceLimit} refreshes used this month`;
    if (blockReason === "monthly_cap") return `${used} · monthly limit reached`;
    if (blockReason === "cooldown" && nextRefreshAt) {
      const hours = Math.max(1, Math.ceil((Date.parse(nextRefreshAt) - Date.now()) / 3_600_000));
      return `${used} · next refresh for this competitor in ~${hours}h`;
    }
    return used;
  }, [canManualRefresh, manualRefreshStatus]);

  const showPlatformClassificationDebug =
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true";

  const [platformTrackingByPlatform, setPlatformTrackingByPlatform] = useState<
    Record<
      string,
      {
        classification: string;
        activeAdCount: number;
        refreshIntervalDays: number;
        adsPerRefresh: number;
        lastScrapeAt: string | null;
        nextScrapeAt: string | null;
        nextScrapeWindow: { start: string; end: string };
      }
    >
  >({});

  const loadPlatformTracking = useCallback(() => {
    if (!competitorDbIdForSaved) {
      setPlatformTrackingByPlatform({});
      return Promise.resolve();
    }
    return fetch(
      `/api/competitor/platform-tracking?competitorId=${encodeURIComponent(competitorDbIdForSaved)}`,
      { cache: "no-store", credentials: "include" },
    )
      .then((r) => r.json())
      .then((j: {
        ok?: boolean;
        platforms?: {
          platform: string;
          classification: string;
          activeAdCount: number;
          refreshIntervalDays?: number;
          adsPerRefresh?: number;
          lastScrapeAt?: string | null;
          nextScrapeAt?: string | null;
          nextScrapeWindow?: { start: string; end: string };
        }[];
      }) => {
        if (!j?.ok || !Array.isArray(j.platforms)) return;
        const map: Record<
          string,
          {
            classification: string;
            activeAdCount: number;
            refreshIntervalDays: number;
            adsPerRefresh: number;
            lastScrapeAt: string | null;
            nextScrapeAt: string | null;
            nextScrapeWindow: { start: string; end: string };
          }
        > = {};
        for (const p of j.platforms) {
          map[p.platform] = {
            classification: p.classification,
            activeAdCount: p.activeAdCount,
            refreshIntervalDays: p.refreshIntervalDays ?? 0,
            adsPerRefresh: p.adsPerRefresh ?? 0,
            lastScrapeAt: p.lastScrapeAt ?? null,
            nextScrapeAt: p.nextScrapeAt ?? null,
            nextScrapeWindow: p.nextScrapeWindow ?? { start: "", end: "" },
          };
        }
        setPlatformTrackingByPlatform(map);
      })
      .catch(() => {
        /* best-effort */
      });
  }, [competitorDbIdForSaved]);

  useEffect(() => {
    void loadPlatformTracking();
  }, [loadPlatformTracking]);

  const lastScrapedAtForPlatform = useCallback(
    (platform: AdsLibraryPlatform): string | null =>
      platformTrackingByPlatform[platform]?.lastScrapeAt ?? accountLastScrapedAt ?? null,
    [platformTrackingByPlatform, accountLastScrapedAt],
  );

  const adsLibraryShowsCreativesOnScreen = useMemo(
    () =>
      !adLibLoading &&
      !adLibFetchError &&
      filteredMetaAds.length +
        filteredGoogleRows.length +
        filteredLinkedInAds.length +
        filteredTikTokAds.length +
        filteredPinterestAds.length +
        filteredSnapchatAds.length >
        0,
    [
      adLibLoading,
      adLibFetchError,
      filteredMetaAds.length,
      filteredGoogleRows.length,
      filteredLinkedInAds.length,
      filteredTikTokAds.length,
      filteredPinterestAds.length,
      filteredSnapchatAds.length,
    ],
  );

  const showAdLibraryLinkingAnalyticsShell =
    !isOwnWorkspace &&
    isConfirmed &&
    sidebarSnapshot !== undefined &&
    !competitorDbIdForSaved;

  const comparisonPayloadScrapeStamp = accountLastScrapedAt ?? "none";
  const comparisonPayloadCacheKey = `${cacheDomainNorm}:comparison-payload:v2:${comparisonPayloadScrapeStamp}`;

  const {
    data: comparisonPayloadData,
    loading: comparisonPayloadLoading,
    error: comparisonPayloadCacheError,
    refetch: refetchComparisonPayload,
  } = useScrapeKeyedCache<ComparisonPayloadJson>({
    cacheKey: comparisonPayloadCacheKey,
    enabled: Boolean(cacheDomainNorm.trim()),
    persistAcrossTabs: true,
    validateCached: (c) =>
      c.ok === true &&
      Boolean(c.competitor?.payload?.map) &&
      typeof c.competitor?.derivedStats?.avgAdAgeDays === "number",
    fetcher: async () => {
      const res = await fetch(
        `/api/comparison/payload?competitorDomain=${encodeURIComponent(brand.domain)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as ComparisonPayloadJson;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `comparison/payload failed (${res.status})`);
      }
      return normalizeComparisonPayloadJson(json) ?? json;
    },
  });

  const comparisonPayload = useMemo(
    () => normalizeComparisonPayloadJson(comparisonPayloadData),
    [comparisonPayloadData]
  );

  const comparisonPayloadErrorMessage = comparisonPayloadCacheError?.message ?? null;

  useEffect(() => {
    if (!cacheDomainNorm.trim() || !brand.domain.trim()) return;

    let cancelled = false;
    let sawRunning = comparisonPayload?.competitor?.recomputing === true;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(brand.domain)}`,
          { credentials: "include" }
        );
        const json = (await res.json()) as { ok?: boolean; status?: string };
        if (cancelled || !json.ok) return;

        if (json.status === "running") {
          sawRunning = true;
          return;
        }

        const missingAudience = !comparisonPayload?.competitor?.payload?.audience_inference?.segments?.length;
        if (sawRunning && json.status === "idle" && missingAudience) {
          void refetchComparisonPayload();
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    brand.domain,
    cacheDomainNorm,
    comparisonPayload?.competitor?.payload?.audience_inference,
    comparisonPayload?.competitor?.recomputing,
    refetchComparisonPayload,
  ]);

  const landingPagesListStamp = accountLastScrapedAt ?? "none";
  const landingPagesListDomainKey = cacheDomainNorm.trim().toLowerCase();
  const landingPagesListCacheKey = `${landingPagesListDomainKey}:landing-pages:${competitorDbIdForSaved}:${landingPagesListStamp}:100`;

  const landingPagesListHook = useScrapeKeyedCache<LandingPagesApiResponse>({
    cacheKey: landingPagesListCacheKey,
    enabled: Boolean(competitorDbIdForSaved && cacheDomainNorm.trim()),
    validateCached: (c) => c.ok === true && Array.isArray(c.landingPages),
    fetcher: async () => {
      const res = await fetch(
        `/api/landing-pages?competitorId=${encodeURIComponent(competitorDbIdForSaved)}&limit=100`
      );
      const json = (await res.json()) as LandingPagesApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `landing-pages failed (${res.status})`);
      }
      return json;
    },
  });

  const landingPagesListCacheForChildren: SharedLandingPagesListCache | null = useMemo(() => {
    if (!competitorDbIdForSaved) return null;
    return {
      data: landingPagesListHook.data,
      loading: landingPagesListHook.loading,
      isValidating: landingPagesListHook.isValidating,
      error: landingPagesListHook.error,
      refetch: landingPagesListHook.refetch,
    };
  }, [
    competitorDbIdForSaved,
    landingPagesListHook.data,
    landingPagesListHook.loading,
    landingPagesListHook.isValidating,
    landingPagesListHook.error,
    landingPagesListHook.refetch,
  ]);

  useEffect(() => {
    const id = competitorDbIdForSaved;
    if (!id || isOwnWorkspace) {
      setServerScrapedAdTotal(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/competitor/velocity?competitorId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; velocities?: { total_count?: number }[] }) => {
        if (cancelled) return;
        if (!j.ok || !Array.isArray(j.velocities)) {
          setServerScrapedAdTotal(null);
          return;
        }
        const t = j.velocities.reduce((s, v) => s + (v.total_count ?? 0), 0);
        setServerScrapedAdTotal(t);
      })
      .catch(() => {
        if (!cancelled) setServerScrapedAdTotal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [competitorDbIdForSaved, isOwnWorkspace]);

  const ensureManualRefreshAllowed = useCallback((): boolean => {
    if (!canManualRefresh) {
      toast.error("Manual refresh is available on the Pro plan.");
      return false;
    }
    if (manualRefreshStatus && !manualRefreshStatus.canRefreshNow) {
      if (manualRefreshStatus.blockReason === "monthly_cap") {
        toast.error(
          `Manual refresh limit reached (${manualRefreshStatus.workspaceRefreshCount}/${manualRefreshStatus.workspaceLimit} this month).`,
        );
      } else if (manualRefreshStatus.nextRefreshAt) {
        const hours = Math.max(
          1,
          Math.ceil((Date.parse(manualRefreshStatus.nextRefreshAt) - Date.now()) / 3_600_000),
        );
        toast.error(`Please wait ${hours} hour(s) before refreshing this competitor again.`);
      } else {
        toast.error("Manual refresh is not available right now.");
      }
      return false;
    }
    return true;
  }, [canManualRefresh, manualRefreshStatus]);

  const handleManualPlatformRefresh = useCallback(
    async (platform: AdsLibraryPlatform) => {
      if (manualRefreshBusyPlatform || !competitorDbIdForSaved) return;
      if (!ensureManualRefreshAllowed()) return;
      setManualRefreshBusyPlatform(platform);
      try {
        const res = await fetch("/api/competitor/force-rescrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorId: competitorDbIdForSaved, platforms: [platform] }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (json?.ok) {
          await reloadPlatformFromCache(platform);
          await syncSavedCompetitorsFromAccount();
          void loadManualRefreshStatus();
          void loadPlatformTracking();
        } else {
          toast.error(typeof json?.error === "string" ? json.error : res.statusText || "Refresh failed");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Refresh error");
      } finally {
        setManualRefreshBusyPlatform(null);
      }
    },
    [
      competitorDbIdForSaved,
      ensureManualRefreshAllowed,
      loadManualRefreshStatus,
      manualRefreshBusyPlatform,
      reloadPlatformFromCache,
      loadPlatformTracking,
    ],
  );

  const manualRefreshDisabled =
    !canManualRefresh || !manualRefreshStatus?.canRefreshNow || manualRefreshBusyPlatform != null;

  const savedAdsLibraryItems = useMemo(() => {
    const items: { platform: string; libraryItemId: string }[] = [];
    for (const ad of filteredMetaAds) items.push({ platform: "meta", libraryItemId: ad.id });
    for (const ad of filteredTikTokAds) items.push({ platform: "tiktok", libraryItemId: ad.id });
    for (const ad of filteredLinkedInAds) items.push({ platform: "linkedin", libraryItemId: ad.id });
    for (const ad of filteredPinterestAds) items.push({ platform: "pinterest", libraryItemId: ad.id });
    for (const ad of filteredSnapchatAds) items.push({ platform: "snapchat", libraryItemId: ad.id });
    for (const row of filteredGoogleRows) {
      items.push({
        platform: row.type === "youtube" ? "youtube" : "google",
        libraryItemId: row.id,
      });
    }
    return items;
  }, [
    filteredMetaAds,
    filteredTikTokAds,
    filteredLinkedInAds,
    filteredPinterestAds,
    filteredSnapchatAds,
    filteredGoogleRows,
  ]);

  const { savedMap, scrapedIdForCard, toggleSave } = useSavedAdsStatus(
    competitorDbIdForSaved,
    savedAdsLibraryItems,
    undefined,
    cacheDomainNorm,
  );

  const adSaveProps = useCallback(
    (platform: string, libraryItemId: string) => {
      const sid = scrapedIdForCard(platform, libraryItemId);
      return {
        scrapedAdId: sid,
        isSaved: Boolean(sid && savedMap[sid]),
        onToggleSave: competitorDbIdForSaved ? () => void toggleSave(platform, libraryItemId) : undefined,
        saveDisabled: !competitorDbIdForSaved,
      };
    },
    [competitorDbIdForSaved, scrapedIdForCard, savedMap, toggleSave],
  );

  /** Skeleton grid only when there are no creatives yet; platform-only refresh keeps existing cards — spinner is on the refresh button. */
  const metaSectionBusy = useMemo(
    () =>
      fetchMeta &&
      ((metaRefreshing && filteredMetaAds.length === 0) ||
        (adLibLoading && filteredMetaAds.length === 0 && adLib?.meta?.error == null)),
    [fetchMeta, metaRefreshing, adLibLoading, filteredMetaAds.length, adLib?.meta?.error]
  );
  const googleSectionBusy = useMemo(
    () =>
      fetchGoogle &&
      ((googleRefreshing && filteredGoogleRows.length === 0) ||
        (adLibLoading && filteredGoogleRows.length === 0 && adLib?.google?.error == null)),
    [fetchGoogle, googleRefreshing, adLibLoading, filteredGoogleRows.length, adLib?.google?.error]
  );
  const linkedinSectionBusy = useMemo(
    () =>
      fetchLinkedIn &&
      ((linkedinRefreshing && filteredLinkedInAds.length === 0) ||
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
      ((tiktokRefreshing && filteredTikTokAds.length === 0) ||
        (adLibLoading && filteredTikTokAds.length === 0 && adLib?.tiktok?.error == null)),
    [fetchTikTok, tiktokRefreshing, adLibLoading, filteredTikTokAds.length, adLib?.tiktok?.error]
  );
  const pinterestSectionBusy = useMemo(
    () =>
      fetchPinterest &&
      ((pinterestRefreshing && filteredPinterestAds.length === 0) ||
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
      ((snapchatRefreshing && filteredSnapchatAds.length === 0) ||
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Top Header */}
      <div
        className={`relative shrink-0 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.5)] border-b ${
          isOwnWorkspace
            ? "border-sky-200/90 bg-gradient-to-br from-sky-50/95 via-amber-50/30 to-white/[0.92]"
            : "border-white/60 bg-white/70"
        }`}
      >
        {isOwnWorkspace ? (
          <div
            className="pointer-events-none absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-sky-500/85"
            aria-hidden
          />
        ) : null}
        {/* Brand identity + status */}
        <div className={`px-6 sm:px-8 lg:px-10 pt-6 sm:pt-7 pb-0 ${isOwnWorkspace ? "pl-7 sm:pl-9" : ""}`}>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <CompetitorLogo
                sources={{
                  primary: brand.logoUrl,
                  secondary: null,
                  domain: brand.domain,
                }}
                name={competitorDisplayLabel}
                size="lg"
                shape="rounded"
                className={
                  isOwnWorkspace
                    ? "border-2 border-sky-200/90 ring-2 ring-sky-100/80 shadow-sm"
                    : "border-[#e0e3e8] shadow-sm"
                }
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h1 className="text-[22px] sm:text-[26px] font-bold text-[#343434] tracking-[-0.02em] truncate">
                    {competitorDisplayLabel}
                  </h1>
                  {isOwnWorkspace ? (
                    <span className="shrink-0 rounded-full bg-sky-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-900">
                      Your brand
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className={`w-3.5 h-3.5 shrink-0 ${isOwnWorkspace ? "text-sky-700/70" : "text-[#a1a1aa]"}`}
                    />
                    <span
                      className={`text-[13px] ${isOwnWorkspace ? "text-sky-900/80" : "text-[#71717a]"}`}
                      title={
                        accountLastScrapedAt
                          ? new Date(accountLastScrapedAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : undefined
                      }
                    >
                      {void lastScrapeRelativeTick}
                      {isOwnWorkspace
                        ? accountLastScrapedAt
                          ? `Last scraped ${getTimeAgo(new Date(accountLastScrapedAt))}`
                          : "Scrape your ads from the Ads Library tab"
                        : accountLastScrapedAt
                          ? `Last scraped ${getTimeAgo(new Date(accountLastScrapedAt))}`
                          : adsLibraryShowsCreativesOnScreen
                            ? "First sync in progress · creatives loading"
                            : "Not yet scraped"}
                    </span>
                  </div>
                  {!isOwnWorkspace && competitorSidebarMatch?.lastWeeklyWeekStart ? (
                    <p
                      className="pl-[22px] text-[12px] leading-snug text-[#94a3b8]"
                      title={`Last automated spy run (UTC): ${competitorSidebarMatch.lastWeeklyWeekStart}`}
                    >
                      {formatSpySubtitle(competitorSidebarMatch.lastWeeklyWeekStart)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            {!isOwnWorkspace ? (
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                {competitorSidebarMatch?.savedCompetitorDbId ? (
                  <div
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[13px] font-semibold text-sky-900"
                    title="Competitors are automatically included in staggered library spy runs (Meta/Google/TikTok every 3 days; LinkedIn/Pinterest/Snapchat every 7 days)."
                  >
                    <SatelliteDish className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span>Spy monitoring on</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {pageTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled === true;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  title={isDisabled ? "Coming soon" : undefined}
                  onClick={() => {
                    if (isDisabled) return;
                    handleTabChange(tab.id);
                  }}
                  className={`relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isDisabled
                      ? "cursor-not-allowed border-transparent text-[#b8beca] opacity-60"
                      : isActive
                        ? isOwnWorkspace
                          ? "border-sky-600 text-slate-900"
                          : "border-[#343434] text-[#343434]"
                        : "border-transparent text-[#6b7280] hover:text-[#343434] hover:border-[#DDF1FD]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isDisabled
                        ? "text-[#b8beca]"
                        : isActive
                          ? tab.id === "alerts"
                            ? "text-amber-500"
                            : isOwnWorkspace
                              ? "text-sky-700"
                              : "text-[#343434]"
                          : "text-[#9ca3af]"
                    }`}
                  />
                  {tab.label}
                  {isDisabled ? <Lock className="h-3.5 w-3.5 shrink-0 text-[#b8beca]" aria-hidden /> : null}
                </button>
              );
            })}
          </nav>
          {(() => {
            const currentTab = findCompetitorTab(activeTab);
            if (!currentTab?.subTabs?.length) return null;
            return (
              <div className="border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1 overflow-x-auto px-6 py-2">
                  {currentTab.subTabs.map((st) => {
                    const isSubActive = activeSubTab === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSubTabChange(st.id)}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          isSubActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {st.label}
                        {st.isNew ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              isSubActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            NEW
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tab Content Areas */}
      <KeepMountedTab active={activeTab === "workspace-ads" && isOwnWorkspace} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-200">
            <WorkspaceAdSourcesPanel
              brandId={myBrand.id}
              domain={myBrand.domain ?? brand.domain}
              initialSetup={myBrand.adsSetup ?? null}
              noBottomMargin
            />
          </div>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "workspace-marketing-improvements" && isOwnWorkspace} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <div className="mx-auto max-w-[900px] px-6 py-8 sm:px-8 lg:px-10 animate-in fade-in duration-200">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-sky-950">How your marketing can improve</h2>
                <p className="mt-0.5 max-w-[40rem] text-[14px] text-sky-900/75">
                  We scan cached ad creative from every competitor you follow, compare patterns to your workspace, and
                  suggest what to push on vs what to leave alone.
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-sky-800/80">
                  AI-generated · uses your Ads Library cache (refresh rivals so evidence stays fresh)
                </p>
              </div>
              <button
                type="button"
                disabled={marketingCoachLoading}
                onClick={() => {
                  setMarketingCoach(null);
                  setMarketingCoachRefresh((n) => n + 1);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-white px-3 py-1.5 text-[12px] font-medium text-sky-950 shadow-sm hover:bg-sky-50 disabled:opacity-50"
              >
                {marketingCoachLoading ? (
                  <RivalLogoVideo size="inline" className="shrink-0" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh coaching
              </button>
            </div>

            {marketingCoachLoading ? (
              <RivalLoadingBlock size="2xl" className="py-12 sm:py-16" />
            ) : marketingCoachError ? (
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
                {marketingCoachError}
                <button
                  type="button"
                  className="mt-2 block text-[13px] font-medium text-amber-900 underline"
                  onClick={() => setMarketingCoachRefresh((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            ) : marketingCoach ? (
              <div className="space-y-5">
                {marketingCoach.competitorsConsidered.length > 0 ? (
                  <div className="rounded-2xl border border-sky-200/70 bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sky-900/70">Included rivals</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {marketingCoach.competitorsConsidered.map((c) => (
                        <span
                          key={`${c.domain}-${c.name}`}
                          className="rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 text-[12px] font-medium text-sky-950"
                        >
                          {c.name}
                          {c.domain ? ` · ${c.domain}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-sky-300/50 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 p-5 shadow-[0_8px_30px_rgba(14,116,144,0.08)]">
                  <p className="text-[15px] font-semibold leading-snug text-sky-950">Summary</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-sky-950/85 whitespace-pre-wrap">
                    {marketingCoach.coaching.executiveSummary}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-emerald-800/90">
                    Lean into (improve)
                  </p>
                  <div className="space-y-3">
                    {marketingCoach.coaching.improve.map((item, i) => (
                      <div
                        key={`imp-${i}`}
                        className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-4 py-3.5 shadow-sm"
                      >
                        <h3 className="text-[14px] font-semibold text-emerald-950">{item.title}</h3>
                        {item.groundedIn ? (
                          <p className="mt-1 text-[12px] font-medium text-emerald-900/70">{item.groundedIn}</p>
                        ) : null}
                        <p className="mt-2 text-[14px] leading-relaxed text-emerald-950/90 whitespace-pre-wrap">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-sky-800/90">
                    Keep doing (do not overhaul)
                  </p>
                  <div className="space-y-3">
                    {marketingCoach.coaching.keepDoing.map((item, i) => (
                      <div
                        key={`kd-${i}`}
                        className="rounded-2xl border border-sky-200/80 bg-white/90 px-4 py-3.5 shadow-sm"
                      >
                        <h3 className="text-[14px] font-semibold text-sky-950">{item.title}</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-sky-900/85 whitespace-pre-wrap">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-amber-900/90">
                    Avoid chasing
                  </p>
                  <div className="space-y-3">
                    {marketingCoach.coaching.doNotChase.map((item, i) => (
                      <div
                        key={`dnc-${i}`}
                        className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3.5 shadow-sm"
                      >
                        <h3 className="text-[14px] font-semibold text-amber-950">{item.title}</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-amber-950/90 whitespace-pre-wrap">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {marketingCoach.model ? (
                  <p className="text-center text-[11px] text-sky-900/50">Model: {marketingCoach.model}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "ads library"} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <div className="px-6 sm:px-8 lg:px-10 py-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-200">
            {activeSubTab === "saved" ? (
              <SavedAdsPanel
                competitorId={competitorDbIdForSaved}
                competitorLabel={competitorDisplayLabel}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                onFreshnessRescrape={undefined}
                onOpenAd={openAd}
              />
            ) : (
              <>
            {competitorDbIdForSaved ? (
              <FeatureSectionHeader
                className="mb-6"
                overline="Ad library"
                title={<>Scraped creatives for {competitorDisplayLabel}</>}
                description={
                  <>
                    {accountLastScrapedAt
                      ? <>Last scraped {getTimeAgo(new Date(accountLastScrapedAt))} · </>
                      : null}
                    Choose platforms below, then browse each channel section.
                  </>
                }
              />
            ) : null}
            {competitorDbIdForSaved ? (
              <AdLibraryAnalyticsPanel
                competitorId={competitorDbIdForSaved}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                platformActiveCounts={platformActiveCounts}
                platformTotalCounts={platformTotalCounts}
                onViewAllLandingPages={navigateToLandingPagesExplorer}
                onFreshnessRescrape={undefined}
                landingPagesListCache={landingPagesListCacheForChildren}
              />
            ) : showAdLibraryLinkingAnalyticsShell ? (
              <div className="mb-6 rounded-2xl border border-[#e5e7eb]/80 bg-gradient-to-br from-[#f8fafc] to-[#eff6ff]/60 px-4 py-14 sm:px-8 flex flex-col items-center justify-center gap-3 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <RivalLogoVideo size="md" className="opacity-90 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[#374151]">Connecting competitor to your workspace…</p>
                  <p className="text-[13px] leading-snug text-[#64748b] max-w-[28rem] mx-auto">
                    Analytics unlock as soon as the account link completes. Saved ads and ad detail use the same
                    step—you can keep browsing creatives below while this finishes.
                  </p>
                </div>
              </div>
            ) : null}
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
                        const trackingChip = showPlatformClassificationDebug
                          ? platformTrackingByPlatform[id]
                          : undefined;
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
                              {trackingChip ? (
                                <span
                                  className="mt-0.5 block max-w-full text-center font-mono text-[8px] font-medium leading-tight text-amber-800 sm:text-[9px]"
                                  title={[
                                    `${trackingChip.classification} · ${trackingChip.activeAdCount} active`,
                                    `${trackingChip.refreshIntervalDays}d interval · ${trackingChip.adsPerRefresh} ads/refresh`,
                                    trackingChip.nextScrapeAt
                                      ? `Next scrape: ${trackingChip.nextScrapeAt}`
                                      : "Next scrape: —",
                                    `Window: ${trackingChip.nextScrapeWindow.start} → ${trackingChip.nextScrapeWindow.end}`,
                                  ].join("\n")}
                                >
                                  <span className="block truncate">
                                    {trackingChip.classification} · {trackingChip.activeAdCount}
                                  </span>
                                  <span className="block truncate opacity-90">
                                    {trackingChip.refreshIntervalDays}d · {trackingChip.adsPerRefresh} ads
                                  </span>
                                  <span className="block truncate opacity-80">
                                    {trackingChip.nextScrapeAt
                                      ? `next ${new Date(trackingChip.nextScrapeAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                                      : "next —"}
                                  </span>
                                </span>
                              ) : showPlatformClassificationDebug ? (
                                <span className="mt-0.5 block text-center font-mono text-[9px] text-amber-800/50">
                                  —
                                </span>
                              ) : null}
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
                {canManualRefresh
                  ? "Click a platform's Refresh … only button below to load up to 300 ads active today."
                  : "Ads load automatically on a schedule, or upgrade to Pro for manual refresh."}
              </div>
            ) : null}

            {adsPlatforms.length === 0 ? (
              <p className="text-[14px] text-[#6b7280] py-4">
                None of your selected channels use the live ads API (Meta, Google/YouTube, LinkedIn, TikTok, Pinterest, or Snapchat). Pick at least one when you choose platforms to show during search, or add identifiers in discovery.
              </p>
            ) : null}

            {canManualRefresh && manualRefreshQuotaHint ? (
              <p className="mb-4 text-[12px] text-[#6b7280]">{manualRefreshQuotaHint}</p>
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
                        <PlatformLastScrapedLine
                          busy={metaSectionBusy}
                          busyLabel={metaRefreshing ? "Refreshing Meta ads…" : "Loading ads…"}
                          lastScrapedAt={lastScrapedAtForPlatform("meta")}
                          errorSuffix={
                            adLib?.meta?.error && metaAds.length === 0 ? adLib.meta.error : null
                          }
                        />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        metaRefreshing ||
                        manualRefreshBusyPlatform === "meta" ||
                        manualRefreshDisabled ||
                        !fetchMeta
                      }
                      onClick={() => void handleManualPlatformRefresh("meta")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Meta only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${metaRefreshing || manualRefreshBusyPlatform === "meta" ? "motion-safe:animate-spin" : ""}`}
                      />
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
                  ) : inlinePreviewMetaAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewMetaAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <MetaAdCard
                          key={ad.id}
                          ad={ad}
                          viewMode="grid"
                          brand={brand}
                          onClick={() => openAdLibraryCard("meta", ad.id)}
                          {...adSaveProps("meta", ad.id)}
                        />
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
                onAdActivate={(ad) => openAdLibraryCard("meta", ad.id)}
                getMetaAdExtras={(ad) => adSaveProps("meta", ad.id)}
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
                      <PlatformLastScrapedLine
                        busy={googleSectionBusy}
                        busyLabel={
                          googleRefreshing ? "Refreshing Google / YouTube ads…" : "Loading…"
                        }
                        lastScrapedAt={lastScrapedAtForPlatform("google")}
                        errorSuffix={
                          adLib?.google?.error && googleRows.length === 0 ? adLib.google.error : null
                        }
                      />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        googleRefreshing ||
                        manualRefreshBusyPlatform === "google" ||
                        manualRefreshDisabled ||
                        !fetchGoogle
                      }
                      onClick={() => void handleManualPlatformRefresh("google")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Google / YouTube only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${googleRefreshing || manualRefreshBusyPlatform === "google" ? "motion-safe:animate-spin" : ""}`}
                      />
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
                  ) : inlinePreviewGoogleRows.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewGoogleRows.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <GoogleAdRowCard
                          key={ad.id}
                          ad={ad}
                          brand={brand}
                          onOpenDetail={() =>
                            void openAdLibraryCard(ad.type === "youtube" ? "youtube" : "google", ad.id)
                          }
                          {...adSaveProps(ad.type === "youtube" ? "youtube" : "google", ad.id)}
                        />
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
                renderItem={(ad) => (
                  <GoogleAdRowCard
                    ad={ad}
                    brand={brand}
                    onOpenDetail={() =>
                      void openAdLibraryCard(ad.type === "youtube" ? "youtube" : "google", ad.id)
                    }
                    {...adSaveProps(ad.type === "youtube" ? "youtube" : "google", ad.id)}
                  />
                )}
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
                      <PlatformLastScrapedLine
                        busy={linkedinSectionBusy}
                        busyLabel={linkedinRefreshing ? "Refreshing LinkedIn ads…" : "Loading…"}
                        lastScrapedAt={lastScrapedAtForPlatform("linkedin")}
                        errorSuffix={
                          adLib?.linkedin?.error && linkedinAds.length === 0
                            ? adLib.linkedin.error
                            : null
                        }
                      />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        linkedinRefreshing ||
                        manualRefreshBusyPlatform === "linkedin" ||
                        manualRefreshDisabled ||
                        !fetchLinkedIn
                      }
                      onClick={() => void handleManualPlatformRefresh("linkedin")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch LinkedIn only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${linkedinRefreshing || manualRefreshBusyPlatform === "linkedin" ? "motion-safe:animate-spin" : ""}`}
                      />
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
                  ) : inlinePreviewLinkedInAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewLinkedInAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <LinkedInFeedAdCard
                          key={ad.id}
                          ad={ad}
                          brand={brand}
                          onOpenDetail={() => void openAdLibraryCard("linkedin", ad.id)}
                          {...adSaveProps("linkedin", ad.id)}
                        />
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
                renderItem={(ad) => (
                  <LinkedInFeedAdCard
                    ad={ad}
                    brand={brand}
                    onOpenDetail={() => void openAdLibraryCard("linkedin", ad.id)}
                    {...adSaveProps("linkedin", ad.id)}
                  />
                )}
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
                      <PlatformLastScrapedLine
                        busy={tiktokSectionBusy}
                        busyLabel={tiktokRefreshing ? "Refreshing TikTok ads…" : "Loading…"}
                        lastScrapedAt={lastScrapedAtForPlatform("tiktok")}
                        errorSuffix={
                          adLib?.tiktok?.error && tiktokAds.length === 0 ? adLib.tiktok.error : null
                        }
                      />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        tiktokRefreshing ||
                        manualRefreshBusyPlatform === "tiktok" ||
                        manualRefreshDisabled ||
                        !fetchTikTok
                      }
                      onClick={() => void handleManualPlatformRefresh("tiktok")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch TikTok only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${tiktokRefreshing || manualRefreshBusyPlatform === "tiktok" ? "motion-safe:animate-spin" : ""}`}
                      />
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
                  ) : inlinePreviewTikTokAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewTikTokAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <TikTokAdCard
                          key={ad.id}
                          ad={ad}
                          onClick={() => void openAdLibraryCard("tiktok", ad.id)}
                          {...adSaveProps("tiktok", ad.id)}
                        />
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
                renderItem={(ad) => (
                  <TikTokAdCard ad={ad} onClick={() => void openAdLibraryCard("tiktok", ad.id)} {...adSaveProps("tiktok", ad.id)} />
                )}
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
                      <PlatformLastScrapedLine
                        busy={pinterestSectionBusy}
                        busyLabel={pinterestRefreshing ? "Refreshing Pinterest ads…" : "Loading…"}
                        lastScrapedAt={lastScrapedAtForPlatform("pinterest")}
                        errorSuffix={
                          adLib?.pinterest?.error && pinterestAds.length === 0
                            ? adLib.pinterest.error
                            : null
                        }
                      />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        pinterestRefreshing ||
                        manualRefreshBusyPlatform === "pinterest" ||
                        manualRefreshDisabled ||
                        !fetchPinterest
                      }
                      onClick={() => void handleManualPlatformRefresh("pinterest")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Pinterest only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${pinterestRefreshing || manualRefreshBusyPlatform === "pinterest" ? "motion-safe:animate-spin" : ""}`}
                      />
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
                  ) : inlinePreviewPinterestAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewPinterestAds.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <PinterestAdCard
                          key={ad.id}
                          ad={ad}
                          onClick={() => void openAdLibraryCard("pinterest", ad.id)}
                          {...adSaveProps("pinterest", ad.id)}
                        />
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
                renderItem={(ad) => (
                  <PinterestAdCard ad={ad} onClick={() => void openAdLibraryCard("pinterest", ad.id)} {...adSaveProps("pinterest", ad.id)} />
                )}
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
                        <PlatformLastScrapedLine
                          busy={snapchatSectionBusy}
                          busyLabel={
                            snapchatRefreshing ? "Refreshing Snapchat ads…" : "Loading…"
                          }
                          lastScrapedAt={lastScrapedAtForPlatform("snapchat")}
                          errorSuffix={
                            adLib?.snapchat?.error && snapchatAds.length === 0
                              ? adLib.snapchat.error
                              : null
                          }
                        />
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
                {canManualRefresh && adsApiConfigured ? (
                  <div className={platformRefreshActionsRowClass}>
                    <button
                      type="button"
                      disabled={
                        snapchatRefreshing ||
                        manualRefreshBusyPlatform === "snapchat" ||
                        manualRefreshDisabled ||
                        !fetchSnapchat
                      }
                      onClick={() => void handleManualPlatformRefresh("snapchat")}
                      className={platformRefreshOnlyButtonClass}
                      title="Re-fetch Snapchat only (active today, up to 300 ads)."
                    >
                      <RefreshCw
                        className={`h-4 w-4 shrink-0 ${snapchatRefreshing || manualRefreshBusyPlatform === "snapchat" ? "motion-safe:animate-spin" : ""}`}
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
                  ) : inlinePreviewSnapchatAds.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewSnapchatAds
                        .slice(0, META_ADS_INLINE_PREVIEW)
                        .map((ad) => (
                          <SnapchatAdCard
                            key={ad.id}
                            ad={ad}
                            onClick={() => void openAdLibraryCard("snapchat", ad.id)}
                            {...adSaveProps("snapchat", ad.id)}
                          />
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
                renderItem={(ad) => (
                  <SnapchatAdCard ad={ad} onClick={() => void openAdLibraryCard("snapchat", ad.id)} {...adSaveProps("snapchat", ad.id)} />
                )}
              />
              </section>
            ) : null}

            </div>
            </div>
              </>
            )}
          </div>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "insights"} className="min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <Suspense
            fallback={
              <RivalLoadingBlock padded className="py-14" />
            }
          >
            <KeepMountedTab active={activeSubTab === "strategy-map"} className="min-h-0">
              <StrategyOverviewApp
                brand={brand}
                onOpenAdsLibrary={() => handleTabChange("ads library")}
                competitorId={competitorDbIdForSaved || undefined}
                lastScrapedAt={accountLastScrapedAt}
                onFreshnessRescrape={undefined}
              />
            </KeepMountedTab>
            <KeepMountedTab active={activeSubTab === "activity-feed"} className="min-h-0">
              <ActivityFeedTab
                competitorDomain={brand.domain}
                competitorLabel={competitorDisplayLabel}
                competitorId={competitorDbIdForSaved}
                comparisonPayload={comparisonPayload}
                comparisonPayloadLoading={comparisonPayloadLoading}
                comparisonPayloadError={comparisonPayloadErrorMessage}
                refetchComparisonPayload={refetchComparisonPayload}
              />
            </KeepMountedTab>
          </Suspense>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "tests"} className="min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <KeepMountedTab active={activeSubTab === "creative-tests"} className="min-h-0">
            <CreativeTestsTab
              competitorId={competitorSidebarMatch?.savedCompetitorDbId ?? ""}
              competitorLabel={competitorDisplayLabel}
              cacheDomainNorm={cacheDomainNorm}
              lastScrapedAt={accountLastScrapedAt}
              onFreshnessRescrape={undefined}
              onOpenAd={openAd}
            />
          </KeepMountedTab>
          <KeepMountedTab active={activeSubTab === "timeline"} className="min-h-0">
            <TimelineTab
              competitorId={competitorSidebarMatch?.savedCompetitorDbId ?? ""}
              competitorLabel={competitorDisplayLabel}
              cacheDomainNorm={cacheDomainNorm}
              lastScrapedAt={accountLastScrapedAt}
              onFreshnessRescrape={undefined}
              onOpenAd={openAd}
            />
          </KeepMountedTab>
          <KeepMountedTab active={activeSubTab === "landing-pages"} className="min-h-0">
            <LandingPagesTab
              competitorId={competitorSidebarMatch?.savedCompetitorDbId ?? ""}
              competitorLabel={competitorDisplayLabel}
              cacheDomainNorm={cacheDomainNorm}
              lastScrapedAt={accountLastScrapedAt}
              onFreshnessRescrape={undefined}
              onOpenAd={openAd}
              landingPagesListCache={landingPagesListCacheForChildren}
            />
          </KeepMountedTab>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "audience-copy"} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <KeepMountedTab active={activeSubTab === "audience"} className="min-h-0">
            <AudienceTab
              competitorDomain={brand.domain}
              workspaceName={myBrand.name}
              workspaceLogoUrl={myBrand.logoUrl ?? null}
              workspaceDomain={myBrand.domain ?? null}
              workspaceColor={myBrand.color ?? undefined}
              workspaceBadge={myBrand.badge ?? undefined}
              competitorLabel={competitorDisplayLabel}
              competitorLogoUrl={brand.logoUrl}
              comparisonPayload={comparisonPayload}
              comparisonPayloadLoading={comparisonPayloadLoading}
              comparisonPayloadError={comparisonPayloadErrorMessage}
            />
          </KeepMountedTab>
          <KeepMountedTab active={activeSubTab === "copy-vault"} className="min-h-0">
            <CopyVaultTab
              competitorId={competitorSidebarMatch?.savedCompetitorDbId ?? ""}
              competitorLabel={competitorDisplayLabel}
              onOpenAd={openAd}
              cacheDomainNorm={cacheDomainNorm}
              lastScrapedAt={accountLastScrapedAt}
            />
          </KeepMountedTab>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "comparison" && !isOwnWorkspace} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <div className="animate-in fade-in duration-200">
            <ComparisonPage
              isConfirmed={isConfirmed}
              competitorDisplayLabel={competitorDisplayLabel}
              competitor={{ name: brand.name, domain: brand.domain, logoUrl: brand.logoUrl }}
              workspace={{
                name: myBrand.name,
                domain: myBrand.domain ?? null,
                logoUrl: myBrand.logoUrl ?? null,
                brandContext: myBrand.brandContext,
                color: myBrand.color,
                badge: myBrand.badge,
              }}
              comparisonPayload={comparisonPayload}
              comparisonPayloadLoading={comparisonPayloadLoading}
              comparisonPayloadError={comparisonPayloadErrorMessage}
              onRefreshComparisonPayload={() => void refetchComparisonPayload()}
              cacheDomainNorm={cacheDomainNorm}
              onOpenAd={openAd}
            />
          </div>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={activeTab === "alerts"} className="min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          <AlertsTab />
        </div>
      </KeepMountedTab>

      <AdDetailDrawer adId={activeAdId} onClose={closeAd} />
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
