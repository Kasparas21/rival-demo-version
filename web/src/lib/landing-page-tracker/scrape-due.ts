import type { SupabaseClient } from "@supabase/supabase-js";

import { userAllowsScheduledScrape } from "@/lib/billing/scrape-eligibility";
import type { Database } from "@/lib/supabase/types";

import { LANDING_PAGE_SCRAPE_BATCH_SIZE } from "./constants";
import { scrapeSingleLandingPage, type LandingPageRow } from "./scrape-single";

/** Owners of due pages whose account has scheduled scraping switched on. */
async function usersWithScheduledScrape(admin: SupabaseClient<Database>, now: string): Promise<string[]> {
  const { data, error } = await admin
    .from("landing_pages")
    .select("user_id")
    .eq("is_active", true)
    .lte("next_screenshot_at", now);

  if (error) {
    console.error("[landing-page-scrape] fetch due owners failed", error.message);
    return [];
  }

  const owners = [...new Set((data ?? []).map((row) => row.user_id))];
  const allowed = await Promise.all(owners.map((userId) => userAllowsScheduledScrape(admin, userId)));
  return owners.filter((_, i) => allowed[i]);
}

/** Due pages for accounts with scheduled scraping on, so switched-off accounts never fill the batch. */
export async function fetchDueLandingPages(
  admin: SupabaseClient<Database>,
  limit = LANDING_PAGE_SCRAPE_BATCH_SIZE,
): Promise<LandingPageRow[]> {
  const now = new Date().toISOString();
  const userIds = await usersWithScheduledScrape(admin, now);
  if (userIds.length === 0) return [];

  const { data, error } = await admin
    .from("landing_pages")
    .select("*")
    .eq("is_active", true)
    .lte("next_screenshot_at", now)
    .in("user_id", userIds)
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
