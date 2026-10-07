/** Ad Library search by text (`q=` / `search_type=keyword_*`) rather than one advertiser's page. */
export function isMetaKeywordSearchUrl(url: string): boolean {
  if (!/ads\/library/i.test(url)) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.searchParams.get("view_all_page_id")?.trim()) return false;
    return /keyword/i.test(u.searchParams.get("search_type") ?? "") || Boolean(u.searchParams.get("q")?.trim());
  } catch {
    return false;
  }
}
