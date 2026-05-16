"use client";

import { cn } from "@/lib/utils";

export const RIVAL_LOADER_VIDEO_SRC = "/rival.webm";

export type RivalLogoVideoSize = "inline" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const videoSizeClass: Record<RivalLogoVideoSize, string> = {
  inline: "size-4",
  xs: "size-5",
  sm: "size-8",
  md: "size-11",
  lg: "size-14",
  xl: "size-[72px]",
  "2xl": "size-[128px]",
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

/** Centered wait state: mascot video only (no frame, no caption). */
export function RivalLoadingBlock({
  size = "lg",
  className,
  padded = true,
}: {
  size?: RivalLogoVideoSize;
  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        padded && "px-4 py-16 sm:py-20",
        className,
      )}
      role="status"
      aria-label="Loading"
      aria-live="polite"
      aria-busy="true"
    >
      <RivalLogoVideo size={size} className="object-contain" />
    </div>
  );
}

/** Compact horizontal mascot loader (video only). */
export function RivalLoadingRow({
  className,
  size = "sm",
  align = "center",
}: {
  size?: RivalLogoVideoSize;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        align === "center" && "justify-center",
        align === "start" && "justify-start",
        className,
      )}
      role="status"
      aria-label="Loading"
      aria-live="polite"
      aria-busy="true"
    >
      <RivalLogoVideo size={size} className="object-contain" />
    </div>
  );
}

/** Dense inline mascot (video only). */
export function RivalLoadingMicro({
  className,
  size = "sm",
}: {
  size?: RivalLogoVideoSize;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label="Loading"
      aria-live="polite"
      aria-busy="true"
    >
      <RivalLogoVideo size={size} className="object-contain" />
    </div>
  );
}
