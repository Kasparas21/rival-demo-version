"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ExpandableAdTextProps = {
  text: string;
  className?: string;
  /**
   * When expanded, cap height and scroll instead of growing without limit — keeps ad grids aligned.
   * @default true
   */
  scrollWhenExpanded?: boolean;
};

/**
 * Collapses long copy to three lines with Show more / Show less when overflow is detected.
 * Expanded state uses a max height + scroll by default so multi-column ad rows stay even.
 */
export function ExpandableAdText({
  text,
  className,
  scrollWhenExpanded = true,
}: ExpandableAdTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setNeedsToggle(el.scrollHeight > el.clientHeight);
  }, [expanded]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded, measure]);

  if (!text.trim()) return null;

  return (
    <div className="min-w-0 min-h-0">
      <p
        ref={ref}
        className={cn(
          className,
          !expanded && "line-clamp-3",
          expanded &&
            scrollWhenExpanded &&
            "max-h-[min(13rem,38vh)] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]"
        )}
      >
        {text}
      </p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[13px] font-semibold text-[#2563eb] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
