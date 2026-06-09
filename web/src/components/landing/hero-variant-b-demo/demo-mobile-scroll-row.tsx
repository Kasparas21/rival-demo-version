"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  /** e.g. tablist */
  role?: string;
  ariaLabel?: string;
  className?: string;
  /** Desktop: wrap / static layout. Mobile: horizontal scroll + arrow. */
  desktopClassName?: string;
};

/** Horizontal strip with a mobile-only “see more” arrow that smooth-scrolls on tap. */
export function DemoMobileScrollRow({
  children,
  role,
  ariaLabel,
  className = "",
  desktopClassName = "md:flex-wrap md:overflow-visible",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(overflow > 6 && el.scrollLeft > 6);
    setCanScrollRight(overflow > 6 && el.scrollLeft < overflow - 6);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollHints();
    el.addEventListener("scroll", updateScrollHints, { passive: true });
    const ro = new ResizeObserver(updateScrollHints);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      ro.disconnect();
    };
  }, [updateScrollHints, children]);

  const scrollStep = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 140;
    return Math.max(140, Math.round(el.clientWidth * 0.75));
  }, []);

  const scrollNext = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: scrollStep(), behavior: "smooth" });
  }, [scrollStep]);

  const scrollPrev = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  }, [scrollStep]);

  return (
    <div className={`relative ${className}`.trim()}>
      <div
        ref={scrollerRef}
        role={role}
        aria-label={ariaLabel}
        className={`flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden ${canScrollLeft ? "pl-9 md:pl-0" : ""} ${canScrollRight ? "pr-9 md:pr-0" : ""} ${desktopClassName}`.trim()}
      >
        {children}
      </div>

      {canScrollLeft ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-12 bg-gradient-to-r from-white via-white/90 to-transparent md:hidden"
          />
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 z-[2] flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#475569] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition-transform active:scale-95 md:hidden"
            aria-label="Scroll back"
          >
            <ChevronLeft className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}

      {canScrollRight ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-12 bg-gradient-to-l from-white via-white/90 to-transparent md:hidden"
          />
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-0 top-1/2 z-[2] flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#475569] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition-transform active:scale-95 md:hidden"
            aria-label="Scroll to see more"
          >
            <ChevronRight className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
