"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_VIDEO_POSTER_SRC,
  HERO_VIDEO_SRC,
  RivalVideoBackdropOverlays,
} from "@/components/ui/rival-video-shell";
import styles from "./editorial-landing.module.css";

/** The onboarding film and color washes, shared across one continuous viewport. */
export function EditorialBackdrop({ paused }: { paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const syncPlayback = () => {
      if (paused || document.hidden) element.pause();
      else
        void element.play().catch(() => {
          // Autoplay restrictions leave the matching poster visible.
        });
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      element.pause();
    };
  }, [paused]);

  return (
    <div className={styles.videoBackdrop} aria-hidden="true">
      <video
        ref={video}
        src={HERO_VIDEO_SRC}
        poster={HERO_VIDEO_POSTER_SRC}
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        onPlaying={() => setReady(true)}
        onError={() => setReady(false)}
        className={styles.backgroundVideo}
        data-ready={ready}
      />
      <RivalVideoBackdropOverlays footerTint="light" />
    </div>
  );
}
