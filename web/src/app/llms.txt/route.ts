import { fetchSanity } from "@/lib/sanity/client";
import { postsQuery } from "@/lib/sanity/queries";
import type { BlogPostListItem } from "@/lib/sanity/types";
import { SCHEMA_PLAN_PRICING_USD } from "@/lib/seo/schema-pricing";
import { LANDING_PRICE_SYMBOL } from "@/lib/billing/plan-price-format";
import { SEO_FOOTER_BLOG_POSTS } from "@/lib/seo/important-blog-posts";
import { SITE_URL } from "@/lib/seo/site";
import { truncateExcerpt } from "@/lib/sanity/format";

export const revalidate = 3600;

export async function GET() {
  let posts: BlogPostListItem[] = [];
  try {
    posts = await fetchSanity<BlogPostListItem[]>(postsQuery);
  } catch {
    posts = [];
  }

  const lines = [
    "# Rival (spy-rival.com)",
    `> Rival is multi-platform competitor advertising intelligence: track competitor ads across Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat. Plans: Starter ${LANDING_PRICE_SYMBOL}` +
      `${SCHEMA_PLAN_PRICING_USD.starter}/mo, Pro ${LANDING_PRICE_SYMBOL}${SCHEMA_PLAN_PRICING_USD.pro}/mo, Agency ${LANDING_PRICE_SYMBOL}${SCHEMA_PLAN_PRICING_USD.agency}/mo. Key features: Strategy Map, Activity Score, Autopilot 24/7, Copy Vault, competitor timelines, and landing-page archive.`,
    "",
    "## Key pages",
    `- Homepage: ${SITE_URL}/`,
    `- Pricing: ${SITE_URL}/#pricing`,
    `- Features: ${SITE_URL}/features`,
    `- Blog: ${SITE_URL}/blog`,
    `- About: ${SITE_URL}/about`,
    "",
    "## Popular guides",
    ...SEO_FOOTER_BLOG_POSTS.map((p) => `- ${p.label}: ${SITE_URL}/blog/${p.slug}`),
    "",
    "## Blog posts",
    ...posts.map((post) => {
      const summary = truncateExcerpt(post.excerpt, 120) || post.title;
      return `- ${post.title}: ${SITE_URL}/blog/${post.slug} — ${summary}`;
    }),
    "",
    `Contact: hello@spy-rival.com`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
