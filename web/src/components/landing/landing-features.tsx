import Image from "next/image";
import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

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

export function LandingFeatures() {
  return (
    <section className="relative overflow-hidden pb-16 pt-8 text-center sm:pb-24 sm:pt-10">
      <LandingScrollReveal className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="solution" className={`${landingNavAnchorScrollClasses} text-[clamp(2.5rem,11vw,3.75rem)] font-bold lowercase leading-[1.05] text-[#1a1a1a]`}>
          from competitor ads to your
          <br />
          <LandingHeadlineHighlight>weekly action plan in 30 seconds.</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">
          Rival pulls every active ad your competitors run across 6 platforms, decodes their funnel, and tells you the three moves to
          make this week. One tool replaces six tabs.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-10 text-left md:mt-16 md:grid-cols-3 md:items-start md:gap-8">
          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-ad-library.png"
              alt="Ad Library dashboard showing ads from multiple platforms with Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat selectors and platform badges on ad tiles."
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Every platform they advertise on — in one view.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Add a competitor by domain and Rival pulls every active ad they run across Meta, Google, TikTok, LinkedIn, Pinterest, and
              Snapchat. Foreplay shows you Meta. AdSpy stops at Google. Rival shows you all six — no more six tabs and four subscriptions.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-strategy-map.png"
              alt="Strategy Map showing a competitor's platform-by-funnel grid with activity tags and an AI strategy summary."
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">See their whole strategy on one map.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Rival lays out each competitor&apos;s activity on a platform-by-funnel map — where they&apos;re going all-in, where they&apos;re just
              testing, and where they&apos;re winding down — with an AI summary that reads their entire strategy in a single paragraph. It&apos;s
              the difference between a pile of ads and an actual plan you can see.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-three-moves.png"
              alt="Three Moves dashboard with weekly tactical priorities grounded in scrape data: refresh, defend, and angle shifts with evidence."
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Get three tactical moves every week.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Skip the 47-page competitor reports. Rival reads your competitor&apos;s strategy weekly and outputs exactly three moves —
              copy this angle, shift this budget, refresh this creative — each backed by your actual scrape data with specific numbers, not
              generic advice.
            </p>
          </article>
        </div>

        <div className="mt-14 flex justify-center sm:mt-16">
          <LandingTrialCta href="/features" size="md">
            Explore every feature
            <span aria-hidden>→</span>
          </LandingTrialCta>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
