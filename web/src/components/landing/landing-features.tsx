import Image from "next/image";
import { LandingCapabilityTiles } from "@/components/landing/landing-capability-tiles";
import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type FeatureFigProps = {
  src: string;
  alt: string;
};

function FeatureFig({ src, alt }: FeatureFigProps) {
  return (
    <figure className="relative mx-auto w-full shrink-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[1.125rem] bg-gradient-to-br from-[#4a7fa5]/20 via-transparent to-[#95C14B]/10 opacity-70 blur-xl"
      />
      <div className="relative overflow-hidden rounded-2xl bg-white p-2.5 shadow-[0_28px_56px_-16px_rgba(26,26,26,0.14),0_0_0_1px_rgba(232,229,223,0.9)_inset] ring-1 ring-[#E8E6E1] sm:p-3">
        <div className="relative aspect-[1024/680] w-full overflow-hidden rounded-xl bg-[#FBFAF7] ring-1 ring-black/[0.04]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain object-center"
          />
        </div>
      </div>
    </figure>
  );
}

const FEATURE_IMAGES = [
  "/landing/features/feature-ad-library.webp",
  "/landing/features/feature-strategy-map.webp",
  "/landing/features/feature-three-moves.webp",
] as const;

type Props = {
  copy: LandingCopy["features"];
};

export function LandingFeatures({ copy }: Props) {
  return (
    <section className="relative overflow-hidden pb-16 pt-8 text-center sm:pb-24 sm:pt-10">
      <LandingScrollReveal className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2
          id="features-overview"
          className={`${landingNavAnchorScrollClasses} ${landingSectionHeadlineClasses}`}
        >
          {copy.titleLine1}
          <br />
          <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">{copy.subtitle}</p>

        <LandingCapabilityTiles
          label={copy.capabilitiesLabel}
          tiles={copy.capabilities}
          className="mx-auto mt-8 max-w-md sm:mt-10"
        />

        <div className="mt-12 grid grid-cols-1 gap-10 text-left md:mt-16 md:grid-cols-3 md:items-start md:gap-8">
          {copy.cards.map((card, index) => (
            <article key={card.title} className="flex flex-col">
              <FeatureFig src={FEATURE_IMAGES[index]} alt={card.imageAlt} />
              <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 flex justify-center sm:mt-16">
          <LandingTrialCta href="/features" size="md">
            {copy.cta}
            <span aria-hidden>→</span>
          </LandingTrialCta>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
