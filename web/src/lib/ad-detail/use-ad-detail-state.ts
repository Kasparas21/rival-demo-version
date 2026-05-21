"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isScrapedAdsUuid } from "@/lib/ad-detail/ad-id";

export type ResolveLibraryAdResult =
  | { ok: true; adId: string }
  | { ok: false; error: string; status?: number };

/**
 * URL-driven ad detail drawer: `?ad=<scraped_ads.uuid>`.
 * For Ad Library cards (library-native `id`), use {@link resolveLibraryAdAndOpen}.
 */
export function useAdDetailState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeAdId = searchParams.get("ad");

  const openAd = useCallback(
    (adUuid: string) => {
      const id = adUuid.trim();
      if (!id || !isScrapedAdsUuid(id)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("ad", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  /**
   * Resolve `scraped_ads.id` via `raw_payload->>'id'` (normalized library card id) + competitor + platform.
   * Avoids `stable_ad_key`, which may be missing in older databases.
   */
  const resolveLibraryAdAndOpen = useCallback(
    async (
      competitorId: string,
      platform: string,
      libraryItemId: string,
    ): Promise<ResolveLibraryAdResult> => {
      const cid = competitorId.trim();
      const pl = platform.trim().toLowerCase();
      const lid = libraryItemId.trim();
      if (!cid || !pl || !lid) {
        return { ok: false, error: "Missing competitor or ad id" };
      }
      const q = new URLSearchParams({
        competitorId: cid,
        platform: pl,
        libraryItemId: lid,
      });
      try {
        const res = await fetch(`/api/ad-detail?${q.toString()}`, { credentials: "include" });
        const json = (await res.json()) as { ok?: boolean; ad?: { id: string }; error?: string };
        if (json.ok && json.ad?.id && isScrapedAdsUuid(json.ad.id)) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("ad", json.ad.id);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          return { ok: true, adId: json.ad.id };
        }
        return {
          ok: false,
          error: json.error ?? (res.ok ? "Ad not found" : "Could not load ad detail"),
          status: res.status,
        };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [pathname, router, searchParams],
  );

  const closeAd = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ad");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return useMemo(
    () => ({ activeAdId, openAd, closeAd, resolveLibraryAdAndOpen }),
    [activeAdId, openAd, closeAd, resolveLibraryAdAndOpen],
  );
}
