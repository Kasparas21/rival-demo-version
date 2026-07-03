import { describe, expect, it } from "vitest";

import type { NormalizedOrganicPost } from "../types";

function sortPostsByDateDesc(posts: NormalizedOrganicPost[]): NormalizedOrganicPost[] {
  return [...posts].sort((a, b) => {
    const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return tb - ta;
  });
}

function dedupeAndCapYouTubePosts(
  posts: NormalizedOrganicPost[],
  cap: number,
): NormalizedOrganicPost[] {
  const seen = new Set<string>();
  const out: NormalizedOrganicPost[] = [];
  for (const post of sortPostsByDateDesc(posts)) {
    if (seen.has(post.post_id)) continue;
    seen.add(post.post_id);
    out.push(post);
    if (out.length >= cap) break;
  }
  return out;
}

describe("YouTube post merge logic", () => {
  it("sorts by date, dedupes, and caps results", () => {
    const posts: NormalizedOrganicPost[] = [
      {
        platform: "youtube",
        post_id: "older",
        content: "old",
        posted_at: "2026-01-01T00:00:00.000Z",
        likes: 0,
        comments: 0,
        shares: 0,
        views: 1,
        media_urls: [],
        tagged_accounts: [],
        co_authors: [],
        raw_data: {},
      },
      {
        platform: "youtube",
        post_id: "newer",
        content: "new",
        posted_at: "2026-06-01T00:00:00.000Z",
        likes: 0,
        comments: 0,
        shares: 0,
        views: 2,
        media_urls: [],
        tagged_accounts: [],
        co_authors: [],
        raw_data: {},
      },
      {
        platform: "youtube",
        post_id: "newer",
        content: "dup",
        posted_at: "2026-06-01T00:00:00.000Z",
        likes: 0,
        comments: 0,
        shares: 0,
        views: 3,
        media_urls: [],
        tagged_accounts: [],
        co_authors: [],
        raw_data: {},
      },
    ];

    expect(dedupeAndCapYouTubePosts(posts, 2).map((p) => p.post_id)).toEqual(["newer", "older"]);
  });
});
