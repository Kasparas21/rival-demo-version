"use client";

import { useEffect, useState } from "react";

import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteGoogleTagManager } from "@/components/analytics/google-tag-manager";
import { useMarketingConsent } from "@/components/analytics/marketing-consent-provider";
import { SiteMetaPixel } from "@/components/analytics/meta-pixel";

/** Load GTM / GA / Meta only after explicit marketing consent — keeps landing TBT low. */
export function DeferredMarketingTags() {
  const { status, isResolved } = useMarketingConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isResolved || status !== "granted") {
    return null;
  }

  return (
    <>
      <SiteGoogleAnalytics />
      <SiteGoogleTagManager />
      <SiteMetaPixel />
    </>
  );
}
