"use client";

import type { ReactNode } from "react";

import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import { dedupeOrganicMediaUrls } from "@/lib/organic-content/normalize";
import type { OrganicPlatform } from "@/lib/organic-content/types";

import { FacebookMediaGallery } from "./facebook-media-gallery";
import { LinkedInMediaGallery } from "./linkedin-media-gallery";
import { OrganicMediaCarousel } from "./organic-media-carousel";
import { MediaFrame, type OrganicCardVariant } from "./shared";

function isReelProduct(productType: string | null | undefined): boolean {
  const t = productType?.toLowerCase() ?? "";
  return t === "reel" || t === "video" || t === "clips";
}

export function OrganicPostMedia({
  platform,
  mediaUrls,
  productType,
  mediaAspect = "landscape",
  variant = "section",
  overlay,
  capVerticalHeight = false,
  className,
}: {
  platform: OrganicPlatform;
  mediaUrls: string[];
  productType?: string | null;
  mediaAspect?: OrganicMediaAspect;
  variant?: OrganicCardVariant;
  overlay?: ReactNode;
  capVerticalHeight?: boolean;
  className?: string;
}) {
  const urls = dedupeOrganicMediaUrls(
    mediaUrls.map((u) => u?.trim()).filter(Boolean),
    platform,
  );
  const isSection = variant === "section";
  const isReel = isReelProduct(productType) || mediaAspect === "vertical";

  if (platform === "linkedin" && urls.length > 0) {
    return (
      <LinkedInMediaGallery
        mediaUrls={urls}
        productType={productType}
        mediaAspect={mediaAspect}
        variant={variant}
      />
    );
  }

  const useCarousel =
    urls.length > 1 && (platform === "instagram" || !isSection);

  if (useCarousel) {
    return (
      <OrganicMediaCarousel
        urls={urls}
        mediaAspect={mediaAspect}
        productType={productType}
        platform={platform}
        variant={variant}
        className={className}
      />
    );
  }

  if (platform === "facebook") {
    return (
      <FacebookMediaGallery
        mediaUrls={urls}
        productType={productType}
        mediaAspect={mediaAspect}
        variant={variant}
      />
    );
  }

  const src = urls[0] ?? null;

  if (!isSection && src && !isReel && !overlay) {
    return (
      <div
        className={
          className ??
          "flex min-h-[280px] max-h-[560px] w-full items-center justify-center overflow-hidden bg-slate-100"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="max-h-[560px] max-w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <MediaFrame
      src={src}
      platform={platform}
      aspect={isReel ? "vertical" : mediaAspect}
      capVerticalHeight={capVerticalHeight}
      overlay={overlay}
      className={className}
    />
  );
}
