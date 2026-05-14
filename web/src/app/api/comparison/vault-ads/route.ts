import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type FunnelKey = "TOF" | "MOF" | "BOF";

function lifespanDays(firstSeen: string, lastSeen: string): number {
  const a = Date.parse(firstSeen);
  const b = Date.parse(lastSeen);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function normalizeFunnelStage(raw: string | null): FunnelKey {
  const s = (raw ?? "").toUpperCase().trim();
  if (s === "TOF" || s === "MOF" || s === "BOF") return s;
  return "MOF";
}

type WallAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  first_seen_at: string;
  last_seen_at: string;
  lifespanDays: number;
};

function mapWallRow(a: {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  first_seen_at: string;
  last_seen_at: string;
}): WallAdRow {
  return {
    ...a,
    lifespanDays: lifespanDays(a.first_seen_at, a.last_seen_at),
  };
}

async function assertOwnsCompetitor(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function loadFunnelBuckets(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  perStage: number
): Promise<Record<FunnelKey, WallAdRow[]>> {
  const buckets: Record<FunnelKey, WallAdRow[]> = { TOF: [], MOF: [], BOF: [] };
  const { data, error } = await supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_text, ad_creative_url, ai_extracted_angle, funnel_stage, first_seen_at, last_seen_at"
    )
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(300);

  if (error || !data?.length) {
    return buckets;
  }

  for (const row of data) {
    const st = normalizeFunnelStage(row.funnel_stage);
    if (buckets[st].length >= perStage) continue;
    buckets[st].push(mapWallRow(row));
  }
  return buckets;
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(billingRequiredResponseBody("Subscription required for Copy Vault."), { status: 402 });
  }

  const url = new URL(req.url);
  const bothBrands = url.searchParams.get("bothBrands") === "1";
  const byFunnel = url.searchParams.get("byFunnel") === "1";
  const angleFilter = (url.searchParams.get("angle") ?? "").trim();
  const perStage = Math.min(24, Math.max(4, Number(url.searchParams.get("perStage") ?? "8") || 8));

  if (bothBrands) {
    const themId = (url.searchParams.get("themCompetitorId") ?? url.searchParams.get("competitorId") ?? "").trim();
    const youId = (url.searchParams.get("youCompetitorId") ?? "").trim();
    if (!themId || !youId) {
      return NextResponse.json(
        { ok: false, error: "bothBrands=1 requires themCompetitorId and youCompetitorId" },
        { status: 400 }
      );
    }
    const [ownsThem, ownsYou] = await Promise.all([
      assertOwnsCompetitor(supabase, user.id, themId),
      assertOwnsCompetitor(supabase, user.id, youId),
    ]);
    if (!ownsThem || !ownsYou) {
      return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
    }
    const [them, you] = await Promise.all([
      loadFunnelBuckets(supabase, user.id, themId, perStage),
      loadFunnelBuckets(supabase, user.id, youId, perStage),
    ]);
    return NextResponse.json({ ok: true, them, you });
  }

  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "competitorId required" }, { status: 400 });
  }

  const { data: row, error: ownErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (ownErr || !row) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  if (byFunnel && !angleFilter) {
    const grouped = await loadFunnelBuckets(supabase, user.id, competitorId, perStage);
    return NextResponse.json({ ok: true, ...grouped });
  }

  let q = supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, ad_creative_url, funnel_stage"
    )
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);

  if (angleFilter) {
    q = q.eq("ai_extracted_angle", angleFilter).order("first_seen_at", { ascending: false });
  } else {
    q = q
      .eq("ai_enrichment_status", "enriched")
      .not("ai_extracted_angle", "is", null)
      .order("first_seen_at", { ascending: true });
  }

  const limit = angleFilter ? 200 : 80;
  const { data: ads, error } = await q.limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const mapped = (ads ?? []).map((a) => mapWallRow(a));

  if (angleFilter) {
    return NextResponse.json({ ok: true, ads: mapped });
  }

  const withLife = mapped
    .filter((a) => a.lifespanDays >= 30)
    .sort((x, y) => y.lifespanDays - x.lifespanDays)
    .slice(0, 10);

  return NextResponse.json({ ok: true, ads: withLife });
}
