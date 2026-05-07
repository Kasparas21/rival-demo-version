"use client";

import React from "react";

/** Placeholder while competitor logo / favicon is loading — clipped, no overflow paint */
export function BrandLogoSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#e8e8ea] ring-1 ring-[#e5e7eb]/90 ${className}`}
      aria-hidden
    >
      <div className="rival-logo-skeleton-shine absolute inset-0" />
      <div className="absolute inset-[18%] rounded-lg bg-[#d4d4d8]/50 ring-1 ring-white/30" />
    </div>
  );
}
