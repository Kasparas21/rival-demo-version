import { NextResponse } from "next/server";

import { buildBlockedHostsIndex, resolveSnapshotWithBlockedInheritance } from "@/lib/landing-pages/blocked-inheritance";
import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort, hostFromLandingPageUrl, landingPageGroupKey } from "@/lib/landing-pages/normalize-url";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { ensureDefaultLandingPagesForCompetitor } from "@/lib/landing-page-tracker/create-defaults";
import { syncLandingPagesFromCompetitorAds } from "@/lib/landing-page-tracker/sync-landing-pages-from-ads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdReference = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};

type LandingPageSnapshotRef = {
  hero_screenshot_url: string | null;
  screenshot_url: string;
  status: "ok" | "blocked";
  taken_at: string;
  inheritedBlocked?: boolean;
};

type LandingPageGroup = {
  groupId: string;
  url: string;
  displayUrl: string;
  /** Mirrors totalAds — Foreplay-style consumers expect `count`. */
  count: number;
  host: string;
  faviconUrl: string;
  totalAds: number;
  activeAds: number;
  killedAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  platformBreakdown: Record<string, number>;
  topAds: AdReference[];
  snapshot: LandingPageSnapshotRef | null;
  /** User opted into ongoing landing-page screenshots for this URL. */
  isTracking: boolean;
};

type LandingPageRow = {
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

function parseLimit(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get("competitorId");
  const limit = parseLimit(searchParams.get("limit"), 100, 500);

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, name, last_scraped_at, brand_domain, slug, auto_spy_new_landing_pages")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  await ensureDefaultLandingPagesForCompetitor(admin, competitorId, user.id);
  const website = competitor.brand_domain?.trim() || competitor.slug?.trim();
  if (website) {
    try {
      await syncLandingPagesFromCompetitorAds(admin, competitorId, user.id, website);
    } catch (syncErr) {
      console.error("[landing-pages] sync from ads failed", syncErr);
    }
  }

  const { data: ads, error: adsErr } = await supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, is_active, raw_payload",
    )
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const lastScrapedAt = competitor.last_scraped_at
    ? new Date(competitor.last_scraped_at).getTime()
    : Date.now();
  const killedThreshold = lastScrapedAt - 24 * 60 * 60 * 1000;

  const groups = new Map<string, LandingPageGroup>();
  let adsWithoutLp = 0;

  for (const ad of ads ?? []) {
    const row = ad as LandingPageRow;
    const lpUrl = extractLandingPageUrl(row.platform, row.raw_payload);
    const googleHostNorm = !lpUrl ? extractGoogleHostnameLandingKey(row.platform, row.raw_payload) : null;

    if (!lpUrl && !googleHostNorm) {
      adsWithoutLp++;
      continue;
    }

    const isActive = new Date(row.last_seen_at).getTime() >= killedThreshold;

    if (lpUrl) {
      const groupKey = landingPageGroupKey(lpUrl);
      if (!groupKey) {
        adsWithoutLp++;
        continue;
      }
      const groupId = groupKey;
      let group = groups.get(groupId);
      if (!group) {
        const host = hostFromLandingPageUrl(groupKey);
        if (!host) {
          adsWithoutLp++;
          continue;
        }
        group = {
          groupId,
          url: groupKey,
          displayUrl: displayUrlShort(groupKey),
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
          snapshot: null,
          isTracking: false,
        };
        groups.set(groupId, group);
      }
      accumulateAd(group, row, isActive);
      continue;
    }

    if (googleHostNorm) {
      const groupKey = landingPageGroupKey(googleHostNorm);
      if (!groupKey) {
        adsWithoutLp++;
        continue;
      }
      const groupId = groupKey;
      let group = groups.get(groupId);
      const host = hostFromLandingPageUrl(groupKey);
      if (!host) {
        adsWithoutLp++;
        continue;
      }
      if (!group) {
        group = {
          groupId,
          url: groupKey,
          displayUrl: displayUrlShort(groupKey),
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
          snapshot: null,
          isTracking: false,
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
  const landingPagesSlice = landingPagesAll.slice(0, limit);

  const metaByGroupKey = await loadPageMetaByGroupKey(supabase, competitorId, user.id);
  const snapshotByGroupKey = new Map<string, LandingPageSnapshotRef>();
  for (const [key, meta] of metaByGroupKey) {
    if (meta.snapshot) snapshotByGroupKey.set(key, meta.snapshot);
  }
  const blockedHosts = buildBlockedHostsIndex(snapshotByGroupKey);
  for (const group of landingPagesSlice) {
    const meta = metaByGroupKey.get(group.groupId);
    group.snapshot = resolveSnapshotWithBlockedInheritance(group.groupId, snapshotByGroupKey, blockedHosts);
    group.isTracking = meta?.isTracking ?? false;
  }

  const landingPages = landingPagesSlice;

  const platformCounts: Record<string, number> = {};
  for (const group of groups.values()) {
    for (const [platform, count] of Object.entries(group.platformBreakdown)) {
      platformCounts[platform] = (platformCounts[platform] ?? 0) + count;
    }
  }

  const displayName = competitor.brand_name?.trim() || competitor.name?.trim() || "Competitor";

  return NextResponse.json({
    ok: true,
    competitor: {
      id: competitor.id,
      name: displayName,
      lastScrapedAt: competitor.last_scraped_at,
      autoSpyNewLandingPages: competitor.auto_spy_new_landing_pages === true,
    },
    landingPages,
    summary: {
      totalUniqueUrls: landingPagesAll.length,
      totalAdsWithLp: landingPagesAll.reduce((sum, g) => sum + g.totalAds, 0),
      adsWithoutLp,
      platformCounts,
    },
  });
}

type SnapshotLoaderClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type LandingPageGroupMeta = {
  snapshot: LandingPageSnapshotRef | null;
  isTracking: boolean;
};

async function loadPageMetaByGroupKey(
  supabase: SnapshotLoaderClient,
  competitorId: string,
  userId: string,
): Promise<Map<string, LandingPageGroupMeta>> {
  const result = new Map<string, LandingPageGroupMeta>();

  const { data: pages } = await supabase
    .from("landing_pages")
    .select("id, url, is_active")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  if (!pages?.length) return result;

  const pageIdToKey = new Map<string, string>();
  for (const page of pages) {
    const key = landingPageGroupKey(page.url);
    if (!key) continue;
    pageIdToKey.set(page.id, key);
    const existing = result.get(key);
    const isTracking = page.is_active === true;
    if (existing) {
      result.set(key, { ...existing, isTracking: existing.isTracking || isTracking });
    } else {
      result.set(key, { snapshot: null, isTracking });
    }
  }

  const pageIds = pages.map((p) => p.id);
  const { data: snapshots } = await supabase
    .from("landing_page_snapshots")
    .select("landing_page_id, screenshot_url, hero_screenshot_url, status, taken_at")
    .in("landing_page_id", pageIds)
    .order("taken_at", { ascending: false });

  const latestByPageId = new Map<string, (typeof snapshots extends (infer T)[] | null ? T : never)>();
  for (const snap of snapshots ?? []) {
    if (!latestByPageId.has(snap.landing_page_id)) {
      latestByPageId.set(snap.landing_page_id, snap);
    }
  }

  for (const [pageId, snap] of latestByPageId) {
    const groupKey = pageIdToKey.get(pageId);
    if (!groupKey) continue;
    const status = snap.status === "blocked" ? "blocked" : "ok";
    const snapshot: LandingPageSnapshotRef = {
      hero_screenshot_url: snap.hero_screenshot_url,
      screenshot_url: snap.screenshot_url,
      status,
      taken_at: snap.taken_at,
    };
    const existing = result.get(groupKey);
    result.set(groupKey, {
      snapshot,
      isTracking: existing?.isTracking ?? false,
    });
  }

  return result;
}

function accumulateAd(group: LandingPageGroup, ad: LandingPageRow, isActive: boolean) {
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
