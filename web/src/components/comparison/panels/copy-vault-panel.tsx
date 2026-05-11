"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import { ComparisonPanelShell, ComparisonInsufficient } from "@/components/comparison/panel-shell";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type VaultAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
  ad_creative_url: string | null;
  lifespanDays: number;
};

type Props = {
  competitorId: string;
  competitorLabel: string;
};

export function CopyVaultPanel({ competitorId, competitorLabel }: Props) {
  const [ads, setAds] = useState<VaultAdRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAd, setModalAd] = useState<VaultAdRow | null>(null);
  const [structure, setStructure] = useState<CopyStructureResult | null>(null);
  const [structLoading, setStructLoading] = useState(false);
  const [structError, setStructError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/comparison/vault-ads?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; ads?: VaultAdRow[]; error?: string };
      if (!res.ok || !json.ok) {
        setAds([]);
        setError(json.error ?? "Failed to load ads");
        return;
      }
      setAds(json.ads ?? []);
    } catch {
      setAds([]);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    if (!competitorId) return;
    void load();
  }, [competitorId, load]);

  const openStructure = async (ad: VaultAdRow) => {
    setModalAd(ad);
    setStructure(null);
    setStructError(null);
    setStructLoading(true);
    try {
      const res = await fetch("/api/comparison/copy-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adId: ad.id }),
      });
      const json = (await res.json()) as { ok?: boolean; structure?: CopyStructureResult; error?: string };
      if (!res.ok || !json.ok || !json.structure) {
        setStructError(json.error ?? "Failed to extract structure");
        return;
      }
      setStructure(json.structure);
    } catch {
      setStructError("Network error");
    } finally {
      setStructLoading(false);
    }
  };

  const pl = (p: string): StrategyPlatform | null => {
    const x = p.toLowerCase();
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
    return null;
  };

  return (
    <>
      <ComparisonPanelShell
        title="Copy vault"
        subtitle={`Long-running creatives from ${competitorLabel} — extract reusable structure with Haiku`}
        tooltip="Shows up to 10 enriched ads active 30+ days with a known angle. “Copy structure” runs a cached Haiku pass per ad."
      >
        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading competitor ads…
          </div>
        ) : error ? (
          <p className="text-[13px] text-red-700">{error}</p>
        ) : !ads || ads.length === 0 ? (
          <ComparisonInsufficient message="No qualifying ads yet (need 30+ day lifespan, enriched, with an angle)." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ads.map((ad) => {
              const platform = pl(ad.platform);
              return (
                <div key={ad.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {ad.ad_creative_url ? (
                      <img
                        src={ad.ad_creative_url}
                        alt={ad.ai_extracted_angle ?? "Ad creative"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        {platform ? (
                          <ComparisonPlatformIcon platform={platform} className="h-12 w-12 opacity-30" />
                        ) : (
                          <span className="text-[10px] font-medium capitalize text-slate-400">{ad.platform}</span>
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {ad.lifespanDays}d active
                    </div>
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-white/90 backdrop-blur">
                      {platform ? (
                        <ComparisonPlatformIcon platform={platform} className="h-4 w-4" />
                      ) : (
                        <span className="text-[8px] font-semibold capitalize text-slate-600">{ad.platform.slice(0, 3)}</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex flex-col gap-2 flex-1">
                    {ad.ai_extracted_angle ? (
                      <span className="inline-flex self-start px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-100">
                        {ad.ai_extracted_angle}
                      </span>
                    ) : null}
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-snug flex-1">{ad.ad_text || "—"}</p>
                    <button
                      type="button"
                      onClick={() => void openStructure(ad)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Copy structure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ComparisonPanelShell>

      {modalAd ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-vault-modal-title"
          onClick={() => setModalAd(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="copy-vault-modal-title" className="text-[15px] font-semibold text-slate-900 mb-2">
              Copy structure
            </h2>
            <p className="text-[11px] text-slate-500 mb-4 line-clamp-3">{modalAd.ad_text}</p>
            {structLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-500 py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing with Haiku…
              </div>
            ) : structError ? (
              <p className="text-[13px] text-red-700">{structError}</p>
            ) : structure ? (
              <div className="space-y-3 text-[13px] text-slate-700">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Hook</p>
                  <p>{structure.hook}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Body framework</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {structure.body_framework.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">CTA pattern</p>
                  <p>{structure.cta_pattern}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Emotional register</p>
                  <p>{structure.emotional_register}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Adapt for your brand</p>
                  <p className="leading-relaxed whitespace-pre-wrap">{structure.adapt_for_your_brand}</p>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-5 w-full rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setModalAd(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
