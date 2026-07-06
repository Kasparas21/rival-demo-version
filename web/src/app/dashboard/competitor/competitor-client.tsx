"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense, startTransition } from "react";
import {
  Sparkles,
  BarChart2,
  Globe,
  RefreshCw,
  Clock,
  ExternalLink,
  Play,
  Video,
  Check,
  Lock,
  X,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { friendlySavedCompetitorsSchemaError } from "@/lib/account/saved-competitors-schema";
import { isLibraryItemSaved, useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";
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
import { buildLibraryCardDetailSeed } from "@/lib/ad-detail/library-ad-seed";
import type { AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
import { AdSaveRow, AdSaveVisibilityProvider } from "@/components/ads-library/ad-save-row";
import { AdLibraryRunStatusBadge } from "@/components/ads-library/ad-library-run-status-badge";
import { AdCardTopRightLinkStack } from "@/components/ads-library/creative-test-winner-trophy";
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
import {
  channelsQueryToAdsPlatforms,
  resolveCompetitorTrackedAdsPlatforms,
  unionAdsPlatformsFromSources,
} from "@/lib/ad-library/channels-to-platforms";
import { PLATFORM_CONNECTION_FIELD_SPECS } from "@/lib/ad-library/platform-connection-fields";
import {
  coerceAdsLibraryResponse,
  mergeAdsLibraryState,
  type AdsLibraryPlatform,
} from "@/lib/ad-library/api-types";
import {
  fetchAdsLibraryDeduplicated,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "@/lib/ad-library/deduped-fetch";
import { buildClientAdsLibraryPayload } from "@/lib/ad-library/build-client-ads-library-payload";
import { readAdLibraryRegionPrefsFromSession } from "@/lib/ad-library/ad-library-region-prefs";
import {
  normalizeGoogleAdsRegion,
} from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import {
  applyWorkspaceRescrapeLimits,
  mergeScrapeFieldsWithWorkspaceMarkets,
  readScrapeRequestFieldsFromStorage,
} from "@/lib/ad-library/scrape-request-fields";
import { WORKSPACE_RESCRAPE_ADS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import {
  googleCreativeDisplayUrl,
  resolveGoogleStillPreviewDisplayUrl,
} from "@/lib/ad-library/google-creative-display-url";
import {
  extractYouTubeVideoId,
  googleAdsExternalLinkLabel,
  isUsableGoogleStillImagePreviewUrl,
  youtubePosterCandidateUrls,
  youtubeThumbnailFromUrl,
  type GoogleAdRow,
  type LinkedInAdCard,
  type PinterestAdCard as PinterestAdCardModel,
  type SnapchatAdCard as SnapchatAdCardModel,
  type TikTokAdCard as TikTokAdCardModel,
} from "@/lib/ad-library/normalize";
import { hydrateMetaLibraryCardForDisplay } from "@/lib/ad-library/resolve-meta-library-card-preview";
import { metaLibraryItemLookupKeys } from "@/lib/ad-library/meta-library-item-keys";
import { platformHasScrapedLibraryData } from "@/lib/ad-library/library-response-utils";
import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";
import { resolveGoogleAdRowTransparencyHref } from "@/lib/ad-detail/resolve-ad-library-url";
import {
  countActiveGoogleRowsWithLifecycle,
  countActiveLinkedInAds,
  countActiveMetaAds,
  googleRowFirstShownYmd,
  hydrateMetaAdCardForLibrary,
  countActivePinterestAds,
  countActiveSnapchatAds,
  countActiveTikTokAds,
} from "@/lib/ad-library/count-active-ads";
import {
  computeLibraryAdRunDays,
  isLibraryAdKilled,
  type LibraryRunStatus,
} from "@/lib/ad-library/library-run-status";
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
import { hostToBrandLabel } from "@/lib/onboarding/host";
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
  WORKSPACE_BRAND_PLACEHOLDER_SLUG,
  type SidebarCompetitor,
  upsertSidebarCompetitor,
} from "@/lib/sidebar-competitors";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { ComparisonPage } from "@/components/comparison/comparison-page";
import { buildAdEvidenceText, buildDualBrandAdEvidenceText } from "@/lib/brand-comparison/build-ad-evidence";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import {
  markEnsurePersistedSuccess,
  prefetchCompetitorFeatureCaches,
  shouldSkipEnsurePersisted,
} from "@/lib/cache/prefetch-competitor-features";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { normalizeComparisonPayloadJson } from "@/lib/comparison/normalize-comparison-payload-json";
import { fetchSavedCompetitorsFromAccount } from "@/lib/account/client";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";
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
  competitorPageTabsForView,
  competitorSubTabsForView,
  findCompetitorTab,
  isGlobalDebugOnlyTab,
  isLegacyOwnBrandTabId,
  isOwnBrandDebugOnlySubTab,
  isOwnBrandDebugOnlyTab,
  ownBrandInsightsDefaultSubTab,
  resolveSubTabFromParams,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { COMPETITOR_PAGE_X, scrollDashboardMainToTop } from "@/components/dashboard/competitor/competitor-page-layout";
import {
  CompetitorCompactStickyNavAttached,
  CompetitorHeaderScrollSentinel,
} from "@/components/dashboard/competitor/competitor-compact-sticky-nav";
import { KeepMountedTab } from "@/components/competitor/keep-mounted-tab";
import {
  RecomputePollProvider,
  type RecomputePollState,
} from "@/components/competitor/recompute-poll-context";
import { ActivityFeedTab } from "@/components/competitor/insights/activity-feed-tab";
import { CreativeTestsTab } from "@/components/competitor/tests-timeline/creative-tests-tab";
import { CompetitorPaidMediaSettingsPanel } from "@/components/competitor/paid-media-settings-panel";
import { TimelineTab } from "@/components/competitor/tests-timeline/timeline-tab";
import {
  type LandingPagesApiResponse,
  type SharedLandingPagesListCache,
} from "@/components/competitor/landing-pages-tab";
import { WebsiteTab } from "@/components/website-tracker/WebsiteTab";
import { StrategyOverviewApp } from "@/components/strategy-overview/strategy-overview-app";
import { AudienceTab } from "@/components/competitor/audience-copy/audience-tab";
import { CopyVaultTab } from "@/components/competitor/audience-copy/copy-vault-tab";
import { AlertsTab } from "@/components/competitor/alerts/alerts-tab";
import { EmailMarketingTab } from "@/components/email-intelligence/EmailMarketingTab";
import { OrganicTab } from "@/components/organic/OrganicTab";
import { BenchmarkTab } from "@/components/benchmark/benchmark-tab";
import { WorkspaceSetupChecklist } from "@/components/workspace/workspace-setup-checklist";
import { AlertUnreadCountBadge } from "@/components/competitor/alerts/alert-ui-styles";
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

function formatLastScrapedLine(iso: string | null | undefined): string {
  if (!iso) return "No scrape yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No scrape yet";
  const wd = d.toLocaleDateString(undefined, { weekday: "short" });
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const dom = d.getDate();
  return `Last scraped ${wd} ${mon} ${dom} (${formatTimeAgo(d)})`;
}

/**
 * Inline Ads Library grid: at most {@link META_ADS_INLINE_PREVIEW} cards per platform.
 * Use 3 columns from `md` up so three cards span the full row (avoid `xl:grid-cols-4` with only 3 items,
 * which left an empty fourth column and looked left-clumped).
 */
const ADS_GRID_CLASS = "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3";

/** Meta cards stretch to equal row height; footer pins to bottom via flex in MetaAdCard. */
const META_ADS_GRID_CLASS = "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3";

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

function formatNextScrapeChipLabel(nextScrapeAt: string | null | undefined, nowMs = Date.now()): string {
  if (!nextScrapeAt) return "next —";
  const dueMs = Date.parse(nextScrapeAt);
  if (Number.isNaN(dueMs)) return "next —";
  if (dueMs <= nowMs) return "Due now";
  return `next ${new Date(nextScrapeAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function isNextScrapeOverdue(nextScrapeAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!nextScrapeAt) return false;
  const dueMs = Date.parse(nextScrapeAt);
  return !Number.isNaN(dueMs) && dueMs <= nowMs;
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

function GoogleAdRowCard({
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
  isCreativeTestWinner,
}: {
  ad: LinkedInAdCard;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  isCreativeTestWinner?: boolean;
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
          <AdCardTopRightLinkStack
            href={ad.adUrl}
            hrefTitle="Open original ad on LinkedIn"
            isCreativeTestWinner={isCreativeTestWinner}
            onLinkClick={(e) => e.stopPropagation()}
            linkClassName="rounded-md p-1.5 transition-colors hover:bg-[#f3f4f6] hover:text-[#0a66c2] text-[#6b7280]"
          />
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

function AiAdAnalysisNotice({
  running,
  enrichmentRate,
  enrichedCount,
  totalCount,
  complete = false,
  onDismiss,
}: {
  running: boolean;
  enrichmentRate?: number | null;
  enrichedCount?: number | null;
  totalCount?: number | null;
  complete?: boolean;
  onDismiss: () => void;
}) {
  const hasProgress =
    typeof enrichedCount === "number" &&
    typeof totalCount === "number" &&
    totalCount > 0;
  const pct =
    typeof enrichmentRate === "number"
      ? Math.max(0, Math.min(100, Math.round(enrichmentRate * 100)))
      : hasProgress
        ? Math.max(0, Math.min(100, Math.round((enrichedCount / totalCount) * 100)))
        : null;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-amber-50/70 px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
          {complete ? <Check className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">
            {complete ? "All ads have been analyzed" : "AI is still analyzing this ad library"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
            {complete
              ? "The latest strategy, tests, audience, copy, and comparison results are now based on the completed analysis."
              : "Right after a scrape, Rival can show the ads immediately, but strategy, tests, audience, copy, and comparison improve as each ad is classified in the background."}
          </p>
          {!complete ? (
            <p className="mt-2 text-[11px] font-medium text-sky-800">
              {running
                ? "Analysis is running now. You can keep browsing; this page will refresh as richer results become available."
                : "Some results are early estimates and may sharpen after the background analysis catches up."}
              {pct !== null ? ` About ${pct}% analyzed so far.` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          aria-label="Dismiss AI analysis notice"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function WorkspaceAdSourcesPanel({
  brandId,
  brandName,
  domain,
  initialSetup,
  noBottomMargin,
}: {
  brandId: string;
  brandName: string;
  domain: string;
  initialSetup: AdsProfileSetup | null;
  /** When embedded in a full tab, avoid extra bottom margin. */
  noBottomMargin?: boolean;
}) {
  const router = useRouter();
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
  const [rescraping, setRescraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  /** Full country flag strip — only after user expands (default: Auto, compact). */
  const [showRegionFlags, setShowRegionFlags] = useState(false);
  const showDebugRescrapeAds =
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true";

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

  const shouldAutoNameBrand = (name: string): boolean => {
    const trimmed = name.trim();
    return (
      /^brand\s+\d+$/i.test(trimmed) ||
      /^(new brand|my brand|brand|your workspace)$/i.test(trimmed)
    );
  };

  const resolveWorkspaceBrandIdentity = async (
    savedDomain: string,
  ): Promise<{ name: string; logoUrl?: string } | null> => {
    const fallbackName = hostToBrandLabel(savedDomain);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: savedDomain, channels }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        brand?: { name?: string; domain?: string; logoUrl?: string };
      } | null;
      if (!res.ok || !json?.success) {
        return { name: fallbackName };
      }
      const discoveredName = json.brand?.name?.trim();
      return {
        name: discoveredName && !shouldAutoNameBrand(discoveredName) ? discoveredName : fallbackName,
        ...(json.brand?.logoUrl?.trim() ? { logoUrl: json.brand.logoUrl.trim() } : {}),
      };
    } catch {
      return { name: fallbackName };
    }
  };

  const persistSetup = async (): Promise<boolean> => {
    const adMarketCountryCodes = marketsAuto
      ? [...ONBOARDING_AD_MARKET_CODES]
      : [...selectedMarketCodes];
    if (!marketsAuto && adMarketCountryCodes.length === 0) {
      setError("Select at least one region below, or turn on Auto (all supported regions).");
      return false;
    }
    if (channels.length === 0) {
      setError("Select at least one ad platform.");
      return false;
    }
    const payload: AdsProfileSetup = {
      channels,
      adMarketCountryCodes: [...adMarketCountryCodes].sort(),
      scrape: { ...scrape },
    };
    const body: {
      id?: string;
      ads_profile_setup: Record<string, unknown>;
      domain?: string;
      name?: string;
      logo_url?: string;
    } = {
      ads_profile_setup: adsProfileSetupV1(payload),
    };
    if (brandId && brandId !== "_workspace") {
      body.id = brandId;
    }
    const savedDomain = normalizeCompetitorSlug(scrape.websiteUrl);
    if (savedDomain && savedDomain !== WORKSPACE_BRAND_PLACEHOLDER_SLUG) {
      body.domain = savedDomain;
      if (shouldAutoNameBrand(brandName)) {
        const identity = await resolveWorkspaceBrandIdentity(savedDomain);
        if (identity?.name) body.name = identity.name;
        if (identity?.logoUrl) body.logo_url = identity.logoUrl;
      }
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
      return false;
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
    window.dispatchEvent(new Event(RIVAL_BRANDS_UPDATED_EVENT));
    return true;
  };

  const onSaveAndStartScrape = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await persistSetup();
      if (!saved) return;
      router.push(buildWorkspaceBrandScrapeHref(brandId), { scroll: false });
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const onRescrapeAds = async () => {
    setRescraping(true);
    setError(null);
    const toastId = toast.loading("Starting fresh scrape…");
    try {
      const saved = await persistSetup();
      if (!saved) {
        toast.dismiss(toastId);
        return;
      }

      const adMarketCountryCodes = marketsAuto
        ? [...ONBOARDING_AD_MARKET_CODES]
        : [...selectedMarketCodes];
      const effectiveWorkspaceDomain = normalizeCompetitorSlug(scrape.websiteUrl) || baseDomain;
      const mergedIds = scrapeHintsToPlatformIds({
        scrape,
        workspaceDomain: effectiveWorkspaceDomain,
        channels,
      });
      const platforms = channelsQueryToAdsPlatforms(channels);
      if (platforms.length === 0) {
        toast.dismiss(toastId);
        toast.error("Enable at least one platform to rescrape.");
        return;
      }

      const scrapeFields = mergeScrapeFieldsWithWorkspaceMarkets(
        readScrapeRequestFieldsFromStorage(),
        adMarketCountryCodes,
      );
      const scrapeFieldsForApify = applyWorkspaceRescrapeLimits(scrapeFields);
      const tiktokRegion = normalizeTikTokAdsRegion(readStoredTiktokRegion());
      const googleRegion = normalizeGoogleAdsRegion(readStoredGoogleRegion());
      const pinterestCountry = normalizePinterestAdsCountry(readStoredPinterestCountry());

      const hookPayload = buildClientAdsLibraryPayload({
        brand: {
          name: brandName.trim() || effectiveWorkspaceDomain,
          domain: effectiveWorkspaceDomain,
        },
        ids: mergedIds,
        adsPlatforms: platforms,
        scrapeFields,
        tiktokRegion,
        googleRegion,
        pinterestCountry,
      });

      const apiPayload = {
        ...hookPayload,
        libraryChannels: channels,
        metaMaxAds: scrapeFieldsForApify.metaMaxAds,
        linkedinMaxAds: scrapeFieldsForApify.linkedinMaxAds,
        tiktokMaxAds: scrapeFieldsForApify.tiktokMaxAds,
        pinterestMaxResults: scrapeFieldsForApify.pinterestMaxResults,
        snapchatMaxItems: scrapeFieldsForApify.snapchatMaxItems,
        googleResultsLimit: WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.google,
      };

      let mergedResponse = coerceAdsLibraryResponse(null);
      let allHttpOk = true;

      for (let i = 0; i < platforms.length; i += 1) {
        const platform = platforms[i]!;
        toast.loading(`Scraping ${platform} (${i + 1}/${platforms.length})…`, { id: toastId });
        const { response, httpOk } = await fetchAdsLibraryDeduplicated(
          { ...apiPayload, platforms: [platform] },
          { skipCache: true, clientSkipReadCache: true },
        );
        mergedResponse = coerceAdsLibraryResponse(mergeAdsLibraryState(mergedResponse, response));
        if (!httpOk) allHttpOk = false;
      }

      writeAdsLibrarySessionCache(stableAdsLibraryPayloadKey(hookPayload), {
        response: mergedResponse,
        httpOk: allHttpOk,
      });

      let competitorIdForPersist = "";
      try {
        const qs =
          brandId && brandId !== "_workspace" ? `?brandId=${encodeURIComponent(brandId)}` : "";
        const wsRes = await fetch(`/api/account/workspace-last-scrape${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (wsRes.ok) {
          const wsJson = (await wsRes.json()) as { competitorId?: string | null };
          competitorIdForPersist = wsJson.competitorId?.trim() ?? "";
        }
      } catch {
        /* best-effort */
      }

      try {
        await fetch("/api/competitor/ads-library/ensure-persisted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            domain: baseDomain,
            ...(competitorIdForPersist ? { competitorId: competitorIdForPersist } : {}),
          }),
        });
      } catch {
        /* best-effort */
      }

      toast.dismiss(toastId);
      if (allHttpOk) {
        toast.success("Rescrape complete. Ad Library is updating with fresh ads.");
      } else {
        toast.error("Some platforms failed to scrape. Check your connections and try again.");
      }
      window.dispatchEvent(
        new CustomEvent<AdsLibraryUpdatedDetail>(ADS_LIBRARY_UPDATED_EVENT, {
          detail: { domain: baseDomain },
        }),
      );
    } catch {
      toast.dismiss(toastId);
      toast.error("Network error");
    } finally {
      setRescraping(false);
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
    const spec = PLATFORM_CONNECTION_FIELD_SPECS[id];
    if (!spec) return null;
    switch (id) {
      case "meta":
        return {
          id: "rival-ws-meta",
          ...spec,
          value: scrape.metaAdsLibraryUrl,
          onChange: (v) => patchScrape({ metaAdsLibraryUrl: v }),
        };
      case "google":
        return {
          id: "rival-ws-google",
          ...spec,
          value: scrape.googleAdsTransparencyUrl,
          onChange: (v) => patchScrape({ googleAdsTransparencyUrl: v }),
        };
      case "linkedin":
        return {
          id: "rival-ws-li",
          ...spec,
          value: scrape.linkedInUrl,
          onChange: (v) => patchScrape({ linkedInUrl: v }),
        };
      case "tiktok":
        return {
          id: "rival-ws-tt",
          ...spec,
          value: scrape.tiktokKeyword,
          onChange: (v) => patchScrape({ tiktokKeyword: v }),
        };
      case "pinterest":
        return {
          id: "rival-ws-pin",
          ...spec,
          value: scrape.pinterestKeyword,
          onChange: (v) => patchScrape({ pinterestKeyword: v }),
        };
      case "snapchat":
        return {
          id: "rival-ws-snap",
          ...spec,
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void onSaveAndStartScrape()}
              disabled={saving || rescraping}
              className="w-full rounded-xl bg-gradient-to-r from-sky-700 to-sky-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(14,116,144,0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Starting scrape…" : "Save and start scraping"}
            </button>
            {showDebugRescrapeAds ? (
              <button
                type="button"
                onClick={() => void onRescrapeAds()}
                disabled={saving || rescraping || channels.length === 0}
                title="Hidden from users — visible only with NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION"
                className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/90 bg-white px-4 py-2.5 text-[13px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50 disabled:opacity-50 sm:w-auto"
              >
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
                  aria-hidden
                />
                {rescraping ? (
                  <RivalLogoVideo size="inline" className="shrink-0" aria-hidden />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                )}
                {rescraping ? "Rescraping…" : "Rescrape ads"}
              </button>
            ) : null}
          </div>
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
  const myBrand = useActiveBrand();
  const [sidebarSnapshot, setSidebarSnapshot] = useState<SidebarCompetitor[] | undefined>(undefined);
  const [sidebarSnapshotBrandId, setSidebarSnapshotBrandId] = useState<string | null>(null);
  useEffect(() => {
    const load = () => {
      setSidebarSnapshot(loadSidebarCompetitors());
      setSidebarSnapshotBrandId(myBrand.id);
    };
    load();
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, load);
    return () => window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, load);
  }, [canonicalHost, sidebarEpoch, myBrand.id]);

  const { brand, platformIds, channelsFromResolver, isConfirmed, isOwnWorkspace } = useMemo(() => {
    const snapshotForActiveBrand = sidebarSnapshotBrandId === myBrand.id ? sidebarSnapshot : undefined;
    const base = resolveCompetitorViewFromSidebar(
      canonicalHost,
      {
        brandParam,
        idsParam,
        channelsParam: channelsQuery,
        confirmedParam,
      },
      snapshotForActiveBrand === undefined ? [] : snapshotForActiveBrand
    );

    const canonicalSlug = normalizeCompetitorSlug(canonicalHost);
    const own =
      (Boolean(myBrand.domain?.trim()) &&
        canonicalSlug === normalizeCompetitorSlug(myBrand.domain ?? "")) ||
      canonicalSlug === WORKSPACE_BRAND_PLACEHOLDER_SLUG;

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
    const wsDomain = myBrand.domain?.trim() || "";
    const normDomain = normalizeCompetitorSlug(wsDomain || WORKSPACE_BRAND_PLACEHOLDER_SLUG);

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
    if (adsSetup?.channels?.length) {
      const fromSetup = adsSetup.channels.join(",");
      if (!channelsFromResolver.trim()) {
        channelsFromResolver = fromSetup;
      } else {
        const merged = new Set(
          [...channelsFromResolver.split(","), ...adsSetup.channels]
            .map((c) => c.trim())
            .filter(Boolean),
        );
        channelsFromResolver = [...merged].join(",");
      }
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
    sidebarSnapshotBrandId,
    myBrand.id,
    myBrand.domain,
    myBrand.name,
    myBrand.logoUrl,
    myBrand.color,
    myBrand.adsSetup,
  ]);

  const showBrandDebugTabs =
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true";

  const ownBrandSavedAdsEnabled = !isOwnWorkspace || showBrandDebugTabs;

  const pageTabs = useMemo(
    () => competitorPageTabsForView({ isOwnWorkspace, showDebugTabs: showBrandDebugTabs }),
    [isOwnWorkspace, showBrandDebugTabs]
  );

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
      params.set(
        "sub",
        isOwnWorkspace
          ? ownBrandInsightsDefaultSubTab(showBrandDebugTabs)
          : "activity-feed",
      );
      params.delete("view");
      fix = true;
    } else if (lower === "strategy overview") {
      params.set("tab", "insights");
      params.set(
        "sub",
        isOwnWorkspace && !showBrandDebugTabs
          ? "benchmark"
          : "strategy-map",
      );
      params.delete("view");
      fix = true;
    } else if (lower === "workspace ads" || lower === "workspace-ads") {
      params.set("tab", "ads library");
      params.set("sub", "paid-media-settings");
      fix = true;
    } else if (lower === "marketing improvements" || lower === "workspace-marketing-improvements") {
      params.set("tab", "insights");
      if (process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true") {
        params.set("sub", "improve-marketing");
      } else {
        params.set(
          "sub",
          isOwnWorkspace ? "benchmark" : "strategy-map",
        );
      }
      fix = true;
    } else if (lower === "benchmark" || raw === "benchmark") {
      params.set("tab", "insights");
      params.set("sub", "benchmark");
      fix = true;
    } else if (lower === "tests" || lower === "audience-copy") {
      params.set("tab", "ads library");
      fix = true;
    }
    if (fix) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router, isOwnWorkspace, showBrandDebugTabs]);

  useEffect(() => {
    const sub = (searchParams.get("sub") ?? "").trim();
    if (sub !== "strategy-insight" && sub !== "moves") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(
      "sub",
      isOwnWorkspace
        ? ownBrandInsightsDefaultSubTab(showBrandDebugTabs)
        : "activity-feed",
    );
    params.delete("view");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, isOwnWorkspace, showBrandDebugTabs]);

  const deriveTabFromParams = useCallback(
    (params: URLSearchParams) => {
      const tabParamRaw = (params.get("tab") ?? "").trim();
      const legacyPaidMediaTabs: Record<string, string> = {
        tests: "ads library",
        "audience-copy": "ads library",
      };
      const tabId = legacyPaidMediaTabs[tabParamRaw] ?? tabParamRaw;
      return pageTabs.some((t) => t.id === tabId) ? tabId : "ads library";
    },
    [pageTabs],
  );

  const deriveSubFromParams = useCallback(
    (params: URLSearchParams, tab: string) =>
      resolveSubTabFromParams(params, tab, {
        isOwnWorkspace,
        showDebugTabs: showBrandDebugTabs,
      }),
    [isOwnWorkspace, showBrandDebugTabs],
  );

  const [navTab, setNavTab] = useState(() => deriveTabFromParams(searchParams));
  const [navSub, setNavSub] = useState(() =>
    deriveSubFromParams(searchParams, deriveTabFromParams(searchParams)),
  );

  /** While the user picks a tab, ignore stale `tab`/`sub` in the URL until the router catches up. */
  const userNavIntentRef = useRef<{ tab: string; sub: string | null } | null>(null);
  const urlTabParam = (searchParams.get("tab") ?? "").trim();
  const urlSubParam = (searchParams.get("sub") ?? "").trim();

  useEffect(() => {
    const tab = deriveTabFromParams(searchParams);
    const sub = deriveSubFromParams(searchParams, tab);
    const intent = userNavIntentRef.current;
    if (intent) {
      if (tab === intent.tab && sub === intent.sub) {
        userNavIntentRef.current = null;
      } else {
        return;
      }
    }
    setNavTab((prev) => (prev === tab ? prev : tab));
    setNavSub((prev) => (prev === sub ? prev : sub));
  }, [urlTabParam, urlSubParam, deriveTabFromParams, deriveSubFromParams, searchParams]);

  const syncNavToUrl = useCallback(
    (tab: string, sub: string | null, opts?: { deleteView?: boolean }) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        if (sub) {
          params.set("sub", sub);
        } else {
          params.delete("sub");
        }
        if (opts?.deleteView) {
          params.delete("view");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handlePaidMediaSettingsSaved = useCallback(
    ({ ids, channels }: { ids: Record<string, string>; channels: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("channels", channels.join(","));
      params.set("ids", JSON.stringify(ids));
      params.set("confirmed", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const navigateFromBenchmark = useCallback(
    (tab: string, sub?: string | null) => {
      const subId = (sub ?? null) as CompetitorSubTabId | null;
      userNavIntentRef.current = { tab, sub: subId };
      setNavTab(tab);
      setNavSub(subId);
      syncNavToUrl(tab, subId);
    },
    [syncNavToUrl],
  );

  useEffect(() => {
    if (navTab !== "ads library") return;
    const legacySub = navSub as string | null;
    if (legacySub !== "hooks" && legacySub !== "briefs") return;
    setNavSub("audience");
    syncNavToUrl(navTab, "audience");
  }, [navTab, navSub, syncNavToUrl]);

  useEffect(() => {
    const def = findCompetitorTab(navTab);
    if (!def) return;
    const subs = competitorSubTabsForView({
      parentTab: def,
      isOwnWorkspace,
      showDebugTabs: showBrandDebugTabs,
    });
    if (subs.length === 0) return;
    const fallback =
      navTab === "insights" && isOwnWorkspace
        ? ownBrandInsightsDefaultSubTab(showBrandDebugTabs)
        : (def.defaultSubTab ?? subs[0]?.id ?? null);
    if (!fallback) return;
    if (navSub && subs.some((s) => s.id === navSub)) return;
    setNavSub(fallback);
  }, [navTab, navSub, isOwnWorkspace, showBrandDebugTabs]);

  useEffect(() => {
    if (!isOwnWorkspace || (navTab !== "comparison" && navTab !== "alerts")) return;
    const sub = deriveSubFromParams(searchParams, "ads library");
    setNavTab("ads library");
    setNavSub(sub);
    syncNavToUrl("ads library", sub);
  }, [isOwnWorkspace, navTab, searchParams, deriveSubFromParams, syncNavToUrl]);

  useEffect(() => {
    if (!isOwnWorkspace || showBrandDebugTabs) return;
    if (navTab !== "ads library" || !navSub) return;
    if (!isOwnBrandDebugOnlySubTab(navTab, navSub)) return;
    setNavSub("all");
    syncNavToUrl(navTab, "all");
  }, [isOwnWorkspace, showBrandDebugTabs, navTab, navSub, syncNavToUrl]);

  useEffect(() => {
    if (!isOwnWorkspace) {
      if (isLegacyOwnBrandTabId(navTab)) {
        const sub = deriveSubFromParams(searchParams, "ads library");
        setNavTab("ads library");
        setNavSub(sub);
        syncNavToUrl("ads library", sub);
      }
      return;
    }
    if (navTab === "workspace-ads") {
      setNavTab("ads library");
      setNavSub("paid-media-settings");
      syncNavToUrl("ads library", "paid-media-settings");
    } else if (navTab === "benchmark") {
      setNavTab("insights");
      setNavSub("benchmark");
      syncNavToUrl("insights", "benchmark");
    } else if (navTab === "workspace-marketing-improvements") {
      setNavTab("insights");
      if (showBrandDebugTabs) {
        setNavSub("improve-marketing");
        syncNavToUrl("insights", "improve-marketing");
      } else {
        const sub = ownBrandInsightsDefaultSubTab(showBrandDebugTabs);
        setNavSub(sub);
        syncNavToUrl("insights", sub);
      }
    } else if (navTab === "insights" && navSub === "activity-feed") {
      const sub = ownBrandInsightsDefaultSubTab(showBrandDebugTabs);
      setNavSub(sub);
      syncNavToUrl("insights", sub);
    } else if (navTab === "insights" && navSub === "improve-marketing" && !showBrandDebugTabs) {
      setNavSub("benchmark");
      syncNavToUrl("insights", "benchmark");
    } else if (navTab === "insights" && navSub === "strategy-map" && !showBrandDebugTabs) {
      setNavSub("benchmark");
      syncNavToUrl("insights", "benchmark");
    }
  }, [isOwnWorkspace, navTab, navSub, showBrandDebugTabs, searchParams, deriveSubFromParams, syncNavToUrl]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      scrollDashboardMainToTop();
      const tab = findCompetitorTab(tabId);
      const sub =
        tabId === "insights" && isOwnWorkspace
          ? ownBrandInsightsDefaultSubTab(showBrandDebugTabs)
          : (tab?.defaultSubTab ?? null);
      userNavIntentRef.current = { tab: tabId, sub };
      setNavTab(tabId);
      setNavSub(sub);
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tabId);
        if (sub) {
          params.set("sub", sub);
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
      });
    },
    [pathname, router, searchParams, isOwnWorkspace, showBrandDebugTabs],
  );

  const handleSubTabChange = useCallback(
    (subTabId: string) => {
      scrollDashboardMainToTop();
      const subId = subTabId as CompetitorSubTabId;
      userNavIntentRef.current = { tab: navTab, sub: subId };
      setNavSub(subId);
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", navTab);
        params.set("sub", subTabId);
        if (navTab === "insights") {
          params.delete("view");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [navTab, pathname, router, searchParams],
  );

  const navigateToLandingPagesExplorer = useCallback(() => {
    scrollDashboardMainToTop();
    userNavIntentRef.current = { tab: "website", sub: "from-ads" };
    setNavTab("website");
    setNavSub("from-ads");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "website");
      params.set("sub", "from-ads");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
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
  const effectiveScrapeFields = useMemo(() => {
    const base = isOwnWorkspace
      ? mergeScrapeFieldsWithWorkspaceMarkets(scrapeFields, myBrand.adsSetup?.adMarketCountryCodes)
      : scrapeFields;
    if (!isOwnWorkspace) return base;
    const prefs = readAdLibraryRegionPrefsFromSession();
    return {
      ...base,
      metaCountry: prefs.metaCountry,
      linkedinCountryCode: prefs.linkedinCountryCode,
      snapchatCountry: prefs.snapchatCountry,
    };
  }, [isOwnWorkspace, scrapeFields, myBrand.adsSetup?.adMarketCountryCodes]);

  const workspaceScrapeFields = useMemo(
    () => mergeScrapeFieldsWithWorkspaceMarkets(scrapeFields, myBrand.adsSetup?.adMarketCountryCodes),
    [scrapeFields, myBrand.adsSetup?.adMarketCountryCodes]
  );
  const [tiktokRegion, setTiktokRegion] = useState(readStoredTiktokRegion);
  const [pinterestCountry, setPinterestCountry] = useState(readStoredPinterestCountry);
  const [googleRegion, setGoogleRegion] = useState(readStoredGoogleRegion);
  const [accountLastScrapedAt, setAccountLastScrapedAt] = useState<string | null>(null);
  const [workspaceBrandCompetitorId, setWorkspaceBrandCompetitorId] = useState("");
  type WorkspaceLibraryLinkState = "idle" | "linking" | "persisting" | "ready" | "error";
  const [workspaceLibraryLinkState, setWorkspaceLibraryLinkState] =
    useState<WorkspaceLibraryLinkState>("idle");
  const [workspaceLibraryLinkError, setWorkspaceLibraryLinkError] = useState<string | null>(null);
  const [workspaceLibraryContext, setWorkspaceLibraryContext] = useState<{
    channels?: string[];
    ids?: Record<string, string>;
  } | null>(null);
  /** Bumps every minute so `getTimeAgo` in the header stays fresh while the page is open. */
  const [lastScrapeRelativeTick, setLastScrapeRelativeTick] = useState(0);

  /** Workspace brand: load server cache when scrape exists in Supabase (matches competitor sidebar `lastScrapedAt`). */
  const adLibraryConfirmed = useMemo(() => {
    if (!isOwnWorkspace) return isConfirmed;
    if (isConfirmed) return true;
    if (myBrand.adsSetup?.channels?.length) return true;
    if (accountLastScrapedAt?.trim()) return true;
    if (workspaceBrandCompetitorId.trim()) return true;
    return false;
  }, [
    isOwnWorkspace,
    isConfirmed,
    myBrand.adsSetup?.channels,
    accountLastScrapedAt,
    workspaceBrandCompetitorId,
  ]);

  const effectiveChannelsFromResolver = useMemo(() => {
    if (channelsFromResolver.trim()) return channelsFromResolver;
    if (isOwnWorkspace && workspaceLibraryContext?.channels?.length) {
      return workspaceLibraryContext.channels.join(",");
    }
    return channelsFromResolver;
  }, [channelsFromResolver, isOwnWorkspace, workspaceLibraryContext]);

  const effectivePlatformIds = useMemo(() => {
    if (platformIds && Object.keys(platformIds).length > 0) return platformIds;
    if (
      isOwnWorkspace &&
      workspaceLibraryContext?.ids &&
      Object.keys(workspaceLibraryContext.ids).length > 0
    ) {
      return workspaceLibraryContext.ids;
    }
    return platformIds;
  }, [platformIds, isOwnWorkspace, workspaceLibraryContext]);

  const paidMediaSettingsFallbackChannels = useMemo(
    () => effectiveChannelsFromResolver.split(",").filter(Boolean),
    [effectiveChannelsFromResolver],
  );

  useEffect(() => {
    evictBulkyLocalStorageCaches();
    return setupGlobalCacheInvalidator();
  }, []);

  const workspaceAdsSetupPlatformIds = useMemo(() => {
    if (!isOwnWorkspace || !myBrand.adsSetup?.channels?.length) return null;
    const ids = scrapeHintsToPlatformIds({
      scrape: myBrand.adsSetup.scrape,
      workspaceDomain: myBrand.domain ?? "",
      channels: myBrand.adsSetup.channels,
    });
    return Object.keys(ids).length > 0 ? ids : null;
  }, [isOwnWorkspace, myBrand.adsSetup, myBrand.domain]);

  /** Platforms to hydrate from `ads_cache` — union saved channels, onboarding setup, and identifiers. */
  const adsPlatforms: AdsLibraryPlatform[] = useMemo(() => {
    if (!isOwnWorkspace) {
      return resolveCompetitorTrackedAdsPlatforms(
        effectiveChannelsFromResolver,
        effectivePlatformIds,
      );
    }
    const sources: { channelsCsv?: string; ids?: Record<string, string> | null }[] = [
      { channelsCsv: effectiveChannelsFromResolver, ids: effectivePlatformIds },
    ];
    if (myBrand.adsSetup?.channels?.length) {
      sources.push({
        channelsCsv: myBrand.adsSetup.channels.join(","),
        ids: workspaceAdsSetupPlatformIds,
      });
    }
    return unionAdsPlatformsFromSources(...sources);
  }, [
    effectiveChannelsFromResolver,
    effectivePlatformIds,
    isOwnWorkspace,
    myBrand.adsSetup?.channels,
    workspaceAdsSetupPlatformIds,
  ]);

  /** Never pass an empty platform list after a scrape — cache reads would no-op. */
  const adLibraryPlatforms: AdsLibraryPlatform[] = useMemo(() => {
    if (adsPlatforms.length > 0) return adsPlatforms;
    if (isOwnWorkspace && workspaceLibraryContext?.channels?.length) {
      return channelsQueryToAdsPlatforms(workspaceLibraryContext.channels);
    }
    if (isOwnWorkspace && accountLastScrapedAt?.trim()) {
      return ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"];
    }
    return adsPlatforms;
  }, [adsPlatforms, isOwnWorkspace, workspaceLibraryContext?.channels, accountLastScrapedAt]);

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
  const [pendingOpenSeed, setPendingOpenSeed] = useState<AdDetailOpenSeed | null>(null);
  const adLibraryOpenGenRef = useRef(0);

  const closeAdDetail = useCallback(() => {
    adLibraryOpenGenRef.current += 1;
    setPendingOpenSeed(null);
    closeAd();
  }, [closeAd]);

  useEffect(() => {
    if (activeAdId) setPendingOpenSeed(null);
  }, [activeAdId]);

  const [manualRefreshBusyPlatform, setManualRefreshBusyPlatform] =
    useState<AdsLibraryPlatform | null>(null);
  const [billingAllowManualRefresh, setBillingAllowManualRefresh] = useState(false);
  const [billingIsUnlimited, setBillingIsUnlimited] = useState(false);
  const [billingAllowAlertRules, setBillingAllowAlertRules] = useState(false);
  const [billingAllowAlertEmail, setBillingAllowAlertEmail] = useState(false);
  const [billingPlanTier, setBillingPlanTier] = useState<
    "free_trial" | "starter" | "pro" | "agency" | "admin"
  >("free_trial");
  const [billingStatus, setBillingStatus] = useState("none");
  const [alertsUnreadCount, setAlertsUnreadCount] = useState(0);
  const [manualRefreshStatus, setManualRefreshStatus] = useState<ManualRefreshStatus | null>(null);

  const canManualRefresh = billingAllowManualRefresh || billingIsUnlimited;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/usage", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j: {
        billing?: {
          limits?: { allowManualRefresh?: boolean; allowAlertRules?: boolean; allowAlertEmail?: boolean };
          isUnlimited?: boolean;
          planTier?: "free_trial" | "starter" | "pro" | "agency" | "admin";
          status?: string;
        };
      }) => {
        if (cancelled) return;
        setBillingAllowManualRefresh(j.billing?.limits?.allowManualRefresh === true);
        setBillingIsUnlimited(j.billing?.isUnlimited === true);
        setBillingAllowAlertRules(j.billing?.limits?.allowAlertRules === true);
        setBillingAllowAlertEmail(j.billing?.limits?.allowAlertEmail === true);
        setBillingPlanTier(j.billing?.planTier ?? "free_trial");
        setBillingStatus(j.billing?.status ?? "none");
      })
      .catch(() => {
        if (!cancelled) {
          setBillingAllowManualRefresh(false);
          setBillingIsUnlimited(false);
          setBillingAllowAlertRules(false);
          setBillingAllowAlertEmail(false);
          setBillingPlanTier("free_trial");
          setBillingStatus("none");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAlertsUnreadCount = useCallback(() => {
    void fetch("/api/alerts/unread-count", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; count?: number }) => {
        if (j.ok) setAlertsUnreadCount(j.count ?? 0);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshAlertsUnreadCount();
    const onFocus = () => refreshAlertsUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshAlertsUnreadCount]);

  const getTimeAgo = formatTimeAgo;

  /** Stable id map — avoids effect loops when resolver returns a fresh object after each sidebar bump. */
  const platformIdsFingerprint = useMemo(() => {
    if (!platformIds || Object.keys(platformIds).length === 0) return "";
    const entries = Object.entries(platformIds)
      .filter(([, v]) => typeof v === "string" && v.trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  }, [platformIds]);

  useEffect(() => {
    // Before hydration, `sidebarSnapshot` is undefined and we intentionally pass `[]` into the resolver
    // so SSR matches the first client paint. Running `upsertSidebarCompetitor` in that state would merge
    // `confirmed: false` (and drop ids) into the real localStorage row — permanently disabling Ad Library.
    if (sidebarSnapshot === undefined) return;
    if (isOwnWorkspace) return;
    if (!competitorSidebarMatch) return;

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
  }, [
    sidebarSnapshot,
    competitorSidebarMatch,
    brand.domain,
    brand.logoUrl,
    brand.name,
    channelsFromResolver,
    isConfirmed,
    platformIdsFingerprint,
    isOwnWorkspace,
  ]);

  const mergedPlatformIdsForAdLibrary = useMemo(() => {
    const merged = { ...(effectivePlatformIds ?? {}), ...(workspaceAdsSetupPlatformIds ?? {}) };
    return Object.keys(merged).length > 0 ? merged : effectivePlatformIds;
  }, [effectivePlatformIds, workspaceAdsSetupPlatformIds]);

  const adLibraryDataEnabled =
    adLibraryConfirmed && navTab === "ads library" && adLibraryPlatforms.length > 0;

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
    manualRefreshPlatform,
  } = useAdLibrary(
    {
      name: isOwnWorkspace ? competitorDisplayLabel : brand.name,
      domain: brand.domain,
      logoUrl: brand.logoUrl,
    },
    mergedPlatformIdsForAdLibrary,
    adLibraryPlatforms,
    adLibraryDataEnabled,
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

  const [workspaceSetupFlags, setWorkspaceSetupFlags] = useState({
    organic: false,
    website: false,
    email: false,
  });

  useEffect(() => {
    if (!isOwnWorkspace) return;
    const cid = workspaceBrandCompetitorId.trim();
    if (!cid) return;

    let cancelled = false;
    void (async () => {
      try {
        const [socialsRes, pagesRes, emailRes] = await Promise.all([
          fetch(`/api/competitor/${cid}/organic/socials`),
          fetch(`/api/competitor/${cid}/landing-pages`),
          fetch(`/api/email-trackers/${cid}`),
        ]);
        if (cancelled) return;

        let organic = false;
        if (socialsRes.ok) {
          const data = (await socialsRes.json()) as { socials?: Record<string, string> };
          organic = Object.values(data.socials ?? {}).some((v) => typeof v === "string" && v.trim());
        }

        let website = false;
        if (pagesRes.ok) {
          const data = (await pagesRes.json()) as { pages?: unknown[] };
          website = (data.pages?.length ?? 0) > 0;
        }

        let email = false;
        if (emailRes.ok) {
          const data = (await emailRes.json()) as { tracker?: { tracking_address?: string } | null };
          email = Boolean(data.tracker?.tracking_address?.trim());
        }

        setWorkspaceSetupFlags({ organic, website, email });
      } catch {
        /* optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwnWorkspace, workspaceBrandCompetitorId]);

  useEffect(() => {
    if (navTab !== "insights" || navSub !== "improve-marketing") return;
    if (!isOwnWorkspace || !showBrandDebugTabs) return;

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
    navTab,
    navSub,
    isOwnWorkspace,
    showBrandDebugTabs,
    myBrand.name,
    myBrand.domain,
    myBrand.brandContext,
    marketingCoachRefresh,
  ]);

  const readAccountLastScrapedInFlightRef = useRef<Promise<string | null> | null>(null);

  const readAccountLastScraped = useCallback(async (): Promise<string | null> => {
    if (readAccountLastScrapedInFlightRef.current) {
      return readAccountLastScrapedInFlightRef.current;
    }

    const run = async (): Promise<string | null> => {
    if (isOwnWorkspace) {
      try {
        const params = new URLSearchParams();
        const brandId = myBrand.id?.trim();
        if (brandId && brandId !== "default" && brandId !== "_workspace") {
          params.set("brandId", brandId);
        }
        const pageDomain = brand.domain.trim();
        if (pageDomain) {
          params.set("domain", pageDomain);
        }
        const qs = params.toString();
        const res = await fetch(`/api/account/workspace-last-scrape${qs ? `?${qs}` : ""}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          lastScrapedAt?: string | null;
          competitorId?: string | null;
          libraryContext?: { channels?: string[]; ids?: Record<string, string> } | null;
          error?: string;
          hint?: string;
        };
        if (!res.ok) {
          setWorkspaceLibraryLinkError(
            friendlySavedCompetitorsSchemaError(json.hint ?? json.error),
          );
          return null;
        }
        setAccountLastScrapedAt(json.lastScrapedAt ?? null);
        const cid = json.competitorId?.trim() ?? "";
        setWorkspaceBrandCompetitorId(cid);
        setWorkspaceLibraryContext(json.libraryContext ?? null);
        if (cid) {
          setWorkspaceLibraryLinkError(null);
        } else {
          setWorkspaceLibraryLinkError(
            friendlySavedCompetitorsSchemaError(
              json.hint ??
                (json.error === "no_brand_domain"
                  ? "Set your brand domain in Settings or complete onboarding to enable analytics and ad detail."
                  : "Could not register your brand for analytics and ad detail. Save your ad connections on the Workspace tab, then retry."),
            ),
          );
        }
        return cid || null;
      } catch {
        setWorkspaceLibraryLinkError("Network error while setting up analytics and ad detail.");
        return null;
      }
    }
    const list = loadSidebarCompetitors();
    const bdom = brand.domain.trim().toLowerCase();
    const row = list.find(
      (c) =>
        c.brand?.domain?.trim().toLowerCase() === bdom ||
        (c.brand?.domain != null && slugsLikelySameCompany(c.slug, brand.domain))
    );
    setAccountLastScrapedAt(row?.lastScrapedAt ?? null);
    return row?.savedCompetitorDbId?.trim() || null;
    };

    const promise = run();
    readAccountLastScrapedInFlightRef.current = promise;
    try {
      return await promise;
    } finally {
      if (readAccountLastScrapedInFlightRef.current === promise) {
        readAccountLastScrapedInFlightRef.current = null;
      }
    }
  }, [isOwnWorkspace, brand.domain, brand.name, myBrand.id]);

  const workspaceLibraryLinkStateRef = useRef(workspaceLibraryLinkState);
  workspaceLibraryLinkStateRef.current = workspaceLibraryLinkState;
  const workspaceLinkInFlightRef = useRef(false);

  const ensureWorkspaceLibraryLinked = useCallback(async (): Promise<string | null> => {
    if (!isOwnWorkspace) {
      return workspaceBrandCompetitorId.trim() || competitorSidebarMatch?.savedCompetitorDbId?.trim() || null;
    }

    const existingId = workspaceBrandCompetitorId.trim();
    if (workspaceLibraryLinkStateRef.current === "ready" && existingId) {
      return existingId;
    }

    if (workspaceLinkInFlightRef.current) {
      return existingId || null;
    }

    workspaceLinkInFlightRef.current = true;
    setWorkspaceLibraryLinkError(null);
    setWorkspaceLibraryLinkState("linking");

    try {
      const cid = (await readAccountLastScraped())?.trim() ?? "";
      if (!cid) {
        setWorkspaceLibraryLinkState("error");
        setWorkspaceLibraryLinkError(
          (prev) =>
            prev ??
            "Could not register your brand for analytics and ad detail. Set your brand domain in Settings or save ad connections on the Workspace tab, then retry.",
        );
        return null;
      }

      setWorkspaceLibraryLinkState("ready");
      setWorkspaceLibraryLinkError(null);
      return cid;
    } catch {
      setWorkspaceLibraryLinkState("error");
      setWorkspaceLibraryLinkError("Network error while syncing ads");
      return workspaceBrandCompetitorId.trim() || null;
    } finally {
      workspaceLinkInFlightRef.current = false;
    }
  }, [
    brand.domain,
    competitorSidebarMatch?.savedCompetitorDbId,
    isOwnWorkspace,
    readAccountLastScraped,
    workspaceBrandCompetitorId,
  ]);

  const workspaceLinkResetKey = useMemo(
    () => `${normalizeCompetitorSlug(brand.domain)}:${isOwnWorkspace}:${myBrand.id ?? ""}`,
    [brand.domain, isOwnWorkspace, myBrand.id],
  );

  const workspaceLinkBootstrappedRef = useRef(false);
  useEffect(() => {
    workspaceLinkBootstrappedRef.current = false;
    setWorkspaceLibraryLinkState("idle");
    setWorkspaceLibraryLinkError(null);
  }, [workspaceLinkResetKey]);

  useEffect(() => {
    if (!isOwnWorkspace || !adLibraryConfirmed || workspaceLinkBootstrappedRef.current) return;
    workspaceLinkBootstrappedRef.current = true;
    void ensureWorkspaceLibraryLinked();
  }, [adLibraryConfirmed, ensureWorkspaceLibraryLinked, isOwnWorkspace]);

  useEffect(() => {
    void readAccountLastScraped();
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
    return () => window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, readAccountLastScraped);
  }, [readAccountLastScraped]);

  useEffect(() => {
    if (!isOwnWorkspace || workspaceBrandCompetitorId.trim()) return;
    if (!adLibraryConfirmed) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled || attempts >= 2) return;
      attempts += 1;
      void readAccountLastScraped().then((cid) => {
        if (cancelled || cid) return;
        window.setTimeout(tick, 1500);
      });
    };
    const id = window.setTimeout(tick, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [
    adLibraryConfirmed,
    isOwnWorkspace,
    readAccountLastScraped,
    workspaceBrandCompetitorId,
  ]);

  useEffect(() => {
    if (!accountLastScrapedAt) return;
    const id = window.setInterval(() => setLastScrapeRelativeTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [accountLastScrapedAt]);

  const syncSavedCompetitorsFromAccount = useCallback(async () => {
    localStorage.setItem("rival_active_brand", myBrand.id);
    const localPrev = loadSidebarCompetitors();
    const list = await fetchSavedCompetitorsFromAccount(myBrand.id);
    if (list.length > 0) {
      const visible = sidebarCompetitorsWithoutWorkspaceRow(
        list as SidebarCompetitor[],
        myBrand.domain?.trim() || null,
      );
      saveSidebarCompetitors(mergeAccountSidebarRowsWithLocalLibraryContext(visible, localPrev));
      return;
    }
    saveSidebarCompetitors([]);
  }, [myBrand.domain, myBrand.id]);

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
    if (!adLibraryConfirmed || !fetchGoogle) return;
    const prev = prevGoogleRegionRef.current;
    prevGoogleRegionRef.current = googleRegion;
    if (prev === null) return;
    if (prev === googleRegion) return;
    void refreshGoogleAdsRef.current();
  }, [googleRegion, adLibraryConfirmed, fetchGoogle]);

  const refreshTikTokAdsRef = useRef(refreshTikTokAds);
  refreshTikTokAdsRef.current = refreshTikTokAds;
  const prevTiktokRegionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!adLibraryConfirmed || !fetchTikTok) return;
    const prev = prevTiktokRegionRef.current;
    prevTiktokRegionRef.current = tiktokRegion;
    if (prev === null) return;
    if (prev === tiktokRegion) return;
    void refreshTikTokAdsRef.current();
  }, [tiktokRegion, adLibraryConfirmed, fetchTikTok]);

  const refreshPinterestAdsRef = useRef(refreshPinterestAds);
  refreshPinterestAdsRef.current = refreshPinterestAds;
  const prevPinterestCountryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!adLibraryConfirmed || !fetchPinterest) return;
    const prev = prevPinterestCountryRef.current;
    prevPinterestCountryRef.current = pinterestCountry;
    if (prev === null) return;
    if (prev === pinterestCountry) return;
    void refreshPinterestAdsRef.current();
  }, [pinterestCountry, adLibraryConfirmed, fetchPinterest]);

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

  const competitorDbIdForSaved = useMemo(() => {
    if (isOwnWorkspace) {
      return workspaceBrandCompetitorId.trim() || competitorSidebarMatch?.savedCompetitorDbId?.trim() || "";
    }
    return competitorSidebarMatch?.savedCompetitorDbId?.trim() ?? "";
  }, [competitorSidebarMatch?.savedCompetitorDbId, isOwnWorkspace, workspaceBrandCompetitorId]);

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
    if (navTab !== "ads library") return;
    void loadManualRefreshStatus();
  }, [loadManualRefreshStatus, navTab]);

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

  const showPlatformClassificationDebug = showBrandDebugTabs;

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
    if (navTab !== "ads library") return;
    void loadPlatformTracking();
  }, [loadPlatformTracking, navTab]);

  const lastScrapedAtForPlatform = useCallback(
    (platform: AdsLibraryPlatform): string | null =>
      platformTrackingByPlatform[platform]?.lastScrapeAt ?? accountLastScrapedAt ?? null,
    [platformTrackingByPlatform, accountLastScrapedAt],
  );

  const metaScrapeAtMs = useMemo(() => {
    const iso = lastScrapedAtForPlatform("meta");
    if (!iso) return Date.now();
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : Date.now();
  }, [lastScrapedAtForPlatform]);

  const displayMetaAds = useMemo(
    () =>
      sortMetaAdsActiveFirst(
        filteredMetaAds.map((ad) => hydrateMetaAdCardForLibrary(ad, metaScrapeAtMs)),
        metaScrapeAtMs
      ),
    [filteredMetaAds, metaScrapeAtMs]
  );

  const adsLibraryShowsCreativesOnScreen = useMemo(
    () =>
      !adLibFetchError &&
      filteredMetaAds.length +
        filteredGoogleRows.length +
        filteredLinkedInAds.length +
        filteredTikTokAds.length +
        filteredPinterestAds.length +
        filteredSnapchatAds.length >
        0,
    [
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
    isOwnWorkspace
      ? adLibraryConfirmed &&
        adsLibraryShowsCreativesOnScreen &&
        workspaceLibraryLinkState !== "ready" &&
        workspaceLibraryLinkState !== "idle"
      : !competitorDbIdForSaved && isConfirmed && sidebarSnapshot !== undefined;

  const workspaceLibraryInteractive =
    !isOwnWorkspace || workspaceLibraryLinkState === "ready";

  const showAdLibraryAnalyticsPanel =
    workspaceLibraryInteractive &&
    (Boolean(competitorDbIdForSaved.trim()) || adsLibraryShowsCreativesOnScreen);

  const comparisonPayloadScrapeStamp = accountLastScrapedAt ?? "none";
  const comparisonPayloadCacheKey = `${myBrand.id}:${
    cacheDomainNorm
  }:comparison-payload:v2:${comparisonPayloadScrapeStamp}`;

  const comparisonPayloadFetchEnabled =
    Boolean(cacheDomainNorm.trim()) && navTab === "comparison";

  const landingPagesFetchEnabled =
    Boolean(competitorDbIdForSaved && cacheDomainNorm.trim()) && workspaceLibraryInteractive;

  const [recomputePollState, setRecomputePollState] = useState<RecomputePollState>({
    recomputeRunning: false,
    recomputeStatus: "unknown",
    recomputeError: null,
  });

  const {
    data: comparisonPayloadData,
    loading: comparisonPayloadLoading,
    error: comparisonPayloadCacheError,
    refetch: refetchComparisonPayload,
    refetchIfStale: refetchComparisonPayloadIfStale,
  } = useScrapeKeyedCache<ComparisonPayloadJson>({
    cacheKey: comparisonPayloadCacheKey,
    enabled: comparisonPayloadFetchEnabled,
    persistAcrossTabs: true,
    validateCached: (c) =>
      c.ok === true &&
      Boolean(c.competitor?.payload?.map) &&
      typeof c.competitor?.derivedStats?.avgAdAgeDays === "number",
    fetcher: async () => {
      const params = new URLSearchParams({ competitorDomain: brand.domain });
      if (myBrand.id && myBrand.id !== "_workspace") params.set("brandId", myBrand.id);
      const res = await fetch(
        `/api/comparison/payload?${params.toString()}`,
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

  const competitorStrategyPayload = comparisonPayload?.competitor?.payload ?? null;
  const [aiAnalysisNoticeDismissed, setAiAnalysisNoticeDismissed] = useState(false);
  const [aiAnalysisCompleteNoticeVisible, setAiAnalysisCompleteNoticeVisible] = useState(false);
  const aiAnalysisWasActiveRef = useRef(false);
  const aiAnalysisNoticeActive = useMemo(() => {
    if (!isConfirmed) return false;
    if (recomputePollState.recomputeRunning) return true;
    if (comparisonPayload?.competitor?.recomputing === true) return true;
    if (!competitorStrategyPayload) return false;
    if (competitorStrategyPayload.derivedFastPath === true) return true;
    if (competitorStrategyPayload.lowEnrichmentConfidence === true) return true;
    if (competitorStrategyPayload.insufficientEnrichedAds === true) return true;
    const rate = competitorStrategyPayload.enrichmentRate;
    const total = competitorStrategyPayload.totalAdCount ?? 0;
    return typeof rate === "number" && total > 0 && rate < 0.7;
  }, [
    comparisonPayload?.competitor?.recomputing,
    competitorStrategyPayload,
    isConfirmed,
    recomputePollState.recomputeRunning,
  ]);

  useEffect(() => {
    if (aiAnalysisNoticeActive) {
      aiAnalysisWasActiveRef.current = true;
      setAiAnalysisNoticeDismissed(false);
      setAiAnalysisCompleteNoticeVisible(false);
      return;
    }

    if (!aiAnalysisWasActiveRef.current) return;
    aiAnalysisWasActiveRef.current = false;
    setAiAnalysisNoticeDismissed(false);
    setAiAnalysisCompleteNoticeVisible(true);
    const id = window.setTimeout(() => {
      setAiAnalysisCompleteNoticeVisible(false);
    }, 8000);
    return () => window.clearTimeout(id);
  }, [aiAnalysisNoticeActive]);

  const renderAiAnalysisNotice = () =>
    !aiAnalysisNoticeDismissed && aiAnalysisNoticeActive ? (
      <AiAdAnalysisNotice
        running={recomputePollState.recomputeRunning || comparisonPayload?.competitor?.recomputing === true}
        enrichmentRate={competitorStrategyPayload?.enrichmentRate ?? null}
        enrichedCount={competitorStrategyPayload?.enrichedAdCount ?? null}
        totalCount={competitorStrategyPayload?.totalAdCount ?? null}
        onDismiss={() => setAiAnalysisNoticeDismissed(true)}
      />
    ) : aiAnalysisCompleteNoticeVisible ? (
      <AiAdAnalysisNotice
        running={false}
        complete
        enrichmentRate={competitorStrategyPayload?.enrichmentRate ?? null}
        enrichedCount={competitorStrategyPayload?.enrichedAdCount ?? null}
        totalCount={competitorStrategyPayload?.totalAdCount ?? null}
        onDismiss={() => setAiAnalysisCompleteNoticeVisible(false)}
      />
    ) : null;
  const shouldRenderAiAnalysisNotice =
    (!aiAnalysisNoticeDismissed && aiAnalysisNoticeActive) || aiAnalysisCompleteNoticeVisible;

  const comparisonPayloadErrorMessage = comparisonPayloadCacheError?.message ?? null;

  useEffect(() => {
    if (!cacheDomainNorm.trim() || !brand.domain.trim()) return;
    if (
      navTab !== "insights" &&
      navTab !== "comparison" &&
      !(navTab === "ads library" && (navSub === "audience" || navSub === "copy-vault"))
    ) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    const triesRef = { n: 0 };

    const clearPoll = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const poll = async (): Promise<boolean> => {
      triesRef.n += 1;
      try {
        const res = await fetch(
          `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(brand.domain)}`,
          { credentials: "include" }
        );
        const json = (await res.json()) as { ok?: boolean; status?: string; error?: string | null };
        if (cancelled || !json.ok) return false;

        const statusRaw = json.status;
        const status: RecomputePollState["recomputeStatus"] =
          statusRaw === "running"
            ? "running"
            : statusRaw === "failed"
              ? "failed"
              : statusRaw === "idle"
                ? "idle"
                : "unknown";

        setRecomputePollState({
          recomputeRunning: status === "running",
          recomputeStatus: status,
          recomputeError:
            status === "failed" ? json.error?.trim() ?? "Strategy recomputation failed" : null,
        });

        const done = triesRef.n >= 120 || status === "idle" || status === "failed";
        if (done && status === "idle") {
          window.dispatchEvent(
            new CustomEvent<AdsLibraryUpdatedDetail>(ADS_LIBRARY_UPDATED_EVENT, {
              detail: { domain: brand.domain.trim() },
            })
          );
          void refetchComparisonPayload();
        }
        return !done && status === "running";
      } catch {
        return triesRef.n < 120;
      }
    };

    const startLoop = async () => {
      const keepGoing = await poll();
      if (cancelled || !keepGoing) return;
      intervalId = window.setInterval(() => {
        void poll().then((continuePolling) => {
          if (!continuePolling) clearPoll();
        });
      }, 10_000);
    };

    const recomputing = comparisonPayload?.competitor?.recomputing === true;
    if (recomputing) {
      void startLoop();
    } else {
      void poll().then((keep) => {
        if (!cancelled && keep) {
          intervalId = window.setInterval(() => {
            void poll().then((continuePolling) => {
              if (!continuePolling) clearPoll();
            });
          }, 10_000);
        }
      });
    }

    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [
    navTab,
    navSub,
    brand.domain,
    cacheDomainNorm,
    comparisonPayload?.competitor?.recomputing,
    refetchComparisonPayload,
  ]);

  const landingPagesListStamp = accountLastScrapedAt ?? "none";
  const landingPagesListDomainKey = cacheDomainNorm.trim().toLowerCase();
  const landingPagesListCacheKey = `${landingPagesListDomainKey}:landing-pages:${competitorDbIdForSaved}:${landingPagesListStamp}:100`;

  const landingPagesListHook = useScrapeKeyedCache<LandingPagesApiResponse>({
    cacheKey: landingPagesListCacheKey,
    enabled: landingPagesFetchEnabled,
    persistAcrossTabs: true,
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
      if (manualRefreshBusyPlatform) return;
      if (!competitorDbIdForSaved) {
        toast.error("Competitor is still loading — wait a moment and try again.");
        return;
      }
      if (!ensureManualRefreshAllowed()) return;
      setManualRefreshBusyPlatform(platform);
      try {
        const result = await manualRefreshPlatform(platform);
        if (!result?.ok && "aborted" in (result ?? {}) && (result as { aborted?: boolean }).aborted) {
          /** Apify may still finish server-side — poll cache so new ads land in the library. */
          toast.info("Refresh is running in the background — ads will update shortly.");
          const reloadDelaysMs = [8_000, 25_000, 60_000];
          for (const delay of reloadDelaysMs) {
            window.setTimeout(() => {
              void reloadPlatformFromCache(platform);
            }, delay);
          }
          return;
        }
        if (!result?.ok) {
          toast.error(result?.error ?? "Refresh failed");
          return;
        }
        const recordRes = await fetch("/api/competitor/record-manual-refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorId: competitorDbIdForSaved }),
        });
        const recordJson = (await recordRes.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        if (!recordRes.ok || !recordJson?.ok) {
          toast.error(recordJson?.error ?? "Could not record refresh usage");
        }
        await syncSavedCompetitorsFromAccount();
        void loadManualRefreshStatus();
        void loadPlatformTracking();
        void reloadPlatformFromCache(platform);
        toast.success(
          `${platform.charAt(0).toUpperCase()}${platform.slice(1)} refreshed — ads are up to date.`,
        );
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
      manualRefreshPlatform,
      loadPlatformTracking,
      reloadPlatformFromCache,
      syncSavedCompetitorsFromAccount,
    ],
  );

  const manualRefreshDisabled =
    !canManualRefresh || !manualRefreshStatus?.canRefreshNow || manualRefreshBusyPlatform != null;

  const savedAdsLibraryItems = useMemo(() => {
    if (navTab !== "ads library") return [];
    const items: { platform: string; libraryItemId: string }[] = [];
    const seen = new Set<string>();
    const pushItem = (platform: string, libraryItemId: string) => {
      const key = `${platform}:${libraryItemId}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ platform, libraryItemId });
    };
    // Only register the Meta ads that can appear in the inline preview grid
    // (inline-preview candidates plus a small buffer from the top of the sorted
    // list) instead of the whole library — matches the other platforms and keeps
    // the /api/saved-ads/check payload small. Preview URLs for the rest still
    // come back because the endpoint scans all Meta rows once the platform is
    // included, and toggleSave resolves unregistered ads on demand.
    const inlineMetaCandidates = [
      ...displayMetaAds.filter(metaAdHasDashboardInlinePreview).slice(0, META_ADS_INLINE_PREVIEW),
      ...displayMetaAds.slice(0, META_ADS_INLINE_PREVIEW * 4),
    ];
    for (const ad of inlineMetaCandidates) {
      for (const key of metaLibraryItemLookupKeys(ad)) {
        pushItem("meta", key);
      }
    }
    for (const ad of filteredTikTokAds.slice(0, META_ADS_INLINE_PREVIEW)) {
      items.push({ platform: "tiktok", libraryItemId: ad.id });
    }
    for (const ad of filteredLinkedInAds.slice(0, META_ADS_INLINE_PREVIEW)) {
      items.push({ platform: "linkedin", libraryItemId: ad.id });
    }
    for (const ad of filteredPinterestAds.slice(0, META_ADS_INLINE_PREVIEW)) {
      items.push({ platform: "pinterest", libraryItemId: ad.id });
    }
    for (const ad of filteredSnapchatAds.slice(0, META_ADS_INLINE_PREVIEW)) {
      items.push({ platform: "snapchat", libraryItemId: ad.id });
    }
    for (const row of filteredGoogleRows.slice(0, META_ADS_INLINE_PREVIEW)) {
      items.push({
        platform: row.type === "youtube" ? "youtube" : "google",
        libraryItemId: row.id,
      });
    }
    return items;
  }, [
    navTab,
    displayMetaAds,
    filteredTikTokAds,
    filteredLinkedInAds,
    filteredPinterestAds,
    filteredSnapchatAds,
    filteredGoogleRows,
  ]);

  const { savedMap, resolvedToScraped, scrapedIdForCard, libraryRunStatusForCard, isCreativeTestWinnerForCard, toggleSave, refreshLibraryMappings, previewUrlForCard } =
    useSavedAdsStatus(
    competitorDbIdForSaved,
    savedAdsLibraryItems,
    undefined,
    cacheDomainNorm,
  );

  const displayMetaAdsWithPreviews = useMemo(
    () =>
      sortMetaAdsActiveFirst(
        displayMetaAds.map((ad) => {
          const lookupKeys = metaLibraryItemLookupKeys(ad);
          const scrapedPreview = previewUrlForCard("meta", ad.id, lookupKeys)?.trim();
          const withScrapedImg =
            !ad.img?.trim() && scrapedPreview
              ? { ...ad, img: scrapedPreview }
              : ad;
          return hydrateMetaLibraryCardForDisplay(withScrapedImg);
        }),
        metaScrapeAtMs,
      ),
    [displayMetaAds, metaScrapeAtMs, previewUrlForCard],
  );

  const openAdLibraryCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = [], rawAd?: unknown) => {
      void (async () => {
        const openGen = ++adLibraryOpenGenRef.current;

        let cid = competitorDbIdForSaved.trim();
        const pl = platform.trim().toLowerCase();
        const lid = libraryItemId.trim();
        if (!lid) return;

        if (!cid && isOwnWorkspace) {
          cid = (await ensureWorkspaceLibraryLinked())?.trim() ?? "";
        }
        if (openGen !== adLibraryOpenGenRef.current) return;

        if (!cid) {
          toast.error("Still linking your brand library — try again in a moment.");
          return;
        }

        const seedCompetitor = {
          id: cid,
          name: competitorDisplayLabel,
          domain: brand.domain,
          logo_url: brand.logoUrl ?? null,
        };

        const knownScrapedId = scrapedIdForCard(pl, lid, alternateIds);
        if (knownScrapedId) {
          const seed = rawAd
            ? buildLibraryCardDetailSeed(pl, knownScrapedId, rawAd, seedCompetitor)
            : undefined;
          openAd(knownScrapedId, seed);
          return;
        }

        if (rawAd) {
          setPendingOpenSeed(buildLibraryCardDetailSeed(pl, lid, rawAd, seedCompetitor));
        }

        const firstResolve = await resolveLibraryAdAndOpen(cid, pl, lid);
        if (openGen !== adLibraryOpenGenRef.current) {
          setPendingOpenSeed(null);
          return;
        }
        if (firstResolve.ok) return;

        try {
          const persistRes = await fetch("/api/competitor/ads-library/ensure-persisted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              domain: brand.domain,
              competitorId: cid,
            }),
          });
          const persistJson = (await persistRes.json()) as { ok?: boolean; error?: string; errors?: string[] };
          if (openGen !== adLibraryOpenGenRef.current) {
            setPendingOpenSeed(null);
            return;
          }
          if (!persistRes.ok || persistJson.ok === false) {
            toast.error(
              persistJson.error ?? persistJson.errors?.[0] ?? "Ads are still syncing — try again shortly.",
            );
          }
        } catch {
          if (openGen !== adLibraryOpenGenRef.current) {
            setPendingOpenSeed(null);
            return;
          }
          toast.error("Ads are still syncing — try again shortly.");
        }

        if (openGen !== adLibraryOpenGenRef.current) {
          setPendingOpenSeed(null);
          return;
        }

        refreshLibraryMappings();
        const retryResolve = await resolveLibraryAdAndOpen(cid, pl, lid);
        if (openGen !== adLibraryOpenGenRef.current) {
          setPendingOpenSeed(null);
          return;
        }
        if (retryResolve.ok) return;

        setPendingOpenSeed(null);
        toast.error(
          retryResolve.error === "Ad not found"
            ? "Could not open this ad. Try refreshing the library."
            : retryResolve.error || "Could not open this ad. Try refreshing the library.",
        );
      })();
    },
    [
      brand.domain,
      brand.logoUrl,
      competitorDbIdForSaved,
      competitorDisplayLabel,
      ensureWorkspaceLibraryLinked,
      isOwnWorkspace,
      openAd,
      refreshLibraryMappings,
      resolveLibraryAdAndOpen,
      scrapedIdForCard,
    ],
  );

  const [bulkLibraryLifecycle, setBulkLibraryLifecycle] = useState<
    Record<string, { isRunning: boolean; archivedCreativeUrl?: string }>
  >({});

  useEffect(() => {
    if (navTab !== "ads library") return;
    const cid = competitorDbIdForSaved;
    if (!cid) {
      setBulkLibraryLifecycle({});
      return;
    }
    let cancelled = false;
    void fetch(`/api/competitor/library-lifecycle?competitorId=${encodeURIComponent(cid)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(
        (res: {
          ok?: boolean;
          libraryLifecycle?: Record<string, { isRunning: boolean; archivedCreativeUrl?: string }>;
        }) => {
          if (cancelled || !res.ok) return;
          setBulkLibraryLifecycle(res.libraryLifecycle ?? {});
        },
      )
      .catch(() => {
        if (!cancelled) setBulkLibraryLifecycle({});
      });
    return () => {
      cancelled = true;
    };
  }, [navTab, competitorDbIdForSaved, accountLastScrapedAt, platformTrackingByPlatform]);

  useEffect(() => {
    const id = competitorDbIdForSaved;
    if (!id || isOwnWorkspace) return;
    if (
      navTab !== "insights" &&
      !(
        navTab === "ads library" &&
        (navSub === "creative-tests" ||
          navSub === "timeline" ||
          navSub === "audience" ||
          navSub === "copy-vault")
      )
    ) {
      return;
    }

    prefetchCompetitorFeatureCaches({
      cacheDomainNorm,
      competitorDomain: brand.domain,
      competitorId: id,
      scrapeStamp: accountLastScrapedAt ?? "none",
    });
  }, [navTab, navSub, competitorDbIdForSaved, cacheDomainNorm, brand.domain, accountLastScrapedAt, isOwnWorkspace]);

  /** Insights tabs read from `scraped_ads` — ensure ads_cache was copied before strategy/creative-tests load. */
  useEffect(() => {
    const needsPersistedAds =
      (navTab === "insights" &&
        (navSub === "strategy-map" || navSub === "activity-feed")) ||
      (navTab === "ads library" &&
        (navSub === "creative-tests" ||
          navSub === "timeline" ||
          navSub === "audience" ||
          navSub === "copy-vault")) ||
      (navTab === "website" && navSub === "from-ads");
    if (!needsPersistedAds || !cacheDomainNorm.trim()) return;
    if (
      competitorDbIdForSaved &&
      shouldSkipEnsurePersisted(brand.domain, competitorDbIdForSaved)
    ) {
      return;
    }

    let cancelled = false;
    void fetch("/api/competitor/ads-library/ensure-persisted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        domain: brand.domain,
        ...(competitorDbIdForSaved ? { competitorId: competitorDbIdForSaved } : {}),
      }),
    })
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json()) as { ok?: boolean; scrapedAdsPersisted?: number };
        if (!json.ok || !(json.scrapedAdsPersisted ?? 0)) return;
        if (competitorDbIdForSaved) {
          markEnsurePersistedSuccess(brand.domain, competitorDbIdForSaved);
        }
        prefetchCompetitorFeatureCaches({
          cacheDomainNorm,
          competitorDomain: brand.domain,
          competitorId: competitorDbIdForSaved,
          scrapeStamp: accountLastScrapedAt ?? "none",
        });
        window.dispatchEvent(
          new CustomEvent<AdsLibraryUpdatedDetail>(ADS_LIBRARY_UPDATED_EVENT, {
            detail: { domain: brand.domain.trim() },
          }),
        );
      })
      .catch(() => {
        /* non-blocking */
      });

    return () => {
      cancelled = true;
    };
  }, [
    navTab,
    navSub,
    brand.domain,
    cacheDomainNorm,
    competitorDbIdForSaved,
    accountLastScrapedAt,
  ]);

  const runStatusForLibraryCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const fromSaved = libraryRunStatusForCard(platform, libraryItemId, alternateIds);
      const fromBulk =
        bulkLibraryLifecycle[`${platform.trim().toLowerCase()}:${libraryItemId.trim()}`];
      if (fromSaved == null && fromBulk == null) return undefined;
      const archivedCreativeUrl =
        fromSaved?.archivedCreativeUrl ?? fromBulk?.archivedCreativeUrl;
      return {
        isRunning: (fromSaved ?? fromBulk)!.isRunning,
        ...(archivedCreativeUrl ? { archivedCreativeUrl } : {}),
      };
    },
    [libraryRunStatusForCard, bulkLibraryLifecycle],
  );

  const platformActiveCounts = useMemo(
    () => ({
      meta: countActiveMetaAds(displayMetaAds, metaScrapeAtMs),
      google: countActiveGoogleRowsWithLifecycle(filteredGoogleRows, runStatusForLibraryCard),
      tiktok: countActiveTikTokAds(filteredTikTokAds),
      linkedin: countActiveLinkedInAds(filteredLinkedInAds),
      pinterest: countActivePinterestAds(filteredPinterestAds),
      snapchat: countActiveSnapchatAds(filteredSnapchatAds),
    }),
    [
      displayMetaAds,
      metaScrapeAtMs,
      filteredGoogleRows,
      runStatusForLibraryCard,
      filteredLinkedInAds,
      filteredTikTokAds,
      filteredPinterestAds,
      filteredSnapchatAds,
    ]
  );

  const adSaveProps = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const sid = scrapedIdForCard(platform, libraryItemId, alternateIds);
      const runStatus = runStatusForLibraryCard(platform, libraryItemId, alternateIds);
      return {
        scrapedAdId: sid,
        isSaved: isLibraryItemSaved(savedMap, resolvedToScraped, platform, libraryItemId, alternateIds),
        isCreativeTestWinner: isCreativeTestWinnerForCard(platform, libraryItemId, alternateIds),
        onToggleSave:
          competitorDbIdForSaved && ownBrandSavedAdsEnabled
            ? () => void toggleSave(platform, libraryItemId)
            : undefined,
        saveDisabled: !competitorDbIdForSaved || !ownBrandSavedAdsEnabled,
        ...(runStatus ? { runStatus } : {}),
        ...(platform.trim().toLowerCase() === "meta" ? { metaScrapeAtMs } : {}),
      };
    },
    [competitorDbIdForSaved, ownBrandSavedAdsEnabled, scrapedIdForCard, isCreativeTestWinnerForCard, runStatusForLibraryCard, savedMap, resolvedToScraped, toggleSave, metaScrapeAtMs],
  );

  const displayTikTokAds = useMemo(() => {
    return filteredTikTokAds.map((ad) => {
      const run = runStatusForLibraryCard("tiktok", ad.id);
      if (run?.isRunning) return { ...ad, flightEndMs: undefined };
      return ad;
    });
  }, [filteredTikTokAds, runStatusForLibraryCard]);

  const inlinePreviewMetaAdsDisplay = useMemo(
    () => displayMetaAdsWithPreviews.filter(metaAdHasDashboardInlinePreview),
    [displayMetaAdsWithPreviews]
  );

  const inlinePreviewTikTokAdsDisplay = useMemo(
    () => displayTikTokAds.filter(tikTokAdHasDashboardInlinePreview),
    [displayTikTokAds]
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
  }, [adsPlatformsKey, cacheDomainNorm]);

  /** Show every platform enabled in Settings; users can hide sections manually. */
  const defaultVisibleAdPlatforms = adsPlatforms;

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

  const headerScrollSentinelRef = useRef<HTMLDivElement>(null);

  return (
    <RecomputePollProvider value={recomputePollState}>
    <AdSaveVisibilityProvider
      visible={ownBrandSavedAdsEnabled}
      showDebugIndicator={isOwnWorkspace && showBrandDebugTabs}
    >
    <div className="flex w-full flex-col">
      {/* Top Header */}
      <div
        className={`relative backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.5)] border-b ${
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
        <div
          className={`pt-6 sm:pt-7 pb-0 pr-4 sm:pr-5 ${isOwnWorkspace ? "pl-5 sm:pl-6" : COMPETITOR_PAGE_X}`}
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex min-w-0 flex-1 items-start gap-4">
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
                    ? "shrink-0 border-2 border-sky-200/90 ring-2 ring-sky-100/80 shadow-sm"
                    : "shrink-0 border-[#e0e3e8] shadow-sm"
                }
              />
              <div className="flex h-12 min-w-0 flex-col justify-between pt-px">
                <div className="flex min-w-0 flex-wrap items-center gap-2 gap-y-0 leading-none">
                  <h1 className="text-[20px] sm:text-[24px] font-bold leading-none text-[#343434] tracking-[-0.02em] truncate">
                    {competitorDisplayLabel}
                  </h1>
                  {isOwnWorkspace ? (
                    <span className="shrink-0 rounded-full bg-sky-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-900">
                      Your brand
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 leading-none">
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
                          ? formatLastScrapedLine(accountLastScrapedAt)
                          : "Scrape your ads from the Ads Library tab"
                        : accountLastScrapedAt
                          ? formatLastScrapedLine(accountLastScrapedAt)
                          : adsLibraryShowsCreativesOnScreen
                            ? "First sync in progress · creatives loading"
                            : "Not yet scraped"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation — full bleed below brand row */}
          <nav className={`-mb-px flex w-full gap-0 overflow-x-auto ${COMPETITOR_PAGE_X}`}>
            {pageTabs.map((tab) => {
              const isActive = navTab === tab.id;
              const isDisabled = tab.disabled === true;
              const isDebugOnlyTab =
                showBrandDebugTabs &&
                (isGlobalDebugOnlyTab(tab.id) ||
                  (isOwnWorkspace && isOwnBrandDebugOnlyTab(tab.id)));
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  title={
                    isDisabled
                      ? "Coming soon"
                      : isDebugOnlyTab
                        ? "Hidden from users — visible only with NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION"
                        : undefined
                  }
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
                  {isDebugOnlyTab ? (
                    <span
                      className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isDisabled
                        ? "text-[#b8beca]"
                        : isActive
                          ? isOwnWorkspace
                            ? "text-sky-700"
                            : "text-[#343434]"
                          : "text-[#9ca3af]"
                    }`}
                  />
                  {tab.label}
                  {tab.id === "alerts" && alertsUnreadCount > 0 ? (
                    <AlertUnreadCountBadge count={alertsUnreadCount} className="ml-0.5" />
                  ) : null}
                  {isDisabled ? <Lock className="h-3.5 w-3.5 shrink-0 text-[#b8beca]" aria-hidden /> : null}
                </button>
              );
            })}
          </nav>
          {(() => {
            const currentTab = findCompetitorTab(navTab);
            if (!currentTab?.subTabs?.length) return null;
            const visibleSubTabs = competitorSubTabsForView({
              parentTab: currentTab,
              isOwnWorkspace,
              showDebugTabs: showBrandDebugTabs,
            });
            if (visibleSubTabs.length === 0) return null;
            return (
              <div className="w-full border-b border-slate-200 bg-slate-50/50">
                <div className={`flex w-full items-center gap-1 overflow-x-auto py-2 ${COMPETITOR_PAGE_X}`}>
                  {visibleSubTabs.map((st) => {
                    const isSubActive = navSub === st.id;
                    const isDebugOnlySubTab =
                      isOwnWorkspace && showBrandDebugTabs && isOwnBrandDebugOnlySubTab(navTab, st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        title={
                          isDebugOnlySubTab
                            ? "Hidden from users — visible only with NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION"
                            : undefined
                        }
                        onClick={() => handleSubTabChange(st.id)}
                        className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          isSubActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {isDebugOnlySubTab ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                            aria-hidden
                          />
                        ) : null}
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </div>

      <CompetitorHeaderScrollSentinel sentinelRef={headerScrollSentinelRef} />
      <CompetitorCompactStickyNavAttached
        sentinelRef={headerScrollSentinelRef}
        competitorDisplayLabel={competitorDisplayLabel}
        brand={{ logoUrl: brand.logoUrl, domain: brand.domain }}
        isOwnWorkspace={isOwnWorkspace}
        showBrandDebugTabs={showBrandDebugTabs}
        pageTabs={pageTabs}
        navTab={navTab}
        navSub={navSub}
        alertsUnreadCount={alertsUnreadCount}
        onTabChange={handleTabChange}
        onSubTabChange={handleSubTabChange}
      />

      {isOwnWorkspace ? (
        <div className={`${COMPETITOR_PAGE_X} pt-4`}>
          <WorkspaceSetupChecklist
            hasAdsSetup={Boolean(myBrand.adsSetup?.channels?.length)}
            hasOrganicSocials={workspaceSetupFlags.organic}
            hasTrackedPages={workspaceSetupFlags.website}
            hasEmailTracker={workspaceSetupFlags.email}
            onNavigate={navigateFromBenchmark}
          />
        </div>
      ) : null}

      {/* Tab Content Areas */}
      <KeepMountedTab active={navTab === "ads library"} className="!flex-none flex-col">
        <KeepMountedTab
          active={navSub === "paid-media-settings" && !isOwnWorkspace}
          className="!flex-none flex-col"
        >
          <div className="bg-transparent">
            <div className={`${COMPETITOR_PAGE_X} py-8 pb-24 w-full animate-in fade-in duration-200`}>
              <CompetitorPaidMediaSettingsPanel
                competitor={{
                  name: competitorDisplayLabel,
                  domain: brand.domain,
                  logoUrl: brand.logoUrl,
                }}
                competitorDbId={competitorDbIdForSaved}
                brandId={myBrand.id}
                initialContext={competitorSidebarMatch?.libraryContext}
                fallbackIds={effectivePlatformIds}
                fallbackChannels={paidMediaSettingsFallbackChannels}
                enabled={navSub === "paid-media-settings" && !isOwnWorkspace}
                onSaved={handlePaidMediaSettingsSaved}
              />
            </div>
          </div>
        </KeepMountedTab>
        <KeepMountedTab
          active={navSub === "paid-media-settings" && isOwnWorkspace}
          className="!flex-none flex-col"
        >
          <div className="bg-transparent">
            <div className={`${COMPETITOR_PAGE_X} py-8 pb-24 w-full animate-in fade-in duration-200`}>
              <WorkspaceAdSourcesPanel
                brandId={myBrand.id}
                brandName={myBrand.name}
                domain={myBrand.domain ?? ""}
                initialSetup={myBrand.adsSetup ?? null}
                noBottomMargin
              />
            </div>
          </div>
        </KeepMountedTab>
        {navSub === "creative-tests" || navSub === "timeline" ? (
          <div className="bg-slate-50">
            {shouldRenderAiAnalysisNotice ? (
              <div className={`${COMPETITOR_PAGE_X} pt-6`}>{renderAiAnalysisNotice()}</div>
            ) : null}
            <KeepMountedTab active={navSub === "creative-tests"} className="!flex-none flex-col">
              <CreativeTestsTab
                competitorId={competitorDbIdForSaved}
                competitorLabel={competitorDisplayLabel}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                onFreshnessRescrape={undefined}
                onOpenAd={openAd}
                fetchEnabled={navSub === "creative-tests"}
              />
            </KeepMountedTab>
            <KeepMountedTab active={navSub === "timeline"} className="!flex-none flex-col">
              <TimelineTab
                competitorId={competitorDbIdForSaved}
                competitorLabel={competitorDisplayLabel}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                onFreshnessRescrape={undefined}
                onOpenAd={openAd}
                fetchEnabled={navSub === "timeline"}
              />
            </KeepMountedTab>
          </div>
        ) : navSub === "audience" || navSub === "copy-vault" ? (
          <div className="bg-slate-50">
            {shouldRenderAiAnalysisNotice ? (
              <div className={`${COMPETITOR_PAGE_X} pt-6`}>{renderAiAnalysisNotice()}</div>
            ) : null}
            <KeepMountedTab active={navSub === "audience"} className="!flex-none flex-col">
              <AudienceTab
                brandId={myBrand.id}
                competitorDomain={brand.domain}
                workspaceName={myBrand.name}
                workspaceLogoUrl={myBrand.logoUrl ?? null}
                workspaceDomain={myBrand.domain ?? null}
                workspaceColor={myBrand.color ?? undefined}
                workspaceBadge={myBrand.badge ?? undefined}
                competitorLabel={competitorDisplayLabel}
                competitorLogoUrl={brand.logoUrl}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                fetchEnabled={navSub === "audience"}
                externalRecomputeRunning={recomputePollState.recomputeRunning}
              />
            </KeepMountedTab>
            <KeepMountedTab active={navSub === "copy-vault"} className="!flex-none flex-col">
              <CopyVaultTab
                competitorId={competitorDbIdForSaved}
                competitorLabel={competitorDisplayLabel}
                onOpenAd={openAd}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                fetchEnabled={navSub === "copy-vault"}
              />
            </KeepMountedTab>
          </div>
        ) : navSub === "paid-media-settings" ? null : (
        <div className="bg-transparent">
          <div className={`${COMPETITOR_PAGE_X} py-8 pb-24 w-full animate-in fade-in duration-200`}>
            {navSub === "saved" && ownBrandSavedAdsEnabled ? (
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
            {renderAiAnalysisNotice()}
            {showAdLibraryAnalyticsPanel ? (
              <FeatureSectionHeader
                className="mb-6"
                overline="Paid media"
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
            {showAdLibraryAnalyticsPanel ? (
              <AdLibraryAnalyticsPanel
                competitorId={competitorDbIdForSaved}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                platformActiveCounts={platformActiveCounts}
                platformTotalCounts={platformTotalCounts}
                onViewAllLandingPages={navigateToLandingPagesExplorer}
                onFreshnessRescrape={undefined}
                landingPagesListCache={landingPagesListCacheForChildren}
                isOwnWorkspace={isOwnWorkspace}
              />
            ) : showAdLibraryLinkingAnalyticsShell ? (
              <div className="mb-6 rounded-2xl border border-[#e5e7eb]/80 bg-gradient-to-br from-[#f8fafc] to-[#eff6ff]/60 px-4 py-14 sm:px-8 flex flex-col items-center justify-center gap-3 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <RivalLogoVideo size="md" className="opacity-90 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[#374151]">
                    {workspaceLibraryLinkState === "persisting"
                      ? "Syncing ad detail data…"
                      : workspaceLibraryLinkState === "error"
                        ? "Could not finish setup"
                        : isOwnWorkspace
                          ? "Setting up analytics & ad detail…"
                          : "Connecting competitor to your workspace…"}
                  </p>
                  <p className="text-[13px] leading-snug text-[#64748b] max-w-[28rem] mx-auto">
                    {workspaceLibraryLinkState === "persisting"
                      ? "Copying scraped ads so analytics and the ad detail drawer can open."
                      : workspaceLibraryLinkState === "error"
                        ? workspaceLibraryLinkError ??
                          "Try again — your creatives below are still browsable from cache."
                        : isOwnWorkspace
                          ? "We register your brand in the app (same database record competitors get from the sidebar) so analytics and clicking an ad work. Ads below load separately from your scrape cache."
                          : "Analytics unlock as soon as the account link completes. Ad detail uses the same step—you can keep browsing creatives below while this finishes."}
                  </p>
                  {isOwnWorkspace && workspaceLibraryLinkState === "error" ? (
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-[13px] font-medium text-sky-900 hover:bg-sky-50"
                      onClick={() => {
                        workspaceLinkBootstrappedRef.current = false;
                        void ensureWorkspaceLibraryLinked();
                      }}
                    >
                      Retry setup
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {adsPlatforms.length > 0 ? (
              <div className="mb-5 rounded-2xl border border-[#e5e7eb]/70 bg-[#DDF1FD]/25 px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:px-4 sm:py-2">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1 lg:gap-x-7">
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
                        const scraped = platformHasScrapedLibraryData(id, adLibLoading ? null : adLib, {
                          activeAdCount: platformTrackingByPlatform[id]?.activeAdCount,
                        });
                        const platformChipHint = !scraped
                          ? platformTrackingByPlatform[id]?.lastScrapeAt
                            ? "No ads"
                            : "Not scraped"
                          : null;
                        const trackingChip = showPlatformClassificationDebug
                          ? platformTrackingByPlatform[id]
                          : undefined;
                        return (
                          <button
                            key={id}
                            type="button"
                            title={
                              !scraped
                                ? `${title} — not scraped yet (click to show and refresh)`
                                : on
                                  ? `${title} — showing (click to hide)`
                                  : `${title} — hidden (click to show)`
                            }
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
                                  <span
                                    className={`block truncate opacity-80 ${isNextScrapeOverdue(trackingChip.nextScrapeAt) ? "font-semibold text-red-700" : ""}`}
                                  >
                                    {formatNextScrapeChipLabel(trackingChip.nextScrapeAt)}
                                  </span>
                                </span>
                              ) : showPlatformClassificationDebug ? (
                                <span className="mt-0.5 block text-center font-mono text-[9px] text-amber-800/50">
                                  —
                                </span>
                              ) : !scraped && platformChipHint ? (
                                <span className="mt-0.5 block text-center text-[9px] font-medium leading-tight text-[#94a3b8]">
                                  {platformChipHint}
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

            {adLibraryConfirmed && adsPlatforms.length > 0 && adsApiConfigured && !adLibFetchError && !adLibLoading && adLib === null ? (
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
                    <div className={META_ADS_GRID_CLASS}>
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
                  ) : inlinePreviewMetaAdsDisplay.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={META_ADS_GRID_CLASS}>
                      {inlinePreviewMetaAdsDisplay.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <div key={ad.id} className="flex h-full min-h-0 flex-col">
                          <MetaAdCard
                            ad={ad}
                            viewMode="grid"
                            brand={brand}
                            onClick={() => openAdLibraryCard("meta", ad.id, metaLibraryItemLookupKeys(ad), ad)}
                            {...adSaveProps("meta", ad.id, metaLibraryItemLookupKeys(ad))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <MetaAdsAllModal
                open={metaAdsModalOpen}
                onClose={() => setMetaAdsModalOpen(false)}
                domain={cacheDomainNorm}
                viewMode="grid"
                brand={brand}
                onAdActivate={(ad) => openAdLibraryCard("meta", ad.id, metaLibraryItemLookupKeys(ad), ad)}
                getMetaAdExtras={(ad) => adSaveProps("meta", ad.id, metaLibraryItemLookupKeys(ad))}
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
                            void openAdLibraryCard(ad.type === "youtube" ? "youtube" : "google", ad.id, [], ad)
                          }
                          {...adSaveProps(ad.type === "youtube" ? "youtube" : "google", ad.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal<GoogleAdRow>
                open={googleAdsModalOpen}
                onClose={() => setGoogleAdsModalOpen(false)}
                title="Google / YouTube ads"
                logo={
                  <>
                    <GoogleLogo className="w-5 h-5" />
                    <YouTubeLogo className="w-5 h-5" />
                  </>
                }
                domain={cacheDomainNorm}
                platform="google"
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => (
                  <GoogleAdRowCard
                    ad={ad}
                    brand={brand}
                    onOpenDetail={() =>
                      void openAdLibraryCard(ad.type === "youtube" ? "youtube" : "google", ad.id, [], ad)
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
                          onOpenDetail={() => void openAdLibraryCard("linkedin", ad.id, [], ad)}
                          {...adSaveProps("linkedin", ad.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal<LinkedInAdCard>
                open={linkedInAdsModalOpen}
                onClose={() => setLinkedInAdsModalOpen(false)}
                title="LinkedIn ads"
                logo={<LinkedInLogo className="w-5 h-5" />}
                domain={cacheDomainNorm}
                platform="linkedin"
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => (
                  <LinkedInFeedAdCard
                    ad={ad}
                    brand={brand}
                    onOpenDetail={() => void openAdLibraryCard("linkedin", ad.id, [], ad)}
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
                      title="Re-fetch TikTok only (last 30 days, up to 300 ads)."
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
                  ) : inlinePreviewTikTokAdsDisplay.length === 0 ? (
                    <AdsLibraryEmptyWithPlaceholders message={DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE} />
                  ) : (
                    <div className={ADS_GRID_CLASS}>
                      {inlinePreviewTikTokAdsDisplay.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                        <TikTokAdCard
                          key={ad.id}
                          ad={ad}
                          onClick={() => void openAdLibraryCard("tiktok", ad.id, [], ad)}
                          {...adSaveProps("tiktok", ad.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal<TikTokAdCardModel>
                open={tiktokAdsModalOpen}
                onClose={() => setTiktokAdsModalOpen(false)}
                title="TikTok ads"
                logo={<TikTokLogo className="w-5 h-5" />}
                domain={cacheDomainNorm}
                platform="tiktok"
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => (
                  <TikTokAdCard
                    ad={ad}
                    onClick={() => void openAdLibraryCard("tiktok", ad.id, [], ad)}
                    {...adSaveProps("tiktok", ad.id)}
                  />
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
                          onClick={() => void openAdLibraryCard("pinterest", ad.id, [], ad)}
                          {...adSaveProps("pinterest", ad.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal<PinterestAdCardModel>
                open={pinterestAdsModalOpen}
                onClose={() => setPinterestAdsModalOpen(false)}
                title="Pinterest ads"
                logo={<PinterestLogo className="w-5 h-5" />}
                domain={cacheDomainNorm}
                platform="pinterest"
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => (
                  <PinterestAdCard ad={ad} onClick={() => void openAdLibraryCard("pinterest", ad.id, [], ad)} {...adSaveProps("pinterest", ad.id)} />
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
                            onClick={() => void openAdLibraryCard("snapchat", ad.id, [], ad)}
                            {...adSaveProps("snapchat", ad.id)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <AdsLibraryAllModal<SnapchatAdCardModel>
                open={snapchatAdsModalOpen}
                onClose={() => setSnapchatAdsModalOpen(false)}
                title="Snapchat ads"
                logo={<SnapchatLogo className="h-5 w-5 text-[#0fad00]" />}
                domain={cacheDomainNorm}
                platform="snapchat"
                getKey={(ad) => ad.id}
                viewMode="grid"
                renderItem={(ad) => (
                  <SnapchatAdCard ad={ad} onClick={() => void openAdLibraryCard("snapchat", ad.id, [], ad)} {...adSaveProps("snapchat", ad.id)} />
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
        )}
      </KeepMountedTab>

      <KeepMountedTab active={navTab === "insights"} className="!flex-none flex-col">
        <div className="bg-slate-50">
          {shouldRenderAiAnalysisNotice ? (
            <div className={`${COMPETITOR_PAGE_X} pt-6`}>{renderAiAnalysisNotice()}</div>
          ) : null}
          <Suspense
            fallback={
              <RivalLoadingBlock padded className="py-14" />
            }
          >
            <KeepMountedTab
              active={navSub === "strategy-map" && (!isOwnWorkspace || showBrandDebugTabs)}
              className="!flex-none flex-col"
            >
              <StrategyOverviewApp
                brand={brand}
                onOpenAdsLibrary={() => handleTabChange("ads library")}
                competitorId={competitorDbIdForSaved || undefined}
                lastScrapedAt={accountLastScrapedAt}
                onFreshnessRescrape={undefined}
                fetchEnabled={navTab === "insights" && navSub === "strategy-map"}
                externalRecomputeRunning={recomputePollState.recomputeRunning}
                externalRecomputeError={recomputePollState.recomputeError}
                isOwnWorkspace={isOwnWorkspace}
                brandId={myBrand.id}
                onNavigateGaps={navigateFromBenchmark}
              />
            </KeepMountedTab>
            <KeepMountedTab active={navSub === "activity-feed" && !isOwnWorkspace} className="!flex-none flex-col">
              <ActivityFeedTab
                competitorDomain={brand.domain}
                competitorLabel={competitorDisplayLabel}
                competitorId={competitorDbIdForSaved}
                cacheDomainNorm={cacheDomainNorm}
                lastScrapedAt={accountLastScrapedAt}
                fetchEnabled={navSub === "activity-feed"}
              />
            </KeepMountedTab>
            {isOwnWorkspace ? (
              <>
                <KeepMountedTab active={navSub === "benchmark"} className="!flex-none flex-col">
                  <BenchmarkTab
                    fetchEnabled={navTab === "insights" && navSub === "benchmark"}
                    brandId={myBrand.id}
                    cacheDomainNorm={cacheDomainNorm}
                    lastScrapedAt={accountLastScrapedAt}
                    onNavigate={navigateFromBenchmark}
                  />
                </KeepMountedTab>
                <KeepMountedTab active={navSub === "improve-marketing" && showBrandDebugTabs} className="!flex-none flex-col">
                  <div className={`${COMPETITOR_PAGE_X} py-8 w-full animate-in fade-in duration-200`}>
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[18px] font-semibold text-sky-950">How your marketing can improve</h2>
                        <p className="mt-0.5 max-w-[40rem] text-[14px] text-sky-900/75">
                          We compare your paid ads, organic, website, and email against every competitor you follow —
                          and suggest what to push on vs what to leave alone.
                        </p>
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-sky-800/80">
                          AI-generated · refresh rivals and your channels so evidence stays fresh
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
                                {item.channel ? (
                                  <span className="mt-1 inline-block rounded-full bg-emerald-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                                    {item.channel}
                                  </span>
                                ) : null}
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
                </KeepMountedTab>
              </>
            ) : null}
          </Suspense>
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={navTab === "website"} className="!flex-none flex-col">
        <div className="bg-slate-50">
          <WebsiteTab
            competitorId={competitorDbIdForSaved || undefined}
            competitorLabel={competitorDisplayLabel}
            cacheDomainNorm={cacheDomainNorm}
            lastScrapedAt={accountLastScrapedAt}
            activeSubTab={(navSub as CompetitorSubTabId | null) ?? "tracked"}
            onOpenAd={openAd}
            onFreshnessRescrape={undefined}
            sharedLandingPagesListCache={landingPagesListCacheForChildren}
            fetchEnabled={navTab === "website"}
          />
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={navTab === "comparison" && !isOwnWorkspace} className="!flex-none flex-col">
        <div className="bg-slate-50">
          <div className="animate-in fade-in duration-200">
            {shouldRenderAiAnalysisNotice ? (
              <div className={`${COMPETITOR_PAGE_X} pt-6`}>{renderAiAnalysisNotice()}</div>
            ) : null}
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

      <KeepMountedTab active={navTab === "alerts" && !isOwnWorkspace} className="!flex-none flex-col">
        <div className="bg-slate-50">
          <AlertsTab
            competitorId={competitorDbIdForSaved || undefined}
            competitorLabel={competitorDisplayLabel}
            allowAlertRules={billingAllowAlertRules || billingIsUnlimited}
            allowAlertEmail={billingAllowAlertEmail || billingIsUnlimited}
            billingPlanTier={billingPlanTier}
            billingStatus={billingStatus}
            billingIsUnlimited={billingIsUnlimited}
            onUnreadChange={setAlertsUnreadCount}
            fetchEnabled={navTab === "alerts"}
          />
        </div>
      </KeepMountedTab>

      <KeepMountedTab active={navTab === "email-marketing"} className="!flex-none flex-col">
        <div className="bg-slate-50">
          <EmailMarketingTab
            competitorId={competitorDbIdForSaved || undefined}
            competitorName={competitorDisplayLabel}
            activeSubTab={(navSub as CompetitorSubTabId | null) ?? "inbox"}
            onSubTabChange={handleSubTabChange}
            isOwnWorkspace={isOwnWorkspace}
            fetchEnabled={navTab === "email-marketing"}
          />
        </div>
      </KeepMountedTab>

      <KeepMountedTab
        active={navTab === "organic"}
        className="!flex-none flex-col"
      >
        <div className="bg-slate-50">
          <OrganicTab
            competitorId={competitorDbIdForSaved || undefined}
            competitorName={competitorDisplayLabel}
            activeSubTab={(navSub as CompetitorSubTabId | null) ?? "feed"}
            onSubTabChange={handleSubTabChange}
            isOwnWorkspace={isOwnWorkspace}
          />
        </div>
      </KeepMountedTab>

      <AdDetailDrawer
        adId={activeAdId}
        openSeed={pendingOpenSeed}
        onClose={closeAdDetail}
        saveEnabled={ownBrandSavedAdsEnabled}
        showDebugIndicator={isOwnWorkspace && showBrandDebugTabs}
      />
    </div>
    </AdSaveVisibilityProvider>
    </RecomputePollProvider>
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("brand");
    params.delete("ids");
    params.delete("url");
    const qs = params.toString();
    const base = buildCompetitorDashboardPath(canonicalHost);
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
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
