"use client";

import { useEffect, useMemo, useState } from "react";

import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { cn } from "@/lib/utils";

export type LogoSource = {
  primary?: string | null;
  secondary?: string | null;
  domain?: string | null;
};

/** Clearbit Logo API is discontinued — its DNS no longer resolves, so any stored URL is dead. */
function isDeadLogoUrl(url: string): boolean {
  return url.includes("logo.clearbit.com");
}

/** Ordered candidate URLs: caller URLs first, then Google favicon / DuckDuckGo when domain looks like a host. */
export function buildLogoCandidates(sources: LogoSource): string[] {
  const out: string[] = [];
  const push = (u?: string | null) => {
    const t = u?.trim();
    if (!t || out.includes(t) || isDeadLogoUrl(t)) return;
    out.push(t);
  };

  push(sources.primary);
  push(sources.secondary);

  const host = sources.domain?.trim();
  if (!host) return out;

  const cleanHost = host.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? "";
  if (!cleanHost || !/^([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i.test(cleanHost)) {
    return out;
  }

  push(googleFaviconUrlForDomain(cleanHost));
  push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanHost)}.ico`);

  return out;
}

function firstLetter(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

const SIZE_CLASSES = {
  xxs: { container: "h-4 w-4", text: "text-[9px]" },
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-8 h-8", text: "text-[12px]" },
  "sm-plus": { container: "h-9 w-9", text: "text-[13px]" },
  md: { container: "w-10 h-10", text: "text-[14px]" },
  lg: { container: "w-12 h-12", text: "text-[16px]" },
} as const;

const SHAPE_CLASSES = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
} as const;

type Props = {
  sources: LogoSource;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  shape?: keyof typeof SHAPE_CLASSES;
  className?: string;
  alt?: string;
};

export function CompetitorLogo({ sources, name, size = "md", shape = "circle", className = "", alt }: Props) {
  const candidates = useMemo(
    () => buildLogoCandidates(sources),
    [sources.primary, sources.secondary, sources.domain],
  );

  const [attempt, setAttempt] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const fingerprint = useMemo(() => candidates.join("\0"), [candidates]);

  useEffect(() => {
    setAttempt(0);
    setExhausted(false);
  }, [fingerprint]);

  const sizeCls = SIZE_CLASSES[size];
  const shapeCls = SHAPE_CLASSES[shape];
  const baseCls = cn(
    sizeCls.container,
    shapeCls,
    "flex shrink-0 items-center justify-center overflow-hidden border border-[#e5e7eb] bg-white",
  );

  if (candidates.length === 0 || exhausted) {
    return (
      <div
        className={cn(baseCls, sizeCls.text, "bg-[#f3f4f6] font-semibold text-[#808080]", className)}
        aria-label={alt ?? name}
      >
        {firstLetter(name)}
      </div>
    );
  }

  const currentUrl = candidates[Math.min(attempt, candidates.length - 1)];

  return (
    <div className={cn(baseCls, className)}>
      <img
        key={currentUrl}
        src={currentUrl}
        alt={alt ?? name}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="max-h-full max-w-full object-contain object-center"
        onError={() => {
          setAttempt((a) => {
            if (a < candidates.length - 1) return a + 1;
            setExhausted(true);
            return a;
          });
        }}
      />
    </div>
  );
}
