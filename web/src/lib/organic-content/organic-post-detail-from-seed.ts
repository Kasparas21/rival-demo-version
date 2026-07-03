import type { OrganicPostDetailOpenSeed } from "@/lib/organic-content/organic-post-detail-cache";
import type { OrganicPostDetailPayload } from "@/lib/organic-content/organic-post-detail-types";

export function organicPostDetailPayloadFromSeed(seed: OrganicPostDetailOpenSeed): OrganicPostDetailPayload {
  return {
    ok: true,
    post: {
      id: seed.postId,
      platform: seed.platform,
      post_id: seed.post_id,
      content: seed.content,
      media_urls: seed.media_urls,
      likes: seed.likes,
      comments: seed.comments,
      shares: seed.shares,
      views: seed.views,
      posted_at: seed.posted_at,
      post_url: seed.post_url,
      product_type: seed.product_type,
      author_username: seed.author_username,
      author_display_name: seed.author_display_name,
      author_avatar_url: seed.author_avatar_url,
      media_aspect: seed.media_aspect,
    },
    competitor: {
      id: seed.competitor.id,
      name: seed.competitor.name,
      logo_url: seed.competitor.logo_url ?? null,
    },
    context: {},
  };
}

export function isFullOrganicPostDetailPayload(res: OrganicPostDetailPayload): boolean {
  return Boolean(res.ok && res.post && res.competitor && res.context);
}
