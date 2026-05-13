"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
  /** Wider layout and title tuned for Audience & Copy tab. */
  standaloneMode?: boolean;
  /** Opens the ad detail drawer (UUID). */
  onOpenAd?: (adId: string) => void;
};

export function CopyVaultPanel({
  competitorId,
  competitorLabel,
  standaloneMode = false,
  onOpenAd,
}: Props) {
  const [ads, setAds] = useState<VaultAdRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <ComparisonPanelShell
      title={standaloneMode ? `Copy vault — ${competitorLabel}` : "Copy vault"}
      subtitle={
        standaloneMode
          ? "Long-running creatives — open a card for full detail and AI copy structure"
          : `Long-running creatives from ${competitorLabel} — open a card for full detail and AI copy structure`
      }
      tooltip='Shows up to 10 enriched ads active 30+ days with a known angle. Click a card to open the ad drawer; use the AI Analysis tab and “Extract” for copy structure.'
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ads.map((ad) => {
            const platform = pl(ad.platform);
            return (
              <div
                key={ad.id}
                role={onOpenAd ? "button" : undefined}
                tabIndex={onOpenAd ? 0 : undefined}
                onClick={() => onOpenAd?.(ad.id)}
                onKeyDown={(e) => {
                  if (!onOpenAd) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenAd(ad.id);
                  }
                }}
                className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${
                  onOpenAd ? "cursor-pointer transition-shadow hover:ring-2 hover:ring-slate-200" : ""
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {ad.ad_creative_url ? (
                    <img
                      src={ad.ad_creative_url}
                      alt={ad.ai_extracted_angle ?? "Ad creative"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      {platform ? (
                        <ComparisonPlatformIcon platform={platform} className="h-12 w-12 opacity-30" />
                      ) : (
                        <span className="text-[10px] font-medium capitalize text-slate-400">{ad.platform}</span>
                      )}
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {ad.lifespanDays}d active
                  </div>
                  <div className="absolute left-2 top-2 rounded-md bg-white/90 p-1 backdrop-blur">
                    {platform ? (
                      <ComparisonPlatformIcon platform={platform} className="h-4 w-4" />
                    ) : (
                      <span className="text-[8px] font-semibold capitalize text-slate-600">{ad.platform.slice(0, 3)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {ad.ai_extracted_angle ? (
                    <span className="inline-flex self-start rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                      {ad.ai_extracted_angle}
                    </span>
                  ) : null}
                  <p className="line-clamp-3 flex-1 text-[11px] leading-snug text-slate-600">{ad.ad_text || "—"}</p>
                  {onOpenAd ? (
                    <p className="text-[10px] font-medium text-slate-400">Click to open details · AI Analysis → Extract</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ComparisonPanelShell>
  );
}
