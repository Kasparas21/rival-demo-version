"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

type BrandLogoThumbProps = {
  src: string;
  alt: string;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
};

/** Square or circular frame: logo scales to fit without cropping (wordmarks, favicons). */
export const BrandLogoThumb = forwardRef<HTMLImageElement, BrandLogoThumbProps>(function BrandLogoThumb(
  { src, alt, className, onError, onLoad, referrerPolicy },
  ref
) {
  return (
    <div
      className={cn(
        "flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden bg-gray-50 p-1.5",
        className,
      )}
    >
      <img
        ref={ref}
        src={src}
        alt={alt}
        referrerPolicy={referrerPolicy ?? "no-referrer"}
        onError={onError}
        onLoad={onLoad}
        draggable={false}
        decoding="async"
        className="max-h-full max-w-full object-contain object-center"
      />
    </div>
  );
});
