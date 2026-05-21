import type { MetaAdCard } from "./normalize";
import { metaArchiveIdFromAdLibraryUrl, stableAdKeyForMeta } from "./stable-ad-keys";

/** All ids that may identify the same Meta library card across cache, scraped_ads, and saved-ads check. */
export function metaLibraryItemLookupKeys(ad: Pick<MetaAdCard, "id" | "adLibraryUrl">): string[] {
  const keys = new Set<string>();
  const id = ad.id?.trim();
  if (id) keys.add(id);

  const stable = stableAdKeyForMeta(ad as MetaAdCard);
  if (stable) keys.add(stable);

  const archive = metaArchiveIdFromAdLibraryUrl(ad.adLibraryUrl ?? "");
  if (archive) keys.add(archive);

  return [...keys];
}

export function metaPreviewUrlFromMap(
  ad: Pick<MetaAdCard, "id" | "adLibraryUrl">,
  previewUrls: Record<string, string>,
): string | null {
  for (const key of metaLibraryItemLookupKeys(ad)) {
    const url = previewUrls[`meta:${key}`]?.trim();
    if (url) return url;
  }
  return null;
}

export function metaScrapedRowMatchesLibraryItemId(
  payload: Pick<MetaAdCard, "id" | "adLibraryUrl"> | null | undefined,
  libraryItemId: string,
): boolean {
  const want = libraryItemId.trim();
  if (!want || !payload) return false;
  return metaLibraryItemLookupKeys(payload).includes(want);
}
