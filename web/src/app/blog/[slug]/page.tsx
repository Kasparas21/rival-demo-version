import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogFaqSection } from "@/components/blog/blog-faq-section";
import { BlogRelatedPosts } from "@/components/blog/blog-related-posts";
import { BlogShell } from "@/components/blog/blog-shell";
import { PortableTextBody } from "@/components/blog/portable-text-body";
import { PostCover } from "@/components/blog/post-cover";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchSanity, sanityClient } from "@/lib/sanity/client";
import { formatBlogPublicationLine, primaryCategory } from "@/lib/sanity/format";
import { postBySlugQuery, postSlugsQuery } from "@/lib/sanity/queries";
import { getRelatedPosts } from "@/lib/sanity/related-posts";
import type { BlogPostDetail } from "@/lib/sanity/types";
import { urlForImage } from "@/lib/sanity/image";
import { blogPostDocumentTitle, blogPostMetaDescription } from "@/lib/seo/blog-metadata";
import { blogPostJsonLdBlocks } from "@/lib/seo/blog-json-ld";
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await fetchSanity<{ slug: string }[]>(postSlugsQuery);
  return slugs.map(({ slug }) => ({ slug }));
}

function postOgImage(post: BlogPostDetail): string | undefined {
  if (!post.mainImage?.asset?._ref) return undefined;
  return urlForImage(post.mainImage).width(1200).height(630).fit("crop").url();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await sanityClient.fetch<BlogPostDetail | null>(postBySlugQuery, { slug });
  if (!post) return { title: "Post not found" };

  const path = `/blog/${slug}`;
  const description = blogPostMetaDescription(post.excerpt, null);
  const ogImage = postOgImage(post);

  return {
    title: blogPostDocumentTitle(post.title),
    description: description || undefined,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "article",
      title: post.title,
      description: description || undefined,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post._updatedAt ?? post.publishedAt ?? undefined,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: post.title }] : [{ url: "/opengraph-image" }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description || undefined,
      images: ogImage ? [ogImage] : ["/twitter-image"],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await sanityClient.fetch<BlogPostDetail | null>(postBySlugQuery, { slug });
  if (!post) notFound();

  const categoryIds = (post.categories ?? []).map((c) => c._id).filter(Boolean) as string[];
  const relatedPosts = await getRelatedPosts(slug, categoryIds);
  const publicationLine = formatBlogPublicationLine(post.publishedAt, post._updatedAt);
  const jsonLdBlocks = blogPostJsonLdBlocks(post, slug);

  return (
    <BlogShell>
      {jsonLdBlocks.map((block, index) => (
        <JsonLd key={`${String((block as { "@type"?: string })["@type"])}-${index}`} data={block} />
      ))}

      <div className="mb-8">
        <Link href="/blog" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
          ← Back to blog
        </Link>
      </div>

      <article className="overflow-hidden rounded-[24px] bg-white shadow-md">
        <PostCover image={post.mainImage} title={post.title} variant="hero" className="min-h-[280px] md:min-h-[380px]" />
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
            {primaryCategory(post.categories)}
          </div>
          {publicationLine ? <p className="mt-2 text-sm text-gray-500">{publicationLine}</p> : null}
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
          {post.author?.name ? <p className="mt-3 text-sm text-gray-500">By {post.author.name}</p> : null}
          <div className="mt-10 border-t border-slate-100 pt-8">
            <PortableTextBody value={post.body} />
          </div>
          {post.faq?.length ? (
            <div className="mx-auto max-w-3xl">
              <BlogFaqSection items={post.faq} />
            </div>
          ) : null}
          <BlogRelatedPosts posts={relatedPosts} />
        </div>
      </article>
    </BlogShell>
  );
}
