import { urlForImage } from "@/lib/sanity/image";
import type { BlogPostDetail } from "@/lib/sanity/types";
import { SITE_URL } from "@/lib/seo/site";

function postImageUrl(post: BlogPostDetail): string | undefined {
  if (!post.mainImage?.asset?._ref) return undefined;
  return urlForImage(post.mainImage).width(1200).height(630).fit("crop").url();
}

export function blogPostingJsonLd(post: BlogPostDetail, slug: string) {
  const modifiedAt = post._updatedAt ?? post.publishedAt ?? undefined;
  // TODO: add author.slug to Sanity author query when author profile URLs exist.
  const authorName = post.author?.name?.trim() || "Spy Rival Team";

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt?.trim() || undefined,
    image: postImageUrl(post),
    datePublished: post.publishedAt ?? undefined,
    dateModified: modifiedAt,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Spy Rival",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/rival-logo.svg`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };
}

export function blogBreadcrumbJsonLd(post: BlogPostDetail, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${slug}`,
      },
    ],
  };
}
