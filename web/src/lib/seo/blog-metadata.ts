import { truncateExcerpt } from "@/lib/sanity/format";
import { SCHEMA_BRAND_NAME } from "@/lib/seo/site";

const TITLE_SUFFIX = ` | ${SCHEMA_BRAND_NAME}`;
const MAX_TITLE_LEN = 60;

/** Keyword-leading post title; suffix only when total ≤ 60 chars. */
export function blogPostDocumentTitle(h1: string): string {
  const trimmed = h1.trim();
  if (!trimmed) return SCHEMA_BRAND_NAME;
  if (trimmed.length + TITLE_SUFFIX.length <= MAX_TITLE_LEN) {
    return `${trimmed}${TITLE_SUFFIX}`;
  }
  return trimmed.length <= MAX_TITLE_LEN ? trimmed : trimmed.slice(0, MAX_TITLE_LEN).trim();
}

export function blogPostMetaDescription(excerpt: string | null | undefined, bodyFallback: string | null): string {
  const raw = excerpt?.trim() || bodyFallback?.trim() || "";
  return truncateExcerpt(raw, 160) ?? "";
}

export function isListicleSlug(slug: string): boolean {
  return /10-best-|alternatives|best-.+-tools/i.test(slug);
}
