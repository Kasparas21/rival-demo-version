"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { memo, useEffect, useState } from "react";
import { Play } from "lucide-react";

type Props = {
  /** Poster / still frame — never an MP4 URL */
  img?: string;
  /** Direct video file URL when available */
  videoUrl?: string | null;
  /**
   * Opens in a new tab when the user clicks the still image (or video-fallback tile).
   * Ignored when `onMediaClick` is set.
   */
  openHref?: string;
  /**
   * When set (e.g. LinkedIn in-app detail), clicking the image / fallback uses this instead of `openHref`.
   * The component stops propagation so parent card handlers are not double-fired.
   */
  onMediaClick?: () => void;
  className?: string;
  minHeightClass?: string;
  /**
   * `neutralMat` — light matte (e.g. Snapchat EU snapshot): symmetric padding from parent +
   * light letterboxing on video instead of black bars.
   */
  variant?: "default" | "neutralMat";
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
function AdCreativeVideoOrImageImpl({
  img = "",
  videoUrl,
  openHref,
  onMediaClick,
  className = "",
  minHeightClass = "min-h-[160px]",
  variant = "default",
  fillAvailableHeight = false,
}: Props) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const v = videoUrl?.trim();
  const poster = img?.trim();
  const nrPoster = poster ? mediaMayNeedNoReferrer(poster) : false;
  const nrVideo = v ? mediaMayNeedNoReferrer(v) : false;
  const showVideo = Boolean(v) && !videoFailed;
  const showImg = Boolean(poster) && !imgFailed && !showVideo;

  const mat = variant === "neutralMat";
  const href = openHref?.trim() ?? "";

  const interactiveImgShellClass = fillAvailableHeight
    ? "relative flex h-full min-h-0 w-full flex-1 items-center justify-center"
    : "relative flex max-h-full max-w-full";
  const interactiveImgShellExtra = onMediaClick ? " cursor-pointer" : "";

  function mediaActivateKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    onMediaClick?.();
  }

  function mediaActivateClick(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    onMediaClick?.();
  }

  useEffect(() => {
    setVideoFailed(false);
    setImgFailed(false);
  }, [v, poster]);

  const frameClass = fillAvailableHeight
    ? `flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl ${
        mat ? "bg-transparent px-0 py-0" : "bg-[#f3f4f6] px-2 py-3"
      } ${minHeightClass} ${className}`
    : `flex items-center justify-center overflow-hidden rounded-xl ${mat ? "bg-transparent px-0 py-0" : "py-3 px-2 bg-[#f3f4f6]"} ${minHeightClass} ${
        mat ? "max-h-[min(520px,60vh)]" : "max-h-[min(400px,45vh)]"
      } ${className}`;

  const mediaMax = fillAvailableHeight
    ? "max-h-full max-w-full"
    : mat
      ? "max-h-[min(380px,50vh)] max-w-full"
      : "max-h-[min(360px,42vh)] max-w-full";

  const videoBackdrop = mat ? "bg-zinc-100" : "bg-black";

  return (
    <div className={frameClass}>
      {showVideo ? (
        <video
          controls
          playsInline
          /* With a usable poster, defer all buffering until the user hits play. */
          preload={poster && !isLikelyVideoFileUrl(poster) ? "none" : "metadata"}
          poster={poster && !isLikelyVideoFileUrl(poster) ? poster : undefined}
            className={`${mediaMax} h-auto w-auto object-contain object-center rounded-xl ${videoBackdrop}`}
          src={v}
          onError={() => setVideoFailed(true)}
          {...(nrPoster || nrVideo ? { referrerPolicy: "no-referrer" as const } : {})}
        />
      ) : showImg ? (
        onMediaClick ? (
          <div
            role="button"
            tabIndex={0}
            onClick={mediaActivateClick}
            onKeyDown={mediaActivateKeyDown}
            className={`${interactiveImgShellClass}${interactiveImgShellExtra}`}
          >
            <img
              src={poster}
              alt=""
              referrerPolicy={nrPoster ? "no-referrer" : undefined}
              className={`${mediaMax} h-auto w-auto object-contain object-center rounded-xl`}
              onError={() => setImgFailed(true)}
            />
            {v && videoFailed ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
                  <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
                </span>
              </span>
            ) : null}
          </div>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={interactiveImgShellClass}
          >
            <img
              src={poster}
              alt=""
              referrerPolicy={nrPoster ? "no-referrer" : undefined}
              className={`${mediaMax} h-auto w-auto object-contain object-center rounded-xl`}
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
        ) : (
          <div className={interactiveImgShellClass}>
            <img
              src={poster}
              alt=""
              referrerPolicy={nrPoster ? "no-referrer" : undefined}
              className={`${mediaMax} h-auto w-auto object-contain object-center rounded-xl`}
              onError={() => setImgFailed(true)}
            />
            {v && videoFailed ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
                  <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
                </span>
              </span>
            ) : null}
          </div>
        )
      ) : v && videoFailed ? (
        onMediaClick ? (
          <button
            type="button"
            onClick={mediaActivateClick}
            className="flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-[#64748b]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e8f0] text-[#475569]">
              <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
            </span>
            <span>Video preview failed to load — open the ad for the creative.</span>
          </button>
        ) : href ? (
          <a
            href={href}
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
          <div className="flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-[#64748b]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e8f0] text-[#475569]">
              <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
            </span>
            <span>Video preview failed to load.</span>
          </div>
        )
      ) : (
        <div className="w-full flex items-center justify-center text-[13px] text-[#9ca3af] px-4 text-center">
          No preview image
        </div>
      )}
    </div>
  );
}

/** Memoized — rendered per-card in large grids; avoids re-render storms from parent state flips. */
export const AdCreativeVideoOrImage = memo(AdCreativeVideoOrImageImpl);

function isLikelyVideoFileUrl(url: string): boolean {
  return /\.(mp4|m3u8|webm)(\?|$)/i.test(url);
}

function mediaMayNeedNoReferrer(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("licdn.com") ||
    u.includes("linkedin.com") ||
    u.includes("snapchat.com") ||
    u.includes("snapcdn") ||
    u.includes("sc-cdn")
  );
}
