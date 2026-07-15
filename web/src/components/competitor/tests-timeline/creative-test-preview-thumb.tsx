"use client";

import { useEffect, useState } from "react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { cn } from "@/lib/utils";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

type PreviewState = "empty" | "loading" | "loaded" | "error";

type Props = {
  creativeUrl: string | null;
  archivedCreativeUrl?: string | null;
  platform: string;
};

/** Image preview for Creative Tests — pulse only while a URL is actively loading. */
export function CreativeTestPreviewThumb({ creativeUrl, archivedCreativeUrl, platform }: Props) {
  const live = creativeUrl?.trim() || null;
  const archived = archivedCreativeUrl?.trim() || null;
  const initialSrc = live || archived;

  const [src, setSrc] = useState<string | null>(initialSrc);
  const [state, setState] = useState<PreviewState>(() => (initialSrc ? "loading" : "empty"));

  useEffect(() => {
    const next = live || archived;
    setSrc(next);
    setState(next ? "loading" : "empty");
  }, [live, archived]);

  if (state === "empty") {
    return (
      <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-4 w-4 opacity-40" />
    );
  }

  if (state === "error") {
    return (
      <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-4 w-4 opacity-35" />
    );
  }

  return (
    <div className="relative h-full w-full">
      {state === "loading" ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200"
          aria-hidden
        />
      ) : null}
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={cn(
            "relative h-full w-full object-cover transition-opacity duration-200",
            state === "loaded" ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setState("loaded")}
          onError={() => {
            if (archived && src !== archived) {
              setSrc(archived);
              setState("loading");
              return;
            }
            setState("error");
          }}
        />
      ) : null}
    </div>
  );
}
