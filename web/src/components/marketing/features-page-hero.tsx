"use client";

import { useLayoutEffect, useRef } from "react";

const MAX_FONT_PX = 88;
const MIN_FONT_PX = 44;

export function FeaturesPageHero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const headline = headlineRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    if (!headline || !line1 || !line2) return;

    const fit = () => {
      const available = window.innerWidth - 32;
      if (available <= 0) return;

      let size = MAX_FONT_PX;
      headline.style.fontSize = `${size}px`;

      while (size > MIN_FONT_PX && (line1.scrollWidth > available || line2.scrollWidth > available)) {
        size -= 1;
        headline.style.fontSize = `${size}px`;
      }
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(document.documentElement);
    window.addEventListener("resize", fit);

    if (document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => undefined);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div className="relative z-10 mx-auto mb-4 w-full max-w-5xl sm:mb-6">
      <h1 ref={headlineRef} className="hero-headline px-4 text-center lowercase" style={{ fontSize: MAX_FONT_PX }}>
        <span ref={line1Ref} className="hero-headline-line whitespace-nowrap">
          every feature,
        </span>
        <span ref={line2Ref} className="hero-headline-line whitespace-nowrap">
          <span className="hero-ad-intelligence-highlight">
            in depth.
            <svg className="hero-ad-intelligence-swoosh" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
              <path
                d="M0 62 L42 50 L83 38 L125 38 L167 25 L208 12 L250 12 L292 0 L333 0 L375 0 L417 0 L458 0 L500 0 L542 0 L583 0 L625 0 L667 0 L708 0 L750 0 L792 0 L833 0 L875 0 L917 0 L958 0 L1000 0 L1000 62 L958 50 L917 50 L875 50 L833 50 L792 38 L750 38 L708 38 L667 38 L625 38 L583 38 L542 38 L500 38 L458 38 L417 38 L375 50 L333 50 L292 62 L250 62 L208 62 L167 75 L125 88 L83 100 L42 100 L0 100 Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl px-4 text-sm leading-relaxed text-gray-500 sm:text-base">
        See exactly how Rival turns six fragmented ad libraries into one weekly action plan - and try each piece below.
      </p>
    </div>
  );
}
