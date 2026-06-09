import type { ReactNode } from "react";

import { LandingTrialCta } from "@/components/landing/landing-trial-cta";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Hero-sized glow-line CTA — same component as the rest of the landing page. */
export function HeroVariantBGlowCta({ href, children, className = "" }: Props) {
  return (
    <LandingTrialCta href={href} size="hero" className={className}>
      {children}
    </LandingTrialCta>
  );
}
