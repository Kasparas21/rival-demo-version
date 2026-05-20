import type { PortableTextBlock } from "@portabletext/types";

export type SanityImage = {
  _type?: "image";
  asset?: { _ref: string; _type?: "reference" };
  alt?: string;
};

export type BlogPostListItem = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  mainImage: SanityImage | null;
  categories: { title: string }[] | null;
  excerpt: string | null;
};

export type BlogPostDetail = BlogPostListItem & {
  body: PortableTextBlock[] | null;
  author: { name: string | null; image: SanityImage | null } | null;
};
