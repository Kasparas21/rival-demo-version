import type { ReactNode } from "react";

type LandingHeadlineHighlightProps = {
  children: ReactNode;
  className?: string;
};

/** Tempting script + black→dark-blue color wave (matches hero "ad intelligence" accent). */
export function LandingHeadlineHighlight({ children, className = "" }: LandingHeadlineHighlightProps) {
  return <span className={`landing-tempting-highlight ${className}`.trim()}>{children}</span>;
}
