import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogShell } from "@/components/blog/blog-shell";
import { PortableTextBody } from "@/components/blog/portable-text-body";
import { PostCover } from "@/components/blog/post-cover";
import { sanityClient } from "@/lib/sanity/client";
import { formatBlogDate, primaryCategory, truncateExcerpt } from "@/lib/sanity/format";
import { postBySlugQuery, postSlugsQuery } from "@/lib/sanity/queries";
import type { BlogPostDetail } from "@/lib/sanity/types";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<{ slug: string }[]>(postSlugsQuery);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await sanityClient.fetch<BlogPostDetail | null>(postBySlugQuery, { slug });
  if (!post) return { title: "Post not found | Rival" };

  return {
    title: `${post.title} | Rival Blog`,
    description: truncateExcerpt(post.excerpt, 160) || undefined,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await sanityClient.fetch<BlogPostDetail | null>(postBySlugQuery, { slug });
  if (!post) notFound();

  return (
    <BlogShell>
      <div className="mb-8">
        <Link href="/blog" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
          ← Back to blog
        </Link>
      </div>

      <article className="overflow-hidden rounded-[24px] bg-white shadow-md">
        <PostCover image={post.mainImage} title={post.title} variant="hero" className="min-h-[320px] md:min-h-[420px]" />
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
            {primaryCategory(post.categories)}
            <span className="ml-2 text-gray-400">{formatBlogDate(post.publishedAt)}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
          {post.author?.name ? <p className="mt-3 text-sm text-gray-500">By {post.author.name}</p> : null}
          <div className="mt-10 border-t border-slate-100 pt-8">
            <PortableTextBody value={post.body} />
          </div>
        </div>
      </article>
    </BlogShell>
  );
}
