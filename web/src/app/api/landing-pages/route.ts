import { NextResponse } from "next/server";

import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort, normalizeLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type LandingPageGroup = {
  groupId: string;
  url: string;
  displayUrl: string;
  totalAds: number;
  activeAds: number;
  killedAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  platformBreakdown: Record<string, number>;
  topAds: AdReference[];
};

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

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, name, last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: ads, error: adsErr } = await supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, is_active, raw_payload"
    )
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId);

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
    const lpUrl = extractLandingPageUrl(ad.platform, ad.raw_payload);
    const googleHostNorm = !lpUrl ? extractGoogleHostnameLandingKey(ad.platform, ad.raw_payload) : null;

    if (!lpUrl && !googleHostNorm) {
      adsWithoutLp++;
      continue;
    }

    const isActive = new Date(ad.last_seen_at).getTime() >= killedThreshold;

    if (lpUrl) {
      const groupId = lpUrl;
      let group = groups.get(groupId);
      if (!group) {
        group = {
          groupId,
          url: lpUrl,
          displayUrl: displayUrlShort(lpUrl),
          totalAds: 0,
          activeAds: 0,
          killedAds: 0,
          firstSeenAt: ad.first_seen_at,
          lastSeenAt: ad.last_seen_at,
          platformBreakdown: {},
          topAds: [],
        };
        groups.set(groupId, group);
      }
      accumulateAd(group, ad, isActive);
      continue;
    }

    if (googleHostNorm) {
      const groupId = `google-host:${googleHostNorm}`;
      let group = groups.get(groupId);
      const hostShort = displayUrlShort(googleHostNorm);
      if (!group) {
        group = {
          groupId,
          url: googleHostNorm,
          displayUrl: `Multiple search ads · ${hostShort}`,
          totalAds: 0,
          activeAds: 0,
          killedAds: 0,
          firstSeenAt: ad.first_seen_at,
          lastSeenAt: ad.last_seen_at,
          platformBreakdown: {},
          topAds: [],
        };
        groups.set(groupId, group);
      }
      accumulateAd(group, ad, isActive);
    }
  }

  for (const group of groups.values()) {
    group.topAds.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    group.topAds = group.topAds.slice(0, 5);
  }

  const landingPages = Array.from(groups.values()).sort((a, b) => b.totalAds - a.totalAds);

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
    },
    landingPages,
    summary: {
      totalUniqueUrls: groups.size,
      totalAdsWithLp: Array.from(groups.values()).reduce((sum, g) => sum + g.totalAds, 0),
      adsWithoutLp,
      platformCounts,
    },
  });
}

function accumulateAd(group: LandingPageGroup, ad: LandingPageRow, isActive: boolean) {
  group.totalAds++;
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

type LandingPageRow = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};
