/**
 * Runs Apify scrapes for Ads Library platforms in parallel (extracted from POST /api/ads/library).
 */

import { ApifyRunnerError } from "@/lib/apify/client";
import { scrapeFacebookAds } from "@/lib/apify/facebook-ads";
import { scrapeGoogleAdsTransparency } from "@/lib/apify/google-ads";
import { scrapeLinkedInAdLibrary } from "@/lib/apify/linkedin-ads";
import { scrapeMicrosoftAdsLibrary } from "@/lib/apify/microsoft-ads";
import { scrapePinterestAdsLibrary } from "@/lib/apify/pinterest-ads";
import { scrapeSnapchatEuAdsGallery } from "@/lib/apify/snapchat-ads";
import { scrapeTikTokAdsLibrary } from "@/lib/apify/tiktok-ads";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  googleItemToRow,
  linkedInItemToCard,
  microsoftDatasetItemToCard,
  pinterestDatasetItemToCard,
  sortSnapchatAdsForResponse,
  sortTikTokAdsForResponse,
  snapchatDatasetRowMediaPriority,
  snapchatDatasetItemToCard,
} from "@/lib/ad-library/normalize";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;

/** Platform id map — same shape as POST /api/ads/library body `ids`. */
export type AdsLibraryIds = {
  meta?: string;
  metaPageUrl?: string;
  google?: string;
  linkedin?: string;
  microsoft?: string;
  pinterest?: string;
  pinterestAdvertiserName?: string;
  snapchat?: string;
  tiktok?: string;
};

export type RunAdsLibraryParallelScrapeParams = {
  ids: AdsLibraryIds;
  /** Display / actor brand label */
  brandName: string;
  /** Clean host for Snapchat + cache domain alignment */
  domain: string;
  linkedinKeywordFallback?: string;
  /** Resolved Pinterest handle/name for actor (may be ""). */
  pinterestAdvertiserNameForApify: string;
  platformsRequested: Set<AdsLibraryPlatform>;
  platformsNeedingScrape: Set<AdsLibraryPlatform>;
  /** Response object populated from cache beforehand; mutated in place */
  out: AdsLibraryResponse;
  metaStatus: "ACTIVE" | "ALL";
  metaMaxAds: number;
  metaCountry: string;
  metaStartDate?: string;
  metaEndDate?: string;
  metaSortBy: string;
  linkedinMaxAds: number;
  linkedinDateRange: string;
  linkedinCountryCode: string;
  tiktokMaxAds: number;
  tiktokStartDate?: string;
  tiktokEndDate?: string;
  microsoftMaxSearchResults: number;
  microsoftCountryCodes: string[];
  microsoftStartDate?: string;
  microsoftEndDate?: string;
  pinterestMaxResults: number;
  pinterestStartDate?: string;
  pinterestEndDate?: string;
  pinterestGender?: string;
  pinterestAge?: string;
  snapchatMaxItems: number;
  snapchatCountryIso: string;
  snapchatStartDate?: string;
  snapchatEndDate?: string;
  tiktokRegion: string;
  googleRegion: string;
  googleResultsLimit: number;
  pinterestCountry: string;
  /** Set when the user provided Pinterest ids (not brand fallback) — drives Unverified source vs row advertiser. */
  pinterestConfirmedAdvertiserQuery?: string;
  /** Set when the user provided a Snapchat gallery advertiser string — drives Unverified source vs row advertiser. */
  snapchatConfirmedAdvertiserQuery?: string;
  /** Post-onboarding workspace brand Meta scrape — full active page Ad Library URL. */
  metaWorkspaceBrandInitialScrape?: boolean;
};

/**
 * Executes Apify platform scrapes in parallel — identical behavior to POST /api/ads/library inner `Promise.all`.
 */
export async function runAdsLibraryParallelScrape(params: RunAdsLibraryParallelScrapeParams): Promise<void> {
  const {
    ids,
    brandName,
    domain,
    linkedinKeywordFallback,
    pinterestAdvertiserNameForApify,
    platformsRequested,
    platformsNeedingScrape,
    out,
    metaStatus,
    metaMaxAds,
    metaCountry,
    metaStartDate,
    metaEndDate,
    metaSortBy,
    linkedinMaxAds,
    linkedinDateRange,
    linkedinCountryCode,
    tiktokMaxAds,
    tiktokStartDate,
    tiktokEndDate,
    microsoftMaxSearchResults,
    microsoftCountryCodes,
    microsoftStartDate,
    microsoftEndDate,
    pinterestMaxResults,
    pinterestStartDate,
    pinterestEndDate,
    pinterestGender,
    pinterestAge,
    snapchatMaxItems,
    snapchatCountryIso,
    snapchatStartDate,
    snapchatEndDate,
    tiktokRegion,
    googleRegion,
    googleResultsLimit,
    pinterestCountry,
    pinterestConfirmedAdvertiserQuery,
    snapchatConfirmedAdvertiserQuery,
    metaWorkspaceBrandInitialScrape,
  } = params;

  await Promise.all([
    (async () => {
      if (!platformsRequested.has("meta") || !platformsNeedingScrape.has("meta")) return;
      try {
        out.meta.ads = await scrapeFacebookAds({
          ids,
          brandName,
          activeStatus: metaStatus,
          maxAds: metaMaxAds,
          countryCode: metaCountry,
          metaStartDate,
          metaEndDate,
          scrapePageAdsSortBy: metaSortBy,
          metaWorkspaceBrandInitialScrape,
        });
      } catch (e) {
        out.meta.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Meta ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("google") || !platformsNeedingScrape.has("google")) return;
      try {
        const rawGoogle = ids.google?.trim() ?? "";
        const queryDom = domain;

        const transparencyCanon = canonicalGoogleAdsTransparencyStartUrl(rawGoogle);
        if (!transparencyCanon) {
          out.google.error =
            rawGoogle.trim().length > 0
              ? "Google Ads requires a Transparency advertiser URL with /advertiser/AR… in it (copy it from the advertiser page address bar). Domain search URLs (?domain=) are not supported."
              : "No Google advertiser URL — paste https://adstransparency.google.com/advertiser/AR… from Transparency Center.";
          return;
        }
        const rows = await scrapeGoogleAdsTransparency({
          startUrls: [transparencyCanon],
          resultsLimit: googleResultsLimit,
          region: googleRegion,
        });

        out.google.rows = rows
          .slice(0, googleResultsLimit)
          .map((item, i) => googleItemToRow(item, i, { queryDomain: queryDom }));
      } catch (e) {
        out.google.error = e instanceof Error ? e.message : "Google ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("linkedin") || !platformsNeedingScrape.has("linkedin")) return;
      try {
        const raw = await scrapeLinkedInAdLibrary({
          brandName,
          linkedinUrl: ids.linkedin,
          keywordFallback: linkedinKeywordFallback,
          maxItems: linkedinMaxAds,
          dateRange: linkedinDateRange,
          countryCode: linkedinCountryCode || undefined,
        });
        out.linkedin.ads = raw
          .slice(0, linkedinMaxAds)
          .map((item, i) => linkedInItemToCard(item, i));
      } catch (e) {
        out.linkedin.error = e instanceof Error ? e.message : "LinkedIn ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("tiktok")) return;
      if (!platformsNeedingScrape.has("tiktok")) {
        console.info(
          "[parallel-scrape] TikTok skipped — not in platformsNeedingScrape",
          JSON.stringify({ domain, brandName }),
        );
        return;
      }
      console.info(
        "[parallel-scrape] TikTok Apify run starting",
        JSON.stringify({ domain, brandName, tiktokMaxAds, tiktokRegion }),
      );
      try {
        out.tiktok.ads = await scrapeTikTokAdsLibrary({
          brandName,
          brandDomain: domain || undefined,
          savedTiktok: typeof ids.tiktok === "string" ? ids.tiktok : undefined,
          region: tiktokRegion,
          maxAds: tiktokMaxAds,
          fetchDetails: true,
          startDate: tiktokStartDate,
          endDate: tiktokEndDate,
        });
      } catch (e) {
        out.tiktok.error = e instanceof Error ? e.message : "TikTok ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("microsoft") || !platformsNeedingScrape.has("microsoft")) return;
      try {
        const rows = await scrapeMicrosoftAdsLibrary({
          brandName,
          maxSearchResults: microsoftMaxSearchResults,
          advertiserIdOverride: ids.microsoft,
          countryCodes: microsoftCountryCodes,
          startDate: microsoftStartDate,
          endDate: microsoftEndDate,
        });
        out.microsoft.ads = rows
          .slice(0, microsoftMaxSearchResults)
          .map((raw, i) => microsoftDatasetItemToCard(raw, i));
      } catch (e) {
        out.microsoft.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Microsoft ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("pinterest") || !platformsNeedingScrape.has("pinterest")) return;
      try {
        const rows = await scrapePinterestAdsLibrary({
          advertiserName: pinterestAdvertiserNameForApify,
          maxResults: pinterestMaxResults,
          country: pinterestCountry,
          startDate: pinterestStartDate,
          endDate: pinterestEndDate,
          gender: pinterestGender,
          age: pinterestAge,
        });
        out.pinterest.ads = rows
          .slice(0, pinterestMaxResults)
          .map((raw, i) =>
            pinterestDatasetItemToCard(raw, i, {
              brandName,
              brandDomain: domain,
              ...(pinterestConfirmedAdvertiserQuery
                ? { confirmedAdvertiserQuery: pinterestConfirmedAdvertiserQuery }
                : {}),
            })
          );
      } catch (e) {
        out.pinterest.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Pinterest ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("snapchat") || !platformsNeedingScrape.has("snapchat")) return;
      if (!domain) {
        out.snapchat.error = "No domain for Snapchat EU gallery search.";
        return;
      }
      try {
        const raw = await scrapeSnapchatEuAdsGallery({
          domain,
          brandName,
          maxItemsGlobal: snapchatMaxItems,
          ...(typeof ids.snapchat === "string" && ids.snapchat.trim()
            ? { searchKeyword: ids.snapchat.trim() }
            : {}),
          countryCode:
            snapchatCountryIso &&
            snapchatCountryIso !== "ANYWHERE" &&
            snapchatCountryIso !== "WORLD" &&
            snapchatCountryIso !== "WORLDWIDE"
              ? snapchatCountryIso
              : undefined,
          startDate: snapchatStartDate || undefined,
          endDate: snapchatEndDate || undefined,
          ...(metaStatus === "ACTIVE" ? { status: "ACTIVE" as const } : {}),
        });
        out.snapchat.ads = [...raw]
          .sort((a, b) => snapchatDatasetRowMediaPriority(b) - snapchatDatasetRowMediaPriority(a))
          .slice(0, snapchatMaxItems)
          .map((row, i) =>
            snapchatDatasetItemToCard(row, i, {
              brandName,
              brandDomain: domain,
              ...(snapchatConfirmedAdvertiserQuery
                ? { confirmedAdvertiserQuery: snapchatConfirmedAdvertiserQuery }
                : {}),
            })
          );
      } catch (e) {
        out.snapchat.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Snapchat ads failed";
      }
    })(),
  ]);

  if (platformsRequested.has("snapchat") && out.snapchat.ads.length > 0) {
    out.snapchat = { ...out.snapchat, ads: sortSnapchatAdsForResponse(out.snapchat.ads) };
  }
  if (platformsRequested.has("tiktok") && out.tiktok.ads.length > 0) {
    out.tiktok = { ...out.tiktok, ads: sortTikTokAdsForResponse(out.tiktok.ads) };
  }
}
