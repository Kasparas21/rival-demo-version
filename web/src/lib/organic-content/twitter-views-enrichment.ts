import { flattenApifyDatasetRecord, runApifyActor } from "@/lib/apify/client";

import { ORGANIC_ACTOR_IDS, ORGANIC_TWITTER_MAX_TOTAL_CHARGE_USD } from "./constants";
import { extractTwitterViewsFromRaw } from "./normalize";
import type { NormalizedOrganicPost } from "./types";

const MAX_ACTOR_TIMEOUT_SECS = 300;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Resolve a tweet URL for per-post xtdata enrichment (startUrls mode). */
export function twitterPostUrlFromPost(post: NormalizedOrganicPost): string | null {
  const raw = asRecord(post.raw_data);
  const fromRaw = pickString(raw?.url, raw?.twitterUrl);
  if (fromRaw) return fromRaw;
  if (/^\d+$/.test(post.post_id)) {
    return `https://x.com/i/status/${post.post_id}`;
  }
  return null;
}

export function mergeTwitterViewsIntoPosts(
  posts: NormalizedOrganicPost[],
  enrichmentRows: unknown[],
): NormalizedOrganicPost[] {
  const viewsByPostId = new Map<string, { views: number; raw: Record<string, unknown> }>();

  for (const item of enrichmentRows) {
    const row = asRecord(item);
    if (!row) continue;
    const flat = flattenApifyDatasetRecord(row);
    const postId = pickString(flat.id, flat.id_str, flat.rest_id);
    if (!postId) continue;
    const views = extractTwitterViewsFromRaw(flat);
    if (views <= 0) continue;
    viewsByPostId.set(postId, { views, raw: flat });
  }

  return posts.map((post) => {
    const hit = viewsByPostId.get(post.post_id);
    if (!hit) return post;

    const existingRaw = asRecord(post.raw_data) ?? {};
    return {
      ...post,
      views: hit.views,
      raw_data: { ...existingRaw, ...hit.raw },
    };
  });
}

export async function enrichTwitterPostsWithViews(
  posts: NormalizedOrganicPost[],
): Promise<NormalizedOrganicPost[]> {
  if (posts.length === 0) return posts;
  if (process.env.APIFY_ORGANIC_TWITTER_ENRICH_VIEWS?.trim().toLowerCase() === "false") {
    return posts;
  }

  const urls = [...new Set(posts.map(twitterPostUrlFromPost).filter((u): u is string => Boolean(u)))];
  if (urls.length === 0) return posts;

  const needsEnrichment = posts.some((post) => (post.views ?? 0) <= 0);
  if (!needsEnrichment) return posts;

  const actorId = ORGANIC_ACTOR_IDS.twitter;
  const { items } = await runApifyActor<unknown>(
    actorId,
    {
      startUrls: urls.map((url) => ({ url })),
      maxItems: urls.length,
    },
    {
      waitSecs: MAX_ACTOR_TIMEOUT_SECS,
      timeoutSecs: MAX_ACTOR_TIMEOUT_SECS,
      maxItems: urls.length,
      maxTotalChargeUsd: ORGANIC_TWITTER_MAX_TOTAL_CHARGE_USD,
    },
  );

  return mergeTwitterViewsIntoPosts(posts, items);
}
