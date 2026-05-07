import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadSavedCompetitorForUser } from "@/lib/strategy-overview/recompute-strategy-overview";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

const PLATFORMS = new Set<string>([
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "microsoft",
  "pinterest",
  "snapchat",
  "youtube",
  "reddit",
]);

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  const platform = (url.searchParams.get("platform") ?? "").trim().toLowerCase();

  if (!domain || !platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ ok: false, error: "competitorDomain and platform required" }, { status: 400 });
  }

  const meta = await loadSavedCompetitorForUser(supabase, user.id, domain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("scraped_ads")
    .select("id, ad_text, ad_creative_url, format, first_seen_at, funnel_stage, ai_extracted_angle")
    .eq("competitor_id", meta.competitorId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("platform", platform)
    .order("last_seen_at", { ascending: false })
    .limit(10);

  const ads =
    rows?.map((r) => ({
      id: r.id,
      copyPreview: r.ad_text.slice(0, 220),
      creativeUrl: r.ad_creative_url,
      format: r.format,
      firstSeenAt: r.first_seen_at,
      funnelStage: r.funnel_stage,
      angle: r.ai_extracted_angle,
    })) ?? [];

  const angles = new Map<string, number>();
  for (const r of rows ?? []) {
    const a = (r.ai_extracted_angle ?? "unknown").trim() || "unknown";
    angles.set(a, (angles.get(a) ?? 0) + 1);
  }

  return NextResponse.json({
    ok: true,
    platform: platform as StrategyPlatform,
    ads,
    angleDistribution: [...angles.entries()].map(([angle, count]) => ({ angle, count })),
  });
}
