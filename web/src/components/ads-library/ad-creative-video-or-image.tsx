"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

type Props = {
  /** Poster / still frame — never an MP4 URL */
  img?: string;
  /** Direct video file URL when available */
  videoUrl?: string | null;
  /** Opens when user clicks the poster fallback */
  openHref: string;
  className?: string;
  minHeightClass?: string;
  /**
   * Fill a stretched grid row: no fixed max-height on the media frame so `flex-1` parents
   * can grow; images/videos use `max-h-full` inside the frame.
   */
  fillAvailableHeight?: boolean;
};

/**
 * Renders a video creative with controls when `videoUrl` is set; otherwise image.
 * Avoids nesting `<video>` inside `<a>` (invalid / broken controls).
 */
export function AdCreativeVideoOrImage({
  img = "",
  videoUrl,
  openHref,
  className = "",
  minHeightClass = "min-h-[160px]",
  fillAvailableHeight = false,
}: Props) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const v = videoUrl?.trim();
  const poster = img?.trim();
  const licdnPoster = poster && /\.licdn\.com/i.test(poster);
  const licdnVideo = v && /\.licdn\.com/i.test(v);
  const showVideo = Boolean(v) && !videoFailed;
  const showImg = Boolean(poster) && !imgFailed && !showVideo;

  useEffect(() => {
    setVideoFailed(false);
    setImgFailed(false);
  }, [v, poster]);

  const frameClass = fillAvailableHeight
    ? `flex min-h-0 flex-1 flex-col items-center justify-center bg-[#f3f4f6] px-2 py-3 ${minHeightClass} overflow-auto ${className}`
    : `flex items-center justify-center py-3 px-2 ${minHeightClass} max-h-[min(400px,45vh)] bg-[#f3f4f6] overflow-hidden ${className}`;

  const mediaMax = fillAvailableHeight ? "max-h-full max-w-full" : "max-h-[min(360px,42vh)] max-w-full";

  return (
    <div className={frameClass}>
      {showVideo ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster && !isLikelyVideoFileUrl(poster) ? poster : undefined}
          className={`${mediaMax} h-auto w-auto object-contain object-center bg-black`}
          src={v}
          onError={() => setVideoFailed(true)}
          {...(licdnPoster || licdnVideo ? { referrerPolicy: "no-referrer" as const } : {})}
        />
      ) : showImg ? (
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className={
            fillAvailableHeight
              ? "relative flex h-full min-h-0 w-full flex-1 items-center justify-center"
              : "relative flex max-h-full max-w-full"
          }
        >
          <img
            src={poster}
            alt=""
            referrerPolicy={licdnPoster ? "no-referrer" : undefined}
            className={`${mediaMax} h-auto w-auto object-contain object-center`}
            onError={() => setImgFailed(true)}
          />
          {v && videoFailed ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
                <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
              </span>
            </span>
          ) : null}
        </a>
      ) : v && videoFailed ? (
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-[#64748b]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e8f0] text-[#475569]">
            <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
          </span>
          <span>Video preview failed to load — open the ad for the creative.</span>
        </a>
      ) : (
        <div className="w-full flex items-center justify-center text-[13px] text-[#9ca3af] px-4 text-center">
          No preview image
        </div>
      )}
    </div>
  );
}

function isLikelyVideoFileUrl(url: string): boolean {
  return /\.(mp4|m3u8|webm)(\?|$)/i.test(url);
}
