"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { LandingCopy } from "@/lib/i18n/landing/types";

const LandingBelowFoldSections = dynamic(
  () =>
    import("@/components/marketing/landing-below-fold-sections").then(
      (mod) => mod.LandingBelowFoldSections,
    ),
  {
    ssr: false,
    loading: () => <LandingBelowFoldPlaceholder />,
  },
);

type Props = {
  copy: LandingCopy;
};

function LandingBelowFoldPlaceholder() {
  return (
    <div
      aria-hidden
      className="relative isolate min-h-[120vh] bg-gradient-to-b from-[#f7fbff] to-[#f4fbf4]"
    />
  );
}

/** Defers below-fold landing JS until after first paint / idle - keeps hero interactive sooner. */
export function LandingBelowFold({ copy }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activate = () => setReady(true);

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(activate, 200);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!ready) {
    return <LandingBelowFoldPlaceholder />;
  }

  return <LandingBelowFoldSections copy={copy} />;
}
