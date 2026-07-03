import { NextResponse } from "next/server";

import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import {
  buildManualRefreshLibraryBodyForPlatform,
  buildManualRefreshScrapeParams,
  computeManualRefreshTodayWindow,
} from "@/lib/ad-library/manual-refresh-date-window";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";
import type { AdsLibraryIds } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import {
  billingRequiredResponseBody,
  featureNotAvailableResponseBody,
  getBillingEntitlement,
} from "@/lib/billing/entitlements";
import {
  canPerformManualRefresh,
  loadManualRefreshUsageForCompetitor,
} from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;

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

/** POST body mirrors POST /api/ads/library for Pro manual refresh (active today, all platforms). */
function buildAdsLibraryForceBody(params: {
  brandName: string;
  domainClean: string;
  ids: AdsLibraryIds;
  platforms: AdsLibraryPlatform[];
  adsPerPlatform: number;
}) {
  const { brandName, domainClean, ids, platforms, adsPerPlatform } = params;
  const cap = Math.max(1, Math.min(adsPerPlatform, MAX_ADS));
  const dateParams = buildManualRefreshScrapeParams(computeManualRefreshTodayWindow());
  const hasMetaPageId = Boolean(
    ids.metaPageUrl?.trim() ||
      (ids.meta?.trim() && /^\d{10,22}$/.test(ids.meta.replace(/\D/g, ""))),
  );
  const platformFields =
    platforms.length === 1
      ? buildManualRefreshLibraryBodyForPlatform(platforms[0]!, cap)
      : {};

  const shared = {
    brand: { name: brandName, domain: domainClean },
    ids,
    skipCache: true,
    intent: "manual" as const,
    platforms,
    metaCountry: "US",
    tiktokRegion: normalizeTikTokAdsRegion(undefined),
    googleRegion: normalizeGoogleAdsRegion(undefined),
    pinterestCountry: normalizePinterestAdsCountry(undefined),
    googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
    ...platformFields,
  };

  if (platforms.length === 1) {
    return {
      ...shared,
      ...(platforms[0] === "google" ? { filterGoogleActiveToday: true } : {}),
    };
  }

  return {
    ...shared,
    metaStatus: dateParams.metaStatus,
    metaMaxAds: cap,
    ...(hasMetaPageId
      ? {}
      : { metaStartDate: dateParams.metaStartDate, metaEndDate: dateParams.metaEndDate }),
    metaSortBy: "impressions_desc",
    linkedinMaxAds: cap,
    linkedinDateRange: dateParams.linkedinDateRange,
    linkedinCountryCode: "",
    tiktokMaxAds: cap,
    tiktokStartDate: dateParams.tiktokStartDate,
    tiktokEndDate: dateParams.tiktokEndDate,
    microsoftMaxSearchResults: Math.max(24, Math.min(cap, 1000)),
    microsoftCountryCode: "66",
    microsoftStartDate: dateParams.microsoftStartDate,
    microsoftEndDate: dateParams.microsoftEndDate,
    pinterestMaxResults: Math.max(1, Math.min(cap, 1000)),
    pinterestStartDate: dateParams.pinterestStartDate,
    pinterestEndDate: dateParams.pinterestEndDate,
    snapchatMaxItems: Math.max(10, Math.min(cap, 10000)),
    snapchatStartDate: dateParams.snapchatStartDate,
    snapchatEndDate: dateParams.snapchatEndDate,
    snapchatCountry: "",
    tiktokRegion: normalizeTikTokAdsRegion(undefined),
    googleRegion: normalizeGoogleAdsRegion(undefined),
    googleResultsLimit: normalizeGoogleAdsResultsLimit(cap),
    pinterestCountry: normalizePinterestAdsCountry(undefined),
    googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
    filterGoogleActiveToday: true,
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
  let requestedPlatforms: AdsLibraryPlatform[] | undefined;
  try {
    const body = (await req.json()) as {
      competitorId?: string;
      platforms?: AdsLibraryPlatform[];
    };
    competitorId = (body.competitorId ?? "").trim();
    if (Array.isArray(body.platforms) && body.platforms.length > 0) {
      requestedPlatforms = body.platforms.filter((p) =>
        ALL_ADS_API_PLATFORMS.includes(p as AdsLibraryPlatform),
      ) as AdsLibraryPlatform[];
    }
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

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to refresh competitor ads.", "pro"),
      { status: 402 },
    );
  }
  if (!billing.limits.allowManualRefresh && !billing.isUnlimited) {
    return NextResponse.json(featureNotAvailableResponseBody("Manual refresh"), { status: 403 });
  }

  const manualUsage = await loadManualRefreshUsageForCompetitor(supabase, user.id, competitorId);
  const manualCheck = canPerformManualRefresh(billing, manualUsage);
  if (!manualCheck.ok) {
    return NextResponse.json({ ok: false, error: manualCheck.error }, { status: manualCheck.status });
  }

  const domainClean = cleanDomain(row.brand_domain?.trim() || row.slug || "");
  if (!domainClean) {
    return NextResponse.json({ ok: false, error: "competitor has no domain" }, { status: 400 });
  }

  const displayName = row.brand_name?.trim() || row.name?.trim() || domainClean;
  const ids = idsFromAdsLibraryContext(row.ads_library_context);
  const adsPerPlatform = Math.max(
    1,
    Math.min(billing.limits.manualRefreshAdsPerPlatform || 300, MAX_ADS),
  );

  let platforms = [...ALL_ADS_API_PLATFORMS];
  const pinResolved =
    extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
    extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
    extractPinterestHandleFromUrlOrString(displayName);
  if (!pinResolved.trim()) {
    platforms = platforms.filter((p) => p !== "pinterest");
  }

  if (requestedPlatforms?.length) {
    const allowed = new Set(requestedPlatforms);
    platforms = platforms.filter((p) => allowed.has(p));
    if (platforms.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no valid platforms to refresh" },
        { status: 400 },
      );
    }
  }

  const libraryBody = {
    ...buildAdsLibraryForceBody({
      brandName: displayName,
      domainClean,
      ids,
      platforms,
      adsPerPlatform,
    }),
    filterGoogleActiveToday: platforms.includes("google"),
  };

  const origin = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";

  console.error("[force_rescrape:start]", {
    userId: user.id,
    competitorId,
    domain: domainClean,
    platforms: libraryBody.platforms,
    adsPerPlatform,
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

  if (!billing.isUnlimited) {
    await supabase.rpc("record_manual_refresh_usage", { p_competitor_id: competitorId });
  }

  return NextResponse.json({
    ok: true,
    message: "Fresh ad library scrape completed; check Ads Library and Insights.",
    adsLibraryOk: json.ok !== false,
  });
}
