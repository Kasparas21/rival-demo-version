import { fetchSanity } from "@/lib/sanity/client";
import { postSlugsQuery } from "@/lib/sanity/queries";

export type PostSlugEntry = {
  slug: string;
  publishedAt: string | null;
  _updatedAt: string | null;
};

/** Normalized blog slug path segment (no leading/trailing slashes). */
export function normalizeBlogSlug(slug: string): string | null {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  return clean || null;
}

export async function getAllPostSlugs(): Promise<PostSlugEntry[]> {
  const rows = await fetchSanity<PostSlugEntry[]>(postSlugsQuery);
  return rows.filter((row) => normalizeBlogSlug(row.slug) != null);
}
