import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  headline: LandingCopy["hero"]["headline"];
  /** Control (video hero) vs PostHog variant B (blue sky hero). */
  variant?: "control" | "variant-b";
  /** When false, subline is omitted (variant B renders it in the zone wrapper). */
  showSubline?: boolean;
};

function HeroHeadlineAccent({
  label,
  variant = "control",
}: {
  label: string;
  variant?: "control" | "variant-b";
}) {
  return (
    <span
      className={[
        "hero-headline-accent",
        variant === "variant-b" ? "hero-variant-b-headline-accent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}

function capitalizeHeadlineStart(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Shared hero headline - same center axis as the header pill on mobile and desktop. */
export function HeroHeadline({
  headline,
  variant = "control",
  showSubline = true,
}: Props) {
  const isVariantB = variant === "variant-b";

  return (
    <div className="landing-hero-copy">
      <h1
        id="how-it-works"
        className={[
          "landing-hero-copy__headline hero-headline",
          isVariantB ? "hero-variant-b-headline" : "",
          !isVariantB ? landingNavAnchorScrollClasses : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="landing-hero-copy__line landing-hero-copy__line--primary">
          {capitalizeHeadlineStart(headline.line1Prefix)}
          <HeroHeadlineAccent label={headline.highlight} variant={variant} />
        </span>
        {headline.line2 ? (
          <span className="landing-hero-copy__line landing-hero-copy__line--secondary">
            {headline.line2}
          </span>
        ) : null}
      </h1>

      {showSubline ? (
        <p className="landing-hero-copy__subline hero-subline">
          <span className="sm:hidden">{headline.sublineMobile ?? headline.subline}</span>
          <span className="hidden sm:inline">{headline.subline}</span>
        </p>
      ) : null}
    </div>
  );
}
