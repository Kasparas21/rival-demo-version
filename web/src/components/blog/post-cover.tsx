import Image from "next/image";

import { urlForImage } from "@/lib/sanity/image";
import type { SanityImage } from "@/lib/sanity/types";

const GRADIENTS = [
  "from-[#1d1f33] via-[#2d4b7a] to-[#5e4b8b]",
  "from-[#2f3b55] via-[#2e4f7c] to-[#5c66c2]",
  "from-[#4b2f2a] via-[#563434] to-[#6b4b4b]",
] as const;

const HERO_GRADIENT = "from-[#1b1c30] via-[#243a6d] to-[#5c3f8e]";

type PostCoverProps = {
  image: SanityImage | null;
  title: string;
  variant?: "hero" | "card";
  index?: number;
  className?: string;
};

export function PostCover({ image, title, variant = "card", index = 0, className }: PostCoverProps) {
  const gradient = variant === "hero" ? HERO_GRADIENT : GRADIENTS[index % GRADIENTS.length];
  const heightClass = variant === "hero" ? "min-h-[260px]" : "h-[160px]";

  if (image?.asset?._ref) {
    const src = urlForImage(image).width(variant === "hero" ? 1200 : 800).height(variant === "hero" ? 700 : 400).fit("crop").url();
    return (
      <div className={`relative overflow-hidden ${heightClass} ${className ?? ""}`}>
        <Image src={src} alt={image.alt ?? title} fill className="object-cover" sizes={variant === "hero" ? "60vw" : "33vw"} />
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} bg-gradient-to-br ${gradient} ${className ?? ""}`}>
      {variant === "hero" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(109,213,255,0.4),rgba(0,0,0,0))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,178,99,0.35),rgba(0,0,0,0))]" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white opacity-80">⚡</div>
        </>
      ) : null}
    </div>
  );
}
