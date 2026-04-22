"use client";

import React from "react";

/** Polished placeholder while competitor logo / favicon is still loading */
export function BrandLogoSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200/90 ring-1 ring-slate-200/80 ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent"
        style={{
          animation: "rival-logo-shimmer 1.35s ease-in-out infinite",
        }}
      />
      <div className="absolute inset-[18%] rounded-lg bg-slate-300/35 ring-1 ring-white/40" />
    </div>
  );
}
