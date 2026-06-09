"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  HERO_VIDEO_POSTER_SRC,
  HERO_VIDEO_SRC,
  RivalVideoBackdropOverlays,
  type RivalVideoBackdropProps,
} from "@/components/ui/rival-video-shell";
import { cn } from "@/lib/utils";

const DESKTOP_MIN_WIDTH_PX = 768;

/** Poster instantly; desktop fades in video after load; mobile skips video entirely. */
export function ProgressiveRivalVideoBackdrop({
  className,
  footerTint = "none",
}: RivalVideoBackdropProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div aria-hidden className={cn("relative h-full min-h-0 w-full overflow-hidden bg-[#f2f4f8]", className)}>
      <Image
        src={HERO_VIDEO_POSTER_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(
          "absolute inset-0 z-0 object-cover transition-opacity duration-700 ease-out",
          isDesktop && videoReady ? "opacity-0" : "opacity-100",
        )}
      />

      {isDesktop ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          className={cn(
            "absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-700 ease-out",
            videoReady ? "opacity-100" : "opacity-0",
          )}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      ) : null}

      <RivalVideoBackdropOverlays footerTint={footerTint} />
    </div>
  );
}
