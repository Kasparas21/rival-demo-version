import { NextResponse } from "next/server";
import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import type { InitialScrapePlatform } from "@/lib/ad-library/constants";
import { isRecentlyScrapedAt } from "@/lib/ad-library/recent-platform-refresh-copy";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";

type RecentRefreshPayload = {
  competitorId: string;
  competitorName: string;
  platforms: InitialScrapePlatform[];
  latestScrapeAt: string;
};

/** GET — platforms auto-refreshed recently for session join toast. */
export async function GET(req: Request): Promise<NextResponse> {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const url = new URL(req.url);
  const competitorIdParam = url.searchParams.get("competitorId")?.trim() || undefined;
  const domainParam = url.searchParams.get("domain")?.trim() || undefined;

  let competitorIds: string[] = [];
  let competitorNameById = new Map<string, string>();

  if (competitorIdParam || domainParam) {
    const competitor = await resolveCompetitorForUser(supabase, dataUserId, {
      competitorId: competitorIdParam,
      domain: domainParam,
    });
    if (!competitor) {
      return NextResponse.json({ ok: true, refresh: null });
    }
    competitorIds = [competitor.id];
    competitorNameById.set(
      competitor.id,
      competitor.brand_domain?.trim() || competitor.slug?.trim() || "this brand",
    );
  } else {
    const { data: rows, error } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, is_workspace_brand")
      .eq("user_id", dataUserId)
      .order("is_workspace_brand", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    for (const row of rows ?? []) {
      competitorIds.push(row.id);
      competitorNameById.set(
        row.id,
        row.brand_name?.trim() || row.name?.trim() || "this brand",
      );
    }
  }

  if (competitorIds.length === 0) {
    return NextResponse.json({ ok: true, refresh: null });
  }

  const nowMs = Date.now();
  const { data: trackingRows, error: trackingErr } = await supabase
    .from("competitor_platform_tracking")
    .select("competitor_id, platform, last_scrape_at, next_scrape_at")
    .in("competitor_id", competitorIds);

  if (trackingErr) {
    return NextResponse.json({ ok: false, error: trackingErr.message }, { status: 500 });
  }

  const byCompetitor = new Map<string, RecentRefreshPayload>();

  for (const row of trackingRows ?? []) {
    const competitorId = row.competitor_id;
    if (!competitorId || !isRecentlyScrapedAt(row.last_scrape_at, nowMs)) continue;

    const nextAt = row.next_scrape_at ? Date.parse(row.next_scrape_at) : NaN;
    if (!Number.isNaN(nextAt) && nextAt <= nowMs) continue;

    const platform = row.platform as InitialScrapePlatform;
    if (!platform?.trim()) continue;

    const lastScrapeAt = row.last_scrape_at!;
    const existing = byCompetitor.get(competitorId);
    if (!existing) {
      byCompetitor.set(competitorId, {
        competitorId,
        competitorName: competitorNameById.get(competitorId) ?? "this brand",
        platforms: [platform],
        latestScrapeAt: lastScrapeAt,
      });
      continue;
    }

    if (!existing.platforms.includes(platform)) {
      existing.platforms.push(platform);
    }
    if (Date.parse(lastScrapeAt) > Date.parse(existing.latestScrapeAt)) {
      existing.latestScrapeAt = lastScrapeAt;
    }
  }

  if (byCompetitor.size === 0) {
    return NextResponse.json({ ok: true, refresh: null });
  }

  const refresh = [...byCompetitor.values()].sort(
    (a, b) => Date.parse(b.latestScrapeAt) - Date.parse(a.latestScrapeAt),
  )[0]!;

  refresh.platforms.sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    ok: true,
    refresh: {
      competitorId: refresh.competitorId,
      competitorName: refresh.competitorName,
      platforms: refresh.platforms,
      latestScrapeAt: refresh.latestScrapeAt,
    },
  });
}
