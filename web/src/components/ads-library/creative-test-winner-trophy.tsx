"use client";

import type { MouseEvent } from "react";
import { ExternalLink, Trophy } from "lucide-react";

export function CreativeTestWinnerTrophy({ className }: { className?: string }) {
  return (
    <span
      className={className}
      title="Test winner"
      aria-label="Test winner"
      role="img"
    >
      <Trophy className="h-3.5 w-3.5 text-[#e37400]" aria-hidden />
    </span>
  );
}

export function AdCardTopRightLinkStack({
  href,
  hrefTitle,
  isCreativeTestWinner,
  onLinkClick,
  linkClassName = "p-1 rounded-md hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#343434] transition-colors",
}: {
  href?: string | null;
  hrefTitle?: string;
  isCreativeTestWinner?: boolean;
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  linkClassName?: string;
}) {
  const hrefTrimmed = href?.trim();
  if (!hrefTrimmed && !isCreativeTestWinner) return null;

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      {hrefTrimmed ? (
        <a
          href={hrefTrimmed}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className={linkClassName}
          title={hrefTitle}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
      {isCreativeTestWinner ? <CreativeTestWinnerTrophy /> : null}
    </div>
  );
}
