"use client";

import posthog from "posthog-js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import {
  getLandingHeroTestHeadline,
  isLandingHeroTestVariant,
} from "@/lib/analytics/landing-hero-experiment";
import { isPostHogConfigured, LANDING_HERO_HEADLINE_FLAG } from "@/lib/analytics/posthog-config";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const MAX_FONT_PX = 96;
const MIN_FONT_PX = 48;
const DESKTOP_MIN_WIDTH_PX = 768;
const HEADLINE_MAX_WIDTH_PX = 880;

function HeroHeadlineAccent({ label }: { label: string }) {
  return <span className="hero-headline-accent">{label}</span>;
}

type Props = {
  headline: LandingCopy["hero"]["headline"];
};

export function HeroHeadline({ headline: serverHeadline }: Props) {
  const [headline, setHeadline] = useState(serverHeadline);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeadline(serverHeadline);
  }, [serverHeadline]);

  useEffect(() => {
    if (!isPostHogConfigured()) return;

    const applyExperimentHeadline = () => {
      if (!posthog.__loaded) return;
      const flag = posthog.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, { send_event: false });
      setHeadline(
        isLandingHeroTestVariant(flag) ? getLandingHeroTestHeadline() : serverHeadline,
      );
    };

    applyExperimentHeadline();
    return posthog.onFeatureFlags(applyExperimentHeadline);
  }, [serverHeadline]);

  useLayoutEffect(() => {
    const headlineEl = headlineRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    const container = containerRef.current;
    if (!headlineEl || !line1 || !line2 || !container) return;

    const fit = () => {
      const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH_PX;
      if (!isDesktop) {
        headlineEl.style.fontSize = "";
        return;
      }

      const containerWidth = container.getBoundingClientRect().width;
      const available = Math.min(containerWidth, HEADLINE_MAX_WIDTH_PX);
      if (available <= 0) return;

      let size = MAX_FONT_PX;
      headlineEl.style.fontSize = `${size}px`;

      while (
        size > MIN_FONT_PX &&
        (line1.scrollWidth > available || line2.scrollWidth > available)
      ) {
        size -= 1;
        headlineEl.style.fontSize = `${size}px`;
      }
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(container);
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
    <div
      ref={containerRef}
      className="relative z-10 mx-auto mb-9 w-full max-w-[54rem] px-4 sm:mb-12 sm:px-6"
    >
      <h1
        id="how-it-works"
        ref={headlineRef}
        className={`${landingNavAnchorScrollClasses} hero-headline text-center lowercase`}
      >
        <span ref={line1Ref} className="hero-headline-line max-md:whitespace-normal md:whitespace-nowrap">
          {headline.line1Prefix}
          <HeroHeadlineAccent label={headline.highlight} />
        </span>
        <span ref={line2Ref} className="hero-headline-line max-md:whitespace-normal md:whitespace-nowrap">
          {headline.line2}
        </span>
      </h1>

      <p className="hero-subline mx-auto mt-4 max-w-xl lowercase sm:mt-5">{headline.subline}</p>
    </div>
  );
}
