"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import { dedupeOrganicMediaUrls } from "@/lib/organic-content/normalize";
import type { OrganicPlatform } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

import type { OrganicCardVariant } from "./shared";

function isReelMedia(
  productType: string | null | undefined,
  mediaAspect: OrganicMediaAspect | undefined,
): boolean {
  const t = productType?.toLowerCase() ?? "";
  return t === "reel" || t === "video" || t === "clips" || mediaAspect === "vertical";
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("video");
}

export function OrganicMediaCarousel({
  urls,
  mediaAspect = "landscape",
  productType,
  platform,
  variant = "standalone",
  className,
}: {
  urls: string[];
  mediaAspect?: OrganicMediaAspect;
  productType?: string | null;
  platform?: OrganicPlatform;
  variant?: OrganicCardVariant;
  className?: string;
}) {
  const items = dedupeOrganicMediaUrls(
    urls.filter((u) => u?.trim()),
    platform,
  );
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const count = items.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = items[safeIndex] ?? null;
  const reel = isReelMedia(productType, mediaAspect) || (current ? isVideoUrl(current) : false);
  const isSection = variant === "section";
  const linkedInStyle = platform === "linkedin" && !reel;

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    setIndex(0);
    setBroken({});
  }, [items.join("|")]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (count <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, goNext, goPrev]);

  if (count === 0 || !current || broken[safeIndex]) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] items-center justify-center bg-[#f0f2f5] text-[13px] text-slate-500",
          className,
        )}
      >
        No preview
      </div>
    );
  }

  const bg =
    platform === "facebook"
      ? "bg-[#f0f2f5]"
      : platform === "linkedin"
        ? "bg-[#f3f2ef]"
        : platform === "twitter"
          ? "bg-black"
          : "bg-slate-100";

  return (
    <div
      className={cn("relative flex w-full items-center justify-center", bg, className)}
      role="region"
      aria-label={`Post media ${safeIndex + 1} of ${count}`}
    >
      <div
        className={cn(
          "relative flex w-full items-center justify-center",
          reel
            ? cn("aspect-[9/16]", isSection ? "max-h-[420px]" : "max-h-[560px]")
            : linkedInStyle
              ? cn("aspect-[4/3]", isSection ? "max-h-[360px]" : "max-h-[560px]")
              : isSection
                ? "min-h-[200px] max-h-[360px]"
                : "min-h-[280px] max-h-[560px]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt=""
          className={cn(
            "w-full",
            reel
              ? "h-full object-cover"
              : linkedInStyle
                ? "h-full object-cover"
                : isSection
                  ? "max-h-[360px] object-contain"
                  : "max-h-[560px] max-w-full object-contain",
          )}
          loading="lazy"
          onError={() => setBroken((prev) => ({ ...prev, [safeIndex]: true }))}
        />
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className={cn(
              "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-md transition hover:bg-black/70",
              isSection ? "left-1.5 h-7 w-7" : "left-2 h-9 w-9",
            )}
            aria-label="Previous photo"
          >
            <ChevronLeft className={isSection ? "h-4 w-4" : "h-5 w-5"} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className={cn(
              "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-md transition hover:bg-black/70",
              isSection ? "right-1.5 h-7 w-7" : "right-2 h-9 w-9",
            )}
            aria-label="Next photo"
          >
            <ChevronRight className={isSection ? "h-4 w-4" : "h-5 w-5"} />
          </button>
          <span
            className={cn(
              "absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 font-medium text-white",
              isSection ? "bottom-2 px-2 py-0.5 text-[10px]" : "bottom-3 px-2.5 py-0.5 text-[11px]",
            )}
          >
            {safeIndex + 1} / {count}
          </span>
        </>
      ) : null}
    </div>
  );
}
