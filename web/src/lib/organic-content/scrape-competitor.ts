import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { ORGANIC_FIRST_SCRAPE_POST_LIMIT, ORGANIC_SCRAPE_INTERVAL_DAYS } from "./constants";
import { extractAndUpsertCollaborators } from "./extract-collaborators";
import { generateOrganicInsights } from "./generate-insights";
import { upsertOrganicPosts } from "./persist-posts";
import { scrapeOrganicPlatformSafe, type YouTubeScrapeMeta } from "./run-platform-scraper";
import { parseOrganicSocials, deriveYoutubeSearchSlugs } from "./socials";
import { ORGANIC_PLATFORMS, type NormalizedOrganicPost, type OrganicPlatform, type ScrapeOrganicCompetitorRow } from "./types";

export type ScrapeOrganicCompetitorResult = {
  ok: boolean;
  postsUpserted: number;
  platformErrors: Record<string, string>;
  insightsErrors: string[];
  platformScrapeMeta?: Partial<Record<OrganicPlatform, YouTubeScrapeMeta>>;
  /** Posts upserted in this scrape run (for agent signal detection). */
  scrapedPosts: NormalizedOrganicPost[];
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
  const skipFirstScrapeCap =
    Boolean(platformFilter) &&
    platformFilter!.size === 1 &&
    opts?.newPlatforms?.length === 1 &&
    platformFilter!.has(opts.newPlatforms[0]!);

  const platformScrapeMeta: ScrapeOrganicCompetitorResult["platformScrapeMeta"] = {};

  for (const platform of ORGANIC_PLATFORMS) {
    if (platformFilter && !platformFilter.has(platform)) continue;

    const handle = socials[platform];
    if (!handle?.trim()) continue;

    const isNewPlatform = newPlatformSet.has(platform);
    const scrapeOpts =
      platform === "youtube"
        ? {
            newerThan: null as string | null,
            youtubeSearchSlugs: deriveYoutubeSearchSlugs(
              socials,
              handle,
              competitor.competitor_name,
            ),
          }
        : {
            newerThan: platform === "instagram" && !isNewPlatform ? newerThan : null,
          };
    const { posts, error, youtubeMeta } = await scrapeOrganicPlatformSafe(platform, handle, scrapeOpts);
    if (error) platformErrors[platform] = error;
    if (youtubeMeta) platformScrapeMeta[platform] = youtubeMeta;

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
  } else if (isFirstScrape && platformFilter && !skipFirstScrapeCap) {
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

  const scrapedPlatforms = [...new Set(allPosts.map((p) => p.platform))];
  if (scrapedPlatforms.length > 0) {
    const { archiveOrganicPreviewsForCompetitor } = await import("./archive-organic-previews");
    await archiveOrganicPreviewsForCompetitor(admin, {
      userId: competitor.user_id,
      competitorId: competitor.id,
      platforms: scrapedPlatforms,
    }).catch((e) => console.error("[organic-scrape] archiveOrganicPreviews", e));
  }

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
      platformScrapeMeta,
      scrapedPosts: allPosts,
    };
  }

  try {
    const { organicPostsToAgentInput } = await import("@/lib/agent/fetch-scrape-deltas");
    const { runAgentForUserCompetitor } = await import("@/lib/agent/run-agent");
    if (allPosts.length > 0) {
      await runAgentForUserCompetitor(admin, {
        userId: competitor.user_id,
        competitorId: competitor.id,
        scrapeResults: {
          newOrganicPosts: organicPostsToAgentInput(
            allPosts.map((p) => ({
              platform: p.platform,
              post_id: p.post_id,
              content: p.content,
              media_urls: p.media_urls,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
              posted_at: p.posted_at,
            })),
          ),
        },
      });
    }
  } catch (agentErr) {
    console.error("[organic-scrape] rival-agent failed", agentErr);
  }

  return {
    ok: true,
    postsUpserted,
    platformErrors,
    insightsErrors,
    platformScrapeMeta,
    scrapedPosts: allPosts,
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
