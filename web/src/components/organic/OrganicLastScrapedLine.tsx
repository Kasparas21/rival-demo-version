"use client";

import { Clock } from "lucide-react";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatLastScrapedLine(iso: string | null | undefined): string {
  if (!iso) return "No posts scraped yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No posts scraped yet";
  return `Last scraped ${formatTimeAgo(d)}`;
}

export function OrganicLastScrapedLine({
  busy,
  busyLabel,
  lastScrapedAt,
  errorSuffix,
}: {
  busy: boolean;
  busyLabel: string;
  lastScrapedAt: string | null | undefined;
  errorSuffix?: string | null;
}) {
  if (busy) {
    return <p className="mt-0.5 text-[13px] text-[#6b7280]">{busyLabel}</p>;
  }
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
      <Clock className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" aria-hidden />
      <span>
        {formatLastScrapedLine(lastScrapedAt)}
        {errorSuffix ? ` · ${errorSuffix}` : ""}
      </span>
    </p>
  );
}
