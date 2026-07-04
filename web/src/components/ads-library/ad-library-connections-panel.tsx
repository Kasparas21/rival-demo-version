"use client";

import { ExternalLink, RefreshCw } from "lucide-react";

import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import { RivalLogoVideo } from "@/components/ui/rival-loading";
import {
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  buildGoogleTransparencyPreviewUrl,
  buildLinkedInAdLibraryPreviewUrl,
  buildMetaAdsLibraryPreviewUrl,
  buildPinterestAdsPreviewUrl,
  buildSnapchatAdsGalleryPreviewUrl,
  buildTikTokAdsLibraryPreviewUrl,
} from "@/lib/onboarding/ad-library-preview-urls";
import type { WorkspaceAdsScrapeHints } from "@/lib/onboarding/workspace-ads-setup";
import {
  countryFlagEmoji,
  DEFAULT_ONBOARDING_AD_MARKETS,
  ONBOARDING_AD_MARKET_CODES,
  ONBOARDING_AD_MARKETS,
} from "@/lib/onboarding/ad-markets";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sky-200/70 bg-white/95 px-3.5 py-2.5 text-[13px] font-medium text-sky-950 placeholder:text-sky-900/40 outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)] transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-2 focus:ring-sky-300/35";

const basicsInputClass =
  "mt-1.5 box-border h-[42px] w-full rounded-xl border border-sky-200/70 bg-white/95 px-3.5 py-0 text-[13px] font-medium leading-normal text-sky-950 placeholder:text-sky-900/40 outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)] transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-2 focus:ring-sky-300/35";

type PlatformFieldSpec = {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
};

function previewHrefForChannel(
  id: ChannelId,
  scrape: WorkspaceAdsScrapeHints,
  workspaceDomain: string,
): string {
  switch (id) {
    case "meta":
      return buildMetaAdsLibraryPreviewUrl(scrape.metaAdsLibraryUrl);
    case "google":
      return buildGoogleTransparencyPreviewUrl(scrape.googleAdsTransparencyUrl.trim());
    case "linkedin":
      return buildLinkedInAdLibraryPreviewUrl(scrape.linkedInUrl);
    case "tiktok":
      return buildTikTokAdsLibraryPreviewUrl(scrape.tiktokKeyword);
    case "pinterest":
      return buildPinterestAdsPreviewUrl(scrape.pinterestKeyword);
    case "snapchat":
      return buildSnapchatAdsGalleryPreviewUrl(scrape.snapchatKeyword);
    default:
      return "about:blank";
  }
}

function fieldByChannel(
  id: ChannelId,
  scrape: WorkspaceAdsScrapeHints,
  onPatchScrape: (patch: Partial<WorkspaceAdsScrapeHints>) => void,
  idPrefix: string,
): PlatformFieldSpec | null {
  switch (id) {
    case "meta":
      return {
        id: `${idPrefix}-meta`,
        label: "Meta Ads Library URL",
        hint: "Use an Ad Library search URL—not a Facebook Page link.",
        placeholder: "https://www.facebook.com/ads/library/...",
        value: scrape.metaAdsLibraryUrl,
        onChange: (v) => onPatchScrape({ metaAdsLibraryUrl: v }),
      };
    case "google":
      return {
        id: `${idPrefix}-google`,
        label: "URL with Advertiser ID",
        hint: "URL from Google Ads Transparency Center that includes …/advertiser/AR… in the path.",
        placeholder: "https://adstransparency.google.com/advertiser/AR…",
        value: scrape.googleAdsTransparencyUrl,
        onChange: (v) => onPatchScrape({ googleAdsTransparencyUrl: v }),
      };
    case "linkedin":
      return {
        id: `${idPrefix}-li`,
        label: "LinkedIn Ad Library URL",
        hint: "Ad Library search or company/advertiser link.",
        value: scrape.linkedInUrl,
        onChange: (v) => onPatchScrape({ linkedInUrl: v }),
      };
    case "tiktok":
      return {
        id: `${idPrefix}-tt`,
        label: "TikTok keyword",
        hint: "What we pass to TikTok Ads Library search.",
        value: scrape.tiktokKeyword,
        onChange: (v) => onPatchScrape({ tiktokKeyword: v }),
      };
    case "pinterest":
      return {
        id: `${idPrefix}-pin`,
        label: "Pinterest search keyword",
        hint: "Keyword-style match in Pinterest transparency.",
        value: scrape.pinterestKeyword,
        onChange: (v) => onPatchScrape({ pinterestKeyword: v }),
      };
    case "snapchat":
      return {
        id: `${idPrefix}-snap`,
        label: "Snapchat keyword",
        hint: "Gallery search term for your brand.",
        value: scrape.snapchatKeyword,
        onChange: (v) => onPatchScrape({ snapchatKeyword: v }),
      };
    default:
      return null;
  }
}

export type AdLibraryConnectionsPanelProps = {
  noBottomMargin?: boolean;
  headerOverline: string;
  headerDescription: React.ReactNode;
  platformCardSubline: string;
  websiteUrl: string;
  onWebsiteUrlChange: (value: string) => void;
  websiteReadOnly?: boolean;
  channels: ChannelId[];
  onToggleChannel: (id: ChannelId) => void;
  scrape: WorkspaceAdsScrapeHints;
  onPatchScrape: (patch: Partial<WorkspaceAdsScrapeHints>) => void;
  baseDomain: string;
  fieldIdPrefix: string;
  marketsAuto: boolean;
  selectedMarketCodes: string[];
  showRegionFlags: boolean;
  marketSummaryLabel: string;
  onOpenCountries: () => void;
  onEditMarkets: () => void;
  onMarketsAuto: () => void;
  onToggleMarketCode: (code: string) => void;
  onCollapseMarkets: () => void;
  error: string | null;
  saving: boolean;
  rescraping?: boolean;
  primaryLabel: string;
  primaryBusyLabel?: string;
  onPrimaryClick: () => void;
  secondaryLabel?: string;
  secondaryBusyLabel?: string;
  onSecondaryClick?: () => void;
  showSecondary?: boolean;
  savedFlash?: boolean;
  savedFlashMessage?: string;
  footerHint: string;
};

export function AdLibraryConnectionsPanel({
  noBottomMargin,
  headerOverline,
  headerDescription,
  platformCardSubline,
  websiteUrl,
  onWebsiteUrlChange,
  websiteReadOnly = false,
  channels,
  onToggleChannel,
  scrape,
  onPatchScrape,
  baseDomain,
  fieldIdPrefix,
  marketsAuto,
  selectedMarketCodes,
  showRegionFlags,
  marketSummaryLabel,
  onOpenCountries,
  onEditMarkets,
  onMarketsAuto,
  onToggleMarketCode,
  onCollapseMarkets,
  error,
  saving,
  rescraping = false,
  primaryLabel,
  primaryBusyLabel,
  onPrimaryClick,
  secondaryLabel,
  secondaryBusyLabel,
  onSecondaryClick,
  showSecondary = false,
  savedFlash = false,
  savedFlashMessage = "Saved",
  footerHint,
}: AdLibraryConnectionsPanelProps) {
  const googleTransparencyNeedsFix =
    scrape.googleAdsTransparencyUrl.trim().length > 0 &&
    canonicalGoogleAdsTransparencyStartUrl(scrape.googleAdsTransparencyUrl.trim()) === null;

  const busy = saving || rescraping;

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-sky-200/65 bg-gradient-to-b from-white via-sky-50/35 to-amber-50/25 shadow-[0_10px_40px_rgba(14,116,144,0.07)] ${
        noBottomMargin ? "" : "mb-6"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400/90 via-sky-300/50 to-amber-300/70"
        aria-hidden
      />
      <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0 pl-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-sky-800/90">{headerOverline}</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug tracking-[-0.02em] text-sky-950">
            Ad library connections
          </p>
          <p className="mt-1 max-w-[52rem] text-[12px] leading-snug text-sky-900/65">{headerDescription}</p>
        </div>
      </div>

      <div className="space-y-5 border-t border-sky-200/50 px-4 py-5 sm:px-5 sm:py-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">Basics</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4">
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-sky-900/85" htmlFor={`${fieldIdPrefix}-site`}>
                Website URL
              </label>
              <input
                id={`${fieldIdPrefix}-site`}
                className={basicsInputClass}
                value={websiteUrl}
                readOnly={websiteReadOnly}
                onChange={(e) => onWebsiteUrlChange(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                <p className="text-[11px] font-semibold text-sky-900/85">Ad markets</p>
                <p className="text-[10px] leading-tight text-sky-900/50">
                  <span className="hidden sm:inline">Auto unless you pick countries.</span>
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-sky-900/50 sm:hidden">
                Auto by default — open Countries… to customize.
              </p>

              {!showRegionFlags ? (
                <div
                  className="mt-1.5 flex min-h-[42px] w-full flex-wrap items-center gap-2 rounded-xl border border-sky-200/70 bg-white/80 px-3 py-1.5 sm:flex-nowrap sm:gap-3"
                  title={marketSummaryLabel}
                >
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-tight text-sky-950">
                    <span className="font-semibold">{marketsAuto ? "Auto" : "Custom"}</span>
                    <span className="font-normal text-sky-800/70"> · {marketSummaryLabel}</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {marketsAuto ? (
                      <button
                        type="button"
                        onClick={onOpenCountries}
                        className="rounded-lg border border-sky-300/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50/90"
                      >
                        Countries…
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onEditMarkets}
                          className="rounded-lg border border-sky-300/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50/90"
                        >
                          Edit…
                        </button>
                        <button
                          type="button"
                          onClick={onMarketsAuto}
                          className="rounded-lg border border-sky-200/80 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100/90"
                        >
                          Auto
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {showRegionFlags ? (
                <div className="mt-3 min-w-0 space-y-2">
                  <div className="relative">
                    <div
                      className="flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-xl border border-sky-200/60 bg-white/70 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
                      role="group"
                      aria-label="Ad markets"
                    >
                      <span className="inline-flex shrink-0 snap-start items-center">
                        <button
                          type="button"
                          title="Use all supported regions"
                          aria-pressed={marketsAuto}
                          onClick={onMarketsAuto}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                            marketsAuto
                              ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                              : "border-sky-200/80 bg-white text-sky-900 hover:bg-sky-50"
                          }`}
                        >
                          Auto
                        </button>
                      </span>
                      {ONBOARDING_AD_MARKETS.map((m) => {
                        const on = !marketsAuto && selectedMarketCodes.includes(m.code);
                        return (
                          <span key={m.code} className="inline-flex shrink-0 snap-start items-center">
                            <button
                              type="button"
                              title={m.label}
                              aria-pressed={on}
                              disabled={marketsAuto}
                              onClick={() => onToggleMarketCode(m.code)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-45 ${
                                on
                                  ? "border-sky-500 bg-sky-100 text-sky-950"
                                  : "border-transparent bg-white/80 text-sky-800/70 hover:bg-sky-50 disabled:hover:bg-white/80"
                              }`}
                            >
                              <span className="text-[0.85rem] leading-none" aria-hidden>
                                {countryFlagEmoji(m.code)}
                              </span>
                              {m.shortTag}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onCollapseMarkets}
                      className="text-[11px] font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
                    >
                      Collapse list
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">Platforms you track</p>
          <p className="mt-0.5 text-[12px] text-sky-900/60">
            Toggle networks—connection fields below appear only for platforms you enable.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-sky-200/60 bg-white/60 p-2">
            {CHANNELS.map(({ id, name, Logo }) => {
              const on = channels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleChannel(id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    on
                      ? "border-sky-400/90 bg-sky-500/15 text-sky-950 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
                      : "border-transparent bg-white/90 text-sky-900/45 hover:bg-sky-50/90 hover:text-sky-900"
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
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-900/75">Per-platform identifiers</p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {CHANNELS.filter((c) => channels.includes(c.id)).map((ch) => {
              const spec = fieldByChannel(ch.id, scrape, onPatchScrape, fieldIdPrefix);
              if (!spec) return null;
              const previewHref = previewHrefForChannel(ch.id, scrape, baseDomain);
              return (
                <div
                  key={ch.id}
                  className="relative flex min-h-0 flex-col rounded-2xl border border-dashed border-sky-300/55 bg-white/75 px-3.5 pb-3.5 pt-3 shadow-[0_2px_12px_rgba(14,116,144,0.04)] sm:px-4 sm:pb-4 sm:pt-3.5"
                >
                  <div
                    className="pointer-events-none absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-sky-500 to-sky-400/85"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 shadow-sm">
                        <ch.Logo className="h-4 w-4 text-sky-950" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[13px] font-bold leading-tight text-sky-950">{ch.name}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-700/55">
                          {platformCardSubline}
                        </p>
                      </div>
                    </div>
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Preview in new tab"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200/80 bg-sky-50/90 px-2 py-1 text-[11px] font-semibold text-sky-900 transition-colors hover:bg-sky-100 sm:mt-0.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      Preview
                    </a>
                  </div>
                  <div className="mt-3 pl-1.5">
                    <label className="block text-[11px] font-semibold text-sky-900/75" htmlFor={spec.id}>
                      {spec.label}
                    </label>
                    <input
                      id={spec.id}
                      className={
                        spec.id.endsWith("-google") && googleTransparencyNeedsFix
                          ? `${inputClass} border-amber-400/90 ring-1 ring-amber-300/50`
                          : inputClass
                      }
                      value={spec.value}
                      onChange={(e) => spec.onChange(e.target.value)}
                      onBlur={() => {
                        if (spec.id.endsWith("-meta")) {
                          const v = scrape.metaAdsLibraryUrl.trim();
                          if (!v) return;
                          const c = canonicalMetaAdsLibraryUrl(v);
                          if (c && c !== v) onPatchScrape({ metaAdsLibraryUrl: c });
                          return;
                        }
                        if (spec.id.endsWith("-google")) {
                          const v = scrape.googleAdsTransparencyUrl.trim();
                          if (!v) return;
                          const c = canonicalGoogleAdsTransparencyStartUrl(scrape.googleAdsTransparencyUrl);
                          if (c && c !== v) onPatchScrape({ googleAdsTransparencyUrl: c });
                          return;
                        }
                        if (spec.id.endsWith("-li")) {
                          const v = scrape.linkedInUrl.trim();
                          if (!v) return;
                          const c = canonicalLinkedInAdLibraryUrl(v);
                          if (c && c !== v) onPatchScrape({ linkedInUrl: c });
                        }
                      }}
                      placeholder={spec.placeholder}
                    />
                    {spec.hint ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-sky-800/55">{spec.hint}</p>
                    ) : null}
                    {spec.id.endsWith("-google") && googleTransparencyNeedsFix ? (
                      <p className="mt-1.5 text-[11px] leading-snug font-medium text-amber-900/95" role="alert">
                        That link doesn&apos;t include a Transparency advertiser ID (
                        <span className="font-mono text-[10px]">…/advertiser/AR…</span>). Open Google Ads
                        Transparency Center, search for the company, then copy a creative URL from the address bar.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {channels.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-sky-200/80 bg-sky-50/40 px-3 py-2.5 text-[12px] text-sky-900/65">
              Turn on at least one platform above to add connection details.
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-[12px] font-medium text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onPrimaryClick}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-sky-700 to-sky-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(14,116,144,0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
            >
              {saving ? (primaryBusyLabel ?? "Saving…") : primaryLabel}
            </button>
            {showSecondary && onSecondaryClick ? (
              <button
                type="button"
                onClick={onSecondaryClick}
                disabled={busy || channels.length === 0}
                className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/90 bg-white px-4 py-2.5 text-[13px] font-semibold text-sky-950 shadow-sm transition-colors hover:bg-sky-50 disabled:opacity-50 sm:w-auto"
              >
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
                  aria-hidden
                />
                {rescraping ? (
                  <RivalLogoVideo size="inline" className="shrink-0" aria-hidden />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                )}
                {rescraping ? (secondaryBusyLabel ?? "Rescraping…") : (secondaryLabel ?? "Rescrape ads")}
              </button>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            {savedFlash ? (
              <span className="text-[12px] font-semibold text-emerald-700">{savedFlashMessage}</span>
            ) : (
              <span className="text-[11px] text-sky-900/45">{footerHint}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildMarketSummaryLabel(marketsAuto: boolean, selectedMarketCodes: string[]): string {
  if (marketsAuto) {
    return `All supported territories (${ONBOARDING_AD_MARKET_CODES.length} regions)`;
  }
  if (selectedMarketCodes.length === 0) {
    return "Pick regions or switch back to Auto";
  }
  const tags = selectedMarketCodes
    .map((c) => ONBOARDING_AD_MARKETS.find((m) => m.code === c)?.shortTag ?? c)
    .slice(0, 8);
  const more = selectedMarketCodes.length > 8 ? ` +${selectedMarketCodes.length - 8} more` : "";
  return `${tags.join(", ")}${more}`;
}

export { DEFAULT_ONBOARDING_AD_MARKETS, ONBOARDING_AD_MARKET_CODES };
