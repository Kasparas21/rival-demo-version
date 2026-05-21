import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const SIZE_CLASS = {
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
} as const;

type LandingTrialCtaSize = keyof typeof SIZE_CLASS;

type LandingTrialCtaProps = {
  href?: string;
  size?: LandingTrialCtaSize;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/** Unified landing trial CTA — blue gradient pill + pulsating glow. */
export function LandingTrialCta({
  href,
  size = "md",
  className = "",
  children,
  type = "button",
  ...buttonProps
}: LandingTrialCtaProps) {
  const sizing = SIZE_CLASS[size];
  const wrapperClass =
    `landing-pricing-cta group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${sizing.wrapper} ${className}`.trim();

  const content = (
    <>
      <span
        aria-hidden
        className={`landing-pricing-cta-glow pointer-events-none absolute ${sizing.glow} rounded-full bg-[#4a7fa5]/30 opacity-70 blur-md`}
      />
      <span className={`landing-trial-cta-face ${sizing.face}`}>{children}</span>
    </>
  );

  if (href) {
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
