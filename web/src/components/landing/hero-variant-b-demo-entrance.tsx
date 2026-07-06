"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** GPU-friendly rise-in on first paint - no scroll trigger. */
export function HeroVariantBDemoEntrance({ children, className = "" }: Props) {
  return (
    <div
      className={`hero-variant-b-demo-enter min-h-0 max-md:min-h-[min(62vh,520px)] md:min-h-[min(52vh,420px)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
