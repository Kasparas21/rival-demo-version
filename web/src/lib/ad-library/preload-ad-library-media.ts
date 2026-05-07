import type { AdsLibraryResponse } from "./api-types";
import { META_ADS_INLINE_PREVIEW } from "./constants";

const DEFAULT_MAX_URLS = 48;

function pushHttpUrl(set: Set<string>, raw?: string | null) {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!/^https:\/\//i.test(t)) return;
  if (t.length > 4096) return;
  set.add(t);
}

/**
 * Image URLs surfaced in Ads Library grids (first {@link META_ADS_INLINE_PREVIEW} per platform).
 * Used to warm the browser cache before navigating from the onboarding scan → competitor page.
 */
export function collectAdsLibraryWarmupUrls(
  full: AdsLibraryResponse,
  opts?: { perPlatform?: number; maxUrls?: number }
): string[] {
  const per = opts?.perPlatform ?? META_ADS_INLINE_PREVIEW;
  const max = opts?.maxUrls ?? DEFAULT_MAX_URLS;
  const urls = new Set<string>();

  for (const ad of full.meta.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
    pushHttpUrl(urls, ad.pageProfilePic);
  }

  for (const row of full.google.rows.slice(0, per)) {
    if (row.type === "google") {
      pushHttpUrl(urls, row.previewUrl ?? row.img);
    } else {
      pushHttpUrl(urls, row.thumbnail);
    }
  }

  for (const ad of full.linkedin.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
    pushHttpUrl(urls, ad.advertiserLogoUrl);
  }

  for (const ad of full.tiktok.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
  }

  for (const ad of full.microsoft.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
  }

  for (const ad of full.pinterest.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
  }

  for (const ad of full.snapchat.ads.slice(0, per)) {
    pushHttpUrl(urls, ad.img);
  }

  return [...urls].slice(0, max);
}

/** Decode images into the HTTP cache via `Image` (best-effort; caller should cap wall time). */
export async function preloadAdsLibraryWarmupUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  await Promise.all(
    urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const finish = () => resolve();
          img.onload = finish;
          img.onerror = finish;
          img.src = u;
        })
    )
  );
}
