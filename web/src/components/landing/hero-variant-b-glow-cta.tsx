import { LandingContactCta } from "@/components/landing/landing-contact-provider";

type Props = {
  className?: string;
};

/** Hero-sized glow-line CTA - opens the shared landing contact modal. */
export function HeroVariantBGlowCta({ className = "" }: Props) {
  return <LandingContactCta size="hero" className={className} />;
}
