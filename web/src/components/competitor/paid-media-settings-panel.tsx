"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { CHANNELS, type ChannelId, DEFAULT_SELECTED_CHANNELS } from "@/components/channel-picker-modal";
import { CollapsibleSingleSelectFlagChipRow, type RegionChipOption } from "@/components/ad-library/single-select-flag-chip-row";
import type { PlatformIdentifier } from "@/components/manual-identifiers-form";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { saveCompetitorToAccount } from "@/lib/account/client";
import type { AdLibraryRegionPrefs } from "@/lib/ad-library/ad-library-region-prefs";
import { writeAdLibraryRegionPrefsToSession } from "@/lib/ad-library/ad-library-region-prefs";
import { buildClientAdsLibraryPayload } from "@/lib/ad-library/build-client-ads-library-payload";
import { channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import {
  canonicalLinkedInAdLibraryUrl,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  coerceAdsLibraryResponse,
  mergeAdsLibraryState,
  type AdsLibraryPlatform,
} from "@/lib/ad-library/api-types";
import {
  fetchAdsLibraryDeduplicated,
  readAdsLibrarySessionCache,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "@/lib/ad-library/deduped-fetch";
import { buildGoogleAdsRegionOptions } from "@/lib/ad-library/google-ads-regions";
import {
  buildPlatformIdsFromForm,
  competitorPreviewHrefForChannel,
  fieldValueForChannel,
  identifiersFromIds,
  mergeMetaFromInput,
  metaDisplayFromIds,
  PLATFORM_CONNECTION_FIELD_SPECS,
} from "@/lib/ad-library/platform-connection-fields";
import { PINTEREST_ADS_COUNTRY_OPTIONS } from "@/lib/ad-library/pinterest-regions";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";
import {
  regionsToPersistedPayload,
  resolveScheduledScrapeRegions,
} from "@/lib/ad-library/resolve-scheduled-scrape-regions";
import {
  applyInitialScrapeLimits,
  readScrapeRequestFieldsFromStorage,
} from "@/lib/ad-library/scrape-request-fields";
import { LINKEDIN_COUNTRY_OPTIONS, META_COUNTRY_OPTIONS } from "@/lib/ad-library/scrape-settings-options";
import { TIKTOK_ADS_LIBRARY_REGION_OPTIONS } from "@/lib/ad-library/tiktok-regions";
import { buildSnapchatEuGalleryCountryOptions } from "@/lib/apify/snapchat-ads";
import { normalizeCompetitorSlug, upsertSidebarCompetitor, type SidebarCompetitor } from "@/lib/sidebar-competitors";
import {
  ADS_LIBRARY_UPDATED_EVENT,
  type AdsLibraryUpdatedDetail,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import { validateIdentifierField } from "@/lib/validate-identifier-field";

function stableIdsFingerprint(ids: Record<string, string> | null | undefined): string {
  if (!ids) return "";
  const entries = Object.entries(ids).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function parseChannelSeed(csv: string): ChannelId[] {
  const valid = new Set(CHANNELS.map((c) => c.id));
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((c): c is ChannelId => valid.has(c as ChannelId));
}

function sortedRegionChipOptions(options: RegionChipOption[]): RegionChipOption[] {
  const bucket = (v: string): number => {
    const u = v.trim().toUpperCase();
    if (!u || u === "ALL" || u === "ANYWHERE") return 0;
    return 1;
  };
  return [...options].sort((a, b) => {
    const d = bucket(a.value) - bucket(b.value);
    if (d !== 0) return d;
    return a.value.toUpperCase().localeCompare(b.value.toUpperCase(), "en");
  });
}

type Props = {
  competitor: { name: string; domain: string; logoUrl?: string };
  competitorDbId: string;
  brandId: string;
  initialContext?: SidebarCompetitor["libraryContext"];
  fallbackIds?: Record<string, string> | null;
  fallbackChannels?: string[];
  enabled?: boolean;
  onSaved?: (payload: { ids: Record<string, string>; channels: ChannelId[] }) => void;
};

export function CompetitorPaidMediaSettingsPanel({
  competitor,
  competitorDbId,
  brandId,
  initialContext,
  fallbackIds,
  fallbackChannels,
  enabled = true,
  onSaved,
}: Props) {
  const domain = normalizeCompetitorSlug(competitor.domain);
  const slug = domain;

  const initialChannelsKey = (initialContext?.channels ?? []).join(",");
  const fallbackChannelsKey = (fallbackChannels ?? []).join(",");
  const initialIdsFingerprint = stableIdsFingerprint(initialContext?.ids);
  const fallbackIdsFingerprint = stableIdsFingerprint(fallbackIds);

  const seedIds = useMemo(() => {
    const fromCtx = initialContext?.ids ?? {};
    const merged = { ...(fallbackIds ?? {}), ...fromCtx };
    return Object.keys(merged).length > 0 ? merged : {};
  }, [initialIdsFingerprint, fallbackIdsFingerprint, initialContext?.ids, fallbackIds]);

  const seedChannelsCsv = useMemo(() => {
    const fromCtx = initialContext?.channels?.filter((c): c is ChannelId =>
      CHANNELS.some((ch) => ch.id === c),
    );
    if (fromCtx?.length) return fromCtx.join(",");
    const fromFallback = (fallbackChannels ?? []).filter((c): c is ChannelId =>
      CHANNELS.some((ch) => ch.id === c),
    );
    if (fromFallback.length) return fromFallback.join(",");
    return DEFAULT_SELECTED_CHANNELS.join(",");
  }, [initialChannelsKey, fallbackChannelsKey, initialContext?.channels, fallbackChannels]);

  const seedChannels = useMemo((): ChannelId[] => parseChannelSeed(seedChannelsCsv), [seedChannelsCsv]);

  const seedRegionsKey = useMemo(
    () => JSON.stringify(resolveScheduledScrapeRegions(domain, { regions: initialContext?.regions })),
    [domain, initialContext?.regions],
  );

  const seedRegions = useMemo(
    () => resolveScheduledScrapeRegions(domain, { regions: initialContext?.regions }),
    [domain, seedRegionsKey, initialContext?.regions],
  );

  const settingsHydrateKey = `${slug}|${seedChannelsCsv}|${stableIdsFingerprint(seedIds)}|${seedRegionsKey}`;
  const lastHydrateKeyRef = useRef<string | null>(null);
  const lastSavedChannelsRef = useRef<ChannelId[]>(seedChannels);

  const [channels, setChannels] = useState<ChannelId[]>(seedChannels);
  const [metaDisplay, setMetaDisplay] = useState(() => metaDisplayFromIds(seedIds));
  const [identifiers, setIdentifiers] = useState<PlatformIdentifier>(() => identifiersFromIds(seedIds));
  const [regions, setRegions] = useState<AdLibraryRegionPrefs>(seedRegions);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (lastHydrateKeyRef.current === settingsHydrateKey) return;
    lastHydrateKeyRef.current = settingsHydrateKey;
    setChannels(seedChannels);
    setMetaDisplay(metaDisplayFromIds(seedIds));
    setIdentifiers(identifiersFromIds(seedIds));
    setRegions(seedRegions);
    lastSavedChannelsRef.current = seedChannels;
  }, [enabled, settingsHydrateKey, seedChannels, seedIds, seedRegions]);

  const patchRegions = useCallback((patch: Partial<AdLibraryRegionPrefs>) => {
    setRegions((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleChannel = (id: ChannelId) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const patchField = (id: ChannelId, value: string) => {
    if (id === "meta") {
      setMetaDisplay(value);
      return;
    }
    if (id === "pinterest") {
      setIdentifiers((prev) => ({ ...prev, pinterestAdvertiserName: value, pinterest: value }));
      return;
    }
    setIdentifiers((prev) => ({ ...prev, [id]: value }));
  };

  const blurField = (id: ChannelId) => {
    if (id === "meta") {
      const merged = mergeMetaFromInput(metaDisplay);
      setMetaDisplay(merged.metaPageUrl ?? merged.meta ?? metaDisplay);
      return;
    }
    if (id === "google") {
      const v = identifiers.google?.trim() ?? "";
      if (!v) return;
      const canon = canonicalGoogleAdsTransparencyStartUrl(v);
      if (canon && canon !== v) setIdentifiers((prev) => ({ ...prev, google: canon }));
      return;
    }
    if (id === "linkedin") {
      const v = identifiers.linkedin?.trim() ?? "";
      if (!v) return;
      const canon = canonicalLinkedInAdLibraryUrl(v);
      if (canon && canon !== v) setIdentifiers((prev) => ({ ...prev, linkedin: canon }));
    }
  };

  const validate = (): boolean => {
    if (channels.length === 0) {
      setError("Select at least one ad platform.");
      return false;
    }
    for (const ch of channels) {
      const value = fieldValueForChannel(ch, metaDisplay, identifiers);
      if (!value.trim()) {
        setError(`Enter a value for ${CHANNELS.find((c) => c.id === ch)?.name ?? ch}.`);
        return false;
      }
      const idv = validateIdentifierField(ch, value);
      if (!idv.valid && "error" in idv) {
        setError(idv.error);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const persist = async (): Promise<Record<string, string> | null> => {
    if (!validate()) return null;
    const ids = buildPlatformIdsFromForm({ channels, metaDisplay, identifiers });
    const adsLibraryContext = {
      ids,
      channels: [...channels],
      confirmed: true as const,
      regions: regionsToPersistedPayload(regions),
    };

    const sidebarRow = upsertSidebarCompetitor({
      slug,
      name: competitor.name,
      logoUrl: competitor.logoUrl,
      brand: {
        name: competitor.name,
        domain,
        logoUrl: competitor.logoUrl,
      },
      libraryContext: adsLibraryContext,
      pending: false,
      savedCompetitorDbId: competitorDbId || undefined,
    });
    if (!sidebarRow.ok) {
      setError("Could not update sidebar state.");
      return null;
    }

    const saved = await saveCompetitorToAccount(
      {
        slug,
        name: competitor.name,
        logoUrl: competitor.logoUrl,
        brand: {
          name: competitor.name,
          domain,
          logoUrl: competitor.logoUrl,
        },
        pending: false,
        adsLibraryContext,
      },
      brandId,
    );
    if (!saved.ok) {
      setError(saved.error);
      return null;
    }

    writeAdLibraryRegionPrefsToSession(regions);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
    onSaved?.({ ids, channels });
    lastSavedChannelsRef.current = [...channels];
    return ids;
  };

  const scrapePlatforms = async (
    ids: Record<string, string>,
    platformsToScrape: AdsLibraryPlatform[],
    toastId?: string | number,
  ): Promise<boolean> => {
    if (platformsToScrape.length === 0) return true;

    const allPlatforms = channelsQueryToAdsPlatforms(channels);
    const scrapeFields = applyInitialScrapeLimits({
      ...readScrapeRequestFieldsFromStorage(),
      metaCountry: regions.metaCountry.trim().toUpperCase() || "ALL",
      linkedinCountryCode: regions.linkedinCountryCode.trim(),
      snapchatCountry: regions.snapchatCountry.trim().toUpperCase() || "DE",
    });

    const hookPayload = buildClientAdsLibraryPayload({
      brand: {
        name: competitor.name,
        domain,
        logoUrl: competitor.logoUrl,
      },
      ids,
      adsPlatforms: allPlatforms,
      scrapeFields,
      tiktokRegion: regions.tiktokRegion,
      googleRegion: regions.googleRegion,
      pinterestCountry: regions.pinterestCountry,
    });

    const apiPayload = {
      ...hookPayload,
      libraryChannels: channels,
      googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
    };

    const cacheKey = stableAdsLibraryPayloadKey(hookPayload);
    let mergedResponse = coerceAdsLibraryResponse(
      readAdsLibrarySessionCache(cacheKey)?.result.response ?? null,
    );
    let allHttpOk = true;

    for (let i = 0; i < platformsToScrape.length; i += 1) {
      const platform = platformsToScrape[i]!;
      if (toastId != null) {
        toast.loading(`Scraping ${platform} (${i + 1}/${platformsToScrape.length})…`, { id: toastId });
      }
      const { response, httpOk } = await fetchAdsLibraryDeduplicated(
        { ...apiPayload, platforms: [platform] },
        { skipCache: true, clientSkipReadCache: true },
      );
      mergedResponse = coerceAdsLibraryResponse(mergeAdsLibraryState(mergedResponse, response));
      if (!httpOk) allHttpOk = false;
    }

    writeAdsLibrarySessionCache(cacheKey, {
      response: mergedResponse,
      httpOk: allHttpOk,
    });

    try {
      await fetch("/api/competitor/ads-library/ensure-persisted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          domain,
          ...(competitorDbId ? { competitorId: competitorDbId } : {}),
        }),
      });
    } catch {
      /* best-effort */
    }

    window.dispatchEvent(
      new CustomEvent<AdsLibraryUpdatedDetail>(ADS_LIBRARY_UPDATED_EVENT, {
        detail: { domain },
      }),
    );

    return allHttpOk;
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const previouslySaved = lastSavedChannelsRef.current;
    try {
      const ids = await persist();
      if (!ids) return;

      const newChannelIds = channels.filter((ch) => !previouslySaved.includes(ch));
      const newPlatforms = channelsQueryToAdsPlatforms(newChannelIds);
      if (newPlatforms.length === 0) return;

      setScraping(true);
      const toastId = toast.loading(
        newPlatforms.length === 1
          ? `Scraping ${newPlatforms[0]}…`
          : `Scraping ${newPlatforms.length} new platforms…`,
      );
      try {
        const ok = await scrapePlatforms(ids, newPlatforms, toastId);
        toast.dismiss(toastId);
        if (ok) {
          toast.success(
            newPlatforms.length === 1
              ? `${newPlatforms[0]} scrape complete. Ad Library is updating.`
              : "New platform scrapes complete. Ad Library is updating.",
          );
        } else {
          toast.error("Some new platforms failed to scrape. Check your connections and try again.");
        }
      } catch {
        toast.dismiss(toastId);
        toast.error("Network error while scraping new platforms.");
      } finally {
        setScraping(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const onSaveAndScrape = async () => {
    setScraping(true);
    setError(null);
    const toastId = toast.loading("Starting scrape…");
    try {
      const ids = await persist();
      if (!ids) {
        toast.dismiss(toastId);
        return;
      }

      const platforms = channelsQueryToAdsPlatforms(channels);
      if (platforms.length === 0) {
        toast.dismiss(toastId);
        toast.error("Enable at least one platform to scrape.");
        return;
      }

      const allHttpOk = await scrapePlatforms(ids, platforms, toastId);
      toast.dismiss(toastId);
      if (allHttpOk) {
        toast.success("Scrape complete. Ad Library is updating with fresh ads.");
      } else {
        toast.error("Some platforms failed to scrape. Check your connections and try again.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Network error while scraping.");
    } finally {
      setScraping(false);
    }
  };

  const metaRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        META_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "ALL" ? "ALL" : o.value,
          flagIso2: o.value === "ALL" ? null : o.value,
        })),
      ),
    [],
  );

  const googleRegionChipOptions = useMemo((): RegionChipOption[] => {
    const opts = buildGoogleAdsRegionOptions();
    return sortedRegionChipOptions(
      opts.map((o) => ({
        value: o.value,
        label: o.label,
        shortTag: o.value === "anywhere" ? "ALL" : o.value.toUpperCase(),
        flagIso2: o.value === "anywhere" ? null : /^[A-Za-z]{2}$/.test(o.value) ? o.value.toUpperCase() : null,
      })),
    );
  }, []);

  const tiktokRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        TIKTOK_ADS_LIBRARY_REGION_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "all" ? "ALL" : o.value,
          flagIso2: o.value.length === 2 ? o.value.toUpperCase() : null,
        })),
      ),
    [],
  );

  const pinterestRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        PINTEREST_ADS_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value,
          flagIso2: o.value,
        })),
      ),
    [],
  );

  const linkedinRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        LINKEDIN_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "" ? "ALL" : o.value,
          flagIso2: o.value === "" ? null : o.value,
        })),
      ),
    [],
  );

  const snapchatRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        buildSnapchatEuGalleryCountryOptions().map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value,
          flagIso2: o.value,
        })),
      ),
    [],
  );

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  const googleNeedsFix =
    channels.includes("google") &&
    (identifiers.google?.trim().length ?? 0) > 0 &&
    canonicalGoogleAdsTransparencyStartUrl(identifiers.google!.trim()) === null;

  if (!enabled) return null;

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Paid media</p>
        <p className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-slate-900">Ad library connections</p>
        <p className="mt-1.5 max-w-[52rem] text-[12px] leading-snug text-slate-600">
          Update the links and handles we use to find{" "}
          <span className="font-semibold text-slate-800">{competitor.name}</span> in each ad library. The Ad Library
          tab is for browsing creatives—keep connection settings here.
        </p>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">Basics</p>
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-slate-700">Competitor domain</label>
            <div className="mt-1.5 flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5">
              <CompetitorLogo
                sources={{ primary: competitor.logoUrl, domain }}
                name={competitor.name}
                size="xxs"
                shape="circle"
              />
              <span className="truncate text-[13px] font-medium text-slate-900">{domain}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">Platforms you track</p>
          <p className="mt-0.5 text-[12px] text-slate-600">
            Toggle networks—connection fields below appear only for platforms you enable.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
            {CHANNELS.map(({ id, name, Logo }) => {
              const on = channels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleChannel(id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    on
                      ? "border-slate-400 bg-slate-900 text-white shadow-sm"
                      : "border-transparent bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Logo className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  {name.replace(" ads", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">Per-platform identifiers</p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {CHANNELS.filter((c) => channels.includes(c.id)).map((ch) => {
              const spec = PLATFORM_CONNECTION_FIELD_SPECS[ch.id];
              const value = fieldValueForChannel(ch.id, metaDisplay, identifiers);
              const previewHref = competitorPreviewHrefForChannel(ch.id, metaDisplay, identifiers);
              const fieldId = `rival-competitor-settings-${ch.id}`;

              return (
                <div
                  key={ch.id}
                  className="relative flex min-h-0 flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5"
                >
                  <div
                    className="pointer-events-none absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-slate-300"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <ch.Logo className="h-4 w-4 text-slate-800" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[13px] font-bold leading-tight text-slate-900">{ch.name}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                          Competitor · tracking
                        </p>
                      </div>
                    </div>
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      Preview
                    </a>
                  </div>
                  <div className="mt-3 pl-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700" htmlFor={fieldId}>
                      {spec.label}
                    </label>
                    <input
                      id={fieldId}
                      className={
                        ch.id === "google" && googleNeedsFix
                          ? `${inputClass} border-amber-400 ring-1 ring-amber-200`
                          : inputClass
                      }
                      value={value}
                      onChange={(e) => patchField(ch.id, e.target.value)}
                      onBlur={() => blurField(ch.id)}
                      placeholder={spec.placeholder}
                    />
                    {spec.hint ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{spec.hint}</p>
                    ) : null}
                    {ch.id === "meta" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Meta — ad library country"
                        options={metaRegionChipOptions}
                        value={regions.metaCountry}
                        onChange={(v) => patchRegions({ metaCountry: v.toUpperCase() })}
                      />
                    ) : null}
                    {ch.id === "google" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Google — transparency region"
                        options={googleRegionChipOptions}
                        value={regions.googleRegion}
                        onChange={(v) => patchRegions({ googleRegion: v })}
                      />
                    ) : null}
                    {ch.id === "tiktok" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="TikTok — ads region"
                        options={tiktokRegionChipOptions}
                        value={regions.tiktokRegion}
                        onChange={(v) => patchRegions({ tiktokRegion: v })}
                      />
                    ) : null}
                    {ch.id === "pinterest" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Pinterest — country"
                        options={pinterestRegionChipOptions}
                        value={regions.pinterestCountry}
                        onChange={(v) => patchRegions({ pinterestCountry: v })}
                      />
                    ) : null}
                    {ch.id === "linkedin" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="LinkedIn — country"
                        options={linkedinRegionChipOptions}
                        value={regions.linkedinCountryCode}
                        onChange={(v) => patchRegions({ linkedinCountryCode: v.toUpperCase() })}
                      />
                    ) : null}
                    {ch.id === "snapchat" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Snapchat — gallery country"
                        options={snapchatRegionChipOptions}
                        value={regions.snapchatCountry}
                        onChange={(v) => patchRegions({ snapchatCountry: v.toUpperCase() })}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {channels.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
              Turn on at least one platform above to add connection details.
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-[12px] font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {savedFlash ? <p className="text-[12px] font-medium text-emerald-700">Saved.</p> : null}

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || scraping}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void onSaveAndScrape()}
              disabled={saving || scraping}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-[filter,transform] hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
            >
              {scraping ? "Scraping…" : "Save and start scraping"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Changes apply to this competitor only.</p>
        </div>
      </div>
    </div>
  );
}
