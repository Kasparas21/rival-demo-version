"use client";

import { cn } from "@/lib/utils";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import type { OrganicPlatform } from "@/lib/organic-content/types";

const PLATFORM_COLORS: Record<OrganicPlatform, string> = {
  linkedin: "bg-[#0A66C2]/10 text-[#0A66C2]",
  twitter: "bg-slate-900/10 text-slate-900",
  instagram: "bg-pink-500/10 text-pink-600",
  tiktok: "bg-slate-900/10 text-slate-900",
  facebook: "bg-[#1877F2]/10 text-[#1877F2]",
  youtube: "bg-red-500/10 text-red-600",
};

export function OrganicPlatformBadge({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const key = platform as OrganicPlatform;
  const label = ORGANIC_PLATFORM_LABELS[key] ?? platform;
  const color = PLATFORM_COLORS[key] ?? "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        color,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function formatEngagementCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function formatPostDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
