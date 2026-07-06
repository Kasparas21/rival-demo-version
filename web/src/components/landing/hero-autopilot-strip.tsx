import { LandingCapabilityTiles } from "@/components/landing/landing-capability-tiles";
import type { LandingCapabilityKey, LandingCopy } from "@/lib/i18n/landing/types";

type StripProps = {
  coverage: LandingCopy["hero"]["coverage"];
};

/** Colored capability tiles with checkmarks — matches stack replacement visual language. */
export function HeroCoverageStrip({ coverage }: StripProps) {
  const tiles = coverage.chips.map((chip) => ({
    key: chip.key as LandingCapabilityKey,
    label: chip.label,
  }));

  const linkForKey = coverage.chips.reduce<
    Partial<Record<LandingCapabilityKey, { href: string; ariaLabel: string }>>
  >((acc, chip) => {
    if (chip.href) {
      acc[chip.key] = {
        href: chip.href,
        ariaLabel: chip.linkAriaLabel ?? chip.label,
      };
    }
    return acc;
  }, {});

  return (
    <div className="relative z-10 mx-auto mt-8 w-full max-w-4xl px-4 sm:mt-10">
      <LandingCapabilityTiles variant="hero" tiles={tiles} linkForKey={linkForKey} />
    </div>
  );
}
