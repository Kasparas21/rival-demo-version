export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
