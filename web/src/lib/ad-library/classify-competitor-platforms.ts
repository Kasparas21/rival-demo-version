import type { SupabaseClient } from "@supabase/supabase-js";
import { countActiveAdsFromLibraryResponse, countActiveAdsFromRawPayloads } from "./count-active-ads";
import type { AdsLibraryResponse } from "./api-types";
import { persistPlatformTracking } from "./persist-platform-tracking";
import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

export async function resolveCompetitorForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: { competitorId?: string; domain?: string }
): Promise<{ id: string; slug: string; brand_domain: string | null } | null> {
  if (params.competitorId?.trim()) {
    const { data } = await supabase
      .from("saved_competitors")
      .select("id, slug, brand_domain")
      .eq("id", params.competitorId.trim())
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  }
  const domain = params.domain?.trim();
  if (!domain) return null;
  const slug = normalizeCompetitorSlug(domain);
  const domainNorm = cleanDomain(domain).toLowerCase();
  const { data } = await supabase
    .from("saved_competitors")
    .select("id, slug, brand_domain")
    .eq("user_id", userId)
    .or(`slug.eq.${slug},brand_domain.eq.${domainNorm}`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function classifyCompetitorPlatforms(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    libraryResponse?: Pick<
      AdsLibraryResponse,
      "meta" | "google" | "linkedin" | "tiktok" | "pinterest" | "snapchat"
    >;
  }
) {
  let activeCounts;
  if (params.libraryResponse) {
    activeCounts = countActiveAdsFromLibraryResponse(params.libraryResponse);
  } else {
    const { data } = await supabase
      .from("scraped_ads")
      .select("platform, raw_payload")
      .eq("competitor_id", params.competitorId)
      .eq("user_id", params.userId);

    activeCounts = countActiveAdsFromRawPayloads(
      (data ?? []).map((r) => ({ platform: r.platform, raw_payload: r.raw_payload }))
    );
  }

  const { computePlatformTracking } = await import("./platform-prioritization");
  const { platforms, highCoverageApplied } = computePlatformTracking(activeCounts);

  const rows = await persistPlatformTracking(supabase, {
    userId: params.userId,
    competitorId: params.competitorId,
    activeCounts,
    highCoverageApplied,
  });

  return {
    highCoverageApplied,
    platforms: rows.map((r) => ({
      platform: r.platform,
      classification: r.classification,
      activeAdCount: r.activeAdCount,
      highCoverageDemoted: r.highCoverageDemoted,
      nextScrapeAt: r.nextScrapeAt,
    })),
    raw: platforms,
  };
}
