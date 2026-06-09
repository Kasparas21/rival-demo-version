import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

function HeroHeadlineAccent({ label }: { label: string }) {
  return <span className="hero-headline-accent">{label}</span>;
}

type Props = {
  headline: LandingCopy["hero"]["headline"];
};

/** Server-resolved headline — CSS clamp sizing, no client reflow. */
export function HeroHeadline({ headline }: Props) {
  return (
    <div className="relative z-10 mx-auto mb-9 w-full max-w-[54rem] px-4 sm:mb-12 sm:px-6">
      <h1
        id="how-it-works"
        className={`${landingNavAnchorScrollClasses} hero-headline text-center lowercase`}
      >
        <span className="hero-headline-line max-md:whitespace-normal md:whitespace-nowrap">
          {headline.line1Prefix}
          <HeroHeadlineAccent label={headline.highlight} />
        </span>
        <span className="hero-headline-line max-md:whitespace-normal md:whitespace-nowrap">
          {headline.line2}
        </span>
      </h1>

      <p className="hero-subline mx-auto mt-4 max-w-xl lowercase sm:mt-5">{headline.subline}</p>
    </div>
  );
}
