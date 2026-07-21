import { NextResponse } from "next/server";

import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type TimelineAdDto = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  is_winner: boolean;
  is_killed: boolean;
};

export async function GET(request: Request) {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);
  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await db
    .from("saved_competitors")
    .select("id, brand_name, name, brand_domain, last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: ads, error: adsErr } = await db
    .from("scraped_ads")
    .select(
      "id, platform, ad_creative_url, archived_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, format, is_active, raw_payload",
    )
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .order("first_seen_at", { ascending: false })
    .limit(2500);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const { data: tests } = await db
    .from("creative_tests")
    .select("winner_ad_id")
    .eq("competitor_id", competitorId)
    .not("winner_ad_id", "is", null);

  const winnerIds = new Set(
    (tests ?? [])
      .map((t) => t.winner_ad_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const lastScrapedAt = competitor.last_scraped_at ?? null;

  const rows = (ads ?? []).slice().reverse();
  const hydrated: TimelineAdDto[] = rows.map((ad) => ({
    id: ad.id,
    platform: ad.platform,
    ad_creative_url: ad.ad_creative_url,
    archived_creative_url: ad.archived_creative_url,
    ad_text: ad.ad_text,
    ai_extracted_angle: ad.ai_extracted_angle,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    format: ad.format,
    is_winner: winnerIds.has(ad.id),
    is_killed: resolveTimelineAdKilled(
      {
        platform: ad.platform,
        last_seen_at: ad.last_seen_at,
        is_active: ad.is_active,
        raw_payload: ad.raw_payload,
      },
      lastScrapedAt,
    ),
  }));

  const platformCounts: Record<string, number> = {};
  for (const ad of hydrated) {
    platformCounts[ad.platform] = (platformCounts[ad.platform] ?? 0) + 1;
  }

  const allDates = hydrated.flatMap((ad) => [
    new Date(ad.first_seen_at).getTime(),
    new Date(ad.last_seen_at).getTime(),
  ]);
  const earliestDate = allDates.length ? Math.min(...allDates) : Date.now();
  const latestDate = allDates.length ? Math.max(...allDates) : Date.now();

  const displayName = competitor.brand_name?.trim() || competitor.name?.trim() || "Competitor";

  return NextResponse.json({
    ok: true,
    competitor: {
      id: competitor.id,
      name: displayName,
      lastScrapedAt: competitor.last_scraped_at,
    },
    ads: hydrated,
    platformCounts,
    dateRange: {
      earliest: new Date(earliestDate).toISOString(),
      latest: new Date(latestDate).toISOString(),
    },
  });
}
