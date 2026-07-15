"use client";

import { useState } from "react";

import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import { dedupeOrganicMediaUrls } from "@/lib/organic-content/normalize";
import { cn } from "@/lib/utils";

import { LinkedInLogo } from "@/components/platform-logos";

import type { OrganicCardVariant } from "./shared";

function isVideoProduct(productType: string | null | undefined): boolean {
  const t = productType?.toLowerCase() ?? "";
  return t === "video" || t === "reel" || t === "clips";
}

function GalleryImage({
  src,
  className,
  fit = "cover",
}: {
  src: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn(
        "h-full w-full",
        fit === "contain" ? "object-contain" : "object-cover",
        className,
      )}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function GridCell({
  src,
  className,
  overlay,
}: {
  src: string;
  className?: string;
  overlay?: string;
}) {
  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-[#f3f2ef]", className)}>
      <GalleryImage src={src} fit="cover" className="h-full min-h-[100px] w-full" />
      {overlay ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-base font-semibold text-white">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

function MultiPhotoGrid({
  urls,
  variant,
}: {
  urls: string[];
  variant: OrganicCardVariant;
}) {
  const height = variant === "section" ? "h-[240px]" : "h-[320px]";
  const count = urls.length;

  if (count === 2) {
    return (
      <div className={cn("grid grid-cols-2 gap-0.5", height)}>
        {urls.slice(0, 2).map((src, i) => (
          <GridCell key={`${src}-${i}`} src={src} />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={cn("grid grid-cols-2 grid-rows-2 gap-0.5", height)}>
        <GridCell src={urls[0]!} className="row-span-2" />
        <GridCell src={urls[1]!} />
        <GridCell src={urls[2]!} />
      </div>
    );
  }

  const visible = urls.slice(0, 4);
  const extra = count - 4;
  return (
    <div className={cn("grid grid-cols-2 grid-rows-2 gap-0.5", height)}>
      {visible.map((src, i) => (
        <GridCell
          key={`${src}-${i}`}
          src={src}
          overlay={i === 3 && extra > 0 ? `+${extra}` : undefined}
        />
      ))}
    </div>
  );
}

export function LinkedInMediaGallery({
  mediaUrls,
  productType,
  mediaAspect = "landscape",
  variant = "section",
}: {
  mediaUrls: string[];
  productType?: string | null;
  mediaAspect?: OrganicMediaAspect;
  variant?: OrganicCardVariant;
}) {
  const urls = dedupeOrganicMediaUrls(mediaUrls.filter((u) => u?.trim()), "linkedin");
  const isVideo = isVideoProduct(productType);
  const isMultiPhoto =
    productType?.toLowerCase() === "carousel" ||
    productType?.toLowerCase() === "document" ||
    urls.length > 1;

  if (urls.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-[#f3f2ef]">
        <LinkedInLogo className="h-8 w-8 opacity-40" />
        <span className="text-[12px] font-medium text-[#94a3b8]">No preview</span>
      </div>
    );
  }

  if (isMultiPhoto && !isVideo) {
    return (
      <div className="relative">
        <MultiPhotoGrid urls={urls} variant={variant} />
        {urls.length >= 2 ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            {urls.length} photo{urls.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    );
  }

  const src = urls[0]!;
  const vertical = isVideo || mediaAspect === "vertical";

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-[#f3f2ef]",
        vertical ? "aspect-[9/16] max-h-[420px]" : "aspect-[4/3] max-h-[360px]",
        variant === "standalone" && !vertical && "max-h-[480px]",
      )}
    >
      <GalleryImage
        src={src}
        alt=""
        fit={vertical ? "cover" : "contain"}
        className={vertical ? "h-full w-full" : "max-h-full max-w-full"}
      />
    </div>
  );
}
