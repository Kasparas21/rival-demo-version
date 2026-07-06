import type { ReactNode } from "react";

/** Shared h2 scale for below-hero landing sections — matches hero headline size & variant B accent blue. */
export const landingSectionHeadlineClasses =
  "landing-section-headline hero-headline lowercase";

type LandingHeadlineHighlightProps = {
  children: ReactNode;
  className?: string;
};

/** Fixed royal blue accent for highlighted words in section headlines (hero variant B blue). */
export function LandingHeadlineHighlight({ children, className = "" }: LandingHeadlineHighlightProps) {
  return <span className={`hero-headline-accent ${className}`.trim()}>{children}</span>;
}
