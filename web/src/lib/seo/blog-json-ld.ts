import { urlForImage } from "@/lib/sanity/image";
import type { BlogFaqItem, BlogPostDetail, ListicleItem } from "@/lib/sanity/types";
import { isListicleSlug } from "@/lib/seo/blog-metadata";
import { SCHEMA_BRAND_NAME, SITE_URL } from "@/lib/seo/site";

function postImageUrl(post: BlogPostDetail): string | undefined {
  if (!post.mainImage?.asset?._ref) return undefined;
  return urlForImage(post.mainImage).width(1200).height(630).fit("crop").url();
}

export function articleJsonLd(post: BlogPostDetail, slug: string) {
  const modifiedAt = post._updatedAt ?? post.publishedAt ?? undefined;
  const authorName = post.author?.name?.trim() || `${SCHEMA_BRAND_NAME} Team`;
  const canonical = `${SITE_URL}/blog/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
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
      name: SCHEMA_BRAND_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/rival-logo.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
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

export function faqPageJsonLdFromPost(faq: BlogFaqItem[] | null | undefined) {
  if (!faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function listicleJsonLd(items: ListicleItem[] | null | undefined, slug: string) {
  if (!items?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Ranked tools — ${slug}`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url || undefined,
    })),
  };
}

export function blogPostJsonLdBlocks(post: BlogPostDetail, slug: string) {
  const blocks: object[] = [articleJsonLd(post, slug), blogBreadcrumbJsonLd(post, slug)];

  const faq = faqPageJsonLdFromPost(post.faq);
  if (faq) blocks.push(faq);

  const isListicle = post.isListicle || isListicleSlug(slug);
  if (isListicle) {
    const list = listicleJsonLd(post.listicleItems, slug);
    if (list) blocks.push(list);
  }

  return blocks;
}

/** @deprecated Use articleJsonLd */
export const blogPostingJsonLd = articleJsonLd;
