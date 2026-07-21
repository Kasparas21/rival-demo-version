import { NextResponse } from "next/server";

import { ORGANIC_FEED_PAGE_SIZE, ORGANIC_SCRAPE_MAX_ITEMS } from "@/lib/organic-content/constants";
import { toOrganicPostClientPayload } from "@/lib/organic-content/post-display";
import type { OrganicPlatform, OrganicPostSort } from "@/lib/organic-content/types";
import { requireCompetitorReadAccess } from "@/lib/team/competitor-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_PLATFORMS = new Set([
  "linkedin",
  "twitter",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
]);

function parseSort(raw: string | null): OrganicPostSort {
  if (raw === "likes" || raw === "comments") return raw;
  return "recent";
}

function parsePage(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function parsePageSize(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : ORGANIC_FEED_PAGE_SIZE;
  if (!Number.isFinite(n) || n < 1) return ORGANIC_FEED_PAGE_SIZE;
  return Math.min(n, ORGANIC_SCRAPE_MAX_ITEMS);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const searchParams = new URL(req.url).searchParams;
  const platformRaw = searchParams.get("platform")?.trim() ?? "";
  const sort = parseSort(searchParams.get("sort"));
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const access = await requireCompetitorReadAccess(competitorId);
  if (access instanceof NextResponse) return access;
  const { supabase: db, dataUserId } = access;

  let query = db
    .from("organic_posts")
    .select("*", { count: "exact" })
    .eq("competitor_id", competitorId)
      .eq("user_id", dataUserId);

  if (platformRaw && platformRaw !== "all" && VALID_PLATFORMS.has(platformRaw)) {
    query = query.eq("platform", platformRaw as OrganicPlatform);
  }

  if (sort === "likes") {
    query = query.order("likes", { ascending: false });
  } else if (sort === "comments") {
    query = query.order("comments", { ascending: false });
  } else {
    query = query.order("posted_at", { ascending: false, nullsFirst: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let lastScrapedAt: string | null = null;
  if (platformRaw && platformRaw !== "all" && VALID_PLATFORMS.has(platformRaw)) {
    const { data: scrapeRow } = await db
      .from("organic_posts")
      .select("scraped_at")
      .eq("competitor_id", competitorId)
      .eq("user_id", dataUserId)
      .eq("platform", platformRaw)
      .order("scraped_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastScrapedAt = scrapeRow?.scraped_at ?? null;
  }

  const { data: platformRows } = await db
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId);

  const platformsWithPosts = [...new Set((platformRows ?? []).map((r) => r.platform))];

  return NextResponse.json({
    ok: true,
    posts: (data ?? []).map((post) => toOrganicPostClientPayload(post)),
    page,
    pageSize,
    total: count ?? 0,
    platformsWithPosts,
    last_scraped_at: lastScrapedAt,
  });
}
