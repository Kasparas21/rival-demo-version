import type { ReactNode } from "react";

type LandingHeadlineHighlightProps = {
  children: ReactNode;
  className?: string;
};

/** Inter accent + black→dark-blue color wave (matches hero headline highlight). */
export function LandingHeadlineHighlight({ children, className = "" }: LandingHeadlineHighlightProps) {
  return <span className={`hero-headline-accent ${className}`.trim()}>{children}</span>;
}
