"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
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
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import type { Json } from "@/lib/supabase/types";

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
        if (json.ok) setSavedRowId(null);
      } else {
        const res = await fetch("/api/saved-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ scrapedAdId: data.ad.id }),
        });
        const json = (await res.json()) as { ok?: boolean; savedAd?: { id: string } };
        if (json.ok && json.savedAd?.id) setSavedRowId(json.savedAd.id);
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

  return (
    <div className="fixed inset-0 z-[130] flex justify-end" role="dialog" aria-modal="true">
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
            <div className="flex flex-1 items-center justify-center">
              <div className="text-[13px] text-slate-500">Loading ad…</div>
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
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "ai"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    AI Analysis
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                      NEW
                    </span>
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
    </div>
  );
}

function safeExtractHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
  const lifespanLabel =
    ad.lifespan_days === 0 && ad.platform === "google" ? "Lifespan N/A" : `${ad.lifespan_days}D`;
  const creative = ad.ad_creative_url?.trim() ?? "";
  const isVideo = /\.(mp4|webm)(\?|$)/i.test(creative) || ad.format === "video";

  const meta =
    ad.platform === "meta" && ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const linkDest =
    meta && typeof meta.linkDestination === "string"
      ? meta.linkDestination
      : meta && typeof meta.destinationUrl === "string"
        ? meta.destinationUrl
        : null;
  const landingFromContext = context.landing_page_url?.trim() || null;
  const landingHost =
    (linkDest ? safeExtractHost(linkDest) : null) ??
    (landingFromContext ? safeExtractHost(landingFromContext) : null);

  const headline =
    (meta && typeof meta.linkHeadline === "string" && meta.linkHeadline.trim()) ||
    (meta && typeof meta.headline === "string" && meta.headline.trim()) ||
    null;
  const linkDescription =
    meta && typeof meta.linkDescription === "string" && meta.linkDescription.trim() ? meta.linkDescription : null;

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

        {ad.ad_text?.trim() ? (
          <div className="px-4 pb-3">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-900">{ad.ad_text}</p>
          </div>
        ) : null}

        <div className="relative bg-slate-100">
          {creative && isVideo ? (
            <video controls playsInline preload="metadata" className="mx-auto block max-h-[600px] w-full object-contain" src={creative} />
          ) : creative ? (
            <img
              src={creative}
              alt=""
              loading="lazy"
              className="mx-auto block max-h-[600px] w-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center">
              <ComparisonPlatformIcon platform={platformForIcon(ad.platform)} className="h-12 w-12 opacity-30" />
            </div>
          )}
        </div>

        {(landingHost || headline || linkDescription || ad.cta) && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              {landingHost ? (
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{landingHost}</p>
              ) : null}
              {headline ? (
                <p className="truncate text-[13px] font-semibold text-slate-900">{headline}</p>
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

  const statusLabel = ad.is_killed
    ? `Killed · last seen ${formatDate(ad.last_seen_at)}`
    : `Still running · from ${formatDate(ad.first_seen_at)}`;

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
    {
      label: "Time Running",
      value: (
        <span className="font-medium text-slate-900">
          {ad.lifespan_days === 0 && ad.platform === "google" ? "N/A (Google)" : `${ad.lifespan_days} days`}
        </span>
      ),
    },
    {
      label: "CTA",
      value: ad.cta ? <span className="text-slate-900">{ad.cta}</span> : <span className="text-slate-400">—</span>,
    },
    {
      label: "Format",
      value: <span className="capitalize text-slate-900">{ad.format || "—"}</span>,
    },
    {
      label: "Platforms",
      value: (
        <div className="flex items-center justify-end gap-1.5">
          <ComparisonPlatformIcon platform={platformForIcon(ad.platform)} className="h-3.5 w-3.5" />
          <span className="capitalize text-slate-900">{ad.platform}</span>
        </div>
      ),
    },
    {
      label: "Landing Page",
      value:
        context.landing_page_url && context.landing_page_display ? (
          <a
            href={context.landing_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-[200px] items-center gap-1 truncate font-mono text-[11px] text-blue-600 hover:text-blue-800"
          >
            {context.landing_page_display}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

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
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-3 text-[12px]">
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
