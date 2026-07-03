"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trophy,
  X,
} from "lucide-react";

import { AdPreviewAnalysisPanel, type AdPreviewAnalysisQuota } from "@/components/ad-detail/ad-preview-analysis-panel";
import { AdPreviewDownloadBar } from "@/components/ad-detail/ad-preview-download-bar";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { InstagramMark } from "@/components/icons/instagram-mark";
import { MessengerMark } from "@/components/icons/messenger-mark";
import { MetaMark } from "@/components/icons/meta-mark";
import { ThreadsMark } from "@/components/icons/threads-mark";
import { WhatsAppMark } from "@/components/icons/whatsapp-mark";
import { AdDetailDrawerSkeleton } from "@/components/ui/feature-skeleton";
import { AD_SAVE_DEBUG_TITLE } from "@/components/ads-library/ad-save-row";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { AdPreviewAnalysis } from "@/lib/ad-detail/ad-ai-analysis-types";
import type { AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";
import { fetchAdDetailPayload } from "@/lib/ad-detail/ad-detail-cache";
import { readAdDetailDisplaySnapshot } from "@/lib/ad-detail/ad-detail-snapshot";
import { isFullAdDetailPayload } from "@/lib/ad-detail/ad-detail-from-seed";
import type { AdDetailData } from "@/lib/ad-detail/ad-detail-types";

export type { AdDetailDrawerPayload } from "@/lib/ad-detail/ad-detail-types";
import { invalidateSavedAdsCaches } from "@/lib/cache/cache-invalidator";
import {
  adLibraryLinkLabel,
  resolveAdLibrarySourceUrl,
} from "@/lib/ad-detail/resolve-ad-library-url";
import {
  isMostlyVerticalCreativePlatform,
  resolveAdDetailCreativeMedia,
} from "@/lib/ad-detail/resolve-creative-media";
import {
  buildLinkedInLibraryDetailRows,
  buildPinterestLibraryDetailRows,
  buildSnapchatLibraryDetailRows,
} from "@/lib/ad-detail/linkedin-pinterest-snapchat-detail-rows";
import { buildGoogleFamilyAdDetailFields } from "@/lib/ad-detail/google-family-ad-detail-fields";
import { buildTikTokAdLibraryDetailRows } from "@/lib/ad-detail/tiktok-ad-detail-rows";
import {
  drawerComparisonPlatformIconId,
  drawerPlatformChipSlug,
  googleFamilyDrawerIsYoutubeish,
} from "@/lib/ad-detail/google-drawer-surface";
import { resolveDetailRunningDays } from "@/lib/ad-detail/detail-time-running";
import { formatMetaDetailStatusLabel } from "@/lib/ad-detail/meta-detail-status";
import { normalizeAdDetailPlatformKey } from "@/lib/ad-detail/ad-detail-platform";
import {
  buildCanonicalDetailSlices,
  formatCanonicalRunStartLabel,
} from "@/lib/ad-detail/detail-canonical-fields";
import {
  metaAgeAudienceDetailLabel,
  metaGenderAudienceDetailLabel,
  metaLocationAudienceRows,
  metaPublisherDetailRows,
  metaReachBreakdownDrawerGroups,
  metaTargetMarketFooterLine,
  metaTargetsEuExplicit,
  type MetaLocationAudienceParsedRow,
  type MetaPublisherDetailRow,
  type MetaReachBreakdownDrawerGroup,
} from "@/lib/ad-detail/meta-ad-detail-fields";
import {
  cleanLinkedInScraperAdDescription,
  cleanPinterestAdPreviewDescription,
  googleCreativeFormatKind,
  pinterestCaptionFieldsFromPayload,
  snapchatPreviewHeadlineFromPayload,
} from "@/lib/ad-library/normalize";
import { hostFromLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import {
  googleTransparencyImpressionsCollapsedHeadline,
  googleTransparencyTerritoryDisclosureRows,
  parseGoogleRegionStatsFromRecord,
} from "@/lib/ad-library/google-region-stats";

function MetaPublisherPlatformGlyph({ slug, index }: { slug: string; index: number }) {
  switch (slug) {
    case "FACEBOOK":
      return <FacebookLogo idSuffix={`apd-${index}`} className="h-3.5 w-3.5 shrink-0" />;
    case "INSTAGRAM":
      return <InstagramMark className="h-3.5 w-3.5 shrink-0" />;
    case "THREADS":
      return <ThreadsMark className="h-3.5 w-3.5 shrink-0 text-slate-900" />;
    case "MESSENGER":
      return <MessengerMark className="h-3.5 w-3.5 shrink-0" />;
    case "AUDIENCE_NETWORK":
      return <MetaMark className="h-3.5 w-3.5 shrink-0" />;
    case "WHATSAPP":
      return <WhatsAppMark className="h-3.5 w-3.5 shrink-0" />;
    default:
      return null;
  }
}

function MetaPublisherPlatformsDetailValue({ rows }: { rows: MetaPublisherDetailRow[] }) {
  return (
    <div className="flex max-w-[280px] flex-wrap items-center justify-end gap-x-4 gap-y-1.5">
      {rows.map((row, i) => (
        <span key={`${row.key}-${i}`} className="inline-flex items-center gap-1.5">
          <MetaPublisherPlatformGlyph slug={row.key} index={i} />
          <span className="font-medium text-slate-900">{row.label}</span>
        </span>
      ))}
    </div>
  );
}

export function AdDetailDrawer({
  adId,
  openSeed = null,
  onClose,
  onPrev,
  onNext,
  saveEnabled = true,
  showDebugIndicator = false,
}: {
  adId: string | null;
  openSeed?: AdDetailOpenSeed | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  saveEnabled?: boolean;
  showDebugIndicator?: boolean;
}) {
  const snapshot = readAdDetailDisplaySnapshot(adId, openSeed);
  const [data, setData] = useState<AdDetailData | null>(() => snapshot?.data ?? null);
  const [loading, setLoading] = useState(() => !snapshot && Boolean(adId || openSeed));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [saveInFlight, setSaveInFlight] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hydrating, setHydrating] = useState(() => snapshot?.hydrating ?? false);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const dismissedRef = useRef(false);
  const isOpen = Boolean(adId || openSeed);
  const showDrawer = isOpen || closing;

  useLayoutEffect(() => {
    if (isOpen) {
      dismissedRef.current = false;
      if (!wasOpenRef.current) setEntering(true);
      wasOpenRef.current = true;
    } else if (!closing) {
      wasOpenRef.current = false;
      setEntering(false);
      setClosing(false);
    }
  }, [isOpen, closing]);

  const requestClose = useCallback(() => {
    if (closing || dismissedRef.current) return;
    dismissedRef.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setEntering(false);
    setClosing(true);
    onClose();
  }, [closing, onClose]);

  useEffect(() => {
    if (!closing) return;

    const panel = panelRef.current;
    if (!panel) {
      setClosing(false);
      return;
    }

    let finished = false;
    const finishClose = () => {
      if (finished) return;
      finished = true;
      setClosing(false);
    };

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== panel || event.animationName !== "ad-detail-slide-out") return;
      finishClose();
    };

    panel.addEventListener("animationend", onAnimationEnd);
    const fallback = window.setTimeout(finishClose, 380);

    return () => {
      panel.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallback);
    };
  }, [closing]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (closing || dismissedRef.current) return;

    const nextSnapshot = readAdDetailDisplaySnapshot(adId, openSeed);
    if (nextSnapshot) {
      setData(nextSnapshot.data);
      setLoading(false);
      setHydrating(nextSnapshot.hydrating);
      setError(null);
    } else if (!adId && !openSeed) {
      setData(null);
      setLoading(false);
      setHydrating(false);
      setError(null);
    } else {
      setData(null);
      setLoading(true);
      setHydrating(false);
      setError(null);
    }
    setActiveTab("details");
  }, [adId, openSeed, closing]);

  useEffect(() => {
    if (!adId || dismissedRef.current) return;

    let cancelled = false;

    void fetchAdDetailPayload(adId)
      .then((res) => {
        if (cancelled || dismissedRef.current || !res) return;
        if (!isFullAdDetailPayload(res)) {
          if (!readAdDetailDisplaySnapshot(adId, openSeed)) {
            setError(res.error ?? "Failed to load");
            setData(null);
            setLoading(false);
          }
          setHydrating(false);
          return;
        }
        setData({
          ok: true,
          ad: res.ad!,
          competitor: res.competitor!,
          ai: res.ai!,
          context: res.context!,
        });
        setError(null);
        setLoading(false);
        setHydrating(false);
      })
      .catch((err: unknown) => {
        if (cancelled || dismissedRef.current) return;
        if (!readAdDetailDisplaySnapshot(adId, openSeed)) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
        setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adId, openSeed]);

  useEffect(() => {
    if (!saveEnabled || !data?.ad.id || !data?.competitor.id) {
      setSavedRowId(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/saved-ads/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        competitorId: data.competitor.id,
        scrapedAdIds: [data.ad.id],
      }),
    })
      .then((r) => r.json())
      .then((res: { ok?: boolean; savedMap?: Record<string, string> }) => {
        if (cancelled || !res.ok) return;
        setSavedRowId(res.savedMap?.[data!.ad.id] ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [saveEnabled, data?.ad.id, data?.competitor.id]);

  const handleToggleSave = useCallback(async () => {
    if (!data?.ad.id || saveInFlight) return;
    setSaveInFlight(true);
    try {
      if (savedRowId) {
        const res = await fetch(`/api/saved-ads/${savedRowId}`, { method: "DELETE", credentials: "include" });
        const json = (await res.json()) as { ok?: boolean };
        if (json.ok) {
          setSavedRowId(null);
          const dom = data.competitor.domain.trim().toLowerCase();
          const cid = data.competitor.id.trim();
          if (dom && cid) invalidateSavedAdsCaches(dom, cid);
        }
      } else {
        const res = await fetch("/api/saved-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ scrapedAdId: data.ad.id }),
        });
        const json = (await res.json()) as { ok?: boolean; savedAd?: { id: string } };
        if (json.ok && json.savedAd?.id) {
          setSavedRowId(json.savedAd.id);
          const dom = data.competitor.domain.trim().toLowerCase();
          const cid = data.competitor.id.trim();
          if (dom && cid) invalidateSavedAdsCaches(dom, cid);
        }
      }
    } finally {
      setSaveInFlight(false);
    }
  }, [data?.ad.id, savedRowId, saveInFlight]);

  useEffect(() => {
    if (!adId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [adId, requestClose, onPrev, onNext]);

  const handleAnalysisSaved = useCallback((analysis: AdPreviewAnalysis, quota: AdPreviewAnalysisQuota) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        context: {
          ...prev.context,
          preview_analysis: analysis,
          preview_analysis_computed_at: new Date().toISOString(),
          preview_analysis_quota: quota,
          copy_structure: analysis.copy_structure,
        },
      };
    });
  }, []);

  if (!showDrawer) return null;
  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[150] flex justify-end${closing ? " pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className={`ad-detail-drawer-backdrop absolute inset-0 bg-black/40${entering ? " ad-detail-drawer-backdrop--entering" : ""}${closing ? " ad-detail-drawer-backdrop--closing" : ""}`}
        aria-label="Close"
        onClick={requestClose}
        disabled={closing}
      />

      <div
        ref={panelRef}
        className={`ad-detail-drawer-panel relative flex h-full w-full max-w-[1080px] border-l border-slate-200 bg-white shadow-2xl${entering ? " ad-detail-drawer-panel--entering" : ""}${closing ? " ad-detail-drawer-panel--closing" : ""}`}
      >
        <div className="flex w-full flex-shrink-0 flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPrev}
                disabled={!onPrev}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous ad"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <div className="max-w-[400px] truncate text-[13px] font-medium text-slate-700">
                {data?.ad.display_label ?? (loading ? "Loading…" : "Ad preview")}
              </div>
              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next ad"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                disabled={closing}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          {loading ? <AdDetailDrawerSkeleton /> : null}

          {error && !loading && !data ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            </div>
          ) : null}

          {data && !loading ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex flex-1 items-start justify-center overflow-y-auto bg-slate-50 p-6 sm:p-8">
                <AdCreativePreview ad={data.ad} competitor={data.competitor} context={data.context} />
              </div>

              <div className="flex w-[min(100%,400px)] flex-shrink-0 flex-col border-l border-slate-200">
                {hydrating ? (
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-medium text-slate-500">
                    Syncing full ad details…
                  </div>
                ) : null}
                {saveEnabled ? (
                  <div className="border-b border-slate-100 p-4">
                    <button
                      type="button"
                      onClick={() => void handleToggleSave()}
                      disabled={!data?.ad.id || saveInFlight}
                      title={showDebugIndicator ? AD_SAVE_DEBUG_TITLE : undefined}
                      className={`relative flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        savedRowId
                          ? "border border-sky-200/90 bg-[#DDF1FD] text-[#343434] hover:bg-[#c8e8fc]"
                          : "bg-[#343434] text-white hover:bg-[#1f1f1f]"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {showDebugIndicator ? (
                        <span
                          className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-white/80"
                          aria-hidden
                        />
                      ) : null}
                      {savedRowId ? (
                        <>
                          <BookmarkCheck className="h-4 w-4" />
                          Saved · view in Saved tab
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4" />
                          Save the Ad
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-[10px] text-slate-500">
                      Saved ads are preserved forever, even if the source ad is removed.
                    </p>
                  </div>
                ) : null}

                <div className="flex border-b border-slate-100 px-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "details"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "ai"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    AI Analysis
                    {!data.context.preview_analysis ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-800">
                        New
                      </span>
                    ) : null}
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {activeTab === "details" ? <DetailsTab data={data} /> : null}
                  {activeTab === "ai" && data ? (
                    <AdPreviewAnalysisPanel
                      key={data.ad.id}
                      adId={data.ad.id}
                      initialAnalysis={data.context.preview_analysis ?? null}
                      initialComputedAt={data.context.preview_analysis_computed_at ?? null}
                      initialQuota={data.context.preview_analysis_quota ?? null}
                      onAnalysisSaved={handleAnalysisSaved}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function safeExtractHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizePreviewWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** When joined `ad_text` glues Snapchat gallery status on the same line, keep the headline only. */
function snapchatHeadlineStripGalleryStatusGlue(block: string): string {
  const line = block.split(/\r?\n/)[0]?.trim() ?? "";
  const narrowed = line
    .replace(/\s+ACTIVE\s*[·•]\s*Review\s*:[^\n]*$/iu, "")
    .replace(/\s+PAUSED\s*[·•]\s*Review\s*:[^\n]*$/iu, "")
    .trim();
  return narrowed || line;
}

function safeExternalHref(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function landingDetailHostTrailingSlash(hrefOrRaw: string | null | undefined): string | null {
  const t = hrefOrRaw?.trim();
  if (!t) return null;
  const host = hostFromLandingPageUrl(t);
  return host ? `${host.toLowerCase()}/` : null;
}

function detailCreativeMediaClasses(vertical: boolean, forVideo: boolean): string {
  const base = "mx-auto block w-full object-contain";
  if (vertical) {
    return `${base} max-h-[min(600px,85vh)] max-w-[min(100%,min(340px,100vw))]`;
  }
  return `${base} max-h-[600px]${forVideo ? " min-h-[200px]" : ""}`;
}

function DetailYoutubePlayOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 pl-1 shadow-lg"
        aria-hidden
      >
        <div className="h-0 w-0 border-b-[7px] border-b-transparent border-l-[12px] border-l-white border-t-[7px] border-t-transparent" />
      </div>
    </div>
  );
}

function DetailCreativeMediaFrame({
  showYoutubePlayOverlay,
  children,
}: {
  showYoutubePlayOverlay: boolean;
  children: ReactNode;
}) {
  if (!showYoutubePlayOverlay) return <>{children}</>;
  return (
    <div className="relative inline-block max-w-full">
      {children}
      <DetailYoutubePlayOverlay />
    </div>
  );
}

function DetailCreativeVideo({
  src,
  poster,
  vertical,
  platformKey,
  rawPayload,
  showPlayOverlay = false,
}: {
  src: string;
  poster?: string;
  vertical: boolean;
  platformKey: string;
  rawPayload?: unknown;
  showPlayOverlay?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    if (poster) {
      return (
        <DetailCreativeMediaFrame showYoutubePlayOverlay={showPlayOverlay}>
          <img
            src={poster}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={detailCreativeMediaClasses(vertical, false)}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </DetailCreativeMediaFrame>
      );
    }
    return (
      <div className="flex aspect-square w-full items-center justify-center">
        <ComparisonPlatformIcon platform={drawerComparisonPlatformIconId(platformKey, rawPayload)} className="h-12 w-12 opacity-30" />
      </div>
    );
  }

  return (
    <DetailCreativeMediaFrame showYoutubePlayOverlay={showPlayOverlay}>
      <video
        controls
        playsInline
        preload="auto"
        poster={poster}
        src={src}
        className={`${detailCreativeMediaClasses(vertical, true)} bg-black`}
        onError={() => setFailed(true)}
      />
    </DetailCreativeMediaFrame>
  );
}

function CreativeMediaBlock({ ad }: { ad: AdDetailData["ad"] }) {
  const resolved = resolveAdDetailCreativeMedia(ad);
  const vertical = isMostlyVerticalCreativePlatform(ad.platform);
  const showYoutubePlay = googleFamilyDrawerIsYoutubeish(ad.platform, ad.raw_payload);

  if (resolved.kind === "empty") {
    return (
      <div className="flex aspect-square w-full items-center justify-center">
        <ComparisonPlatformIcon platform={drawerComparisonPlatformIconId(ad.platform, ad.raw_payload)} className="h-12 w-12 opacity-30" />
      </div>
    );
  }

  if (resolved.kind === "image") {
    return (
      <DetailCreativeMediaFrame showYoutubePlayOverlay={showYoutubePlay}>
        <img
          src={resolved.src}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className={detailCreativeMediaClasses(vertical, false)}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </DetailCreativeMediaFrame>
    );
  }

  return (
    <DetailCreativeVideo
      src={resolved.src}
      poster={resolved.poster}
      vertical={vertical}
      platformKey={ad.platform}
      rawPayload={ad.raw_payload}
      showPlayOverlay={showYoutubePlay}
    />
  );
}

/** Transparency text-heavy rows — hide synthetic link slab + favicon strip when we'd only decorate with favicon-tier art. */
function googleUsesHeadlineOnlyDrawerPreview(payload: Record<string, unknown>): boolean {
  const fmt = typeof payload.format === "string" ? payload.format : undefined;
  const kind = googleCreativeFormatKind(fmt);
  const imgCandidate =
    (typeof payload.previewUrl === "string" && payload.previewUrl.trim()) ||
    (typeof payload.img === "string" && payload.img.trim()) ||
    "";
  const nonFaviconImage = Boolean(imgCandidate && !/\/s2\/favicons\?/i.test(imgCandidate));
  if (kind === "text") return !nonFaviconImage;
  if (
    kind === "video" ||
    kind === "image" ||
    kind === "shopping" ||
    kind === "app" ||
    kind === "discovery" ||
    kind === "performance_max" ||
    kind === "display"
  )
    return false;
  return !nonFaviconImage;
}

/** Google / YouTube Transparency cards: scrape headline/description when present (`null`s → omit strip). Fallback to title/creativeCopy only if scrape keys omitted (legacy payloads). */
function googleFamilyTransparencyDrawerCopy(payload: Record<string, unknown>): { headline: string; description: string } | null {
  const ty = typeof payload.type === "string" ? payload.type.trim().toLowerCase() : "";
  if (ty !== "google" && ty !== "youtube") return null;

  const hasHeadlineProp = Object.prototype.hasOwnProperty.call(payload, "headline");
  const hasDescriptionProp = Object.prototype.hasOwnProperty.call(payload, "description");

  let headline = "";
  if (hasHeadlineProp) headline = typeof payload.headline === "string" ? payload.headline.trim() : "";
  else if (typeof payload.title === "string") headline = payload.title.trim();

  let description = "";
  if (hasDescriptionProp) description = typeof payload.description === "string" ? payload.description.trim() : "";
  else if (typeof payload.creativeCopy === "string") description = payload.creativeCopy.trim();

  if (!headline && !description) return null;
  return { headline, description };
}

function DrawerTransparencyHeadlineDescriptionStrip({
  headline,
  description,
}: {
  headline: string;
  description: string;
}) {
  const hasHeadline = Boolean(headline.trim());
  const hasDesc = Boolean(description.trim());
  return (
    <div className="px-4 pb-4">
      {hasHeadline ? <p className="text-[15px] font-semibold leading-snug text-slate-900">{headline}</p> : null}
      {hasHeadline && hasDesc ? (
        <div className="h-[1lh] min-h-[1.125rem] shrink-0" aria-hidden />
      ) : null}
      {hasDesc ? (
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

function AdCreativePreview({
  ad,
  competitor,
  context,
}: {
  ad: AdDetailData["ad"];
  competitor: AdDetailData["competitor"];
  context: AdDetailData["context"];
}) {
  const previewLifespanDays = resolveDetailRunningDays(ad.platform, ad.raw_payload, {
    lifespan_days: ad.lifespan_days,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    is_killed: ad.is_killed,
  });
  const lifespanLabel = `${previewLifespanDays}D`;

  const googleMinimalEligible =
    normalizeAdDetailPlatformKey(ad.platform) === "google" &&
    ad.raw_payload &&
    typeof ad.raw_payload === "object" &&
    !Array.isArray(ad.raw_payload) &&
    googleUsesHeadlineOnlyDrawerPreview(ad.raw_payload as Record<string, unknown>);
  const googleMinimalStrip =
    googleMinimalEligible
      ? googleFamilyTransparencyDrawerCopy(ad.raw_payload as Record<string, unknown>)
      : null;

  const transparencyYoutubePl = ad.platform.trim().toLowerCase() === "youtube";
  const youtubeTransparencyPayload =
    transparencyYoutubePl &&
    ad.raw_payload &&
    typeof ad.raw_payload === "object" &&
    !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;
  const youtubeTransparencyCopyStrip = youtubeTransparencyPayload
    ? googleFamilyTransparencyDrawerCopy(youtubeTransparencyPayload)
    : null;

  const metaPl = normalizeAdDetailPlatformKey(ad.platform) === "meta";
  const linkedinPl = ad.platform.toLowerCase() === "linkedin";
  const pinterestPl = ad.platform.toLowerCase() === "pinterest";
  const snapchatPl = ad.platform.toLowerCase() === "snapchat";
  const meta =
    metaPl && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const linkedin =
    linkedinPl && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const pinterest =
    pinterestPl && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const snapchatPayload =
    snapchatPl && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const linkDest =
    meta && typeof meta.linkDestination === "string"
      ? meta.linkDestination
      : meta && typeof meta.destinationUrl === "string"
        ? meta.destinationUrl
        : null;
  const landingFromContext = context.landing_page_url?.trim() || null;
  const linkedinLandingHost =
    linkedin && typeof linkedin.url === "string" && linkedin.url.trim()
      ? hostFromLandingPageUrl(linkedin.url.trim())?.replace(/^www\./i, "")
      : null;
  const pinterestLandingHostRaw =
    pinterest && typeof pinterest.url === "string" ? pinterest.url.trim() : "";
  const pinterestLandingHost =
    pinterestLandingHostRaw &&
    pinterestLandingHostRaw !== "—" &&
    !/\s/.test(pinterestLandingHostRaw) &&
    !/^https?:\/\//i.test(pinterestLandingHostRaw)
      ? pinterestLandingHostRaw.replace(/^www\./i, "")
      : pinterestLandingHostRaw && pinterestLandingHostRaw !== "—"
        ? hostFromLandingPageUrl(
            pinterestLandingHostRaw.includes("://") ? pinterestLandingHostRaw : `https://${pinterestLandingHostRaw}`
          )?.replace(/^www\./i, "")
        : null;

  const snapchatLandingRaw =
    snapchatPayload && typeof snapchatPayload.url === "string" ? snapchatPayload.url.trim() : "";
  const snapchatLandingHost =
    snapchatLandingRaw && snapchatLandingRaw !== "—"
      ? !/\s/.test(snapchatLandingRaw) && !/^https?:\/\//i.test(snapchatLandingRaw)
        ? snapchatLandingRaw.replace(/^www\./i, "")
        : hostFromLandingPageUrl(
            snapchatLandingRaw.includes("://") ? snapchatLandingRaw : `https://${snapchatLandingRaw}`
          )?.replace(/^www\./i, "")
      : null;

  const landingHost =
    (linkDest ? safeExtractHost(linkDest) : null) ??
    (landingFromContext ? safeExtractHost(landingFromContext) : null) ??
    (linkedinLandingHost ?? null) ??
    (pinterestLandingHost ?? null) ??
    (snapchatLandingHost ?? null);

  const headline =
    (meta && typeof meta.linkHeadline === "string" && meta.linkHeadline.trim()) ||
    (meta && typeof meta.headline === "string" && meta.headline.trim()) ||
    null;
  const linkDescription =
    meta && typeof meta.linkDescription === "string" && meta.linkDescription.trim() ? meta.linkDescription : null;

  const metaPrimaryDesc =
    meta && typeof meta.desc === "string" && meta.desc.trim() ? meta.desc.trim() : null;

  let storyTitle: string | null = null;
  let storyBody: string | null = null;

  if (metaPl) {
    storyTitle = headline;
    storyBody = metaPrimaryDesc || ad.ad_text?.trim() || null;
  } else if (linkedinPl) {
    // LinkedIn sponsored updates are a single primary text block — no headline row in the preview.
    storyTitle = null;
    const rawLiDesc =
      linkedin && typeof linkedin.desc === "string" && linkedin.desc.trim() ? linkedin.desc.trim() : "";
    const cleanedLiDesc = rawLiDesc ? cleanLinkedInScraperAdDescription(rawLiDesc).trim() : "";
    const cleanedJoined =
      ad.ad_text?.trim() ? cleanLinkedInScraperAdDescription(ad.ad_text.trim()).trim() : "";
    storyBody = (cleanedLiDesc || cleanedJoined || "") || null;
  } else if (pinterestPl) {
    const pinCaps = pinterest ? pinterestCaptionFieldsFromPayload(pinterest) : { headline: "", desc: "" };
    const rawPinHead = pinCaps.headline.trim() || null;
    storyTitle = rawPinHead && !/^pinterest ad$/i.test(rawPinHead) ? rawPinHead : null;

    const fromPayloadDesc = pinCaps.desc ? cleanPinterestAdPreviewDescription(pinCaps.desc.trim()) : "";

    const rawJoined = ad.ad_text?.trim() ?? "";
    let fromJoinedDesc = "";
    if (rawJoined && rawJoined !== "—") {
      const blocks = rawJoined.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const hNorm = storyTitle ? normalizePreviewWhitespace(storyTitle) : "";
      if (blocks.length >= 2 && hNorm && normalizePreviewWhitespace(blocks[0] ?? "") === hNorm) {
        fromJoinedDesc = cleanPinterestAdPreviewDescription(blocks.slice(1).join("\n\n"));
      }
    }

    let pinBody = (fromPayloadDesc.trim() || fromJoinedDesc.trim() || "").trim();

    if (!pinBody && rawJoined && rawJoined !== "—") {
      const cleanedAll = cleanPinterestAdPreviewDescription(rawJoined);
      const ht = storyTitle?.trim() ?? "";
      if (!ht) {
        pinBody = cleanedAll.trim();
      } else if (normalizePreviewWhitespace(cleanedAll) !== normalizePreviewWhitespace(ht)) {
        if (cleanedAll.startsWith(ht)) {
          const rest = cleanedAll.slice(ht.length).replace(/^[\s\u00a0:：·•\-\u2013\u2014\r\n]+/u, "").trim();
          pinBody = rest;
        } else {
          pinBody = cleanedAll.trim();
        }
      }
    }

    if (storyTitle && pinBody && normalizePreviewWhitespace(pinBody) === normalizePreviewWhitespace(storyTitle)) {
      pinBody = "";
    }

    storyBody = pinBody.trim() || null;
  } else if (snapchatPl) {
    /** Gallery status/`desc` stays in Details; preview shows creative headline only. */
    let snapHead = snapchatPayload ? snapchatPreviewHeadlineFromPayload(snapchatPayload) : "";
    if (!snapHead && ad.ad_text?.trim() && ad.ad_text !== "—") {
      const firstPara = ad.ad_text.trim().split(/\n\n+/)[0]?.trim() ?? "";
      snapHead = snapchatHeadlineStripGalleryStatusGlue(firstPara);
    }
    storyTitle = snapHead && !/^snapchat ad$/i.test(snapHead) ? snapHead : null;
    storyBody = null;
  } else if (transparencyYoutubePl) {
    /** Google Ads Transparency YouTube row — omit assembled title/channel/views `ad_text`; headline/description chip only when payload has strings. */
    storyTitle = null;
    storyBody = null;
  } else if (googleMinimalEligible) {
    /** Google Transparency minimal preview uses payload headline/description strip only — omit joined `ad_text`. */
    storyTitle = null;
    storyBody = null;
  } else {
    storyBody = ad.ad_text?.trim() || null;
  }

  const structuredPl = metaPl || linkedinPl || pinterestPl || snapchatPl;
  const structuredTitleTrimmed = structuredPl ? (storyTitle?.trim() ?? "") : "";
  const structuredBodyTrimmed = structuredPl ? (storyBody?.trim() ?? "") : "";
  const plainBodyTrimmed =
    !structuredPl && !googleMinimalEligible && !transparencyYoutubePl ? (storyBody?.trim() ?? "") : "";
  const spacerBetweenTitleAndBody =
    structuredPl && Boolean(structuredTitleTrimmed) && Boolean(structuredBodyTrimmed);
  /** Meta headline is shown above the creative; omit from the grey footer strip. */
  const metaFooterHeadline = metaPl ? null : headline;

  return (
    <div className="w-full max-w-[520px]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CompetitorLogo
              sources={{
                primary: competitor.logo_url,
                domain: competitor.domain,
              }}
              name={competitor.name}
              size="sm-plus"
              shape="circle"
              className="border-slate-200"
            />
            <div>
              <p className="text-[14px] font-semibold text-slate-900">{competitor.name}</p>
              <p className="text-[11px] text-slate-500">Sponsored</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className={`h-1.5 w-1.5 rounded-full ${ad.is_killed ? "bg-slate-400" : "bg-green-500"}`} />
            {lifespanLabel}
          </div>
        </div>

        {googleMinimalEligible && googleMinimalStrip ? (
          <DrawerTransparencyHeadlineDescriptionStrip {...googleMinimalStrip} />
        ) : transparencyYoutubePl && youtubeTransparencyCopyStrip ? (
          <DrawerTransparencyHeadlineDescriptionStrip {...youtubeTransparencyCopyStrip} />
        ) : structuredPl ? (
          structuredTitleTrimmed || structuredBodyTrimmed ? (
            <div className="px-4 pb-3">
              {structuredTitleTrimmed ? (
                <p className="text-[15px] font-semibold leading-snug text-slate-900">{structuredTitleTrimmed}</p>
              ) : null}
              {spacerBetweenTitleAndBody ? (
                <div className="h-[1lh] min-h-[1.125rem] shrink-0" aria-hidden />
              ) : null}
              {structuredBodyTrimmed ? (
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-900">
                  {structuredBodyTrimmed}
                </p>
              ) : null}
            </div>
          ) : null
        ) : plainBodyTrimmed ? (
          <div className="px-4 pb-3">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-900">{plainBodyTrimmed}</p>
          </div>
        ) : null}

        {!googleMinimalEligible || transparencyYoutubePl ? (
          <div className="relative flex justify-center bg-slate-100">
            <CreativeMediaBlock ad={ad} />
          </div>
        ) : null}

        {!googleMinimalEligible &&
        (landingHost || metaFooterHeadline || linkDescription || ad.cta) ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              {landingHost ? (
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{landingHost}</p>
              ) : null}
              {metaFooterHeadline ? (
                <p className="truncate text-[13px] font-semibold text-slate-900">{metaFooterHeadline}</p>
              ) : null}
              {linkDescription ? (
                <p className="mt-0.5 truncate text-[11px] text-slate-600">{linkDescription}</p>
              ) : null}
            </div>
            {ad.cta ? (
              <span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-4 py-1.5 text-[12px] font-semibold text-slate-900">
                {ad.cta}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <AdPreviewDownloadBar ad={ad} />
    </div>
  );
}

function metaReachFormattedCountCell(n: number | null): string {
  return n === null ? "–" : n.toLocaleString("en-US");
}

function metaRegionCollapsedSummary(regions: MetaLocationAudienceParsedRow[]): string {
  if (!regions.length) return "";
  const head = regions[0].excluded ? `Exclude ${regions[0].name}` : regions[0].name;
  if (regions.length === 1) return head;
  return `${head} · +${regions.length - 1} more`;
}

function locationAudienceTypeBadge(type: string | undefined): string | null {
  const t = type?.trim();
  if (!t) return null;
  if (/^countries$/i.test(t)) return null;
  return t.replace(/_/g, " ");
}

/**
 * Meta region row header from `targets_eu` (“EU targeted” / “Not EU targeted”) or geo summary;
 * expanded panel lists `listed locations` first, then `age_country_gender_reach_breakdown` as readable tables when possible.
 */
function MetaRegionTransparencyDisclosure({
  targetsEu,
  regions,
  reachGroups,
}: {
  targetsEu: boolean | null;
  regions: MetaLocationAudienceParsedRow[];
  reachGroups: MetaReachBreakdownDrawerGroup[];
}) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();

  const euLine =
    targetsEu === true ? "EU targeted"
    : targetsEu === false ? "Not EU targeted"
    : null;
  const geoSummary = regions.length > 0 ? metaRegionCollapsedSummary(regions) : null;

  const reachLineTotal = reachGroups.reduce(
    (n, g) => n + ((g.countRows?.length ?? 0) || g.lines.length),
    0
  );

  const reachSummary =
    reachLineTotal > 0
      ? `Demographic reach (${reachLineTotal} row${reachLineTotal === 1 ? "" : "s"})`
      : null;

  const collapsedPrimary = euLine ?? geoSummary ?? reachSummary;

  if (!collapsedPrimary) return null;

  const panelEmptyExpanded = regions.length === 0 && reachLineTotal === 0;

  const listCn =
    "space-y-1 text-[11px] font-medium leading-snug text-slate-900 [overflow-wrap:anywhere]";
  const scrollPanel = "max-h-[min(360px,_50vh)] overflow-y-auto overscroll-contain";

  return (
    <div className="min-w-0 max-w-[280px]">
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-end gap-1.5 rounded-md py-0.5 pl-1 text-right transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70"
      >
        <span className="text-[12px] font-medium leading-snug text-slate-900 [overflow-wrap:anywhere]">
          {collapsedPrimary}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className={`mt-2 border-t border-slate-100 pt-2 text-left text-slate-900 ${scrollPanel}`}
        >
          {regions.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Listed locations
              </p>
              <ul role="list" className={listCn}>
                {regions.map((r, idx) => {
                  const badge = locationAudienceTypeBadge(r.type);
                  return (
                    <li
                      key={`loc-${r.name}-${String(r.excluded)}-${idx}`}
                      className={
                        r.excluded ? "text-slate-500 line-through decoration-slate-400/80" : "text-slate-800"
                      }
                    >
                      {r.excluded ? `Exclude ${r.name}` : r.name}
                      {badge ? (
                        <span className="ml-1 align-baseline font-normal capitalize text-slate-500">{badge}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {reachGroups.length > 0 ? (
            <div className={regions.length > 0 ? "mt-3 border-t border-slate-50 pt-3" : undefined}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Age / country / gender reach
              </p>
              <div className="space-y-4">
                {reachGroups.map((g, gi) => (
                  <div key={`${g.headline}-${gi}`}>
                    <p className="mb-1 text-[11px] font-semibold text-slate-800">{g.headline}</p>
                    {g.countRows && g.countRows.length > 0 ? (
                      <div className="overflow-x-auto rounded-md border border-slate-100 bg-slate-50/60">
                        <table className="w-full border-collapse text-[11px] tabular-nums">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100/90 text-[10px] text-slate-500">
                              <th scope="col" className="px-2 py-1 text-left font-medium">
                                Age
                              </th>
                              <th scope="col" className="min-w-[3.75rem] px-2 py-1 text-right font-medium">
                                Female
                              </th>
                              <th scope="col" className="min-w-[3.75rem] px-2 py-1 text-right font-medium">
                                Male
                              </th>
                              <th
                                scope="col"
                                className="min-w-[3.25rem] px-2 py-1 text-right font-medium"
                                title="Unknown gender"
                              >
                                Unk.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.countRows.map((row, ri) => (
                              <tr
                                key={`${g.headline}-${row.ageRange}-${ri}`}
                                className={ri % 2 === 1 ? "bg-white/85" : "bg-transparent"}
                              >
                                <td className="px-2 py-1 font-medium text-slate-900">{row.ageRange}</td>
                                <td className="whitespace-nowrap px-2 py-1 text-right text-slate-800">
                                  {metaReachFormattedCountCell(row.female)}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right text-slate-800">
                                  {metaReachFormattedCountCell(row.male)}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right text-slate-800">
                                  {metaReachFormattedCountCell(row.unknown)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : g.lines.length > 0 ? (
                      <ul role="list" className={listCn}>
                        {g.lines.map((line, idx) => (
                          <li key={`reach-${g.headline}-${idx}`} className="text-slate-800">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {panelEmptyExpanded ? (
            <p className="text-[11px] italic text-slate-500">
              No geographic or demographic breakdown rows in scrape data.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Google Transparency `regionStats`: compact “about …” headline with expandable per-country caps. */
function GoogleTransparencyImpressionsDisclosure({
  headline,
  detailRows,
}: {
  headline: string;
  detailRows: { territory: string; valueLabel: string }[];
}) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();

  return (
    <div className="min-w-0 max-w-[280px]">
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-end gap-1.5 rounded-md py-0.5 pl-1 text-right transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70"
      >
        <span className="text-[12px] font-medium leading-snug text-slate-900 [overflow-wrap:anywhere]">
          {headline}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="mt-2 flex justify-end border-t border-slate-100 pt-2 text-right text-slate-900"
        >
          <div className="min-w-0 max-w-full">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">By country</p>
            <ul
              role="list"
              className="inline-grid gap-x-2 gap-y-1 text-[11px] font-medium leading-snug [grid-template-columns:max-content_auto_max-content]"
            >
              {detailRows.map((r, idx) => (
                <li key={`gtr-${r.territory}-${idx}`} className="contents">
                  <span className="min-w-0 text-end [overflow-wrap:anywhere]">{r.territory}</span>
                  <span className="select-none text-slate-400" aria-hidden>
                    ·
                  </span>
                  <span className="min-w-0 text-start tabular-nums [overflow-wrap:anywhere]">{r.valueLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailsTab({ data }: { data: AdDetailData }) {
  const { ad, competitor, context } = data;

  const runningApiSlice = {
    lifespan_days: ad.lifespan_days,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    is_killed: ad.is_killed,
  };

  const runningDays = resolveDetailRunningDays(ad.platform, ad.raw_payload, runningApiSlice);
  const timeRunningLabel = `${runningDays} days`;

  const pl = normalizeAdDetailPlatformKey(ad.platform);

  const adLibrarySourceUrl = resolveAdLibrarySourceUrl(ad.platform, ad.raw_payload);
  const isGoogleFamily = pl === "google" || pl === "youtube";
  const gDetail = isGoogleFamily ? buildGoogleFamilyAdDetailFields(ad.platform, ad.raw_payload) : null;

  const linkedInRaw =
    pl === "linkedin" && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;
  const linkedInLandingRaw =
    linkedInRaw && typeof linkedInRaw.url === "string" ? linkedInRaw.url.trim() : "";
  const detailLandingPageHref =
    context.landing_page_url?.trim() || safeExternalHref(linkedInLandingRaw);

  const landingPageButtonLabel = detailLandingPageHref
    ? landingDetailHostTrailingSlash(detailLandingPageHref)
    : null;

  const canonical = buildCanonicalDetailSlices(pl, ad.raw_payload, gDetail);
  const runStartLabel = formatCanonicalRunStartLabel(canonical);
  const metaPublisherRows = pl === "meta" ? metaPublisherDetailRows(ad.raw_payload) : null;

  const googleTransparencyStats =
    isGoogleFamily &&
    ad.raw_payload &&
    typeof ad.raw_payload === "object" &&
    !Array.isArray(ad.raw_payload)
      ? parseGoogleRegionStatsFromRecord(ad.raw_payload as Record<string, unknown>)
      : [];

  const extraTargetingRows =
    pl === "tiktok"
      ? buildTikTokAdLibraryDetailRows(ad.raw_payload)
      : pl === "linkedin"
        ? buildLinkedInLibraryDetailRows(ad.raw_payload)
        : pl === "pinterest"
          ? buildPinterestLibraryDetailRows(ad.raw_payload)
          : pl === "snapchat"
            ? buildSnapchatLibraryDetailRows(ad.raw_payload)
            : [];

  const statusLabel =
    pl === "meta"
      ? formatMetaDetailStatusLabel({
          isKilled: ad.is_killed,
          firstSeenAt: ad.first_seen_at,
          lastSeenAt: ad.last_seen_at,
          runStartLabel,
          rawPayload: ad.raw_payload,
        })
      : ad.is_killed
        ? `Killed · last seen ${formatDate(ad.last_seen_at)}`
        : `Still running · from ${runStartLabel || formatDate(ad.first_seen_at)}`;

  const tailBeforeActions: { label: string; value: ReactNode }[] = [];

  const textVal = (s: string) => <span className="font-medium text-slate-900">{s}</span>;

  for (const r of extraTargetingRows) {
    tailBeforeActions.push({ label: r.label, value: textVal(r.value) });
  }

  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Brand",
      value: (
        <div className="flex items-center justify-end gap-1.5">
          <CompetitorLogo
            sources={{ primary: competitor.logo_url, domain: competitor.domain }}
            name={competitor.name}
            size="xxs"
            shape="circle"
            className="border-slate-200"
          />
          <span className="font-medium text-slate-900">{competitor.name}</span>
        </div>
      ),
    },
    {
      label: "Status",
      value: (
        <div className="flex items-center justify-end gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${ad.is_killed ? "bg-slate-400" : "bg-green-500"}`} />
          <span className="text-right text-slate-900">{statusLabel}</span>
        </div>
      ),
    },
    ...(runStartLabel ? [{ label: "Run start", value: textVal(runStartLabel) }] : []),
    {
      label: "Time Running",
      value: textVal(timeRunningLabel),
    },
  ];

  const metaTargetsEu = pl === "meta" ? metaTargetsEuExplicit(ad.raw_payload) : null;
  const metaGeoRows = pl === "meta" ? metaLocationAudienceRows(ad.raw_payload) : [];
  const metaReachGroups = pl === "meta" ? metaReachBreakdownDrawerGroups(ad.raw_payload) : [];
  const metaReachLineTotal = metaReachGroups.reduce((n, g) => n + g.lines.length, 0);

  const showMetaRegionRow =
    pl === "meta" &&
    (metaTargetsEu !== null || metaGeoRows.length > 0 || metaReachLineTotal > 0);

  if (showMetaRegionRow) {
    rows.push({
      label: "Region",
      value: (
        <MetaRegionTransparencyDisclosure
          targetsEu={metaTargetsEu}
          regions={metaGeoRows}
          reachGroups={metaReachGroups}
        />
      ),
    });
  } else if (canonical.regionDisplay) {
    rows.push({
      label: "Region",
      value: (
        <span className="max-w-[260px] whitespace-pre-wrap text-right font-medium text-slate-900">
          {canonical.regionDisplay}
        </span>
      ),
    });
  }

  if (pl === "meta") {
    const ageLabel = metaAgeAudienceDetailLabel(ad.raw_payload);
    if (ageLabel) rows.push({ label: "Age range", value: textVal(ageLabel) });

    const genderLabel = metaGenderAudienceDetailLabel(ad.raw_payload);
    if (genderLabel) rows.push({ label: "Gender", value: textVal(genderLabel) });
  }

  if (canonical.impressionsFormatted) {
    const googleTerritoryRows =
      isGoogleFamily && googleTransparencyStats.length > 0
        ? googleTransparencyTerritoryDisclosureRows(googleTransparencyStats)
        : [];
    rows.push({
      label: "Impressions",
      value:
        googleTerritoryRows.length > 0 ? (
          <GoogleTransparencyImpressionsDisclosure
            headline={googleTransparencyImpressionsCollapsedHeadline(googleTransparencyStats)}
            detailRows={googleTerritoryRows}
          />
        ) : (
          <span className="max-w-[260px] whitespace-pre-wrap text-right font-medium leading-snug text-slate-900">
            {canonical.impressionsFormatted}
          </span>
        ),
    });
  }

  rows.push(...tailBeforeActions);

  if (ad.cta?.trim()) {
    rows.push({ label: "CTA", value: textVal(ad.cta.trim()) });
  }

  if (ad.format?.trim()) {
    const snapPayload =
      pl === "snapchat" && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
        ? (ad.raw_payload as Record<string, unknown>)
        : null;
    const scraperFormat =
      typeof snapPayload?.creativeTypeLabel === "string" ? snapPayload.creativeTypeLabel.trim() : "";
    rows.push({
      label: "Format",
      value:
        scraperFormat ? (
          textVal(scraperFormat)
        ) : (
          <span className="capitalize text-slate-900">{ad.format.trim()}</span>
        ),
    });
  }

  rows.push({
    label: "Platforms",
    value:
      metaPublisherRows?.length ? (
        <MetaPublisherPlatformsDetailValue rows={metaPublisherRows} />
      ) : (
        <div className="flex items-center justify-end gap-1.5">
          <ComparisonPlatformIcon platform={drawerComparisonPlatformIconId(ad.platform, ad.raw_payload)} className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="capitalize text-slate-900">{drawerPlatformChipSlug(ad.platform, ad.raw_payload)}</span>
        </div>
      ),
  });

  if (adLibrarySourceUrl) {
    rows.push({
      label: "Ad library",
      value: (
        <a
          href={adLibrarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[220px] items-center justify-end gap-1 text-right text-[12px] font-medium text-blue-600 hover:text-blue-800"
        >
          <span className="min-w-0 truncate">{adLibraryLinkLabel(ad.platform)}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden />
        </a>
      ),
    });
  }

  if (pl !== "snapchat" && detailLandingPageHref && landingPageButtonLabel) {
    rows.push({
      label: "Landing Page",
      value: (
        <a
          href={detailLandingPageHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[200px] items-center justify-end gap-1 truncate font-mono text-[11px] font-medium text-blue-600 hover:text-blue-800"
        >
          {landingPageButtonLabel}
          <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden />
        </a>
      ),
    });
  }

  const metaTargetMarketFooter = pl === "meta" ? metaTargetMarketFooterLine(ad.raw_payload) : null;

  return (
    <div className="p-4">
      {context.is_creative_test_winner && context.creative_test ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-[11px] leading-relaxed text-amber-800">
            <strong>Test winner</strong> — outlived {Math.max(0, context.creative_test.ad_count - 1)} sibling ads
            launched on {formatDate(context.creative_test.launch_date)}.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map(({ label, value }, rowIdx) => (
          <div key={`${label}-${rowIdx}`} className="flex items-start justify-between gap-3 text-[12px]">
            <span className="flex-shrink-0 text-slate-500">{label}</span>
            <div className="min-w-0 text-right">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Coming soon</p>
        <div className="space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>Product Category</span>
            <span>—</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Niche</span>
            <span>—</span>
          </div>
          <div
            className={`flex items-start justify-between gap-2 ${metaTargetMarketFooter ? "" : "text-slate-400"}`}
          >
            <span className={metaTargetMarketFooter ? "text-slate-500" : undefined}>Target Market</span>
            <span
              className={`max-w-[62%] text-right ${metaTargetMarketFooter ? "font-medium text-slate-900 [overflow-wrap:anywhere]" : ""}`}
            >
              {metaTargetMarketFooter ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
