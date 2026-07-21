import { NextResponse } from "next/server";

import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { landingPageGroupKey } from "@/lib/landing-pages/normalize-url";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseLimit(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

type ScrapedAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  first_seen_at: string;
  ai_extracted_angle: string | null;
  raw_payload: Json;
};

function landingKeyForAd(platform: string, rawPayload: Json): string | null {
  const lp = extractLandingPageUrl(platform, rawPayload);
  if (lp) return landingPageGroupKey(lp);
  const googleHost = extractGoogleHostnameLandingKey(platform, rawPayload);
  return googleHost ? landingPageGroupKey(googleHost) : null;
}

export async function GET(request: Request) {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dataUserId } = workspace;
  const db = workspaceReadClient(workspace);
  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get("competitorId");
  const urlRaw = searchParams.get("url");
  const limit = parseLimit(searchParams.get("limit"), 30, 100);
  const platformFilter = searchParams.get("platform")?.trim().toLowerCase() || null;

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }
  if (!urlRaw?.trim()) {
    return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(urlRaw.trim());
  } catch {
    decoded = urlRaw.trim();
  }

  const targetKey = landingPageGroupKey(decoded);
  if (!targetKey) {
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await db
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: ads, error: adsErr } = await db
    .from("scraped_ads")
    .select("id, platform, format, ad_text, ad_creative_url, first_seen_at, ai_extracted_angle, raw_payload")
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(800);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const matched: ScrapedAdRow[] = [];
  for (const ad of ads ?? []) {
    const row = ad as ScrapedAdRow;
    const key = landingKeyForAd(row.platform, row.raw_payload);
    if (key && key === targetKey) {
      matched.push(row);
    }
  }

  matched.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());

  const filtered = platformFilter
    ? matched.filter((a) => a.platform.toLowerCase() === platformFilter)
    : matched;

  const sliced = filtered.slice(0, limit);

  return NextResponse.json({
    ok: true,
    ads: sliced.map((a) => ({
      id: a.id,
      platform: a.platform,
      format: a.format,
      ad_text: a.ad_text,
      ad_creative_url: a.ad_creative_url,
      first_seen_at: a.first_seen_at,
      ai_extracted_angle: a.ai_extracted_angle,
    })),
    total: filtered.length,
  });
}
