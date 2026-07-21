import { NextResponse } from "next/server";

import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { libraryItemIdFromRawPayload } from "@/lib/saved-ads/resolve-scraped-ad";
import { resolveCellAdLifecycle } from "@/lib/strategy-overview/cell-ad-lifecycle";
import { bucketAdsByFunnelStage } from "@/lib/strategy-overview/strategyDerivation";
import type { FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORMS = new Set([
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "pinterest",
  "snapchat",
]);

const STAGES = new Set(["TOF", "MOF", "BOF"]);

function rawPayloadSubset(raw: unknown): {
  landing_page_url?: string;
  video_url?: string;
  poster_url?: string;
  headline?: string;
  cta_type?: string;
} {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pickStr = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
  return {
    landing_page_url: pickStr("landing_page_url") ?? pickStr("link_url") ?? pickStr("destinationUrl"),
    video_url:
      pickStr("video_url") ??
      pickStr("videoUrl") ??
      pickStr("video_sd_url") ??
      pickStr("video_hd_url"),
    poster_url: pickStr("img") ?? pickStr("thumbnail") ?? pickStr("image_url"),
    headline: pickStr("headline") ?? pickStr("title"),
    cta_type: pickStr("cta_type") ?? pickStr("cta_text") ?? pickStr("cta"),
  };
}

export async function GET(req: Request): Promise<NextResponse> {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const url = new URL(req.url);
  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();
  const platform = (url.searchParams.get("platform") ?? "").trim().toLowerCase();
  const stageParam = (url.searchParams.get("stage") ?? "").trim().toUpperCase();

  let limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  limit = Math.min(200, limit);

  const cursor = (url.searchParams.get("cursor") ?? "").trim();

  if (!competitorId || !PLATFORMS.has(platform) || !STAGES.has(stageParam)) {
    return NextResponse.json(
      { ok: false, error: "competitorId, platform, and stage (TOF|MOF|BOF) are required" },
      { status: 400 }
    );
  }

  const { data: owned } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const base = () =>
    supabase
      .from("scraped_ads")
      .select(
        "id, platform, format, ad_text, ad_creative_url, ai_extracted_angle, funnel_stage, first_seen_at, last_seen_at, is_active, raw_payload"
      )
      .eq("user_id", dataUserId)
      .eq("competitor_id", competitorId)
      .eq("platform", platform)
      .eq("is_active", true)
      .order("first_seen_at", { ascending: false })
      .limit(1000);

  const { data: allRows, error: listErr } = await base();

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const stage = stageParam as FunnelStage;
  const platformKey = platform as StrategyPlatform;
  const bucketed = bucketAdsByFunnelStage(
    platformKey,
    (allRows ?? []).map((r) => ({
      id: r.id,
      platform: r.platform,
      ad_text: r.ad_text ?? "",
      format: r.format ?? "",
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      ai_extracted_angle: r.ai_extracted_angle,
      funnel_stage: r.funnel_stage,
      is_active: r.is_active,
      raw_payload: r.raw_payload,
    })),
  );
  const inCell = bucketed.get(stage) ?? [];
  const rowById = new Map((allRows ?? []).map((r) => [r.id, r]));

  const totalInCell = inCell.length;

  let page = inCell;
  if (cursor) {
    const cursorMs = Date.parse(cursor);
    if (Number.isFinite(cursorMs)) {
      page = inCell.filter((ad) => Date.parse(ad.first_seen_at) < cursorMs);
    }
  }
  page = page.slice(0, limit);

  const ads = page.map((r) => {
    const source = rowById.get(r.id);
    const lifecycle = resolveCellAdLifecycle({
      platform: r.platform,
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      is_active: r.is_active ?? true,
      raw_payload: r.raw_payload,
    });
    return {
      id: r.id,
      platform: r.platform,
      format: r.format,
      ad_text: r.ad_text,
      ad_creative_url: source?.ad_creative_url ?? null,
      ai_extracted_angle: r.ai_extracted_angle,
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      is_active: r.is_active,
      is_running: lifecycle.isRunning,
      runtime_days: lifecycle.runtimeDays,
      ended_days_ago: lifecycle.endedDaysAgo,
      status_label: lifecycle.statusLabel,
      sort_runtime_ms: lifecycle.sortRuntimeMs,
      library_item_id: libraryItemIdFromRawPayload(r.raw_payload),
      raw_payload_subset: rawPayloadSubset(r.raw_payload),
    };
  });

  const nextCursor =
    page.length === limit ? (page[page.length - 1]!.first_seen_at ?? null) : null;

  return NextResponse.json(
    {
      ok: true,
      ads,
      total_in_cell: totalInCell,
      next_cursor: nextCursor,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
