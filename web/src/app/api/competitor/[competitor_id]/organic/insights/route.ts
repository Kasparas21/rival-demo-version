import { NextResponse } from "next/server";

import { enrichOrganicPostForApi } from "@/lib/organic-content/post-display";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const platform = new URL(req.url).searchParams.get("platform")?.trim() || "all";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, socials, organic_next_scrape_at, organic_last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr) {
    return NextResponse.json({ ok: false, error: compErr.message }, { status: 500 });
  }
  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: insight, error: insightErr } = await supabase
    .from("organic_insights")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .eq("platform", platform)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightErr) {
    return NextResponse.json({ ok: false, error: insightErr.message }, { status: 500 });
  }

  const { data: platformRows } = await supabase
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id);

  const platformsWithPosts = [...new Set((platformRows ?? []).map((r) => r.platform))];

  const postIds = new Set<string>();
  if (insight) {
    for (const section of [insight.whats_working, insight.whats_flopping]) {
      if (Array.isArray(section)) {
        for (const item of section) {
          const rec = item as { post_ids?: string[] };
          for (const id of rec.post_ids ?? []) postIds.add(id);
        }
      }
    }
    if (Array.isArray(insight.hot_right_now)) {
      for (const item of insight.hot_right_now) {
        const rec = item as { post_id?: string };
        if (rec.post_id) postIds.add(rec.post_id);
      }
    }
  }

  let linkedPosts: Array<{
    id: string;
    post_id: string;
    platform: string;
    content: string | null;
    media_urls: string[];
    likes: number;
    comments: number;
    shares: number;
    views: number;
    posted_at: string | null;
    raw_data: unknown;
  }> = [];
  if (postIds.size > 0) {
    const { data: posts } = await supabase
      .from("organic_posts")
      .select("id, post_id, platform, content, media_urls, likes, comments, shares, views, posted_at, raw_data")
      .eq("competitor_id", competitorId)
      .eq("user_id", user.id)
      .in("post_id", [...postIds]);
    linkedPosts = (posts ?? []).map((post) => enrichOrganicPostForApi(post));
  }

  return NextResponse.json({
    ok: true,
    insight: insight ?? null,
    linkedPosts,
    platformsWithPosts,
    socials: parseOrganicSocials(competitor.socials),
    organic_next_scrape_at: competitor.organic_next_scrape_at,
    organic_last_scraped_at: competitor.organic_last_scraped_at,
  });
}
