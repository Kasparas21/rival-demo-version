import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  headline: LandingCopy["hero"]["headline"];
  /** Control (video hero) vs PostHog variant B (blue sky hero). */
  variant?: "control" | "variant-b";
  /** When false, subline is omitted (variant B renders it in the zone wrapper). */
  showSubline?: boolean;
};

function HeroHeadlineAccent({ label }: { label: string }) {
  return <span className="hero-headline-accent">{label}</span>;
}

/** Shared hero headline — same center axis as the header pill on mobile and desktop. */
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
          "landing-hero-copy__headline hero-headline lowercase",
          isVariantB ? "hero-variant-b-headline" : "",
          !isVariantB ? landingNavAnchorScrollClasses : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="landing-hero-copy__line landing-hero-copy__line--primary">
          {headline.line1Prefix}
          <HeroHeadlineAccent label={headline.highlight} />
        </span>
        {headline.line2 ? (
          <span className="landing-hero-copy__line landing-hero-copy__line--secondary">
            {headline.line2}
          </span>
        ) : null}
      </h1>

      {showSubline ? (
        <p className="landing-hero-copy__subline hero-subline">{headline.subline}</p>
      ) : null}
    </div>
  );
}
