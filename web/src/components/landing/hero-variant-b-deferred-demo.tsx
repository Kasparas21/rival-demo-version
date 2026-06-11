"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroVariantBProductDemo = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-product-demo").then(
      (mod) => mod.HeroVariantBProductDemo,
    ),
  {
    ssr: false,
    loading: () => <HeroVariantBDemoPlaceholder />,
  },
);

function HeroVariantBDemoPlaceholder() {
  return (
    <div
      aria-hidden
      className="mx-auto h-[min(52vh,440px)] max-w-6xl overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.12)] md:h-[min(52vh,420px)] md:bg-white/40 md:backdrop-blur-sm"
    >
      <div className="flex h-11 items-center gap-2 border-b border-[#e5e7eb]/80 bg-white/90 px-4">
        <div className="h-2.5 w-2.5 rounded-full bg-[#95C14B]/70" />
        <div className="h-3 w-24 rounded-full bg-[#e2e8f0]" />
      </div>
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/5 rounded-full bg-[#e2e8f0]" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-gradient-to-br from-[#f1f5f9] to-[#e2e8f0]/80" />
          <div className="h-28 rounded-xl bg-gradient-to-br from-[#f1f5f9] to-[#e2e8f0]/80 max-sm:hidden" />
        </div>
      </div>
    </div>
  );
}

/** Loads the interactive hero demo after idle — mobile gets a longer defer to unblock taps. */
export function HeroVariantBDeferredDemo() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const idleTimeout = isMobile ? 3000 : 1000;

    const activate = () => setReady(true);

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: idleTimeout });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(activate, isMobile ? 1500 : 400);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!ready) {
    return <HeroVariantBDemoPlaceholder />;
  }

  return <HeroVariantBProductDemo />;
}
