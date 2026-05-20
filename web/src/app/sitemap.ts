import type { MetadataRoute } from "next";

import { sanityClient } from "@/lib/sanity/client";
import { postSlugsQuery } from "@/lib/sanity/queries";

const siteUrl = "https://spy-rival.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await sanityClient.fetch<{ slug: string; publishedAt: string | null }[]>(postSlugsQuery);

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: posts[0]?.publishedAt ? new Date(posts[0].publishedAt) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${siteUrl}/checkout`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
