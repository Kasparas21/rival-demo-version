"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact label next to the advertiser / page name when `advertiserMismatch` is set. */
export function UnverifiedSourceBadge({ className }: { className?: string }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">Unverified source</span>
      <span className="sr-only">Unverified source — advertiser may not match your competitor</span>
    </span>
  );
}
