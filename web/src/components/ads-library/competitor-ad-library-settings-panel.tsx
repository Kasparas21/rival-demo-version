"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AdLibraryConnectionsPanel,
  buildMarketSummaryLabel,
  DEFAULT_ONBOARDING_AD_MARKETS,
} from "@/components/ads-library/ad-library-connections-panel";
import { CHANNELS, type ChannelId, DEFAULT_SELECTED_CHANNELS } from "@/components/channel-picker-modal";
import { saveCompetitorToAccount } from "@/lib/account/client";
import { writeAdLibraryRegionPrefsToSession, readAdLibraryRegionPrefsFromSession } from "@/lib/ad-library/ad-library-region-prefs";
import { mergeScrapeFieldsWithWorkspaceMarkets } from "@/lib/ad-library/scrape-request-fields";
import { readScrapeRequestFieldsFromStorage } from "@/lib/ad-library/scrape-request-fields";
import {
  emptyWorkspaceScrapeRow,
  platformIdsToWorkspaceScrapeHints,
  scrapeHintsToPlatformIds,
  type WorkspaceAdsScrapeHints,
} from "@/lib/onboarding/workspace-ads-setup";
import { ONBOARDING_AD_MARKET_CODES } from "@/lib/onboarding/ad-markets";
import { normalizeCompetitorSlug, upsertSidebarCompetitor } from "@/lib/sidebar-competitors";

const ADS_PLATFORM_TO_CHANNEL: Record<string, ChannelId> = {
  meta: "meta",
  google: "google",
  youtube: "google",
  tiktok: "tiktok",
  linkedin: "linkedin",
  pinterest: "pinterest",
  snapchat: "snapchat",
};

function channelsFromCsv(csv: string): ChannelId[] {
  const out: ChannelId[] = [];
  for (const raw of csv.split(",")) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    const ch = ADS_PLATFORM_TO_CHANNEL[t] ?? (t as ChannelId);
    if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

export function CompetitorAdLibrarySettingsPanel({
  competitorSlug,
  competitorLabel,
  competitorDomain,
  brandLogoUrl,
  platformIds,
  channelsCsv,
  activeBrandId,
  onSaved,
}: {
  competitorSlug: string;
  competitorLabel: string;
  competitorDomain: string;
  brandLogoUrl?: string;
  platformIds: Record<string, string> | null;
  channelsCsv: string;
  activeBrandId: string;
  onSaved?: () => void;
}) {
  const baseDomain = normalizeCompetitorSlug(competitorDomain);
  const initialChannels = useMemo(() => {
    const fromCsv = channelsFromCsv(channelsCsv);
    return fromCsv.length > 0 ? fromCsv : ([...DEFAULT_SELECTED_CHANNELS] as ChannelId[]);
  }, [channelsCsv]);

  const [channels, setChannels] = useState<ChannelId[]>(initialChannels);
  const [marketsAuto, setMarketsAuto] = useState(true);
  const [selectedMarketCodes, setSelectedMarketCodes] = useState<string[]>([]);
  const [showRegionFlags, setShowRegionFlags] = useState(false);
  const [scrape, setScrape] = useState<WorkspaceAdsScrapeHints>(() =>
    platformIdsToWorkspaceScrapeHints(platformIds ?? {}, baseDomain),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setChannels(initialChannels);
    setScrape(platformIdsToWorkspaceScrapeHints(platformIds ?? {}, baseDomain));
  }, [platformIds, baseDomain, initialChannels]);

  const marketSummaryLabel = useMemo(
    () => buildMarketSummaryLabel(marketsAuto, selectedMarketCodes),
    [marketsAuto, selectedMarketCodes],
  );

  const patchScrape = useCallback((patch: Partial<WorkspaceAdsScrapeHints>) => {
    setScrape((s) => ({ ...s, ...patch }));
  }, []);

  const toggleChannel = useCallback((id: ChannelId) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onSave = useCallback(async () => {
    if (channels.length === 0) {
      setError("Select at least one ad platform.");
      return;
    }
    const adMarketCountryCodes = marketsAuto
      ? [...ONBOARDING_AD_MARKET_CODES]
      : [...selectedMarketCodes];
    if (!marketsAuto && adMarketCountryCodes.length === 0) {
      setError("Select at least one region below, or turn on Auto (all supported regions).");
      return;
    }

    setSaving(true);
    setError(null);

    const mergedIds = scrapeHintsToPlatformIds({
      scrape,
      workspaceDomain: baseDomain,
      channels,
    });

    const slug = normalizeCompetitorSlug(competitorSlug);
    const row = {
      slug,
      name: competitorLabel,
      brand: {
        name: competitorLabel,
        domain: competitorDomain,
        logoUrl: brandLogoUrl,
      },
      libraryContext: {
        ids: mergedIds,
        channels,
        confirmed: true,
      },
      pending: false,
    };

    const upsert = upsertSidebarCompetitor(row);
    if (!upsert.ok) {
      setSaving(false);
      setError(
        upsert.reason === "max_watched_competitors"
          ? "You've reached the maximum number of watched competitors."
          : "Could not update competitor in sidebar.",
      );
      return;
    }

    const saved = await saveCompetitorToAccount(
      {
        slug,
        name: competitorLabel,
        logoUrl: brandLogoUrl,
        brand: row.brand,
        pending: false,
        adsLibraryContext: row.libraryContext,
      },
      activeBrandId,
    );

    setSaving(false);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }

    const scrapeFields = mergeScrapeFieldsWithWorkspaceMarkets(
      readScrapeRequestFieldsFromStorage(),
      adMarketCountryCodes,
    );
    const regionPrefs = readAdLibraryRegionPrefsFromSession();
    writeAdLibraryRegionPrefsToSession({
      ...regionPrefs,
      metaCountry: scrapeFields.metaCountry,
      linkedinCountryCode: scrapeFields.linkedinCountryCode,
      snapchatCountry: scrapeFields.snapchatCountry,
    });

    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
    toast.success("Connections saved. Use Refresh on each platform to pull new creatives.");
    onSaved?.();
  }, [
    activeBrandId,
    baseDomain,
    brandLogoUrl,
    channels,
    competitorDomain,
    competitorLabel,
    competitorSlug,
    marketsAuto,
    onSaved,
    scrape,
    selectedMarketCodes,
  ]);

  return (
    <AdLibraryConnectionsPanel
      noBottomMargin
      headerOverline={competitorLabel}
      headerDescription={
        <>
          Set the links and handles we use to find{" "}
          <span className="font-semibold text-sky-900/80">{competitorLabel}</span> in each ad library.
          After saving, use &quot;Refresh … only&quot; on the All Ads tab to pull new creatives.
        </>
      }
      platformCardSubline={`${competitorLabel} · tracked rival`}
      websiteUrl={scrape.websiteUrl || `https://${baseDomain}`}
      onWebsiteUrlChange={(v) => patchScrape({ websiteUrl: v })}
      websiteReadOnly
      channels={channels}
      onToggleChannel={toggleChannel}
      scrape={scrape}
      onPatchScrape={patchScrape}
      baseDomain={baseDomain}
      fieldIdPrefix="rival-comp"
      marketsAuto={marketsAuto}
      selectedMarketCodes={selectedMarketCodes}
      showRegionFlags={showRegionFlags}
      marketSummaryLabel={marketSummaryLabel}
      onOpenCountries={() => {
        setMarketsAuto(false);
        setShowRegionFlags(true);
        setSelectedMarketCodes((p) => (p.length ? p : [...DEFAULT_ONBOARDING_AD_MARKETS]));
      }}
      onEditMarkets={() => setShowRegionFlags(true)}
      onMarketsAuto={() => {
        setMarketsAuto(true);
        setShowRegionFlags(false);
        setSelectedMarketCodes([]);
      }}
      onToggleMarketCode={(code) => {
        setMarketsAuto(false);
        setShowRegionFlags(true);
        setSelectedMarketCodes((prev) =>
          prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
        );
      }}
      onCollapseMarkets={() => setShowRegionFlags(false)}
      error={error}
      saving={saving}
      primaryLabel="Save connections"
      primaryBusyLabel="Saving…"
      onPrimaryClick={() => void onSave()}
      savedFlash={savedFlash}
      savedFlashMessage="Saved to this competitor"
      footerHint="Changes apply to this competitor's library scrapes."
    />
  );
}
