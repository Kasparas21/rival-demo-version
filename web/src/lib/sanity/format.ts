export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "Published Mar 14, 2026 · Updated May 28, 2026" */
export function formatBlogPublicationLine(
  publishedAt: string | null | undefined,
  updatedAt: string | null | undefined,
): string | null {
  const published = formatBlogDate(publishedAt);
  if (!published) return null;

  const updated = formatBlogDate(updatedAt);
  if (!updated || updated === published) {
    return `Published ${published}`;
  }

  return `Published ${published} · Updated ${updated}`;
}

export function truncateExcerpt(text: string | null | undefined, max = 180): string {
  const value = text?.trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

export function primaryCategory(categories: { title: string }[] | null | undefined): string {
  return categories?.[0]?.title ?? "Blog";
}
