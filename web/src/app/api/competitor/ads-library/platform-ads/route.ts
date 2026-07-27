import { NextResponse } from "next/server";

import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import { PLATFORM_ADS_MODAL_BATCH_SIZE } from "@/lib/ad-library/constants";
import {
  loadPlatformAdsPage,
  type PlatformAdsDatePreset,
  type PlatformAdsSort,
} from "@/lib/ad-library/platform-ads-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLATFORMS = new Set<AdsLibraryPlatform>(["meta", "google", "linkedin", "tiktok", "pinterest", "snapchat"]);

function parseDatePreset(raw: string | null): PlatformAdsDatePreset {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "7d" || v === "14d" || v === "30d" || v === "90d" || v === "365d" || v === "custom" || v === "all") {
    return v;
  }
  return "all";
}

function parseSort(raw: string | null): PlatformAdsSort {
  const v = (raw ?? "newest").trim().toLowerCase();
  if (
    v === "oldest" ||
    v === "longest_running" ||
    v === "longest" ||
    v === "newest" ||
    v === "impressions" ||
    v === "ultimate_winner"
  ) {
    return v === "longest" ? "longest_running" : (v as PlatformAdsSort);
  }
  return "newest";
}

function parseMs(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** GET — paginated platform ads for expanded Ad Library modal (cursor = offset). */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") ?? "").trim();
  const platform = (url.searchParams.get("platform") ?? "").trim().toLowerCase() as AdsLibraryPlatform;

  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 });
  }
  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ ok: false, error: "invalid platform" }, { status: 400 });
  }

  let offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  let limit = Number.parseInt(url.searchParams.get("limit") ?? String(PLATFORM_ADS_MODAL_BATCH_SIZE), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = PLATFORM_ADS_MODAL_BATCH_SIZE;

  const result = await loadPlatformAdsPage(supabase, user.id, {
    domain,
    platform,
    offset,
    limit,
    sort: parseSort(url.searchParams.get("sort")),
    datePreset: parseDatePreset(url.searchParams.get("datePreset")),
    customStartMs: parseMs(url.searchParams.get("customStartMs")),
    customEndMs: parseMs(url.searchParams.get("customEndMs")),
    groupDuplicates: url.searchParams.get("groupDuplicates") === "1",
  });

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
