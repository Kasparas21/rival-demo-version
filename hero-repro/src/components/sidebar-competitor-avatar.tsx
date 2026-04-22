"use client";

import React, { useEffect, useState } from "react";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import {
  competitorSidebarAvatarColor,
  competitorSidebarAvatarLetter,
  sidebarCompetitorImageSrc,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";

export function SidebarCompetitorAvatar({
  competitor,
  collapsed,
}: {
  competitor: SidebarCompetitor;
  collapsed: boolean;
}) {
  const src = sidebarCompetitorImageSrc(competitor);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const letter = competitorSidebarAvatarLetter(competitor.name);
  const color = competitorSidebarAvatarColor(competitor.name);

  if (!src || imgFailed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-[10px] font-bold text-white shadow-sm ring-1 ring-[#e5e7eb] ${collapsed ? "size-10 text-[13px]" : "h-12 w-12 text-[15px]"}`}
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-[10px] ${
        collapsed ? "size-10 bg-[#f4f4f5] ring-1 ring-[#e5e7eb]" : "h-12 w-12 border border-[#e8e8e8] bg-white"
      }`}
    >
      <BrandLogoThumb
        src={src}
        alt={competitor.name}
        className="bg-white p-0.5"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}
