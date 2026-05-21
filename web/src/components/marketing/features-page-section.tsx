"use client";

import { LazyFeaturePreview } from "@/components/feature-previews/lazy-feature-preview";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import type { FeatureDefinition } from "@/components/marketing/features-page-data";
import { FEATURE_ICON_MAP, FEATURE_PREVIEW_MAP } from "@/components/marketing/features-page-preview-map";

type FeaturesPageSectionProps = {
  feature: FeatureDefinition;
  reverse: boolean;
};

export function FeaturesPageSection({ feature, reverse }: FeaturesPageSectionProps) {
  const Icon = FEATURE_ICON_MAP[feature.iconKey];
  const Preview = FEATURE_PREVIEW_MAP[feature.id];

  if (!Preview) return null;

  const copy = (
    <div className="flex flex-col justify-center lg:max-w-md">
      <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/50 text-[#4a7fa5] shadow-sm">
        <Icon className="size-5" strokeWidth={2} aria-hidden />
      </div>
      <h2 className="mt-4 text-[clamp(1.5rem,4vw,2rem)] font-bold lowercase leading-tight tracking-tight text-[#1a1a1a]">
        {feature.name}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[15px]">{feature.summary}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.why}</p>
      <ul className="mt-4 space-y-2">
        {feature.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-sm leading-snug text-gray-600">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#4a7fa5]" aria-hidden />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );

  const preview = (
    <LazyFeaturePreview minHeight={300} className="w-full">
      <Preview />
    </LazyFeaturePreview>
  );

  return (
    <section id={feature.id} className="scroll-mt-28 py-14 sm:py-20">
      <LandingScrollReveal>
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-12 xl:gap-x-20">
          {reverse ? (
            <>
              <div className="lg:order-2 lg:justify-self-start">{copy}</div>
              <div className="lg:order-1 lg:justify-self-stretch">{preview}</div>
            </>
          ) : (
            <>
              <div className="lg:justify-self-start">{copy}</div>
              <div className="lg:justify-self-stretch">{preview}</div>
            </>
          )}
        </div>
      </LandingScrollReveal>
    </section>
  );
}
