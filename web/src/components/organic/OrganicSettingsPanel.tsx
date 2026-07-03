"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ORGANIC_PLATFORM_LABELS,
  ORGANIC_PLATFORM_PLACEHOLDERS,
} from "@/lib/organic-content/constants";
import { ORGANIC_PLATFORMS, type OrganicPlatform, type OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

type OrganicSettingsPanelProps = {
  competitorId: string;
  initialSocials: OrganicSocials;
  onSaved?: (socials: OrganicSocials) => void;
  onScrapeComplete?: () => void;
};

export function OrganicSettingsPanel({
  competitorId,
  initialSocials,
  onSaved,
  onScrapeComplete,
}: OrganicSettingsPanelProps) {
  const [socials, setSocials] = useState<OrganicSocials>(initialSocials);
  const [savedSocials, setSavedSocials] = useState<OrganicSocials>(initialSocials);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [rescrapingPlatform, setRescrapingPlatform] = useState<OrganicPlatform | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSocials(initialSocials);
    setSavedSocials(initialSocials);
  }, [initialSocials]);

  const handleChange = (platform: OrganicPlatform, value: string) => {
    setSocials((prev) => ({ ...prev, [platform]: value }));
  };

  const handleTestRescrape = async (platform: OrganicPlatform) => {
    if (!savedSocials[platform]?.trim()) {
      setError(`Save a ${ORGANIC_PLATFORM_LABELS[platform]} handle first.`);
      return;
    }

    setRescrapingPlatform(platform);
    setError(null);
    setMessage(null);
    const label = ORGANIC_PLATFORM_LABELS[platform];
    setMessage(`Rescraping ${label}…`);

    try {
      const scrapeRes = await fetch(`/api/competitor/${competitorId}/organic/scrape-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: [platform],
          newPlatforms: [platform],
        }),
      });
      const scrapeData = (await scrapeRes.json()) as {
        ok?: boolean;
        postsUpserted?: number;
        platformErrors?: Record<string, string>;
        platformScrapeMeta?: {
          youtube?: {
            apifyRows: number;
            keptRows: number;
            mode: string;
            apifyRuns?: number;
            shortsRows?: number;
            videoRows?: number;
          };
        };
        error?: string;
      };

      if (!scrapeRes.ok || !scrapeData.ok) {
        const platformError = scrapeData.platformErrors?.[platform];
        throw new Error(platformError ?? scrapeData.error ?? "Scrape failed");
      }

      const upserted = scrapeData.postsUpserted ?? 0;
      const ytMeta = scrapeData.platformScrapeMeta?.youtube;
      if (upserted === 0) {
        const platformError = scrapeData.platformErrors?.[platform];
        setMessage(
          platformError
            ? `${label} scrape finished with 0 posts: ${platformError}`
            : platform === "youtube"
              ? `${label} scrape finished with 0 posts. Check the handle (@adidas) and Apify logs for both actors.`
              : `${label} scrape finished with 0 posts (check handle or Apify logs).`,
        );
      } else if (platform === "youtube" && ytMeta?.mode === "mixed") {
        setMessage(
          `${label} rescrape complete — ${upserted} posts (${ytMeta.videoRows ?? 0} videos, ${ytMeta.shortsRows ?? 0} Shorts). Check Feed.`,
        );
      } else if (platform === "youtube" && ytMeta && ytMeta.apifyRows > ytMeta.keptRows) {
        const runsNote =
          ytMeta.apifyRuns && ytMeta.apifyRuns > 1 ? ` (${ytMeta.apifyRuns} Apify runs)` : "";
        setMessage(
          `${label}${runsNote} — Apify found ${ytMeta.apifyRows} videos about this brand, saved ${upserted} from the official channel (${ytMeta.keptRows} matched; others were different creators).`,
        );
      } else {
        setMessage(`${label} rescrape complete — ${upserted} posts upserted. Check Feed.`);
      }
      onScrapeComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
      setMessage(null);
    } finally {
      setRescrapingPlatform(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/competitor/${competitorId}/organic/socials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        socials?: OrganicSocials;
        triggerScrape?: boolean;
        newPlatforms?: string[];
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save");
      }
      const next = data.socials ?? socials;
      setSavedSocials(next);
      setSocials(next);
      onSaved?.(next);
      setMessage("Social accounts saved.");

      if (data.triggerScrape) {
        setScraping(true);
        const platformLabels = (data.newPlatforms ?? [])
          .map((p) => ORGANIC_PLATFORM_LABELS[p as OrganicPlatform] ?? p)
          .join(", ");
        setMessage(
          platformLabels
            ? `Social accounts saved. Scraping ${platformLabels}…`
            : "Social accounts saved. Starting scrape…",
        );
        const scrapeRes = await fetch(`/api/competitor/${competitorId}/organic/scrape-now`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platforms: data.newPlatforms ?? [],
            newPlatforms: data.newPlatforms ?? [],
          }),
        });
        const scrapeData = (await scrapeRes.json()) as {
          ok?: boolean;
          postsUpserted?: number;
          error?: string;
        };
        if (scrapeRes.ok && scrapeData.ok) {
          setMessage(`Scrape complete — ${scrapeData.postsUpserted ?? 0} posts collected.`);
          onScrapeComplete?.();
        } else {
          setMessage("Saved. Scrape started — check Feed in a few minutes.");
        }
        setScraping(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-[15px] font-semibold text-slate-900">Social Accounts</h3>
        <p className="mt-1 text-[13px] text-slate-600">
          Add your competitor&apos;s social handles to track organic posts. Scrapes run every 3 days.
        </p>

        <div className="mt-5 space-y-4">
          {ORGANIC_PLATFORMS.map((platform) => {
            const value = socials[platform] ?? "";
            const isActive = Boolean(savedSocials[platform]?.trim());
            return (
              <label key={platform} className="block">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-800">
                    {ORGANIC_PLATFORM_LABELS[platform]}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Tracking active
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(platform, e.target.value)}
                  placeholder={ORGANIC_PLATFORM_PLACEHOLDERS[platform]}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || scraping || rescrapingPlatform != null}
            className={cn(
              "rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity",
              (saving || scraping || rescrapingPlatform != null) && "opacity-60",
            )}
          >
            {saving || scraping ? "Saving…" : "Save social accounts"}
          </button>
          {message ? <p className="text-[13px] text-emerald-700">{message}</p> : null}
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-5">
        <h3 className="text-[14px] font-semibold text-slate-900">Testing</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Re-run Apify for a single platform without changing saved handles. Uses a full scrape (ignores
          incremental baseline).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ORGANIC_PLATFORMS.map((platform) => {
            const hasHandle = Boolean(savedSocials[platform]?.trim());
            const busy = rescrapingPlatform === platform;
            const label = ORGANIC_PLATFORM_LABELS[platform];
            return (
              <button
                key={platform}
                type="button"
                onClick={() => void handleTestRescrape(platform)}
                disabled={!hasHandle || rescrapingPlatform != null || saving || scraping}
                title={hasHandle ? undefined : `Save a ${label} handle first`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 transition-opacity hover:bg-slate-50",
                  (!hasHandle || rescrapingPlatform != null || saving || scraping) && "cursor-not-allowed opacity-50",
                )}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", busy && "motion-safe:animate-spin")} />
                {busy ? `Rescraping ${label}…` : `Rescrape ${label} only`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
