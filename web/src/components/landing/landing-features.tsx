import Image from "next/image";
import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

type FeatureFigProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

function FeatureFig({ src, alt, width, height }: FeatureFigProps) {
  return (
    <figure className="relative mx-auto w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[1.125rem] bg-gradient-to-br from-[#4a7fa5]/20 via-transparent to-[#95C14B]/10 opacity-70 blur-xl"
      />
      <div className="relative overflow-hidden rounded-2xl bg-white p-3 shadow-[0_28px_56px_-16px_rgba(26,26,26,0.14),0_0_0_1px_rgba(232,229,223,0.9)_inset] ring-1 ring-[#E8E6E1]">
        <div className="overflow-hidden rounded-xl bg-[#FBFAF7] ring-1 ring-black/[0.04]">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="block h-auto w-full"
          />
        </div>
      </div>
    </figure>
  );
}

export function LandingFeatures() {
  return (
    <section className="relative overflow-hidden py-16 text-center sm:py-24">
      <LandingScrollReveal className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="solution" className={`${landingNavAnchorScrollClasses} text-[clamp(2.5rem,11vw,3.75rem)] font-bold lowercase leading-[1.05] text-[#1a1a1a]`}>
          from competitor ads to your
          <br />
          <LandingHeadlineHighlight>weekly action plan in 30 seconds.</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">
          Rival pulls every active ad your competitor runs across 6 platforms, decodes their funnel, and tells you the three moves to
          make this week. One tool replaces six tabs.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-10 text-left md:mt-16 md:grid-cols-3 md:gap-8">
          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-stealable-angles.png"
              alt="Comparison view showing stealable angles: hooks your competitor runs that your brand does not, with save and evidence actions."
              width={1024}
              height={684}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Find the angles they run that you don&apos;t.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Every week, Rival compares your competitor&apos;s library against yours and ranks the angles they use that you don&apos;t. See
              the exact hooks, save the examples worth testing, and brief your team — without scrolling through hundreds of ads to find what
              matters.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-three-moves.png"
              alt="Three Moves dashboard with weekly tactical priorities grounded in scrape data: refresh, defend, and angle shifts with evidence."
              width={1024}
              height={679}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Get three tactical moves every week.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Skip the 47-page competitor reports. Rival reads your competitor&apos;s strategy weekly and outputs exactly three moves —
              copy this angle, shift this budget, refresh this creative — each backed by your actual scrape data with specific numbers, not
              generic advice.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-timeline.png"
              alt="Timeline view with ad lifespan stats, weekly launch and retirement activity, and a Gantt chart of creatives over time."
              width={1024}
              height={722}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Know what changed in five seconds.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Every Monday, Rival shows you exactly what your competitor did last week. New angles launched. Platform shifts. Budget
              reallocations. No more scrolling dashboards to spot what&apos;s different — the changes are surfaced and explained automatically.
            </p>
          </article>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
