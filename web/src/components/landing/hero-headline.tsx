"use client";

import { useLayoutEffect, useRef } from "react";

import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const MAX_FONT_PX = 112;
const MIN_FONT_PX = 52;
const DESKTOP_MIN_WIDTH_PX = 768;

function AdIntelligenceHighlight({ label }: { label: string }) {
  return (
    <span className="hero-ad-intelligence-highlight">
      {label}
      <svg
        className="hero-ad-intelligence-swoosh"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 62 L42 50 L83 38 L125 38 L167 25 L208 12 L250 12 L292 0 L333 0 L375 0 L417 0 L458 0 L500 0 L542 0 L583 0 L625 0 L667 0 L708 0 L750 0 L792 0 L833 0 L875 0 L917 0 L958 0 L1000 0 L1000 62 L958 50 L917 50 L875 50 L833 50 L792 38 L750 38 L708 38 L667 38 L625 38 L583 38 L542 38 L500 38 L458 38 L417 38 L375 50 L333 50 L292 62 L250 62 L208 62 L167 75 L125 88 L83 100 L42 100 L0 100 Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

type Props = {
  headline: LandingCopy["hero"]["headline"];
};

export function HeroHeadline({ headline }: Props) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const headlineEl = headlineRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    if (!headlineEl || !line1 || !line2) return;

    const fit = () => {
      const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH_PX;
      if (!isDesktop) {
        headlineEl.style.fontSize = "";
        return;
      }

      const available = window.innerWidth - 32;
      if (available <= 0) return;

      let size = MAX_FONT_PX;
      headlineEl.style.fontSize = `${size}px`;

      while (size > MIN_FONT_PX && (line1.scrollWidth > available || line2.scrollWidth > available)) {
        size -= 1;
        headlineEl.style.fontSize = `${size}px`;
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
  }, [headline]);

  return (
    <div className="relative z-10 left-1/2 mb-10 w-screen max-w-[100vw] -translate-x-1/2 sm:mb-14">
      <h1
        id="how-it-works"
        ref={headlineRef}
        className={`${landingNavAnchorScrollClasses} hero-headline px-4 text-center lowercase`}
      >
        <div className="md:hidden">
          <span className="hero-headline-line">{headline.mobile.line1}</span>
          <span className="hero-headline-line">
            <AdIntelligenceHighlight label={headline.mobile.highlight} />
          </span>
          <span className="hero-headline-line">{headline.mobile.line3}</span>
        </div>

        <div className="hidden md:block">
          <span ref={line1Ref} className="hero-headline-line whitespace-nowrap">
            {headline.desktop.line1Prefix}
            <AdIntelligenceHighlight label={headline.desktop.highlight} />
          </span>
          <span ref={line2Ref} className="hero-headline-line whitespace-nowrap">
            {headline.desktop.line2}
          </span>
        </div>
      </h1>
    </div>
  );
}
