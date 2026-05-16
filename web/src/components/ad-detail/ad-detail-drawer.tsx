"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Share2,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { InstagramMark } from "@/components/icons/instagram-mark";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import type { Json } from "@/lib/supabase/types";
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
import { resolveDetailRunningDays } from "@/lib/ad-detail/detail-time-running";
import {
  buildCanonicalDetailSlices,
  formatCanonicalRunStartLabel,
} from "@/lib/ad-detail/detail-canonical-fields";
import {
  metaBroadAudienceDetailLabel,
  metaEuRegionDetailLabel,
  metaPublisherDetailRows,
  type MetaPublisherDetailRow,
} from "@/lib/ad-detail/meta-ad-detail-fields";
import {
  cleanLinkedInScraperAdDescription,
  cleanPinterestAdPreviewDescription,
  pinterestCaptionFieldsFromPayload,
  snapchatPreviewHeadlineFromPayload,
} from "@/lib/ad-library/normalize";
import { hostFromLandingPageUrl } from "@/lib/landing-pages/normalize-url";

function platformForIcon(p: string): StrategyPlatform {
  const x = p.toLowerCase();
  if (x === "youtube") return "google";
  if (
    x === "meta" ||
    x === "google" ||
    x === "tiktok" ||
    x === "linkedin" ||
    x === "pinterest" ||
    x === "snapchat"
  ) {
    return x;
  }
  return "meta";
}

function MetaPublisherPlatformGlyph({ slug, index }: { slug: string; index: number }) {
  switch (slug) {
    case "FACEBOOK":
      return <FacebookLogo idSuffix={`apd-${index}`} className="h-3.5 w-3.5 shrink-0" />;
    case "INSTAGRAM":
      return <InstagramMark className="h-3.5 w-3.5 shrink-0" />;
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

export type AdDetailDrawerPayload = {
  ok: boolean;
  error?: string;
  ad?: {
    id: string;
    display_label: string;
    platform: string;
    format: string;
    ad_creative_url: string | null;
    ad_text: string;
    cta: string | null;
    first_seen_at: string;
    last_seen_at: string;
    is_killed: boolean;
    lifespan_days: number;
    raw_payload: Json;
  };
  competitor?: {
    id: string;
    name: string;
    domain: string;
    logo_url: string | null;
    brand_context: string | null;
  };
  ai?: {
    angle: string | null;
    funnel_stage: string | null;
    voice_tone: unknown;
    launch_date: string | null;
    enrichment_status: string;
  };
  context?: {
    landing_page_url: string | null;
    landing_page_display: string | null;
    is_creative_test_winner: boolean;
    creative_test?: { launch_date: string; ad_count: number; test_status: string };
    copy_structure?: CopyStructureResult;
  };
};

type AdDetailData = NonNullable<
  Omit<AdDetailDrawerPayload, "ok" | "error"> & {
    ok: true;
    ad: NonNullable<AdDetailDrawerPayload["ad"]>;
    competitor: NonNullable<AdDetailDrawerPayload["competitor"]>;
    ai: NonNullable<AdDetailDrawerPayload["ai"]>;
    context: NonNullable<AdDetailDrawerPayload["context"]>;
  }
>;

export function AdDetailDrawer({
  adId,
  onClose,
  onPrev,
  onNext,
}: {
  adId: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [data, setData] = useState<AdDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [saveInFlight, setSaveInFlight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!adId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab("details");

    void fetch(`/api/ad-detail?adId=${encodeURIComponent(adId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((res: AdDetailDrawerPayload) => {
        if (cancelled) return;
        if (!res.ok || !res.ad || !res.competitor || !res.ai || !res.context) {
          setError(res.error ?? "Failed to load");
          setData(null);
        } else {
          setData({ ok: true, ad: res.ad, competitor: res.competitor, ai: res.ai, context: res.context });
          setError(null);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adId]);

  useEffect(() => {
    if (!data?.ad.id || !data?.competitor.id) {
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
  }, [data?.ad.id, data?.competitor.id]);

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
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [adId, onClose, onPrev, onNext]);

  const handleGenerateStructure = useCallback(async () => {
    if (!adId || generatingStructure) return;
    setGeneratingStructure(true);
    try {
      const res = await fetch("/api/comparison/copy-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adId }),
      });
      const json = (await res.json()) as { ok?: boolean; structure?: CopyStructureResult; error?: string };
      if (json.ok && json.structure) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            context: { ...prev.context, copy_structure: json.structure },
          };
        });
      }
    } finally {
      setGeneratingStructure(false);
    }
  }, [adId, generatingStructure]);

  if (!adId) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[1080px] animate-in border-l border-slate-200 bg-white shadow-2xl slide-in-from-right duration-200">
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
                {data?.ad.display_label ?? "Loading…"}
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
                disabled
                title="Coming soon"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
              >
                <Code2 className="h-3 w-3" />
                Embed
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
              >
                <Share2 className="h-3 w-3" />
                Share
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-1 flex-col overflow-y-auto py-16">
              <RivalLoadingBlock size="2xl" padded className="min-h-[280px]" />
            </div>
          ) : null}

          {error && !loading ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            </div>
          ) : null}

          {data && !loading && !error ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex flex-1 items-start justify-center overflow-y-auto bg-slate-50 p-6 sm:p-8">
                <AdCreativePreview ad={data.ad} competitor={data.competitor} context={data.context} />
              </div>

              <div className="flex w-[min(100%,400px)] flex-shrink-0 flex-col border-l border-slate-200">
                <div className="border-b border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={() => void handleToggleSave()}
                    disabled={!data?.ad.id || saveInFlight}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                      savedRowId
                        ? "border border-sky-200/90 bg-[#DDF1FD] text-[#343434] hover:bg-[#c8e8fc]"
                        : "bg-[#343434] text-white hover:bg-[#1f1f1f]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
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
                    className={`border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "ai"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    AI Analysis
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {activeTab === "details" ? <DetailsTab data={data} /> : null}
                  {activeTab === "ai" ? (
                    <AIAnalysisTab
                      generating={generatingStructure}
                      onGenerateStructure={handleGenerateStructure}
                      data={data}
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

function DetailCreativeVideo({
  src,
  poster,
  vertical,
  platformKey,
}: {
  src: string;
  poster?: string;
  vertical: boolean;
  platformKey: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    if (poster) {
      return (
        <img
          src={poster}
          alt=""
          loading="lazy"
          className={detailCreativeMediaClasses(vertical, false)}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }
    return (
      <div className="flex aspect-square w-full items-center justify-center">
        <ComparisonPlatformIcon platform={platformForIcon(platformKey)} className="h-12 w-12 opacity-30" />
      </div>
    );
  }

  return (
    <div className="relative inline-block max-w-full">
      <video
        controls
        playsInline
        preload="auto"
        poster={poster}
        src={src}
        className={`${detailCreativeMediaClasses(vertical, true)} bg-black`}
        onError={() => setFailed(true)}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 pl-1 shadow-lg"
          aria-hidden
        >
          <div className="h-0 w-0 border-b-[7px] border-b-transparent border-l-[12px] border-l-white border-t-[7px] border-t-transparent" />
        </div>
      </div>
    </div>
  );
}

function CreativeMediaBlock({ ad }: { ad: AdDetailData["ad"] }) {
  const resolved = resolveAdDetailCreativeMedia(ad);
  const vertical = isMostlyVerticalCreativePlatform(ad.platform);

  if (resolved.kind === "empty") {
    return (
      <div className="flex aspect-square w-full items-center justify-center">
        <ComparisonPlatformIcon platform={platformForIcon(ad.platform)} className="h-12 w-12 opacity-30" />
      </div>
    );
  }

  if (resolved.kind === "image") {
    return (
      <img
        src={resolved.src}
        alt=""
        loading="lazy"
        className={detailCreativeMediaClasses(vertical, false)}
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <DetailCreativeVideo
      src={resolved.src}
      poster={resolved.poster}
      vertical={vertical}
      platformKey={ad.platform}
    />
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

  const metaPl = ad.platform.toLowerCase() === "meta";
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
  } else {
    storyBody = ad.ad_text?.trim() || null;
  }

  const structuredPl = metaPl || linkedinPl || pinterestPl || snapchatPl;
  const structuredTitleTrimmed = structuredPl ? (storyTitle?.trim() ?? "") : "";
  const structuredBodyTrimmed = structuredPl ? (storyBody?.trim() ?? "") : "";
  const plainBodyTrimmed = !structuredPl ? (storyBody?.trim() ?? "") : "";
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

        {structuredPl ? (
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

        <div className="relative flex justify-center bg-slate-100">
          <CreativeMediaBlock ad={ad} />
        </div>

        {(landingHost || metaFooterHeadline || linkDescription || ad.cta) && (
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
        )}
      </div>
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

  const pl = ad.platform.toLowerCase();

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

  const statusLabel = ad.is_killed
    ? `Killed · last seen ${formatDate(ad.last_seen_at)}`
    : `Still running · from ${formatDate(ad.first_seen_at)}`;

  const tailBeforeActions: { label: string; value: ReactNode }[] = [];

  const textVal = (s: string) => <span className="font-medium text-slate-900">{s}</span>;

  if ((pl === "google" || pl === "youtube") && gDetail?.targeting?.trim()) {
    tailBeforeActions.push({
      label: "Targeting",
      value: (
        <span className="max-w-[240px] whitespace-pre-wrap text-right font-medium text-slate-900">
          {gDetail.targeting!.trim()}
        </span>
      ),
    });
  }

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

  if (canonical.impressionsFormatted) {
    rows.push({
      label: "Impressions",
      value: textVal(canonical.impressionsFormatted),
    });
  }

  if (canonical.regionDisplay) {
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
    const metaEu = metaEuRegionDetailLabel(ad.raw_payload);
    if (metaEu) rows.push({ label: "Region", value: textVal(metaEu) });
    const metaAud = metaBroadAudienceDetailLabel(ad.raw_payload);
    if (metaAud) rows.push({ label: "Audience", value: textVal(metaAud) });
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
          <ComparisonPlatformIcon platform={platformForIcon(ad.platform)} className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="capitalize text-slate-900">{ad.platform}</span>
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
          <div className="flex items-center justify-between">
            <span>Target Market</span>
            <span>—</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIAnalysisTab({
  data,
  generating,
  onGenerateStructure,
}: {
  data: AdDetailData;
  generating: boolean;
  onGenerateStructure: () => void;
}) {
  const { ai, context } = data;
  const voice =
    ai.voice_tone && typeof ai.voice_tone === "object"
      ? (ai.voice_tone as Record<string, unknown>)
      : null;
  const formal = typeof voice?.formal === "number" ? voice.formal : null;
  const emotional = typeof voice?.emotional === "number" ? voice.emotional : null;

  return (
    <div className="space-y-5 p-4">
      {ai.angle ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Angle</p>
          <p className="text-[13px] leading-relaxed text-slate-900">{ai.angle}</p>
        </div>
      ) : null}

      {ai.funnel_stage ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Funnel Stage</p>
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-800">
            {ai.funnel_stage}
          </span>
        </div>
      ) : null}

      {formal != null && emotional != null ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Voice &amp; Tone</p>
          <div className="grid grid-cols-2 gap-2">
            <VoiceMeter label="Formal" value={formal} />
            <VoiceMeter label="Emotional" value={emotional} />
          </div>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Copy Structure</p>
          {!context.copy_structure && !generating ? (
            <button
              type="button"
              onClick={onGenerateStructure}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Sparkles className="h-3 w-3" />
              Extract
            </button>
          ) : null}
        </div>

        {generating ? <div className="text-[11px] italic text-slate-500">Analyzing structure…</div> : null}

        {context.copy_structure ? (
          <div className="space-y-3 text-[12px]">
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Hook</p>
              <p className="text-slate-900">{context.copy_structure.hook}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Body Framework</p>
              <ul className="space-y-1 text-slate-900">
                {context.copy_structure.body_framework.map((bullet, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">CTA Pattern</p>
              <p className="text-slate-900">{context.copy_structure.cta_pattern}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Emotional Register</p>
              <p className="text-slate-900">{context.copy_structure.emotional_register}</p>
            </div>
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                Adapt for your brand
              </p>
              <p className="text-[12px] leading-relaxed text-blue-900">{context.copy_structure.adapt_for_your_brand}</p>
            </div>
          </div>
        ) : null}

        {!context.copy_structure && !generating ? (
          <p className="text-[11px] italic text-slate-400">
            Click <strong>Extract</strong> to generate hook, body framework, CTA pattern, and adaptation suggestion.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VoiceMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <p className="mb-1 text-[10px] text-slate-500">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-slate-700">{value.toFixed(2)}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
