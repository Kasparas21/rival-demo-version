import { NextResponse } from "next/server";
import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import type { InitialScrapePlatform } from "@/lib/ad-library/constants";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { buildPlatformScheduleDebug } from "@/lib/ad-library/platform-tracking-schedule";
import type { PlatformClassification } from "@/lib/ad-library/platform-prioritization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const url = new URL(req.url);
  const competitorId = url.searchParams.get("competitorId") ?? undefined;
  const domain = url.searchParams.get("domain") ?? undefined;

  const competitor = await resolveCompetitorForUser(supabase, dataUserId, {
    competitorId,
    domain,
  });

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("competitor_platform_tracking")
    .select(
      "platform, classification, active_ad_count, high_coverage_demoted, classified_at, next_scrape_at, last_scrape_at"
    )
    .eq("competitor_id", competitor.id)
    .order("platform");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const cacheScrapedAtByPlatform = new Map<string, string>();
  const domainHint = competitor.brand_domain?.trim() ?? domain?.trim() ?? "";
  if (domainHint) {
    const { readDomains } = await resolveAdsCacheDomainForUser(supabase, dataUserId, domainHint);
    if (readDomains.length > 0) {
      const { data: cacheRows } = await supabase
        .from("ads_cache")
        .select("platform, scraped_at")
        .eq("user_id", dataUserId)
        .in("competitor_domain", readDomains);
      for (const row of cacheRows ?? []) {
        const platform = String(row.platform ?? "").trim();
        const scrapedAt = row.scraped_at ? String(row.scraped_at) : "";
        if (!platform || !scrapedAt) continue;
        const prev = cacheScrapedAtByPlatform.get(platform);
        if (!prev || Date.parse(scrapedAt) > Date.parse(prev)) {
          cacheScrapedAtByPlatform.set(platform, scrapedAt);
        }
      }
    }
  }

  const nowMs = Date.now();
  const trackingByPlatform = new Map((rows ?? []).map((r) => [r.platform, r]));

  const platformPayload = (rows ?? []).map((r) => {
    const platform = r.platform as InitialScrapePlatform;
    const classification = r.classification as PlatformClassification;
    const lastScrapeAt = r.last_scrape_at ?? cacheScrapedAtByPlatform.get(r.platform) ?? null;
    const schedule = buildPlatformScheduleDebug({
      platform,
      classification,
      activeAdCount: r.active_ad_count,
      lastScrapeAt,
      nextScrapeAt: r.next_scrape_at,
      nowMs,
    });
    return {
      platform: r.platform,
      classification: r.classification,
      activeAdCount: r.active_ad_count,
      highCoverageDemoted: r.high_coverage_demoted,
      classifiedAt: r.classified_at,
      lastScrapeAt,
      nextScrapeAt: r.next_scrape_at,
      refreshIntervalDays: schedule.refreshIntervalDays,
      adsPerRefresh: schedule.adsPerRefresh,
      nextScrapeWindow: schedule.nextScrapeWindow,
    };
  });

  for (const [platform, scrapedAt] of cacheScrapedAtByPlatform) {
    if (trackingByPlatform.has(platform)) continue;
    const initialPlatform = platform as InitialScrapePlatform;
    const schedule = buildPlatformScheduleDebug({
      platform: initialPlatform,
      classification: "INACTIVE",
      activeAdCount: 0,
      lastScrapeAt: scrapedAt,
      nextScrapeAt: null,
      nowMs,
    });
    platformPayload.push({
      platform,
      classification: "INACTIVE",
      activeAdCount: 0,
      highCoverageDemoted: false,
      classifiedAt: scrapedAt,
      lastScrapeAt: scrapedAt,
      nextScrapeAt: schedule.nextScrapeAt,
      refreshIntervalDays: schedule.refreshIntervalDays,
      adsPerRefresh: schedule.adsPerRefresh,
      nextScrapeWindow: schedule.nextScrapeWindow,
    });
  }

  platformPayload.sort((a, b) => a.platform.localeCompare(b.platform));

  return NextResponse.json({
    ok: true,
    competitorId: competitor.id,
    platforms: platformPayload,
  });
}
