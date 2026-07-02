import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { Json } from "@/lib/supabase/types";

import type { NormalizedOrganicPost } from "./types";

export async function upsertOrganicPosts(
  admin: SupabaseClient<Database>,
  params: {
    competitorId: string;
    userId: string;
    posts: NormalizedOrganicPost[];
  },
): Promise<number> {
  const { competitorId, userId, posts } = params;
  if (posts.length === 0) return 0;

  const rows = posts.map((post) => ({
    competitor_id: competitorId,
    user_id: userId,
    platform: post.platform,
    post_id: post.post_id,
    content: post.content,
    media_urls: post.media_urls,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    posted_at: post.posted_at,
    scraped_at: new Date().toISOString(),
    raw_data: post.raw_data as Json,
  }));

  const { error } = await admin.from("organic_posts").upsert(rows, {
    onConflict: "competitor_id,platform,post_id",
  });

  if (error) throw new Error(error.message);
  return rows.length;
}
