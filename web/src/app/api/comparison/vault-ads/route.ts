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

type VaultSort = "lifespan_desc" | "lifespan_asc" | "newest" | "platform" | "angle";

function parseCsvLower(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseFunnelCsv(raw: string | null): FunnelKey[] {
  if (!raw?.trim()) return [];
  const out: FunnelKey[] = [];
  for (const p of raw.split(",")) {
    const n = normalizeFunnelStage(p);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

function sortVaultRows(rows: WallAdRow[], sort: VaultSort): WallAdRow[] {
  const r = [...rows];
  switch (sort) {
    case "lifespan_asc":
      return r.sort((a, b) => a.lifespanDays - b.lifespanDays);
    case "newest":
      return r.sort((a, b) => Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at));
    case "platform":
      return r.sort((a, b) => a.platform.localeCompare(b.platform));
    case "angle":
      return r.sort((a, b) => (a.ai_extracted_angle ?? "").localeCompare(b.ai_extracted_angle ?? ""));
    case "lifespan_desc":
    default:
      return r.sort((a, b) => b.lifespanDays - a.lifespanDays);
  }
}

async function vaultListing(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  competitorId: string;
  url: URL;
}): Promise<NextResponse> {
  const { supabase, userId, competitorId, url } = params;

  const limit = Math.min(1500, Math.max(1, Number(url.searchParams.get("limit") ?? "500") || 500));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const sort = (url.searchParams.get("sort") ?? "lifespan_desc").trim() as VaultSort;
  const sortSafe: VaultSort =
    sort === "lifespan_asc" || sort === "newest" || sort === "platform" || sort === "angle"
      ? sort
      : "lifespan_desc";

  const platforms = parseCsvLower(url.searchParams.get("platforms"));
  const funnels = parseFunnelCsv(url.searchParams.get("funnels"));
  const anglesParam = url.searchParams.get("angles");
  const anglesList = anglesParam?.trim()
    ? anglesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const angleContains = (url.searchParams.get("angleContains") ?? "").trim();

  const { count: enrichCount, error: cErr } = await supabase
    .from("scraped_ads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .eq("ai_enrichment_status", "enriched")
    .not("ai_extracted_angle", "is", null);
  if (cErr) {
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }
  const minLifespan = (enrichCount ?? 0) < 10 ? 0 : 30;

  let q = supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, ad_creative_url, funnel_stage"
    )
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .eq("ai_enrichment_status", "enriched")
    .not("ai_extracted_angle", "is", null);

  if (anglesList.length > 0) {
    q = q.in("ai_extracted_angle", anglesList);
  }
  if (angleContains) {
    q = q.ilike("ai_extracted_angle", `%${angleContains}%`);
  }

  const { data: ads, error } = await q.limit(1500);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let mapped = (ads ?? []).map((a) => mapWallRow(a));
  if (platforms.length > 0) {
    const allow = new Set(platforms);
    mapped = mapped.filter((a) => allow.has((a.platform ?? "").toLowerCase()));
  }
  if (funnels.length > 0) {
    const allow = new Set(funnels);
    mapped = mapped.filter((a) => allow.has(normalizeFunnelStage(a.funnel_stage)));
  }
  mapped = mapped.filter((a) => a.lifespanDays >= minLifespan);
  const sorted = sortVaultRows(mapped, sortSafe);
  const total = sorted.length;
  const page = sorted.slice(offset, offset + limit);

  return NextResponse.json({ ok: true, ads: page, total, minLifespanUsed: minLifespan });
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

  const vaultMode = url.searchParams.get("vault") === "1";
  if (vaultMode) {
    return vaultListing({ supabase, userId: user.id, competitorId, url });
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
