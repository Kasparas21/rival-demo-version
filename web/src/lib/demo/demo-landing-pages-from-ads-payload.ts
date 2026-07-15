import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import { DEMO_ADS } from "@/lib/demo/dashboard-demo-data";
import { FROZEN_PAGE_DETAILS } from "@/lib/demo/frozen/frozen-neptunas-website";

export type DemoLandingPageSnapshotRef = {
  hero_screenshot_url: string | null;
  screenshot_url: string;
  status: "ok";
};

export type DemoLandingPageFromAdsRow = {
  groupId: string;
  url: string;
  displayUrl: string;
  count: number;
  host: string;
  faviconUrl: string;
  totalAds: number;
  platformBreakdown: Record<string, number>;
  snapshot: DemoLandingPageSnapshotRef | null;
};

export type DemoLandingPageAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  first_seen_at: string;
  ai_extracted_angle: string | null;
};

function snapshotForPage(pageId: string): DemoLandingPageSnapshotRef | null {
  const latest = FROZEN_PAGE_DETAILS[pageId]?.snapshots[0];
  if (!latest?.screenshot_url) return null;
  return {
    hero_screenshot_url: latest.hero_screenshot_url ?? null,
    screenshot_url: latest.screenshot_url,
    status: "ok",
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url.split("/")[0] ?? url;
  }
}

function rowFromFrozenPage(
  pageId: string,
  opts: {
    url?: string;
    displayUrl?: string;
    count: number;
    platformBreakdown: Record<string, number>;
    groupId?: string;
  },
): DemoLandingPageFromAdsRow {
  const detail = FROZEN_PAGE_DETAILS[pageId];
  const url = opts.url ?? detail?.page.url ?? "";
  const host = hostFromUrl(url);
  return {
    groupId: opts.groupId ?? pageId,
    url,
    displayUrl: opts.displayUrl ?? displayUrlShort(url, 48),
    count: opts.count,
    host,
    faviconUrl: googleFaviconUrlForDomain(host),
    totalAds: opts.count,
    platformBreakdown: opts.platformBreakdown,
    snapshot: snapshotForPage(pageId),
  };
}

/** Frozen Neptunas landing pages detected from ads — screenshots from tracked page captures. */
export const DEMO_LANDING_PAGES_FROM_ADS_ROWS: DemoLandingPageFromAdsRow[] = [
  rowFromFrozenPage("fp-de715913057d", {
    count: 2,
    platformBreakdown: { meta: 2 },
  }),
  {
    groupId: "fp-53bbbb065507",
    url: "https://ad.doubleclick.net/ddm/trackclk/N448205.3156579FBIG/B35865588.447016359",
    displayUrl: displayUrlShort(
      "https://ad.doubleclick.net/ddm/trackclk/N448205.3156579FBIG/B35865588.447016359",
      48,
    ),
    count: 1,
    host: "ad.doubleclick.net",
    faviconUrl: googleFaviconUrlForDomain("ad.doubleclick.net"),
    totalAds: 1,
    platformBreakdown: { meta: 1 },
    snapshot: {
      hero_screenshot_url:
        "/demo/frozen/neptunas.lt/pages/fp-53bbbb065507/d0c43cef-3d18-43a4-80dd-8c9cd6a49926-hero.png",
      screenshot_url:
        "/demo/frozen/neptunas.lt/pages/fp-53bbbb065507/d0c43cef-3d18-43a4-80dd-8c9cd6a49926-full.png",
      status: "ok",
    },
  },
];

const ADS_BY_GROUP: Record<string, string[]> = {
  "fp-de715913057d": ["meta-1", "meta-2"],
  "fp-53bbbb065507": ["meta-1"],
};

const DEMO_AD_BY_ID = new Map(DEMO_ADS.map((ad) => [ad.id, ad]));

export function demoAdsForLandingPageGroup(groupId: string): DemoLandingPageAdRow[] {
  const ids = ADS_BY_GROUP[groupId] ?? DEMO_ADS.slice(0, 4).map((a) => a.id);
  return ids
    .map((id) => DEMO_AD_BY_ID.get(id))
    .filter((ad): ad is (typeof DEMO_ADS)[number] => Boolean(ad))
    .map((ad) => ({
      id: ad.id,
      platform: ad.platform,
      format: ad.format ?? (ad.isVideo ? "Video" : "Image"),
      ad_text: [ad.headline, ad.body].filter(Boolean).join(" — "),
      ad_creative_url: null,
      first_seen_at: "2026-06-01T10:00:00.000Z",
      ai_extracted_angle: ad.angle ?? null,
    }));
}

export function demoLandingPagePreviewUrl(
  snapshot: DemoLandingPageSnapshotRef | null | undefined,
): string | null {
  if (!snapshot) return null;
  return snapshot.hero_screenshot_url ?? snapshot.screenshot_url ?? null;
}
