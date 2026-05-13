import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function libraryItemIdFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function rawPayloadSubset(raw: unknown): {
  landing_page_url?: string;
  video_url?: string;
  headline?: string;
  cta_type?: string;
} {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pickStr = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
  return {
    landing_page_url: pickStr("landing_page_url") ?? pickStr("link_url"),
    video_url: pickStr("video_url") ?? pickStr("video_sd_url"),
    headline: pickStr("headline") ?? pickStr("title"),
    cta_type: pickStr("cta_type") ?? pickStr("cta_text"),
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const base = () =>
    supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("competitor_id", competitorId)
      .eq("platform", platform)
      .eq("funnel_stage", stageParam)
      .eq("is_active", true);

  const { count: totalInCell, error: countErr } = await base();

  if (countErr) {
    return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 });
  }

  let listQuery = supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_text, ad_creative_url, ai_extracted_angle, first_seen_at, last_seen_at, raw_payload"
    )
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .eq("platform", platform)
    .eq("funnel_stage", stageParam)
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    listQuery = listQuery.lt("first_seen_at", cursor);
  }

  const { data: rows, error: listErr } = await listQuery;

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const ads =
    rows?.map((r) => ({
      id: r.id,
      platform: r.platform,
      format: r.format,
      ad_text: r.ad_text,
      ad_creative_url: r.ad_creative_url,
      ai_extracted_angle: r.ai_extracted_angle,
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      /** Ad library card id when present in raw_payload (for saved-ads check/toggle). */
      library_item_id: libraryItemIdFromRaw(r.raw_payload),
      raw_payload_subset: rawPayloadSubset(r.raw_payload),
    })) ?? [];

  const nextCursor =
    rows && rows.length === limit ? (rows[rows.length - 1]!.first_seen_at ?? null) : null;

  return NextResponse.json(
    {
      ok: true,
      ads,
      total_in_cell: totalInCell ?? 0,
      next_cursor: nextCursor,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
