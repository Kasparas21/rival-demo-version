import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import {
  hostFromLandingPageUrl,
  landingPageGroupKey,
  normalizeLandingPageUrl,
} from "@/lib/landing-pages/normalize-url";
import { scrapeSingleLandingPage } from "./scrape-single";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type AdRow = {
  platform: string;
  raw_payload: Json;
};

function competitorRootHost(competitorWebsite: string): string | null {
  return hostFromLandingPageUrl(competitorWebsite);
}

function homepageGroupKey(competitorWebsite: string): string | null {
  const normalized = normalizeLandingPageUrl(competitorWebsite);
  if (!normalized) return null;
  return landingPageGroupKey(normalized);
}

/** True when an ad destination host is the competitor domain or a subdomain of it. */
export function adHostMatchesCompetitor(adHost: string, rootHost: string): boolean {
  const ad = adHost.toLowerCase();
  const root = rootHost.toLowerCase();
  return ad === root || ad.endsWith(`.${root}`);
}

/** Derive a human label from URL path, e.g. /pricing → "Pricing". */
export function labelFromLandingPageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "Homepage";
    const last = segments[segments.length - 1] ?? "";
    const cleaned = last.replace(/[-_]+/g, " ").replace(/\.(html?|php|aspx?)$/i, "");
    if (!cleaned) return "Ad Landing Page";
    return cleaned
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "Ad Landing Page";
  }
}

function extractUrlFromAd(ad: AdRow): string | null {
  const lpUrl = extractLandingPageUrl(ad.platform, ad.raw_payload);
  if (lpUrl) return lpUrl;
  return extractGoogleHostnameLandingKey(ad.platform, ad.raw_payload);
}

/** Canonical landing-page keys currently referenced by active scraped ads. */
export function collectAdLandingPageKeys(
  ads: AdRow[],
  competitorWebsite: string,
): Set<string> {
  const rootHost = competitorRootHost(competitorWebsite);
  const homeKey = homepageGroupKey(competitorWebsite);
  const keys = new Set<string>();
  if (!rootHost) return keys;

  const seen = new Set<string>();
  for (const ad of ads) {
    const rawUrl = extractUrlFromAd(ad);
    if (!rawUrl) continue;

    const groupKey = landingPageGroupKey(rawUrl);
    if (!groupKey || seen.has(groupKey)) continue;
    seen.add(groupKey);

    if (homeKey && groupKey === homeKey) continue;

    const adHost = hostFromLandingPageUrl(groupKey);
    if (!adHost || !adHostMatchesCompetitor(adHost, rootHost)) continue;

    keys.add(groupKey);
  }

  return keys;
}

/** Stop spying on ad URLs that no longer appear in any active scraped ad. */
export async function deactivateAdLandingPagesNotInActiveAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  activeAdUrlKeys: Set<string>,
): Promise<number> {
  const { data: spiedPages } = await admin
    .from("landing_pages")
    .select("id, url")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("auto_detected_from", "ads");

  if (!spiedPages?.length) return 0;

  const staleIds = spiedPages
    .filter((page) => {
      const key = landingPageGroupKey(page.url);
      return key && !activeAdUrlKeys.has(key);
    })
    .map((page) => page.id);

  if (!staleIds.length) return 0;

  const { error } = await admin
    .from("landing_pages")
    .update({
      is_active: false,
      next_screenshot_at: null,
    })
    .in("id", staleIds);

  if (error) {
    console.error("[landing-page-sync] deactivate stale ad pages failed", error.message);
    return 0;
  }

  return staleIds.length;
}

export async function syncLandingPagesFromAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
  ads: AdRow[],
  options?: { autoSpyNewLandingPages?: boolean },
): Promise<string[]> {
  const rootHost = competitorRootHost(competitorWebsite);
  const homeKey = homepageGroupKey(competitorWebsite);
  if (!rootHost) return [];

  const { data: existingPages } = await admin
    .from("landing_pages")
    .select("url")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  const existingUrls = new Set(
    (existingPages ?? [])
      .map((p) => landingPageGroupKey(p.url))
      .filter((k): k is string => Boolean(k)),
  );

  const activeAdUrlKeys = collectAdLandingPageKeys(ads, competitorWebsite);
  const autoSpy = options?.autoSpyNewLandingPages === true;
  const now = new Date().toISOString();
  const newAutoSpyPageIds: string[] = [];

  for (const groupKey of activeAdUrlKeys) {
    if (existingUrls.has(groupKey)) continue;

    const row: Database["public"]["Tables"]["landing_pages"]["Insert"] = {
      competitor_id: competitorId,
      user_id: userId,
      url: groupKey,
      label: labelFromLandingPageUrl(groupKey),
      page_type: "custom",
      auto_detected_from: "ads",
      is_active: autoSpy,
      next_screenshot_at: autoSpy ? now : null,
    };

    const { data: inserted, error } = await admin
      .from("landing_pages")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[landing-page-sync] insert ad landing page failed", error.message);
      continue;
    }

    if (inserted?.id && autoSpy) {
      newAutoSpyPageIds.push(inserted.id);
    }

    existingUrls.add(groupKey);
  }

  return newAutoSpyPageIds;
}

async function captureAutoSpyPages(admin: AdminClient, pageIds: string[]): Promise<void> {
  for (const pageId of pageIds) {
    const { data: page } = await admin.from("landing_pages").select("*").eq("id", pageId).maybeSingle();
    if (!page?.is_active) continue;
    try {
      await scrapeSingleLandingPage(admin, page, { previewOnly: false });
    } catch (err) {
      console.error("[landing-page-sync] auto-spy capture failed", pageId, err);
    }
  }
}

/** Load active ads for a competitor, sync landing pages, and stop spying on stale URLs. */
export async function syncLandingPagesFromCompetitorAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
): Promise<void> {
  const { data: competitor } = await admin
    .from("saved_competitors")
    .select("auto_spy_new_landing_pages")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  const autoSpyNewLandingPages = competitor?.auto_spy_new_landing_pages === true;

  const { data: ads } = await admin
    .from("scraped_ads")
    .select("platform, raw_payload")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(2000);

  const activeAds = ads ?? [];
  const activeAdUrlKeys = collectAdLandingPageKeys(activeAds, competitorWebsite);

  const newAutoSpyPageIds = await syncLandingPagesFromAds(
    admin,
    competitorId,
    userId,
    competitorWebsite,
    activeAds,
    { autoSpyNewLandingPages },
  );

  await deactivateAdLandingPagesNotInActiveAds(admin, competitorId, userId, activeAdUrlKeys);

  if (newAutoSpyPageIds.length) {
    void captureAutoSpyPages(admin, newAutoSpyPageIds);
  }
}
