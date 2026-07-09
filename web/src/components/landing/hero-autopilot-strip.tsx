"use client";

import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Mail } from "lucide-react";

import {
  GoogleLogo,
  InstagramLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type StripProps = {
  coverage: LandingCopy["hero"]["coverage"];
};

type PlatformLogo = ComponentType<{ className?: string }>;

const PAID_LOGOS: PlatformLogo[] = [
  MetaLogo,
  GoogleLogo,
  TikTokLogo,
  LinkedInLogo,
  PinterestLogo,
  SnapchatLogo,
];

const ORGANIC_LOGOS: PlatformLogo[] = [
  InstagramLogo,
  TikTokLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
];

const LOGO_CLASS = "h-6 w-6 sm:h-[1.35rem] sm:w-[1.35rem] lg:h-6 lg:w-6";
/** Email mark is featured larger on mobile; desktop stays identical to the others. */
const EMAIL_LOGO_CLASS = "h-8 w-8 sm:h-[1.35rem] sm:w-[1.35rem] lg:h-6 lg:w-6";

const ARC_RIGHT_EXTEND_PX = 20;
const MOBILE_BREAKPOINT_PX = 768;

type ArcLayout = {
  left: number;
  width: number;
};

function HeroLogoCircle({
  children,
  dataLogo,
  big = false,
}: {
  children: ReactNode;
  dataLogo?: "first" | "last";
  /** Featured (larger) on mobile only; desktop size is unchanged. */
  big?: boolean;
}) {
  return (
    <span data-coverage-logo={dataLogo} className="inline-flex p-1 sm:p-1.5">
      <span
        className={`flex items-center justify-center rounded-full border border-white/90 bg-white shadow-[0_3px_14px_-4px_rgba(74,127,165,0.32)] ring-1 ring-[#4a7fa5]/10 sm:size-11 lg:size-12 ${
          big ? "size-16" : "size-12"
        }`}
      >
        {children}
      </span>
    </span>
  );
}

function HeroChannelGroup({
  label,
  children,
  mobileMaxW = "",
}: {
  label: string;
  children: ReactNode;
  /** Mobile-only max width that forces the logos to wrap onto two rows. */
  mobileMaxW?: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2.5 sm:gap-3">
      <span className="text-[13px] font-semibold lowercase tracking-[0.06em] text-[#4a7fa5]/75 sm:text-sm">
        {label}
      </span>
      <div
        className={`flex flex-wrap items-center justify-center gap-2.5 py-1 sm:flex-nowrap sm:gap-2.5 ${mobileMaxW}`}
      >
        {children}
      </div>
    </div>
  );
}

function HeroCoverageFunnel({ arc }: { arc: ArcLayout }) {
  return (
    <svg
      className="pointer-events-none absolute inset-y-0 h-full"
      style={{ left: arc.left, width: arc.width }}
      viewBox="0 0 100 24"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-funnel-stroke" x1="0" y1="12" x2="100" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4a7fa5" stopOpacity="0.25" />
          <stop offset="12%" stopColor="#4a7fa5" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#5a94b8" stopOpacity="0.75" />
          <stop offset="88%" stopColor="#4a7fa5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4a7fa5" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path
        d="M 0 3 C 0 11, 0 15, 50 21 C 100 15, 100 11, 100 3"
        fill="none"
        stroke="url(#hero-funnel-stroke)"
        strokeWidth="0.45"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="50" cy="21" r="0.9" fill="#4a7fa5" fillOpacity="0.45" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function measureArc(strip: HTMLElement): ArcLayout | null {
  const first = strip.querySelector<HTMLElement>('[data-coverage-logo="first"]');
  const last = strip.querySelector<HTMLElement>('[data-coverage-logo="last"]');
  if (!first || !last) return null;

  // offsetLeft/offsetWidth are LAYOUT coordinates (relative to the positioned strip)
  // and are unaffected by the mobile `scale()` transform — so the arc can be measured
  // without ever clearing the transform, which is what caused the scroll flicker.
  const firstCenter = first.offsetLeft + first.offsetWidth / 2;
  const lastCenter = last.offsetLeft + last.offsetWidth / 2;

  return {
    left: firstCenter,
    width: Math.max(0, lastCenter - firstCenter + ARC_RIGHT_EXTEND_PX),
  };
}

/** Three channel clusters → funnel → one dashboard (hero sketch). */
export function HeroCoverageStrip({ coverage }: StripProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [arc, setArc] = useState<ArcLayout>({ left: 28, width: 600 });
  const [mobileScale, setMobileScale] = useState(1);
  const [mobileHeight, setMobileHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const strip = stripRef.current;
    if (!outer || !strip) return;

    const update = () => {
      // Arc is measured in transform-independent layout coords, so no transform reset
      // (and therefore no flash to full size) is needed.
      const nextArc = measureArc(strip);
      if (nextArc) setArc(nextArc);

      const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;

      const naturalWidth = strip.offsetWidth;
      const naturalHeight = strip.offsetHeight;
      const available = outer.clientWidth;
      const scale =
        isMobile && available > 0 && naturalWidth > 0 ? Math.min(1, available / naturalWidth) : 1;

      // Apply the scale imperatively so a ResizeObserver re-fire with the same scale
      // restores it, rather than leaving a stale value. `offsetWidth` above already
      // reads the natural size regardless of any transform currently applied.
      const nextTransform = scale < 1 ? `scale(${scale})` : "none";
      if (strip.style.transform !== nextTransform) {
        strip.style.transform = nextTransform;
      }
      setMobileScale(scale);
      setMobileHeight(scale < 1 ? naturalHeight * scale : undefined);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(strip);
    window.addEventListener("resize", update);

    if (document.fonts?.ready) {
      document.fonts.ready.then(update).catch(() => undefined);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const isScaled = mobileScale < 1;

  return (
    <div className="relative z-10 mx-auto mt-10 w-full max-w-6xl px-2 sm:mt-14 sm:px-4">
      <div
        ref={outerRef}
        className="flex items-start justify-center py-4 max-md:overflow-hidden md:overflow-visible"
        style={isScaled && mobileHeight ? { height: mobileHeight } : undefined}
      >
        <div
          ref={stripRef}
          className="relative inline-flex shrink-0 origin-top flex-col items-center"
        >
          <div className="flex flex-nowrap items-start justify-center gap-8 min-[480px]:gap-12 sm:items-end sm:gap-14 lg:gap-20">
            <HeroChannelGroup label={coverage.paidLabel} mobileMaxW="max-w-[17rem] sm:max-w-none">
              {PAID_LOGOS.map((Logo, i) => (
                <HeroLogoCircle key={i} dataLogo={i === 0 ? "first" : undefined}>
                  <Logo className={LOGO_CLASS} />
                </HeroLogoCircle>
              ))}
            </HeroChannelGroup>

            <HeroChannelGroup label={coverage.organicLabel} mobileMaxW="max-w-[13rem] sm:max-w-none">
              {ORGANIC_LOGOS.map((Logo, i) => (
                <HeroLogoCircle key={i}>
                  <Logo className={LOGO_CLASS} />
                </HeroLogoCircle>
              ))}
            </HeroChannelGroup>

            <HeroChannelGroup label={coverage.emailLabel}>
              <HeroLogoCircle dataLogo="last" big>
                <Mail className={`${EMAIL_LOGO_CLASS} text-[#15803d]`} strokeWidth={2.25} aria-hidden />
              </HeroLogoCircle>
            </HeroChannelGroup>
          </div>

          <div className="relative mt-2 h-[4.5rem] w-full sm:mt-3 sm:h-[5.5rem]">
            <HeroCoverageFunnel arc={arc} />
          </div>

          <p className="mb-6 mt-2 text-center text-base font-medium lowercase tracking-[0.02em] text-[#1a1a1a]/75 sm:mb-8 sm:mt-3 sm:text-lg">
            {coverage.connectLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
