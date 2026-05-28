import type { MetadataRoute } from "next";

import { getAllPostSlugs, normalizeBlogSlug } from "@/lib/sanity/posts";
import { SITE_URL } from "@/lib/seo/site";

const STATIC_ROUTES = ["", "/blog", "/about", "/privacy", "/terms", "/cookies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getAllPostSlugs();

  return [
    ...STATIC_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
    })),
    ...posts.map((post) => {
      const slug = normalizeBlogSlug(post.slug)!;
      const lastModified = post._updatedAt ?? post.publishedAt;
      return {
        url: `${SITE_URL}/blog/${slug}`,
        lastModified: lastModified ? new Date(lastModified) : now,
      };
    }),
  ];
}
