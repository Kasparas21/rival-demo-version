import type { Metadata } from "next";
import Link from "next/link";

import { BlogShell } from "@/components/blog/blog-shell";
import { PostCover } from "@/components/blog/post-cover";
import { sanityClient } from "@/lib/sanity/client";
import { formatBlogDate, primaryCategory, truncateExcerpt } from "@/lib/sanity/format";
import { postsQuery } from "@/lib/sanity/queries";
import type { BlogPostListItem } from "@/lib/sanity/types";

export const metadata: Metadata = {
  title: "Blog | Rival",
  description: "Insights on competitor ads, creative strategy, and paid social.",
};

export const revalidate = 60;

const categories = ["All", "Product", "Business"];

export default async function BlogPage() {
  const posts = await sanityClient.fetch<BlogPostListItem[]>(postsQuery);
  const heroPost = posts[0] ?? null;
  const gridPosts = posts.slice(1);

  return (
    <BlogShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm">
          {categories.map((cat, index) => (
            <button
              key={cat}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                index === 0 ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-gray-500 shadow-sm">
          <span>🔍</span>
          Search
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">No posts yet</p>
          <p className="mt-2 text-sm text-gray-600">Publish a post in Sanity Studio and it will appear here.</p>
        </div>
      ) : null}

      {heroPost ? (
        <section className="mt-8 grid gap-8">
          <article className="grid gap-6 overflow-hidden rounded-[22px] bg-white shadow-md md:grid-cols-[1.2fr_1fr]">
            <PostCover image={heroPost.mainImage} title={heroPost.title} variant="hero" />
            <div className="flex flex-col justify-center gap-3 px-6 py-8">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
                {primaryCategory(heroPost.categories)}
                <span className="ml-2 text-gray-400">{formatBlogDate(heroPost.publishedAt)}</span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">{heroPost.title}</h1>
              <p className="text-sm text-gray-600">{truncateExcerpt(heroPost.excerpt)}</p>
              <Link className="text-sm font-semibold text-gray-900" href={`/blog/${heroPost.slug}`}>
                Read Article →
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      {gridPosts.length > 0 ? (
        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post, index) => (
            <article key={post._id} className="overflow-hidden rounded-[20px] bg-white shadow-md">
              <PostCover image={post.mainImage} title={post.title} index={index} />
              <div className="px-5 py-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
                  {primaryCategory(post.categories)}
                  <span className="ml-2 text-gray-400">{formatBlogDate(post.publishedAt)}</span>
                </div>
                <h2 className="mt-2 text-base font-semibold text-gray-900">{post.title}</h2>
                <p className="mt-2 text-xs text-gray-600">{truncateExcerpt(post.excerpt, 120)}</p>
                <Link className="mt-4 inline-block text-xs font-semibold text-gray-900" href={`/blog/${post.slug}`}>
                  Read →
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </BlogShell>
  );
}
