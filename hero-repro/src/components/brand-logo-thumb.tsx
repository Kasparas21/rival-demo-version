"use client";

import React from "react";
import { cn } from "@/lib/utils";

type BrandLogoThumbProps = {
  src: string;
  alt: string;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

/** Square or circular frame: logo scales to fit without cropping (wordmarks, favicons). */
export function BrandLogoThumb({ src, alt, className, onError }: BrandLogoThumbProps) {
  return (
    <div
      className={cn(
        "flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden bg-gray-50 p-1.5",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        onError={onError}
        draggable={false}
        className="max-h-full max-w-full object-contain object-center"
      />
    </div>
  );
}
