"use client";

import { Image as ImageIcon, Video } from "lucide-react";

import { CreativeTestPreviewThumb } from "@/components/competitor/tests-timeline/creative-test-preview-thumb";
import { cn } from "@/lib/utils";

/** Human-readable lifespan label matching pinned-tests UI ("2 Days", "4 Days"). */
export function formatLifespanLabel(days: number): string {
  if (days <= 0) return "< 1 Day";
  if (days === 1) return "1 Day";
  return `${days} Days`;
}

const STRIPE_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.045) 4px, rgba(0,0,0,0.045) 8px)",
};

type DurationLifespanBarProps = {
  lifespanDays: number;
  maxDays: number;
  /** Active / still-running ads use green; retired use grey. */
  variant: "active" | "inactive";
  className?: string;
  /** When set, bar fills its positioned container (gantt). Otherwise width scales with lifespan. */
  widthPct?: number;
  minWidthPx?: number;
  labelAlign?: "start" | "end";
};

export function DurationLifespanBar({
  lifespanDays,
  maxDays,
  variant,
  className,
  widthPct,
  minWidthPx = 72,
  labelAlign = "start",
}: DurationLifespanBarProps) {
  const relativePct =
    maxDays > 0 ? Math.max(14, Math.min(100, (Math.max(lifespanDays, 0.5) / maxDays) * 100)) : 14;
  const fillParent = widthPct != null;

  return (
    <div
      className={cn(
        "relative flex h-7 shrink-0 items-center overflow-hidden rounded-full px-3",
        variant === "active"
          ? "border border-[#b7dfc0] bg-[#e6f4ea] text-[#137333]"
          : "border border-[#dadce0] bg-[#f1f3f4] text-[#5f6368]",
        fillParent && "w-full",
        className,
      )}
      style={
        fillParent
          ? { minWidth: minWidthPx, maxWidth: "100%" }
          : { width: `${relativePct}%`, minWidth: minWidthPx, maxWidth: "100%" }
      }
    >
      <div className="pointer-events-none absolute inset-0" style={STRIPE_STYLE} aria-hidden />
      <span
        className={cn(
          "relative truncate text-[12px] font-medium leading-none",
          labelAlign === "end" && "ml-auto",
        )}
      >
        {formatLifespanLabel(lifespanDays)}
      </span>
    </div>
  );
};

type DurationAdRowProps = {
  creativeUrl: string | null;
  /** Supabase Storage copy when the platform CDN link has expired. */
  archivedCreativeUrl?: string | null;
  platform: string;
  format?: string | null;
  lifespanDays: number;
  maxDays: number;
  isActive: boolean;
  onOpen: () => void;
  /** Optional trailing slot (e.g. winner badge). */
  trailing?: React.ReactNode;
};

function mediaIcon(format: string | null | undefined) {
  const f = (format ?? "").toLowerCase();
  if (f.includes("video") || f === "reels" || f === "story") {
    return <Video className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
  }
  return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
}

export function DurationAdRow({
  creativeUrl,
  archivedCreativeUrl,
  platform,
  format,
  lifespanDays,
  maxDays,
  isActive,
  onOpen,
  trailing,
}: DurationAdRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }
      }}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50/80"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200/80 bg-slate-100">
        <CreativeTestPreviewThumb
          creativeUrl={creativeUrl}
          archivedCreativeUrl={archivedCreativeUrl}
          platform={platform}
        />
      </div>

      {mediaIcon(format)}

      <div className="min-w-0 flex-1">
        <DurationLifespanBar
          lifespanDays={lifespanDays}
          maxDays={maxDays}
          variant={isActive ? "active" : "inactive"}
        />
      </div>

      {trailing}
    </div>
  );
}
