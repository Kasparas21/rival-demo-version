import { flattenApifyDatasetRecord, runApifyActor } from "@/lib/apify/client";

import {
  ORGANIC_ACTOR_IDS,
  ORGANIC_SCRAPE_MAX_ITEMS,
  ORGANIC_TWITTER_MAX_TOTAL_CHARGE_USD,
  ORGANIC_YOUTUBE_MIN_CHARGE_USD,
  ORGANIC_YOUTUBE_SHORTS_ACTOR,
  ORGANIC_YOUTUBE_VIDEOS_ACTOR,
} from "./constants";
import { normalizeOrganicItems } from "./normalize";
import {
  buildApidojoYouTubeVideosInput,
  buildCalmBuilderYouTubeShortsInput,
  buildPlatformActorInput,
  buildYouTubeChannelScrapeInput,
  buildYouTubePlaylistScrapeInput,
  buildYouTubeSearchFallbackInput,
  filterYouTubePostsForChannel,
  youtubeChannelIdFromHandle,
  type PlatformActorInputOpts,
} from "./socials";
import { enrichTwitterPostsWithViews } from "./twitter-views-enrichment";
import type { NormalizedOrganicPost, OrganicPlatform } from "./types";

const MAX_ACTOR_TIMEOUT_SECS = 300;

export type YouTubeScrapeMeta = {
  apifyRows: number;
  keptRows: number;
  mode: "shorts" | "videos" | "mixed" | "playlist" | "search";
  apifyRuns: number;
  shortsRows?: number;
  videoRows?: number;
};

export type ScrapePlatformResult = {
  posts: NormalizedOrganicPost[];
  error?: string;
  youtubeMeta?: YouTubeScrapeMeta;
};

function isLegacyScrapesmithYouTubeActor(actorId: string): boolean {
  return /scrapesmith/i.test(actorId);
}

function youtubeProductType(post: NormalizedOrganicPost): "short" | "video" {
  const raw = post.raw_data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "video";
  const row = raw as Record<string, unknown>;
  if (row.product_type === "short" || row.isShort === true) return "short";
  const url = typeof row.video_url === "string" ? row.video_url : typeof row.url === "string" ? row.url : "";
  if (/youtube\.com\/shorts\//i.test(url)) return "short";
  return "video";
}

function sortPostsByDateDesc(posts: NormalizedOrganicPost[]): NormalizedOrganicPost[] {
  return [...posts].sort((a, b) => {
    const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return tb - ta;
  });
}

/** Up to ORGANIC_SCRAPE_MAX_ITEMS per format (Shorts + long-form). */
function dedupeAndCapYouTubePosts(posts: NormalizedOrganicPost[]): NormalizedOrganicPost[] {
  const seen = new Set<string>();
  const shorts: NormalizedOrganicPost[] = [];
  const videos: NormalizedOrganicPost[] = [];

  for (const post of sortPostsByDateDesc(posts)) {
    if (seen.has(post.post_id)) continue;
    seen.add(post.post_id);
    if (youtubeProductType(post) === "short") {
      if (shorts.length < ORGANIC_SCRAPE_MAX_ITEMS) shorts.push(post);
    } else if (videos.length < ORGANIC_SCRAPE_MAX_ITEMS) {
      videos.push(post);
    }
  }

  return sortPostsByDateDesc([...videos, ...shorts]);
}

function dedupeRawYouTubeItems(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of items) {
    const row = flattenApifyDatasetRecord(
      item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {},
    );
    const id =
      (typeof row.video_id === "string" && row.video_id) ||
      (typeof row.id === "string" && row.id) ||
      null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function extractChannelIdFromRawItems(items: unknown[]): string | null {
  for (const item of items) {
    const row = flattenApifyDatasetRecord(
      item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {},
    );
    const details =
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null;
    const channel =
      row.channel && typeof row.channel === "object" && !Array.isArray(row.channel)
        ? (row.channel as Record<string, unknown>)
        : null;
    const id = row.channel_id ?? row.channelId ?? details?.channelId ?? channel?.id;
    if (typeof id === "string" && id.startsWith("UC")) return id;
  }
  return null;
}

function resolveChannelIdFromPosts(
  posts: NormalizedOrganicPost[],
  handle: string,
  fallbackItems: unknown[],
): string | null {
  const fromHandle = youtubeChannelIdFromHandle(handle);
  if (fromHandle) return fromHandle;

  const fromRaw = extractChannelIdFromRawItems(fallbackItems);
  if (fromRaw) return fromRaw;

  for (const post of filterYouTubePostsForChannel(posts, handle, null)) {
    const raw = post.raw_data;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const details =
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null;
    const channel =
      row.channel && typeof row.channel === "object" && !Array.isArray(row.channel)
        ? (row.channel as Record<string, unknown>)
        : null;
    const id = row.channel_id ?? row.channelId ?? details?.channelId ?? channel?.id;
    if (typeof id === "string" && id.startsWith("UC")) return id;
  }
  return null;
}

async function scrapeCalmBuilderYouTubeShorts(
  handle: string,
  runOpts: Parameters<typeof runApifyActor>[2],
): Promise<{ items: unknown[]; channelId: string | null }> {
  const { items } = await runApifyActor<unknown>(
    ORGANIC_YOUTUBE_SHORTS_ACTOR,
    buildCalmBuilderYouTubeShortsInput(handle),
    {
      ...runOpts,
      maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
      maxTotalChargeUsd: ORGANIC_YOUTUBE_MIN_CHARGE_USD,
    },
  );
  return {
    items: dedupeRawYouTubeItems(items),
    channelId: youtubeChannelIdFromHandle(handle) ?? extractChannelIdFromRawItems(items),
  };
}

async function scrapeApidojoYouTubeVideos(
  handle: string,
  runOpts: Parameters<typeof runApifyActor>[2],
): Promise<{ items: unknown[]; channelId: string | null }> {
  const { items } = await runApifyActor<unknown>(
    ORGANIC_YOUTUBE_VIDEOS_ACTOR,
    buildApidojoYouTubeVideosInput(handle),
    {
      ...runOpts,
      maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
    },
  );
  return {
    items: dedupeRawYouTubeItems(items),
    channelId: youtubeChannelIdFromHandle(handle) ?? extractChannelIdFromRawItems(items),
  };
}

/** calm_builder Shorts + apidojo long-form — two targeted Apify runs. */
async function scrapeYouTubeDualActors(
  handle: string,
  runOpts: Parameters<typeof runApifyActor>[2],
  opts?: PlatformActorInputOpts,
): Promise<{ posts: NormalizedOrganicPost[]; youtubeMeta: YouTubeScrapeMeta }> {
  const [shortsResult, videosResult] = await Promise.all([
    scrapeCalmBuilderYouTubeShorts(handle, runOpts),
    scrapeApidojoYouTubeVideos(handle, runOpts),
  ]);

  const allItems = [...shortsResult.items, ...videosResult.items];
  const apifyRows = allItems.length;
  let normalized = normalizeOrganicItems("youtube", allItems);
  const resolvedChannelId =
    shortsResult.channelId ??
    videosResult.channelId ??
    resolveChannelIdFromPosts(normalized, handle, allItems);

  normalized = filterYouTubePostsForChannel(
    normalized,
    handle,
    resolvedChannelId,
    opts?.youtubeSearchSlugs ?? [],
  );
  normalized = dedupeAndCapYouTubePosts(normalized);

  const shortsRows = normalized.filter((p) => youtubeProductType(p) === "short").length;
  const videoRows = normalized.filter((p) => youtubeProductType(p) === "video").length;

  return {
    posts: normalized,
    youtubeMeta: {
      apifyRows,
      keptRows: normalized.length,
      mode: "mixed",
      apifyRuns: 2,
      shortsRows,
      videoRows,
    },
  };
}

async function scrapeScrapesmithYouTubeItems(
  actorId: string,
  handle: string,
  runOpts: Parameters<typeof runApifyActor>[2],
  extraSearchSlugs: string[] = [],
): Promise<{
  items: unknown[];
  mode: YouTubeScrapeMeta["mode"];
  channelId: string | null;
  apifyRuns: number;
}> {
  let apifyRuns = 0;
  const channelIdFromHandle = youtubeChannelIdFromHandle(handle);

  const searchInput = buildYouTubeSearchFallbackInput(handle, 30, extraSearchSlugs);
  if (searchInput) {
    const { items: searchItems } = await runApifyActor<unknown>(actorId, searchInput, {
      ...runOpts,
      maxItems: Math.max(ORGANIC_SCRAPE_MAX_ITEMS * 2, 50),
    });
    apifyRuns += 1;
    const items = dedupeRawYouTubeItems(searchItems);
    if (items.length > 0) {
      return { items, mode: "search", channelId: channelIdFromHandle, apifyRuns };
    }
  }

  if (channelIdFromHandle) {
    const { items: playlistItems } = await runApifyActor<unknown>(
      actorId,
      buildYouTubePlaylistScrapeInput(channelIdFromHandle),
      runOpts,
    );
    apifyRuns += 1;
    const playlistDeduped = dedupeRawYouTubeItems(playlistItems);
    if (playlistDeduped.length > 0) {
      return { items: playlistDeduped, mode: "playlist", channelId: channelIdFromHandle, apifyRuns };
    }

    const { items: channelItems } = await runApifyActor<unknown>(
      actorId,
      buildYouTubeChannelScrapeInput(handle),
      runOpts,
    );
    apifyRuns += 1;
    const channelDeduped = dedupeRawYouTubeItems(channelItems);
    if (channelDeduped.length > 0) {
      return { items: channelDeduped, mode: "playlist", channelId: channelIdFromHandle, apifyRuns };
    }
  }

  return { items: [], mode: "search", channelId: channelIdFromHandle, apifyRuns };
}

export async function scrapeOrganicPlatform(
  platform: OrganicPlatform,
  handle: string,
  opts?: PlatformActorInputOpts,
): Promise<{ posts: NormalizedOrganicPost[]; youtubeMeta?: YouTubeScrapeMeta }> {
  const actorId = ORGANIC_ACTOR_IDS[platform];
  const runOpts = {
    waitSecs: MAX_ACTOR_TIMEOUT_SECS,
    timeoutSecs: MAX_ACTOR_TIMEOUT_SECS,
    maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
    ...(platform === "twitter" ? { maxTotalChargeUsd: ORGANIC_TWITTER_MAX_TOTAL_CHARGE_USD } : {}),
  };

  if (platform === "youtube") {
    if (!isLegacyScrapesmithYouTubeActor(actorId)) {
      const { posts, youtubeMeta } = await scrapeYouTubeDualActors(handle, runOpts, opts);
      return { posts, youtubeMeta };
    }

    const { items, mode, channelId, apifyRuns } = await scrapeScrapesmithYouTubeItems(
      actorId,
      handle,
      runOpts,
      opts?.youtubeSearchSlugs ?? [],
    );
    const apifyRows = items.length;
    let normalized = normalizeOrganicItems(platform, items);

    if (mode === "search") {
      const resolvedChannelId = resolveChannelIdFromPosts(normalized, handle, items);
      normalized = filterYouTubePostsForChannel(
        normalized,
        handle,
        resolvedChannelId ?? channelId,
        opts?.youtubeSearchSlugs ?? [],
      );
    }

    const keptRows = normalized.length;
    normalized = dedupeAndCapYouTubePosts(normalized);
    return {
      posts: normalized,
      youtubeMeta: { apifyRows, keptRows, mode, apifyRuns },
    };
  }

  const input = buildPlatformActorInput(platform, handle, opts);
  const { items } = await runApifyActor<unknown>(actorId, input, runOpts);
  const normalized = normalizeOrganicItems(platform, items).slice(0, ORGANIC_SCRAPE_MAX_ITEMS);

  if (platform === "twitter") {
    return { posts: enrichTwitterPostsWithViews(normalized) };
  }

  return { posts: normalized };
}

export async function scrapeOrganicPlatformSafe(
  platform: OrganicPlatform,
  handle: string,
  opts?: PlatformActorInputOpts,
): Promise<ScrapePlatformResult> {
  try {
    const { posts, youtubeMeta } = await scrapeOrganicPlatform(platform, handle, opts);
    return { posts, youtubeMeta };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[organic] ${platform} scrape failed:`, message);
    return { posts: [], error: message };
  }
}
