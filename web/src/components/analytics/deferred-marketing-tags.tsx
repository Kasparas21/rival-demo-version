"use client";

import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteGoogleTagManager } from "@/components/analytics/google-tag-manager";
import { SiteMetaPixel } from "@/components/analytics/meta-pixel";

/** Marketing measurement tags (GTM / GA / Meta). */
export function DeferredMarketingTags() {
  return (
    <>
      <SiteGoogleAnalytics />
      <SiteGoogleTagManager />
      <SiteMetaPixel />
    </>
  );
}
