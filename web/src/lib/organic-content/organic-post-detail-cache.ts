import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import type { OrganicPostDetailPayload } from "@/lib/organic-content/organic-post-detail-types";

export type OrganicPostDetailOpenSeed = {
  postId: string;
  platform: string;
  post_id: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  posted_at: string | null;
  post_url?: string | null;
  product_type?: string | null;
  author_username?: string | null;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  media_aspect?: OrganicMediaAspect;
  competitor: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
};

type CachedEntry = {
  payload: OrganicPostDetailPayload;
  competitorId: string;
  fetchedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const detailCache = new Map<string, CachedEntry>();
const seedCache = new Map<string, OrganicPostDetailOpenSeed>();
const inflight = new Map<string, Promise<OrganicPostDetailPayload | null>>();

function cacheKey(competitorId: string, postId: string): string {
  return `${competitorId}:${postId}`;
}

export function putOrganicPostDetailSeed(seed: OrganicPostDetailOpenSeed): void {
  seedCache.set(seed.postId, seed);
}

export function buildOrganicPostDetailSeed(
  post: {
    id: string;
    platform: string;
    post_id: string;
    content: string | null;
    media_urls: string[];
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    posted_at: string | null;
    post_url?: string | null;
    product_type?: string | null;
    author_username?: string | null;
    author_display_name?: string | null;
    author_avatar_url?: string | null;
    media_aspect?: OrganicMediaAspect;
  },
  competitor: { id: string; name: string; logo_url?: string | null },
): OrganicPostDetailOpenSeed {
  return {
    postId: post.id,
    platform: post.platform,
    post_id: post.post_id,
    content: post.content,
    media_urls: post.media_urls,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    posted_at: post.posted_at,
    post_url: post.post_url,
    product_type: post.product_type,
    author_username: post.author_username,
    author_display_name: post.author_display_name,
    author_avatar_url: post.author_avatar_url,
    media_aspect: post.media_aspect,
    competitor,
  };
}

export function getOrganicPostDetailSeed(postId: string): OrganicPostDetailOpenSeed | null {
  return seedCache.get(postId) ?? null;
}

export function getCachedOrganicPostDetail(
  competitorId: string,
  postId: string,
): OrganicPostDetailPayload | null {
  const hit = detailCache.get(cacheKey(competitorId, postId));
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    detailCache.delete(cacheKey(competitorId, postId));
    return null;
  }
  return hit.payload;
}

export function setCachedOrganicPostDetail(
  competitorId: string,
  postId: string,
  payload: OrganicPostDetailPayload,
): void {
  if (!payload.ok) return;
  detailCache.set(cacheKey(competitorId, postId), {
    payload,
    competitorId,
    fetchedAt: Date.now(),
  });
}

export async function fetchOrganicPostDetailPayload(
  competitorId: string,
  postId: string,
): Promise<OrganicPostDetailPayload | null> {
  const key = cacheKey(competitorId, postId);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/competitor/${encodeURIComponent(competitorId)}/organic/posts/${encodeURIComponent(postId)}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as OrganicPostDetailPayload;
      if (json.ok) setCachedOrganicPostDetail(competitorId, postId, json);
      return json;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function prefetchOrganicPostDetail(competitorId: string, postId: string): void {
  if (getCachedOrganicPostDetail(competitorId, postId)) return;
  void fetchOrganicPostDetailPayload(competitorId, postId);
}
