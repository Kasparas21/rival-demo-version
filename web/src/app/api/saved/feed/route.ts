import { NextResponse } from "next/server";

import { buildSavedFeed } from "@/lib/saved/build-saved-feed";
import type { SavedDatePreset, SavedFeedSort, SavedFormatFilter, SavedItemType } from "@/lib/saved/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

function parseList(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseItemType(value: string | null): "all" | SavedItemType {
  const v = (value ?? "all").trim().toLowerCase();
  if (v === "ad" || v === "ads") return "ad";
  if (v === "email" || v === "emails") return "email";
  if (v === "organic") return "organic";
  if (v === "landing" || v === "landings") return "landing";
  return "all";
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const brandId = (searchParams.get("brandId") ?? "").trim() || "default";
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  const sort = (searchParams.get("sort") ?? "newest").trim().toLowerCase() as SavedFeedSort;
  const itemType = parseItemType(searchParams.get("type"));
  const format = (searchParams.get("format") ?? "all").trim().toLowerCase() as SavedFormatFilter;
  const datePreset = (searchParams.get("date") ?? "all").trim().toLowerCase() as SavedDatePreset;
  const competitorId = (searchParams.get("competitorId") ?? "").trim() || null;
  const query = (searchParams.get("q") ?? "").trim();
  const platforms = parseList(searchParams.get("platforms"));

  const admin = createSupabaseAdminClient();
  const result = await buildSavedFeed(admin, user.id, {
    brandId,
    offset,
    limit,
    sort: sort === "oldest" ? "oldest" : "newest",
    itemType,
    platforms,
    format: format === "video" || format === "image" ? format : "all",
    query,
    competitorId,
    datePreset:
      datePreset === "7d" || datePreset === "30d" || datePreset === "90d" ? datePreset : "all",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
