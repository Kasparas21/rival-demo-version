import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { LANDING_PAGE_SCRAPE_BATCH_SIZE } from "./constants";
import { scrapeSingleLandingPage, type LandingPageRow } from "./scrape-single";

export async function fetchDueLandingPages(
  admin: SupabaseClient<Database>,
  limit = LANDING_PAGE_SCRAPE_BATCH_SIZE,
): Promise<LandingPageRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("landing_pages")
    .select("*")
    .eq("is_active", true)
    .lte("next_screenshot_at", now)
    .order("next_screenshot_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[landing-page-scrape] fetch due pages failed", error.message);
    return [];
  }

  return (data ?? []) as LandingPageRow[];
}

export async function scrapeDueLandingPages(
  admin: SupabaseClient<Database>,
  limit = LANDING_PAGE_SCRAPE_BATCH_SIZE,
): Promise<
  Array<{
    landingPageId: string;
    competitorId: string;
    userId: string;
    url: string;
    ok: boolean;
    error?: string;
  }>
> {
  const pages = await fetchDueLandingPages(admin, limit);
  const results: Array<{
    landingPageId: string;
    competitorId: string;
    userId: string;
    url: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const page of pages) {
    const result = await scrapeSingleLandingPage(admin, page);
    results.push({
      landingPageId: page.id,
      competitorId: page.competitor_id,
      userId: page.user_id,
      url: page.url,
      ok: result.ok,
      error: result.error,
    });
  }

  return results;
}
