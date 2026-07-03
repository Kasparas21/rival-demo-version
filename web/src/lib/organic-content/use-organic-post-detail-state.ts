"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  prefetchOrganicPostDetail,
  putOrganicPostDetailSeed,
  type OrganicPostDetailOpenSeed,
} from "@/lib/organic-content/organic-post-detail-cache";

export type { OrganicPostDetailOpenSeed };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOrganicPostUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * URL-driven organic post detail drawer: `?organicPost=<organic_posts.id>`.
 */
export function useOrganicPostDetailState(competitorId: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [userDismissed, setUserDismissed] = useState(false);
  const userDismissedRef = useRef(false);

  const activePostIdFromUrl = searchParams.get("organicPost");
  const activePostId = userDismissed ? null : activePostIdFromUrl;

  const openPost = useCallback(
    (postUuid: string, seed?: OrganicPostDetailOpenSeed) => {
      const id = postUuid.trim();
      if (!id || !isOrganicPostUuid(id)) return;
      userDismissedRef.current = false;
      setUserDismissed(false);
      if (seed) putOrganicPostDetailSeed({ ...seed, postId: id });
      if (competitorId) prefetchOrganicPostDetail(competitorId, id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("organicPost", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [competitorId, searchParams, pathname, router],
  );

  const closePost = useCallback(() => {
    userDismissedRef.current = true;
    setUserDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("organicPost");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return useMemo(
    () => ({ activePostId, openPost, closePost }),
    [activePostId, openPost, closePost],
  );
}
