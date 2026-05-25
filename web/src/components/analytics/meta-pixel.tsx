"use client";

import Script from "next/script";
import { Suspense } from "react";

import { MetaPixelPageView } from "@/components/analytics/meta-pixel-page-view";
import { useMarketingConsent } from "@/components/analytics/marketing-consent-provider";
import { trackMetaPageView } from "@/lib/analytics/meta-pixel-client";
import { getMetaPixelId } from "@/lib/analytics/meta-pixel";

export function SiteMetaPixel() {
  const pixelId = getMetaPixelId();
  const { status } = useMarketingConsent();

  if (!pixelId || status !== "granted") {
    return null;
  }

  const initScript = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
`.trim();

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: initScript }}
        onLoad={() => trackMetaPageView()}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPixelPageView />
      </Suspense>
    </>
  );
}
