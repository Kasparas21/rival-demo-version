import { libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";

import { type CreativeTestPreviewSourceRow } from "./resolve-creative-test-preview";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CreativeTestAdPreviewRow = CreativeTestPreviewSourceRow & {
  id: string;
  last_seen_at: string;
};

export type CreativeTestPreviewRow = {
  id: string;
  ad_ids: string[];
  ad_count: number;
  winner_ad_id: string | null;
  ads: CreativeTestAdPreviewRow[];
};

export function isCreativeTestAdRunning(lastSeenAt: string): boolean {
  const last = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(last)) return false;
  return (Date.now() - last) / DAY_MS <= 2;
}

/**
 * True when the ad has no reliable thumbnail for demo mode:
 * only archived Storage copies or images embedded in raw_payload count.
 * Live platform CDN URLs alone are treated as expired (they often 403 in the UI).
 */
export function creativeTestAdHasExpiredPreview(ad: CreativeTestAdPreviewRow): boolean {
  if (ad.archived_creative_url?.trim()) return false;

  const previewFromPayload = libraryPreviewUrlFromScrapedRow({
    platform: ad.platform,
    ad_creative_url: null,
    raw_payload: ad.raw_payload ?? null,
  });

  return !previewFromPayload?.trim();
}

/** Hide entire creative tests when any variant lacks a reliable preview (demo / non-debug). */
export function filterCreativeTestsWithExpiredPreviews<T extends CreativeTestPreviewRow>(tests: T[]): T[] {
  return tests.filter((test) => {
    if (test.ads.length < 2) return false;
    return test.ads.every((ad) => !creativeTestAdHasExpiredPreview(ad));
  });
}
