"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { CheckoutNavigationLink } from "@/components/analytics/checkout-navigation-link";
import { isCheckoutNavigationHref } from "@/lib/analytics/meta-pixel";

const GLOW_SIZE_CLASS = {
  sm: {
    wrapper: "inline-flex",
    label:
      "px-5 py-2 text-xs font-bold tracking-[0.05em] sm:min-w-[9.5rem] sm:px-7 sm:py-2.5 sm:text-sm",
  },
  md: {
    wrapper: "inline-flex sm:min-w-[12rem] md:min-w-[14rem]",
    label: "px-7 py-3 text-[15px] font-bold tracking-[0.04em] sm:px-9 sm:py-3.5 sm:text-base",
  },
  lg: {
    wrapper: "flex w-full md:max-w-md md:mx-auto",
    label:
      "w-full px-6 py-4 text-base font-bold tracking-[0.04em] sm:py-[1.125rem] sm:text-lg md:px-10",
  },
  hero: {
    wrapper:
      "flex w-full max-w-[21rem] sm:inline-flex sm:w-auto sm:max-w-none sm:min-w-[18rem] md:min-w-[21rem]",
    label:
      "w-full px-12 py-3.5 text-[15px] font-bold tracking-[0.06em] sm:w-auto sm:px-12 sm:py-4 sm:text-[17px] md:px-14 md:text-lg",
  },
} as const;

const PLAIN_SIZE_CLASS = {
  sm: {
    wrapper: "inline-block",
    glow: "-inset-1",
    face:
      "px-4 py-1.5 text-xs font-bold tracking-[0.05em] sm:min-w-[9.5rem] sm:px-7 sm:py-2.5 sm:text-sm",
  },
  md: {
    wrapper: "inline-block",
    glow: "-inset-1.5",
    face: "px-7 py-3 text-[15px] font-bold tracking-[0.04em] sm:min-w-[12rem] sm:px-9 sm:py-3.5 sm:text-base",
  },
  lg: {
    wrapper: "block w-full md:max-w-md md:mx-auto",
    glow: "-inset-2",
    face:
      "w-full px-6 py-4 text-base font-bold tracking-[0.04em] sm:py-[1.125rem] sm:text-lg md:px-10",
  },
  hero: {
    wrapper: "block w-full max-w-[21rem] sm:inline-block sm:w-auto sm:max-w-none",
    glow: "-inset-1.5",
    face:
      "w-full px-12 py-3.5 text-[15px] font-bold tracking-[0.06em] sm:w-auto sm:min-w-[18rem] sm:px-12 sm:py-4 sm:text-[17px] md:min-w-[21rem] md:px-14 md:text-lg",
  },
} as const;

type LandingTrialCtaSize = keyof typeof GLOW_SIZE_CLASS;
type LandingTrialCtaAppearance = "glow-line" | "plain";

type LandingTrialCtaProps = {
  href?: string;
  size?: LandingTrialCtaSize;
  /** `glow-line` = rotating arc border (landing sections). `plain` = header / legacy pill. */
  appearance?: LandingTrialCtaAppearance;
  /** Pulsating blur — only used with `appearance="plain"`. */
  showGlow?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/** Unified landing trial CTA — glow-line arc (default) or plain gradient pill. */
export function LandingTrialCta({
  href,
  size = "md",
  appearance = "glow-line",
  showGlow = true,
  className = "",
  children,
  type = "button",
  ...buttonProps
}: LandingTrialCtaProps) {
  const isGlowLine = appearance === "glow-line";
  const glowSizing = GLOW_SIZE_CLASS[size];
  const plainSizing = PLAIN_SIZE_CLASS[size];

  const wrapperClass = isGlowLine
    ? `landing-glow-cta group relative items-center justify-center rounded-full font-bold text-white ${FOCUS_RING} ${glowSizing.wrapper} ${className}`.trim()
    : `landing-pricing-cta group relative ${FOCUS_RING} ${plainSizing.wrapper} ${className}`.trim();

  const content = isGlowLine ? (
    <>
      <span className="landing-glow-cta-face" aria-hidden />
      <span className={`landing-glow-cta-label relative z-[2] ${glowSizing.label}`}>{children}</span>
    </>
  ) : (
    <>
      {showGlow ? (
        <span
          aria-hidden
          className={`landing-pricing-cta-glow pointer-events-none absolute ${plainSizing.glow} rounded-full bg-[#4a7fa5]/30 opacity-70 blur-md`}
        />
      ) : null}
      <span className={`landing-trial-cta-face ${plainSizing.face}`}>{children}</span>
    </>
  );

  if (href) {
    if (isCheckoutNavigationHref(href)) {
      return (
        <CheckoutNavigationLink href={href} className={wrapperClass}>
          {content}
        </CheckoutNavigationLink>
      );
    }

    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={wrapperClass} {...buttonProps}>
      {content}
    </button>
  );
}
