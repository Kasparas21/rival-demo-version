"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MOBILE_DEMO_MQ = "(max-width: 767px)";

function useMobileDemoLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(MOBILE_DEMO_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_DEMO_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function getBodyMaxHeightPx(): number {
  if (typeof window === "undefined") return 680;
  return Math.min(window.innerHeight * 0.78, 680);
}

function measureNaturalHeight(inner: HTMLElement): number {
  return Math.min(inner.scrollHeight, getBodyMaxHeightPx());
}

type Props = {
  children: ReactNode;
  /** Bumps when tab content should animate height (main + sub tab). */
  contentKey: string;
};

/**
 * Mobile: natural height inside the zoomed-out card; host clips overflow (no inner scroll).
 */
function DemoAnimatedBodyMobile({ children }: { children: ReactNode }) {
  return (
    <div className="hero-variant-b-demo-body hero-variant-b-demo-body--mobile relative touch-pan-y overflow-hidden bg-[#fafbfc]">
      <div className="hero-variant-b-demo-body-inner overflow-hidden overscroll-none">{children}</div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#fafbfc] via-[#fafbfc]/90 to-transparent"
      />
    </div>
  );
}

/**
 * Desktop: top-anchored height transition — card header stays put; only the bottom edge moves.
 * ResizeObserver + rAF batching; respects prefers-reduced-motion.
 */
function DemoAnimatedBodyDesktop({ children, contentKey }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);
  const contentKeyRef = useRef(contentKey);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  const readHeight = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return 0;
    return measureNaturalHeight(inner);
  }, []);

  const commitHeight = useCallback((px: number) => {
    heightRef.current = px;
    setHeightPx(px);
  }, []);

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTabChange = contentKeyRef.current !== contentKey;
    contentKeyRef.current = contentKey;

    const target = readHeight();

    if (!transitionEnabled || reducedMotion || !isTabChange) {
      commitHeight(target);
      if (!transitionEnabled && !reducedMotion) {
        requestAnimationFrame(() => setTransitionEnabled(true));
      }
      return;
    }

    const start = heightRef.current || shellRef.current?.getBoundingClientRect().height || target;
    commitHeight(start);

    requestAnimationFrame(() => {
      commitHeight(readHeight());
    });
  }, [contentKey, readHeight, commitHeight, transitionEnabled]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    let raf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => commitHeight(readHeight()));
    };

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(inner);
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    scheduleMeasure();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [commitHeight, readHeight]);

  return (
    <div
      ref={shellRef}
      className={`hero-variant-b-demo-body relative overflow-hidden bg-[#fafbfc] contain-[layout] will-change-[height] ${
        transitionEnabled
          ? "transition-[height] duration-[560ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none motion-reduce:duration-0"
          : ""
      }`}
      style={{ height: heightPx !== null ? `${heightPx}px` : "auto" }}
    >
      <div
        ref={innerRef}
        className={`hero-variant-b-demo-body-inner overflow-y-auto overscroll-contain [scrollbar-width:thin] ${
          heightPx !== null ? "h-full" : ""
        }`}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#fafbfc] to-transparent sm:h-10"
      />
    </div>
  );
}

export function DemoAnimatedBody({ children, contentKey }: Props) {
  const isMobile = useMobileDemoLayout();

  if (isMobile) {
    return <DemoAnimatedBodyMobile>{children}</DemoAnimatedBodyMobile>;
  }

  return (
    <DemoAnimatedBodyDesktop contentKey={contentKey}>{children}</DemoAnimatedBodyDesktop>
  );
}
