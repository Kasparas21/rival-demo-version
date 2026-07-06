import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort, hostFromLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import type { Json } from "@/lib/supabase/types";

export type LandingPageAdReference = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};

export type LandingPageGroup = {
  groupId: string;
  url: string;
  displayUrl: string;
  count: number;
  host: string;
  faviconUrl: string;
  totalAds: number;
  activeAds: number;
  killedAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  platformBreakdown: Record<string, number>;
  topAds: LandingPageAdReference[];
};

export type LandingPageAdRow = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  raw_payload: Json;
};

export type LandingPageGroupingResult = {
  groups: LandingPageGroup[];
  adsWithoutLp: number;
  platformCounts: Record<string, number>;
};

function accumulateAd(group: LandingPageGroup, ad: LandingPageAdRow, isActive: boolean) {
  group.totalAds++;
  group.count = group.totalAds;
  if (isActive) group.activeAds++;
  else group.killedAds++;

  if (new Date(ad.first_seen_at).getTime() < new Date(group.firstSeenAt).getTime()) {
    group.firstSeenAt = ad.first_seen_at;
  }
  if (new Date(ad.last_seen_at).getTime() > new Date(group.lastSeenAt).getTime()) {
    group.lastSeenAt = ad.last_seen_at;
  }

  group.platformBreakdown[ad.platform] = (group.platformBreakdown[ad.platform] ?? 0) + 1;

  group.topAds.push({
    id: ad.id,
    platform: ad.platform,
    ad_creative_url: ad.ad_creative_url,
    ad_text: ad.ad_text,
    ai_extracted_angle: ad.ai_extracted_angle,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    is_active: isActive,
  });
}

export function groupLandingPagesFromAds(
  ads: LandingPageAdRow[],
  lastScrapedAt: string | null,
): LandingPageGroupingResult {
  const lastScrapedMs = lastScrapedAt ? new Date(lastScrapedAt).getTime() : Date.now();
  const killedThreshold = lastScrapedMs - 24 * 60 * 60 * 1000;

  const groups = new Map<string, LandingPageGroup>();
  let adsWithoutLp = 0;

  for (const row of ads) {
    const lpUrl = extractLandingPageUrl(row.platform, row.raw_payload);
    const googleHostNorm = !lpUrl ? extractGoogleHostnameLandingKey(row.platform, row.raw_payload) : null;

    if (!lpUrl && !googleHostNorm) {
      adsWithoutLp++;
      continue;
    }

    const isActive = new Date(row.last_seen_at).getTime() >= killedThreshold;

    if (lpUrl) {
      const groupId = lpUrl;
      let group = groups.get(groupId);
      if (!group) {
        const host = hostFromLandingPageUrl(lpUrl);
        if (!host) {
          adsWithoutLp++;
          continue;
        }
        group = {
          groupId,
          url: lpUrl,
          displayUrl: displayUrlShort(lpUrl),
          count: 0,
          host,
          faviconUrl: googleFaviconUrlForDomain(host, 64),
          totalAds: 0,
          activeAds: 0,
          killedAds: 0,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          platformBreakdown: {},
          topAds: [],
        };
        groups.set(groupId, group);
      }
      accumulateAd(group, row, isActive);
      continue;
    }

    if (googleHostNorm) {
      const groupId = `google-host:${googleHostNorm}`;
      let group = groups.get(groupId);
      const hostShort = displayUrlShort(googleHostNorm);
      const host = hostFromLandingPageUrl(googleHostNorm);
      if (!host) {
        adsWithoutLp++;
        continue;
      }
      if (!group) {
        group = {
          groupId,
          url: googleHostNorm,
          displayUrl: `Multiple search ads · ${hostShort}`,
          count: 0,
          host,
          faviconUrl: googleFaviconUrlForDomain(host, 64),
          totalAds: 0,
          activeAds: 0,
          killedAds: 0,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          platformBreakdown: {},
          topAds: [],
        };
        groups.set(groupId, group);
      }
      accumulateAd(group, row, isActive);
    }
  }

  for (const group of groups.values()) {
    group.topAds.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    group.topAds = group.topAds.slice(0, 5);
  }

  const landingPagesAll = Array.from(groups.values()).sort((a, b) => b.totalAds - a.totalAds);

  const platformCounts: Record<string, number> = {};
  for (const group of groups.values()) {
    for (const [platform, count] of Object.entries(group.platformBreakdown)) {
      platformCounts[platform] = (platformCounts[platform] ?? 0) + count;
    }
  }

  return {
    groups: landingPagesAll,
    adsWithoutLp,
    platformCounts,
  };
}
