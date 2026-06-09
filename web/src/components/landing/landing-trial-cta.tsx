"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { CheckoutNavigationLink } from "@/components/analytics/checkout-navigation-link";
import { isCheckoutNavigationHref } from "@/lib/analytics/meta-pixel";

const GLOW_SIZE_CLASS = {
  sm: {
    wrapper: "inline-flex",
    label: "px-5 py-2 text-xs sm:px-5 sm:py-2 sm:text-sm",
  },
  md: {
    wrapper: "inline-flex",
    label: "px-6 py-3 text-sm sm:text-[15px]",
  },
  lg: {
    wrapper: "flex w-full",
    label: "w-full px-6 py-4 text-base sm:py-[1.125rem] sm:text-[17px]",
  },
  hero: {
    wrapper: "inline-flex min-w-[12.5rem] sm:min-w-[15rem]",
    label: "px-8 py-3.5 text-sm sm:px-10 sm:py-4 sm:text-[15px]",
  },
} as const;

const PLAIN_SIZE_CLASS = {
  sm: {
    wrapper: "inline-block",
    glow: "-inset-1",
    face: "px-3 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm",
  },
  md: {
    wrapper: "inline-block",
    glow: "-inset-1.5",
    face: "px-6 py-3 text-sm sm:text-[15px]",
  },
  lg: {
    wrapper: "block w-full",
    glow: "-inset-2",
    face: "w-full px-6 py-4 text-base sm:py-[1.125rem] sm:text-[17px]",
  },
  hero: {
    wrapper: "inline-block",
    glow: "-inset-1.5",
    face: "min-w-[12.5rem] px-8 py-3.5 text-sm sm:min-w-[15rem] sm:px-10 sm:py-4 sm:text-[15px]",
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
    ? `landing-glow-cta group relative items-center justify-center rounded-full font-semibold text-white ${FOCUS_RING} ${glowSizing.wrapper} ${className}`.trim()
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
