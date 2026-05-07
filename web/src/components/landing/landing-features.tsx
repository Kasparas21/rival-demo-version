import Image from "next/image";
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
    <section className="relative z-[11] bg-white py-24 text-center">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="solution" className={`${landingNavAnchorScrollClasses} text-5xl font-bold text-[#1a1a1a]`}>
          See competitors clearly <span className="text-[#4a7fa5]">in</span>
          <br />
          <span className="text-[#4a7fa5]">seconds.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-gray-500">
          Stop hopping between six different transparency tools. Rival pulls every active ad, decodes the funnel, and shows you the gaps —
          in one search.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-10 text-left md:grid-cols-3 md:gap-8">
          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-ads-library.png"
              alt="Rival Ads Library preview showing cross‑platform Meta, Google and other ad creatives in one place."
              width={1024}
              height={722}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Spy on every ad your competitor runs.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Pull every active ad across Meta, Google, TikTok, LinkedIn, Snapchat and Reddit into one searchable library. Save winning
              creatives, filter by format, see how long each has been running. No more six-tab juggling.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-strategy-map.png"
              alt="Full funnel strategy map with platforms placed across TOF, MOF and BOF plus spend and audience signals."
              width={1024}
              height={722}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Decode their full funnel automatically.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Our AI maps how your competitor moves prospects from awareness to conversion across platforms. See which platforms drive
              top-of-funnel reach, where they retarget, how budget flows. The strategy — visualised in 30 seconds.
            </p>
          </article>

          <article className="flex flex-col">
            <FeatureFig
              src="/landing/features/feature-strategy-insights.png"
              alt="Strategy overview with funnel architecture, budget allocation, creative cadence and performance insight cards."
              width={1024}
              height={722}
            />
            <h3 className="mt-8 text-lg font-bold text-[#1a1a1a]">Find the gaps in your strategy.</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Connect your own brand and Rival shows exactly where your competitor is outstanding, outpositioning, or outmanoeuvring you.
              Walk into every meeting already knowing what to fix, test, and launch next.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
