import { libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";

export type CreativeTestPreviewSourceRow = {
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  raw_payload?: unknown;
};

/** Same preview sources as Ad Library / ad detail — Meta often stores images only in raw_payload. */
export function resolveCreativeTestPreviewUrl(row: CreativeTestPreviewSourceRow): string | null {
  const archived = row.archived_creative_url?.trim();
  if (archived) return archived;

  const fromPayload = libraryPreviewUrlFromScrapedRow({
    platform: row.platform,
    ad_creative_url: row.ad_creative_url,
    raw_payload: row.raw_payload ?? null,
  });
  if (fromPayload?.trim()) return fromPayload.trim();

  const live = row.ad_creative_url?.trim();
  return live || null;
}

export function enrichCreativeTestAdForDisplay<T extends CreativeTestPreviewSourceRow>(ad: T): T {
  const resolved = resolveCreativeTestPreviewUrl(ad);
  if (!resolved || resolved === ad.ad_creative_url?.trim()) return ad;
  return { ...ad, ad_creative_url: resolved };
}
