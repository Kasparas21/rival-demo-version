import { sanityClient } from "@/lib/sanity/client";
import { postsQuery, relatedPostsQuery } from "@/lib/sanity/queries";
import type { BlogPostListItem } from "@/lib/sanity/types";

export async function getRelatedPosts(
  slug: string,
  categoryIds: string[],
  limit = 3,
): Promise<BlogPostListItem[]> {
  if (categoryIds.length > 0) {
    const related = await sanityClient.fetch<BlogPostListItem[]>(relatedPostsQuery, {
      slug,
      categoryIds,
      limit,
    });
    if (related.length > 0) return related;
  }

  const all = await sanityClient.fetch<BlogPostListItem[]>(postsQuery);
  return all.filter((p) => p.slug !== slug).slice(0, limit);
}
