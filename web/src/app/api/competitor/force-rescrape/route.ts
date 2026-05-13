import { NextResponse } from "next/server";

import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
  GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT,
} from "@/lib/ad-library/constants";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";
import type { AdsLibraryIds } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
const DEFAULT_ADS = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

function idsFromAdsLibraryContext(raw: Json | null | undefined): AdsLibraryIds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const ids = o.ids;
  if (!ids || typeof ids !== "object" || Array.isArray(ids)) return {};
  return ids as AdsLibraryIds;
}

/** POST body mirrors POST /api/ads/library defaults + skipCache: true for fresh Apify runs. */
function buildAdsLibraryForceBody(params: {
  brandName: string;
  domainClean: string;
  ids: AdsLibraryIds;
  platforms: AdsLibraryPlatform[];
}) {
  const { brandName, domainClean, ids, platforms } = params;
  return {
    brand: { name: brandName, domain: domainClean },
    ids,
    skipCache: true,
    platforms,
    metaStatus: "ACTIVE" as const,
    metaMaxAds: Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS)),
    metaCountry: "US",
    metaSortBy: "impressions_desc",
    linkedinMaxAds: Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS)),
    linkedinDateRange: "past-year",
    linkedinCountryCode: "",
    tiktokMaxAds: Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS)),
    microsoftMaxSearchResults: Math.max(24, Math.min(DEFAULT_ADS, MAX_ADS, 1000)),
    microsoftCountryCode: "66",
    pinterestMaxResults: Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS, 1000)),
    snapchatMaxItems: Math.max(10, Math.min(Math.min(DEFAULT_ADS, 300), MAX_ADS, 10000)),
    snapchatCountry: "",
    tiktokRegion: normalizeTikTokAdsRegion(undefined),
    googleRegion: normalizeGoogleAdsRegion(undefined),
    googleResultsLimit: normalizeGoogleAdsResultsLimit(GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT),
    pinterestCountry: normalizePinterestAdsCountry(undefined),
    googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let competitorId: string;
  try {
    const body = (await req.json()) as { competitorId?: string };
    competitorId = (body.competitorId ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: row, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, slug, brand_domain, brand_name, name, ads_library_context")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr || !row) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const domainClean = cleanDomain(row.brand_domain?.trim() || row.slug || "");
  if (!domainClean) {
    return NextResponse.json({ ok: false, error: "competitor has no domain" }, { status: 400 });
  }

  const displayName = row.brand_name?.trim() || row.name?.trim() || domainClean;
  const ids = idsFromAdsLibraryContext(row.ads_library_context);

  let platforms = [...ALL_ADS_API_PLATFORMS];
  const pinResolved =
    extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
    extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
    extractPinterestHandleFromUrlOrString(displayName);
  if (!pinResolved.trim()) {
    platforms = platforms.filter((p) => p !== "pinterest");
  }

  const libraryBody = buildAdsLibraryForceBody({
    brandName: displayName,
    domainClean,
    ids,
    platforms,
  });

  const origin = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";

  console.error("[force_rescrape:start]", {
    userId: user.id,
    competitorId,
    domain: domainClean,
    platforms: libraryBody.platforms,
  });

  const res = await fetch(`${origin}/api/ads/library`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(libraryBody),
  });

  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; configured?: boolean };

  console.error("[force_rescrape:ads_library_http]", {
    userId: user.id,
    competitorId,
    status: res.status,
    ok: json?.ok,
    error: json && "error" in json ? json.error : undefined,
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: typeof json.error === "string" ? json.error : res.statusText,
        details: json,
      },
      { status: res.status >= 400 ? res.status : 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Fresh ad library scrape completed; check Ads Library and Insights.",
    adsLibraryOk: json.ok !== false,
  });
}
