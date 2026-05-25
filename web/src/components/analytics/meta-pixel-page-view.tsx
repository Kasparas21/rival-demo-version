"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useMarketingConsent } from "@/components/analytics/marketing-consent-provider";
import { trackMetaPageView } from "@/lib/analytics/meta-pixel-client";
import { getMetaPixelId } from "@/lib/analytics/meta-pixel";

/** SPA route changes — initial PageView is fired when the pixel script loads after consent. */
export function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const skipInitialRef = useRef(true);
  const { status } = useMarketingConsent();

  useEffect(() => {
    if (!getMetaPixelId() || status !== "granted") return;

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      return;
    }

    trackMetaPageView();
  }, [pathname, search, status]);

  return null;
}
