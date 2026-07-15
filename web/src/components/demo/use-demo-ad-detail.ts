"use client";

import { useCallback, useState } from "react";

import { primeDemoAdDetailCache } from "@/lib/demo/demo-ad-detail-payload";
import type { DemoAd } from "@/lib/demo/dashboard-demo-data";
import { resolveDemoAdById } from "@/lib/demo/resolve-demo-ad";

export function useDemoAdDetail(domain?: string) {
  const [detailAd, setDetailAd] = useState<DemoAd | null>(null);

  const openAdById = useCallback(
    (adId: string) => {
      const ad = resolveDemoAdById(adId, domain);
      if (!ad) return;
      primeDemoAdDetailCache(ad);
      setDetailAd(ad);
    },
    [domain],
  );

  const closeAdDetail = useCallback(() => setDetailAd(null), []);

  return { detailAd, openAdById, closeAdDetail };
}
