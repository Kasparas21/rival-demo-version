import type { ReactNode } from "react";

/** Shared h2 scale for below-hero landing sections (matches reviews headline). */
export const landingSectionHeadlineClasses =
  "text-[clamp(2.5rem,11vw,3.75rem)] font-bold lowercase leading-[1.05] text-[#1a1a1a]";

type LandingHeadlineHighlightProps = {
  children: ReactNode;
  className?: string;
};

/** Inter accent + black→dark-blue color wave (matches hero headline highlight). */
export function LandingHeadlineHighlight({ children, className = "" }: LandingHeadlineHighlightProps) {
  return <span className={`hero-headline-accent ${className}`.trim()}>{children}</span>;
}
