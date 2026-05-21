import type { ReactNode } from "react";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";

export const PLATFORMS = ["Meta", "Google", "TikTok", "LinkedIn", "Pinterest", "Snapchat"] as const;
export type PlatformName = (typeof PLATFORMS)[number];

const PLATFORM_ICONS: Record<PlatformName, ReactNode> = {
  Meta: <MetaLogo className="size-3.5" />,
  Google: <GoogleLogo className="size-3.5" />,
  TikTok: <TikTokLogo className="size-3.5" />,
  LinkedIn: <LinkedInLogo className="size-3.5" />,
  Pinterest: <PinterestLogo className="size-3.5" />,
  Snapchat: <SnapchatLogo className="size-3.5" />,
};

export function PlatformBadge({ platform }: { platform: PlatformName }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[#1a1a1a] shadow-sm">
      {PLATFORM_ICONS[platform]}
      {platform}
    </span>
  );
}
