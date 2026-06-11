import Link from "next/link";

import { SEO_FOOTER_BLOG_POSTS } from "@/lib/seo/important-blog-posts";

type Props = {
  className?: string;
  title?: string;
};

/** Internal links to high-value blog posts — shared across marketing + blog footers. */
export function SeoFooterPostLinks({ className = "", title = "Popular guides" }: Props) {
  return (
    <nav className={className} aria-label={title}>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-gray-600">
        {SEO_FOOTER_BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="hover:text-gray-900 hover:underline">
              {post.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
