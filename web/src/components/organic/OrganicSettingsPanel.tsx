"use client";

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
};

export function OrganicSettingsPanel({
  competitorId,
  initialSocials,
  onSaved,
}: OrganicSettingsPanelProps) {
  const [socials, setSocials] = useState<OrganicSocials>(initialSocials);
  const [savedSocials, setSavedSocials] = useState<OrganicSocials>(initialSocials);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSocials(initialSocials);
    setSavedSocials(initialSocials);
  }, [initialSocials]);

  const handleChange = (platform: OrganicPlatform, value: string) => {
    setSocials((prev) => ({ ...prev, [platform]: value }));
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
            disabled={saving || scraping}
            className={cn(
              "rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity",
              (saving || scraping) && "opacity-60",
            )}
          >
            {saving || scraping ? "Saving…" : "Save social accounts"}
          </button>
          {message ? <p className="text-[13px] text-emerald-700">{message}</p> : null}
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
