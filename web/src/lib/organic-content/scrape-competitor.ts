import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { ORGANIC_FIRST_SCRAPE_POST_LIMIT, ORGANIC_SCRAPE_INTERVAL_DAYS } from "./constants";
import { extractAndUpsertCollaborators } from "./extract-collaborators";
import { generateOrganicInsights } from "./generate-insights";
import { upsertOrganicPosts } from "./persist-posts";
import { scrapeOrganicPlatformSafe } from "./run-platform-scraper";
import { parseOrganicSocials } from "./socials";
import { ORGANIC_PLATFORMS, type NormalizedOrganicPost, type ScrapeOrganicCompetitorRow } from "./types";

export type ScrapeOrganicCompetitorResult = {
  ok: boolean;
  postsUpserted: number;
  platformErrors: Record<string, string>;
  insightsErrors: string[];
};

function sortPostsByDateDesc(posts: NormalizedOrganicPost[]): NormalizedOrganicPost[] {
  return [...posts].sort((a, b) => {
    const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return tb - ta;
  });
}

function filterPostsAfterBaseline(
  posts: NormalizedOrganicPost[],
  baselineDate: string,
): NormalizedOrganicPost[] {
  const baselineMs = new Date(baselineDate).getTime();
  return posts.filter((p) => {
    if (!p.posted_at) return true;
    return new Date(p.posted_at).getTime() > baselineMs;
  });
}

export type ScrapeOrganicCompetitorOptions = {
  /** When set, only scrape these platforms (must have handles). */
  platforms?: OrganicPlatform[];
  /** Platforms scraped for the first time — skip baseline filter and incremental cutoffs. */
  newPlatforms?: OrganicPlatform[];
};

export async function scrapeOrganicCompetitor(
  admin: SupabaseClient<Database>,
  competitor: ScrapeOrganicCompetitorRow,
  opts?: ScrapeOrganicCompetitorOptions,
): Promise<ScrapeOrganicCompetitorResult> {
  const socials = parseOrganicSocials(competitor.socials);
  const platformErrors: Record<string, string> = {};
  let allPosts: NormalizedOrganicPost[] = [];

  let baselineDate = competitor.organic_baseline_date;
  const isFirstScrape = !baselineDate;
  const newerThan = !isFirstScrape && baselineDate ? baselineDate : null;
  const newPlatformSet = new Set(opts?.newPlatforms ?? []);
  const platformFilter = opts?.platforms?.length ? new Set(opts.platforms) : null;

  for (const platform of ORGANIC_PLATFORMS) {
    if (platformFilter && !platformFilter.has(platform)) continue;

    const handle = socials[platform];
    if (!handle?.trim()) continue;

    const isNewPlatform = newPlatformSet.has(platform);
    const { posts, error } = await scrapeOrganicPlatformSafe(platform, handle, {
      newerThan: platform === "instagram" && !isNewPlatform ? newerThan : null,
    });
    if (error) platformErrors[platform] = error;

    let platformPosts = posts;
    if (isNewPlatform) {
      platformPosts = sortPostsByDateDesc(platformPosts);
    } else if (isFirstScrape) {
      // handled below after collecting all
    } else if (baselineDate) {
      platformPosts = filterPostsAfterBaseline(platformPosts, baselineDate);
      platformPosts = sortPostsByDateDesc(platformPosts);
    }

    allPosts.push(...platformPosts);
  }

  if (isFirstScrape && !platformFilter) {
    allPosts = sortPostsByDateDesc(allPosts).slice(0, ORGANIC_FIRST_SCRAPE_POST_LIMIT);
    if (allPosts.length > 0) {
      const oldest = allPosts[allPosts.length - 1]?.posted_at;
      if (oldest) baselineDate = oldest;
    }
  } else if (isFirstScrape && platformFilter) {
    // First-ever scrape limited to specific new platforms only
    allPosts = sortPostsByDateDesc(allPosts).slice(0, ORGANIC_FIRST_SCRAPE_POST_LIMIT);
    if (allPosts.length > 0) {
      const oldest = allPosts[allPosts.length - 1]?.posted_at;
      if (oldest) baselineDate = oldest;
    }
  }

  const postsUpserted = await upsertOrganicPosts(admin, {
    competitorId: competitor.id,
    userId: competitor.user_id,
    posts: allPosts,
  });

  if (allPosts.length > 0) {
    await extractAndUpsertCollaborators(admin, {
      competitorId: competitor.id,
      userId: competitor.user_id,
      posts: allPosts,
    });
  }

  const { errors: insightsErrors } = await generateOrganicInsights(admin, {
    competitorId: competitor.id,
    userId: competitor.user_id,
  });

  const now = new Date();
  const nextScrape = new Date(now.getTime() + ORGANIC_SCRAPE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const { error: updateErr } = await admin
    .from("saved_competitors")
    .update({
      organic_baseline_date: baselineDate,
      organic_last_scraped_at: now.toISOString(),
      organic_next_scrape_at: nextScrape.toISOString(),
    })
    .eq("id", competitor.id);

  if (updateErr) {
    return {
      ok: false,
      postsUpserted,
      platformErrors,
      insightsErrors: [...insightsErrors, updateErr.message],
    };
  }

  return {
    ok: true,
    postsUpserted,
    platformErrors,
    insightsErrors,
  };
}

export async function fetchOrganicScrapeCandidates(admin: SupabaseClient<Database>, limit = 20) {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("saved_competitors")
    .select("id, user_id, socials, organic_baseline_date, organic_next_scrape_at")
    .lte("organic_next_scrape_at", nowIso)
    .limit(limit * 3);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => {
      const socials = parseOrganicSocials(row.socials);
      return Object.keys(socials).length > 0;
    })
    .slice(0, limit) as ScrapeOrganicCompetitorRow[];
}
