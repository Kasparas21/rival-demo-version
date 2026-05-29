"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackMetaPageView } from "@/lib/analytics/meta-pixel-client";

/** SPA route changes — initial PageView is sent by the base pixel script in <head>. */
export function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const skipInitialRef = useRef(true);

  useEffect(() => {
    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      return;
    }

    trackMetaPageView();
  }, [pathname, search]);

  return null;
}
