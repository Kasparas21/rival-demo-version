"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isScrapedAdsUuid } from "@/lib/ad-detail/ad-id";
import {
  prefetchAdDetail,
  putAdDetailSeed,
  setCachedAdDetail,
  type AdDetailOpenSeed,
} from "@/lib/ad-detail/ad-detail-cache";
import type { AdDetailDrawerPayload } from "@/lib/ad-detail/ad-detail-types";

export type { AdDetailOpenSeed };

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
  const [userDismissed, setUserDismissed] = useState(false);
  const userDismissedRef = useRef(false);
  const inFlightOpenGenRef = useRef(0);

  const activeAdIdFromUrl = searchParams.get("ad");
  const activeAdId = userDismissed ? null : activeAdIdFromUrl;

  const openAd = useCallback(
    (adUuid: string, seed?: AdDetailOpenSeed) => {
      const id = adUuid.trim();
      if (!id || !isScrapedAdsUuid(id)) return;
      inFlightOpenGenRef.current += 1;
      userDismissedRef.current = false;
      setUserDismissed(false);
      if (seed) putAdDetailSeed({ ...seed, adId: id });
      prefetchAdDetail(id);
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
      const openGen = inFlightOpenGenRef.current;
      const q = new URLSearchParams({
        competitorId: cid,
        platform: pl,
        libraryItemId: lid,
      });
      try {
        const res = await fetch(`/api/ad-detail?${q.toString()}`, { credentials: "include" });
        const json = (await res.json()) as AdDetailDrawerPayload & { ad?: { id: string }; error?: string };
        if (
          openGen !== inFlightOpenGenRef.current ||
          userDismissedRef.current
        ) {
          return { ok: false, error: "Cancelled" };
        }
        if (json.ok && json.ad?.id && isScrapedAdsUuid(json.ad.id)) {
          setCachedAdDetail(json.ad.id, json);
          userDismissedRef.current = false;
          setUserDismissed(false);
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
    inFlightOpenGenRef.current += 1;
    userDismissedRef.current = true;
    setUserDismissed(true);
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
