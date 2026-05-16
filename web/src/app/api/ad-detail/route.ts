import { NextResponse } from "next/server";
import { z } from "zod";

import { isScrapedAdsUuid } from "@/lib/ad-detail/ad-id";
import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import { extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const copyStructureSchema: z.ZodType<CopyStructureResult> = z.object({
  hook: z.string(),
  body_framework: z.array(z.string()).min(2).max(4),
  cta_pattern: z.string(),
  emotional_register: z.string(),
  adapt_for_your_brand: z.string(),
});

function buildDisplayLabel(adText: string, angle: string | null): string {
  const a = angle?.trim();
  if (a) return a;
  const t = adText?.trim() ?? "";
  if (!t) return "Untitled ad";
  if (t.length <= 50) return t;
  return `${t.slice(0, 50)}…`;
}

const scrapedAdSelect = `id, platform, format, ad_creative_url, ad_text,
        first_seen_at, last_seen_at, raw_payload, competitor_id,
        ai_extracted_angle, funnel_stage, ai_extracted_voice_tone,
        ai_extracted_launch_date, ai_enrichment_status`;

export type AdDetailResponse = {
  ok: boolean;
  error?: string;
  ad?: {
    id: string;
    display_label: string;
    platform: string;
    format: string;
    ad_creative_url: string | null;
    ad_text: string;
    cta: string | null;
    first_seen_at: string;
    last_seen_at: string;
    is_killed: boolean;
    lifespan_days: number;
    raw_payload: Json;
  };
  competitor?: {
    id: string;
    name: string;
    domain: string;
    logo_url: string | null;
    brand_context: string | null;
  };
  ai?: {
    angle: string | null;
    funnel_stage: string | null;
    voice_tone: unknown;
    launch_date: string | null;
    enrichment_status: string;
  };
  context?: {
    landing_page_url: string | null;
    landing_page_display: string | null;
    is_creative_test_winner: boolean;
    creative_test?: {
      launch_date: string;
      ad_count: number;
      test_status: string;
    };
    copy_structure?: CopyStructureResult;
  };
};

type AdRow = {
  id: string;
  platform: string;
  format: string;
  ad_creative_url: string | null;
  ad_text: string;
  first_seen_at: string;
  last_seen_at: string;
  raw_payload: Json;
  competitor_id: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ai_extracted_voice_tone: Json | null;
  ai_extracted_launch_date: string | null;
  ai_enrichment_status: string | null;
};

export async function GET(request: Request): Promise<NextResponse<AdDetailResponse>> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const adIdRaw = (searchParams.get("adId") ?? "").trim();
  const adParam = (searchParams.get("ad") ?? "").trim();
  const adUuid = adIdRaw || adParam;
  const competitorIdParam = (searchParams.get("competitorId") ?? "").trim();
  const platformParam = (searchParams.get("platform") ?? "").trim().toLowerCase();
  const libraryItemId = (searchParams.get("libraryItemId") ?? "").trim();

  let ad: AdRow | null = null;

  if (adUuid && isScrapedAdsUuid(adUuid)) {
    const { data, error } = await supabase
      .from("scraped_ads")
      .select(scrapedAdSelect)
      .eq("id", adUuid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    ad = data as AdRow | null;
  } else if (competitorIdParam && platformParam && libraryItemId) {
    const baseQuery = () =>
      supabase
        .from("scraped_ads")
        .select(scrapedAdSelect)
        .eq("user_id", user.id)
        .eq("competitor_id", competitorIdParam)
        .eq("platform", platformParam);

    const { data: byPayloadId, error: errPayload } = await baseQuery()
      .filter("raw_payload->>id", "eq", libraryItemId)
      .maybeSingle();
    if (errPayload) {
      return NextResponse.json({ ok: false, error: errPayload.message }, { status: 500 });
    }
    ad = byPayloadId as AdRow | null;

    if (!ad) {
      const { data: byStableKey, error: errKey } = await baseQuery()
        .eq("stable_ad_key", libraryItemId)
        .maybeSingle();
      if (errKey) {
        return NextResponse.json({ ok: false, error: errKey.message }, { status: 500 });
      }
      ad = byStableKey as AdRow | null;
    }
  } else {
    return NextResponse.json(
      { ok: false, error: "missing adId (uuid) or competitorId+platform+libraryItemId" },
      { status: 400 },
    );
  }

  if (!ad) {
    return NextResponse.json({ ok: false, error: "ad not found" }, { status: 404 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, name, brand_domain, logo_url, brand_logo_url, last_scraped_at")
    .eq("id", ad.competitor_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const lastScrapedAt = competitor.last_scraped_at
    ? new Date(competitor.last_scraped_at).getTime()
    : Date.now();
  const killedThreshold = lastScrapedAt - 24 * 60 * 60 * 1000;
  const lastSeenMs = new Date(ad.last_seen_at).getTime();
  const firstSeenMs = new Date(ad.first_seen_at).getTime();
  const isKilled = lastSeenMs < killedThreshold;
  const lifespanDays = Math.max(0, Math.floor((lastSeenMs - firstSeenMs) / (24 * 60 * 60 * 1000)));

  const ctaFromPayload = (() => {
    if (!ad.raw_payload || typeof ad.raw_payload !== "object" || Array.isArray(ad.raw_payload)) {
      return null;
    }
    const p = ad.raw_payload as Record<string, unknown>;
    if (typeof p.cta === "string" && p.cta.trim()) return p.cta.trim();
    if (typeof p.ctaLabel === "string" && p.ctaLabel.trim()) return p.ctaLabel.trim();
    return null;
  })();

  const lpUrl = extractLandingPageUrl(ad.platform, ad.raw_payload);

  const [{ data: winnerTest }, { data: copyCache }] = await Promise.all([
    supabase
      .from("creative_tests")
      .select("launch_date, ad_count, test_status")
      .eq("winner_ad_id", ad.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("ad_copy_structure_cache")
      .select("structure")
      .eq("ad_id", ad.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  let copyStructure: CopyStructureResult | undefined;
  if (copyCache?.structure) {
    const parsed = copyStructureSchema.safeParse(copyCache.structure);
    if (parsed.success) copyStructure = parsed.data;
  }

  const displayName = competitor.brand_name?.trim() || competitor.name?.trim() || "Competitor";
  const logoUrl = competitor.brand_logo_url?.trim() || competitor.logo_url?.trim() || null;
  const displayLabel = buildDisplayLabel(ad.ad_text, ad.ai_extracted_angle);

  return NextResponse.json({
    ok: true,
    ad: {
      id: ad.id,
      display_label: displayLabel,
      platform: ad.platform,
      format: ad.format,
      ad_creative_url: ad.ad_creative_url,
      ad_text: ad.ad_text,
      cta: ctaFromPayload,
      first_seen_at: ad.first_seen_at,
      last_seen_at: ad.last_seen_at,
      is_killed: isKilled,
      lifespan_days: lifespanDays,
      raw_payload: ad.raw_payload,
    },
    competitor: {
      id: competitor.id,
      name: displayName,
      domain: competitor.brand_domain?.trim() ?? "",
      logo_url: logoUrl,
      brand_context: null,
    },
    ai: {
      angle: ad.ai_extracted_angle,
      funnel_stage: ad.funnel_stage,
      voice_tone: ad.ai_extracted_voice_tone,
      launch_date: ad.ai_extracted_launch_date,
      enrichment_status: ad.ai_enrichment_status ?? "unknown",
    },
    context: {
      landing_page_url: lpUrl,
      landing_page_display: lpUrl ? displayUrlShort(lpUrl) : null,
      is_creative_test_winner: Boolean(winnerTest),
      creative_test: winnerTest ?? undefined,
      copy_structure: copyStructure,
    },
  });
}
