"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import { BrandLogoSkeleton } from "@/components/brand-logo-skeleton";
import {
  competitorSidebarAvatarColor,
  competitorSidebarAvatarLetter,
  sidebarCompetitorLogoCandidates,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";

export function SidebarCompetitorAvatar({
  competitor,
  collapsed,
}: {
  competitor: SidebarCompetitor;
  collapsed: boolean;
}) {
  const candidates = useMemo(() => sidebarCompetitorLogoCandidates(competitor), [competitor]);
  const fingerprint = candidates.join("\n");

  const [attempt, setAttempt] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setAttempt(0);
    setImgReady(false);
    setAllFailed(false);
  }, [fingerprint]);

  const src =
    candidates.length === 0 || allFailed ? "" : (candidates[Math.min(attempt, candidates.length - 1)] ?? "");

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!src || !el) return;
    if (el.complete && el.naturalWidth > 0) setImgReady(true);
  }, [attempt, fingerprint, src]);

  const letter = competitorSidebarAvatarLetter(competitor.name);
  const color = competitorSidebarAvatarColor(competitor.name);

  const letterBadge = (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[10px] font-bold text-white shadow-sm ring-1 ring-[#e5e7eb] ${collapsed ? "size-10 text-[13px]" : "h-12 w-12 text-[15px]"}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {letter}
    </div>
  );

  if (candidates.length === 0) {
    return letterBadge;
  }

  if (!src) {
    return letterBadge;
  }

  const frameCollapsed = collapsed ? "size-10 rounded-[10px]" : "h-12 w-12 rounded-[10px]";
  const shimmerSize = collapsed ? "size-10" : "h-12 w-12";

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${frameCollapsed} ${
        collapsed ? "bg-[#f4f4f5] ring-1 ring-[#e5e7eb]" : "border border-[#e8e8e8] bg-white"
      }`}
    >
      {!imgReady ? (
        <div
          className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden rounded-[10px]`}
          aria-hidden
        >
          <BrandLogoSkeleton className={`${shimmerSize} shrink-0 rounded-[10px]`} />
        </div>
      ) : null}
      <BrandLogoThumb
        ref={imgRef}
        key={src}
        src={src}
        alt={competitor.name}
        className="relative z-0 bg-transparent p-0.5"
        referrerPolicy="no-referrer"
        onLoad={() => setImgReady(true)}
        onError={() => {
          setImgReady(false);
          setAttempt((a) => {
            const next = a + 1;
            if (next < candidates.length) return next;
            setAllFailed(true);
            return a;
          });
        }}
      />
    </div>
  );
}
