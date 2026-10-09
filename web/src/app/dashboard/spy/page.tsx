"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { availableChannelIds, ChannelPickerModal, type ChannelId } from "@/components/channel-picker-modal";
import { useEnabledAdPlatforms } from "@/hooks/use-enabled-ad-platforms";
import { RivalLogoImg } from "@/components/rival-logo";
import { RecommendedCompetitors } from "@/components/competitor-recommendations/recommended-competitors";
import { registrableDomain } from "@/lib/ad-account-discovery/score";
import { saveSearchToAccount } from "@/lib/account/client";
import { isPlausiblePublicHostname, normalizedWorkspaceHost } from "@/lib/onboarding/host";
import { useActiveBrand } from "@/app/dashboard/brand-context";
import { competitorWatchLimitReachedMessage } from "@/lib/billing/competitor-limit-copy";
import {
  readClientGlobalCompetitorsUsed,
  readClientMaxWatchedCompetitors,
  syncClientMaxWatchedCompetitorsFromUsage,
} from "@/lib/billing/client-plan-cap";
import {
  countWatchedSidebarCompetitors,
  loadSidebarCompetitors,
  normalizeCompetitorSlug,
  wouldExceedWatchedCompetitorCap,
} from "@/lib/sidebar-competitors";

/** The website typed in the field, as a bare host, or null when it isn't a website. */
function competitorHost(raw: string): string | null {
  const host = normalizedWorkspaceHost(raw.trim().toLowerCase());
  return isPlausiblePublicHostname(host) ? host : null;
}

export default function SpyOnCompetitorPage() {
  const [site, setSite] = useState("");
  /** The website the channel picker is open for. */
  const [pickerHost, setPickerHost] = useState<string | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);
  const { enabled: enabledAdPlatforms } = useEnabledAdPlatforms();
  const [competitorLimitError, setCompetitorLimitError] = useState<string | null>(null);
  const router = useRouter();
  const activeBrand = useActiveBrand();

  useEffect(() => {
    void syncClientMaxWatchedCompetitorsFromUsage();
  }, []);

  /**
   * Sites already in the sidebar, so recommendations show "Tracking" instead of "Track". Read during
   * render: the cards only appear after a client fetch, so the server's empty set is never shown.
   */
  const trackedDomains = useMemo<ReadonlySet<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return new Set(
      loadSidebarCompetitors().flatMap((c) => {
        const host = normalizeCompetitorSlug(c.brand?.domain || c.slug);
        return host.includes(".") ? [registrableDomain(host)] : [];
      }),
    );
  }, []);

  const reportCompetitorCapReached = () => {
    const usedGlobal = readClientGlobalCompetitorsUsed();
    const watchedCount =
      usedGlobal ?? countWatchedSidebarCompetitors(activeBrand.domain);
    setCompetitorLimitError(competitorWatchLimitReachedMessage(watchedCount));
  };

  const wouldExceedCompetitorCap = (query: string): boolean =>
    wouldExceedWatchedCompetitorCap(
      query,
      readClientMaxWatchedCompetitors(),
      activeBrand.domain,
    );

  /** Ask which platforms to search for this site (the cap is checked first). */
  const openPicker = (host: string) => {
    if (wouldExceedCompetitorCap(host)) {
      reportCompetitorCapReached();
      return;
    }
    setCompetitorLimitError(null);
    setPickerHost(host);
  };

  const handleSpy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!site.trim()) return;
    const host = competitorHost(site);
    if (!host) {
      setSiteError("Enter your competitor's website, like competitor.com");
      return;
    }
    setSiteError(null);
    openPicker(host);
  };

  const handleChannelsConfirm = (selectedChannels: ChannelId[]) => {
    const host = pickerHost;
    if (!host) return;
    if (wouldExceedCompetitorCap(host)) {
      reportCompetitorCapReached();
      setPickerHost(null);
      return;
    }
    setCompetitorLimitError(null);
    const termPayload = [{ value: host, kind: "url" as const }];
    const params = new URLSearchParams({ q: host, terms: JSON.stringify(termPayload) });
    if (selectedChannels.length < availableChannelIds(enabledAdPlatforms).length) {
      params.set("channels", selectedChannels.join(","));
    }
    void saveSearchToAccount({ query: host, terms: termPayload, channels: selectedChannels });
    posthog.capture("competitor_search_submitted", {
      query: host,
      channel_count: selectedChannels.length,
      channels: selectedChannels,
      term_count: 1,
    });
    setSite("");
    router.push(`/dashboard/searching?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center-safe px-6 py-10 sm:px-10 sm:py-14">
      <div className="flex w-full max-w-2xl flex-col items-center">
        <h1 className="mb-8 flex justify-center filter drop-shadow-sm sm:mb-10">
          <RivalLogoImg className="h-12 w-auto max-w-[min(320px,88vw)] object-contain sm:h-16" />
        </h1>

        <div className="relative flex w-full flex-col items-center text-center">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.15em] text-[#808080] sm:mb-3 sm:text-[15px]">
            Find your competitor
          </h2>
          {competitorLimitError ? (
            <p className="mb-4 max-w-md text-[14px] font-medium leading-snug text-[#b42318]">
              {competitorLimitError}
            </p>
          ) : null}

          <form
            onSubmit={handleSpy}
            noValidate
            className="mt-3 flex min-h-[72px] w-full items-center gap-2 rounded-[28px] border border-white/60 bg-white/40 p-2.5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ease-out motion-safe:hover:bg-white/50 motion-safe:hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] focus-within:border-[#DDF1FD]/90 focus-within:bg-white/55 focus-within:shadow-[0_10px_36px_0_rgba(31,38,135,0.09)] motion-safe:focus-within:ring-2 motion-safe:focus-within:ring-[#DDF1FD]/90 motion-reduce:focus-within:outline motion-reduce:focus-within:outline-2 motion-reduce:focus-within:outline-offset-2 motion-reduce:focus-within:outline-[#DDF1FD] sm:max-w-[640px] sm:p-3"
          >
            <div className="pl-2 sm:pl-3 text-gray-500 shrink-0">
              <Globe size={20} strokeWidth={2.25} aria-hidden />
            </div>
            <input
              value={site}
              onChange={(e) => {
                setSite(e.target.value);
                if (siteError) setSiteError(null);
              }}
              placeholder="competitor.com"
              aria-label="Competitor's website"
              aria-invalid={siteError ? true : undefined}
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent border-none text-[#343434] py-2 px-1 text-base sm:text-[17px] focus:outline-none placeholder:text-gray-400 font-medium tracking-wide"
            />
            <button
              type="submit"
              className="flex h-[44px] w-[80px] shrink-0 cursor-pointer items-center justify-center rounded-[20px] bg-[#343434] text-sm font-semibold tracking-wide text-white shadow-lg transition-[background-color,transform] duration-200 ease-out hover:bg-[#2a2a2a] motion-safe:active:scale-[0.98] sm:h-[48px] sm:w-[100px] sm:text-[16px]"
            >
              Spy
            </button>
          </form>
          {siteError ? (
            <p role="alert" className="mt-3 text-[14px] font-medium text-[#b42318]">
              {siteError}
            </p>
          ) : null}
        </div>
      </div>

      {activeBrand.domain ? (
        <div className="mt-12 w-full max-w-4xl">
          <RecommendedCompetitors brandId={activeBrand.id} trackedDomains={trackedDomains} onTrack={openPicker} />
        </div>
      ) : null}

      <ChannelPickerModal
        isOpen={pickerHost != null}
        onClose={() => setPickerHost(null)}
        onConfirm={handleChannelsConfirm}
        competitorQuery={pickerHost ?? ""}
      />
    </div>
  );
}
