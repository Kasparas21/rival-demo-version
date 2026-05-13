"use client";

import { cn } from "@/lib/utils";

export const RIVAL_LOADER_VIDEO_SRC = "/rival.webm";

export type RivalLogoVideoSize = "inline" | "xs" | "sm" | "md" | "lg" | "xl";

const videoSizeClass: Record<RivalLogoVideoSize, string> = {
  inline: "size-4",
  xs: "size-5",
  sm: "size-8",
  md: "size-11",
  lg: "size-14",
  xl: "size-[72px]",
};

/** Looping mascot mark (`/rival.webm`). Omit `controls`; keep muted for autoplay. */
export function RivalLogoVideo({
  size = "md",
  className,
}: {
  size?: RivalLogoVideoSize;
  className?: string;
}) {
  return (
    <video
      aria-hidden
      autoPlay
      className={cn("shrink-0 object-contain", videoSizeClass[size], className)}
      loop
      muted
      playsInline
      preload="auto"
      src={RIVAL_LOADER_VIDEO_SRC}
    />
  );
}

type RivalTone = "neutral" | "sky";

const toneFrameClass: Record<RivalTone, string> = {
  neutral:
    "overflow-hidden rounded-2xl border border-slate-200/85 bg-gradient-to-b from-white via-white to-slate-50/[0.95] p-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.04]",
  sky:
    "overflow-hidden rounded-2xl border border-sky-200/85 bg-gradient-to-b from-white via-white to-sky-50/60 p-2.5 shadow-[0_8px_32px_rgba(14,116,144,0.1)] ring-1 ring-sky-900/[0.05]",
};

/** Visual zoom inside framed loaders; box outer size unchanged (clips at frame). */
const logoInFrameClass = "scale-[1.5] origin-center";

/** Centered “hero” wait state for tabs, panels, and long-running fetches */
export function RivalLoadingBlock({
  title,
  description,
  tone = "neutral",
  size = "lg",
  className,
  padded = true,
}: {
  title: string;
  description?: string;
  tone?: RivalTone;
  size?: RivalLogoVideoSize;
  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        padded && "px-4 py-16 sm:py-20",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex max-w-md flex-col items-center gap-5">
        <div className={cn("inline-flex items-center justify-center", toneFrameClass[tone])}>
          <RivalLogoVideo size={size} className={logoInFrameClass} />
        </div>
        <div className="space-y-2 px-1">
          <p className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</p>
          {description ? (
            <p className="text-[13px] leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Compact horizontal layout for banners, rails, or panel stubs */
export function RivalLoadingRow({
  label,
  description,
  className,
  size = "sm",
  align = "center",
}: {
  label: string;
  description?: string;
  size?: RivalLogoVideoSize;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        align === "center" && "justify-center",
        align === "start" && "justify-start text-left",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mt-0.5 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/[0.98] p-[5px] shadow-sm ring-1 ring-black/[0.03]">
        <RivalLogoVideo size={size} className={logoInFrameClass} />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-medium tracking-tight text-slate-800">{label}</p>
        {description ? (
          <p className="mt-1 text-[13px] leading-snug text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Inline spinner row for dense UI (analytics sub-cards, captions). */
export function RivalLoadingMicro({
  caption = "Loading…",
  className,
}: {
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2 py-4", className)}>
      <span className="mt-px inline-flex shrink-0 overflow-hidden rounded-md border border-slate-200/75 bg-white/95 p-[3px] shadow-sm ring-1 ring-black/[0.02]">
        <RivalLogoVideo size="inline" className={logoInFrameClass} />
      </span>
      <span className="text-[11px] font-medium leading-snug text-slate-500">{caption}</span>
    </div>
  );
}
