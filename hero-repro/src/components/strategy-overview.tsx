"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Calendar,
  Filter,
  LayoutGrid,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { coerceAdsLibraryResponse } from "@/lib/ad-library/api-types";
import { hashNormalizedAds } from "@/lib/ads-hash";
import { normalizeAdsForStrategy } from "@/lib/normalize-ads-for-strategy";
import type { InsightType, StrategyCard, StrategyOverviewResponse } from "@/lib/strategy-overview-types";

type Props = {
  adLib: AdsLibraryResponse | null;
  adLibLoading: boolean;
  brand: { name: string; domain: string };
};

const TYPE_STYLES: Record<
  InsightType,
  { border: string; iconBg: string; Icon: typeof Filter }
> = {
  funnel: { border: "#6366f1", iconBg: "rgba(99, 102, 241, 0.1)", Icon: Filter },
  platform_role: { border: "#0ea5e9", iconBg: "rgba(14, 165, 233, 0.1)", Icon: LayoutGrid },
  creative: { border: "#a855f7", iconBg: "rgba(168, 85, 247, 0.1)", Icon: Sparkles },
  offer: { border: "#22c55e", iconBg: "rgba(34, 197, 94, 0.1)", Icon: Tag },
  messaging: { border: "#f59e0b", iconBg: "rgba(245, 158, 11, 0.1)", Icon: MessageSquare },
  seasonality: { border: "#f97316", iconBg: "rgba(249, 115, 22, 0.1)", Icon: Calendar },
  gap: { border: "#ef4444", iconBg: "rgba(239, 68, 68, 0.1)", Icon: Zap },
};

function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = t.match(/^.{1,400}?[.!?](?:\s|$)/);
  if (m) return m[0].trim();
  return t.length > 200 ? `${t.slice(0, 197)}…` : t;
}

export function StrategyOverview({ adLib, adLibLoading, brand }: Props) {
  const [cards, setCards] = useState<StrategyCard[]>([]);
  const [snapshot, setSnapshot] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const lastAdsHashRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const cardsRef = useRef<StrategyCard[]>([]);
  cardsRef.current = cards;

  const normalized = useMemo(
    () => normalizeAdsForStrategy(coerceAdsLibraryResponse(adLib)),
    [adLib]
  );
  const normalizedJson = useMemo(() => JSON.stringify(normalized), [normalized]);
  const hasEnoughAds = normalized.length >= 3;

  const runAnalysis = useCallback(
    async (opts?: { force?: boolean }) => {
      if (normalized.length < 3) return;
      const adsHash = hashNormalizedAds(normalized);
      const force = opts?.force === true;
      if (!force && lastAdsHashRef.current === adsHash && cardsRef.current.length > 0) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsAnalyzing(true);
      setError(null);
      if (force) setIsCached(false);
      try {
        const res = await fetch("/api/strategy-overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitorName: brand.name,
            competitorDomain: brand.domain,
            ads: normalized,
            adsHash,
            force,
          }),
        });
        const json = (await res.json()) as StrategyOverviewResponse;
        if (!json.ok) {
          setError(json.error);
          setCards([]);
          setSnapshot("");
          setIsCached(false);
          lastAdsHashRef.current = null;
          return;
        }
        lastAdsHashRef.current = adsHash;
        setIsCached(json.cached === true);
        setCards(json.cards);
        const funnel = json.cards.find((c) => c.type === "funnel");
        let snap = funnel ? firstSentence(funnel.body) : firstSentence(json.cards[0]?.body ?? "");
        if (!snap.trim() && json.cards[0]?.title) snap = json.cards[0].title.trim();
        setSnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        setCards([]);
        setSnapshot("");
        setIsCached(false);
        lastAdsHashRef.current = null;
      } finally {
        setIsAnalyzing(false);
        inFlightRef.current = false;
      }
    },
    [brand.domain, brand.name, normalized]
  );

  useEffect(() => {
    if (adLibLoading || !hasEnoughAds) {
      if (!hasEnoughAds) {
        setCards([]);
        setSnapshot("");
        setError(null);
        setIsCached(false);
        lastAdsHashRef.current = null;
      }
      return;
    }
    void runAnalysis({ force: false });
  }, [adLibLoading, hasEnoughAds, normalizedJson, runAnalysis]);

  const showSkeleton = (adLibLoading || isAnalyzing) && hasEnoughAds;
  const showEmpty = !adLibLoading && !isAnalyzing && !hasEnoughAds;
  const showErrorOnly = !adLibLoading && !isAnalyzing && hasEnoughAds && error && cards.length === 0;
  const showGrid = cards.length > 0 && !isAnalyzing && !adLibLoading;
  const snapshotText = useMemo(() => {
    const s = snapshot.trim();
    if (s) return s;
    const c0 = cards[0];
    if (!c0) return "";
    const body = firstSentence(c0.body);
    return body || c0.title;
  }, [snapshot, cards]);

  return (
    <div className="max-w-[860px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-8 animate-in fade-in duration-200">
      <div className="mb-6">
        <h2 className="text-[18px] font-semibold text-[#343434]">Strategy Overview</h2>
        <p className="text-[14px] text-[#71717a] mt-0.5">
          How <span className="font-medium text-[#3f3f46]">{brand.name}</span> positions their marketing
        </p>
      </div>

      {showEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f4f5] text-[#a1a1aa]">
            <BarChart3 className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-[15px] font-semibold text-[#3f3f46]">Not enough ad data to analyze</p>
          <p className="mt-1.5 max-w-sm text-[13px] text-[#71717a] leading-relaxed">
            Run a scrape first to generate strategy insights.
          </p>
        </div>
      ) : null}

      {showErrorOnly ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900">
          {error}
        </div>
      ) : null}

      {showSkeleton ? (
        <div>
          <div className="rival-strategy-shimmer mb-6 h-16 w-full rounded-2xl bg-[#f4f4f5]" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rival-strategy-shimmer h-36 rounded-2xl bg-[#f4f4f5]" />
            ))}
          </div>
        </div>
      ) : null}

      {showGrid && snapshotText ? (
        <div className="bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] border border-[#e0e7ff] rounded-2xl p-5 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6366f1] mb-1 flex flex-wrap items-center gap-2">
            <span>Strategy snapshot</span>
            {isCached ? (
              <span className="text-[11px] text-[#6366f1] bg-[#eef2ff] rounded-full px-2 py-0.5 font-medium normal-case tracking-normal">
                Cached
              </span>
            ) : null}
          </p>
          <p className="text-[15px] font-medium text-[#1a1a2e] leading-relaxed">{snapshotText}</p>
        </div>
      ) : null}

      {showGrid ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {cards.map((card) => {
              const style = TYPE_STYLES[card.type];
              const Icon = style.Icon;
              return (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl border border-[#f0f0f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-l-[3px]"
                  style={{ borderLeftColor: style.border }}
                >
                  <div
                    className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: style.iconBg }}
                  >
                    <Icon className="h-3.5 w-3.5 text-[#1a1a2e]" aria-hidden />
                  </div>
                  <h3 className="text-[13px] font-semibold text-[#1a1a2e] mb-2">{card.title}</h3>
                  <p className="text-[13px] text-[#52525b] leading-relaxed">{card.body}</p>
                  {card.platforms.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {card.platforms.map((p) => (
                        <span
                          key={`${card.id}-${p}`}
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#f4f4f5] text-[#52525b]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => void runAnalysis({ force: true })}
              className="border border-[#e4e4e7] rounded-full px-4 py-2 text-[13px] text-[#71717a] hover:text-[#3f3f46] hover:border-[#d4d4d8] flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              )}
              Regenerate analysis
            </button>
          </div>
        </>
      ) : null}

      {hasEnoughAds && error && cards.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[13px] text-amber-950">
          {error}
        </div>
      ) : null}
    </div>
  );
}
