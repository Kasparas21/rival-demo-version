import Link from "next/link";

import type { BlogPostListItem } from "@/lib/sanity/types";

type Props = {
  posts: BlogPostListItem[];
};

export function BlogRelatedPosts({ posts }: Props) {
  if (!posts.length) return null;

  return (
    <section className="mt-12 border-t border-slate-200 pt-10" aria-labelledby="related-articles-heading">
      <h2 id="related-articles-heading" className="text-lg font-semibold text-gray-900">
        Related articles
      </h2>
      <ul className="mt-4 space-y-3">
        {posts.map((post) => (
          <li key={post._id}>
            <Link
              href={`/blog/${post.slug}`}
              className="text-base font-medium text-purple-800 underline-offset-2 hover:underline"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
