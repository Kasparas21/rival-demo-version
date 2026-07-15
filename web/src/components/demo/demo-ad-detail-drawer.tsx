"use client";

import { useEffect, useMemo } from "react";

import { AdDetailDrawer } from "@/components/ad-detail/ad-detail-drawer";
import {
  buildDemoAdDetailOpenSeed,
  primeDemoAdDetailCache,
} from "@/lib/demo/demo-ad-detail-payload";
import type { DemoAd } from "@/lib/demo/dashboard-demo-data";

type Props = {
  ad: DemoAd | null;
  onClose: () => void;
};

export function DemoAdDetailDrawer({ ad, onClose }: Props) {
  const openSeed = useMemo(() => (ad ? buildDemoAdDetailOpenSeed(ad) : null), [ad]);

  useEffect(() => {
    if (!ad) return;
    primeDemoAdDetailCache(ad);
  }, [ad]);

  return (
    <AdDetailDrawer
      adId={ad?.id ?? null}
      openSeed={openSeed}
      onClose={onClose}
      saveEnabled={false}
    />
  );
}
